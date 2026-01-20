# Phase 3: Profile Visibility ("Your Self-Portrait")

## Overview

Enable users to view and influence the psychological profile the system has built about them. Users can upvote accurate insights or downvote incorrect ones. The interface should feel warm and insightful, not clinical - helping users see themselves more clearly.

## Non-Goals

- **Not building fancy visualizations** - No radar charts, graphs, or complex data viz. Phase 3 uses cards and text.
- **Not allowing free-form editing** - Users vote on accuracy, not rewrite content.
- **Not adding new extraction capabilities** - Use existing Phase 2.5 extraction pipeline as-is.
- **Not implementing profile export** - Export/backup is a future feature.
- **Not adding conversation history view** - Focus is on the synthesized profile, not raw transcripts.
- **Not implementing onboarding deep dives** - Those are Phase 4.
- **Not changing the chat interface** - Profile view is a separate panel/page.

## User Stories

### US-301: View Profile Summary

**As a** user
**I want** to see a summary of what the system knows about me
**So that** I understand how my conversations are being interpreted

**Acceptance Criteria:**
- [ ] Profile view is accessible via a button/tab in the main UI
- [ ] Shows identity summary (2-3 sentences about who they are)
- [ ] Shows current life phase label (e.g., "career_transition")
- [ ] Shows primary concerns (top 3 things on their mind)
- [ ] Shows emotional baseline (e.g., "anxious_but_hopeful")
- [ ] Empty state shows friendly message when no data exists yet

### US-302: View Extracted Values

**As a** user
**I want** to see the values the system has identified
**So that** I can verify they match my self-perception

**Acceptance Criteria:**
- [ ] Values displayed as cards with name, description, and confidence indicator
- [ ] Confidence shown visually (e.g., "Emerging", "Established", "Core")
- [ ] Each value shows supporting evidence count
- [ ] Values sorted by confidence (highest first)
- [ ] Clicking a value expands to show source quotes (evidence)
- [ ] Empty state when no values extracted yet

### US-303: View Current Challenges

**As a** user
**I want** to see the challenges the system has identified
**So that** I can confirm the system understands what I'm dealing with

**Acceptance Criteria:**
- [ ] Challenges displayed as cards with description and status
- [ ] Status shown: "Active", "Resolved", "Recurring"
- [ ] Shows how many times challenge was mentioned
- [ ] Shows when first and last mentioned
- [ ] Clicking expands to show source quotes
- [ ] Empty state when no challenges identified

### US-304: View Maslow Status

**As a** user
**I want** to see which levels of needs the system thinks are challenged or stable
**So that** I understand how my basic needs are being assessed

**Acceptance Criteria:**
- [ ] Shows all 5 Maslow levels: Physiological, Safety, Belonging, Esteem, Self-Actualization
- [ ] Each level shows status: "Concern", "Stable", or "Unknown"
- [ ] Levels with concerns are visually highlighted
- [ ] Shows description of specific signals detected
- [ ] Clicking expands to show source quotes

### US-305: View Psychological Signals

**As a** user
**I want** to see personality and behavioral patterns the system has detected
**So that** I can see how my patterns are being interpreted

**Acceptance Criteria:**
- [ ] Groups signals by tier: Essential, Early Inference, Personality, Deeper Patterns
- [ ] Each signal shows: dimension name, detected value, confidence
- [ ] Only shows signals with confidence >= 0.5 (the MIN_CONFIDENCE threshold)
- [ ] Uses friendly labels (e.g., "Support Style" not "support_seeking_style")
- [ ] Clicking expands to show source quotes
- [ ] Tier sections collapsible, Tier 1 expanded by default

### US-306: View Goals

**As a** user
**I want** to see the goals the system has identified
**So that** I can verify it understands what I'm working toward

**Acceptance Criteria:**
- [ ] Goals displayed as cards with description, status, timeframe
- [ ] Status: "Stated", "In Progress", "Achieved", "Abandoned"
- [ ] Timeframe: "Short-term", "Medium-term", "Long-term"
- [ ] Clicking expands to show source quotes
- [ ] Empty state when no goals identified

### US-307: Upvote Accurate Insight

**As a** user
**I want** to upvote insights that are accurate
**So that** the system knows it understood me correctly

