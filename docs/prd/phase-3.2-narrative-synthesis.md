# Phase 3.2: Narrative Profile Synthesis

## Overview
Implement LLM-powered narrative synthesis that transforms raw profile data into human-readable insights, populating the `narrative_json` column in the `profile_summary` table. The UI already exists and handles these fields—this phase enables the backend that generates them.

## Problem Statement
The Self-Portrait page displays placeholder text ("Your story is still unfolding...") because `narrative_json` is always empty. The extraction pipeline stores structured data (values, challenges, signals) but never synthesizes it into the narrative fields the UI expects: `identity_summary`, `current_phase`, `emotional_baseline`, `patterns_to_watch`, `recent_wins`, and `recent_struggles`.

## Goals
- [ ] Generate narrative summaries using Claude Haiku that synthesize profile data
- [ ] Detect trigger conditions that warrant narrative regeneration
- [ ] Store narrative in `narrative_json` column of `profile_summary` table
- [ ] Fix existing bug: `getFullProfileSummary()` reads from wrong column name

## Non-Goals
- Not building a new UI (Self-Portrait page already exists)
- Not building a conversation summarization system (separate PRD 3.3)
- Not changing the extraction pipeline logic
- Not adding user editing capabilities for narratives
- Not creating a new `services/` directory pattern

---

## User Stories

### US-001: Initial Narrative Generation
**As a** user who has had several conversations
**I want** the system to generate a narrative summary of who I am
**So that** I see my identity summary instead of placeholder text

**Acceptance Criteria:**
- [ ] Given a user with profile data but no narrative, when trigger conditions are met, then a narrative is generated
- [ ] Given the generated narrative, it populates: identity_summary, current_phase, primary_concerns, emotional_baseline, patterns_to_watch, recent_wins, recent_struggles
- [ ] Given the narrative generation completes, the narrative_json and narrative_generated_at fields are updated

### US-002: Trigger-Based Regeneration
**As a** user having ongoing conversations
**I want** the narrative to update only when meaningful changes occur
**So that** the system doesn't waste API calls on minor updates

**Acceptance Criteria:**
- [ ] Given no narrative exists (first time), when extraction completes, then narrative generation is triggered
- [ ] Given 10+ messages have been processed since last narrative, when extraction completes, then narrative generation is triggered
- [ ] Given a new value is discovered (evidence_count increases), when extraction completes, then narrative generation is triggered
- [ ] Given a new challenge is identified, when extraction completes, then narrative generation is triggered

### US-003: Narrative Display
**As a** user viewing my Self-Portrait
**I want** to see narrative insights instead of placeholder text
**So that** I understand the system's synthesis of who I am

**Acceptance Criteria:**
- [ ] Given a narrative exists, when viewing Self-Portrait, then identity_summary displays (not placeholder)
- [ ] Given a narrative exists with current_phase, when viewing Self-Portrait, then phase badge is visible
- [ ] Given a narrative exists with patterns_to_watch, when viewing Self-Portrait, then patterns section appears

---

## Phases

### Phase 1: Fix Existing Bug + Database Setup

#### 1.1 Fix Column Name Mismatch
**File:** `src/main/db/profile.ts`

The `getFullProfileSummary()` function reads from `narrative_summary` but the actual column is `narrative_json`. Fix line ~572:

```typescript
// BEFORE (buggy)
const summaryRow = db.prepare(`SELECT * FROM profile_summary WHERE id = 1`).get() as {
    computed_summary?: string;
    narrative_summary?: string;  // Wrong column name
    // ...
};
if (summaryRow?.narrative_summary) {  // Wrong column name

// AFTER (fixed)
const summaryRow = db.prepare(`SELECT * FROM profile_summary WHERE id = 1`).get() as {
    computed_json?: string;
    narrative_json?: string;  // Correct column name
    narrative_generated_at?: string;
    // ...
};
if (summaryRow?.narrative_json) {  // Correct column name
```

#### 1.2 Add Database Helper Functions
**File:** `src/main/db/profile.ts`

