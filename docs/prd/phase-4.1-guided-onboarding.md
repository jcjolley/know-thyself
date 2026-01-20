# Phase 4.1: Guided Onboarding

## Overview

Implement a priority-driven guided conversation system that proactively gathers essential psychological data during early interactions. The system uses axis importance weights and completeness scores to determine what questions to ask, while respecting user autonomy by immediately following their lead if they have something specific to discuss.

## Problem Statement

New users arrive with empty profiles. Without basic psychological context (Maslow status, support-seeking style, life situation), the system cannot:
- Avoid tone-deaf advice (suggesting self-actualization work when someone is worried about rent)
- Use the correct support style (offering solutions when they need to vent, or vice versa)
- Ground responses in the user's actual life circumstances

The guided onboarding fills these critical gaps through natural conversation rather than surveys or forms.

## Goals

- [ ] Calculate data completeness for each psychological axis (0.0-1.0)
- [ ] Calculate priority scores using formula: importance x (1 - completeness)
- [ ] Provide contextual questions for the highest-priority axis
- [ ] Detect when user diverts to their own topic and exit guided mode
- [ ] Exit guided mode when baseline criteria are met
- [ ] Integrate with chat flow without disrupting natural conversation

## Non-Goals

- Not building a formal onboarding wizard or multi-step form
- Not forcing users through a question sequence (questions are fallback only)
- Not changing the extraction pipeline (Phase 2.5 already handles signal extraction)
- Not adding new UI components (guided mode is handled in response generation)
- Not persisting guided mode state across app restarts (session-scoped)

---

## User Stories

### US-001: Axis Completeness Calculation
**As a** system component
**I want** to calculate how complete our data is for each psychological axis
**So that** we can prioritize which areas need more information

**Acceptance Criteria:**
- [ ] Given an axis name, when `getAxisCompleteness(axis)` is called, then it returns a number between 0.0 and 1.0
- [ ] Given no Maslow signals exist, when calculating Maslow completeness, then it returns 0
- [ ] Given 3+ Maslow levels with concerns AND stable signals, when calculating Maslow completeness, then it returns >= 0.75
- [ ] Given no support-seeking style signal, when calculating support style completeness, then it returns 0
- [ ] Given a support-seeking style signal with confidence >= 0.7, when calculating support style completeness, then it returns 1.0

### US-002: Priority Score Calculation
**As a** system component
**I want** to calculate which axis needs attention most urgently
**So that** guided questions focus on the most valuable gaps

**Acceptance Criteria:**
- [ ] Given axis importance weights, when `calculateAxisPriority(axis)` is called, then it returns importance x (1 - completeness)
- [ ] Given all axes, when `getHighestPriorityAxis()` is called, then it returns the axis with the highest priority score
- [ ] Given Maslow completeness = 0 and importance = 1.0, when calculating priority, then Maslow priority = 1.0
- [ ] Given Maslow completeness = 0.5 and importance = 1.0, when calculating priority, then Maslow priority = 0.5

### US-003: Question Bank
**As a** response generation component
**I want** access to conversational questions for each axis
**So that** I can naturally gather missing information

**Acceptance Criteria:**
- [ ] Given each Tier 1 axis (Maslow, Support Style, Life Situation, Intent), when requesting questions, then at least 2 questions are available
- [ ] Given each Tier 2 axis (Values, Challenges, Goals, Moral Foundations), when requesting questions, then at least 2 questions are available
- [ ] Questions are phrased conversationally, not as survey items
- [ ] Each question includes metadata: axis name, question text, and priority level

### US-004: Guided Mode State Management
**As a** chat system
**I want** to track whether we're in guided mode
**So that** responses can include guiding questions when appropriate

**Acceptance Criteria:**
- [ ] Given a new conversation, when no messages exist, then guided mode is active
- [ ] Given guided mode is active, when baseline is met, then guided mode becomes inactive
- [ ] Given guided mode is active, when user diverts, then guided mode becomes inactive
- [ ] Given guided mode is active, when max turns (7) reached, then guided mode becomes inactive
- [ ] Guided mode state is stored per-conversation (not globally)

