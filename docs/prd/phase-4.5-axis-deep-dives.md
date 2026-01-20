# Phase 4.5: Axis Deep Dives

## Overview

Implement user-initiated "deep dive" conversations that focus on exploring specific psychological axes. These are optional, valuable self-discovery experiences that feel like guided journaling rather than data collection, while rapidly building completeness for targeted axes.

## Problem Statement

The priority-driven guided onboarding (Phase 4.1) gathers baseline data organically but can only cover so much in brief exchanges. Users who want deeper self-understanding have no way to:
- Accelerate insight-gathering for specific psychological dimensions
- Explore topics like values, patterns, or relationships in depth
- Experience the "stack ranking" forced-choice technique that reveals true priorities
- See their progress as understanding builds during a focused session

Deep dives transform data gathering into genuine self-discovery experiences.

## Goals

- [ ] Provide a menu of available deep dive topics mapped to psychological axes
- [ ] Create focused conversational prompts that feel like valuable self-reflection
- [ ] Include binary/forced-choice questions that reveal true priorities
- [ ] Run extraction on every response to build axis completeness
- [ ] Show real-time progress during deep dives
- [ ] Allow graceful exit with summary of insights discovered
- [ ] Integrate discovered insights with the existing profile

## Non-Goals

- Not replacing the guided onboarding (Phase 4.1) - this is complementary
- Not requiring deep dives for any functionality - these are optional features
- Not building new extraction logic - reusing Phase 2.5 extraction pipeline
- Not creating new psychological frameworks - using existing AXIS_REFERENCE_LIBRARY.md
- Not adding Tier 3-4 axes initially (Big Five, Attachment, etc.) - starting with Tier 1-2
- Not building multi-session deep dives - each is self-contained

---

## User Stories

### US-001: Deep Dive Menu Display
**As a** user
**I want** to see a menu of available deep dive topics
**So that** I can choose which aspect of myself to explore

**Acceptance Criteria:**
- [ ] Given the main chat view, when I click a "Deep Dives" button, then a selection panel appears
- [ ] Given the deep dive panel, when it loads, then I see 4-6 topic cards with titles and descriptions
- [ ] Each card shows a friendly title (e.g., "Discover Your Values") and brief description (1 sentence)
- [ ] Each card shows current completeness for the associated axis as a visual indicator
- [ ] Cards are ordered by potential value (low completeness axes first)

### US-002: Deep Dive Conversation Start
**As a** user
**I want** to start a deep dive with a welcoming introduction
**So that** I understand what we'll explore and feel comfortable

**Acceptance Criteria:**
- [ ] Given I select a deep dive topic, when the conversation starts, then the assistant introduces the deep dive
- [ ] The introduction explains what we'll explore (1-2 sentences)
- [ ] The introduction sets expectations ("This will take 5-10 minutes")
- [ ] The introduction emphasizes there are no wrong answers
- [ ] The first conversational question is asked immediately after the introduction

### US-003: Conversational Question Flow
**As a** user
**I want** the deep dive to feel like a natural conversation
**So that** self-discovery feels organic rather than clinical

**Acceptance Criteria:**
- [ ] Given I respond to a question, when the assistant replies, then it acknowledges my response before asking the next question
- [ ] Questions are drawn from the axis's "Questions to Ask" in AXIS_REFERENCE_LIBRARY.md
- [ ] Questions progress from open-ended to more focused as the conversation develops
- [ ] The assistant can ask follow-up questions based on my specific responses
- [ ] A deep dive includes 5-8 conversational turns (not counting introduction and summary)

### US-004: Forced Choice Questions
**As a** user
**I want** to be asked binary choice questions during deep dives
**So that** my true priorities are revealed through trade-offs

**Acceptance Criteria:**
- [ ] Given a deep dive in progress, when appropriate, then the assistant presents a forced-choice question
- [ ] Forced-choice questions are presented as "Would you rather..." or "If you had to choose..."
- [ ] At least 2-3 forced-choice questions appear per deep dive
- [ ] Choices represent genuine trade-offs relevant to the axis being explored
- [ ] The assistant explores my reasoning after I make a choice ("What made you lean that way?")

### US-005: Real-Time Progress Display
**As a** user
**I want** to see my understanding of this topic growing during the deep dive
**So that** I feel the conversation is productive

**Acceptance Criteria:**
- [ ] Given a deep dive in progress, when I can see the UI, then a progress indicator shows axis completeness
- [ ] The completeness percentage updates after each of my responses (via extraction)
- [ ] Progress is displayed as a subtle bar or ring, not interrupting conversation flow
- [ ] Progress only shows during active deep dives, not regular chat

### US-006: Graceful Exit
**As a** user
**I want** to exit a deep dive at any time without losing progress
**So that** I don't feel trapped in a long conversation

**Acceptance Criteria:**
- [ ] Given a deep dive in progress, when I click an "Exit Deep Dive" button, then a confirmation appears
- [ ] Given I confirm exit, when the deep dive ends, then a summary is generated
- [ ] Exiting early still saves all extracted insights (nothing is lost)
- [ ] After exiting, I return to normal chat mode

### US-007: Deep Dive Completion Summary
**As a** user
**I want** to see a summary of what was discovered when the deep dive ends
**So that** I can reflect on my insights

**Acceptance Criteria:**
- [ ] Given a deep dive completes (naturally or via exit), when it ends, then a summary message appears
- [ ] The summary lists 2-4 key insights discovered during the conversation
- [ ] The summary shows the completeness change (e.g., "Your values profile went from 20% to 65%")
- [ ] The summary thanks the user and invites them to continue chatting or try another deep dive
- [ ] Insights in the summary are specific to what was discussed, not generic

### US-008: Extraction Integration
**As a** system
**I want** to run extraction on every deep dive response
**So that** insights are captured and completeness increases

