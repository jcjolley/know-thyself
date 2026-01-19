# Axis Reference Library

This document provides the source material for each psychological axis the system gathers information about. Each axis includes definitions, possible values, detection signals, example questions, and completeness criteria.

The LLM uses this reference material for:
- **Extraction prompts**: Know what signals to look for
- **Guided conversation**: Know what questions to ask
- **Response generation**: Understand how to apply insights
- **Completeness calculation**: Know when we have enough data

---

# Tier 1: Essential (Gathered Early)

These axes are critical for avoiding bad advice. Prioritize gathering these first.

---

## 1.1 Maslow Status

### Definition
Maslow's Hierarchy of Needs identifies which fundamental human needs are currently met or challenged. Lower-level needs generally must be addressed before higher-level needs become primary concerns.

### Levels

| Level | Need | Description | When Challenged |
|-------|------|-------------|-----------------|
| **Physiological** | Survival | Basic biological needs: sleep, food, water, shelter, health | Person can't focus on anything else |
| **Safety** | Security | Physical safety, financial security, job stability, health security | Anxiety, hypervigilance, can't plan ahead |
| **Belonging** | Connection | Love, friendship, family, community, intimacy | Loneliness, isolation, feeling unseen |
| **Esteem** | Respect | Self-respect, confidence, achievement, respect from others | Self-doubt, imposter syndrome, seeking validation |
| **Self-Actualization** | Growth | Purpose, meaning, creativity, reaching potential | Existential questioning, feeling unfulfilled |

### Detection Signals

| Level | Concern Signals | Stability Signals |
|-------|-----------------|-------------------|
| **Physiological** | "Can't sleep", "Struggling to eat", "Health issues", "Can't afford rent", "Exhausted all the time" | "Sleeping well", "Health is good", "Basics are covered" |
| **Safety** | "Might lose my job", "Worried about money", "Don't feel safe", "Everything feels unstable", "What if X happens" | "Job is secure", "Financially stable", "Feel safe at home" |
| **Belonging** | "No one understands me", "Feeling lonely", "Disconnected from family", "No real friends", "Don't belong anywhere" | "Great support system", "Close to my family", "Good friends" |
| **Esteem** | "I'm not good enough", "Imposter syndrome", "No one respects me", "What have I even accomplished", "Constantly criticized" | "Proud of my work", "Feel confident", "Respected by peers" |
| **Self-Actualization** | "What's the point?", "Is this all there is?", "Not living up to potential", "Lost my purpose", "Feel stuck" | "Feeling fulfilled", "Doing meaningful work", "Growing as a person" |

### Questions to Ask

**Direct (use sparingly):**
- "How are things going with the basics right now - work, health, finances, living situation?"
- "Is there anything weighing on you at a really fundamental level?"

**Indirect (preferred):**
- "Tell me what's been on your mind lately"
- "What's been taking up most of your mental energy?"
- "If you could change one thing about your current situation, what would it be?"

### Completeness Criteria

| Completeness | Definition |
|--------------|------------|
| 0% | No information about any level |
| 25% | General sense of "doing okay" or "struggling" but no specifics |
| 50% | Know which 1-2 levels are primary concerns |
| 75% | Know specific concerns at each relevant level with some context |
| 100% | Clear picture of all levels, know what's stable and what's challenged |

### How This Affects Advice

- **If Physiological/Safety challenged**: Focus on practical, immediate solutions. Don't suggest self-actualization work.
- **If Belonging challenged**: Consider loneliness as potential root cause. Connection-focused suggestions.
- **If Esteem challenged**: Be encouraging but not sycophantic. Help build genuine confidence.
- **If Self-Actualization is focus**: Can explore meaning, purpose, values alignment.

---

## 1.2 Support-Seeking Style

### Definition
How the person prefers to receive help when something is on their mind. Getting this wrong immediately breaks trust.

### Styles