### US-005: User Diversion Detection
**As a** chat system
**I want** to detect when users bring up their own topic
**So that** we can immediately follow their lead instead of our questions

**Acceptance Criteria:**
- [ ] Given user message contains specific question markers ("help me with", "I want to talk about", "can we discuss"), when processing, then diversion is detected
- [ ] Given user message is a response to our guiding question, when processing, then diversion is NOT detected
- [ ] Given user message introduces a new topic not related to the guiding question, when processing, then diversion is detected
- [ ] Diversion detection uses context planning output

### US-006: Baseline Exit Condition
**As a** guided mode controller
**I want** to detect when baseline data has been gathered
**So that** we stop asking guiding questions

**Acceptance Criteria:**
- [ ] Given all Tier 1 axes have completeness >= 0.5, when checking baseline, then Tier 1 requirement is met
- [ ] Given 2+ Tier 2 axes have completeness >= 0.3, when checking baseline, then Tier 2 requirement is met
- [ ] Given both Tier 1 AND Tier 2 requirements are met, when checking baseline, then baseline is complete
- [ ] Baseline check is called after each extraction completes

### US-007: Chat Flow Integration
**As a** user
**I want** the guided questions to feel natural in conversation
**So that** I don't feel like I'm filling out a form

**Acceptance Criteria:**
- [ ] Given guided mode is active, when generating response, then include appropriate guiding question
- [ ] Given guided mode is inactive, when generating response, then do NOT include guiding questions
- [ ] Guiding questions appear as natural follow-ups, not abrupt topic changes
- [ ] The system prompt instructs Claude on how to incorporate guiding questions naturally

---

## Phases

### Phase 1: Completeness Calculation

Implement the core data completeness functions for all psychological axes.

#### 1.1 Create Completeness Module
**File:** `src/main/completeness.ts`

This module calculates how complete our data is for each axis based on the rules defined in GAPS_AND_PHASES.md.

```typescript
export type AxisName =
    | 'maslow_status'
    | 'support_seeking_style'
    | 'life_situation'
    | 'immediate_intent'
    | 'core_values'
    | 'current_challenges'
    | 'goals'
    | 'moral_foundations'
    | 'big_five'
    | 'risk_tolerance'
    | 'motivation_style'
    | 'attachment_style'
    | 'locus_of_control'
    | 'temporal_orientation'
    | 'growth_mindset';

export interface AxisCompleteness {
    axis: AxisName;
    completeness: number;  // 0.0 to 1.0
    reason: string;        // Human-readable explanation
}

// Get completeness for a single axis
export function getAxisCompleteness(axis: AxisName): AxisCompleteness;

// Get completeness for all axes
export function getAllAxisCompleteness(): AxisCompleteness[];
```

#### 1.2 Implement Per-Axis Completeness Rules
**File:** `src/main/completeness.ts`

Each axis has specific rules based on AXIS_REFERENCE_LIBRARY.md:

| Axis | 0% | 25% | 50% | 75% | 100% |
|------|-----|-----|-----|-----|------|
| Maslow | No signals | General sense | 1-2 level concerns | Specific concerns with context | Full picture: 4+ levels, concerns AND stable |
| Support Style | No signal | - | Have a guess | - | Explicitly stated or clearly demonstrated (conf >= 0.7) |
| Life Situation | Nothing known | 1 dimension | 2-3 dimensions | Most dimensions | 4+ dimensions known |
| Immediate Intent | No idea | - | General sense | - | Clear understanding |
| Core Values | No signals | 1-2 values | 3-4 values ranked | Clear hierarchy | Full profile with stated vs revealed |
| Challenges | None | - | 1-2 main challenges | - | Clear picture with context |
| Goals | None | - | 1-2 goals | - | Clear goals with priority and status |
| Moral Foundations | No signals | - | 1-2 prominent | - | Good sense of profile |
| Big Five | No signals | - | 2-3 traits | - | Good sense of all five |
| Risk/Motivation/etc. | No signal | - | General sense | - | Clear pattern |

