# Know Thyself - Requirements Document

## Project Vision

A personal AI system that helps users understand themselves more deeply by aggregating their journals, diaries, and conversations, extracting psychological insights, and providing genuinely personalized guidance.

The core value proposition: Users receive advice that is "shockingly" accurate and personalized - guidance that reflects who they *actually are*, not generic self-help. The system helps users see themselves more clearly than they could alone.

### Inspiration
Based on a Hacker News post about someone who used a similar self-built system to guide major life decisions (returning to education) because the system understood what was truly meaningful to them.

### Goal
Facilitate this kind of deep self-understanding for more people with less manual effort than building it themselves.

---

## Core Architecture

### Local-First Design
All user data stays on the user's machine. This is non-negotiable given the sensitivity of psychological profile data.

```
┌─────────────────────────────────────────────────────────────┐
│  User's Machine                                             │
│  ┌─────────────┐  ┌─────────────┐                           │
│  │ SQLite      │  │ LanceDB     │                           │
│  │ (structured │  │ (vector     │                           │
│  │  data)      │  │  embeddings)│                           │
│  └─────────────┘  └─────────────┘                           │
│         │                │                                  │
│         └───────┬────────┘                                  │
│                 ▼                                           │
│  ┌─────────────────────────────────┐                        │
│  │  Local App (Electron)           │                        │
│  └──────────────┬──────────────────┘                        │
└─────────────────┼───────────────────────────────────────────┘
                  │ API calls only (stateless)
                  ▼
         ┌────────────────┐
         │  Claude API    │
         └────────────────┘
```

### Data Storage

| Component | Technology | Purpose |
|-----------|------------|---------|
| Structured Data | SQLite | User profile, extracted values, metadata, sources |
| Vector Search | LanceDB | Semantic search, embeddings for retrieval |

Both are embedded, single-file databases requiring no server.

### LLM-Guided Retrieval

Context assembly uses a two-step LLM approach:

1. **Planning LLM Call**: Given user's question, determine what categories of context are needed
2. **Response LLM Call**: With assembled context, generate personalized response

This is preferred over scripted retrieval because:
- Different questions need different context shapes
- LLM can identify non-obvious relevance
- More flexible as the data model evolves

---

## Psychological Framework

The system builds a comprehensive psychological profile across multiple dimensions, organized into tiers based on when/how they're gathered.

### Tier 1: Essential (Gathered Early)

These are required to avoid giving actively bad advice:

| Dimension | Description | Why Essential |
|-----------|-------------|---------------|
| **Maslow Status** | Where they are in hierarchy of needs | Prevents tone-deaf advice (don't suggest self-actualization to someone who can't pay rent) |
| **Life Situation** | Basic context: work, relationships, location, health | Grounds all advice in reality |
| **Immediate Intent** | What brought them here, what they're hoping for | Enables useful first response |
| **Support-Seeking Style** | Do they want to vent, get solutions, or be validated? | Getting this wrong breaks trust immediately |

### Tier 2: Early Inference (First Few Conversations)

Dramatically improve quality; gleaned through natural conversation:

| Dimension | Framework | How Revealed |
|-----------|-----------|--------------|
| **Core Values** | Schwartz's Basic Values | What they emphasize, what trade-offs they resist |
| **Personality** | Big Five (OCEAN) | How they describe situations, what they notice |
| **Risk Tolerance** | Risk-seeking ↔ Risk-averse | How they frame choices, what concerns they raise |
| **Motivation Style** | Approach vs Avoidance | Language: "I want to..." vs "I don't want to..." |
| **Moral Foundations** | Haidt's framework | What they judge, what they protect |

### Tier 3: Emergent (Builds Over Time)

Require seeing patterns across multiple interactions:

