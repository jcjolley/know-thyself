# Phase 4.2: Adaptive Model Selection

## Overview

Implement intelligent model escalation so that responses use Opus 4.5 for high-stakes moments (crisis signals, major decisions, deep insights, sensitive topics) while using Sonnet 4.5 as the baseline for regular conversations. This ensures users receive the highest-quality responses when they need them most, while managing costs for routine interactions.

## Problem Statement

Currently, all responses use `claude-haiku-4-5` regardless of conversation intensity. This means:
- Crisis moments get the same model as casual greetings
- Major life decisions don't receive deeper reasoning
- Sensitive topics (trauma, mental health) may receive less nuanced responses
- Users in distress don't get the system's best capability

The system should recognize when to escalate and provide appropriately sophisticated responses.

## Goals

- [ ] Detect emotional intensity and sensitivity signals in user messages
- [ ] Flag crisis signals during extraction for immediate escalation
- [ ] Select appropriate model (Sonnet vs Opus) based on context
- [ ] Ensure Opus is used for high-stakes moments (crisis, major decisions, sensitive topics)
- [ ] Maintain Sonnet as the quality floor for all responses (not Haiku)

## Non-Goals

- **Not changing extraction model** - Extraction continues using Haiku 4.5 (cost efficiency)
- **Not adding user-configurable model selection** - Automatic escalation only
- **Not implementing cost tracking UI** - Internal cost optimization only
- **Not adding rate limiting** - Trust the escalation logic
- **Not implementing model downgrade** - Floor is Sonnet, never below
- **Not changing context planning model** - Context planning uses Haiku 4.5

---

## User Stories

### US-421: Detect Conversation Intensity

**As a** user experiencing strong emotions
**I want** the system to recognize the intensity of my message
**So that** I receive an appropriately thoughtful response

**Acceptance Criteria:**
- [ ] Context planning outputs an `intensity` field: `low`, `medium`, `high`, or `critical`
- [ ] Intensity assessment considers emotional language, urgency markers, and topic weight
- [ ] "I'm feeling a bit tired" -> `low` intensity
- [ ] "I'm really struggling with this decision" -> `high` intensity
- [ ] "I don't know if I can keep going" -> `critical` intensity
- [ ] Intensity persisted in context plan output

### US-422: Detect Sensitive Topics

**As a** user discussing vulnerable topics
**I want** the system to recognize sensitive subject matter
**So that** I receive careful, nuanced responses

**Acceptance Criteria:**
- [ ] Context planning outputs a `sensitivity` array of detected sensitive topics
- [ ] Sensitive topics include: `mental_health`, `trauma`, `grief`, `crisis`, `self_harm`, `abuse`, `addiction`, `suicidal_ideation`
- [ ] Also includes high-stakes contexts: `major_career_decision`, `relationship_ending`, `financial_crisis`, `health_diagnosis`
- [ ] Multiple sensitivities can be detected in one message
- [ ] Empty array when no sensitive topics detected

### US-423: Flag Crisis Signals During Extraction

**As a** user in crisis
**I want** the system to immediately recognize crisis indicators
**So that** I receive the most capable response available

**Acceptance Criteria:**
- [ ] Extraction output includes `crisis_signals` boolean field
- [ ] Crisis signals detected when message contains: explicit self-harm language, expressions of hopelessness, acute distress markers
- [ ] Crisis flag triggers Opus escalation regardless of other factors
- [ ] Crisis flag is extracted with supporting quote for evidence
- [ ] `immediate_intent.type === 'crisis_support'` also implies crisis

### US-424: Select Response Model Based on Triggers

**As a** system
**I want** to select the appropriate model for response generation
**So that** users get optimal response quality for their situation

**Acceptance Criteria:**
- [ ] Model selection function takes context plan and extraction result as input
- [ ] Returns `claude-opus-4-5-20251101` when any of:
  - `intensity === 'critical'`
  - `intensity === 'high'`
  - `crisis_signals === true`
  - `sensitivity` array contains: `mental_health`, `trauma`, `grief`, `crisis`, `self_harm`, `abuse`, `suicidal_ideation`
- [ ] Returns `claude-sonnet-4-5-latest` for all other cases (baseline)
- [ ] Model selection logged for debugging

### US-425: Use Selected Model for Response Generation

**As a** system
**I want** response generation to use the selected model
**So that** model escalation actually affects user experience