### Phase 2: Priority Scoring

Implement priority calculation and question selection.

#### 2.1 Create Guided Onboarding Module
**File:** `src/main/guided-onboarding.ts`

```typescript
export const IMPORTANCE_WEIGHTS: Record<AxisName, number> = {
    maslow_status: 1.0,
    support_seeking_style: 1.0,
    life_situation: 0.9,
    immediate_intent: 0.9,
    core_values: 0.85,
    current_challenges: 0.8,
    goals: 0.75,
    moral_foundations: 0.7,
    big_five: 0.6,
    risk_tolerance: 0.55,
    motivation_style: 0.5,
    attachment_style: 0.4,
    locus_of_control: 0.4,
    temporal_orientation: 0.35,
    growth_mindset: 0.3,
};

export interface AxisPriority {
    axis: AxisName;
    importance: number;
    completeness: number;
    priority: number;  // importance * (1 - completeness)
}

// Calculate priority for all axes
export function calculateAllPriorities(): AxisPriority[];

// Get the highest priority axis that needs data
export function getHighestPriorityAxis(): AxisPriority | null;
```

#### 2.2 Question Bank
**File:** `src/main/question-bank.ts`

Conversational questions for each axis, sourced from AXIS_REFERENCE_LIBRARY.md:

```typescript
export interface GuidingQuestion {
    axis: AxisName;
    question: string;
    context: string;  // When to use this question
    tier: 1 | 2 | 3 | 4;
}

export const QUESTION_BANK: GuidingQuestion[] = [
    // Tier 1 - Essential
    {
        axis: 'maslow_status',
        question: "How are things going with the basics right now - work, health, finances, living situation?",
        context: "Opening question to assess fundamental needs",
        tier: 1,
    },
    {
        axis: 'maslow_status',
        question: "Is there anything weighing on you at a really fundamental level?",
        context: "Follow-up if first question didn't reveal enough",
        tier: 1,
    },
    {
        axis: 'support_seeking_style',
        question: "When something's on your mind, do you usually want help solving it, or do you need to talk it through first?",
        context: "Direct question about support preference",
        tier: 1,
    },
    {
        axis: 'life_situation',
        question: "Tell me about your life right now - what does a typical week look like?",
        context: "Open-ended life context question",
        tier: 1,
    },
    {
        axis: 'immediate_intent',
        question: "What brought you here today? Is there something specific on your mind?",
        context: "First message - understand why they're here",
        tier: 1,
    },
    // Tier 2 - Early Inference
    {
        axis: 'core_values',
        question: "What matters most to you in life? What would you never compromise on?",
        context: "Direct values exploration",
        tier: 2,
    },
    {
        axis: 'current_challenges',
        question: "What's the biggest thing you're dealing with right now?",
        context: "Identify primary challenges",
        tier: 2,
    },
    {
        axis: 'goals',
        question: "Is there something you're working toward, or wish were different?",
        context: "Explore aspirations",
        tier: 2,
    },
    // Additional questions...
];

// Get questions for a specific axis
export function getQuestionsForAxis(axis: AxisName): GuidingQuestion[];

// Get the best question for the highest priority axis
export function getNextGuidingQuestion(): GuidingQuestion | null;
```

### Phase 3: Guided Mode State

Implement guided mode tracking and exit conditions.

#### 3.1 Guided Mode State
**File:** `src/main/guided-onboarding.ts` (extend)

```typescript
export interface GuidedModeState {
    isActive: boolean;
    turnCount: number;
    lastQuestionAxis: AxisName | null;
    deactivationReason: 'baseline_met' | 'user_diverted' | 'max_turns' | null;
}

// In-memory state per conversation
const guidedModeStates = new Map<string, GuidedModeState>();

// Initialize or get state for a conversation
export function getGuidedModeState(conversationId: string): GuidedModeState;

// Update state after a turn
export function updateGuidedModeState(
    conversationId: string,
    updates: Partial<GuidedModeState>
): void;

// Check if guided mode should be active
export function shouldBeGuidedMode(conversationId: string): boolean;

// Increment turn count
export function incrementGuidedTurn(conversationId: string): void;
```

