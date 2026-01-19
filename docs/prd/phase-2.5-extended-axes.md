# Phase 2.5: Complete Psychological Axes

## Overview
Extend the extraction pipeline to capture **all 15+ psychological axes** across all four tiers. Signals are extracted from day one; confidence scores determine when they're mature enough to influence responses.

## Problem Statement
Phase 2 implements extraction for a subset of axes (Maslow, Support-Seeking Style, Values, Challenges, Goals). However:
- **Tier 1 gaps**: Life Situation and Immediate Intent not captured
- **Tier 2 gaps**: Moral Foundations not captured; Goals extracted but **not persisted** (see `extraction.ts:111-185` - only handles values, challenges, maslow)
- **Tier 3 missing entirely**: Big Five, Risk Tolerance, Motivation Style
- **Tier 4 missing entirely**: Attachment Style, Locus of Control, Temporal Orientation, Growth Mindset, and 4 additional axes
- **Type mismatch**: Current `support_seeking_style` uses different enum values than psychological literature

The extraction infrastructure should capture all signals from the start. Low-confidence signals are stored but excluded from context until they mature.

## Breaking Changes

This phase introduces breaking changes that require migration:

1. **`SupportSeekingStyle` type change** (`types.ts:65`):
   - Old: `'problem_solving' | 'emotional_support' | 'information' | 'unclear'`
   - New: `'emotional_support' | 'instrumental_support' | 'informational_support' | 'validation_support' | 'independence' | 'unclear'`
   - Migration: Map `problem_solving` → `instrumental_support`, `information` → `informational_support`
   - Note: `'unclear'` is retained for cases where extraction cannot determine style (filtered out before persistence)

2. **`assembleContext` signature change** (`context.ts:13`):
   - Old: `assembleContext(currentMessage, recentMessages)`
   - New: `assembleContext(currentMessage, recentMessages, conversationId)`
   - Callers to update: `src/main/ipc.ts:44`, `src/main/ipc.ts:71`

3. **`applyExtractionToProfile` signature change** (`extraction.ts:111`):
   - Old: `applyExtractionToProfile(extractionId, extraction)`
   - New: `applyExtractionToProfile(extractionId, extraction, messageId, conversationId)`
   - Callers to update: `src/main/extraction.ts:60`

4. **Schema migration required**: Add unique index on `psychological_signals.dimension`

## Goals
- [ ] Extract and persist Life Situation signals (Tier 1)
- [ ] Extract and persist Immediate Intent per conversation (Tier 1)
- [ ] Extract and persist Moral Foundation signals (Tier 2)
- [ ] Properly persist Goals to `goals` table with status tracking (Tier 2)
- [ ] Persist Support-Seeking Style to `psychological_signals` (Tier 1)
- [ ] Extract and persist Big Five personality signals (Tier 3)
- [ ] Extract and persist Risk Tolerance signals (Tier 3)
- [ ] Extract and persist Motivation Style signals (Tier 3)
- [ ] Extract and persist Attachment Style signals (Tier 4)
- [ ] Extract and persist Locus of Control signals (Tier 4)
- [ ] Extract and persist Temporal Orientation signals (Tier 4)
- [ ] Extract and persist Growth Mindset signals (Tier 4)
- [ ] Extract and persist additional Tier 4 axes (Change Readiness, Stress Response, Emotional Regulation, Self-Efficacy)
- [ ] Update context assembly with confidence thresholds per tier
- [ ] Update response prompts to use extended context

## Non-Goals
- Not building completeness tracking UI (Phase 3)
- Not implementing guided onboarding questions (Phase 3)
- Not adding new extraction models or architectures

---

## User Stories

### US-201: Life Situation Extraction
**As a** system
**I want** to extract factual information about the user's life circumstances
**So that** advice is grounded in their reality

**Acceptance Criteria:**
- [ ] Given user mentions "my wife", when extraction runs, then relationship_status is set to "partnered/married"
- [ ] Given user mentions "I work at a startup", when extraction runs, then work_situation is set with job context
- [ ] Given user mentions "my kids", when extraction runs, then family_situation includes "has_children: true"
- [ ] Given multiple life facts shared, when profile is queried, then all facts are aggregated
- [ ] Given conflicting information (e.g., "single" then "my partner"), when extraction runs, then newer information takes precedence with confidence adjustment

### US-202: Immediate Intent Detection
**As a** system
**I want** to detect why the user is talking to me right now
**So that** I can tailor my response style appropriately

**Acceptance Criteria:**
- [ ] Given user asks "Should I take this job?", when extraction runs, then intent is "specific_question"
- [ ] Given user says "I just need to vent", when extraction runs, then intent is "emotional_processing"
- [ ] Given user says "Help me stay on track with my goal", when extraction runs, then intent is "accountability"
- [ ] Given intent changes mid-conversation, when extraction runs, then intent is updated
- [ ] Given intent is detected, when response is generated, then response style matches intent type

### US-203: Moral Foundations Extraction
**As a** system
**I want** to detect the user's moral intuitions
**So that** advice resonates with their sense of right and wrong

**Acceptance Criteria:**
- [ ] Given user expresses concern about fairness ("that's not fair"), when extraction runs, then fairness foundation signal is stored
- [ ] Given user prioritizes loyalty ("you don't abandon family"), when extraction runs, then loyalty foundation signal is stored
- [ ] Given multiple signals for same foundation, when profile is queried, then confidence increases
- [ ] Given signals for opposing foundations, when profile is queried, then both are stored with independent confidence

### US-204: Goals Persistence
**As a** system
**I want** extracted goals to be properly persisted
**So that** I can track progress and reference them later

**Acceptance Criteria:**
- [ ] Given user states a goal, when extraction runs, then goal is inserted into `goals` table
- [ ] Given user mentions same goal again, when extraction runs, then `last_mentioned` is updated
- [ ] Given user says "I achieved my goal of X", when extraction runs, then goal status changes to "achieved"
- [ ] Given user says "I gave up on X", when extraction runs, then goal status changes to "abandoned"
- [ ] Given context is assembled, when goals exist, then active goals appear in profile summary

### US-205: Support-Seeking Style Persistence
**As a** system
**I want** to persist detected support-seeking style
**So that** I consistently respond in the user's preferred way

**Acceptance Criteria:**
- [ ] Given user demonstrates emotional support preference, when extraction runs, then style is stored in `psychological_signals`
- [ ] Given style is detected multiple times, when queried, then confidence increases
- [ ] Given context is assembled, when style is known, then it appears in profile summary
- [ ] Given response is generated, when style is "emotional_support", then response leads with validation

### US-206: Big Five Personality Extraction
**As a** system
**I want** to detect Big Five personality signals
**So that** I can frame advice in a way that resonates with their personality

**Acceptance Criteria:**
- [ ] Given user says "I prefer being alone to recharge", when extraction runs, then extraversion signal is stored as "low"
- [ ] Given user shows organized, detailed planning, when extraction runs, then conscientiousness signal is stored as "high"
- [ ] Given user expresses worry/anxiety patterns, when extraction runs, then neuroticism signal is stored as "high"
- [ ] Given multiple signals for same trait, when queried, then confidence increases
- [ ] Given trait confidence >= 0.6, when context is assembled, then trait appears in profile summary

### US-207: Risk Tolerance Extraction
**As a** system
**I want** to detect risk tolerance patterns
**So that** I can calibrate advice boldness appropriately

**Acceptance Criteria:**
- [ ] Given user says "what's the worst that could happen, let's try it", when extraction runs, then risk_tolerance is "seeking"
- [ ] Given user says "but what if it goes wrong?", when extraction runs, then risk_tolerance is "averse"
- [ ] Given user weighs pros/cons analytically, when extraction runs, then risk_tolerance is "neutral"
- [ ] Given risk tolerance is known with confidence >= 0.6, when response includes a suggestion, then framing matches tolerance level

### US-208: Motivation Style Extraction
**As a** system
**I want** to detect approach vs avoidance motivation
**So that** I can frame goals in motivating language

**Acceptance Criteria:**
- [ ] Given user frames goals positively ("I want to achieve X"), when extraction runs, then motivation_style is "approach"
- [ ] Given user frames goals as escaping negatives ("I need to stop X"), when extraction runs, then motivation_style is "avoidance"
- [ ] Given motivation style is known, when response includes goal framing, then language matches style

### US-209: Attachment Style Extraction
**As a** system
**I want** to detect attachment style signals
**So that** I can navigate relationship discussions appropriately

**Acceptance Criteria:**
- [ ] Given user expresses fear of abandonment, when extraction runs, then attachment_style signal is "anxious"
- [ ] Given user values independence and distance in relationships, when extraction runs, then attachment_style signal is "avoidant"
- [ ] Given user shows balanced comfort with intimacy and independence, when extraction runs, then attachment_style signal is "secure"
- [ ] Given attachment signals detected, when relationship advice is given, then approach matches style

### US-210: Locus of Control Extraction
**As a** system
**I want** to detect internal vs external locus of control
**So that** I can appropriately empower or acknowledge constraints

**Acceptance Criteria:**
- [ ] Given user says "I made this happen" or takes responsibility, when extraction runs, then locus_of_control is "internal"
- [ ] Given user says "it just happened to me" or blames circumstances, when extraction runs, then locus_of_control is "external"
- [ ] Given locus is known, when response is generated, then agency framing matches

### US-211: Temporal Orientation Extraction
**As a** system
**I want** to detect where the user psychologically "lives"
**So that** I can meet them where they are temporally