```typescript
/**
 * Initialize profile_summary row if it doesn't exist.
 * Uses id=1 singleton pattern.
 */
export function ensureProfileSummaryRow(): void {
    const db = getDb();
    db.prepare(`
        INSERT OR IGNORE INTO profile_summary (id, computed_json)
        VALUES (1, '{}')
    `).run();
}

/**
 * Save narrative summary to profile_summary table.
 */
export function saveNarrativeSummary(narrative: NarrativeSummary): void {
    const db = getDb();
    const now = new Date().toISOString();
    ensureProfileSummaryRow();
    db.prepare(`
        UPDATE profile_summary
        SET narrative_json = ?, narrative_generated_at = ?
        WHERE id = 1
    `).run(JSON.stringify(narrative), now);
}

/**
 * Get existing narrative if any.
 */
export function getExistingNarrative(): NarrativeSummary | null {
    const db = getDb();
    const row = db.prepare(`
        SELECT narrative_json FROM profile_summary WHERE id = 1
    `).get() as { narrative_json: string | null } | undefined;

    if (!row?.narrative_json) return null;
    try {
        return JSON.parse(row.narrative_json);
    } catch {
        return null;
    }
}

/**
 * Count messages since a given timestamp.
 */
export function countMessagesSince(timestamp: string | null): number {
    const db = getDb();
    if (!timestamp) {
        return (db.prepare(`SELECT COUNT(*) as count FROM messages WHERE role = 'user'`).get() as { count: number }).count;
    }
    return (db.prepare(`
        SELECT COUNT(*) as count FROM messages
        WHERE role = 'user' AND created_at > ?
    `).get(timestamp) as { count: number }).count;
}

/**
 * Get timestamp of last narrative generation.
 */
export function getNarrativeGeneratedAt(): string | null {
    const db = getDb();
    const row = db.prepare(`
        SELECT narrative_generated_at FROM profile_summary WHERE id = 1
    `).get() as { narrative_generated_at: string | null } | undefined;
    return row?.narrative_generated_at ?? null;
}
```

### Phase 2: Narrative Synthesis Prompt

#### 2.1 Create Narrative Synthesis Prompt
**File:** `src/main/prompts/narrative-synthesis.ts`

```typescript
export const NARRATIVE_SYNTHESIS_PROMPT = `
You are synthesizing a psychological profile narrative from structured data.
This narrative will be shown to the user as their "Self-Portrait" - a mirror
reflecting who they are based on their conversations.

## Current Profile Data
{profile_data}

## Previous Narrative (if any)
{existing_narrative}

## Your Task

Generate a brief, insightful narrative that:
1. Summarizes who this person is in 2-3 sentences (identity_summary)
2. Identifies their current life phase (current_phase)
3. Notes their top 3 concerns right now (primary_concerns)
4. Characterizes their emotional baseline (emotional_baseline)
5. Highlights patterns or tensions worth watching (patterns_to_watch)
6. Identifies recent positive developments (recent_wins)
7. Notes current difficulties (recent_struggles)

## Guidelines