**Acceptance Criteria:**
- [ ] Given a user responds during a deep dive, when the response is processed, then extraction runs
- [ ] Extraction focuses on the target axis but captures any other signals present
- [ ] Evidence (quotes) are stored linking to the specific deep dive messages
- [ ] Confidence levels are set appropriately based on directness of disclosure
- [ ] Completeness is recalculated after each extraction

---

## Phases

### Phase 1: Deep Dive Data & Configuration

Set up the deep dive content, prompts, and question banks.

#### 1.1 Create Deep Dive Definitions
**File:** `src/main/deep-dives/definitions.ts`

Define the available deep dives with their metadata and axis mappings.

```typescript
import type { AxisName } from '../completeness.js';

export interface DeepDiveDefinition {
    id: string;
    title: string;                    // User-friendly title
    description: string;              // Brief description for card
    targetAxis: AxisName;             // Primary axis this deep dive builds
    secondaryAxes: AxisName[];        // Secondary axes that may be touched
    estimatedMinutes: number;         // Estimated duration
    questionCount: number;            // Target number of conversational turns
    tier: 1 | 2;                      // Which tier (for ordering)
}

export const DEEP_DIVE_DEFINITIONS: DeepDiveDefinition[] = [
    {
        id: 'discover-values',
        title: 'Discover Your Values',
        description: 'Explore what matters most to you through reflection and meaningful trade-offs.',
        targetAxis: 'core_values',
        secondaryAxes: ['moral_foundations'],
        estimatedMinutes: 10,
        questionCount: 7,
        tier: 2,
    },
    {
        id: 'understand-needs',
        title: 'Understand Your Needs',
        description: "Check in on how you're doing with life's fundamental needs.",
        targetAxis: 'maslow_status',
        secondaryAxes: ['life_situation'],
        estimatedMinutes: 8,
        questionCount: 6,
        tier: 1,
    },
    {
        id: 'map-relationships',
        title: 'Map Your Connections',
        description: 'Reflect on the relationships that shape your life.',
        targetAxis: 'life_situation',  // Relationships dimension
        secondaryAxes: ['support_seeking_style'],
        estimatedMinutes: 8,
        questionCount: 6,
        tier: 1,
    },
    {
        id: 'clarify-direction',
        title: 'Clarify Your Direction',
        description: 'Explore your goals, challenges, and what you want next.',
        targetAxis: 'goals',
        secondaryAxes: ['current_challenges', 'immediate_intent'],
        estimatedMinutes: 10,
        questionCount: 7,
        tier: 2,
    },
    {
        id: 'explore-foundations',
        title: 'Explore Your Foundations',
        description: 'Discover the moral principles that guide your judgments.',
        targetAxis: 'moral_foundations',
        secondaryAxes: ['core_values'],
        estimatedMinutes: 8,
        questionCount: 6,
        tier: 2,
    },
    {
        id: 'face-challenges',
        title: 'Face Your Challenges',
        description: 'Name what you are struggling with and gain clarity.',
        targetAxis: 'current_challenges',
        secondaryAxes: ['maslow_status', 'goals'],
        estimatedMinutes: 8,
        questionCount: 6,
        tier: 2,
    },
];

export function getDeepDiveById(id: string): DeepDiveDefinition | undefined {
    return DEEP_DIVE_DEFINITIONS.find(dd => dd.id === id);
}

export function getDeepDivesForAxis(axis: AxisName): DeepDiveDefinition[] {
    return DEEP_DIVE_DEFINITIONS.filter(
        dd => dd.targetAxis === axis || dd.secondaryAxes.includes(axis)
    );
}
```

#### 1.2 Create Deep Dive Question Banks
**File:** `src/main/deep-dives/question-banks.ts`

Define the question sequences for each deep dive, including forced-choice questions.