| Style | What They Want | What They Don't Want |
|-------|----------------|----------------------|
| **Emotional Support** | To be heard, validated, feel less alone | Immediate solutions, being "fixed" |
| **Instrumental Support** | Practical help, solutions, action steps | Long processing time, "just talking" |
| **Informational Support** | Knowledge, options, perspectives | Emotional processing, hand-holding |
| **Validation Support** | Confirmation they're not crazy, their feelings make sense | Devil's advocate, alternative views |
| **Independence** | Space to figure it out, sounding board only | Being told what to do, unsolicited advice |

### Detection Signals

| Style | Signals |
|-------|---------|
| **Emotional** | "I just need to vent", "I know there's no solution", "I just want someone to understand", long emotional narratives |
| **Instrumental** | "What should I do?", "I need to fix this", "What are my options?", jumps to action |
| **Informational** | "What do you think about X?", "Have you seen this before?", "What are the pros and cons?", analytical framing |
| **Validation** | "Am I crazy for thinking...?", "Is it reasonable that...?", "Would you feel this way too?", seeking agreement |
| **Independence** | "I think I know what to do, but...", "Let me think out loud", "Don't tell me what to do, but..." |

### Questions to Ask

**Direct (works well for this axis):**
- "When something's on your mind, do you usually want help solving it, or do you need to talk it through first?"
- "What would be most helpful from me right now - listening, thinking through options, or something else?"

**In the moment:**
- "Before I respond - are you looking for thoughts on what to do, or do you just need to be heard right now?"

### Completeness Criteria

| Completeness | Definition |
|--------------|------------|
| 0% | No information |
| 50% | Have a guess based on how they communicate |
| 100% | They've explicitly stated or clearly demonstrated their preference |

### How This Affects Responses

- **Emotional**: Lead with reflection and validation. "That sounds really hard." Don't jump to solutions.
- **Instrumental**: Be direct. Give options and action steps. Don't over-process.
- **Informational**: Provide analysis, perspectives, trade-offs. Be a thinking partner.
- **Validation**: Affirm their feelings first. "That makes complete sense." Then gently expand view if needed.
- **Independence**: Ask questions. Reflect back. Let them drive. "What are you leaning toward?"

---

## 1.3 Life Situation

### Definition
Basic factual context about the person's current life circumstances. Essential grounding for all advice.

### Dimensions

| Dimension | What to Know |
|-----------|--------------|
| **Work/Career** | Employed? What kind of work? Student? Between jobs? Retired? |
| **Relationships** | Single? Partnered? Married? Divorced? It's complicated? |
| **Family** | Kids? Parents alive/relationship? Siblings? Family of choice? |
| **Living** | Where? Alone? With others? Stable housing? |
| **Health** | Any major health issues? Mental health history? |
| **Age/Stage** | Life stage context (young adult, midlife, retirement, etc.) |

### Detection Signals

These are usually stated directly in conversation:
- "My wife and I..."
- "I've been at this job for..."
- "Since moving to..."
- "As a parent..."
- "At my age..."

### Questions to Ask

**Opening:**
- "Tell me a bit about your life right now - what does a typical week look like?"
- "What's your current situation - work, living situation, that kind of thing?"

**Follow-up (only if relevant):**
- "Are you going through this alone, or is there someone in your life who's involved?"
- "How long have you been in this situation?"

### Completeness Criteria

| Completeness | Definition |
|--------------|------------|
| 0% | Know nothing about their life |
| 25% | Know one dimension (e.g., they have a job) |
| 50% | Know 2-3 dimensions with basic detail |
| 75% | Know most dimensions, understand context |
| 100% | Clear picture of life circumstances across all relevant dimensions |

### How This Affects Advice

