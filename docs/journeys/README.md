# Guided Self-Reflection Journeys

This directory contains the complete journey specifications for Know Thyself's guided self-reflection experiences.

---

## Overview

Each journey is a multi-turn conversational experience designed to facilitate meaningful self-reflection while naturally gathering psychological profile data.

**Primary Goal**: Create genuinely valuable self-reflection experiences
**Secondary Benefit**: Profile data emerges naturally from authentic exploration

---

## Journey Catalog

### Foundation Journeys
*Where most users should start. These address fundamental questions.*

| Journey | File | Axes | Duration |
|---------|------|------|----------|
| **What Do You Actually Need?** | [01-what-do-you-need.md](./01-what-do-you-need.md) | Maslow Status, Life Situation | 15-25 min |
| **What Matters Most to You?** | [02-what-matters-most.md](./02-what-matters-most.md) | Core Values, Moral Foundations | 20-30 min |
| **Where Are You Going?** | [03-where-are-you-going.md](./03-where-are-you-going.md) | Goals, Challenges, Intent | 15-25 min |

### Understanding Yourself
*Personality and patterns. How you naturally operate.*

| Journey | File | Axes | Duration |
|---------|------|------|----------|
| **How You Show Up** | [04-how-you-show-up.md](./04-how-you-show-up.md) | Big Five (all traits) | 20-30 min |
| **Your Relationship with Risk** | [05-relationship-with-risk.md](./05-relationship-with-risk.md) | Risk Tolerance, Motivation Style | 15-20 min |
| **How You Connect** | [06-how-you-connect.md](./06-how-you-connect.md) | Attachment Style, Support-Seeking | 20-30 min |

### Going Deeper
*More nuanced self-understanding. Deeper patterns.*

| Journey | File | Axes | Duration |
|---------|------|------|----------|
| **Who's in Control?** | [07-whos-in-control.md](./07-whos-in-control.md) | Locus of Control, Growth Mindset, Self-Efficacy | 15-20 min |
| **Living in Time** | [08-living-in-time.md](./08-living-in-time.md) | Temporal Orientation | 15-20 min |
| **Under Pressure** | [09-under-pressure.md](./09-under-pressure.md) | Stress Response, Emotional Regulation | 15-20 min |
| **Ready for Change** | [10-ready-for-change.md](./10-ready-for-change.md) | Change Readiness | 15-20 min |

---

## Axis Coverage

| Axis | Covered In |
|------|------------|
| Maslow Status | Journey 1: What Do You Need? |
| Life Situation | Journey 1: What Do You Need? |
| Core Values | Journey 2: What Matters Most? |
| Moral Foundations | Journey 2: What Matters Most? |
| Goals | Journey 3: Where Are You Going? |
| Current Challenges | Journey 3: Where Are You Going? |
| Immediate Intent | Journey 3: Where Are You Going? |
| Big Five (OCEAN) | Journey 4: How You Show Up |
| Risk Tolerance | Journey 5: Relationship with Risk |
| Motivation Style | Journey 5: Relationship with Risk |
| Attachment Style | Journey 6: How You Connect |
| Support-Seeking Style | Journey 6: How You Connect |
| Locus of Control | Journey 7: Who's in Control? |
| Growth Mindset | Journey 7: Who's in Control? |
| Self-Efficacy | Journey 7: Who's in Control? |
| Temporal Orientation | Journey 8: Living in Time |
| Stress Response | Journey 9: Under Pressure |
| Emotional Regulation | Journey 9: Under Pressure |
| Change Readiness | Journey 10: Ready for Change |

---

## Journey Structure

Each journey document contains:

1. **Overview**: Purpose, importance, intended insight
2. **Journey Arc**: 5 phases with goals for each
3. **System Prompt**: Complete instructions for Claude to conduct the journey
4. **Conversation Examples**: Model dialogues showing the journey in action
5. **Signals to Extract**: What to capture for the psychological profile
6. **Edge Cases**: How to handle difficult situations
7. **Journey Complete**: How to close the experience

---

## Conversation Principles

Consistent across all journeys:

- **Tendencies, not boxes**: We explore patterns, not assign labels
- **No right answer**: All tendencies are valid
- **Stories over abstractions**: Concrete examples reveal more than hypotheticals
- **Their words, not frameworks**: Use their language, not psychological jargon
- **Follow before leading**: Explore what they offer before redirecting
- **Depth over breadth**: Better to understand one thing deeply
- **Honor adaptations**: Every pattern once served a purpose

---

## Implementation Notes

### For Developers

Each journey's system prompt can be used directly with Claude. The extraction section indicates what to look for in user responses to populate the psychological profile.

### Recommended Flow

1. New users should start with Foundation journeys
2. Understanding Yourself unlocks after at least one Foundation journey
3. Going Deeper unlocks after at least one Understanding Yourself journey
4. Users can revisit journeys as they grow and change

### Profile Integration

As users complete journeys, signals should be extracted and stored:
- Update axis completeness scores
- Store specific insights with evidence (quotes)
- Track confidence levels based on signal strength
- Note any contradictions or changes over time

---

## Design Documents

- [Guided Journeys Design](../guided-journeys-design.md) - Original design and rationale
- [Question Bank](../../src/main/question-bank.ts) - Programmatic question reference (deprecated in favor of journey-based approach)