#### 3.2 Exit Condition Detection
**File:** `src/main/guided-onboarding.ts` (extend)

```typescript
export interface BaselineStatus {
    tier1Met: boolean;
    tier2Met: boolean;
    baselineComplete: boolean;
    details: {
        tier1Axes: { axis: AxisName; completeness: number }[];
        tier2Axes: { axis: AxisName; completeness: number }[];
    };
}

// Check if baseline data requirements are met
export function checkBaselineStatus(): BaselineStatus;

// Detect if user is diverting from guided flow
export function detectUserDiversion(
    userMessage: string,
    contextPlan: ContextPlanResult | null,
    lastQuestionAxis: AxisName | null
): boolean;
```

### Phase 4: Chat Flow Integration

Wire up guided mode with response generation.

#### 4.1 Update Context Assembly
**File:** `src/main/context.ts`

Add guided mode information to assembled context:

```typescript
export interface AssembledContext {
    // ... existing fields ...

    // Guided mode information
    guidedMode: {
        isActive: boolean;
        suggestedQuestion: string | null;
        targetAxis: string | null;
        turnCount: number;
    };
}
```

#### 4.2 Update Response Prompt
**File:** `src/main/prompts/response.ts`

Add guidance for incorporating questions naturally:

```typescript
// Add to system prompt when guided mode is active:
const GUIDED_MODE_INSTRUCTIONS = `
## GUIDED CONVERSATION MODE

You are in guided mode to gather essential context about this person. After responding to their message:

1. ONLY if they haven't brought up their own specific topic, naturally work in a question about: {targetAxis}
2. Suggested question: "{suggestedQuestion}"
3. Make the question flow naturally from the conversation - don't just append it
4. If they HAVE brought up something specific they want to discuss, FOLLOW THEIR LEAD - do NOT force your question

Remember: Your questions are a FALLBACK for when they don't have something specific. User autonomy comes first.
`;
```

#### 4.3 Update IPC Handler
**File:** `src/main/ipc.ts`

Check and update guided mode state during chat:

```typescript
// In chat:stream handler, after extraction completes:
const baselineStatus = checkBaselineStatus();
if (baselineStatus.baselineComplete) {
    updateGuidedModeState(conversation.id, {
        isActive: false,
        deactivationReason: 'baseline_met',
    });
}
```

### Phase 5: Testing

Comprehensive tests for guided onboarding.

#### 5.1 Completeness Tests
**File:** `tests/completeness.spec.ts`

Test all completeness calculation rules.

#### 5.2 Priority Tests
**File:** `tests/guided-onboarding.spec.ts`

Test priority calculation and question selection.

#### 5.3 Integration Tests
**File:** `tests/guided-mode-integration.spec.ts`

Test full guided mode flow including exit conditions.

---

## Technical Specifications

### Data Models

```typescript
// Axis importance weights (from GAPS_AND_PHASES.md)
export const IMPORTANCE_WEIGHTS: Record<AxisName, number> = {
    maslow_status: 1.0,
    support_seeking_style: 1.0,
    life_situation: 0.9,
    immediate_intent: 0.9,
    core_values: 0.85,
    current_challenges: 0.8,
    goals: 0.75,
    moral_foundations: 0.7,
    big_five: 0.6,
    risk_tolerance: 0.55,
    motivation_style: 0.5,
    attachment_style: 0.4,
    locus_of_control: 0.4,
    temporal_orientation: 0.35,
    growth_mindset: 0.3,
};

// Tier definitions for baseline checking
export const TIER_1_AXES: AxisName[] = [
    'maslow_status',
    'support_seeking_style',
    'life_situation',
    'immediate_intent',
];

export const TIER_2_AXES: AxisName[] = [
    'core_values',
    'current_challenges',
    'goals',
    'moral_foundations',
];

// Baseline thresholds
export const TIER_1_THRESHOLD = 0.5;  // All Tier 1 axes must be >= 0.5
export const TIER_2_THRESHOLD = 0.3;  // At least 2 Tier 2 axes must be >= 0.3
export const MAX_GUIDED_TURNS = 7;
```