- Grounds all advice in reality
- Avoids embarrassing assumptions ("talk to your partner" when they're single)
- Enables relevant suggestions (can't suggest "take time off" if they're worried about job)
- Provides context for values and challenges

---

## 1.4 Immediate Intent

### Definition
What specifically brought them to this conversation today. What are they hoping to get out of this interaction?

### Types

| Intent Type | What They Want |
|-------------|----------------|
| **Specific Question** | Answer to a particular question or decision |
| **General Exploration** | Think through something, no specific goal |
| **Emotional Processing** | Work through feelings about something |
| **Accountability** | Someone to check in with, stay on track |
| **Self-Discovery** | Understand themselves better |
| **Crisis Support** | Immediate help with acute distress |
| **Just Curious** | Exploring the system, no specific need |

### Detection Signals

| Intent | Signals |
|--------|---------|
| **Specific Question** | "Should I...?", "What do you think about...?", "Help me decide..." |
| **General Exploration** | "I've been thinking about...", "Something's been on my mind...", open-ended |
| **Emotional Processing** | Emotional language, processing events, "I just found out...", "I can't stop thinking about..." |
| **Accountability** | "I said I would...", "Can you help me stay on track with...", "I need to..." |
| **Self-Discovery** | "Why do I always...?", "What does it mean that...?", "Help me understand myself..." |
| **Crisis Support** | Urgent language, acute distress, "I don't know what to do", overwhelm |
| **Just Curious** | "What can you do?", exploring features, light tone |

### Questions to Ask

**Opening (always good):**
- "What's on your mind today?"
- "What brought you here?"

**Clarifying:**
- "Is there something specific you're hoping to figure out, or is this more of an open exploration?"
- "What would make this conversation feel useful to you?"

### Completeness Criteria

| Completeness | Definition |
|--------------|------------|
| 0% | No idea why they're here |
| 50% | General sense of what they want |
| 100% | Clear understanding of their goal for this conversation |

### How This Affects Responses

- **Specific Question**: Focus on that question. Don't wander.
- **General Exploration**: Follow their lead. Ask questions. Let it unfold.
- **Emotional Processing**: Prioritize emotional support style. Don't rush.
- **Accountability**: Be direct. Check in. Hold them to it (gently).
- **Self-Discovery**: Reflect patterns. Offer observations. Use insight hierarchy.
- **Crisis Support**: Immediate validation. Assess severity. Provide resources if needed.
- **Just Curious**: Be welcoming. Explain value. Invite them to share.

---

# Tier 2: Early Inference (First Few Conversations)

These dramatically improve personalization quality. Gather through natural conversation.

---

## 2.1 Core Values (Schwartz)

### Definition
Schwartz's Theory of Basic Values identifies 10 universal value types organized in a circular structure. Adjacent values are compatible; opposite values create tension.

### The 10 Values

| Value | Definition | What It Looks Like |
|-------|------------|-------------------|
| **Self-Direction** | Independence of thought and action; creating, exploring | "I need to do things my own way", prizes autonomy, resists being told what to do |
| **Stimulation** | Excitement, novelty, challenge | Gets bored easily, seeks adventure, values variety |
| **Hedonism** | Pleasure and sensuous gratification | Prioritizes enjoyment, self-indulgence, fun |
| **Achievement** | Personal success through demonstrating competence | Ambitious, capable, driven to succeed, values recognition |
| **Power** | Social status, prestige, control over resources/people | Wants influence, authority, wealth, status symbols |
| **Security** | Safety, harmony, stability of society/relationships/self | Risk-averse, values predictability, safety-conscious |
| **Conformity** | Restraint of actions that violate social norms | Follows rules, respects authority, avoids rocking boat |
| **Tradition** | Respect for customs and ideas from culture/religion | Values heritage, rituals, established ways |
| **Benevolence** | Preserving and enhancing welfare of close others | Caring for family/friends, loyal, helpful to inner circle |
| **Universalism** | Understanding, tolerance, protection for all people/nature | Broad concern for humanity, justice, environment |

### Value Structure

```
            SELF-TRANSCENDENCE
           Universalism  Benevolence
                  \      /
    OPENNESS       \    /       CONSERVATION
    TO CHANGE       \  /
                     \/
   Self-Direction----+----Conformity
   Stimulation       |    Tradition
                     |    Security
                    /\
                   /  \
                  /    \
           Hedonism    Power
           Achievement
            SELF-ENHANCEMENT
```

**Oppositions:**
- Self-Direction ↔ Conformity/Tradition
- Stimulation ↔ Security
- Universalism ↔ Power
- Benevolence ↔ Achievement (sometimes)

### Detection Signals

| Value | Signals in Conversation |
|-------|------------------------|
| **Self-Direction** | "I need to figure this out myself", resists advice, values autonomy |
| **Stimulation** | "I'm bored with...", seeks novelty, "life is too routine" |
| **Hedonism** | Prioritizes enjoyment, "life is short", pleasure-seeking |
| **Achievement** | Talks about success, goals, accomplishments, being "the best" |
| **Power** | Mentions status, influence, control, wealth, being in charge |
| **Security** | Risk-averse language, "what if" worries, values stability |
| **Conformity** | "What will people think?", follows norms, avoids conflict |
| **Tradition** | References customs, heritage, "the way things are done" |
| **Benevolence** | Prioritizes close relationships, loyalty, helping loved ones |
| **Universalism** | Concern for broader society, justice, environment, humanity |

### Questions to Ask

**Direct:**
- "What matters most to you in life? What would you never compromise on?"
- "When you imagine your ideal life, what's non-negotiable?"

**Indirect (through trade-offs):**
- "If you had to choose between financial security and doing something you love, which way would you lean?"
- "Is it more important to you to stand out or to fit in?"

**Revealed through conflict:**
- "Tell me about a time you had to make a hard choice between two things that mattered to you"

### Completeness Criteria

| Completeness | Definition |
|--------------|------------|
| 0% | No value signals detected |
| 25% | 1-2 values seem prominent |
| 50% | Core value hierarchy emerging (3-4 values ranked) |
| 75% | Clear picture of dominant values with evidence |
| 100% | Full value profile with stated vs revealed tracking |

### How This Affects Advice

- Align suggestions with dominant values
- Anticipate value conflicts in decisions
- Frame advice in value-resonant language
- Note when behavior contradicts stated values (gap analysis)

---

## 2.2 Current Challenges

### Definition
What the person is currently struggling with, worried about, or trying to navigate.

### Categories

| Category | Examples |
|----------|----------|
| **Career/Work** | Job search, difficult boss, career change, burnout, work-life balance |
| **Relationships** | Conflict with partner, loneliness, family tension, friendship issues |
| **Health** | Physical illness, mental health, addiction, fitness goals |
| **Financial** | Debt, job loss, big purchase decision, financial stress |
| **Life Transition** | Moving, divorce, new baby, retirement, loss, graduation |
| **Personal Growth** | Bad habits, self-improvement goals, skill development |
| **Existential** | Purpose, meaning, direction, "what am I doing with my life" |
| **Decision** | Specific choice they need to make |

### Detection Signals

Challenges are usually stated or strongly implied:
- "I've been struggling with..."
- "The thing that's been keeping me up at night..."
- "I don't know how to handle..."
- Topics they keep returning to
- Emotional intensity around certain subjects

### Questions to Ask

**Opening:**
- "What's the biggest thing you're dealing with right now?"
- "Is there something that's been weighing on you?"

**Follow-up:**
- "How long has this been going on?"
- "What have you tried so far?"
- "What makes this particularly hard?"

### Completeness Criteria

| Completeness | Definition |
|--------------|------------|
| 0% | No challenges identified |
| 50% | Know 1-2 main challenges |
| 100% | Clear picture of current challenges with context and history |

### How This Affects Advice

- Address real concerns, not assumed ones
- Understand what's taking up mental/emotional energy
- Connect advice to actual situation
- Track progress over time

---

## 2.3 Goals

### Definition
What the person is working toward, wants to achieve, or wishes were different.

### Types

| Type | Description | Examples |
|------|-------------|----------|
| **Stated Goals** | Explicitly articulated objectives | "I want to get promoted", "I'm trying to exercise more" |
| **Implicit Goals** | Implied by complaints or desires | Complaining about weight → goal to be healthier |
| **Aspirational** | Distant dreams, "someday" goals | "I'd love to write a book someday" |
| **Active** | Currently being pursued | "I've been applying to jobs" |
| **Abandoned** | Gave up on, but may resurface | "I used to want to..." |

### Detection Signals

| Type | Signals |
|------|---------|
| **Stated** | "I want to...", "My goal is...", "I'm trying to..." |
| **Implicit** | "I wish...", "If only...", complaints about current state |
| **Aspirational** | "Someday...", "I've always dreamed of...", "In an ideal world..." |
| **Active** | "I've been working on...", "I started...", specific actions |
| **Abandoned** | "I gave up on...", "It didn't work out", "I stopped trying to..." |

### Questions to Ask

**Direct:**
- "What are you working toward right now?"
- "Is there something you're hoping to achieve or change?"

**Exploratory:**
- "If things went well over the next year, what would be different?"
- "What would make you feel like you're making progress?"

### Completeness Criteria

| Completeness | Definition |
|--------------|------------|
| 0% | No goals identified |
| 50% | Know 1-2 goals but limited context |
| 100% | Clear picture of goals with priority, status, and obstacles |

### How This Affects Advice

- Align suggestions with stated goals
- Notice goal-value alignment or conflict
- Track progress, celebrate wins
- Identify when goals may be unrealistic or misaligned

---

## 2.4 Moral Foundations (Haidt)

### Definition
Jonathan Haidt's Moral Foundations Theory identifies six foundations of moral intuition. Different people weight these differently, affecting what feels "right" or "wrong" to them.

### The Six Foundations

| Foundation | Virtue/Vice | Description | Triggers |
|------------|-------------|-------------|----------|
| **Care/Harm** | Kindness/Cruelty | Concern for suffering of others | Stories of suffering, vulnerability, nurturing |
| **Fairness/Cheating** | Justice/Injustice | Concern for fair treatment, rights | Cheating, unequal treatment, exploitation |
| **Loyalty/Betrayal** | Patriotism/Treachery | Concern for group bonds | Team membership, in-group sacrifice, betrayal |
| **Authority/Subversion** | Respect/Defiance | Concern for hierarchy, tradition | Leadership, tradition, rebellion, disrespect |
| **Sanctity/Degradation** | Purity/Disgust | Concern for contamination, sacredness | Disgust, purity, sacred values, degradation |
| **Liberty/Oppression** | Freedom/Control | Concern for autonomy, tyranny | Domination, bullying, rights violations |

### Typical Patterns

**Progressive-leaning:** High Care, Fairness, Liberty; Lower Authority, Loyalty, Sanctity
**Conservative-leaning:** More even distribution across all six foundations

*Note: We don't ask about politics. We observe moral intuitions.*

### Detection Signals

| Foundation | Signals |
|------------|---------|
| **Care** | Concern for suffering, empathy-driven decisions, "I couldn't bear to hurt..." |
| **Fairness** | "That's not fair", concerned with equality/equity, merit, rights |
| **Loyalty** | "You don't abandon your people", family/team first, in-group preference |
| **Authority** | Respects hierarchy, tradition-oriented, "that's how it's done" |
| **Sanctity** | Disgust reactions, "that's just wrong", sacred values, purity concerns |
| **Liberty** | "Don't tell me what to do", autonomy-focused, resists control |

### Questions to Ask

**Indirect (through scenarios or reactions):**
- "What's something you find genuinely unacceptable, even if others disagree?"
- "When you judge someone harshly, what have they usually done?"

**Through values discussion:**
- "What do you think is wrong with society today?" (reveals which foundations are salient)

### Completeness Criteria

| Completeness | Definition |
|--------------|------------|
| 0% | No moral signals detected |
| 50% | 1-2 foundations clearly prominent |
| 100% | Good sense of their moral foundation profile |

### How This Affects Advice

- Frame advice in morally resonant language
- Avoid triggering moral disgust
- Understand why certain advice may feel "wrong" to them
- Don't assume your moral foundations match theirs

---

# Tier 3: Personality & Disposition

These help frame how advice is delivered. Inferred from communication patterns.

---

## 3.1 Big Five (OCEAN)

### Definition
The Five-Factor Model of personality. Each trait is a spectrum.

### The Five Traits

| Trait | Low End | High End | Affects |
|-------|---------|----------|---------|
| **Openness** | Practical, conventional, prefer routine | Creative, curious, open to new experiences | What suggestions resonate |
| **Conscientiousness** | Flexible, spontaneous, may struggle with follow-through | Organized, disciplined, goal-oriented | How to structure advice |
| **Extraversion** | Reserved, prefer solitude, energized by alone time | Outgoing, energized by social interaction | Activity suggestions, social components |
| **Agreeableness** | Direct, competitive, may prioritize self over harmony | Cooperative, trusting, prioritizes harmony | How to deliver difficult feedback |
| **Neuroticism** | Emotionally stable, calm under pressure | Prone to anxiety, stress, emotional reactivity | How much reassurance needed |

### Detection Signals

| Trait | High Signals | Low Signals |
|-------|--------------|-------------|
| **Openness** | Curious questions, tries new things, abstract thinking, creative | Practical focus, prefers familiar, concrete thinking |
| **Conscientiousness** | Organized speech, follows through, detailed, plans ahead | Spontaneous, flexible, may abandon plans, less structured |
| **Extraversion** | Talks about social events, energized by people, shares readily | Mentions alone time positively, reserved, needs recharge |
| **Agreeableness** | Avoids conflict, concerned with others' feelings, cooperative | Direct, comfortable with conflict, prioritizes self |
| **Neuroticism** | Worries expressed, anxiety language, stress sensitivity | Calm under pressure, stable reactions, resilient |

### Questions to Ask

These are usually **inferred** rather than asked directly:
- Observe how they communicate
- Notice what they gravitate toward
- See how they respond to suggestions

**If needed:**
- "When you have free time, do you prefer being around people or recharging alone?"
- "Are you more of a planner or do you go with the flow?"

### Completeness Criteria

| Completeness | Definition |
|--------------|------------|
| 0% | No signals |
| 50% | 2-3 traits have some signal |
| 100% | Good sense of all five traits based on patterns |

### How This Affects Advice

- **High Openness**: Novel suggestions welcome
- **Low Openness**: Frame new ideas carefully, connect to familiar
- **High Conscientiousness**: Structured action plans work well
- **Low Conscientiousness**: Keep it simple, don't overwhelm
- **High Extraversion**: Social activities, group solutions
- **Low Extraversion**: Solo activities, space for reflection
- **High Agreeableness**: Gentle delivery, collaborative framing
- **Low Agreeableness**: Direct feedback acceptable
- **High Neuroticism**: More reassurance, acknowledge worries
- **Low Neuroticism**: Can be more direct about challenges

---

## 3.2 Risk Tolerance

### Definition
How comfortable the person is with uncertainty, potential loss, and taking chances.

### Spectrum

| Level | Description | Decision Style |
|-------|-------------|----------------|
| **Risk-Seeking** | Energized by uncertainty, comfortable with potential loss | "Let's try it and see" |
| **Risk-Neutral** | Weighs expected value rationally | Analyzes odds, makes calculated bets |
| **Risk-Averse** | Strong preference for certainty, loss-averse | Needs downside protection, "what if it goes wrong?" |

### Detection Signals

| Level | Signals |
|-------|---------|
| **Risk-Seeking** | "What's the worst that could happen?", excitement about uncertainty, history of big moves |
| **Risk-Neutral** | Pros/cons lists, probability thinking, measured evaluation |
| **Risk-Averse** | "But what if...", worst-case focus, avoids uncertainty, needs guarantees |

### Questions to Ask

**Through scenarios:**
- "If you had to choose between a stable, predictable life and an exciting life with more uncertainty, which way would you lean?"

**Through past behavior:**
- "Think about a big decision you made recently - did you play it safe or take a risk?"

### Completeness Criteria

| Completeness | Definition |
|--------------|------------|
| 0% | No signals |
| 50% | General sense of their lean |
| 100% | Clear pattern across multiple examples |

### How This Affects Advice

- **Risk-Seeking**: Can suggest bold moves, don't over-caveat
- **Risk-Neutral**: Provide data, probabilities, expected outcomes
- **Risk-Averse**: Address downside first, provide safety nets, gradual steps

---

## 3.3 Motivation Style (Approach vs Avoidance)

### Definition
Whether the person is primarily motivated by moving toward positive outcomes or away from negative outcomes.

### Styles

| Style | Motivation | Language | Focus |
|-------|------------|----------|-------|
| **Approach** | Pursuing gains, rewards, positive outcomes | "I want to...", "I'm excited about...", "The upside is..." | Opportunities, possibilities |
| **Avoidance** | Avoiding losses, punishment, negative outcomes | "I don't want...", "I'm worried about...", "The risk is..." | Threats, what could go wrong |

### Detection Signals

| Style | Signals |
|-------|---------|
| **Approach** | Goals framed positively, excited by upside, "imagine how great it would be" |
| **Avoidance** | Goals framed as escaping negatives, focused on risks, "I need to stop..." |

### Questions to Ask

**Observe framing:**
- How do they describe their goals?
- Do they talk about what they want or what they want to avoid?

**Direct:**
- "What's driving this decision more - excitement about what could go right, or wanting to avoid what could go wrong?"

### Completeness Criteria

| Completeness | Definition |
|--------------|------------|
| 0% | No signals |
| 100% | Clear pattern in how they frame goals and decisions |

### How This Affects Advice

- **Approach**: Frame suggestions as opportunities. "Imagine how good it'll feel when..."
- **Avoidance**: Frame suggestions as preventing negatives. "This will help you avoid..."

---

# Tier 4: Deeper Patterns (Emergent Over Time)

These require observing patterns across multiple conversations.

---

## 4.1 Attachment Style

### Definition
Patterns of relating to others in close relationships, developed from early experiences.

### Styles

| Style | Self-View | Other-View | Pattern |
|-------|-----------|------------|---------|
| **Secure** | Positive | Positive | Comfortable with intimacy and independence |
| **Anxious** | Negative | Positive | Craves closeness, fears abandonment, needs reassurance |
| **Avoidant** | Positive | Negative | Values independence, uncomfortable with too much closeness |
| **Disorganized** | Negative | Negative | Conflicted, may push-pull, often from trauma |

### Detection Signals

| Style | Signals |
|-------|---------|
| **Secure** | Balanced relationship talk, comfortable with vulnerability, trusts others |
| **Anxious** | Relationship worry, "do they like me?", needs reassurance, fears rejection |
| **Avoidant** | Keeps distance, uncomfortable with emotional demands, values space |
| **Disorganized** | Contradictory relationship patterns, intense then distant, chaotic relationships |

### Questions to Ask

**Indirect (through stories):**
- "How would you describe your closest relationships?"
- "What's hardest for you in relationships?"

### Completeness Criteria

| Completeness | Definition |
|--------------|------------|
| 0% | No relationship patterns observed |
| 50% | Some signals emerging |
| 100% | Clear pattern across multiple relationship discussions |

### How This Affects Advice

- **Secure**: Relationship advice can be straightforward
- **Anxious**: Validate feelings, don't dismiss fears, reassure
- **Avoidant**: Respect need for space, don't push intimacy
- **Disorganized**: Be consistent, recognize complexity, suggest professional support if needed

---

## 4.2 Locus of Control

### Definition
Whether the person believes they control their outcomes (internal) or that external forces do (external).

### Spectrum

| Locus | Belief | Language |
|-------|--------|----------|
| **Internal** | "I control my destiny" | "I made it happen", "I need to change", agency language |
| **External** | "Things happen to me" | "It just happened", "They did this to me", circumstance focus |

### Detection Signals

| Locus | Signals |
|-------|---------|
| **Internal** | Takes responsibility, focuses on what they can do, empowered language |
| **External** | Blames circumstances, feels helpless, focuses on what others did |

### Questions to Ask

**Observe attribution:**
- When they describe outcomes, who/what do they credit or blame?

**Through reflection:**
- "Looking back at how things turned out, what do you think made the difference?"

### Completeness Criteria

| Completeness | Definition |
|--------------|------------|
| 0% | No attribution patterns observed |
| 50% | Some signals |
| 100% | Clear pattern across multiple situations |

### How This Affects Advice

- **Internal**: Empowering advice works well, action-oriented suggestions
- **External**: May need to gently build agency, acknowledge constraints while highlighting choice

---

## 4.3 Temporal Orientation

### Definition
Where the person psychologically "lives" - past, present, or future.

### Orientations

| Orientation | Focus | Pattern |
|-------------|-------|---------|
| **Past-Negative** | Regrets, trauma, what went wrong | Ruminates, stuck in old wounds |
| **Past-Positive** | Nostalgia, traditions, good old days | Grateful for history, may resist change |
| **Present-Hedonistic** | Pleasure now, spontaneity | Lives in the moment, may struggle with planning |
| **Present-Fatalistic** | "Whatever happens, happens" | Passive, low agency, accepts fate |
| **Future-Oriented** | Goals, planning, delayed gratification | Sacrifices now for later, may miss present |

### Detection Signals

| Orientation | Signals |
|-------------|---------|
| **Past-Negative** | Frequent mention of regrets, old hurts, "if only I had..." |
| **Past-Positive** | Fond memories, tradition importance, "back when..." |
| **Present-Hedonistic** | Spontaneous, pleasure-focused, "YOLO" energy |
| **Present-Fatalistic** | "It is what it is", passive acceptance, low effort |
| **Future-Oriented** | Goal-focused, planning, "this will pay off when..." |

### How This Affects Advice

- **Past-Negative**: May need help processing before moving forward
- **Past-Positive**: Honor their history while encouraging growth
- **Present-Hedonistic**: Connect long-term goals to present enjoyment
- **Present-Fatalistic**: Build agency gently
- **Future-Oriented**: Help them appreciate the present too

---

## 4.4 Growth Mindset

### Definition
Whether the person believes abilities are fixed or can be developed (Carol Dweck's framework).

### Mindsets

| Mindset | Belief | Response to Challenge |
|---------|--------|----------------------|
| **Fixed** | Abilities are innate and unchangeable | Avoids challenges, gives up easily, threatened by feedback |
| **Growth** | Abilities can be developed through effort | Embraces challenges, persists, learns from criticism |

### Detection Signals

| Mindset | Signals |
|---------|---------|
| **Fixed** | "I'm just not good at...", avoids difficulty, defensive about feedback |
| **Growth** | "I can learn this", embraces challenge, curious about improvement |

### How This Affects Advice

- **Fixed**: Frame suggestions as playing to strengths, don't overwhelm
- **Growth**: Challenge is welcome, learning-oriented suggestions work well

---

## 4.5 Additional Axes

### Change Readiness (Prochaska)

| Stage | Description | Signals |
|-------|-------------|---------|
| **Precontemplation** | Doesn't see a problem | "I'm fine", defensive |
| **Contemplation** | Aware but ambivalent | "Maybe I should...", pros/cons |
| **Preparation** | Ready to act | "I'm going to...", making plans |
| **Action** | Actively changing | "I've started...", doing the work |
| **Maintenance** | Sustaining change | "I've been...", ongoing effort |

### Stress Response

| Response | Pattern |
|----------|---------|
| **Fight** | Confronts, takes control, may become aggressive |
| **Flight** | Avoids, distracts, escapes |
| **Freeze** | Paralysis, can't decide, shuts down |
| **Fawn** | People-pleasing, over-accommodating |

### Emotional Regulation

| Style | Pattern |
|-------|---------|
| **Suppression** | Pushes feelings down |
| **Expression** | Lets it out |
| **Reappraisal** | Reframes the meaning |
| **Rumination** | Cycles on same thoughts |

### Self-Efficacy

| Level | Belief |
|-------|--------|
| **High** | "I can figure this out" |
| **Low** | "I don't think I can do this" |

---

# Using This Library

## In Extraction Prompts

Include relevant axis definitions when extracting signals:
- "Look for signals related to Maslow's Hierarchy..."
- "Note any values signals according to Schwartz's framework..."

## In Guided Conversation

Use the "Questions to Ask" for each axis when that axis has highest priority.

## In Response Generation

Use "How This Affects Advice" to tailor responses appropriately.

## For Completeness Calculation

Use the "Completeness Criteria" tables to calculate data completeness per axis.

---

## Document History

| Date | Changes |
|------|---------|
| 2025-01-18 | Initial axis reference library created |
