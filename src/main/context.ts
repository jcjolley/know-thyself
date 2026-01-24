import { getDb } from './db/sqlite.js';
import { llmManager } from './llm/manager.js';
import { searchSimilarMessages } from './db/lancedb.js';
import { embed, isEmbeddingsReady } from './embeddings.js';
import {
    getActiveGoals,
    getSupportSeekingStyle,
    getCurrentIntent,
    getCompleteProfile,
    type CompleteProfile,
} from './db/profile.js';
import {
    buildContextPlanningPrompt,
    type ContextPlanResult,
} from './prompts/context-planning.js';
import { isMockEnabled, getMockContextPlan } from './claude-mock.js';
import type { Message, Value, Challenge, MaslowSignal, Goal } from '../shared/types.js';
import { processUserMessageForGuidedMode, getGuidedModeState } from './guided-onboarding.js';
import { getRandomQuestionForAxis } from './question-bank.js';
import type { AxisName } from './completeness.js';
import { getJourney, type JourneyInfo } from './journeys.js';
import { getConversationById } from './db/conversations.js';
import { getCurrentUser } from '../server/session.js';

// Minimum confidence to include a signal in context
const MIN_CONFIDENCE = 0.5;

export interface AssembledContext {
    profileSummary: string;
    relevantMessages: string;
    recentHistory: string;
    tokenEstimate: number;
    // Structured data for response prompt
    supportStyle: string | null;
    currentIntent: string | null;
    questionType: string | null;
    // Guided mode information
    guidedMode: {
        isActive: boolean;
        suggestedQuestion: string | null;
        targetAxis: string | null;
        turnCount: number;
    };
    // Journey information (if this is a journey conversation)
    journey: JourneyInfo | null;
}

/**
 * Call Haiku to determine what context is relevant for this question.
 */