```typescript
export type QuestionType = 'open' | 'follow_up' | 'forced_choice' | 'reflection';

export interface DeepDiveQuestion {
    type: QuestionType;
    question: string;
    context?: string;             // When to use this question
    followUpProbe?: string;       // Optional follow-up if response is brief
}

export interface ForcedChoiceQuestion {
    type: 'forced_choice';
    setup: string;                // The scenario setup
    optionA: string;
    optionB: string;
    followUp: string;             // Question to ask after they choose
}

export interface DeepDiveQuestionBank {
    deepDiveId: string;
    introduction: string;
    questions: (DeepDiveQuestion | ForcedChoiceQuestion)[];
    closingReflection: string;
}

export const DEEP_DIVE_QUESTION_BANKS: Record<string, DeepDiveQuestionBank> = {
    'discover-values': {
        deepDiveId: 'discover-values',
        introduction: `I'd love to help you explore what matters most to you. Over the next few minutes, we'll reflect on your values through some questions and meaningful trade-offs. There are no right or wrong answers - this is about discovering what's true for you. Ready to begin?`,
        questions: [
            {
                type: 'open',
                question: "What matters most to you in life? What would you never compromise on?",
                followUpProbe: "Can you tell me more about why that's so important to you?",
            },
            {
                type: 'open',
                question: "Think about a decision you made recently that you're proud of. What values were you honoring in that choice?",
            },
            {
                type: 'forced_choice',
                setup: "Imagine you're at a crossroads in life.",
                optionA: "A stable, predictable life with financial security",
                optionB: "An exciting life with more uncertainty but more potential for growth",
                followUp: "What made you lean that way? What does that choice reveal about what you value?",
            },
            {
                type: 'open',
                question: "When you feel most like yourself, what are you usually doing? Who are you with?",
            },
            {
                type: 'forced_choice',
                setup: "If you had to choose:",
                optionA: "Being respected and admired by many people",
                optionB: "Having a few deeply meaningful relationships",
                followUp: "Interesting. What does that tell you about what you're really looking for?",
            },
            {
                type: 'reflection',
                question: "Looking at our conversation so far, what patterns do you notice in what draws you?",
            },
            {
                type: 'forced_choice',
                setup: "One more trade-off to consider:",
                optionA: "Following your own path, even if others disapprove",
                optionB: "Maintaining harmony with family and community expectations",
                followUp: "How do you navigate that tension in your actual life?",
            },
        ],
        closingReflection: "Based on what you've shared, I can see some clear themes emerging. Let me summarize what I've learned about your values.",
    },

    'understand-needs': {
        deepDiveId: 'understand-needs',
        introduction: `Let's check in on how you're really doing right now. We'll explore different areas of life - from basic needs to deeper fulfillment. This is a judgment-free space to be honest about where you are. Shall we start?`,
        questions: [
            {
                type: 'open',
                question: "How are things going with the basics right now - work, health, finances, living situation?",
                followUpProbe: "Is there anything there that's been weighing on you?",
            },
            {
                type: 'open',
                question: "What's been taking up most of your mental energy lately?",
            },
            {
                type: 'open',
                question: "When you think about safety and security in your life - financial, physical, emotional - how do you feel?",
            },
            {
                type: 'forced_choice',
                setup: "If you had to prioritize right now:",
                optionA: "Solving a practical problem that's been nagging at you",
                optionB: "Addressing something emotional that's been building up",
                followUp: "What made that feel more pressing?",
            },
            {
                type: 'open',
                question: "How connected do you feel to the people in your life? Do you feel seen and understood?",
            },
            {
                type: 'reflection',
                question: "If you could change one thing about your current situation, what would it be?",
            },
        ],
        closingReflection: "Thank you for being so open. Here's what I'm hearing about where you are right now.",
    },

    'map-relationships': {
        deepDiveId: 'map-relationships',
        introduction: `Let's explore the relationships in your life - the ones that nourish you, challenge you, and shape who you are. There's no need to share anything you're not comfortable with. Ready?`,
        questions: [
            {
                type: 'open',
                question: "Who are the most important people in your life right now? Tell me about them.",
            },
            {
                type: 'open',
                question: "When you're going through something difficult, who do you reach out to? What do you need from them?",
                followUpProbe: "Do they usually give you what you need?",
            },
            {
                type: 'forced_choice',
                setup: "When you need support, do you tend to want:",
                optionA: "Someone to listen and understand how you feel",
                optionB: "Someone to help you figure out what to do",
                followUp: "Does that change depending on the situation?",
            },
            {
                type: 'open',
                question: "Is there a relationship in your life that feels complicated or unresolved?",
            },
            {
                type: 'forced_choice',
                setup: "In relationships, which matters more to you:",
                optionA: "Having your own space and independence",
                optionB: "Feeling deeply connected and close",
                followUp: "How do you balance those needs?",
            },
            {
                type: 'reflection',
                question: "What would make your relationships feel more fulfilling?",
            },
        ],
        closingReflection: "I appreciate you sharing about the people in your life. Here's what stands out to me.",
    },

    'clarify-direction': {
        deepDiveId: 'clarify-direction',
        introduction: `Let's get clear on where you're heading and what's in your way. We'll explore your goals, what's holding you back, and what 'progress' really means to you. Shall we dive in?`,
        questions: [
            {
                type: 'open',
                question: "Is there something you're working toward right now, or something you wish were different?",
            },
            {
                type: 'open',
                question: "If things went really well over the next year, what would be different about your life?",
            },
            {
                type: 'forced_choice',
                setup: "When it comes to goals, are you more motivated by:",
                optionA: "The excitement of what you could gain",
                optionB: "The desire to avoid a negative outcome",
                followUp: "Can you think of an example of that in your life?",
            },
            {
                type: 'open',
                question: "What's getting in the way of what you want? What's the biggest obstacle?",
            },
            {
                type: 'open',
                question: "Is there something you've given up on that you still think about?",
            },
            {
                type: 'forced_choice',
                setup: "If you had to choose:",
                optionA: "A guaranteed small improvement in your situation",
                optionB: "A chance at a bigger transformation, with risk of failure",
                followUp: "What does that choice say about where you are right now?",
            },
            {
                type: 'reflection',
                question: "What would it mean to make real progress? How would you know you're moving forward?",
            },
        ],
        closingReflection: "Thank you for exploring this with me. Let me reflect back what I've learned about your direction.",
    },

    'explore-foundations': {
        deepDiveId: 'explore-foundations',
        introduction: `Let's explore what guides your sense of right and wrong. These aren't questions with correct answers - they're windows into your moral intuitions. Ready to reflect?`,
        questions: [
            {
                type: 'open',
                question: "What's something you find genuinely unacceptable, even if others might disagree?",
            },
            {
                type: 'open',
                question: "When you judge someone harshly, what have they usually done?",
            },
            {
                type: 'forced_choice',
                setup: "Imagine someone close to you did something wrong. Is it more important to:",
                optionA: "Hold them accountable, even if it damages the relationship",
                optionB: "Protect the relationship, even if it means letting it go",
                followUp: "What factors would change your answer?",
            },
            {
                type: 'open',
                question: "Is there something you feel strongly is 'sacred' or shouldn't be violated, even in principle?",
            },
            {
                type: 'forced_choice',
                setup: "When rules and compassion conflict:",
                optionA: "Rules and fairness should apply equally to everyone",
                optionB: "Compassion should allow for exceptions when someone is suffering",
                followUp: "Can you think of a time you faced that tension?",
            },
            {
                type: 'reflection',
                question: "What do you think is wrong with society today? What matters that people are getting wrong?",
            },
        ],
        closingReflection: "These are the moral intuitions that shape how you see the world. Here's what I've gathered.",
    },

    'face-challenges': {
        deepDiveId: 'face-challenges',
        introduction: `Let's talk about what you're dealing with. Sometimes just naming our challenges clearly can bring relief and clarity. This is a space to be honest without judgment. Ready?`,
        questions: [
            {
                type: 'open',
                question: "What's the biggest thing you're struggling with right now?",
                followUpProbe: "How long has this been going on?",
            },
            {
                type: 'open',
                question: "What have you tried so far? What worked, what didn't?",
            },
            {
                type: 'forced_choice',
                setup: "When facing this challenge, do you feel more:",
                optionA: "Stuck because of circumstances outside your control",
                optionB: "Stuck because of something you're avoiding or afraid of",
                followUp: "What would it take to get unstuck?",
            },
            {
                type: 'open',
                question: "Is there anything about this situation that's hard to admit, even to yourself?",
            },
            {
                type: 'open',
                question: "What would it look like if this challenge was resolved? Paint me a picture.",
            },
            {
                type: 'reflection',
                question: "What's one small step you could take this week? Not to solve everything, just to move forward.",
            },
        ],
        closingReflection: "Thank you for being so honest about what you're facing. Let me summarize what I've heard.",
    },
};