**Acceptance Criteria:**
- [ ] Given user frequently mentions regrets and past hurts, when extraction runs, then temporal_orientation is "past_negative"
- [ ] Given user is highly goal-focused and sacrifices present, when extraction runs, then temporal_orientation is "future"
- [ ] Given user is spontaneous and pleasure-focused, when extraction runs, then temporal_orientation is "present_hedonistic"

### US-212: Growth Mindset Extraction
**As a** system
**I want** to detect fixed vs growth mindset signals
**So that** I can appropriately challenge or support

**Acceptance Criteria:**
- [ ] Given user says "I can learn this" or embraces challenge, when extraction runs, then growth_mindset is "growth"
- [ ] Given user says "I'm just not good at this" or avoids difficulty, when extraction runs, then growth_mindset is "fixed"
- [ ] Given mindset is known, when suggesting something challenging, then framing matches mindset

### US-213: Additional Tier 4 Axes
**As a** system
**I want** to detect Change Readiness, Stress Response, Emotional Regulation, and Self-Efficacy
**So that** I have a complete psychological picture

**Acceptance Criteria:**
- [ ] Given user is in contemplation stage ("maybe I should..."), when extraction runs, then change_readiness is "contemplation"
- [ ] Given user shows fight response to stress, when extraction runs, then stress_response is "fight"
- [ ] Given user tends to suppress emotions, when extraction runs, then emotional_regulation is "suppression"
- [ ] Given user expresses "I can figure this out", when extraction runs, then self_efficacy is "high"

### US-215: Sparse Extraction Handling
**As a** system
**I want** to gracefully handle messages with few or no psychological signals
**So that** the extraction pipeline doesn't fail or produce noise on neutral messages

**Acceptance Criteria:**
- [ ] Given user sends "What's the weather like?", when extraction runs, then extraction completes with mostly null/empty fields (no errors)
- [ ] Given user sends a neutral greeting, when extraction runs, then no new rows are added to `psychological_signals` table
- [ ] Given extraction returns null for optional fields, when `applyExtractionToProfile` runs, then no database errors occur
- [ ] Given extraction returns empty arrays for signal lists, when validation runs, then extraction is marked as valid
- [ ] Given a conversation with mixed signal-rich and signal-poor messages, when profile is queried, then only signal-rich extractions contribute to confidence scores

### US-214: Developer Profile Debug Page
**As a** developer
**I want** a debug page that displays all extracted user profile data
**So that** I can verify extractions are working correctly and understand what the system has learned

**Acceptance Criteria:**
- [ ] Given I navigate to the debug page, when the page loads, then I see a summary of all psychological signals grouped by tier
- [ ] Given psychological signals exist, when I view the debug page, then each signal shows: dimension, value, confidence score, evidence count, and last updated timestamp
- [ ] Given values have been extracted, when I view the debug page, then I see all user values with their confidence, description, and supporting quotes
- [ ] Given challenges have been extracted, when I view the debug page, then I see all active challenges with mention counts and status
- [ ] Given goals have been extracted, when I view the debug page, then I see all goals with their status (stated/in_progress/achieved/abandoned) and timeframes
- [ ] Given maslow signals have been extracted, when I view the debug page, then I see recent signals grouped by level with their descriptions
- [ ] Given evidence exists for any extraction, when I click on an item, then I see the supporting quotes and source message IDs
- [ ] Given the page is loaded, when I click a "Refresh" button, then the data reloads without full page reload
- [ ] Given the page is loaded, when I look at the header, then I see total counts: # of signals, # of values, # of challenges, # of goals
- [ ] Given the profile has confidence scores, when I view the page, then items below MIN_CONFIDENCE (0.5) are visually distinguished (e.g., grayed out)

**UI Structure:**
```
Debug: User Profile
================================
Signals: 12 | Values: 5 | Challenges: 3 | Goals: 2
[Refresh]

## Life Situation
- work_status: employed (0.75) - 3 evidence
- relationship_status: married (0.85) - 2 evidence
...

## Psychological Signals (by tier)
### Tier 1
- support_seeking_style: emotional_support (0.60)
### Tier 3
- big_five.extraversion: low (0.55)
- risk_tolerance: averse (0.40) [below threshold]
...

## Values
- family: "Prioritizes family relationships" (0.80)
  └ "my wife and kids are everything to me"
...

## Challenges
- Work-life balance (active) - mentioned 4 times
...

## Goals
- Learn guitar (stated) - short_term
...

## Recent Maslow Signals
- safety/concern: job security worries
...
```

**Files to Create:**
| File | Purpose |
|------|---------|
| `src/renderer/DebugProfile.tsx` | Debug page component |
| `src/renderer/components/SignalCard.tsx` | Reusable signal display component |

**Files to Modify:**
| File | Changes |
|------|---------|
| `src/main/ipc.ts` | Add `debug:getFullProfile` handler |
| `src/preload/index.ts` | Expose `debug.getFullProfile` |
| `src/shared/types.ts` | Add `FullProfileData` interface |
| `src/renderer/App.tsx` | Add route/toggle to access debug page |

**IPC Channel:** `debug:getFullProfile`

**Request:** None (no parameters)

**Response Type (`FullProfileData`):**
```typescript
export interface FullProfileData {
    counts: {
        signals: number;
        values: number;
        challenges: number;
        goals: number;
    };
    lifeSituation: Record<string, { value: string; confidence: number; evidenceCount: number }>;
    psychologicalSignals: {
        tier1: PsychologicalSignalDisplay[];
        tier2: PsychologicalSignalDisplay[];
        tier3: PsychologicalSignalDisplay[];
        tier4: PsychologicalSignalDisplay[];
    };
    values: ValueDisplay[];
    challenges: ChallengeDisplay[];
    goals: GoalDisplay[];
    maslowSignals: MaslowSignalDisplay[];
}

export interface PsychologicalSignalDisplay {
    dimension: string;
    value: string;
    confidence: number;
    evidenceCount: number;
    lastUpdated: string;
    belowThreshold: boolean;  // true if confidence < 0.5
}

export interface ValueDisplay {
    name: string;
    description: string | null;
    confidence: number;
    evidenceCount: number;
    quotes: string[];  // Supporting evidence
}

export interface ChallengeDisplay {
    description: string;
    status: string;
    mentionCount: number;
}

export interface GoalDisplay {
    description: string;
    status: string;
    timeframe: string | null;
    firstStated: string;
    lastMentioned: string | null;
}

export interface MaslowSignalDisplay {
    level: string;
    signalType: string;
    description: string | null;
    createdAt: string;
}
```

**Note:** US-214 is a developer tool and could be implemented as a separate PRD if desired. It has no dependencies on other user stories in this PRD.

---

## Phases

### Phase 2.5.0: Schema Migration

**File:** `src/main/db/sqlite.ts` (add to SCHEMA)

Two schema changes are required:

#### 1. Add `timeframe` column to `goals` table
The existing `goals` table is missing the `timeframe` column that the extraction types expect:

```sql
-- Add timeframe column to existing goals table
ALTER TABLE goals ADD COLUMN timeframe TEXT
    CHECK (timeframe IS NULL OR timeframe IN ('short_term', 'medium_term', 'long_term'));
```

**Note:** SQLite's ALTER TABLE doesn't support adding CHECK constraints directly. For a new install, modify the CREATE TABLE. For existing installs, the CHECK constraint is optional (validation happens in application code).

#### 2. Add unique index for `ON CONFLICT(dimension)` to work

```sql
-- Add after existing indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_psych_signals_dimension ON psychological_signals(dimension);
```

**Verification:** After migration, confirm changes:
```sql
-- Check index exists
SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='psychological_signals';

-- Check timeframe column exists
PRAGMA table_info(goals);
```

---

### Phase 2.5.1: Extended Extraction Types

#### 2.5.1.1 Type Modifications and Additions
**File:** `src/shared/types.ts`

**Modify existing `ExtractedGoal` interface** (add `status` field):

```typescript
export interface ExtractedGoal {
    description: string;
    timeframe?: 'short_term' | 'medium_term' | 'long_term';
    status?: 'stated' | 'in_progress' | 'achieved' | 'abandoned';  // NEW
    quote: string;
}
```

**Modify existing `SupportSeekingStyle` in `ExtractionResult`** (line 65):

```typescript
// Replace the old enum with:
support_seeking_style?: SupportSeekingStyle;  // Use the new type below
```

**Add new types:**