- Write in second person ("You are..." not "They are...")
- Be warm but honest - this is a mirror, not flattery
- Ground observations in actual data - don't invent
- Keep identity_summary to 2-3 sentences max
- current_phase should be a short label like "career_transition", "new_parent", "rebuilding_after_loss"
- emotional_baseline should be a short descriptor like "anxious_but_hopeful", "stable_and_grounded"
- If data is insufficient for a field, use null (don't fabricate)

## Output Format (JSON only, no markdown)
{
    "identity_summary": "2-3 sentence summary of who they are",
    "current_phase": "short_label_for_life_phase",
    "primary_concerns": ["concern1", "concern2", "concern3"],
    "emotional_baseline": "emotional_state_descriptor",
    "patterns_to_watch": ["pattern or tension worth noting"],
    "recent_wins": ["positive development"],
    "recent_struggles": ["current difficulty"]
}

Respond with valid JSON only. No markdown code blocks.
`;

export interface NarrativeSummary {
    identity_summary: string | null;
    current_phase: string | null;
    primary_concerns: string[];
    emotional_baseline: string | null;
    patterns_to_watch: string[];
    recent_wins: string[];
    recent_struggles: string[];
}
```

### Phase 3: Synthesis Logic

#### 3.1 Add Narrative Generation to Extraction Module
**File:** `src/main/extraction.ts`

Add narrative synthesis functions alongside existing extraction logic:

```typescript
import { NARRATIVE_SYNTHESIS_PROMPT, type NarrativeSummary } from './prompts/narrative-synthesis.js';
import {
    getExistingNarrative,
    saveNarrativeSummary,
    countMessagesSince,
    getNarrativeGeneratedAt,
    getCompleteProfile,
} from './db/profile.js';

/**
 * Check if narrative regeneration is needed based on trigger conditions.
 */
export function shouldRegenerateNarrative(): boolean {
    const lastGenerated = getNarrativeGeneratedAt();
    const messagesSince = countMessagesSince(lastGenerated);
    const existingNarrative = getExistingNarrative();

    // Trigger conditions (any one triggers regeneration)
    return (
        !existingNarrative ||           // First time - no narrative exists
        messagesSince >= 10             // 10+ messages since last generation
    );
}

/**
 * Generate narrative summary using Claude Haiku.
 */
export async function synthesizeNarrative(): Promise<NarrativeSummary | null> {
    try {
        const profile = getCompleteProfile();
        const existingNarrative = getExistingNarrative();

        // Build prompt with profile data
        const prompt = NARRATIVE_SYNTHESIS_PROMPT
            .replace('{profile_data}', JSON.stringify(profile, null, 2))
            .replace('{existing_narrative}', existingNarrative
                ? JSON.stringify(existingNarrative, null, 2)
                : 'None (first generation)');

        // Call Claude Haiku
        const response = await callHaikuForNarrative(prompt);

        // Parse response
        const narrative = parseNarrativeResponse(response);
        if (!narrative) {
            console.error('[narrative] Failed to parse response');
            return null;
        }

        // Save to database
        saveNarrativeSummary(narrative);
        console.log('[narrative] Generated and saved narrative summary');

        return narrative;
    } catch (err) {
        console.error('[narrative] Synthesis failed:', err);
        return null;
    }
}

/**
 * Parse Claude's response into NarrativeSummary.
 */
function parseNarrativeResponse(response: string): NarrativeSummary | null {
    try {
        // Strip markdown code blocks if present
        let json = response.trim();
        if (json.startsWith('```')) {
            json = json.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        const parsed = JSON.parse(json);

        // Validate required structure
        return {
            identity_summary: parsed.identity_summary ?? null,
            current_phase: parsed.current_phase ?? null,
            primary_concerns: Array.isArray(parsed.primary_concerns) ? parsed.primary_concerns : [],
            emotional_baseline: parsed.emotional_baseline ?? null,
            patterns_to_watch: Array.isArray(parsed.patterns_to_watch) ? parsed.patterns_to_watch : [],
            recent_wins: Array.isArray(parsed.recent_wins) ? parsed.recent_wins : [],
            recent_struggles: Array.isArray(parsed.recent_struggles) ? parsed.recent_struggles : [],
        };
    } catch (err) {
        console.error('[narrative] JSON parse error:', err);
        return null;
    }
}

/**
 * Call Claude Haiku for narrative synthesis.
 * Separate from main chat to use cost-effective model.
 */
async function callHaikuForNarrative(prompt: string): Promise<string> {
    // Use existing Anthropic client but with Haiku model
    const anthropic = getAnthropicClient();  // Reuse existing client getter

    const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-latest',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find(block => block.type === 'text');
    return textBlock?.text ?? '';
}
```

#### 3.2 Integrate Into Extraction Pipeline
**File:** `src/main/extraction.ts`

Modify `runExtraction()` to check narrative triggers after extraction completes:

```typescript
export async function runExtraction(messageId: string, conversationId: string): Promise<void> {
    // ... existing extraction logic ...

    // After extraction completes, check if narrative needs regeneration
    if (shouldRegenerateNarrative()) {
        // Run async - don't block
        synthesizeNarrative().catch(err => {
            console.error('[narrative] Background synthesis failed:', err);
        });
    }
}
```

### Phase 4: Type Updates

#### 4.1 Export NarrativeSummary Type
**File:** `src/shared/types.ts`

Add type export for consistency:

```typescript
// Add to existing types
export interface NarrativeSummary {
    identity_summary: string | null;
    current_phase: string | null;
    primary_concerns: string[];
    emotional_baseline: string | null;
    patterns_to_watch: string[];
    recent_wins: string[];
    recent_struggles: string[];
}
```

### Phase 5: Testing

#### 5.1 Add Narrative Synthesis Tests
**File:** `tests/narrative-synthesis.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { launchApp, closeApp, getPage } from './helpers/electron';

