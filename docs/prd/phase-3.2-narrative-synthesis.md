# Phase 3.2: Narrative Profile Synthesis

## Overview
Implement LLM-powered narrative synthesis that transforms raw profile data into human-readable insights, populating the `narrative_json` column in the `profile_summary` table and displaying the results in the Self-Portrait view.

## Problem Statement
The profile system extracts structured data (values, challenges, signals) but the `narrative_json` field remains empty. Users see disconnected data points rather than a cohesive story about who they are. The system needs to synthesize this data into meaningful narratives that provide genuine insight.

## Goals
- [ ] Generate narrative summaries using Claude Haiku that synthesize profile data into human-readable insights
- [ ] Detect trigger conditions that warrant narrative regeneration (not every message)
- [ ] Store narrative in `narrative_json` column of `profile_summary` table
- [ ] Display narrative elements in ProfileSummary.tsx (already has UI placeholders)

## Non-Goals
- Not building a conversation summarization system (separate feature)
- Not changing the extraction pipeline
- Not modifying the computed_json regeneration logic
- Not adding user editing capabilities for narratives
- Out of scope: caching or rate limiting beyond trigger conditions

---

## User Stories

### US-001: Initial Narrative Generation
**As a** user who has had several conversations
**I want** the system to generate a narrative summary of who I am
**So that** I can see a cohesive picture of my self-portrait rather than disconnected data points

**Acceptance Criteria:**
- [ ] Given a user with profile data but no narrative, when trigger conditions are met, then a narrative is generated
- [ ] Given the generated narrative, it includes: identity_summary, current_phase, primary_concerns, emotional_baseline, patterns_to_watch, recent_wins, recent_struggles
- [ ] Given the narrative generation completes, the narrative_json and narrative_generated_at fields are updated in profile_summary table

### US-002: Trigger-Based Regeneration
**As a** user having ongoing conversations
**I want** the narrative to update only when meaningful changes occur
**So that** the system doesn't waste API calls on minor updates

**Acceptance Criteria:**
- [ ] Given no narrative exists (first time), when any message is processed, then narrative generation is triggered
- [ ] Given 10 messages have been processed since last narrative, when extraction completes, then narrative generation is triggered
- [ ] Given a new value is discovered, when extraction completes, then narrative generation is triggered
- [ ] Given a new challenge is identified, when extraction completes, then narrative generation is triggered
- [ ] Given maslow status has shifted, when extraction completes, then narrative generation is triggered
- [ ] Given a contradiction is detected, when extraction completes, then narrative generation is triggered

### US-003: Narrative Display
**As a** user viewing my Self-Portrait
**I want** to see the narrative insights displayed prominently
**So that** I understand the system's synthesis of who I am

**Acceptance Criteria:**
- [ ] Given a narrative exists, when viewing Self-Portrait, then identity_summary is displayed in the main card
- [ ] Given a narrative exists, when viewing Self-Portrait, then current_phase badge is visible
- [ ] Given a narrative exists, when viewing Self-Portrait, then emotional_baseline is shown
- [ ] Given a narrative exists with patterns_to_watch, when viewing Self-Portrait, then patterns section is visible
- [ ] Given a narrative exists with recent_wins/struggles, when viewing Self-Portrait, then wins/struggles cards are visible

---

## Phases

### Phase 1: Narrative Synthesis Prompt & Service
Create the narrative synthesis prompt and service layer for generating narratives.

#### 1.1 Create Narrative Synthesis Prompt
**File:** `src/main/prompts/narrative-synthesis.ts`

Define the prompt template that synthesizes profile data into narrative form:

```typescript
export const NARRATIVE_SYNTHESIS_PROMPT = `
You are synthesizing a psychological profile narrative from structured data.
This narrative will be shown to the user as their "Self-Portrait" - a mirror
reflecting who they are based on their conversations.

## Current Profile Data
{profile_data}

## Recent Extractions (last 10 messages)
{recent_extractions}

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