```typescript
// =============================================================================
// Extended Extraction Types (Phase 2.5)
// =============================================================================

export interface ExtendedExtractionResult extends ExtractionResult {
    life_situation?: ExtractedLifeSituation;
    immediate_intent?: ExtractedIntent;
    moral_signals?: ExtractedMoralSignal[];
}

export interface ExtractedLifeSituation {
    work?: {
        status: 'employed' | 'unemployed' | 'student' | 'retired' | 'self_employed' | 'unknown';
        description?: string;
        quote?: string;
    };
    relationship?: {
        status: 'single' | 'dating' | 'partnered' | 'married' | 'divorced' | 'widowed' | 'unknown';
        quote?: string;
    };
    family?: {
        has_children?: boolean;
        children_details?: string;
        parent_relationship?: string;
        quote?: string;
    };
    living?: {
        situation?: string; // "alone", "with partner", "with roommates", "with family"
        location?: string;
        quote?: string;
    };
    health?: {
        physical_concerns?: string[];
        mental_health_context?: string;
        quote?: string;
    };
    age_stage?: 'young_adult' | 'adult' | 'midlife' | 'senior' | 'unknown';
}

export type IntentType =
    | 'specific_question'
    | 'general_exploration'
    | 'emotional_processing'
    | 'accountability'
    | 'self_discovery'
    | 'crisis_support'
    | 'just_curious'
    | 'unknown';

export interface ExtractedIntent {
    type: IntentType;
    description: string;
    confidence: number;
    quote?: string;
}

export type MoralFoundation =
    | 'care'
    | 'fairness'
    | 'loyalty'
    | 'authority'
    | 'sanctity'
    | 'liberty';

export interface ExtractedMoralSignal {
    foundation: MoralFoundation;
    valence: 'positive' | 'negative'; // care vs harm, fairness vs cheating
    strength: 'weak' | 'moderate' | 'strong';
    quote: string;
}

export type SupportSeekingStyle =
    | 'emotional_support'
    | 'instrumental_support'
    | 'informational_support'
    | 'validation_support'
    | 'independence'
    | 'unclear';  // Used when extraction can't determine style

// =============================================================================
// Tier 3: Personality & Disposition
// =============================================================================

export type BigFiveTrait = 'openness' | 'conscientiousness' | 'extraversion' | 'agreeableness' | 'neuroticism';
export type TraitLevel = 'low' | 'moderate' | 'high';

export interface ExtractedBigFiveSignal {
    trait: BigFiveTrait;
    level: TraitLevel;
    confidence: number;
    quote: string;
}

export type RiskTolerance = 'seeking' | 'neutral' | 'averse';

export interface ExtractedRiskSignal {
    tolerance: RiskTolerance;
    confidence: number;
    quote: string;
}

export type MotivationStyle = 'approach' | 'avoidance' | 'mixed';

export interface ExtractedMotivationSignal {
    style: MotivationStyle;
    confidence: number;
    quote: string;
}

// =============================================================================
// Tier 4: Deeper Patterns
// =============================================================================

export type AttachmentStyle = 'secure' | 'anxious' | 'avoidant' | 'disorganized';

export interface ExtractedAttachmentSignal {
    style: AttachmentStyle;
    confidence: number;
    quote: string;
}

export type LocusOfControl = 'internal' | 'external' | 'mixed';

export interface ExtractedLocusSignal {
    locus: LocusOfControl;
    confidence: number;
    quote: string;
}

export type TemporalOrientation =
    | 'past_negative'
    | 'past_positive'
    | 'present_hedonistic'
    | 'present_fatalistic'
    | 'future';

export interface ExtractedTemporalSignal {
    orientation: TemporalOrientation;
    confidence: number;
    quote: string;
}

export type GrowthMindset = 'fixed' | 'growth' | 'mixed';

export interface ExtractedMindsetSignal {
    mindset: GrowthMindset;
    confidence: number;
    quote: string;
}

export type ChangeReadiness =
    | 'precontemplation'
    | 'contemplation'
    | 'preparation'
    | 'action'
    | 'maintenance';

export type StressResponse = 'fight' | 'flight' | 'freeze' | 'fawn';

export type EmotionalRegulation = 'suppression' | 'expression' | 'reappraisal' | 'rumination';

export type SelfEfficacy = 'low' | 'moderate' | 'high';

export interface ExtractedTier4Signals {
    change_readiness?: { stage: ChangeReadiness; confidence: number; quote?: string };
    stress_response?: { response: StressResponse; confidence: number; quote?: string };
    emotional_regulation?: { style: EmotionalRegulation; confidence: number; quote?: string };
    self_efficacy?: { level: SelfEfficacy; confidence: number; quote?: string };
}

// =============================================================================
// Complete Extraction Result
// =============================================================================

export interface CompleteExtractionResult extends ExtractionResult {
    // Tier 1 (existing + new)
    life_situation?: ExtractedLifeSituation;
    immediate_intent?: ExtractedIntent;

    // Tier 2 (new)
    moral_signals?: ExtractedMoralSignal[];

    // Tier 3 (new)
    big_five_signals?: ExtractedBigFiveSignal[];
    risk_tolerance?: ExtractedRiskSignal;
    motivation_style?: ExtractedMotivationSignal;

    // Tier 4 (new)
    attachment_signals?: ExtractedAttachmentSignal;
    locus_of_control?: ExtractedLocusSignal;
    temporal_orientation?: ExtractedTemporalSignal;
    growth_mindset?: ExtractedMindsetSignal;
    tier4_signals?: ExtractedTier4Signals;
}

// Database row types
export interface Goal {
    id: string;
    description: string;
    status: 'stated' | 'in_progress' | 'achieved' | 'abandoned';
    timeframe?: 'short_term' | 'medium_term' | 'long_term';
    first_stated: string;
    last_mentioned: string | null;
}

export interface PsychologicalSignal {
    id: string;
    dimension: string;
    value: string;
    confidence: number;
    evidence_count: number;
    last_updated: string;
}
```

---

### Phase 2.5.2: Extended Extraction Prompt

#### 2.5.2.1 Updated Extraction Prompt
**File:** `src/main/prompts/extraction.ts` (replace)

```typescript
export const EXTRACTION_PROMPT = `
You are analyzing a user message to extract psychological signals for a personal AI system.

## User Message
{message}

## Conversation Context (if available)
{context}

## Your Task
Extract any signals present in this message. Not every message will contain all signal types - only extract what's clearly present.

For EVERY extraction, you MUST include a direct quote from the message that supports it.

## Output Format (JSON)
{
    "raw_quotes": ["exact quotes containing key insights"],

    "values": [
        {
            "name": "short_identifier",
            "description": "what this value means to them",
            "value_type": "stated|revealed",
            "confidence": 0.0-1.0,
            "quote": "exact supporting quote"
        }
    ],

    "challenges": [
        {
            "description": "what they're struggling with",
            "severity": "minor|moderate|major",
            "quote": "exact supporting quote"
        }
    ],

    "goals": [
        {
            "description": "what they want to achieve",
            "timeframe": "short_term|medium_term|long_term",
            "status": "stated|in_progress|achieved|abandoned",
            "quote": "exact supporting quote"
        }
    ],

    "maslow_signals": [
        {
            "level": "physiological|safety|belonging|esteem|self_actualization",
            "signal_type": "concern|stable",
            "description": "brief description",
            "quote": "exact supporting quote"
        }
    ],

    "life_situation": {
        "work": {
            "status": "employed|unemployed|student|retired|self_employed|unknown",
            "description": "job/role description if mentioned",
            "quote": "supporting quote"
        },
        "relationship": {
            "status": "single|dating|partnered|married|divorced|widowed|unknown",
            "quote": "supporting quote"
        },
        "family": {
            "has_children": true|false,
            "children_details": "any details about children",
            "parent_relationship": "any details about parents",
            "quote": "supporting quote"
        },
        "living": {
            "situation": "alone|with_partner|with_roommates|with_family",
            "location": "city/region if mentioned",
            "quote": "supporting quote"
        },
        "health": {
            "physical_concerns": ["any health issues mentioned"],
            "mental_health_context": "any mental health context",
            "quote": "supporting quote"
        },
        "age_stage": "young_adult|adult|midlife|senior|unknown"
    },

    "immediate_intent": {
        "type": "specific_question|general_exploration|emotional_processing|accountability|self_discovery|crisis_support|just_curious|unknown",
        "description": "what they seem to want from this conversation",
        "confidence": 0.0-1.0,
        "quote": "supporting quote if available"
    },

    "moral_signals": [
        {
            "foundation": "care|fairness|loyalty|authority|sanctity|liberty",
            "valence": "positive|negative",
            "strength": "weak|moderate|strong",
            "quote": "exact supporting quote"
        }
    ],

    "emotional_tone": "overall emotional quality of the message",

    "support_seeking_style": "emotional_support|instrumental_support|informational_support|validation_support|independence|unclear",

    "big_five_signals": [
        {
            "trait": "openness|conscientiousness|extraversion|agreeableness|neuroticism",
            "level": "low|moderate|high",
            "confidence": 0.0-1.0,
            "quote": "supporting quote"
        }
    ],

    "risk_tolerance": {
        "tolerance": "seeking|neutral|averse",
        "confidence": 0.0-1.0,
        "quote": "supporting quote"
    },

    "motivation_style": {
        "style": "approach|avoidance|mixed",
        "confidence": 0.0-1.0,
        "quote": "supporting quote"
    },

    "attachment_signals": {
        "style": "secure|anxious|avoidant|disorganized",
        "confidence": 0.0-1.0,
        "quote": "supporting quote"
    },

    "locus_of_control": {
        "locus": "internal|external|mixed",
        "confidence": 0.0-1.0,
        "quote": "supporting quote"
    },

    "temporal_orientation": {
        "orientation": "past_negative|past_positive|present_hedonistic|present_fatalistic|future",
        "confidence": 0.0-1.0,
        "quote": "supporting quote"
    },

    "growth_mindset": {
        "mindset": "fixed|growth|mixed",
        "confidence": 0.0-1.0,
        "quote": "supporting quote"
    },

    "tier4_signals": {
        "change_readiness": {
            "stage": "precontemplation|contemplation|preparation|action|maintenance",
            "confidence": 0.0-1.0,
            "quote": "supporting quote"
        },
        "stress_response": {
            "response": "fight|flight|freeze|fawn",
            "confidence": 0.0-1.0,
            "quote": "supporting quote"
        },
        "emotional_regulation": {
            "style": "suppression|expression|reappraisal|rumination",
            "confidence": 0.0-1.0,
            "quote": "supporting quote"
        },
        "self_efficacy": {
            "level": "low|moderate|high",
            "confidence": 0.0-1.0,
            "quote": "supporting quote"
        }
    }
}

## Extraction Guidelines