**Acceptance Criteria:**
- [ ] `generateResponse()` accepts model parameter
- [ ] `streamResponse()` accepts model parameter
- [ ] Chat handler pipeline calls model selection before response generation
- [ ] Selected model passed through entire response flow
- [ ] Response uses the specified model (verifiable in logs)

### US-426: Provide Escalation Reason for Debugging

**As a** developer
**I want** to see why a particular model was selected
**So that** I can debug and tune escalation logic

**Acceptance Criteria:**
- [ ] Model selection returns both model ID and reason string
- [ ] Reason explains which trigger caused escalation (e.g., "High intensity detected", "Crisis signals present", "Sensitive topic: trauma")
- [ ] Reason logged with response generation
- [ ] Reason available in admin/debug views (future)

---

## Phases

### Phase 4.2.1: Extend Context Planning Output

**Goal:** Context planning returns intensity and sensitivity assessments

#### 4.2.1.1 Update Context Plan Interface

**File:** `src/shared/types.ts`

Add new fields to context planning types:

```typescript
export type ConversationIntensity = 'low' | 'medium' | 'high' | 'critical';

export type SensitiveTopic =
    | 'mental_health'
    | 'trauma'
    | 'grief'
    | 'crisis'
    | 'self_harm'
    | 'abuse'
    | 'addiction'
    | 'suicidal_ideation'
    | 'major_career_decision'
    | 'relationship_ending'
    | 'financial_crisis'
    | 'health_diagnosis';

export interface ContextPlanResult {
    question_type: QuestionType;
    timeframe: Timeframe;
    categories_to_retrieve: CategorySelection[];
    semantic_queries: string[];
    special_considerations: string;
    // New fields for model escalation
    intensity: ConversationIntensity;
    sensitivity: SensitiveTopic[];
}
```

#### 4.2.1.2 Update Context Planning Prompt

**File:** `src/main/prompts/context-planning.ts`

Extend the prompt to assess intensity and sensitivity:

```typescript
export function buildContextPlanningPrompt(request: ContextPlanRequest): string {
    return `You are planning what context to retrieve to answer a user's question in a deeply personalized way.

### User's Question
${request.userQuestion}

### User Profile Summary
${request.profileSummary || 'No profile data available yet.'}

// ... existing sections ...

### Additional Assessment

5. Assess conversation intensity:
   - low: Casual chat, simple questions, routine check-ins
   - medium: Meaningful discussion, some emotional content
   - high: Strong emotions, important decisions, seeking deep support
   - critical: Crisis indicators, expressions of hopelessness, acute distress

6. Identify sensitive topics (if any):
   - mental_health: Depression, anxiety, therapy, medication
   - trauma: Past traumatic experiences, PTSD, abuse history
   - grief: Death, loss, mourning
   - crisis: Immediate danger, emergency situations
   - self_harm: Self-injury, suicidal thoughts
   - abuse: Current or past abuse situations
   - addiction: Substance abuse, behavioral addictions
   - suicidal_ideation: Thoughts of ending life
   - major_career_decision: Job changes, career pivots with high stakes
   - relationship_ending: Divorce, breakups, estrangement
   - financial_crisis: Bankruptcy, severe debt, job loss impact
   - health_diagnosis: Serious illness, medical uncertainty

### Output Format

Return ONLY valid JSON with no markdown fences:

{
  "question_type": "...",
  "timeframe": "...",
  "categories_to_retrieve": [
    { "category": "...", "reason": "..." }
  ],
  "semantic_queries": ["..."],
  "special_considerations": "...",
  "intensity": "low|medium|high|critical",
  "sensitivity": ["topic1", "topic2"] // empty array if none
}`;
}
```

**Verification:**
- [ ] Context planning prompt includes intensity assessment instructions
- [ ] Context planning prompt includes sensitivity detection instructions
- [ ] Output schema includes new fields
- [ ] `make typecheck` passes

### Phase 4.2.2: Add Crisis Signal Detection to Extraction

**Goal:** Extraction flags crisis signals for immediate escalation

#### 4.2.2.1 Update Extraction Types

**File:** `src/shared/types.ts`

```typescript
export interface CrisisSignalExtraction {
    detected: boolean;
    indicators: string[];  // What triggered detection
    quote?: string;        // Supporting evidence
}

export interface CompleteExtractionResult extends ExtractionResult {
    // ... existing fields ...

    // Crisis detection (new)
    crisis_signals?: CrisisSignalExtraction;
}
```

