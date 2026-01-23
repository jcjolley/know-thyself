# PRD: Phase 7 - Journey Recommendations Based on Profile Completeness

## Overview

Recommend journeys to users based on their psychological profile completeness. The system analyzes which axes are incomplete and suggests journeys that would help fill those gaps, prioritizing Foundation journeys for new users and respecting natural category progression.

## Non-Goals

- Not forcing users to follow recommendations (all journeys remain accessible)
- Not blocking access to "advanced" journeys based on profile state
- Not tracking individual journey completion (handled in Phase 6)
- Not recommending re-taking journeys (future work)
- Not personalizing journey content based on profile (journeys are universal)
- Not using ML/AI for recommendations (deterministic algorithm)

## User Stories

### US-001: See Personalized Journey Recommendations
**As a** user visiting the Journeys page
**I want** to see which journeys are recommended for me
**So that** I know where to start or continue my self-reflection

**Acceptance Criteria:**
- [ ] Top of Journeys page shows "Recommended for You" section with 1-3 journeys
- [ ] Recommendations are ordered by relevance (most impactful first)
- [ ] Each recommendation shows a brief reason ("Explore your core values")
- [ ] Section is hidden if user has no incomplete axes (all journeys complete)

### US-002: Understand Why a Journey is Recommended
**As a** user viewing a recommended journey
**I want** to understand why it's suggested for me
**So that** I can make an informed decision about which journey to take

**Acceptance Criteria:**
- [ ] Recommended journeys show a "Why this journey?" tooltip or text
- [ ] Explanation references the axes that need data (e.g., "Your values profile is incomplete")
- [ ] Language is inviting, not prescriptive ("might help you explore" not "you need to complete")

### US-003: See Profile Completeness on Journey Cards
**As a** user browsing journeys
**I want** to see which journeys I've already explored
**So that** I can choose to revisit or try new ones

**Acceptance Criteria:**
- [ ] Journey cards show a subtle completeness indicator for covered axes
- [ ] Indicator shows: not started, partially explored, well explored
- [ ] Clicking the indicator shows which axes are covered and their status

### US-004: Foundation Journeys Prioritized for New Users
**As a** new user with little profile data
**I want** Foundation journeys recommended first
**So that** I build a solid base before going deeper

**Acceptance Criteria:**
- [ ] New users (< 25% overall completeness) see only Foundation recommendations
- [ ] After Foundation baseline is met, Understanding journeys appear
- [ ] Going Deeper journeys recommended after Understanding baseline
- [ ] Category progression feels natural, not gatekept

### US-005: Recommendations Update After Completing Journeys
**As a** user who just finished a journey
**I want** my recommendations to update
**So that** I see fresh suggestions based on my new profile state

**Acceptance Criteria:**
- [ ] Returning to Journeys page shows updated recommendations
- [ ] Recently completed journey no longer appears as top recommendation
- [ ] Next most impactful journey is now prioritized

---

## Technical Specification

### Journey-to-Axis Mapping

```typescript
// In src/main/journeys.ts
interface JourneyAxisMapping {
  journeyId: string;
  axes: AxisName[];
  category: 'foundation' | 'understanding' | 'deeper';
  categoryWeight: number;  // 1.0 for foundation, 0.8 for understanding, 0.6 for deeper
}

const JOURNEY_AXIS_MAP: JourneyAxisMapping[] = [
  // Foundation
  { journeyId: 'what-do-you-need', axes: ['maslow_status', 'life_situation'], category: 'foundation', categoryWeight: 1.0 },
  { journeyId: 'what-matters-most', axes: ['core_values', 'moral_foundations'], category: 'foundation', categoryWeight: 1.0 },
  { journeyId: 'where-are-you-going', axes: ['goals', 'current_challenges', 'immediate_intent'], category: 'foundation', categoryWeight: 1.0 },

  // Understanding Yourself
  { journeyId: 'how-you-show-up', axes: ['big_five'], category: 'understanding', categoryWeight: 0.8 },
  { journeyId: 'relationship-with-risk', axes: ['risk_tolerance', 'motivation_style'], category: 'understanding', categoryWeight: 0.8 },
  { journeyId: 'how-you-connect', axes: ['attachment_style', 'support_seeking_style'], category: 'understanding', categoryWeight: 0.8 },

  // Going Deeper
  { journeyId: 'whos-in-control', axes: ['locus_of_control', 'growth_mindset', 'self_efficacy'], category: 'deeper', categoryWeight: 0.6 },
  { journeyId: 'living-in-time', axes: ['temporal_orientation'], category: 'deeper', categoryWeight: 0.6 },
  { journeyId: 'under-pressure', axes: ['stress_response', 'emotional_regulation'], category: 'deeper', categoryWeight: 0.6 },
  { journeyId: 'ready-for-change', axes: ['change_readiness'], category: 'deeper', categoryWeight: 0.6 },
];
```

### Recommendation Algorithm