| Dimension | Framework | Emerges From |
|-----------|-----------|--------------|
| **Attachment Style** | Secure/Anxious/Avoidant/Disorganized | How they talk about relationships over time |
| **Locus of Control** | Internal vs External | How they explain outcomes - their agency or circumstances? |
| **Temporal Orientation** | Zimbardo's Time Perspective | Do they dwell on past, live in present, plan for future? |
| **Growth Mindset** | Dweck's framework | How they respond to failure, challenges, feedback |
| **Change Readiness** | Prochaska's Stages | Movement (or lack thereof) across conversations |
| **Stress Response** | Fight/Flight/Freeze/Fawn | Patterns in how they describe difficult moments |
| **Emotional Regulation** | Suppression/Expression/Reappraisal/Rumination | How they process feelings in real-time |
| **Identity Anchors** | Role/Value/Relational/Achievement/Trait based | What they keep returning to, what they protect |
| **Self-Efficacy** | High vs Low | Do they believe they can execute on intentions? |

### Framework Details

#### Maslow's Hierarchy of Needs

```
┌─────────────────────────────────────┐
│      Self-Actualization             │  "How do I find meaning?"
├─────────────────────────────────────┤
│          Esteem                     │  "Am I respected? Do I respect myself?"
├─────────────────────────────────────┤
│      Love / Belonging               │  "Do I have connection?"
├─────────────────────────────────────┤
│          Safety                     │  "Is my job secure? Am I safe?"
├─────────────────────────────────────┤
│       Physiological                 │  "Can I pay rent? Am I sleeping?"
└─────────────────────────────────────┘
```

System should identify which level(s) are currently challenged and weight advice accordingly.

#### Big Five (OCEAN)

- **Openness**: Novel experiences vs stability preference
- **Conscientiousness**: Structured plans vs flexible suggestions
- **Extraversion**: Social activities vs solo pursuits
- **Agreeableness**: Harmony-seeking vs comfortable with conflict
- **Neuroticism**: Anxiety/stress capacity and patterns

#### Schwartz's Basic Values

```
         Self-Transcendence
        /                  \
   Universalism          Benevolence
       |                      |
   Self-Direction -------- Conformity
       |                      |
   Stimulation            Tradition
       |                      |
   Hedonism               Security
        \                  /
          Self-Enhancement
           (Achievement, Power)
```

Adjacent values compatible; opposite values create tension.

#### Moral Foundations (Haidt)

- Care / Harm
- Fairness / Cheating
- Loyalty / Betrayal
- Authority / Subversion
- Sanctity / Degradation
- Liberty / Oppression

### Axis Reference Library

For complete reference material on each psychological axis including:
- Detailed definitions and frameworks
- Detection signals for each value/state
- Questions to elicit information
- Completeness criteria
- How each axis affects advice delivery

See **AXIS_REFERENCE_LIBRARY.md**

---

## Stated vs Revealed Values

### The Problem

People are often self-deluded. Stated values frequently don't align with actual values:

| Pattern | Example |
|---------|---------|
| Social desirability | "I value helping others" (sounds good) |
| Aspirational identity | "I'm creative" (wants to be, hasn't created in years) |
| Genuine blind spots | Doesn't realize they consistently choose security over growth |
| Defense mechanisms | Can't acknowledge a value that conflicts with self-image |

### Solution: Dual Tracking

The system maintains two parallel value systems:

```
┌─────────────────────────────────────────────────────────────┐
│  STATED VALUES                                              │
│  ─────────────────────────────────────────────────────────  │
│  What they explicitly say matters to them                   │
│  Source: direct statements, onboarding, self-description    │
│  Confidence: low-medium (words are cheap)                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  REVEALED VALUES                                            │
│  ─────────────────────────────────────────────────────────  │
│  What their behavior/choices/emotions suggest               │
│  Source: decisions described, time allocation, emotional    │
│          reactions, patterns over time                      │
│  Confidence: builds over time with more evidence            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  GAP ANALYSIS                                               │
│  ─────────────────────────────────────────────────────────  │
│  Where stated and revealed diverge                          │
│  THIS IS WHERE THE INSIGHT LIVES                            │
└─────────────────────────────────────────────────────────────┘
```

### Signals for Revealed Values

| Signal Type | What It Reveals |
|-------------|-----------------|
| **Behavioral evidence** | Time allocation, actual choices made, what gets sacrificed under pressure |
| **Emotional intensity** | Anger (values violated), joy (values fulfilled), guilt (values self-betrayed), defensiveness (identity protection) |
| **Revealed preferences** | When forced to choose between X and Y, which won? |
| **Patterns over time** | Single statements unreliable; patterns across conversations are signal |
| **Language patterns** | "I should..." (external) vs "I want to..." (internal desire) |
| **Avoidance patterns** | What topics they deflect, change subject on, never mention |
| **Projection** | What they criticize in others often reveals their own sensitivities |

### Handling the Gap

The system reflects contradictions gently, using the user's own evidence:

**Bad approach:**
> "You say family is important but you clearly prioritize work. You're deluding yourself."

**Good approach:**
> "I've noticed something I'm curious about. You've mentioned several times that family is your top priority, and I can hear how much you mean that. At the same time, looking at how you've described the last few months, work seems to be winning most of the trade-offs - the late nights, the missed recital, the canceled vacation.
>
> I'm not saying one is right or wrong. But I'm wondering if there's some tension there you're feeling?"

### Insight Hierarchy

System earns the right to deeper insights through demonstrated understanding:

```
Level 1: Reflect what they said
         "You mentioned family is important to you."
         [Safe, builds trust, low insight]
              ↓
Level 2: Reflect patterns in what they said
         "I've noticed you bring up your mom a lot when we talk about stress."
         [Moderate insight, observable]
              ↓
Level 3: Reflect contradictions/tensions
         "You say X, but the evidence suggests Y. I'm curious about that gap."
         [Higher insight, requires trust]
              ↓
Level 4: Offer interpretation
         "I wonder if what's actually happening is..."
         [Highest insight, highest risk, requires established trust]
```

---

## Onboarding Experience

### Core Principle

**The onboarding IS the product.** Self-discovery through conversation is the core value. Data collection is a byproduct, not a prerequisite.

### Approach: Guided Discussion, Not Forms

**Form-based (bad):**
```
Rate your agreement (1-5):
"I believe I control my own destiny"
```
Boring. Performative answers. Low signal.

**Guided discussion (good):**
```
System: "Tell me about a decision you made recently
        that you're still thinking about."

User: "I turned down a job offer last month..."

[System extracts multiple signals from natural response]
```

### Onboarding Flow: Priority-Driven Guided Conversation

The system dynamically selects questions based on what's most important to learn and what we already know.

**Priority Score = Importance × (1 - Completeness)**

```
System calculates priority score for each psychological axis
         ↓
Picks highest priority axis (e.g., Maslow Status)
         ↓
Asks conversational question for that axis
         ↓
User responds (OR diverts to their own topic)
         ↓
If user diverts → follow their lead immediately
         ↓
Extraction runs, updates completeness for ALL axes
         ↓
Recalculate priorities, pick next highest
         ↓
Repeat until baseline met or user takes control
```

**Key Principle:** User can divert anytime. Guided questions are a fallback when they don't have something specific in mind, not a gate.

**Exit Conditions:**
1. All Tier 1 axes > 0.5 completeness AND 2+ Tier 2 axes > 0.3
2. User brings up their own topic
3. Response contains a clear question
4. After ~5-7 guided exchanges

See GAPS_AND_PHASES.md for full axis priority ranking and example questions.

### Profile Visualization

**Core principle:** In the spirit of transparency, users should be able to see everything the system has learned about them. This is a core value-add, not a hidden feature.

**Naming:** Never call it a "psychological profile" - that sounds clinical and scary.

Primary name: **"Your Self-Portrait"**

This framing:
- Implies art, not science - feels personal and creative
- Suggests it's *their* portrait, not our assessment
- Evokes self-reflection and self-knowledge
- Feels warm and inviting

**Requirements:**
- Users can view all extracted data
- Users can edit/correct any information
- Visualizations should feel warm and insightful, not clinical
- Show confidence levels so users understand what's solid vs tentative
- Surface gaps and contradictions as opportunities for reflection, not judgments

**Open design question:** What specific visualizations work best? (radar charts for values? timeline for patterns? cards for insights?)

### Optional Deep Dives

Available as features, not gates:

- **"Discover Your Values"** - Guided 10-minute conversation
- **"Understand Your Patterns"** - Reflection on recent decisions
- **"Map Your Relationships"** - Explore attachment and connection
- **"Clarify What's Next"** - Goals and change readiness

These are conversations, not forms. Valuable in themselves. Accelerate model-building.

### Stack Ranking for Values

Forced choices reveal true priorities:

```
"If you had to choose, would you rather have:
 □ A stable, predictable life with financial security
 □ An exciting life with more uncertainty but more potential"

"When making a big decision, do you tend to:
 □ Go with your gut feeling
 □ Make a pros/cons list and analyze"
```

Binary choices more revealing than "rate importance 1-5" (where everyone rates everything important).

---

## Input Modalities

### Text Input
- Primary input method
- Works in privacy-constrained situations
- Lower barrier to entry

### Voice Input

**Rationale:**
- People interact differently when speaking vs typing
- Speaking is more natural, less filtered, more stream-of-consciousness
- Voice reveals emotional signal: tone, pace, hesitation
- Lower friction for rambling (which reveals more)

**Requirements:**
- Optional, never required
- Local transcription for privacy using Whisper
- Text is primary storage format
- Voice metadata (pace, pauses, tone) extracted and stored as additional signal

**Interaction Model: Toggle-to-Talk with VAD Chunking**

```
┌─────────────────────────────────────────────────────────────┐
│  User presses hotkey to START speaking                      │
│  (not hold - just toggle on)                                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Audio capture begins                                       │
│  VAD monitors for natural pause points                      │
│                                                             │
│  When VAD detects pause > threshold:                        │
│  → Ship that chunk to Whisper for transcription             │
│  → Continue capturing (user may still be speaking)          │
│  → Stitch transcriptions together                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  User presses hotkey to STOP speaking                       │
│  (or system detects extended silence)                       │
│                                                             │
│  → Final chunk sent to Whisper                              │
│  → Complete transcription assembled                         │
│  → Passed to system as user input                           │
└─────────────────────────────────────────────────────────────┘
```

This approach:
- Doesn't require holding a button (more natural for longer thoughts)
- Handles speech longer than Whisper's 30-second window
- Provides incremental transcription while user is still speaking
- Clear start/stop boundaries (intentionality for sensitive content)

**Whisper Model Selection**

Default to best quality, fall back based on hardware:

| Hardware | Model | VRAM | Quality |
|----------|-------|------|---------|
| GPU with 6GB+ VRAM | `turbo` (default) | ~6 GB | Excellent |
| GPU with 2-4GB VRAM | `small` | ~2 GB | Good |
| CPU only | `base` | ~1 GB | Acceptable |

System should auto-detect available VRAM and select appropriate model, with user override available in settings.

**System Dependencies:**
- FFmpeg (audio processing)
- `whisper-node` or `@nicksellen/whisper-node` (Whisper.cpp bindings)
- `@ricky0123/vad-web` or similar (voice activity detection)

---

## Data Ingestion

### Supported Sources

**Priority 1 (MVP):**
- Plain text journals
- Conversations with the system itself

**Priority 2:**
- ChatGPT/Claude conversation exports
- Day One journal exports
- Notion exports

**Priority 3:**
- Other journaling app formats
- Email (highly sensitive - careful consideration needed)

### Incremental Processing

- Users can start with zero documents
- Onboarding conversation bootstraps initial profile
- Documents processed incrementally as uploaded
- System works immediately, improves with more data

---

## Context Assembly

### The Problem

When user asks a question, system needs to assemble relevant context. Naive vector search fails because:
- "Happiness" query might not match "avoiding calling mom" (but that's crucial context)
- Need holistic understanding, not just similar snippets
- Some context (core values) always relevant regardless of query similarity

### Solution: Structured Context Assembly

```
User Question
     ↓
Step 1: Query Classification
     → Type: life_direction / activity_suggestion / problem_solving / etc.
     → Timeframe: past / present / future focused
     → Domains: work / relationships / health / all
     ↓
Step 2: Structured Retrieval (parallel queries)
     → Core Values (top 5)
     → Current Challenges
     → Recent Activities
     → Stated Goals
     → Relevant Maslow level concerns
     ↓
Step 3: Gap Analysis (computed)
     → Compare values vs recent behavior
     → Identify tensions and avoidance patterns
     ↓
Step 4: Semantic Search (query-specific)
     → Vector search for question-relevant memories/entries
     ↓
Step 5: Assemble Context Document
     ↓
Step 6: LLM Generates Response
```

### User State Summary

Periodically updated snapshot for baseline context:

```json
{
  "user_id": "abc123",
  "summary_updated": "2025-01-18",
  "life_snapshot": {
    "current_phase": "career_transition",
    "emotional_baseline": "anxious_but_hopeful",
    "top_3_concerns": ["job", "mom", "sleep"],
    "top_3_values": ["family", "creativity", "security"],
    "recent_wins": ["reconnected with college friends"],
    "recent_struggles": ["creative block", "avoiding difficult conversation"]
  }
}
```

Included in every conversation as baseline. Detailed retrieval adds specifics.

---

## Prompt Engineering

### Design Philosophy

**Optimize for quality first, cost second.** The product lives or dies on response quality. Build the best system possible, measure costs, then optimize if needed.

### Scaffolding Approach

Use **dynamic prompt assembly** with a **chain-of-thought checklist**:
- Include only relevant psychological dimensions based on context plan
- Append lightweight checklist to ensure nothing critical is missed
- Keeps prompts focused while maintaining systematic consideration

### The Three Prompt Types

The system uses three distinct prompt types:

```
┌─────────────────────────────────────────────────────────────┐
│  PROMPT TYPE 1: Extraction                                  │
│  Runs after each user turn                                  │
│  Purpose: Extract psychological signals to update profile   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  PROMPT TYPE 2: Context Planning                            │
│  Runs before responding to user question                    │
│  Purpose: Determine what context to retrieve                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  PROMPT TYPE 3: Response Generation                         │
│  Runs with assembled context                                │
│  Purpose: Generate personalized response                    │
└─────────────────────────────────────────────────────────────┘
```

---

### Prompt Type 1: Extraction

Runs in background after each user message to update psychological profile.

```markdown
## Extraction Prompt

You are analyzing a user's message to extract psychological signals.
Be conservative - only extract what is clearly evidenced, not inferred.

### User Message
{user_message}

### Existing Profile Summary
{brief_profile_summary}

### Extract signals across these dimensions (if present):

**Maslow Indicators**
- Any physiological concerns mentioned? (sleep, health, basic needs)
- Safety/security concerns? (job, financial, physical safety)
- Belonging signals? (relationships, loneliness, connection)
- Esteem signals? (self-worth, recognition, achievement)
- Self-actualization signals? (meaning, purpose, growth)

**Values Signals (Schwartz)**
- What does the user seem to prioritize in this message?
- Any trade-offs mentioned or implied?
- What do they protect or resist?

**Behavioral Evidence**
- Any concrete actions or decisions mentioned?
- Time allocation signals?
- What did they choose when facing a conflict?

**Emotional Signals**
- What emotions are expressed or implied?
- What intensity level?
- What triggered the emotion (if clear)?

**Language Patterns**
- "I should..." vs "I want to..." usage?
- Internal vs external attribution?
- Past/present/future focus?

**Contradictions or Gaps**
- Does anything contradict previously stated values?
- Any avoidance patterns visible?

### Output Format

Return a JSON object with only the dimensions where you found
clear evidence. Include confidence levels (low/medium/high) and
quote the specific text that supports each extraction.

{
  "maslow": { ... },
  "values_signals": [ ... ],
  "behavioral_evidence": [ ... ],
  "emotional_signals": [ ... ],
  "language_patterns": { ... },
  "contradictions": [ ... ],
  "raw_quotes": [ ... ]
}

If nothing significant is extractable from this message, return:
{ "no_significant_signals": true }
```

---

### Prompt Type 2: Context Planning

Determines what context to retrieve before generating response.

```markdown
## Context Planning Prompt

You are planning what context to retrieve to answer a user's question
in a deeply personalized way.

### User's Question
{user_question}

### User Profile Summary
{profile_summary}

### Available Context Categories

**Always Relevant:**
- core_values (top 5 values with confidence scores)
- maslow_status (current hierarchy level concerns)
- active_challenges (what they're struggling with)

**Situationally Relevant:**
- recent_activities (what they've been doing lately)
- stated_goals (what they say they want)
- relationship_context (key relationships and dynamics)
- work_context (job situation, career)
- health_context (physical/mental health patterns)
- historical_patterns (long-term behavioral patterns)
- value_behavior_gaps (where stated ≠ revealed)
- emotional_patterns (how they typically process feelings)
- decision_style (how they make choices)

### Your Task

1. Classify the question type:
   - life_direction (big picture, meaning, purpose)
   - activity_suggestion (what to do)
   - problem_solving (specific challenge)
   - emotional_processing (need to be heard)
   - relationship (about connections with others)
   - decision_support (help choosing)
   - self_understanding (who am I?)
   - other: {specify}

2. Determine relevant timeframe:
   - past_focused
   - present_focused
   - future_focused

3. Select context categories to retrieve (choose 3-7):
   List which categories and why each is relevant.

4. Specify any semantic search queries:
   What specific memories or entries might be relevant?
   (These will be used for vector search)

### Output Format

{
  "question_type": "...",
  "timeframe": "...",
  "categories_to_retrieve": [
    { "category": "...", "reason": "..." },
    ...
  ],
  "semantic_queries": [
    "...",
    ...
  ],
  "special_considerations": "..."
}
```

---

### Prompt Type 3: Response Generation

Main response generation with assembled context.

```markdown
## Response Generation Prompt

You are a thoughtful guide helping someone understand themselves
and navigate their life. You have deep knowledge of this specific
person from their journals, conversations, and reflections.

### Core Principles

**Be genuinely helpful, not sycophantic.**
- Reflect what you actually observe, not what they want to hear
- Point out contradictions gently when relevant
- Use their own words and evidence

**Match their support-seeking style:**
- If they need to vent: listen, validate, don't rush to solutions
- If they want solutions: be direct and actionable
- If they need validation: affirm while being honest

**Respect the insight hierarchy:**
- Level 1-2: Safe to offer (reflecting what they said/patterns)
- Level 3-4: Ask permission first ("Would you like me to share
  an observation?") unless trust is well-established

**Never claim certainty about their inner life.**
- Use language like "I notice...", "I wonder if...", "It seems like..."
- Leave room for "I might be wrong about this"

**Consider their Maslow status.**
- Don't suggest self-actualization work if they're worried about rent
- Meet them where they are

### User's Question
{user_question}

### Assembled Context

**Profile Summary**
{profile_summary}

**Maslow Status**
{maslow_status}

**Core Values (Stated)**
{stated_values}

**Core Values (Revealed)**
{revealed_values}

**Value-Behavior Gaps**
{gaps}

**Current Challenges**
{challenges}

**Recent Activities**
{recent_activities}

**Relevant Goals**
{goals}

**Relevant Memories/Entries**
{semantic_search_results}

**Psychological Profile**
- Big Five signals: {big_five}
- Attachment style: {attachment}
- Locus of control: {locus}
- Risk tolerance: {risk}
- Support-seeking style: {support_style}
- Change readiness: {change_readiness}

### Response Guidelines for This Question Type: {question_type}

{question_type_specific_guidelines}

### Chain-of-Thought Checklist

Before responding, briefly consider:
- [ ] What Maslow level is this person at?
- [ ] What values are most relevant here?
- [ ] Is there a stated/revealed gap that matters?
- [ ] What support style do they need right now?
- [ ] Am I being honest or sycophantic?
- [ ] Am I meeting them where they are?

### Generate Your Response

Remember: This person came to understand themselves better.
Help them see what they might not see alone.
```

---

### Question-Type-Specific Guidelines

Injected into response prompt based on question type:

**life_direction:**
```
- Connect to their core values (especially revealed values)
- Acknowledge where they are in Maslow's hierarchy
- If there are value-behavior gaps, this may be a good moment to gently surface them
- Don't give generic advice - ground everything in their specific situation
```

**emotional_processing:**
```
- Lead with validation and reflection
- Don't rush to problem-solving
- Mirror their emotional language
- Only offer reframes if they seem ready
```

**decision_support:**
```
- Surface relevant values that apply to this decision
- Note their typical decision-making style
- If their gut and logic conflict, name that
- Consider their risk tolerance
- Don't decide for them - illuminate the choice
```

**activity_suggestion:**
```
- Consider their energy levels and current Maslow status
- Match suggestions to their personality (introvert/extrovert, etc.)
- Consider recent activities to avoid repetition
- Align with stated goals where possible
```

**self_understanding:**
```
- This is where deeper insights are most welcome
- Draw from patterns across multiple conversations
- Surface contradictions and gaps thoughtfully
- Help them see what they might not see alone
```

**problem_solving:**
```
- Understand the problem before offering solutions
- Consider their locus of control (agency vs constraints)
- Match solution complexity to their current capacity
- Check if they want solutions or just to be heard first
```

**relationship:**
```
- Consider their attachment style
- Look for patterns in how they describe relationships
- Be careful with advice that could damage relationships
- Acknowledge the complexity of human connection
```

---

## Ethics & Guardrails

### Privacy

- All data stored locally on user's machine
- No cloud sync without explicit opt-in
- If any cloud features, end-to-end encryption is non-negotiable
- API calls to Claude are stateless (not stored by Anthropic)

### Transparency

- Tell users exactly what the system is doing and why
- Users can see their profile and all extracted data
- Users can edit/correct any extracted information

### Avoiding Manipulation

- System serves user's stated AND revealed values - their goals, not ours
- No dark patterns in onboarding
- Never use psychological knowledge to push toward system's goals

### Avoiding Harm

- System should never claim certainty about someone's inner life
- Always leave room for "I might be wrong about this"
- Recognize limits - this isn't therapy
- Provide resources for crisis situations
- Appropriate disclaimers about not being a mental health professional

### Avoiding Boxing In

- People change. Values shift. System should adapt.
- Weight recent data higher than old data
- Periodically check: "Does this still feel accurate?"
- Never treat profile as fixed/permanent

### Permission Before Depth

- Ask permission before sharing deep observations
- "Would you like me to share something I've noticed?"
- User can always decline

---

## Technical Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Desktop Framework | **Electron** | Mature ecosystem, native Node.js integration |
| Frontend | React or Vue (in Electron renderer) | Modern UI, component-based |
| Backend Logic | **TypeScript** (Node.js in main process) | Single language across entire stack |
| Structured Storage | SQLite via `better-sqlite3` | Synchronous, fast, TypeScript-native |
| Vector Storage | LanceDB via `vectordb` | Official TypeScript bindings, embedded |
| Embeddings | `@huggingface/transformers` + voyage-4-nano | Local embeddings, Claude-optimized (Voyage AI) |
| LLM | Claude API via `@anthropic-ai/sdk` | Official TypeScript SDK |
| Voice Transcription | Whisper.cpp via `whisper-node` | Local, privacy-preserving |
| File Storage | Local filesystem via Node.js `fs` | Original documents |
| IPC | Electron IPC (contextBridge) | Native, type-safe, no HTTP overhead |

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Electron App (All TypeScript)                              │
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │ Renderer Process    │  │ Main Process        │          │
│  │ (React/Vue UI)      │  │ (Node.js)           │          │
│  │                     │  │                     │          │
│  │ - Conversation UI   │  │ - SQLite operations │          │
│  │ - Profile display   │  │ - LanceDB vectors   │          │
│  │ - Settings          │  │ - Claude API calls  │          │
│  │                     │  │ - Embedding model   │          │
│  └─────────────────────┘  │ - Whisper (local)   │          │
│           │               │ - Prompt assembly   │          │
│           │ contextBridge │ - Extraction        │          │
│           └──────────────►│                     │          │
│                           └─────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### Why Pure TypeScript

1. **Single language** - No context-switching between TypeScript and another language
2. **Native Electron integration** - Main process IS Node.js, no subprocess overhead
3. **Mature ecosystem** - All required libraries exist in npm:
   - `@anthropic-ai/sdk` - Official Claude SDK
   - `@huggingface/transformers` - Local ML models including voyage-4-nano (Claude-optimized)
   - `better-sqlite3` - Fast synchronous SQLite
   - `vectordb` - Official LanceDB TypeScript bindings
4. **Type safety** - End-to-end TypeScript, shared types between UI and backend
5. **Simplified deployment** - No Python runtime to bundle

---

## Pricing Model (Considerations)

Primary cost driver is LLM API usage:
- Initial ingestion: ~50k tokens per journal (varies)
- Extraction: Input + ~2k output tokens per document
- Per conversation: ~4k context + ~1k response

### Options

1. **Freemium + Usage**: Free tier (limited docs), pay per document + conversation credits
2. **Subscription**: $10-20/month unlimited conversations, capped document ingestion
3. **One-time + subscription**: Pay to process archive, subscribe for ongoing

### Value Positioning

This is "life-changing insight" territory. People pay therapists $150/hour for less personalized guidance. The system should be positioned as high-value, not cheap utility.

---

## Open Questions

1. **Document formats**: What specific formats to prioritize for MVP?
2. **Profile visualization**: How should users see their profile? What visualizations?
3. **Multi-device**: Any sync requirements, or strictly single-device?
4. **Backup/export**: How do users backup or move their data?
5. **VAD tuning**: What silence threshold works best for natural chunking?
6. **Prompt iteration**: How do we test and improve prompt effectiveness over time?

---

## Document History

| Date | Changes |
|------|---------|
| 2025-01-18 | Initial requirements capture from design conversation |
| 2025-01-18 | Added voice input details (toggle-to-talk, VAD chunking, Whisper model selection) |
| 2025-01-18 | Added prompt engineering section with all three prompt scaffolds |
| 2025-01-18 | Decided on Electron + Python architecture |
| 2025-01-18 | Named profile visualization feature "Your Self-Portrait" |
| 2025-01-18 | Updated architecture diagram, IPC protocol, onboarding flow to match gaps decisions |
| 2025-01-18 | Created Axis Reference Library (AXIS_REFERENCE_LIBRARY.md) with full documentation |
| 2025-01-18 | Changed tech stack from Python to pure TypeScript (user preference) |
| 2026-01-18 | Switched embedding model from bge-large-en-v1.5 to voyage-4-nano (Claude-optimized, local) |