test.describe('Narrative Synthesis', () => {
    test.beforeAll(async () => {
        await launchApp();
    });

    test.afterAll(async () => {
        await closeApp();
    });

    test('US-001: Narrative generates after sufficient conversation', async () => {
        const page = getPage();

        // Send messages to trigger extraction
        // ... send 3+ substantive messages ...

        // Navigate to Self-Portrait
        await page.click('button:has-text("Portrait")');
        await page.waitForTimeout(2000);  // Allow async narrative generation

        // Verify placeholder is NOT shown (narrative generated)
        const placeholder = page.locator('text=Your story is still unfolding');
        // After enough data, placeholder should be replaced
    });

    test('US-003: Self-Portrait displays narrative fields', async () => {
        const page = getPage();

        // Navigate to Self-Portrait
        await page.click('button:has-text("Portrait")');

        // Check for identity card (always present)
        const identityCard = page.locator('[style*="borderRadius: 16"]').first();
        await expect(identityCard).toBeVisible();
    });
});
```

---

## Technical Specifications

### Data Models

```typescript
// Narrative summary structure (stored as JSON in narrative_json)
interface NarrativeSummary {
    identity_summary: string | null;
    current_phase: string | null;
    primary_concerns: string[];
    emotional_baseline: string | null;
    patterns_to_watch: string[];
    recent_wins: string[];
    recent_struggles: string[];
}
```

### Database Schema (existing)
```sql
CREATE TABLE profile_summary (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    computed_json TEXT NOT NULL,
    narrative_json TEXT,                    -- Phase 3.2 populates this
    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    narrative_generated_at TIMESTAMP        -- Phase 3.2 populates this
);
```

### API Changes
No new IPC channels needed—existing `profile:getSummary` returns `FullProfileSummary` which already includes narrative fields.

### Claude API Usage
- Model: `claude-haiku-4-5-latest` (cost-effective for synthesis)
- Max tokens: 1000
- Temperature: default

---

## Files Summary

### Files to Create
| File | Purpose |
|------|---------|
| `src/main/prompts/narrative-synthesis.ts` | Prompt template and NarrativeSummary type |
| `tests/narrative-synthesis.spec.ts` | Playwright tests for narrative feature |

### Files to Modify
| File | Changes |
|------|---------|
| `src/main/db/profile.ts` | Fix column name bug, add `saveNarrativeSummary()`, `getExistingNarrative()`, `countMessagesSince()`, `getNarrativeGeneratedAt()`, `ensureProfileSummaryRow()` |
| `src/main/extraction.ts` | Add `shouldRegenerateNarrative()`, `synthesizeNarrative()`, integrate into `runExtraction()` |
| `src/shared/types.ts` | Export `NarrativeSummary` type |

---

## Quality Gates

- `make typecheck` - Type checking passes
- `make lint` - No linting errors
- `make test` - All tests pass (including new narrative tests)
- `make build` - Build succeeds

### Post-Verification
After all quality gates pass:
1. Run `/code-simplifier:code-simplifier` on modified files
2. Re-run all quality gates
3. Repeat until no further simplifications

---

## Verification Checklist

1. [ ] Fix deployed: `getFullProfileSummary()` reads from `narrative_json` (not `narrative_summary`)
2. [ ] Start app with empty database, send 3+ messages with personal details
3. [ ] Check database: `narrative_json` column in `profile_summary` is populated
4. [ ] Open Self-Portrait: identity_summary displays (not placeholder text)
5. [ ] Verify current_phase badge shows (if data warrants)
6. [ ] Verify emotional_baseline shows below identity summary
7. [ ] Verify patterns_to_watch section appears (if data warrants)
8. [ ] Verify recent_wins/struggles cards appear (if data warrants)
9. [ ] Send 10 more messages → verify narrative regenerates (check `narrative_generated_at`)
10. [ ] Edge case: Empty profile → placeholder text shows gracefully

---

## Implementation Order

1. **Fix bug first**: Correct column name in `getFullProfileSummary()`
2. Add database helper functions to `profile.ts`
3. Create `src/main/prompts/narrative-synthesis.ts`
4. Add synthesis functions to `extraction.ts`
5. Integrate trigger check into extraction pipeline
6. Add type export to `shared/types.ts`
7. Manual verification against checklist
8. Write Playwright tests

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Haiku generates low-quality narratives | Medium | Clear examples in prompt; can upgrade to Sonnet if needed |
| Narrative generation fails silently | Low | Logging added; UI handles null gracefully (shows placeholder) |
| JSON parsing errors from Claude | Low | `parseNarrativeResponse()` wraps in try/catch, returns null on failure |
| Anthropic client not accessible from extraction.ts | Medium | Refactor to expose `getAnthropicClient()` or pass client instance |