### Life Situation
- Only extract what is explicitly stated or very strongly implied
- "My wife" → relationship: married/partnered
- "I work at..." → work: employed with description
- "My kids" → family: has_children: true
- Don't infer age from unrelated context

### Immediate Intent
- What do they want from THIS conversation right now?
- "Should I..." → specific_question
- "I just need to vent" → emotional_processing
- "I've been thinking about..." → general_exploration
- "Help me stay on track" → accountability
- "Why do I always..." → self_discovery

### Moral Foundations
- Care: concern for harm/suffering ("that's cruel", "I couldn't hurt...")
- Fairness: justice, equality, rights ("that's not fair", "they deserve...")
- Loyalty: group bonds, betrayal ("you don't abandon...", "they're family")
- Authority: hierarchy, tradition ("respect your elders", "that's how it's done")
- Sanctity: purity, disgust ("that's disgusting", "sacred", "pure")
- Liberty: autonomy, oppression ("don't tell me what to do", "freedom")

### Support-Seeking Style
- emotional_support: "I just need to be heard", wants validation
- instrumental_support: "What should I do?", wants solutions
- informational_support: "What do you think about...", wants analysis
- validation_support: "Am I crazy for thinking...", wants agreement
- independence: "Let me think out loud", wants space to process

### Big Five (OCEAN) - Tier 3
Infer from communication patterns, not direct questions:
- **Openness**: Curiosity, abstract thinking, tries new things (high) vs practical, prefers familiar (low)
- **Conscientiousness**: Organized, detailed, plans ahead (high) vs spontaneous, flexible (low)
- **Extraversion**: Energized by people, shares readily (high) vs prefers solitude, reserved (low)
- **Agreeableness**: Avoids conflict, cooperative (high) vs direct, comfortable with conflict (low)
- **Neuroticism**: Worry, anxiety, stress sensitivity (high) vs calm under pressure (low)

### Risk Tolerance - Tier 3
- seeking: "What's the worst that could happen?", excitement about uncertainty
- neutral: Weighs pros/cons analytically, calculated decisions
- averse: "But what if...", worst-case focus, needs guarantees

### Motivation Style - Tier 3
- approach: Goals framed positively ("I want to achieve X")
- avoidance: Goals framed as escaping negatives ("I need to stop X", "I don't want to...")

### Attachment Style - Tier 4
- secure: Balanced relationship talk, comfortable with vulnerability
- anxious: Relationship worry, needs reassurance, fears rejection
- avoidant: Values independence, uncomfortable with emotional demands
- disorganized: Contradictory patterns, intense then distant

### Locus of Control - Tier 4
- internal: "I made it happen", takes responsibility, agency language
- external: "It just happened", blames circumstances, feels helpless

### Temporal Orientation - Tier 4
- past_negative: Regrets, old hurts, "if only I had..."
- past_positive: Fond memories, tradition importance
- present_hedonistic: Spontaneous, pleasure-focused, "YOLO"
- present_fatalistic: "It is what it is", passive acceptance
- future: Goal-focused, planning, delayed gratification

### Growth Mindset - Tier 4
- growth: "I can learn this", embraces challenge, curious about improvement
- fixed: "I'm just not good at...", avoids difficulty, defensive about feedback

### Change Readiness (Prochaska) - Tier 4
- precontemplation: Doesn't see a problem, defensive
- contemplation: "Maybe I should...", ambivalent
- preparation: "I'm going to...", making plans
- action: "I've started...", doing the work
- maintenance: "I've been...", sustaining change

### Stress Response - Tier 4
- fight: Confronts, takes control, may become aggressive
- flight: Avoids, distracts, escapes
- freeze: Paralysis, can't decide, shuts down
- fawn: People-pleasing, over-accommodating

### Emotional Regulation - Tier 4
- suppression: Pushes feelings down
- expression: Lets emotions out
- reappraisal: Reframes the meaning
- rumination: Cycles on same thoughts

### Self-Efficacy - Tier 4
- high: "I can figure this out", confident in abilities
- low: "I don't think I can do this", doubts capabilities

### Sparse Extraction (Critical)
Most messages will only contain signals for 0-3 axes. This is expected and correct.

**Examples:**
- "What time is it?" → No psychological signals (return empty/null for all)
- "I'm stressed about my job interview tomorrow" → Maslow (safety concern), Challenge, possibly Goal
- "My wife thinks I should take the job" → Life situation (married), possibly Values conflict

**Rules:**
- Return `null` or omit fields entirely when no signal is present
- Return empty arrays `[]` for array fields with no signals
- NEVER invent signals to fill out the response
- A message with zero extractions is a valid, correct extraction

### General Rules
- Only extract what's explicitly present or strongly implied
- Confidence: 0.3 = tentative, 0.7 = clear, 0.9 = explicit
- NEVER fabricate quotes - use exact text from the message
- Omit fields or return null/empty when no signal is present
- life_situation fields are cumulative across conversations

Output valid JSON only, no markdown formatting.
`;

export function buildExtractionPrompt(message: string, context?: string): string {
    return EXTRACTION_PROMPT
        .replace('{message}', message)
        .replace('{context}', context || 'No prior context available.');
}
```

---

### Phase 2.5.3: Extended Profile Persistence

#### 2.5.3.1 Profile Update Functions
**File:** `src/main/db/profile.ts` (new)

```typescript
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './sqlite.js';
import type {
    ExtractedLifeSituation,
    ExtractedIntent,
    ExtractedMoralSignal,
    ExtractedGoal,
    ExtractedBigFiveSignal,
    ExtractedRiskSignal,
    ExtractedMotivationSignal,
    ExtractedAttachmentSignal,
    ExtractedLocusSignal,
    ExtractedTemporalSignal,
    ExtractedMindsetSignal,
    ExtractedTier4Signals,
    Goal,
    SupportSeekingStyle,
} from '../../shared/types.js';

// =============================================================================
// Life Situation
// =============================================================================

export function updateLifeSituation(
    extractionId: string,
    situation: ExtractedLifeSituation
): void {
    const db = getDb();
    const now = new Date().toISOString();

    // Store each dimension as a psychological signal
    if (situation.work?.status && situation.work.status !== 'unknown') {
        upsertPsychSignal('life_situation.work_status', situation.work.status, situation.work.quote);
        if (situation.work.description) {
            upsertPsychSignal('life_situation.work_description', situation.work.description, situation.work.quote);
        }
    }

    if (situation.relationship?.status && situation.relationship.status !== 'unknown') {
        upsertPsychSignal('life_situation.relationship_status', situation.relationship.status, situation.relationship.quote);
    }

    if (situation.family) {
        if (situation.family.has_children !== undefined) {
            upsertPsychSignal('life_situation.has_children', String(situation.family.has_children), situation.family.quote);
        }
        if (situation.family.children_details) {
            upsertPsychSignal('life_situation.children_details', situation.family.children_details, situation.family.quote);
        }
    }

    if (situation.living?.situation) {
        upsertPsychSignal('life_situation.living', situation.living.situation, situation.living.quote);
        if (situation.living.location) {
            upsertPsychSignal('life_situation.location', situation.living.location, situation.living.quote);
        }
    }

    if (situation.age_stage && situation.age_stage !== 'unknown') {
        upsertPsychSignal('life_situation.age_stage', situation.age_stage);
    }
}

// =============================================================================
// Immediate Intent
// =============================================================================

export function updateImmediateIntent(
    conversationId: string,
    intent: ExtractedIntent
): void {
    const db = getDb();
    const now = new Date().toISOString();

    // Intent is conversation-scoped, so we use a different pattern
    // Store as psychological signal with conversation qualifier
    const dimension = `intent.${conversationId}`;

    db.prepare(`
        INSERT INTO psychological_signals (id, dimension, value, confidence, evidence_count, last_updated)
        VALUES (?, ?, ?, ?, 1, ?)
        ON CONFLICT(dimension) DO UPDATE SET
            value = excluded.value,
            confidence = excluded.confidence,
            last_updated = excluded.last_updated
    `).run(uuidv4(), dimension, JSON.stringify(intent), intent.confidence, now);

    // Also store the general pattern (what kind of conversations do they have?)
    upsertPsychSignal('intent.pattern.' + intent.type, intent.type, intent.quote, 0.1);
}

export function getCurrentIntent(conversationId: string): ExtractedIntent | null {
    const db = getDb();
    const row = db.prepare(`
        SELECT value FROM psychological_signals
        WHERE dimension = ?
    `).get(`intent.${conversationId}`) as { value: string } | undefined;

    if (!row) return null;
    return JSON.parse(row.value) as ExtractedIntent;
}

// =============================================================================
// Moral Foundations
// =============================================================================

export function updateMoralFoundations(
    extractionId: string,
    signals: ExtractedMoralSignal[],
    messageId: string
): void {
    const db = getDb();
    const now = new Date().toISOString();

    for (const signal of signals) {
        const dimension = `moral.${signal.foundation}`;
        const strengthMultiplier = signal.strength === 'strong' ? 0.15 : signal.strength === 'moderate' ? 0.1 : 0.05;

        upsertPsychSignal(dimension, signal.valence, signal.quote, strengthMultiplier);

        // Store evidence
        const signalRow = db.prepare(`
            SELECT id FROM psychological_signals WHERE dimension = ?
        `).get(dimension) as { id: string } | undefined;

        if (signalRow) {
            db.prepare(`
                INSERT INTO evidence (id, target_type, target_id, message_id, quote, created_at)
                VALUES (?, 'moral_foundation', ?, ?, ?, ?)
            `).run(uuidv4(), signalRow.id, messageId, signal.quote, now);
        }
    }
}

// =============================================================================
// Goals
// =============================================================================

export function updateGoals(
    extractionId: string,
    goals: ExtractedGoal[],
    messageId: string
): void {
    const db = getDb();
    const now = new Date().toISOString();

    for (const goal of goals) {
        // Check for existing similar goal
        const existing = db.prepare(`
            SELECT * FROM goals
            WHERE description LIKE ?
            AND status NOT IN ('achieved', 'abandoned')
        `).get(`%${goal.description.slice(0, 30)}%`) as Goal | undefined;

        if (existing) {
            // Update existing goal
            const newStatus = goal.status || existing.status;
            db.prepare(`
                UPDATE goals
                SET last_mentioned = ?,
                    status = ?
                WHERE id = ?
            `).run(now, newStatus, existing.id);
        } else {
            // Insert new goal
            const id = uuidv4();
            db.prepare(`
                INSERT INTO goals (id, description, status, timeframe, first_stated, last_mentioned)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(id, goal.description, goal.status || 'stated', goal.timeframe || null, now, now);

            // Store evidence
            if (goal.quote) {
                db.prepare(`
                    INSERT INTO evidence (id, target_type, target_id, message_id, quote, created_at)
                    VALUES (?, 'goal', ?, ?, ?, ?)
                `).run(uuidv4(), id, messageId, goal.quote, now);
            }
        }
    }
}