export function getQuestionBank(deepDiveId: string): DeepDiveQuestionBank | undefined {
    return DEEP_DIVE_QUESTION_BANKS[deepDiveId];
}
```

#### 1.3 Create Deep Dive Prompt Templates
**File:** `src/main/prompts/deep-dive.ts`

Define system prompts that guide Claude's behavior during deep dives.

```typescript
import type { DeepDiveDefinition } from '../deep-dives/definitions.js';
import type { DeepDiveQuestionBank, DeepDiveQuestion, ForcedChoiceQuestion } from '../deep-dives/question-banks.js';

export interface DeepDivePromptContext {
    definition: DeepDiveDefinition;
    questionBank: DeepDiveQuestionBank;
    currentQuestionIndex: number;
    previousExchanges: { question: string; response: string }[];
    currentCompleteness: number;
}

export function buildDeepDiveSystemPrompt(context: DeepDivePromptContext): string {
    const { definition, questionBank, currentQuestionIndex, previousExchanges, currentCompleteness } = context;
    const currentQuestion = questionBank.questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex >= questionBank.questions.length - 1;
    const turnNumber = previousExchanges.length + 1;

    return `## DEEP DIVE MODE: ${definition.title}

You are guiding a focused self-discovery conversation about ${definition.title.toLowerCase()}.

### Your Role
- Be a warm, curious guide helping them explore ${definition.targetAxis.replace(/_/g, ' ')}
- Acknowledge what they share before asking the next question
- Make transitions feel natural, not interrogatory
- Never judge or evaluate their answers
- If they give brief answers, use follow-up probes to go deeper

### Current State
- Turn: ${turnNumber} of approximately ${definition.questionCount}
- Progress: ${Math.round(currentCompleteness * 100)}% completeness on ${definition.targetAxis}
${isLastQuestion ? '- This is the final question before the summary' : ''}

### Your Next Question
${formatQuestionForPrompt(currentQuestion)}

### Guidelines
1. First, acknowledge their previous response with genuine interest (2-3 sentences max)
2. If their response was brief, ask a follow-up before moving on
3. Transition naturally to the next question
4. For forced-choice questions: present clearly, then explore their reasoning
5. Keep your responses conversational, not clinical
6. Mirror their energy level - don't be artificially enthusiastic

### What You're Listening For
Based on AXIS_REFERENCE_LIBRARY.md, watch for signals related to:
- ${definition.targetAxis}: Look for direct revelations and behavioral evidence
- ${definition.secondaryAxes.join(', ')}: Note any signals for these too

${isLastQuestion ? `
### Closing
After they respond to this final question, deliver a warm closing:
"${questionBank.closingReflection}"
Then provide a personalized summary of 2-4 key insights you discovered about them.
` : ''}

Remember: This should feel like valuable self-discovery, not data collection.`;
}

function formatQuestionForPrompt(question: DeepDiveQuestion | ForcedChoiceQuestion): string {
    if (question.type === 'forced_choice') {
        const fc = question as ForcedChoiceQuestion;
        return `TYPE: Forced Choice
SETUP: "${fc.setup}"
OPTION A: "${fc.optionA}"
OPTION B: "${fc.optionB}"
FOLLOW-UP: "${fc.followUp}"

Present this as a clear either/or choice. After they choose, ask the follow-up to explore their reasoning.`;
    }

    const q = question as DeepDiveQuestion;
    let prompt = `TYPE: ${q.type}\nQUESTION: "${q.question}"`;
    if (q.followUpProbe) {
        prompt += `\nFOLLOW-UP IF BRIEF: "${q.followUpProbe}"`;
    }
    return prompt;
}

export function buildDeepDiveSummaryPrompt(
    definition: DeepDiveDefinition,
    exchanges: { question: string; response: string }[],
    startCompleteness: number,
    endCompleteness: number
): string {
    return `## Generate Deep Dive Summary

Create a warm, personalized summary for the user who just completed the "${definition.title}" deep dive.

### What They Shared
${exchanges.map((e, i) => `Q${i + 1}: ${e.question}\nA${i + 1}: ${e.response}`).join('\n\n')}

### Progress
- Starting completeness: ${Math.round(startCompleteness * 100)}%
- Ending completeness: ${Math.round(endCompleteness * 100)}%

### Generate a Summary That:
1. Thanks them warmly for sharing
2. Lists 2-4 specific insights discovered (use their own words where possible)
3. Notes the progress made: "Your ${definition.targetAxis.replace(/_/g, ' ')} profile went from ${Math.round(startCompleteness * 100)}% to ${Math.round(endCompleteness * 100)}%"
4. Invites them to continue chatting or try another deep dive

Keep it personal and specific to what they shared. Avoid generic statements.`;
}
```

### Phase 2: Deep Dive State Management

Implement the session state and flow control for deep dives.

#### 2.1 Create Deep Dive Session Manager
**File:** `src/main/deep-dives/session.ts`

Manage the state of active deep dive sessions.

```typescript
import type { AxisName } from '../completeness.js';
import type { DeepDiveDefinition } from './definitions.js';