**Acceptance Criteria:**
- [ ] Each profile item (value, challenge, signal, goal) has an upvote button (thumbs up)
- [ ] Clicking upvote increases the item's confidence by 0.1 (capped at 1.0)
- [ ] Visual feedback when upvoted (button fills, brief animation)
- [ ] Upvote persists to database immediately
- [ ] Can only upvote once per item (button shows "upvoted" state)
- [ ] Upvoting removes any previous downvote on same item

### US-308: Downvote Incorrect Insight

**As a** user
**I want** to downvote insights that are wrong
**So that** the system stops using incorrect assumptions about me

**Acceptance Criteria:**
- [ ] Each profile item has a downvote button (thumbs down)
- [ ] Clicking downvote decreases confidence by 0.2
- [ ] If confidence drops below 0.2, item is soft-deleted (excluded from profile but kept in DB)
- [ ] Visual feedback when downvoted
- [ ] Can only downvote once per item
- [ ] Downvoting removes any previous upvote on same item
- [ ] Soft-deleted items shown in a "Dismissed" section (collapsed by default)

### US-309: Navigate Between Chat and Profile

**As a** user
**I want** to easily switch between chatting and viewing my profile
**So that** I can reference my profile during conversations

**Acceptance Criteria:**
- [ ] Tab or sidebar navigation between "Chat" and "Your Self-Portrait"
- [ ] Current tab/section visually indicated
- [ ] Profile view accessible via keyboard shortcut (Ctrl/Cmd + P)
- [ ] Switching preserves state (chat message draft, scroll position)

## Technical Design

### Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Profile View   │────►│  IPC Handlers   │────►│  SQLite DB      │
│  (React)        │◄────│  (Main)         │◄────│  (profile.ts)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │                       ▼
        │               ┌─────────────────┐
        └──────────────►│  Evidence       │
          (expand card) │  Lookup         │
                        └─────────────────┘
```

### New IPC Channels

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `profile:getSummary` | R→M | Get narrative + computed summary |
| `profile:getValues` | R→M | Get all values with evidence counts |
| `profile:getChallenges` | R→M | Get all challenges |
| `profile:getMaslow` | R→M | Get Maslow signals |
| `profile:getSignals` | R→M | Get psychological signals by tier |
| `profile:getGoals` | R→M | Get all goals |
| `profile:getEvidence` | R→M | Get evidence quotes for a target |
| `profile:vote` | R→M | Upvote or downvote a profile item |

### Vote IPC Interface

```typescript
interface VoteRequest {
    targetType: 'value' | 'challenge' | 'maslow' | 'signal' | 'goal';
    targetId: number;
    vote: 'up' | 'down';
}

interface VoteResponse {
    success: boolean;
    newConfidence: number;
    deleted: boolean;  // true if confidence dropped below threshold
}
```

### Component Structure

```
src/renderer/
├── App.tsx                    # Add tab navigation
├── components/
│   ├── ChatView.tsx           # Extract existing chat UI
│   ├── ProfileView.tsx        # Main profile container
│   ├── ProfileSummary.tsx     # US-301: Identity summary card
│   ├── ValuesSection.tsx      # US-302: Values list
│   ├── ChallengesSection.tsx  # US-303: Challenges list
│   ├── MaslowSection.tsx      # US-304: Maslow visualization
│   ├── SignalsSection.tsx     # US-305: Psychological signals
│   ├── GoalsSection.tsx       # US-306: Goals list
│   ├── ProfileCard.tsx        # Reusable expandable card with voting
│   ├── ConfidenceBadge.tsx    # Visual confidence indicator
│   ├── VoteButtons.tsx        # Thumbs up/down component
│   ├── EvidenceList.tsx       # Quote list for expanded cards
│   └── DismissedSection.tsx   # Collapsed section for downvoted items
```

### Database Changes

Add columns to track user votes:

```sql
-- Add to user_values table
ALTER TABLE user_values ADD COLUMN user_vote TEXT;  -- 'up', 'down', or NULL
ALTER TABLE user_values ADD COLUMN dismissed INTEGER DEFAULT 0;  -- soft delete

-- Add to challenges table
ALTER TABLE challenges ADD COLUMN user_vote TEXT;
ALTER TABLE challenges ADD COLUMN dismissed INTEGER DEFAULT 0;