export function getActiveGoals(limit: number = 5): Goal[] {
    const db = getDb();
    return db.prepare(`
        SELECT * FROM goals
        WHERE status IN ('stated', 'in_progress')
        ORDER BY last_mentioned DESC
        LIMIT ?
    `).all(limit) as Goal[];
}

// =============================================================================
// Support-Seeking Style
// =============================================================================

export function updateSupportSeekingStyle(
    style: SupportSeekingStyle,
    quote?: string
): void {
    if (style === 'unclear') return;
    upsertPsychSignal('support_seeking_style', style, quote, 0.15);
}

export function getSupportSeekingStyle(): { style: SupportSeekingStyle; confidence: number } | null {
    const db = getDb();
    const row = db.prepare(`
        SELECT value, confidence FROM psychological_signals
        WHERE dimension = 'support_seeking_style'
    `).get() as { value: string; confidence: number } | undefined;

    if (!row) return null;
    return { style: row.value as SupportSeekingStyle, confidence: row.confidence };
}

// =============================================================================
// Helpers
// =============================================================================

function upsertPsychSignal(
    dimension: string,
    value: string,
    quote?: string,
    confidenceIncrement: number = 0.1
): void {
    const db = getDb();
    const now = new Date().toISOString();

    const existing = db.prepare(`
        SELECT id, confidence, evidence_count FROM psychological_signals
        WHERE dimension = ?
    `).get(dimension) as { id: string; confidence: number; evidence_count: number } | undefined;

    if (existing) {
        // Update: increase confidence, increment evidence count
        const newConfidence = Math.min(0.95, existing.confidence + confidenceIncrement);
        db.prepare(`
            UPDATE psychological_signals
            SET value = ?,
                confidence = ?,
                evidence_count = evidence_count + 1,
                last_updated = ?
            WHERE dimension = ?
        `).run(value, newConfidence, now, dimension);
    } else {
        // Insert new
        db.prepare(`
            INSERT INTO psychological_signals (id, dimension, value, confidence, evidence_count, last_updated)
            VALUES (?, ?, ?, ?, 1, ?)
        `).run(uuidv4(), dimension, value, 0.5 + confidenceIncrement, now);
    }
}

// =============================================================================
// Aggregate Queries
// =============================================================================

export function getLifeSituation(): Record<string, string> {
    const db = getDb();
    const rows = db.prepare(`
        SELECT dimension, value FROM psychological_signals
        WHERE dimension LIKE 'life_situation.%'
    `).all() as { dimension: string; value: string }[];

    const result: Record<string, string> = {};
    for (const row of rows) {
        const key = row.dimension.replace('life_situation.', '');
        result[key] = row.value;
    }
    return result;
}

export function getMoralFoundations(): { foundation: string; valence: string; confidence: number }[] {
    const db = getDb();
    return db.prepare(`
        SELECT
            REPLACE(dimension, 'moral.', '') as foundation,
            value as valence,
            confidence
        FROM psychological_signals
        WHERE dimension LIKE 'moral.%'
        ORDER BY confidence DESC
    `).all() as { foundation: string; valence: string; confidence: number }[];
}

// =============================================================================
// Tier 3: Big Five, Risk Tolerance, Motivation Style
// =============================================================================

export function updateBigFiveSignals(
    signals: ExtractedBigFiveSignal[],
    messageId: string
): void {
    for (const signal of signals) {
        const dimension = `big_five.${signal.trait}`;
        const confidenceIncrement = signal.confidence * 0.1; // Scale by extraction confidence
        upsertPsychSignal(dimension, signal.level, signal.quote, confidenceIncrement);

        // Store evidence
        storeEvidence('big_five', dimension, messageId, signal.quote);
    }
}

export function updateRiskTolerance(signal: ExtractedRiskSignal, messageId: string): void {
    upsertPsychSignal('risk_tolerance', signal.tolerance, signal.quote, signal.confidence * 0.1);
    storeEvidence('risk_tolerance', 'risk_tolerance', messageId, signal.quote);
}

export function updateMotivationStyle(signal: ExtractedMotivationSignal, messageId: string): void {
    upsertPsychSignal('motivation_style', signal.style, signal.quote, signal.confidence * 0.1);
    storeEvidence('motivation_style', 'motivation_style', messageId, signal.quote);
}

export function getBigFiveProfile(): { trait: string; level: string; confidence: number }[] {
    const db = getDb();
    return db.prepare(`
        SELECT
            REPLACE(dimension, 'big_five.', '') as trait,
            value as level,
            confidence
        FROM psychological_signals
        WHERE dimension LIKE 'big_five.%'
        ORDER BY confidence DESC
    `).all() as { trait: string; level: string; confidence: number }[];
}

// =============================================================================
// Tier 4: Attachment, Locus, Temporal, Mindset, etc.
// =============================================================================

export function updateAttachmentStyle(signal: ExtractedAttachmentSignal, messageId: string): void {
    upsertPsychSignal('attachment_style', signal.style, signal.quote, signal.confidence * 0.1);
    storeEvidence('attachment_style', 'attachment_style', messageId, signal.quote);
}

export function updateLocusOfControl(signal: ExtractedLocusSignal, messageId: string): void {
    upsertPsychSignal('locus_of_control', signal.locus, signal.quote, signal.confidence * 0.1);
    storeEvidence('locus_of_control', 'locus_of_control', messageId, signal.quote);
}

export function updateTemporalOrientation(signal: ExtractedTemporalSignal, messageId: string): void {
    upsertPsychSignal('temporal_orientation', signal.orientation, signal.quote, signal.confidence * 0.1);
    storeEvidence('temporal_orientation', 'temporal_orientation', messageId, signal.quote);
}

export function updateGrowthMindset(signal: ExtractedMindsetSignal, messageId: string): void {
    upsertPsychSignal('growth_mindset', signal.mindset, signal.quote, signal.confidence * 0.1);
    storeEvidence('growth_mindset', 'growth_mindset', messageId, signal.quote);
}

export function updateTier4Signals(signals: ExtractedTier4Signals, messageId: string): void {
    if (signals.change_readiness) {
        upsertPsychSignal(
            'change_readiness',
            signals.change_readiness.stage,
            signals.change_readiness.quote,
            signals.change_readiness.confidence * 0.1
        );
    }
    if (signals.stress_response) {
        upsertPsychSignal(
            'stress_response',
            signals.stress_response.response,
            signals.stress_response.quote,
            signals.stress_response.confidence * 0.1
        );
    }
    if (signals.emotional_regulation) {
        upsertPsychSignal(
            'emotional_regulation',
            signals.emotional_regulation.style,
            signals.emotional_regulation.quote,
            signals.emotional_regulation.confidence * 0.1
        );
    }
    if (signals.self_efficacy) {
        upsertPsychSignal(
            'self_efficacy',
            signals.self_efficacy.level,
            signals.self_efficacy.quote,
            signals.self_efficacy.confidence * 0.1
        );
    }
}

// =============================================================================
// Evidence Helper
// =============================================================================