#### 4.2.2.2 Update Extraction Prompt

**File:** `src/main/prompts/extraction.ts`

Add crisis signal detection to the extraction prompt:

```typescript
// Add to output format section:
"crisis_signals": {
    "detected": true|false,
    "indicators": ["indicator1", "indicator2"],
    "quote": "exact supporting quote"
}

// Add to extraction guidelines:
### Crisis Signal Detection (CRITICAL)
Look for indicators that suggest the user may be in crisis:

**Immediate escalation triggers:**
- Expressions of hopelessness ("I can't go on", "there's no point")
- Self-harm references (cutting, suicide, ending it)
- Acute distress ("I'm falling apart", "I can't cope")
- Safety concerns ("I don't feel safe", "I'm scared of what I might do")

**Important:**
- When detected, set crisis_signals.detected = true
- Include ALL relevant quotes as evidence
- This triggers highest-priority response handling
- False positives are safer than false negatives

**Do NOT flag as crisis:**
- General stress or frustration
- Past tense discussions of resolved issues
- Hypothetical discussions
- Professional discussions about mental health topics
```

**Verification:**
- [ ] Extraction prompt includes crisis signal detection section
- [ ] Crisis signal output schema defined
- [ ] Crisis signals extracted with evidence quotes
- [ ] `make typecheck` passes

### Phase 4.2.3: Implement Model Selection Logic

**Goal:** Create model selection function based on triggers

#### 4.2.3.1 Create Model Selection Module

**File:** `src/main/model-selection.ts`

```typescript
import type { ContextPlanResult, CompleteExtractionResult, SensitiveTopic } from '../shared/types.js';

export type ClaudeModel =
    | 'claude-haiku-4-5-latest'
    | 'claude-sonnet-4-5-latest'
    | 'claude-opus-4-5-20251101';

export interface ModelSelection {
    model: ClaudeModel;
    reason: string;
}

const OPUS_TRIGGER_TOPICS: SensitiveTopic[] = [
    'mental_health',
    'trauma',
    'grief',
    'crisis',
    'self_harm',
    'abuse',
    'addiction',
    'suicidal_ideation',
];

export function selectResponseModel(
    contextPlan: ContextPlanResult | null,
    extraction: CompleteExtractionResult | null
): ModelSelection {
    // Crisis signals always escalate to Opus
    if (extraction?.crisis_signals?.detected) {
        return {
            model: 'claude-opus-4-5-20251101',
            reason: `Crisis signals detected: ${extraction.crisis_signals.indicators.join(', ')}`,
        };
    }

    // Immediate intent of crisis_support escalates
    if (extraction?.immediate_intent?.type === 'crisis_support') {
        return {
            model: 'claude-opus-4-5-20251101',
            reason: 'User seeking crisis support',
        };
    }

    // Critical intensity escalates
    if (contextPlan?.intensity === 'critical') {
        return {
            model: 'claude-opus-4-5-20251101',
            reason: 'Critical conversation intensity detected',
        };
    }

    // High intensity escalates
    if (contextPlan?.intensity === 'high') {
        return {
            model: 'claude-opus-4-5-20251101',
            reason: 'High conversation intensity detected',
        };
    }

    // Sensitive topics that require Opus
    const detectedSensitiveTopics = contextPlan?.sensitivity?.filter(
        topic => OPUS_TRIGGER_TOPICS.includes(topic)
    ) ?? [];

    if (detectedSensitiveTopics.length > 0) {
        return {
            model: 'claude-opus-4-5-20251101',
            reason: `Sensitive topics detected: ${detectedSensitiveTopics.join(', ')}`,
        };
    }

    // Default to Sonnet (the quality floor)
    return {
        model: 'claude-sonnet-4-5-latest',
        reason: 'Standard conversation - using Sonnet baseline',
    };
}
```

**Verification:**
- [ ] Model selection function exists
- [ ] Returns Opus for crisis signals
- [ ] Returns Opus for high/critical intensity
- [ ] Returns Opus for sensitive topics
- [ ] Returns Sonnet as default
- [ ] Includes reason string for all selections
- [ ] `make typecheck` passes

### Phase 4.2.4: Update Response Generation Pipeline

**Goal:** Response generation uses selected model