-- Add to psychological_signals table
ALTER TABLE psychological_signals ADD COLUMN user_vote TEXT;
ALTER TABLE psychological_signals ADD COLUMN dismissed INTEGER DEFAULT 0;

-- Add to goals table
ALTER TABLE goals ADD COLUMN user_vote TEXT;
ALTER TABLE goals ADD COLUMN dismissed INTEGER DEFAULT 0;

-- Add to maslow_signals table
ALTER TABLE maslow_signals ADD COLUMN user_vote TEXT;
ALTER TABLE maslow_signals ADD COLUMN dismissed INTEGER DEFAULT 0;
```

### Vote Logic

```typescript
async function applyVote(targetType: string, targetId: number, vote: 'up' | 'down'): Promise<VoteResponse> {
    const table = getTableForType(targetType);
    const item = getItem(table, targetId);

    let newConfidence = item.confidence;

    if (vote === 'up') {
        newConfidence = Math.min(1.0, item.confidence + 0.1);
    } else {
        newConfidence = item.confidence - 0.2;
    }

    const dismissed = newConfidence < 0.2;

    db.prepare(`
        UPDATE ${table}
        SET confidence = ?, user_vote = ?, dismissed = ?
        WHERE id = ?
    `).run(newConfidence, vote, dismissed ? 1 : 0, targetId);

    return { success: true, newConfidence, deleted: dismissed };
}
```

### Confidence Display Mapping

| Confidence Range | Display Label | Visual Style |
|------------------|---------------|--------------|
| 0.0 - 0.4 | "Tentative" | Gray, subtle |
| 0.4 - 0.6 | "Emerging" | Blue, moderate |
| 0.6 - 0.8 | "Established" | Green, solid |
| 0.8 - 1.0 | "Core" | Purple, prominent |

### Friendly Labels Mapping

| Database Dimension | Display Label |
|--------------------|---------------|
| `support_seeking_style` | "Support Style" |
| `life_situation.work` | "Work Situation" |
| `life_situation.relationships` | "Relationships" |
| `big_five.openness` | "Openness to Experience" |
| `big_five.conscientiousness` | "Conscientiousness" |
| `big_five.extraversion` | "Extraversion" |
| `big_five.agreeableness` | "Agreeableness" |
| `big_five.neuroticism` | "Emotional Sensitivity" |
| `moral.care` | "Care / Harm" |
| `moral.fairness` | "Fairness / Cheating" |
| `attachment_style` | "Attachment Style" |
| `locus_of_control` | "Sense of Control" |
| `temporal_orientation` | "Time Focus" |
| `growth_mindset` | "Growth Mindset" |
| `risk_tolerance` | "Risk Tolerance" |
| `motivation_style` | "Motivation Style" |

## Phases

### Phase 3.1: Navigation and Profile Summary

**Goal:** Basic navigation and summary view working

**Files to Create:**
| File | Purpose |
|------|---------|
| `src/renderer/components/ChatView.tsx` | Extract chat UI from App.tsx |
| `src/renderer/components/ProfileView.tsx` | Profile page container |
| `src/renderer/components/ProfileSummary.tsx` | Identity summary card |

**Files to Modify:**
| File | Changes |
|------|---------|
| `src/renderer/App.tsx` | Add tab navigation, route to ChatView or ProfileView |
| `src/main/ipc.ts` | Add `profile:getSummary` handler |
| `src/main/db/profile.ts` | Add `getProfileSummary()` function |
| `src/preload/index.ts` | Expose new profile IPC methods |
| `src/shared/types.ts` | Add ProfileSummary interface |

**Verification:**
- [ ] Tab navigation switches between Chat and Profile views
- [ ] Ctrl/Cmd+P opens Profile view
- [ ] Profile summary displays when data exists
- [ ] Empty state displays when no data
- [ ] `make check` passes

### Phase 3.2: Values and Challenges Display

**Goal:** View extracted values and challenges with evidence

**Files to Create:**
| File | Purpose |
|------|---------|
| `src/renderer/components/ValuesSection.tsx` | Values list with cards |
| `src/renderer/components/ChallengesSection.tsx` | Challenges list |
| `src/renderer/components/ProfileCard.tsx` | Reusable expandable card |
| `src/renderer/components/ConfidenceBadge.tsx` | Confidence indicator |
| `src/renderer/components/EvidenceList.tsx` | Quote list component |

**Files to Modify:**
| File | Changes |
|------|---------|
| `src/renderer/components/ProfileView.tsx` | Add Values and Challenges sections |
| `src/main/ipc.ts` | Add `profile:getValues`, `profile:getChallenges`, `profile:getEvidence` |
| `src/main/db/profile.ts` | Add query functions |
| `src/preload/index.ts` | Expose new IPC methods |
| `src/shared/types.ts` | Add Value, Challenge, Evidence interfaces |

**Verification:**
- [ ] Values display with confidence badges
- [ ] Challenges display with status
- [ ] Clicking card expands to show evidence quotes
- [ ] Empty states display appropriately
- [ ] `make check` passes

### Phase 3.3: Maslow, Signals, and Goals Display

**Goal:** Complete read-only profile view

**Files to Create:**
| File | Purpose |
|------|---------|
| `src/renderer/components/MaslowSection.tsx` | Maslow levels display |
| `src/renderer/components/SignalsSection.tsx` | Psychological signals by tier |
| `src/renderer/components/GoalsSection.tsx` | Goals list |

**Files to Modify:**
| File | Changes |
|------|---------|
| `src/renderer/components/ProfileView.tsx` | Add remaining sections |
| `src/main/ipc.ts` | Add `profile:getMaslow`, `profile:getSignals`, `profile:getGoals` |
| `src/main/db/profile.ts` | Add query functions |
| `src/preload/index.ts` | Expose new IPC methods |
| `src/shared/types.ts` | Add MaslowSignal, PsychologicalSignal, Goal interfaces |

**Verification:**
- [ ] Maslow levels display with concerns highlighted
- [ ] Psychological signals grouped by tier
- [ ] Only signals with confidence >= 0.5 shown
- [ ] Goals display with status and timeframe
- [ ] All cards expandable to show evidence
- [ ] `make check` passes

### Phase 3.4: Voting Functionality

**Goal:** Users can upvote/downvote profile items

**Files to Create:**
| File | Purpose |
|------|---------|
| `src/renderer/components/VoteButtons.tsx` | Thumbs up/down component |
| `src/renderer/components/DismissedSection.tsx` | Section for downvoted items |

**Files to Modify:**
| File | Changes |
|------|---------|
| `src/renderer/components/ProfileCard.tsx` | Add VoteButtons to each card |
| `src/renderer/components/ProfileView.tsx` | Add DismissedSection at bottom |
| `src/main/ipc.ts` | Add `profile:vote` handler |
| `src/main/db/profile.ts` | Add `applyVote()` function |
| `src/main/db/sqlite.ts` | Add user_vote and dismissed columns (migration) |
| `src/preload/index.ts` | Expose vote IPC method |

**Verification:**
- [ ] Upvote button increases confidence by 0.1
- [ ] Downvote button decreases confidence by 0.2
- [ ] Items below 0.2 confidence move to Dismissed section
- [ ] Can only vote once per item (shows voted state)
- [ ] Voting one direction clears the other
- [ ] Votes persist after app restart
- [ ] `make check` passes

### Phase 3.5: Polish and Testing

**Goal:** Complete test coverage and UX polish

**Files to Create:**
| File | Purpose |
|------|---------|
| `tests/profile-view.spec.ts` | E2E tests for profile viewing |
| `tests/profile-vote.spec.ts` | E2E tests for voting |

**Files to Modify:**
| File | Changes |
|------|---------|
| All profile components | Loading states, error handling, accessibility |
| `src/renderer/App.tsx` | Keyboard navigation polish |

**Verification:**
- [ ] All user stories have passing tests
- [ ] Loading states display during data fetch
- [ ] Error states display on failure
- [ ] Keyboard navigation works throughout
- [ ] `make check` passes
- [ ] `make test-coverage` >= 80%

## Files Summary

### Files to Create

| File | Purpose |
|------|---------|
| `src/renderer/components/ChatView.tsx` | Extracted chat UI |
| `src/renderer/components/ProfileView.tsx` | Profile page container |
| `src/renderer/components/ProfileSummary.tsx` | Identity summary |
| `src/renderer/components/ValuesSection.tsx` | Values list |
| `src/renderer/components/ChallengesSection.tsx` | Challenges list |
| `src/renderer/components/MaslowSection.tsx` | Maslow display |
| `src/renderer/components/SignalsSection.tsx` | Signals by tier |
| `src/renderer/components/GoalsSection.tsx` | Goals list |
| `src/renderer/components/ProfileCard.tsx` | Expandable card |
| `src/renderer/components/ConfidenceBadge.tsx` | Confidence indicator |
| `src/renderer/components/VoteButtons.tsx` | Thumbs up/down |
| `src/renderer/components/EvidenceList.tsx` | Quote list |
| `src/renderer/components/DismissedSection.tsx` | Downvoted items |
| `tests/profile-view.spec.ts` | View tests |
| `tests/profile-vote.spec.ts` | Vote tests |

### Files to Modify

| File | Changes |
|------|---------|
| `src/renderer/App.tsx` | Tab navigation, keyboard shortcuts |
| `src/main/ipc.ts` | 8 new profile IPC handlers |
| `src/main/db/profile.ts` | Query and vote functions |
| `src/main/db/sqlite.ts` | Add user_vote and dismissed columns |
| `src/preload/index.ts` | Expose profile API methods |
| `src/shared/types.ts` | Profile-related interfaces |

## Verification Checklist

### Functional Requirements

- [ ] US-301: Profile summary displays identity, phase, concerns, emotional baseline
- [ ] US-302: Values display with confidence, evidence count, expandable quotes
- [ ] US-303: Challenges display with status, mention count, dates
- [ ] US-304: Maslow levels show concerns vs stable
- [ ] US-305: Psychological signals grouped by tier, friendly labels
- [ ] US-306: Goals display with status and timeframe
- [ ] US-307: Upvote increases confidence by 0.1
- [ ] US-308: Downvote decreases confidence by 0.2, soft-deletes below 0.2
- [ ] US-309: Tab navigation + Ctrl/Cmd+P shortcut works

### Quality Gates

- [ ] `make typecheck` passes
- [ ] `make lint` passes
- [ ] `make test` passes
- [ ] `make test-coverage` >= 80%
- [ ] `make build` succeeds

### Manual Verification

1. [ ] Launch app with empty database → Profile shows friendly empty state
2. [ ] Have a conversation → Refresh profile → New data appears
3. [ ] Expand a value card → Evidence quotes display
4. [ ] Upvote a value → Confidence increases, button shows upvoted state
5. [ ] Downvote a low-confidence item → It moves to Dismissed section
6. [ ] Restart app → Votes persisted
7. [ ] Switch between Chat and Profile → State preserved in each
8. [ ] Press Ctrl/Cmd+P → Profile view opens

## Design Notes

### Visual Hierarchy

The profile should feel like a personal journal, not a medical chart:

1. **Summary at top** - Quick "who you are" snapshot
2. **Values prominent** - These are the core identity
3. **Challenges grouped** - What you're working through
4. **Signals collapsed** - Available but not overwhelming
5. **Evidence on demand** - Expand to see source quotes
6. **Dismissed at bottom** - Collapsed, out of the way

### Tone

- Use "Your values" not "Extracted values"
- Use "Things you're working through" not "Identified challenges"
- Use "Patterns I've noticed" not "Psychological signals"
- Confidence badges should feel supportive, not judgmental

### Empty States

When sections have no data:
- "We haven't identified any core values yet. Keep chatting and I'll learn what matters to you."
- "No current challenges detected. That's either great news, or we haven't talked about them yet!"

### Vote UX

- Thumbs up/down should be subtle until hovered
- Voted state should be clear but not distracting
- Brief animation on vote (subtle pulse or fill)
- No confirmation needed (immediate feedback)

## Dependencies

- Phase 2.5 complete (extraction pipeline working)
- Existing profile data in database
- React 18 for component architecture

## Risks

| Risk | Mitigation |
|------|------------|
| Profile feels clinical/scary | Use warm language, card-based UI, "Self-Portrait" framing |
| Too much data overwhelms | Collapse tiers by default, progressive disclosure |
| Users spam downvote | Soft-delete preserves data, items can resurface with new evidence |
| Performance with many items | Virtualize lists if > 50 items (unlikely in early use) |

## Future Considerations (Out of Scope)

- Radar charts for values
- Timeline view of profile changes
- Export to PDF/JSON
- Compare "then vs now" profiles
- Sharing profile snippets
- Undo vote / restore dismissed items