## Output Format (JSON)
{
    "identity_summary": "2-3 sentence summary of who they are",
    "current_phase": "short_label_for_life_phase",
    "primary_concerns": ["concern1", "concern2", "concern3"],
    "emotional_baseline": "emotional_state_descriptor",
    "patterns_to_watch": ["pattern or tension worth noting"],
    "recent_wins": ["positive development"],
    "recent_struggles": ["current difficulty"],
    "changes_since_last": "what's new since last narrative (null if first)"
}

Respond with valid JSON only.
`;
```

#### 1.2 Create Narrative Service
**File:** `src/main/services/narrative.ts`

Implement the service that calls Claude Haiku for narrative synthesis:

```typescript
interface NarrativeSummary {
    identity_summary: string | null;
    current_phase: string | null;
    primary_concerns: string[];
    emotional_baseline: string | null;
    patterns_to_watch: string[];
    recent_wins: string[];
    recent_struggles: string[];
    changes_since_last: string | null;
}

export async function synthesizeNarrative(): Promise<NarrativeSummary>;
export function shouldRegenerateNarrative(computed: ComputedSummary): boolean;
```

### Phase 2: Trigger Detection & Change Tracking
Implement the logic to detect when narrative regeneration is needed.

#### 2.1 Add Change Detection to Computed Summary
**File:** `src/main/db/profile.ts`

Modify `computeProfileSummary()` to track changes that trigger narrative regeneration:

```typescript
interface ComputedSummary {
    // Existing fields...

    // Change detection flags
    new_values_count: number;
    new_challenges_count: number;
    maslow_level_changed: boolean;
    contradiction_detected: boolean;
}
```

#### 2.2 Implement Trigger Condition Check
**File:** `src/main/services/narrative.ts`

```typescript
function shouldRegenerateNarrative(computed: ComputedSummary): boolean {
    const summary = getProfileSummary();
    const messagesSinceNarrative = countMessagesSince(summary.narrative_generated_at);

    return (
        !summary.narrative_json ||              // First time
        messagesSinceNarrative >= 10 ||         // Every 10 messages
        computed.new_values_count > 0 ||        // New value discovered
        computed.new_challenges_count > 0 ||    // New challenge identified
        computed.maslow_level_changed ||        // Maslow status shifted
        computed.contradiction_detected         // Contradiction detected
    );
}
```

### Phase 3: Database Integration
Wire up narrative storage and retrieval.

#### 3.1 Add Narrative Storage Functions
**File:** `src/main/db/profile.ts`

```typescript
export function saveNarrativeSummary(narrative: NarrativeSummary): void;
export function getExistingNarrative(): NarrativeSummary | null;
export function countMessagesSince(timestamp: string | null): number;
```

#### 3.2 Update getFullProfileSummary
**File:** `src/main/db/profile.ts`

Ensure `getFullProfileSummary()` properly reads from `narrative_json` (already partially implemented, verify it works).

### Phase 4: Pipeline Integration
Integrate narrative generation into the extraction pipeline.

#### 4.1 Add Narrative Generation to Message Processing
**File:** `src/main/services/chat.ts` or equivalent

After extraction completes:
1. Compute profile summary (already happens)
2. Check if narrative regeneration is needed
3. If yes, call `synthesizeNarrative()` asynchronously
4. Store result in database

```typescript
// After extraction processing
const computed = computeProfileSummary();
saveComputedSummary(computed);

if (shouldRegenerateNarrative(computed)) {
    // Run asynchronously - don't block response
    synthesizeNarrative().then(narrative => {
        saveNarrativeSummary(narrative);
    }).catch(err => {
        console.error('Narrative synthesis failed:', err);
    });
}
```

### Phase 5: Verification & Polish
Ensure end-to-end functionality and clean up.

#### 5.1 Verify UI Display
Confirm ProfileSummary.tsx correctly displays all narrative fields (UI already exists, just verify data flows through).

#### 5.2 Add Logging
Add appropriate logging for narrative generation events.

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
    changes_since_last: string | null;
}