#### 4.2.4.1 Update Claude Module

**File:** `src/main/claude.ts`

```typescript
import { selectResponseModel, type ClaudeModel, type ModelSelection } from './model-selection.js';

// Update generateResponse signature
export async function generateResponse(
    message: string,
    context: AssembledContext,
    model?: ClaudeModel
): Promise<string> {
    if (mockMode) {
        return getMockResponse(message);
    }

    const anthropic = getClient();
    const prompts = buildResponsePrompts(message, context);
    const selectedModel = model ?? 'claude-sonnet-4-5-latest';

    console.log(`[Response] Using model: ${selectedModel}`);

    const response = await anthropic.messages.create({
        model: selectedModel,
        max_tokens: 1024,
        system: prompts.system,
        messages: [{ role: 'user', content: prompts.user }],
    });

    const textBlock = response.content.find(block => block.type === 'text');
    return textBlock ? textBlock.text : '';
}

// Update streamResponse signature
export async function* streamResponse(
    message: string,
    context: AssembledContext,
    model?: ClaudeModel
): AsyncGenerator<string> {
    if (mockMode) {
        yield* simulateMockStream(getMockResponse(message));
        return;
    }

    const anthropic = getClient();
    const prompts = buildResponsePrompts(message, context);
    const selectedModel = model ?? 'claude-sonnet-4-5-latest';

    console.log(`[Response] Streaming with model: ${selectedModel}`);

    const stream = anthropic.messages.stream({
        model: selectedModel,
        max_tokens: 1024,
        system: prompts.system,
        messages: [{ role: 'user', content: prompts.user }],
    });

    for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            yield event.delta.text;
        }
    }
}
```

#### 4.2.4.2 Update Chat Handler

**File:** `src/main/ipc.ts`

Update the chat stream handler to include model selection:

```typescript
import { selectResponseModel } from './model-selection.js';

// In the chat:stream handler, after context planning and extraction:
const modelSelection = selectResponseModel(contextPlan, extraction);
console.log(`[Model Selection] ${modelSelection.model}: ${modelSelection.reason}`);

// Pass model to response generation
for await (const chunk of streamResponse(message, assembledContext, modelSelection.model)) {
    event.reply('chat:chunk', { chunk, done: false });
}
```

**Verification:**
- [ ] `generateResponse()` accepts model parameter
- [ ] `streamResponse()` accepts model parameter
- [ ] Chat handler performs model selection
- [ ] Selected model logged
- [ ] Model passed to response functions
- [ ] `make typecheck` passes

### Phase 4.2.5: Integration and Testing

**Goal:** End-to-end model escalation working with tests

#### 4.2.5.1 Create Model Selection Tests

**File:** `tests/model-escalation.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { launchApp, closeApp, getPage } from './helpers/electron';

test.describe('Model Escalation', () => {
    test.beforeAll(async () => { await launchApp(); });
    test.afterAll(async () => { await closeApp(); });

    test('US-421: High intensity triggers escalation', async () => {
        const page = getPage();

        // Send a high-intensity message
        await page.fill('[data-testid="chat-input"]',
            "I'm really struggling with this decision and I don't know what to do");
        await page.click('[data-testid="send-button"]');

        // Wait for response
        await page.waitForSelector('[data-testid="assistant-message"]');

        // Verify response received (model selection is internal)
        const response = await page.textContent('[data-testid="assistant-message"]');
        expect(response).toBeTruthy();
    });

    test('US-423: Crisis signals trigger Opus', async () => {
        const page = getPage();

        // Send a message with crisis indicators
        await page.fill('[data-testid="chat-input"]',
            "I feel like there's no point anymore and I don't know if I can keep going");
        await page.click('[data-testid="send-button"]');

        // Wait for response
        await page.waitForSelector('[data-testid="assistant-message"]:last-of-type');

        // Response should be present (actual model verification via logs)
        const response = await page.textContent('[data-testid="assistant-message"]:last-of-type');
        expect(response).toBeTruthy();
        expect(response?.length).toBeGreaterThan(50); // Substantive response
    });

    test('US-424: Sensitive topic triggers escalation', async () => {
        const page = getPage();

        // Send message with trauma topic
        await page.fill('[data-testid="chat-input"]',
            "I've been thinking about some difficult experiences from my childhood");
        await page.click('[data-testid="send-button"]');

        // Wait for response
        await page.waitForSelector('[data-testid="assistant-message"]:last-of-type');

        const response = await page.textContent('[data-testid="assistant-message"]:last-of-type');
        expect(response).toBeTruthy();
    });

    test('US-424: Regular message uses Sonnet', async () => {
        const page = getPage();

        // Send a casual message
        await page.fill('[data-testid="chat-input"]',
            "What should I have for dinner tonight?");
        await page.click('[data-testid="send-button"]');

        // Wait for response
        await page.waitForSelector('[data-testid="assistant-message"]:last-of-type');

        const response = await page.textContent('[data-testid="assistant-message"]:last-of-type');
        expect(response).toBeTruthy();
    });
});
```