export interface DeepDiveExchange {
    questionIndex: number;
    question: string;
    response: string;
    timestamp: string;
}

export interface DeepDiveSession {
    id: string;
    conversationId: string;
    deepDiveId: string;
    definition: DeepDiveDefinition;
    status: 'active' | 'completed' | 'exited';
    currentQuestionIndex: number;
    exchanges: DeepDiveExchange[];
    startCompleteness: number;
    currentCompleteness: number;
    startedAt: string;
    completedAt: string | null;
}

// In-memory storage for active sessions
const activeSessions = new Map<string, DeepDiveSession>();

// Start a new deep dive session
export function startDeepDiveSession(
    conversationId: string,
    definition: DeepDiveDefinition,
    initialCompleteness: number
): DeepDiveSession {
    const session: DeepDiveSession = {
        id: `dd_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        conversationId,
        deepDiveId: definition.id,
        definition,
        status: 'active',
        currentQuestionIndex: 0,
        exchanges: [],
        startCompleteness: initialCompleteness,
        currentCompleteness: initialCompleteness,
        startedAt: new Date().toISOString(),
        completedAt: null,
    };

    activeSessions.set(conversationId, session);
    return session;
}

// Get active session for a conversation
export function getActiveSession(conversationId: string): DeepDiveSession | null {
    return activeSessions.get(conversationId) || null;
}

// Record a user response
export function recordExchange(
    conversationId: string,
    question: string,
    response: string
): void {
    const session = activeSessions.get(conversationId);
    if (!session || session.status !== 'active') return;

    session.exchanges.push({
        questionIndex: session.currentQuestionIndex,
        question,
        response,
        timestamp: new Date().toISOString(),
    });
}

// Advance to next question
export function advanceQuestion(conversationId: string): void {
    const session = activeSessions.get(conversationId);
    if (!session || session.status !== 'active') return;

    session.currentQuestionIndex++;
}

// Update completeness during session
export function updateSessionCompleteness(
    conversationId: string,
    newCompleteness: number
): void {
    const session = activeSessions.get(conversationId);
    if (!session) return;

    session.currentCompleteness = newCompleteness;
}

// Check if deep dive is complete
export function isDeepDiveComplete(conversationId: string): boolean {
    const session = activeSessions.get(conversationId);
    if (!session) return false;

    const questionBank = require('./question-banks.js').getQuestionBank(session.deepDiveId);
    if (!questionBank) return false;

    return session.currentQuestionIndex >= questionBank.questions.length;
}

// Complete a deep dive
export function completeDeepDive(conversationId: string): DeepDiveSession | null {
    const session = activeSessions.get(conversationId);
    if (!session) return null;

    session.status = 'completed';
    session.completedAt = new Date().toISOString();

    // Keep session for summary generation, then remove
    return session;
}

// Exit a deep dive early
export function exitDeepDive(conversationId: string): DeepDiveSession | null {
    const session = activeSessions.get(conversationId);
    if (!session) return null;

    session.status = 'exited';
    session.completedAt = new Date().toISOString();

    return session;
}

// Clean up session after summary
export function cleanupSession(conversationId: string): void {
    activeSessions.delete(conversationId);
}

// Get session state for UI
export function getDeepDiveState(conversationId: string): {
    isActive: boolean;
    deepDiveId: string | null;
    title: string | null;
    progress: number;
    questionNumber: number;
    totalQuestions: number;
} {
    const session = activeSessions.get(conversationId);
    if (!session || session.status !== 'active') {
        return {
            isActive: false,
            deepDiveId: null,
            title: null,
            progress: 0,
            questionNumber: 0,
            totalQuestions: 0,
        };
    }

    const questionBank = require('./question-banks.js').getQuestionBank(session.deepDiveId);
    const totalQuestions = questionBank?.questions.length || 0;

    return {
        isActive: true,
        deepDiveId: session.deepDiveId,
        title: session.definition.title,
        progress: session.currentCompleteness,
        questionNumber: session.currentQuestionIndex + 1,
        totalQuestions,
    };
}
```

### Phase 3: IPC Handlers & Integration

Wire up deep dives with the IPC layer and chat flow.

#### 3.1 Add Deep Dive Types
**File:** `src/shared/types.ts`

Add types for deep dive operations.

```typescript
// Add to existing types.ts

export interface DeepDiveInfo {
    id: string;
    title: string;
    description: string;
    targetAxis: string;
    estimatedMinutes: number;
    currentCompleteness: number;
    tier: 1 | 2;
}

export interface DeepDiveState {
    isActive: boolean;
    deepDiveId: string | null;
    title: string | null;
    progress: number;
    questionNumber: number;
    totalQuestions: number;
}

export interface DeepDiveSummary {
    title: string;
    insights: string[];
    startCompleteness: number;
    endCompleteness: number;
    completionMessage: string;
}
```

#### 3.2 Add Deep Dive IPC Handlers
**File:** `src/main/ipc.ts`

Add handlers for deep dive operations.

```typescript
// Add to existing ipc.ts

import { DEEP_DIVE_DEFINITIONS, getDeepDiveById } from './deep-dives/definitions.js';
import { getQuestionBank } from './deep-dives/question-banks.js';
import {
    startDeepDiveSession,
    getActiveSession,
    getDeepDiveState,
    exitDeepDive,
    cleanupSession,
} from './deep-dives/session.js';
import { getAxisCompleteness } from './completeness.js';

// Get available deep dives with completeness
ipcMain.handle('deep-dive:list', async (): Promise<DeepDiveInfo[]> => {
    return DEEP_DIVE_DEFINITIONS.map(dd => ({
        id: dd.id,
        title: dd.title,
        description: dd.description,
        targetAxis: dd.targetAxis,
        estimatedMinutes: dd.estimatedMinutes,
        currentCompleteness: getAxisCompleteness(dd.targetAxis).completeness,
        tier: dd.tier,
    })).sort((a, b) => {
        // Sort by tier, then by completeness (lowest first)
        if (a.tier !== b.tier) return a.tier - b.tier;
        return a.currentCompleteness - b.currentCompleteness;
    });
});

// Start a deep dive
ipcMain.handle('deep-dive:start', async (_event, conversationId: string, deepDiveId: string): Promise<{
    success: boolean;
    introduction?: string;
    error?: string;
}> => {
    const definition = getDeepDiveById(deepDiveId);
    if (!definition) {
        return { success: false, error: 'Deep dive not found' };
    }

    const questionBank = getQuestionBank(deepDiveId);
    if (!questionBank) {
        return { success: false, error: 'Question bank not found' };
    }

    const initialCompleteness = getAxisCompleteness(definition.targetAxis).completeness;
    startDeepDiveSession(conversationId, definition, initialCompleteness);

    return {
        success: true,
        introduction: questionBank.introduction,
    };
});

// Get current deep dive state
ipcMain.handle('deep-dive:state', async (_event, conversationId: string): Promise<DeepDiveState> => {
    return getDeepDiveState(conversationId);
});

// Exit a deep dive early
ipcMain.handle('deep-dive:exit', async (_event, conversationId: string): Promise<DeepDiveSummary | null> => {
    const session = exitDeepDive(conversationId);
    if (!session) return null;

    // Generate summary even for early exit
    const summary = await generateDeepDiveSummary(session);
    cleanupSession(conversationId);

    return summary;
});
```

#### 3.3 Integrate with Chat Flow
**File:** `src/main/ipc.ts`

Modify chat:stream handler to support deep dive mode.

```typescript
// Modify the chat:stream handler to check for active deep dive

ipcMain.on('chat:stream', async (event, { conversationId, message }) => {
    try {
        const deepDiveSession = getActiveSession(conversationId);

        if (deepDiveSession && deepDiveSession.status === 'active') {
            // Handle deep dive mode
            await handleDeepDiveMessage(event, conversationId, message, deepDiveSession);
        } else {
            // Normal chat flow (existing code)
            await handleNormalChat(event, conversationId, message);
        }
    } catch (error) {
        event.reply('chat:error', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
});

async function handleDeepDiveMessage(
    event: Electron.IpcMainEvent,
    conversationId: string,
    userMessage: string,
    session: DeepDiveSession
): Promise<void> {
    const questionBank = getQuestionBank(session.deepDiveId);
    if (!questionBank) {
        event.reply('chat:error', { error: 'Question bank not found' });
        return;
    }

    // Record the user's response
    const currentQuestion = questionBank.questions[session.currentQuestionIndex];
    recordExchange(conversationId, formatQuestionText(currentQuestion), userMessage);

    // Run extraction on the response
    const extraction = await runExtraction(userMessage, session.definition.targetAxis);

    // Update completeness
    const newCompleteness = getAxisCompleteness(session.definition.targetAxis).completeness;
    updateSessionCompleteness(conversationId, newCompleteness);

    // Check if deep dive is complete
    if (isDeepDiveComplete(conversationId)) {
        // Generate and stream closing response with summary
        const completedSession = completeDeepDive(conversationId);
        await streamDeepDiveSummary(event, completedSession!);
        cleanupSession(conversationId);
        event.reply('deep-dive:completed', { conversationId });
    } else {
        // Advance to next question
        advanceQuestion(conversationId);

        // Build prompt for Claude with deep dive context
        const promptContext = buildDeepDivePromptContext(session, questionBank, newCompleteness);
        const systemPrompt = buildDeepDiveSystemPrompt(promptContext);

        // Stream response (existing streaming logic)
        await streamClaudeResponse(event, systemPrompt, userMessage);

        // Send updated state
        event.reply('deep-dive:state-update', getDeepDiveState(conversationId));
    }
}
```

#### 3.4 Update Preload Script
**File:** `src/preload/index.ts`

Expose deep dive APIs to renderer.

```typescript
// Add to contextBridge.exposeInMainWorld

deepDive: {
    list: (): Promise<DeepDiveInfo[]> =>
        ipcRenderer.invoke('deep-dive:list'),

    start: (conversationId: string, deepDiveId: string): Promise<{ success: boolean; introduction?: string; error?: string }> =>
        ipcRenderer.invoke('deep-dive:start', conversationId, deepDiveId),

    getState: (conversationId: string): Promise<DeepDiveState> =>
        ipcRenderer.invoke('deep-dive:state', conversationId),

    exit: (conversationId: string): Promise<DeepDiveSummary | null> =>
        ipcRenderer.invoke('deep-dive:exit', conversationId),

    onStateUpdate: (callback: (state: DeepDiveState) => void) => {
        ipcRenderer.on('deep-dive:state-update', (_event, state) => callback(state));
    },

    onCompleted: (callback: (data: { conversationId: string }) => void) => {
        ipcRenderer.on('deep-dive:completed', (_event, data) => callback(data));
    },

    removeAllListeners: () => {
        ipcRenderer.removeAllListeners('deep-dive:state-update');
        ipcRenderer.removeAllListeners('deep-dive:completed');
    },
},
```

### Phase 4: UI Components

Build the deep dive selection and progress UI.

#### 4.1 Create Deep Dive Selection Panel
**File:** `src/renderer/components/DeepDivePanel.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import type { DeepDiveInfo } from '../../shared/types';

interface DeepDivePanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (deepDiveId: string) => void;
}

export function DeepDivePanel({ isOpen, onClose, onSelect }: DeepDivePanelProps) {
    const [deepDives, setDeepDives] = useState<DeepDiveInfo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            window.api.deepDive.list().then(list => {
                setDeepDives(list);
                setLoading(false);
            });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="deep-dive-panel">
            <div className="deep-dive-header">
                <h2>Deep Dives</h2>
                <p>Focused conversations to explore specific aspects of yourself</p>
                <button onClick={onClose} className="close-button">Close</button>
            </div>

            {loading ? (
                <div className="loading">Loading...</div>
            ) : (
                <div className="deep-dive-grid">
                    {deepDives.map(dd => (
                        <DeepDiveCard
                            key={dd.id}
                            deepDive={dd}
                            onSelect={() => onSelect(dd.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface DeepDiveCardProps {
    deepDive: DeepDiveInfo;
    onSelect: () => void;
}

function DeepDiveCard({ deepDive, onSelect }: DeepDiveCardProps) {
    const completenessPercent = Math.round(deepDive.currentCompleteness * 100);

    return (
        <div className="deep-dive-card" onClick={onSelect}>
            <h3>{deepDive.title}</h3>
            <p>{deepDive.description}</p>
            <div className="card-footer">
                <span className="duration">{deepDive.estimatedMinutes} min</span>
                <div className="completeness-indicator">
                    <div
                        className="completeness-bar"
                        style={{ width: `${completenessPercent}%` }}
                    />
                    <span className="completeness-text">{completenessPercent}%</span>
                </div>
            </div>
        </div>
    );
}
```

#### 4.2 Create Deep Dive Progress Indicator
**File:** `src/renderer/components/DeepDiveProgress.tsx`

```typescript
import React from 'react';
import type { DeepDiveState } from '../../shared/types';

interface DeepDiveProgressProps {
    state: DeepDiveState;
    onExit: () => void;
}

export function DeepDiveProgress({ state, onExit }: DeepDiveProgressProps) {
    if (!state.isActive) return null;

    const progressPercent = Math.round(state.progress * 100);

    return (
        <div className="deep-dive-progress">
            <div className="progress-header">
                <span className="title">{state.title}</span>
                <span className="question-count">
                    Question {state.questionNumber} of {state.totalQuestions}
                </span>
            </div>
            <div className="progress-bar-container">
                <div
                    className="progress-bar"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>
            <div className="progress-footer">
                <span className="completeness">{progressPercent}% complete</span>
                <button onClick={onExit} className="exit-button">
                    Exit Deep Dive
                </button>
            </div>
        </div>
    );
}
```

#### 4.3 Integrate with App.tsx
**File:** `src/renderer/App.tsx`

```typescript
// Add deep dive state and handlers to App.tsx

const [showDeepDivePanel, setShowDeepDivePanel] = useState(false);
const [deepDiveState, setDeepDiveState] = useState<DeepDiveState>({
    isActive: false,
    deepDiveId: null,
    title: null,
    progress: 0,
    questionNumber: 0,
    totalQuestions: 0,
});

// Set up deep dive listeners
useEffect(() => {
    window.api.deepDive.onStateUpdate((state) => {
        setDeepDiveState(state);
    });

    window.api.deepDive.onCompleted(({ conversationId }) => {
        setDeepDiveState({
            isActive: false,
            deepDiveId: null,
            title: null,
            progress: 0,
            questionNumber: 0,
            totalQuestions: 0,
        });
    });

    return () => {
        window.api.deepDive.removeAllListeners();
    };
}, []);

const handleStartDeepDive = async (deepDiveId: string) => {
    const result = await window.api.deepDive.start(conversationId, deepDiveId);
    if (result.success && result.introduction) {
        setShowDeepDivePanel(false);
        // Add introduction as assistant message
        setMessages(prev => [...prev, {
            role: 'assistant',
            content: result.introduction!,
        }]);
        // Update state
        const state = await window.api.deepDive.getState(conversationId);
        setDeepDiveState(state);
    }
};

const handleExitDeepDive = async () => {
    const summary = await window.api.deepDive.exit(conversationId);
    if (summary) {
        // Add summary as final message
        setMessages(prev => [...prev, {
            role: 'assistant',
            content: summary.completionMessage,
        }]);
    }
    setDeepDiveState({
        isActive: false,
        deepDiveId: null,
        title: null,
        progress: 0,
        questionNumber: 0,
        totalQuestions: 0,
    });
};

// In render:
{deepDiveState.isActive && (
    <DeepDiveProgress
        state={deepDiveState}
        onExit={handleExitDeepDive}
    />
)}

<button
    onClick={() => setShowDeepDivePanel(true)}
    disabled={deepDiveState.isActive}
>
    Deep Dives
</button>

<DeepDivePanel
    isOpen={showDeepDivePanel}
    onClose={() => setShowDeepDivePanel(false)}
    onSelect={handleStartDeepDive}
/>
```

### Phase 5: Testing

Comprehensive tests for deep dive functionality.

#### 5.1 Deep Dive Definition Tests
**File:** `tests/deep-dive-definitions.spec.ts`

Test that all deep dives are properly configured.

#### 5.2 Deep Dive Session Tests
**File:** `tests/deep-dive-session.spec.ts`

Test session management and state transitions.

#### 5.3 Deep Dive Flow Integration Tests
**File:** `tests/deep-dive-flow.spec.ts`

End-to-end tests for complete deep dive flows.

---

## Technical Specifications

### Data Models

```typescript
// Core deep dive types (see Phase 1 for full definitions)

interface DeepDiveDefinition {
    id: string;
    title: string;
    description: string;
    targetAxis: AxisName;
    secondaryAxes: AxisName[];
    estimatedMinutes: number;
    questionCount: number;
    tier: 1 | 2;
}

interface DeepDiveSession {
    id: string;
    conversationId: string;
    deepDiveId: string;
    definition: DeepDiveDefinition;
    status: 'active' | 'completed' | 'exited';
    currentQuestionIndex: number;
    exchanges: DeepDiveExchange[];
    startCompleteness: number;
    currentCompleteness: number;
    startedAt: string;
    completedAt: string | null;
}
```

### State Management

Deep dive state is:
- **Session-scoped**: Active sessions stored in memory per conversation
- **Not persisted**: Sessions don't survive app restart (user can start again)
- **Conversation-bound**: One active deep dive per conversation at a time

### IPC Channels

| Channel | Direction | Pattern | Purpose |
|---------|-----------|---------|---------|
| `deep-dive:list` | R→M | invoke/handle | Get available deep dives |
| `deep-dive:start` | R→M | invoke/handle | Start a deep dive |
| `deep-dive:state` | R→M | invoke/handle | Get current state |
| `deep-dive:exit` | R→M | invoke/handle | Exit early |
| `deep-dive:state-update` | M→R | reply | Push state updates |
| `deep-dive:completed` | M→R | reply | Notify completion |

---

## Files Summary

### Files to Create
| File | Purpose |
|------|---------|
| `src/main/deep-dives/definitions.ts` | Deep dive definitions and metadata |
| `src/main/deep-dives/question-banks.ts` | Questions and forced-choice prompts |
| `src/main/deep-dives/session.ts` | Session state management |
| `src/main/prompts/deep-dive.ts` | System prompts for deep dive mode |
| `src/renderer/components/DeepDivePanel.tsx` | Selection panel UI |
| `src/renderer/components/DeepDiveProgress.tsx` | Progress indicator UI |
| `tests/deep-dive-definitions.spec.ts` | Definition tests |
| `tests/deep-dive-session.spec.ts` | Session management tests |
| `tests/deep-dive-flow.spec.ts` | Integration tests |

### Files to Modify
| File | Changes |
|------|---------|
| `src/main/ipc.ts` | Add deep dive handlers, integrate with chat flow |
| `src/preload/index.ts` | Expose deep dive APIs |
| `src/renderer/App.tsx` | Add deep dive state and UI integration |
| `src/shared/types.ts` | Add deep dive types |

---

## Quality Gates

- `make typecheck` - Type checking passes
- `make lint` - No linting errors
- `make test` - All tests pass (including new deep dive tests)
- `make build` - Build succeeds

### Post-Verification: Code Simplification

After all quality gates pass, run the code simplifier and re-verify:

1. Run `/code-simplifier:code-simplifier` on modified files
2. Re-run all quality gates above
3. Repeat until no further simplifications are made

---

## Verification Checklist

1. [ ] Deep dive panel shows when "Deep Dives" button clicked
2. [ ] Panel displays 6 deep dive cards with titles, descriptions, and completeness
3. [ ] Cards are sorted by tier then by lowest completeness
4. [ ] Selecting a card starts the deep dive with introduction message
5. [ ] Progress indicator appears showing title, question number, and completeness
6. [ ] Each user response triggers extraction and updates completeness
7. [ ] Forced-choice questions present two options clearly
8. [ ] After choosing, assistant asks follow-up about reasoning
9. [ ] Deep dive completes after all questions with summary message
10. [ ] Summary includes 2-4 specific insights from the conversation
11. [ ] Summary shows completeness change (e.g., "went from 20% to 65%")
12. [ ] "Exit Deep Dive" button generates summary and returns to normal chat
13. [ ] Exiting early preserves all extracted insights
14. [ ] Edge case: User with 100% completeness still gets insights (refinement)
15. [ ] Edge case: User gives one-word answers gets follow-up probes

---

## Implementation Order

1. Create `src/main/deep-dives/definitions.ts` with deep dive metadata
2. Create `src/main/deep-dives/question-banks.ts` with all question content
3. Create `src/main/prompts/deep-dive.ts` with prompt templates
4. Create `src/main/deep-dives/session.ts` with session management
5. Add types to `src/shared/types.ts`
6. Add IPC handlers to `src/main/ipc.ts`
7. Update `src/preload/index.ts` to expose APIs
8. Create `src/renderer/components/DeepDivePanel.tsx`
9. Create `src/renderer/components/DeepDiveProgress.tsx`
10. Integrate with `src/renderer/App.tsx`
11. Add definition tests
12. Add session tests
13. Add integration tests
14. Run `make check` and fix any issues
15. Run code simplifier and re-verify

---

## Open Questions

- [ ] Should deep dive history be persisted so users can see past sessions?
  - **Current decision**: No - sessions are ephemeral, but extracted insights persist
- [ ] Should we limit how often the same deep dive can be repeated?
  - **Current decision**: No limit - value increases over time as life changes
- [ ] Should deep dives have adaptive question selection based on responses?
  - **Current decision**: Phase 1 uses fixed sequences; adaptive can come later

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Deep dives feel like interrogation | High | Natural transitions, acknowledgments, follow-up probes |
| Forced choices feel artificial | Medium | Provide "it depends" follow-up, explore nuance after choice |
| Users abandon mid-dive | Low | Allow exit anytime, preserve all progress, generate summary |
| Questions get repetitive | Medium | Varied phrasing, don't repeat axis targeting too soon |
| Completeness doesn't increase | Low | Forced choices guarantee signal; extraction runs every turn |