// Extended computed summary with change flags
interface ComputedSummaryWithChanges {
    generated_at: string;
    maslow_status: MaslowSignal[];
    top_values: Value[];
    active_challenges: Challenge[];
    current_goals: Goal[];
    support_style: string | null;
    axis_completeness: Record<string, number>;

    // Change detection
    new_values_count: number;
    new_challenges_count: number;
    maslow_level_changed: boolean;
    contradiction_detected: boolean;
}
```

### API Changes
No new IPC channels needed - existing `profile:getSummary` returns `FullProfileSummary` which already includes narrative fields.

### Claude API Usage
- Model: `claude-haiku-4-5-latest` (cost-effective for synthesis)
- Max tokens: 1000
- Temperature: default (not creative writing)

---

## Files Summary

### Files to Create
| File | Purpose |
|------|---------|
| `src/main/prompts/narrative-synthesis.ts` | Prompt template for narrative generation |
| `src/main/services/narrative.ts` | Narrative synthesis service with trigger detection |

### Files to Modify
| File | Changes |
|------|---------|
| `src/main/db/profile.ts` | Add `saveNarrativeSummary()`, `getExistingNarrative()`, `countMessagesSince()`, update computed summary with change flags |
| `src/main/services/extraction.ts` or `src/main/chat.ts` | Call narrative generation after extraction when triggered |

---

## Quality Gates

- `make typecheck` - Type checking passes
- `make lint` - No linting errors
- `make test` - All tests pass (including new narrative tests)
- `make build` - Build succeeds

### Post-Verification: Code Simplification
After all quality gates pass, run the code simplifier and re-verify:

1. Run `/code-simplifier:code-simplifier` on modified files
2. Re-run all quality gates above
3. Repeat until no further simplifications are made

---

## Verification Checklist

1. [ ] Start app with empty database, send 3+ messages with personal details
2. [ ] Verify narrative_json is populated in profile_summary table (check via Admin page or SQLite browser)
3. [ ] Open Self-Portrait view -> identity_summary displays in main card
4. [ ] Verify current_phase badge shows (if applicable to content)
5. [ ] Verify emotional_baseline shows below identity summary
6. [ ] Verify patterns_to_watch section appears (if data warrants)
7. [ ] Verify recent_wins/struggles cards appear (if data warrants)
8. [ ] Send 10 more messages -> verify narrative regenerates (check updated timestamp)
9. [ ] Mention a new value explicitly -> verify narrative regenerates
10. [ ] Edge case: Empty profile -> verify graceful fallback (no crash, shows placeholder text)

---

## Implementation Order

1. Create `src/main/prompts/narrative-synthesis.ts` with prompt template
2. Create `src/main/services/narrative.ts` with `synthesizeNarrative()` and `shouldRegenerateNarrative()`
3. Add database functions to `src/main/db/profile.ts`: `saveNarrativeSummary()`, `getExistingNarrative()`, `countMessagesSince()`
4. Update computed summary generation to track change flags
5. Integrate narrative generation call into extraction pipeline
6. Test end-to-end with manual verification
7. Write automated tests for trigger conditions and storage

---

## Open Questions

- [x] Should narrative generation block the response? **No, run async**
- [x] What model to use? **Haiku 4.5 (cost-effective)**
- [ ] Should we show a "generating narrative..." indicator in the UI? (Nice-to-have, defer)
- [ ] Should narrative generation have retry logic on failure? (Consider for robustness)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Haiku generates low-quality narratives | Medium | Include clear examples in prompt; can upgrade to Sonnet if needed |
| Narrative generation fails silently | Low | Add logging; UI already handles null narrative gracefully |
| Too many regenerations (cost) | Medium | Trigger conditions are conservative; 10-message minimum |
| Stale narratives if triggers miss changes | Low | 10-message fallback ensures regular updates |
| JSON parsing errors from Claude | Low | Wrap in try/catch, log errors, keep previous narrative on failure |