```typescript
interface JourneyRecommendation {
  journeyId: string;
  score: number;           // Higher = more recommended
  reason: string;          // Human-readable explanation
  axesNeedingData: AxisName[];
  categoryAllowed: boolean; // Based on progression rules
}

function calculateJourneyRecommendations(): JourneyRecommendation[] {
  const allCompleteness = getAllAxisCompleteness();
  const overallCompleteness = calculateOverallCompleteness(allCompleteness);

  // Determine which categories are "unlocked"
  const foundationMet = isFoundationBaselineMet(allCompleteness);
  const understandingMet = isUnderstandingBaselineMet(allCompleteness);

  const recommendations: JourneyRecommendation[] = [];

  for (const mapping of JOURNEY_AXIS_MAP) {
    // Calculate average incompleteness of covered axes
    const axisScores = mapping.axes.map(axis => {
      const comp = allCompleteness.find(c => c.axis === axis);
      return comp ? (1 - comp.completeness) : 1;  // Incomplete = 1, Complete = 0
    });

    const avgIncompleteness = axisScores.reduce((a, b) => a + b, 0) / axisScores.length;

    // Apply category weight (prioritize Foundation for new users)
    let score = avgIncompleteness * mapping.categoryWeight;

    // Check category progression
    let categoryAllowed = true;
    if (mapping.category === 'understanding' && !foundationMet) {
      categoryAllowed = false;
      score *= 0.3;  // Deprioritize but don't hide
    }
    if (mapping.category === 'deeper' && !understandingMet) {
      categoryAllowed = false;
      score *= 0.3;
    }

    // Find which axes specifically need data
    const axesNeedingData = mapping.axes.filter(axis => {
      const comp = allCompleteness.find(c => c.axis === axis);
      return !comp || comp.completeness < 0.7;
    });

    // Generate reason
    const reason = generateRecommendationReason(mapping, axesNeedingData);

    recommendations.push({
      journeyId: mapping.journeyId,
      score,
      reason,
      axesNeedingData,
      categoryAllowed,
    });
  }

  // Sort by score descending
  return recommendations.sort((a, b) => b.score - a.score);
}
```

### Category Progression Rules

| User State | Foundation | Understanding | Deeper |
|------------|------------|---------------|--------|
| New user (< 25% overall) | Recommended | Deprioritized | Deprioritized |
| Foundation baseline met | Available | Recommended | Deprioritized |
| Understanding baseline met | Available | Available | Recommended |
| All baselines met | Available | Available | Available |

**Baseline definitions:**
- **Foundation baseline**: At least 2 of 3 Foundation journeys' axes are ≥ 50% complete
- **Understanding baseline**: At least 2 of 3 Understanding journeys' axes are ≥ 50% complete

### Completeness Indicators

```typescript
type JourneyExplorationStatus = 'not_started' | 'partially_explored' | 'well_explored';

function getJourneyExplorationStatus(journeyId: string): JourneyExplorationStatus {
  const mapping = JOURNEY_AXIS_MAP.find(m => m.journeyId === journeyId);
  if (!mapping) return 'not_started';

  const axisCompleteness = mapping.axes.map(axis => getAxisCompleteness(axis).completeness);
  const avgCompleteness = axisCompleteness.reduce((a, b) => a + b, 0) / axisCompleteness.length;

  if (avgCompleteness >= 0.7) return 'well_explored';
  if (avgCompleteness >= 0.3) return 'partially_explored';
  return 'not_started';
}
```

### IPC Channels

| Channel | Direction | Payload | Response |
|---------|-----------|---------|----------|
| `journeys:recommendations` | renderer → main | none | `JourneyRecommendation[]` |
| `journeys:exploration-status` | renderer → main | `{ journeyId: string }` | `JourneyExplorationStatus` |
| `journeys:all-statuses` | renderer → main | none | `Record<string, JourneyExplorationStatus>` |

---

## Phases

### Phase 1: Journey-Axis Mapping and Recommendation Engine
**Goal:** Implement the recommendation algorithm in the backend

**Files to Create:**
| File | Purpose |
|------|---------|
| `src/main/journey-recommendations.ts` | Recommendation algorithm and journey-axis mapping |

**Files to Modify:**
| File | Changes |
|------|---------|
| `src/main/journeys.ts` | Export journey-axis mapping for use by recommendations |
| `src/main/ipc.ts` | Add `journeys:recommendations` and status handlers |
| `src/preload/index.ts` | Expose recommendation IPC methods |

**Acceptance Criteria:**
- [ ] `journeys:recommendations` returns sorted list of recommendations
- [ ] Recommendations include score, reason, and axes needing data
- [ ] Category progression rules are enforced

### Phase 2: Exploration Status Tracking
**Goal:** Track and expose journey exploration status based on axis completeness

**Files to Modify:**
| File | Changes |
|------|---------|
| `src/main/journey-recommendations.ts` | Add `getJourneyExplorationStatus()` function |
| `src/main/ipc.ts` | Add `journeys:all-statuses` handler |
| `src/preload/index.ts` | Expose status IPC methods |

**Acceptance Criteria:**
- [ ] Each journey can report its exploration status
- [ ] Status is derived from covered axes completeness
- [ ] Batch status retrieval for all journeys