async function planContext(
    userQuestion: string,
    briefProfile: string
): Promise<ContextPlanResult | null> {
    try {
        let jsonStr: string;

        if (isMockEnabled()) {
            console.log('[context] Using mock context plan');
            jsonStr = getMockContextPlan();
        } else {
            const provider = llmManager.getProvider();
            console.log('[context] Planning context with', provider.name, '...');
            const prompt = buildContextPlanningPrompt({
                userQuestion,
                profileSummary: briefProfile,
            });

            const rawResponse = await provider.generateText(
                [{ role: 'user', content: prompt }],
                undefined,
                { maxTokens: 8192 }
            );

            // Strip markdown fences if present
            jsonStr = rawResponse
                .replace(/^```json\s*/i, '')
                .replace(/^```\s*/i, '')
                .replace(/\s*```$/i, '')
                .trim();

            // Try to extract JSON object if response has extra content
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
            }
        }

        // Validate we have something to parse
        if (!jsonStr || jsonStr.length < 10) {
            console.error('[context] Empty or too short response from LLM:', jsonStr);
            return null;
        }

        const plan = JSON.parse(jsonStr) as ContextPlanResult;
        console.log('[context] Plan:', plan.question_type, '- categories:', plan.categories_to_retrieve.map(c => c.category).join(', '));
        return plan;
    } catch (err) {
        console.error('[context] Context planning failed, using full context:', err);
        return null;
    }
}

/**
 * Get a brief profile summary for planning (before we know what to retrieve)
 */
function getBriefProfileForPlanning(): string {
    const db = getDb();
    const parts: string[] = [];

    // Just get top values and recent challenges for planning
    const values = db.prepare(`
        SELECT name FROM user_values ORDER BY confidence DESC LIMIT 3
    `).all() as { name: string }[];

    const challenges = db.prepare(`
        SELECT description FROM challenges WHERE status = 'active' LIMIT 2
    `).all() as { description: string }[];

    if (values.length > 0) {
        parts.push(`Values: ${values.map(v => v.name).join(', ')}`);
    }
    if (challenges.length > 0) {
        parts.push(`Challenges: ${challenges.map(c => c.description.slice(0, 50)).join('; ')}`);
    }

    return parts.join('\n') || 'New user, minimal profile data.';
}

export async function assembleContext(
    currentMessage: string,
    recentMessages: Message[],
    conversationId: string
): Promise<AssembledContext> {
    const db = getDb();

    // Step 0a: Check if this is a journey conversation
    const conversation = getConversationById(conversationId);
    let journey: JourneyInfo | null = null;
    if (conversation?.journey_id) {
        journey = getJourney(conversation.journey_id);
        if (journey) {
            console.log(`[context] Journey conversation detected: ${journey.id}`);
        }
    }

    // Step 0b: Process guided mode (skip for journey conversations)
    let guidedModeResult: { isGuidedMode: boolean; suggestedAxis: string | null } = { isGuidedMode: false, suggestedAxis: null };
    let guidedModeTurnCount = 0;
    let suggestedQuestion: string | null = null;

    if (!journey) {
        // Only use guided onboarding for non-journey conversations
        guidedModeResult = processUserMessageForGuidedMode(conversationId, currentMessage);
        const guidedModeState = getGuidedModeState(conversationId);
        guidedModeTurnCount = guidedModeState.turnCount;

        // Get suggested question if in guided mode
        if (guidedModeResult.isGuidedMode && guidedModeResult.suggestedAxis) {
            const question = getRandomQuestionForAxis(guidedModeResult.suggestedAxis as AxisName);
            suggestedQuestion = question?.question ?? null;
        }
    }

    // Step 1: Get brief profile for planning
    const briefProfile = getBriefProfileForPlanning();

    // Step 2: Call Haiku to plan what context to retrieve
    const plan = await planContext(currentMessage, briefProfile);

    // Determine which categories to retrieve
    const categoriesToRetrieve = new Set<string>();
    if (plan) {
        for (const cat of plan.categories_to_retrieve) {
            categoriesToRetrieve.add(cat.category);
        }
    }

    // If planning failed or returned nothing, use all categories
    const useFullContext = !plan || categoriesToRetrieve.size === 0;

    // Step 3: Retrieve data based on plan (or full context as fallback)
    const values = db.prepare(`
        SELECT * FROM user_values ORDER BY confidence DESC LIMIT 5
    `).all() as Value[];

    const challenges = db.prepare(`
        SELECT * FROM challenges WHERE status = 'active' ORDER BY mention_count DESC LIMIT 3
    `).all() as Challenge[];

    const maslowSignals = db.prepare(`
        SELECT * FROM maslow_signals ORDER BY created_at DESC LIMIT 5
    `).all() as MaslowSignal[];

    const goals = getActiveGoals(3);
    const supportStyle = getSupportSeekingStyle();
    const currentIntent = getCurrentIntent(conversationId);
    const completeProfile = getCompleteProfile();

    // Step 4: Build profile summary with only relevant categories
    const profileSummary = buildFilteredProfileSummary(
        values,
        challenges,
        maslowSignals,
        goals,
        completeProfile,
        useFullContext ? null : categoriesToRetrieve
    );

    // Step 5: Semantic search using plan's queries or the message itself
    let relevantMessages = '';
    const userId = getCurrentUser();
    if (isEmbeddingsReady()) {
        try {
            // Use semantic queries from plan if available
            const searchQueries = plan?.semantic_queries?.length
                ? plan.semantic_queries
                : [currentMessage];

            const allResults: { content: string; role: string }[] = [];
            for (const query of searchQueries.slice(0, 3)) {
                const queryVector = await embed(query, 'query');
                // Filter by current user to ensure data isolation
                const results = await searchSimilarMessages(queryVector, 2, userId || undefined);
                allResults.push(...results);
            }

            // Deduplicate by content
            const seen = new Set<string>();
            const uniqueResults = allResults.filter(r => {
                if (seen.has(r.content)) return false;
                seen.add(r.content);
                return true;
            }).slice(0, 5);

            relevantMessages = formatRelevantMessages(uniqueResults);
        } catch (err) {
            console.error('Failed to search similar messages:', err);
        }
    }

    // Format recent history
    const recentHistory = formatRecentHistory(recentMessages.slice(-10));

    // Estimate tokens (rough: 4 chars = 1 token)
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
        questionType: plan?.question_type || null,
        guidedMode: {
            isActive: guidedModeResult.isGuidedMode,
            suggestedQuestion,
            targetAxis: guidedModeResult.suggestedAxis,
            turnCount: guidedModeTurnCount,
        },
        journey,
    };
}

function isConfident(signal: { confidence: number } | null): signal is { confidence: number; value: string } {
    return signal !== null && signal.confidence >= MIN_CONFIDENCE;
}

/**
 * Check if a category should be included based on the plan.
 * If categories is null, include everything (full context mode).
 */
function shouldInclude(category: string, categories: Set<string> | null): boolean {
    if (categories === null) return true;
    return categories.has(category);
}

function buildFilteredProfileSummary(
    values: Value[],
    challenges: Challenge[],
    maslowSignals: MaslowSignal[],
    goals: Goal[],
    profile: CompleteProfile,
    categories: Set<string> | null
): string {
    const parts: string[] = [];

    // Life Context (factual - no confidence threshold, these are stated facts)
    if (shouldInclude('life_situation', categories)) {
        const ls = profile.lifeSituation;
        if (Object.keys(ls).length > 0) {
            parts.push('## Life Context');
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
    }

    // Maslow Concerns
    if (shouldInclude('maslow_status', categories)) {
        const concerns = maslowSignals.filter(s => s.signal_type === 'concern');
        if (concerns.length > 0) {
            parts.push('\n## Areas of Concern');
            for (const s of concerns) {
                parts.push(`- ${s.level}: ${s.description}`);
            }
        }
    }

    // Values
    if (shouldInclude('core_values', categories)) {
        if (values.length > 0) {
            parts.push('\n## What Matters to This Person');
            for (const v of values) {
                parts.push(`- ${v.name}: ${v.description}`);
            }
        }
    }

    // Goals
    if (shouldInclude('stated_goals', categories)) {
        if (goals.length > 0) {
            parts.push('\n## Active Goals');
            for (const g of goals) {
                const status = g.status === 'in_progress' ? ' (working on)' : '';
                parts.push(`- ${g.description}${status}`);
            }
        }
    }

    // Challenges
    if (shouldInclude('active_challenges', categories)) {
        if (challenges.length > 0) {
            parts.push('\n## Current Challenges');
            for (const c of challenges) {
                parts.push(`- ${c.description}`);
            }
        }
    }

    // Moral Foundations
    if (shouldInclude('moral_foundations', categories)) {
        const confidentMoral = profile.moralFoundations.filter(m => m.confidence >= MIN_CONFIDENCE);
        if (confidentMoral.length > 0) {
            parts.push('\n## Moral Sensitivities');
            for (const m of confidentMoral) {
                parts.push(`- Strong ${m.foundation} foundation`);
            }
        }
    }

    // Personality & Disposition
    const personalityParts: string[] = [];

    // Big Five traits
    if (shouldInclude('personality_big_five', categories)) {
        for (const t of profile.bigFive.filter(t => t.confidence >= MIN_CONFIDENCE)) {
            personalityParts.push(`- ${t.trait}: ${t.level}`);
        }
    }

    // Single-value personality signals with labels and their category mapping
    const personalitySignals: [typeof profile.riskTolerance, string, string][] = [
        [profile.riskTolerance, 'Risk tolerance', 'risk_tolerance'],
        [profile.motivationStyle, 'Motivation', 'motivation_style'],
        [profile.attachmentStyle, 'Attachment', 'attachment_style'],
        [profile.locusOfControl, 'Locus of control', 'locus_of_control'],
        [profile.temporalOrientation, 'Temporal focus', 'temporal_orientation'],
        [profile.growthMindset, 'Mindset', 'growth_mindset'],
        [profile.selfEfficacy, 'Self-efficacy', 'emotional_patterns'],
    ];

    for (const [signal, label, category] of personalitySignals) {
        if (shouldInclude(category, categories) && isConfident(signal)) {
            const suffix = label === 'Motivation' ? '-oriented' : '';
            personalityParts.push(`- ${label}: ${signal.value}${suffix}`);
        }
    }

    // Stress response and emotional regulation (emotional_patterns category)
    if (shouldInclude('emotional_patterns', categories)) {
        if (isConfident(profile.stressResponse)) {
            personalityParts.push(`- Stress response: ${profile.stressResponse.value}`);
        }
        if (isConfident(profile.emotionalRegulation)) {
            personalityParts.push(`- Emotional regulation: ${profile.emotionalRegulation.value}`);
        }
    }

    if (personalityParts.length > 0) {
        parts.push('\n## Personality & Patterns');
        parts.push(...personalityParts);
    }

    return parts.join('\n');
}

function formatRelevantMessages(messages: { content: string; role: string }[]): string {
    if (messages.length === 0) return '';

    const parts = ['## Relevant Past Context'];
    for (const m of messages) {
        const speaker = m.role === 'user' ? 'They said' : 'You said';
        parts.push(`${speaker}: "${m.content.slice(0, 200)}${m.content.length > 200 ? '...' : ''}"`);
    }
    return parts.join('\n');
}

function formatRecentHistory(messages: Message[]): string {
    if (messages.length === 0) return '(No prior messages in this conversation)';

    const parts = ['## CONVERSATION HISTORY (for context only - do NOT respond to these)'];
    for (const m of messages) {
        const speaker = m.role === 'user' ? '[PAST] User' : '[PAST] Assistant';
        parts.push(`${speaker}: ${m.content}`);
    }
    parts.push('\n(End of conversation history)');
    return parts.join('\n');
}
