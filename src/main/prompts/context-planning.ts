/**
 * Context Planning Prompt
 *
 * Determines what context to retrieve before generating a response.
 * Called with Haiku for fast, cheap planning.
 */

export interface ContextPlanRequest {
    userQuestion: string;
    profileSummary: string;
}

export interface ContextPlanResult {
    question_type: 'life_direction' | 'activity_suggestion' | 'problem_solving' |
                   'emotional_processing' | 'relationship' | 'decision_support' |
                   'self_understanding' | 'greeting' | 'other';
    timeframe: 'past_focused' | 'present_focused' | 'future_focused';
    categories_to_retrieve: Array<{
        category: string;
        reason: string;
    }>;
    semantic_queries: string[];
    special_considerations: string;
}

export function buildContextPlanningPrompt(request: ContextPlanRequest): string {
    return `You are planning what context to retrieve to answer a user's question in a deeply personalized way.

### User's Question
${request.userQuestion}

### User Profile Summary
${request.profileSummary || 'No profile data available yet.'}

### Available Context Categories

**Always Relevant:**
- core_values (top 5 values with confidence scores)
- maslow_status (current hierarchy level concerns)
- active_challenges (what they're struggling with)

**Situationally Relevant:**
- life_situation (work, relationships, living situation)
- stated_goals (what they say they want)
- moral_foundations (ethical sensitivities)
- personality_big_five (OCEAN traits)
- risk_tolerance (risk-seeking vs risk-averse)
- motivation_style (approach vs avoidance)
- attachment_style (relationship patterns)
- locus_of_control (internal vs external attribution)
- temporal_orientation (past/present/future focus)
- growth_mindset (fixed vs growth)
- emotional_patterns (stress response, regulation style)

### Your Task

1. Classify the question type:
   - life_direction (big picture, meaning, purpose)
   - activity_suggestion (what to do)
   - problem_solving (specific challenge)
   - emotional_processing (need to be heard)
   - relationship (about connections with others)
   - decision_support (help choosing)
   - self_understanding (who am I?)
   - greeting (simple hello, casual chat)
   - other

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

Return ONLY valid JSON with no markdown fences:

{
  "question_type": "...",
  "timeframe": "...",
  "categories_to_retrieve": [
    { "category": "...", "reason": "..." }
  ],
  "semantic_queries": [
    "..."
  ],
  "special_considerations": "..."
}`;
}

// Map category names to database queries/fields
export const CATEGORY_MAPPING: Record<string, string[]> = {
    core_values: ['values'],
    maslow_status: ['maslowSignals'],
    active_challenges: ['challenges'],
    life_situation: ['lifeSituation'],
    stated_goals: ['goals'],
    moral_foundations: ['moralFoundations'],
    personality_big_five: ['bigFive'],
    risk_tolerance: ['riskTolerance'],
    motivation_style: ['motivationStyle'],
    attachment_style: ['attachmentStyle'],
    locus_of_control: ['locusOfControl'],
    temporal_orientation: ['temporalOrientation'],
    growth_mindset: ['growthMindset'],
    emotional_patterns: ['stressResponse', 'emotionalRegulation'],
};