#### 4.2.5.2 Create Unit Tests for Model Selection

**File:** `tests/unit/model-selection.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { selectResponseModel } from '../../src/main/model-selection';
import type { ContextPlanResult, CompleteExtractionResult } from '../../src/shared/types';

describe('selectResponseModel', () => {
    it('returns Opus for crisis signals', () => {
        const extraction: Partial<CompleteExtractionResult> = {
            crisis_signals: {
                detected: true,
                indicators: ['hopelessness'],
                quote: 'I can\'t go on'
            }
        };

        const result = selectResponseModel(null, extraction as CompleteExtractionResult);

        expect(result.model).toBe('claude-opus-4-5-20251101');
        expect(result.reason).toContain('Crisis signals');
    });

    it('returns Opus for critical intensity', () => {
        const contextPlan: Partial<ContextPlanResult> = {
            intensity: 'critical',
            sensitivity: []
        };

        const result = selectResponseModel(contextPlan as ContextPlanResult, null);

        expect(result.model).toBe('claude-opus-4-5-20251101');
        expect(result.reason).toContain('Critical');
    });

    it('returns Opus for high intensity', () => {
        const contextPlan: Partial<ContextPlanResult> = {
            intensity: 'high',
            sensitivity: []
        };

        const result = selectResponseModel(contextPlan as ContextPlanResult, null);

        expect(result.model).toBe('claude-opus-4-5-20251101');
    });

    it('returns Opus for mental_health sensitivity', () => {
        const contextPlan: Partial<ContextPlanResult> = {
            intensity: 'medium',
            sensitivity: ['mental_health']
        };

        const result = selectResponseModel(contextPlan as ContextPlanResult, null);

        expect(result.model).toBe('claude-opus-4-5-20251101');
        expect(result.reason).toContain('mental_health');
    });

    it('returns Sonnet for low intensity, no sensitivity', () => {
        const contextPlan: Partial<ContextPlanResult> = {
            intensity: 'low',
            sensitivity: []
        };

        const result = selectResponseModel(contextPlan as ContextPlanResult, null);

        expect(result.model).toBe('claude-sonnet-4-5-latest');
    });

    it('returns Sonnet for medium intensity, no sensitive topics', () => {
        const contextPlan: Partial<ContextPlanResult> = {
            intensity: 'medium',
            sensitivity: ['major_career_decision'] // Not in OPUS_TRIGGER_TOPICS
        };

        const result = selectResponseModel(contextPlan as ContextPlanResult, null);

        expect(result.model).toBe('claude-sonnet-4-5-latest');
    });

    it('returns Sonnet when no context available', () => {
        const result = selectResponseModel(null, null);

        expect(result.model).toBe('claude-sonnet-4-5-latest');
    });
});
```

**Verification:**
- [ ] E2E tests pass for escalation scenarios
- [ ] Unit tests cover all selection paths
- [ ] `make test` passes
- [ ] `make check` passes

---

## Technical Specifications

### Model IDs

| Model | ID | Use Case |
|-------|----|----|
| Haiku 4.5 | `claude-haiku-4-5-latest` | Extraction, Context Planning |
| Sonnet 4.5 | `claude-sonnet-4-5-latest` | Response baseline |
| Opus 4.5 | `claude-opus-4-5-20251101` | Escalated responses |

### Escalation Triggers Summary

| Trigger | Source | Model |
|---------|--------|-------|
| `crisis_signals.detected === true` | Extraction | Opus |
| `immediate_intent.type === 'crisis_support'` | Extraction | Opus |
| `intensity === 'critical'` | Context Plan | Opus |
| `intensity === 'high'` | Context Plan | Opus |
| `sensitivity` includes crisis topics | Context Plan | Opus |
| Default | - | Sonnet |