### Phase 3: Recommendations UI
**Goal:** Display recommendations at the top of the Journeys page

**Files to Modify:**
| File | Changes |
|------|---------|
| `src/renderer/components/JourneysPage.tsx` | Add recommendations section, fetch on mount |

**Acceptance Criteria:**
- [ ] "Recommended for You" section appears at top of page
- [ ] Shows 1-3 recommended journeys with reasons
- [ ] Section hidden if no recommendations (all complete)
- [ ] Clicking recommendation opens journey detail modal

### Phase 4: Journey Card Status Indicators
**Goal:** Show exploration status on each journey card

**Files to Modify:**
| File | Changes |
|------|---------|
| `src/renderer/components/JourneysPage.tsx` | Add status indicator to JourneyCard component |

**Acceptance Criteria:**
- [ ] Cards show subtle indicator (icon or progress ring)
- [ ] Three states visually distinct: not started, partial, complete
- [ ] Indicator has tooltip explaining what it means

---

## Files Summary

### Files to Create
| File | Purpose |
|------|---------|
| `src/main/journey-recommendations.ts` | Recommendation algorithm, journey-axis mapping, status calculation |

### Files to Modify
| File | Changes |
|------|---------|
| `src/main/journeys.ts` | Export axis mapping constants |
| `src/main/ipc.ts` | Add recommendation and status IPC handlers |
| `src/preload/index.ts` | Expose `journeys.getRecommendations()` and `journeys.getAllStatuses()` |
| `src/renderer/components/JourneysPage.tsx` | Recommendations section, card status indicators |

---

## UI Design

### Recommendations Section

```
┌─────────────────────────────────────────────────────────────┐
│  ✨ Recommended for You                                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌─────────────────────┐           │
│  │ What Matters Most   │  │ How You Show Up     │           │
│  │                     │  │                     │           │
│  │ Explore your core   │  │ Understand your     │           │
│  │ values and what     │  │ natural tendencies  │           │
│  │ guides your choices │  │ and personality     │           │
│  │                     │  │                     │           │
│  │    [Begin →]        │  │    [Begin →]        │           │
│  └─────────────────────┘  └─────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### Journey Card with Status Indicator

```
┌─────────────────────────────────┐
│  ⏱ 15-20 min           ◐      │  ← Partial exploration indicator
│                                 │
│  What Do You Need?              │
│                                 │
│  Discover which of your         │
│  fundamental needs are met...   │
│                                 │
│  [Maslow Status] [Life Sit.]    │
└─────────────────────────────────┘

Status indicators:
  ○  Not started (empty circle)
  ◐  Partially explored (half-filled)
  ●  Well explored (filled circle)
```

### Recommendation Reason Examples

| Journey | Reason |
|---------|--------|
| What Do You Need? | "Understand where you are in life right now" |
| What Matters Most? | "Explore your core values and guiding principles" |
| Where Are You Going? | "Clarify your goals and current challenges" |
| How You Show Up | "Discover your natural personality tendencies" |
| Your Relationship with Risk | "Understand how you approach uncertainty" |
| How You Connect | "Explore your relationship patterns" |
| Who's in Control? | "Examine your sense of personal agency" |
| Living in Time | "Discover your relationship with past, present, future" |
| Under Pressure | "Understand your stress response patterns" |
| Ready for Change | "Assess your readiness for the changes you're considering" |

---

## Verification Checklist

### Automated
- [ ] `make check` passes
- [ ] Unit tests for recommendation algorithm
- [ ] Unit tests for category progression logic
- [ ] Unit tests for exploration status calculation

### Manual
1. [ ] New user sees Foundation journeys recommended
2. [ ] Recommendations show helpful reasons
3. [ ] After completing a Foundation journey, recommendations update
4. [ ] Understanding journeys appear after Foundation baseline met
5. [ ] Deeper journeys appear after Understanding baseline met
6. [ ] Journey cards show correct exploration status
7. [ ] Status updates after completing a journey
8. [ ] Recommendations section hidden when all axes are complete
9. [ ] All journeys remain accessible regardless of recommendations

---

## Edge Cases

### No Data Yet (Brand New User)
- Show all 3 Foundation journeys as recommendations
- Reason: "Start your self-reflection journey here"
- Status indicators all show "not started"

### All Axes Complete
- Hide recommendations section entirely
- Or show: "You've explored deeply. Revisit any journey to go further."
- All status indicators show "well explored"

### Partial Completion in One Category
- Recommend remaining journeys in that category first
- Example: User completed 2 of 3 Foundation journeys → recommend the 3rd

### User Skips Categories
- If user takes a Deeper journey before Foundation, don't block
- Recommendations still prioritize by category weight
- Natural signal gathering will fill gaps over time

---

## Future Considerations

- **Journey re-take recommendations**: Suggest revisiting journeys after significant life changes
- **Time-based recommendations**: Re-recommend journeys after 3-6 months
- **Insight-based recommendations**: Recommend journeys based on themes in recent conversations
- **Journey paths**: Curated sequences of journeys for specific goals (e.g., "Career Clarity Path")