function storeEvidence(targetType: string, targetId: string, messageId: string, quote?: string): void {
    if (!quote) return;
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(`
        INSERT INTO evidence (id, target_type, target_id, message_id, quote, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), targetType, targetId, messageId, quote, now);
}

// =============================================================================
// Complete Profile Query
// =============================================================================

export interface CompleteProfile {
    lifeSituation: Record<string, string>;
    moralFoundations: { foundation: string; valence: string; confidence: number }[];
    bigFive: { trait: string; level: string; confidence: number }[];
    riskTolerance: { value: string; confidence: number } | null;
    motivationStyle: { value: string; confidence: number } | null;
    attachmentStyle: { value: string; confidence: number } | null;
    locusOfControl: { value: string; confidence: number } | null;
    temporalOrientation: { value: string; confidence: number } | null;
    growthMindset: { value: string; confidence: number } | null;
    changeReadiness: { value: string; confidence: number } | null;
    stressResponse: { value: string; confidence: number } | null;
    emotionalRegulation: { value: string; confidence: number } | null;
    selfEfficacy: { value: string; confidence: number } | null;
}

export function getCompleteProfile(): CompleteProfile {
    const db = getDb();

    const getSingleSignal = (dimension: string): { value: string; confidence: number } | null => {
        const row = db.prepare(`
            SELECT value, confidence FROM psychological_signals WHERE dimension = ?
        `).get(dimension) as { value: string; confidence: number } | undefined;
        return row || null;
    };

    return {
        lifeSituation: getLifeSituation(),
        moralFoundations: getMoralFoundations(),
        bigFive: getBigFiveProfile(),
        riskTolerance: getSingleSignal('risk_tolerance'),
        motivationStyle: getSingleSignal('motivation_style'),
        attachmentStyle: getSingleSignal('attachment_style'),
        locusOfControl: getSingleSignal('locus_of_control'),
        temporalOrientation: getSingleSignal('temporal_orientation'),
        growthMindset: getSingleSignal('growth_mindset'),
        changeReadiness: getSingleSignal('change_readiness'),
        stressResponse: getSingleSignal('stress_response'),
        emotionalRegulation: getSingleSignal('emotional_regulation'),
        selfEfficacy: getSingleSignal('self_efficacy'),
    };
}
```

---

### Phase 2.5.4: Update Extraction Service

#### 2.5.4.1 Extended Extraction Application
**File:** `src/main/extraction.ts` (modify applyExtractionToProfile)

Replace the `applyExtractionToProfile` function.

**Note (US-215 Sparse Extraction):** This function handles sparse extractions gracefully:
- All array fields use `|| []` fallback and length checks before iteration
- All optional fields use conditional checks (`if (extraction.field)`) before processing
- Empty extractions result in no database writes (correct behavior)

```typescript
import {
    updateLifeSituation,
    updateImmediateIntent,
    updateMoralFoundations,
    updateGoals,
    updateSupportSeekingStyle,
    updateBigFiveSignals,
    updateRiskTolerance,
    updateMotivationStyle,
    updateAttachmentStyle,
    updateLocusOfControl,
    updateTemporalOrientation,
    updateGrowthMindset,
    updateTier4Signals,
} from './db/profile.js';
import type { CompleteExtractionResult } from '../shared/types.js';

async function applyExtractionToProfile(
    extractionId: string,
    extraction: CompleteExtractionResult,
    messageId: string,
    conversationId: string
): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();

    // === Existing: Values ===
    for (const value of extraction.values || []) {
        const existingValue = db.prepare(`
            SELECT * FROM user_values WHERE name = ?
        `).get(value.name);

        if (existingValue) {
            db.prepare(`
                UPDATE user_values
                SET evidence_count = evidence_count + 1,
                    last_reinforced = ?,
                    confidence = MIN(0.95, confidence + 0.1)
                WHERE name = ?
            `).run(now, value.name);
        } else {
            const id = uuidv4();
            db.prepare(`
                INSERT INTO user_values (id, name, description, value_type, confidence, evidence_count, first_seen, last_reinforced)
                VALUES (?, ?, ?, ?, ?, 1, ?, ?)
            `).run(id, value.name, value.description, value.value_type, value.confidence, now, now);

            db.prepare(`
                INSERT INTO evidence (id, target_type, target_id, message_id, quote, created_at)
                VALUES (?, 'value', ?, ?, ?, ?)
            `).run(uuidv4(), id, messageId, value.quote, now);
        }
    }

    // === Existing: Challenges ===
    for (const challenge of extraction.challenges || []) {
        const existing = db.prepare(`
            SELECT * FROM challenges WHERE description LIKE ?
        `).get(`%${challenge.description.slice(0, 50)}%`);

        if (existing) {
            db.prepare(`
                UPDATE challenges
                SET mention_count = mention_count + 1, last_mentioned = ?
                WHERE id = ?
            `).run(now, (existing as { id: string }).id);
        } else {
            const id = uuidv4();
            db.prepare(`
                INSERT INTO challenges (id, description, status, first_mentioned, last_mentioned, mention_count)
                VALUES (?, ?, 'active', ?, ?, 1)
            `).run(id, challenge.description, now, now);

            db.prepare(`
                INSERT INTO evidence (id, target_type, target_id, message_id, quote, created_at)
                VALUES (?, 'challenge', ?, ?, ?, ?)
            `).run(uuidv4(), id, messageId, challenge.quote, now);
        }
    }

    // === Existing: Maslow Signals ===
    for (const signal of extraction.maslow_signals || []) {
        const id = uuidv4();
        db.prepare(`
            INSERT INTO maslow_signals (id, level, signal_type, description, created_at)
            VALUES (?, ?, ?, ?, ?)
        `).run(id, signal.level, signal.signal_type, signal.description, now);

        db.prepare(`
            INSERT INTO evidence (id, target_type, target_id, message_id, quote, created_at)
            VALUES (?, 'maslow', ?, ?, ?, ?)
        `).run(uuidv4(), id, messageId, signal.quote, now);
    }

    // === NEW: Goals ===
    if (extraction.goals && extraction.goals.length > 0) {
        updateGoals(extractionId, extraction.goals, messageId);
    }

    // === NEW: Life Situation ===
    if (extraction.life_situation) {
        updateLifeSituation(extractionId, extraction.life_situation);
    }

    // === NEW: Immediate Intent ===
    if (extraction.immediate_intent && extraction.immediate_intent.type !== 'unknown') {
        updateImmediateIntent(conversationId, extraction.immediate_intent);
    }

    // === NEW: Moral Foundations ===
    if (extraction.moral_signals && extraction.moral_signals.length > 0) {
        updateMoralFoundations(extractionId, extraction.moral_signals, messageId);
    }

    // === NEW: Support-Seeking Style ===
    if (extraction.support_seeking_style && extraction.support_seeking_style !== 'unclear') {
        updateSupportSeekingStyle(
            extraction.support_seeking_style,
            extraction.raw_quotes?.[0]
        );
    }

    // === NEW: Tier 3 - Big Five ===
    if (extraction.big_five_signals && extraction.big_five_signals.length > 0) {
        updateBigFiveSignals(extraction.big_five_signals, messageId);
    }

    // === NEW: Tier 3 - Risk Tolerance ===
    if (extraction.risk_tolerance) {
        updateRiskTolerance(extraction.risk_tolerance, messageId);
    }

    // === NEW: Tier 3 - Motivation Style ===
    if (extraction.motivation_style) {
        updateMotivationStyle(extraction.motivation_style, messageId);
    }

    // === NEW: Tier 4 - Attachment Style ===
    if (extraction.attachment_signals) {
        updateAttachmentStyle(extraction.attachment_signals, messageId);
    }

    // === NEW: Tier 4 - Locus of Control ===
    if (extraction.locus_of_control) {
        updateLocusOfControl(extraction.locus_of_control, messageId);
    }

    // === NEW: Tier 4 - Temporal Orientation ===
    if (extraction.temporal_orientation) {
        updateTemporalOrientation(extraction.temporal_orientation, messageId);
    }

    // === NEW: Tier 4 - Growth Mindset ===
    if (extraction.growth_mindset) {
        updateGrowthMindset(extraction.growth_mindset, messageId);
    }

    // === NEW: Tier 4 - Additional Signals ===
    if (extraction.tier4_signals) {
        updateTier4Signals(extraction.tier4_signals, messageId);
    }
}
```

#### 2.5.4.2 Extended Validation
**File:** `src/main/extraction.ts` (modify `validateExtraction`)

Extend quote validation to include new signal types:

```typescript
export function validateExtraction(jsonStr: string, originalMessage: string): ValidationResult {
    const errors: string[] = [];

    // Layer 1: Parse JSON
    let extraction: CompleteExtractionResult;
    try {
        extraction = JSON.parse(jsonStr);
    } catch {
        return { valid: false, errors: ['Invalid JSON format'] };
    }

    // Layer 2: Verify quotes exist in original message
    const normalizedMessage = originalMessage.toLowerCase().replace(/\s+/g, ' ');

    const allQuotes = [
        ...(extraction.raw_quotes || []),
        ...(extraction.values?.map(v => v.quote) || []),
        ...(extraction.challenges?.map(c => c.quote) || []),
        ...(extraction.goals?.map(g => g.quote) || []),
        ...(extraction.maslow_signals?.map(m => m.quote) || []),
        // NEW: Extended signal quotes
        ...(extraction.moral_signals?.map(m => m.quote) || []),
        ...(extraction.big_five_signals?.map(b => b.quote) || []),
        extraction.life_situation?.work?.quote,
        extraction.life_situation?.relationship?.quote,
        extraction.life_situation?.family?.quote,
        extraction.life_situation?.living?.quote,
        extraction.immediate_intent?.quote,
        extraction.risk_tolerance?.quote,
        extraction.motivation_style?.quote,
        extraction.attachment_signals?.quote,
        extraction.locus_of_control?.quote,
        extraction.temporal_orientation?.quote,
        extraction.growth_mindset?.quote,
        extraction.tier4_signals?.change_readiness?.quote,
        extraction.tier4_signals?.stress_response?.quote,
        extraction.tier4_signals?.emotional_regulation?.quote,
        extraction.tier4_signals?.self_efficacy?.quote,
    ].filter(Boolean) as string[];

    for (const quote of allQuotes) {
        const normalizedQuote = quote.toLowerCase().replace(/\s+/g, ' ').trim();
        if (normalizedQuote.length > 10 && !normalizedMessage.includes(normalizedQuote)) {
            errors.push(`Quote not found: "${quote.slice(0, 50)}..."`);
        }
    }

    return { valid: errors.length === 0, errors };
}
```

#### 2.5.4.3 Update runExtraction Call Site
**File:** `src/main/extraction.ts` (modify `runExtraction`)

Pass `messageId` and `conversationId` through to `applyExtractionToProfile`:

```typescript
export async function runExtraction(messageId: string, conversationId: string): Promise<Extraction> {
    // ... existing code ...

    // If valid, apply to profile
    if (validation.valid) {
        await applyExtractionToProfile(
            id,
            JSON.parse(extractionJson) as CompleteExtractionResult,
            messageId,
            conversationId
        );
    }

    // ... rest unchanged ...
}
```

#### 2.5.4.4 Update IPC Callers
**File:** `src/main/ipc.ts` (modify chat handlers)

Update extraction calls to pass conversationId:

```typescript
// Line ~53 (chat:send handler)
runExtraction(userMessage.id, conversation.id).catch(err => {
    console.error('Extraction failed:', err);
});

// Line ~86 (chat:stream handler)
runExtraction(userMessage.id, conversation.id).catch(err => {
    console.error('Extraction failed:', err);
});
```

---

### Phase 2.5.5: Extended Context Assembly

#### 2.5.5.1 Updated Context Builder
**File:** `src/main/context.ts` (modify)

Add imports and update `assembleContext`:

```typescript
import {
    getLifeSituation,
    getMoralFoundations,
    getActiveGoals,
    getSupportSeekingStyle,
    getCurrentIntent,
    getCompleteProfile,
    type CompleteProfile,
} from './db/profile.js';
import type { Goal } from '../shared/types.js';

// Minimum confidence to include a signal in context
// If a signal isn't reliable enough to use, it should have low confidence -
// that's what confidence means. No separate tier thresholds.
const MIN_CONFIDENCE = 0.5;

export interface AssembledContext {
    profileSummary: string;
    relevantMessages: string;
    recentHistory: string;
    tokenEstimate: number;
    // New: structured data for response prompt
    supportStyle: string | null;
    currentIntent: string | null;
}

export async function assembleContext(
    currentMessage: string,
    recentMessages: Message[],
    conversationId: string
): Promise<AssembledContext> {
    const db = getDb();

    // === Existing profile data ===
    const values = db.prepare(`
        SELECT * FROM user_values ORDER BY confidence DESC LIMIT 5
    `).all() as Value[];

    const challenges = db.prepare(`
        SELECT * FROM challenges WHERE status = 'active' ORDER BY mention_count DESC LIMIT 3
    `).all() as Challenge[];

    const maslowSignals = db.prepare(`
        SELECT * FROM maslow_signals ORDER BY created_at DESC LIMIT 5
    `).all() as MaslowSignal[];

    // === NEW: Extended profile data ===
    const lifeSituation = getLifeSituation();
    const moralFoundations = getMoralFoundations();
    const goals = getActiveGoals(3);
    const supportStyle = getSupportSeekingStyle();
    const currentIntent = getCurrentIntent(conversationId);
    const completeProfile = getCompleteProfile();

    // Build extended profile summary with all tiers
    const profileSummary = buildCompleteProfileSummary(
        values,
        challenges,
        maslowSignals,
        goals,
        completeProfile
    );

    // Semantic search for relevant past messages
    const queryVector = await embed(currentMessage, 'query');
    const similarMessages = await searchSimilarMessages(queryVector, 3);
    const relevantMessages = formatRelevantMessages(similarMessages);

    // Format recent history
    const recentHistory = formatRecentHistory(recentMessages.slice(-10));

    // Estimate tokens
    const tokenEstimate = Math.ceil(
        (profileSummary.length + relevantMessages.length + recentHistory.length) / 4
    );

    return {
        profileSummary,
        relevantMessages,
        recentHistory,
        tokenEstimate,
        supportStyle: supportStyle?.style || null,
        currentIntent: currentIntent?.type || null,
    };
}

function buildCompleteProfileSummary(
    values: Value[],
    challenges: Challenge[],
    maslowSignals: MaslowSignal[],
    goals: Goal[],
    profile: CompleteProfile
): string {
    const parts: string[] = [];

    // Helper: only include signals above minimum confidence
    const confident = <T extends { confidence: number }>(
        signal: T | null
    ): signal is T => signal !== null && signal.confidence >= MIN_CONFIDENCE;

    // ==========================================================================
    // Life Context (factual - no confidence threshold, these are stated facts)
    // ==========================================================================

    if (Object.keys(profile.lifeSituation).length > 0) {
        parts.push('## Life Context');
        const ls = profile.lifeSituation;
        if (ls.work_status) {
            const desc = ls.work_description ? `: ${ls.work_description}` : '';
            parts.push(`- Work: ${ls.work_status}${desc}`);
        }
        if (ls.relationship_status) {
            parts.push(`- Relationship: ${ls.relationship_status}`);
        }
        if (ls.has_children === 'true') {
            const details = ls.children_details ? ` (${ls.children_details})` : '';
            parts.push(`- Has children${details}`);
        }
        if (ls.living) {
            const loc = ls.location ? ` in ${ls.location}` : '';
            parts.push(`- Living: ${ls.living}${loc}`);
        }
    }

    // ==========================================================================
    // Maslow Concerns
    // ==========================================================================

    const concerns = maslowSignals.filter(s => s.signal_type === 'concern');
    if (concerns.length > 0) {
        parts.push('\n## Areas of Concern');
        for (const s of concerns) {
            parts.push(`- ${s.level}: ${s.description}`);
        }
    }

    // ==========================================================================
    // Values & Goals
    // ==========================================================================

    // Values already have confidence filtering in the query (ORDER BY confidence DESC LIMIT 5)
    if (values.length > 0) {
        parts.push('\n## What Matters to This Person');
        for (const v of values) {
            parts.push(`- ${v.name}: ${v.description}`);
        }
    }

    if (goals.length > 0) {
        parts.push('\n## Active Goals');
        for (const g of goals) {
            const status = g.status === 'in_progress' ? ' (working on)' : '';
            parts.push(`- ${g.description}${status}`);
        }
    }

    // ==========================================================================
    // Challenges
    // ==========================================================================

    if (challenges.length > 0) {
        parts.push('\n## Current Challenges');
        for (const c of challenges) {
            parts.push(`- ${c.description}`);
        }
    }

    // ==========================================================================
    // Moral Foundations (use MIN_CONFIDENCE)
    // ==========================================================================

    const confidentMoral = profile.moralFoundations.filter(m => m.confidence >= MIN_CONFIDENCE);
    if (confidentMoral.length > 0) {
        parts.push('\n## Moral Sensitivities');
        for (const m of confidentMoral) {
            parts.push(`- Strong ${m.foundation} foundation`);
        }
    }

    // ==========================================================================
    // Personality & Disposition (use MIN_CONFIDENCE)
    // ==========================================================================

    const personalityParts: string[] = [];

    // Big Five traits
    const confidentTraits = profile.bigFive.filter(t => t.confidence >= MIN_CONFIDENCE);
    for (const t of confidentTraits) {
        personalityParts.push(`- ${t.trait}: ${t.level}`);
    }

    if (confident(profile.riskTolerance)) {
        personalityParts.push(`- Risk tolerance: ${profile.riskTolerance.value}`);
    }

    if (confident(profile.motivationStyle)) {
        personalityParts.push(`- Motivation: ${profile.motivationStyle.value}-oriented`);
    }

    if (confident(profile.attachmentStyle)) {
        personalityParts.push(`- Attachment: ${profile.attachmentStyle.value}`);
    }

    if (confident(profile.locusOfControl)) {
        personalityParts.push(`- Locus of control: ${profile.locusOfControl.value}`);
    }

    if (confident(profile.temporalOrientation)) {
        personalityParts.push(`- Temporal focus: ${profile.temporalOrientation.value}`);
    }

    if (confident(profile.growthMindset)) {
        personalityParts.push(`- Mindset: ${profile.growthMindset.value}`);
    }

    if (confident(profile.selfEfficacy)) {
        personalityParts.push(`- Self-efficacy: ${profile.selfEfficacy.value}`);
    }

    if (personalityParts.length > 0) {
        parts.push('\n## Personality & Patterns');
        parts.push(...personalityParts);
    }

    return parts.join('\n');
}
```

---

### Phase 2.5.6: Updated Response Prompts

#### 2.5.6.1 Intent-Aware Response Prompt
**File:** `src/main/prompts/response.ts` (modify)

```typescript
export const RESPONSE_SYSTEM_PROMPT = `
You are a thoughtful AI companion focused on helping the user understand themselves better.

## Your Approach
- Be warm but not effusive
- Reference what you know about them when relevant (but don't force it)
- Ask thoughtful follow-up questions
- Notice patterns and gently surface insights
- Match their emotional register

## What You Know About Them
{profile_summary}

{relevant_messages}

## Response Style Guidance
{style_guidance}

## Guidelines
- If you reference something from their profile, do so naturally ("You mentioned before that...")
- Don't list everything you know - use context subtly
- If profile is empty, focus on getting to know them
- Keep responses conversational, not clinical
`;

export const STYLE_GUIDANCE = {
    // Support-seeking styles
    emotional_support: `They prefer emotional support. Lead with validation and empathy. Don't jump to solutions unless they ask.`,
    instrumental_support: `They prefer practical help. Be direct with options and action steps. Don't over-process emotions.`,
    informational_support: `They prefer analysis and information. Provide perspectives, trade-offs, and thinking frameworks.`,
    validation_support: `They're seeking validation. Affirm their feelings first ("That makes sense"). Then gently expand the view if needed.`,
    independence: `They prefer to figure things out themselves. Ask questions, reflect back, let them drive.`,

    // Intents
    specific_question: `They have a specific question. Focus on answering it directly before exploring tangents.`,
    general_exploration: `They're exploring generally. Follow their lead, ask questions, let the conversation unfold.`,
    emotional_processing: `They need to process emotions. Prioritize listening and validation. Don't rush to solutions.`,
    accountability: `They want accountability support. Be direct, check in on commitments, hold them to their goals (gently).`,
    self_discovery: `They're seeking self-understanding. Reflect patterns, offer observations, help them see themselves.`,
    crisis_support: `They may be in distress. Validate, assess severity, be present. Suggest professional resources if appropriate.`,
};

export function buildStyleGuidance(supportStyle: string | null, intent: string | null): string {
    const parts: string[] = [];

    if (supportStyle && STYLE_GUIDANCE[supportStyle as keyof typeof STYLE_GUIDANCE]) {
        parts.push(STYLE_GUIDANCE[supportStyle as keyof typeof STYLE_GUIDANCE]);
    }

    if (intent && STYLE_GUIDANCE[intent as keyof typeof STYLE_GUIDANCE]) {
        parts.push(STYLE_GUIDANCE[intent as keyof typeof STYLE_GUIDANCE]);
    }

    if (parts.length === 0) {
        return 'No specific style signals detected. Be adaptive and attentive to their needs.';
    }

    return parts.join('\n\n');
}
```

---

## Files Summary

### Files to Create
| File | Purpose |
|------|---------|
| `src/main/db/profile.ts` | Extended profile persistence functions |
| `src/renderer/DebugProfile.tsx` | Debug page component for US-214 |
| `src/renderer/components/SignalCard.tsx` | Reusable signal display component for US-214 |
| `tests/integration/extended-axes.spec.ts` | Phase 2.5 integration tests |
| `tests/debug-profile.spec.ts` | Debug page tests for US-214 |

### Files to Modify
| File | Changes |
|------|---------|
| `src/shared/types.ts` | Modify `ExtractedGoal` (add status), modify `SupportSeekingStyle` enum, add extended extraction types, Goal, FullProfileData |
| `src/main/db/sqlite.ts` | Add unique index on `psychological_signals.dimension` |
| `src/main/prompts/extraction.ts` | Expand prompt for all Tier 1-4 axes |
| `src/main/extraction.ts` | Update `runExtraction` to pass messageId/conversationId, update `applyExtractionToProfile` signature, extend `validateExtraction` for new signal types |
| `src/main/context.ts` | Add `conversationId` parameter, include life situation, goals, moral foundations, intent |
| `src/main/prompts/response.ts` | Add style guidance based on support style and intent |
| `src/main/ipc.ts` | Pass `conversation.id` to `assembleContext` (lines 44, 71), pass messageId/conversationId to extraction, add `debug:getFullProfile` handler |
| `src/preload/index.ts` | Expose `debug.getFullProfile` |
| `src/renderer/App.tsx` | Add route/toggle to access debug page |

---

## Database Usage

This phase requires two schema changes (see Phase 2.5.0):
1. Add `timeframe` column to `goals` table
2. Add unique index `idx_psych_signals_dimension` on `psychological_signals(dimension)`

Tables used:

| Table | Usage |
|-------|-------|
| `goals` | Store extracted goals with status tracking |
| `psychological_signals` | Store life situation, moral foundations, support style, intent patterns |
| `evidence` | Link all extractions to source quotes |

The `psychological_signals` table's flexible `dimension`/`value` structure accommodates all new axes:
- `life_situation.work_status` → "employed"
- `life_situation.relationship_status` → "married"
- `moral.care` → "positive"
- `moral.fairness` → "positive"
- `support_seeking_style` → "emotional_support"
- `intent.{conversation_id}` → JSON intent object

---

## Quality Gates

- `make typecheck` - Type checking passes
- `make lint` - No linting errors
- `make test` - All tests pass
- `make build` - Build succeeds

---

## Verification Checklist

### Tier 1: Life Situation & Intent
1. [ ] Send "My wife and I have been arguing" → `life_situation.relationship_status` = "married"
2. [ ] Send "I work at a tech startup" → `life_situation.work_status` = "employed"
3. [ ] Send "Should I take this job?" → `immediate_intent.type` = "specific_question"
4. [ ] Send "I just need to vent" → `immediate_intent.type` = "emotional_processing"

### Tier 2: Moral Foundations & Goals
5. [ ] Send "That's not fair to the workers" → `moral.fairness` signal stored
6. [ ] Send "Family comes first, always" → `moral.loyalty` signal stored
7. [ ] Send "I want to learn guitar this year" → Goal stored in `goals` table
8. [ ] Send "I finally learned guitar!" → Goal status updated to "achieved"

### Tier 3: Personality
9. [ ] Send "I prefer being alone to recharge" → `big_five.extraversion` = "low"
10. [ ] Send "I always plan everything in detail" → `big_five.conscientiousness` = "high"
11. [ ] Send "What's the worst that could happen? Let's try it!" → `risk_tolerance` = "seeking"
12. [ ] Send "I need to stop procrastinating" → `motivation_style` = "avoidance"

### Tier 4: Deeper Patterns
13. [ ] Send "I'm always worried they'll leave me" → `attachment_style` = "anxious"
14. [ ] Send "I made it happen through hard work" → `locus_of_control` = "internal"
15. [ ] Send "If only I hadn't made that mistake years ago" → `temporal_orientation` = "past_negative"
16. [ ] Send "I'm just not good at math, never have been" → `growth_mindset` = "fixed"
17. [ ] Send "I think I'm ready to finally make this change" → `change_readiness` = "preparation"

### Sparse Extraction (US-215)
18. [ ] Send "What's the weather like?" → Extraction returns with mostly null/empty fields (no errors)
19. [ ] Send neutral message → No new rows added to `psychological_signals` table
20. [ ] Extraction service handles null fields gracefully without throwing
21. [ ] Empty arrays in extraction result don't cause validation failures

### Context Assembly
22. [ ] Signal with confidence >= 0.5 appears in context summary
23. [ ] Signal with confidence < 0.5 does NOT appear in context summary
24. [ ] Check response with support_style="emotional_support" → Response leads with validation

### Developer Debug Page (US-214)
25. [ ] Navigate to debug page → Page loads with profile data grouped by section
26. [ ] View psychological signals → Each shows dimension, value, confidence, evidence count
27. [ ] View values section → Shows all extracted values with quotes
28. [ ] View challenges section → Shows active challenges with mention counts
29. [ ] View goals section → Shows all goals with status and timeframe
30. [ ] Click Refresh button → Data reloads without page reload
31. [ ] View low-confidence items → Items below 0.5 are visually distinguished (grayed)
32. [ ] View header counts → Shows totals for signals, values, challenges, goals
33. [ ] Empty profile → Page displays gracefully with "No data yet" messages

---

## Implementation Order

1. **Schema migration**: Add `timeframe` column to `goals` table and unique index to `psychological_signals.dimension` in `src/main/db/sqlite.ts`
2. **Type modifications**: Update `ExtractedGoal` and `SupportSeekingStyle` in `src/shared/types.ts`
3. **Add extended types** to `src/shared/types.ts` (new interfaces)
4. **Create `src/main/db/profile.ts`** with profile update functions
5. **Update `src/main/prompts/extraction.ts`** with extended prompt
6. **Update `src/main/extraction.ts`**:
   - Extend `validateExtraction` for new signal types
   - Update `runExtraction` signature to accept `conversationId`
   - Update `applyExtractionToProfile` signature and implementation
7. **Update `src/main/ipc.ts`**:
   - Pass `conversation.id` to `assembleContext` (lines 44, 71)
   - Pass `conversation.id` to `runExtraction` (lines 53, 86)
8. **Update `src/main/context.ts`**: Add `conversationId` parameter, include extended profile data
9. **Update `src/main/prompts/response.ts`** with style guidance
10. **Build developer debug page (US-214)** (optional, can be deferred):
    a. Add `FullProfileData` and related types to `src/shared/types.ts`
    b. Add `debug:getFullProfile` IPC handler
    c. Expose in preload
    d. Create `DebugProfile.tsx` component
    e. Add navigation toggle to `App.tsx`
11. **Write tests** (including sparse extraction tests for US-215)
12. **Run verification checklist**

---

## Dependencies

- **Requires Phase 2 complete**: Message persistence, basic extraction pipeline, context assembly
- **No new npm packages**: Uses existing SQLite, uuid, Anthropic SDK

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Extraction prompt size | Minimal - ~3K tokens is <2% of Haiku's 200K context | Monitor cost (~$0.005-0.01 per extraction with Haiku 4.5) |
| Life situation extraction too aggressive | Privacy concerns | Only extract explicitly stated facts |
| Intent detection wrong | Mismatched response style | Allow user to correct, track accuracy |
| Moral foundation signals noisy | Bad advice framing | Same MIN_CONFIDENCE (0.5) threshold as all signals |
| Big Five extraction unreliable | Wrong personality framing | Confidence must reach 0.5 before use; multiple signals increase confidence |
| Some axes slow to mature | Limited early value | Store from day one, confidence naturally rises with evidence |
| Conflicting signals | Confusing profile | Store both with confidence, let highest win |
| Extraction JSON too complex | Parse failures | Robust validation, fallback to partial extraction |

---

## Future Considerations

- **Completeness tracking UI**: Phase 3 can show which axes have data and confidence levels
- **Guided questions**: Phase 3 can use completeness to ask targeted questions for low-data axes
- **Axis correlation analysis**: Identify when axes conflict or reinforce each other
- **Confidence decay**: Consider reducing confidence on axes that haven't been reinforced recently
- **User corrections**: Allow users to correct or reject extracted signals in Phase 3 UI