### Crisis Topic List (Triggers Opus)

- `mental_health`
- `trauma`
- `grief`
- `crisis`
- `self_harm`
- `abuse`
- `addiction`
- `suicidal_ideation`

### High-Stakes Topics (Logged but doesn't trigger Opus alone)

- `major_career_decision`
- `relationship_ending`
- `financial_crisis`
- `health_diagnosis`

These may be combined with `high` intensity to trigger Opus, but alone they use Sonnet.

---

## Files Summary

### Files to Create

| File | Purpose |
|------|---------|
| `src/main/model-selection.ts` | Model selection logic and types |
| `tests/model-escalation.spec.ts` | E2E tests for escalation |
| `tests/unit/model-selection.test.ts` | Unit tests for selection logic |

### Files to Modify

| File | Changes |
|------|---------|
| `src/shared/types.ts` | Add intensity, sensitivity, crisis signal types |
| `src/main/prompts/context-planning.ts` | Add intensity/sensitivity assessment to prompt |
| `src/main/prompts/extraction.ts` | Add crisis signal detection to prompt |
| `src/main/claude.ts` | Accept model parameter in response functions |
| `src/main/ipc.ts` | Add model selection to chat handler |

---

## Quality Gates

- [ ] `make typecheck` - Type checking passes
- [ ] `make lint` - No linting errors
- [ ] `make test` - All tests pass
- [ ] `make build` - Build succeeds

### Post-Verification: Code Simplification

After all quality gates pass, run the code simplifier and re-verify:

1. Run `/code-simplifier:code-simplifier` on modified files
2. Re-run all quality gates above
3. Repeat until no further simplifications are made

---

## Verification Checklist

### Functional Requirements

- [ ] US-421: Context planning outputs intensity field
- [ ] US-422: Context planning outputs sensitivity array
- [ ] US-423: Extraction detects and flags crisis signals
- [ ] US-424: Model selection returns Opus for triggers, Sonnet for default
- [ ] US-425: Response generation uses selected model
- [ ] US-426: Model selection reason logged

### Manual Verification

1. [ ] Send casual message ("Hi, how are you?") - Check logs show Sonnet
2. [ ] Send high-intensity message ("I'm really struggling with this major decision") - Check logs show Opus
3. [ ] Send crisis-indicating message - Check logs show Opus with crisis reason
4. [ ] Send mental health topic ("I've been feeling depressed lately") - Check logs show Opus
5. [ ] Verify response quality feels appropriate for each scenario

---

## Implementation Order

1. **Types first** - Add new types to `src/shared/types.ts`
2. **Context planning prompt** - Update to output intensity/sensitivity
3. **Extraction prompt** - Add crisis signal detection
4. **Model selection module** - Create `src/main/model-selection.ts`
5. **Claude module** - Update response functions to accept model
6. **IPC handler** - Wire model selection into chat flow
7. **Unit tests** - Test model selection logic
8. **E2E tests** - Test full escalation flow
9. **Verification** - Run all quality gates

---

## Open Questions

- [x] Should high-stakes topics (career, financial) alone trigger Opus? **Decision: No, only when combined with high intensity**
- [x] Should we log model selection to database for analytics? **Decision: Future feature, log to console for now**
- [x] What about extraction model escalation for crisis? **Decision: Keep extraction on Haiku, response escalation is sufficient**

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Over-escalation increases costs | Medium | Conservative trigger list, monitor in production |
| Under-escalation misses crisis | High | Err on side of escalation for safety-critical topics |
| Context plan parsing fails | Medium | Graceful fallback to Sonnet if parsing fails |
| Opus API rate limits | Low | Sonnet fallback if Opus unavailable |
| False positive crisis detection | Low | Log and monitor, adjust prompt if needed |

---

## Cost Implications

Based on GAPS_AND_PHASES.md estimates:

| Scenario | Messages/Month | Opus % | Estimated Cost |
|----------|----------------|--------|----------------|
| Light (current) | 100 | 10% | ~$4 |
| Moderate | 300 | 10% | ~$12 |
| Heavy | 1,000 | 10% | ~$35 |

Escalation to Opus is expected for ~10% of messages (high-intensity moments). This maintains reasonable costs while ensuring quality when it matters most.