### State Management

Guided mode state is:
- **Session-scoped**: Stored in memory per conversation, not persisted
- **Initialized on first message**: New conversations start in guided mode
- **Updated after each turn**: Turn count incremented, exit conditions checked

### API Changes

No new IPC channels needed. Guided mode is internal to the main process.

---

## Files Summary

### Files to Create
| File | Purpose |
|------|---------|
| `src/main/completeness.ts` | Axis completeness calculation |
| `src/main/guided-onboarding.ts` | Priority scoring, state management, exit detection |
| `src/main/question-bank.ts` | Conversational questions for each axis |
| `tests/completeness.spec.ts` | Tests for completeness calculations |
| `tests/guided-onboarding.spec.ts` | Tests for priority and state management |
| `tests/guided-mode-integration.spec.ts` | Integration tests for guided flow |

### Files to Modify
| File | Changes |
|------|---------|
| `src/main/context.ts` | Add guided mode info to AssembledContext |
| `src/main/prompts/response.ts` | Add guided mode instructions to system prompt |
| `src/main/ipc.ts` | Check/update guided mode state in chat handlers |
| `src/shared/types.ts` | Add guided mode types to shared types |

---

## Quality Gates

- `make typecheck` - Type checking passes
- `make lint` - No linting errors
- `make test` - All tests pass (including new guided mode tests)
- `make build` - Build succeeds

### Post-Verification: Code Simplification

After all quality gates pass, run the code simplifier and re-verify:

1. Run `/code-simplifier:code-simplifier` on modified files
2. Re-run all quality gates above
3. Repeat until no further simplifications are made

---

## Verification Checklist

1. [ ] New conversation starts with guided mode active
2. [ ] First response includes natural guiding question about highest priority axis
3. [ ] After user responds, completeness for relevant axis increases
4. [ ] Priority recalculates and next question targets different axis
5. [ ] When user says "I want to talk about X", guided mode deactivates
6. [ ] When baseline is met, guided mode deactivates
7. [ ] After 7 turns, guided mode deactivates even if baseline not met
8. [ ] Responses feel natural, not like form filling
9. [ ] Edge case: User with existing data starts new conversation -> lower priority gaps targeted
10. [ ] Edge case: User immediately brings up crisis -> guided mode exits, crisis handled

---

## Implementation Order

1. Create `src/main/completeness.ts` with all axis completeness functions
2. Add tests for completeness calculations
3. Create `src/main/question-bank.ts` with question data
4. Create `src/main/guided-onboarding.ts` with priority scoring
5. Add state management to guided-onboarding.ts
6. Add exit condition detection to guided-onboarding.ts
7. Update `src/main/context.ts` to include guided mode info
8. Update `src/main/prompts/response.ts` with guided mode instructions
9. Update `src/main/ipc.ts` to integrate guided mode
10. Add integration tests
11. Run `make check` and fix any issues
12. Run code simplifier and re-verify

---

## Open Questions

- [ ] Should guided mode persist across app restarts, or always start fresh?
  - **Current decision**: Session-scoped (in-memory), fresh start each session
- [ ] Should we show users that they're in "guided mode" or keep it invisible?
  - **Current decision**: Invisible - feels more natural

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Guiding questions feel robotic | Medium | Use varied phrasing, natural transitions, LLM handles integration |
| User feels interrogated | High | Exit on any diversion, max 7 turns, questions are fallback only |
| Completeness calculations are inaccurate | Low | Conservative thresholds, baseline is intentionally low bar |
| Priority keeps targeting same axis | Low | Completeness updates after each extraction, priorities recalculate |
