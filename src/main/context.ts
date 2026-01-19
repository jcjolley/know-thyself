import { getDb } from './db/sqlite.js';
import { searchSimilarMessages } from './db/lancedb.js';
import { embed, isEmbeddingsReady } from './embeddings.js';
import {
    getActiveGoals,
    getSupportSeekingStyle,
    getCurrentIntent,
    getCompleteProfile,
    type CompleteProfile,
} from './db/profile.js';
import type { Message, Value, Challenge, MaslowSignal, Goal } from '../shared/types.js';

// Minimum confidence to include a signal in context
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

    // Get profile data
    const values = db.prepare(`
        SELECT * FROM user_values ORDER BY confidence DESC LIMIT 5
    `).all() as Value[];

    const challenges = db.prepare(`
        SELECT * FROM challenges WHERE status = 'active' ORDER BY mention_count DESC LIMIT 3
    `).all() as Challenge[];

    const maslowSignals = db.prepare(`
        SELECT * FROM maslow_signals ORDER BY created_at DESC LIMIT 5
    `).all() as MaslowSignal[];

    // NEW: Extended profile data
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

    // Semantic search for relevant past messages (only if embeddings are ready)
    let relevantMessages = '';
    if (isEmbeddingsReady()) {
        try {
            const queryVector = await embed(currentMessage, 'query');
            const similarMessages = await searchSimilarMessages(queryVector, 3);
            relevantMessages = formatRelevantMessages(similarMessages);
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
    };
}

function isConfident(signal: { confidence: number } | null): signal is { confidence: number; value: string } {
    return signal !== null && signal.confidence >= MIN_CONFIDENCE;
}

function buildCompleteProfileSummary(
    values: Value[],
    challenges: Challenge[],
    maslowSignals: MaslowSignal[],
    goals: Goal[],
    profile: CompleteProfile
): string {
    const parts: string[] = [];

    // Life Context (factual - no confidence threshold, these are stated facts)
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

    // Maslow Concerns
    const concerns = maslowSignals.filter(s => s.signal_type === 'concern');
    if (concerns.length > 0) {
        parts.push('\n## Areas of Concern');
        for (const s of concerns) {
            parts.push(`- ${s.level}: ${s.description}`);
        }
    }

    // Values & Goals
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

    // Challenges
    if (challenges.length > 0) {
        parts.push('\n## Current Challenges');
        for (const c of challenges) {
            parts.push(`- ${c.description}`);
        }
    }

    // Moral Foundations
    const confidentMoral = profile.moralFoundations.filter(m => m.confidence >= MIN_CONFIDENCE);
    if (confidentMoral.length > 0) {
        parts.push('\n## Moral Sensitivities');
        for (const m of confidentMoral) {
            parts.push(`- Strong ${m.foundation} foundation`);
        }
    }

    // Personality & Disposition
    const personalityParts: string[] = [];

    // Big Five traits
    for (const t of profile.bigFive.filter(t => t.confidence >= MIN_CONFIDENCE)) {
        personalityParts.push(`- ${t.trait}: ${t.level}`);
    }

    // Single-value personality signals with labels
    const personalitySignals: [typeof profile.riskTolerance, string][] = [
        [profile.riskTolerance, 'Risk tolerance'],
        [profile.motivationStyle, 'Motivation'],
        [profile.attachmentStyle, 'Attachment'],
        [profile.locusOfControl, 'Locus of control'],
        [profile.temporalOrientation, 'Temporal focus'],
        [profile.growthMindset, 'Mindset'],
        [profile.selfEfficacy, 'Self-efficacy'],
    ];

    for (const [signal, label] of personalitySignals) {
        if (isConfident(signal)) {
            const suffix = label === 'Motivation' ? '-oriented' : '';
            personalityParts.push(`- ${label}: ${signal.value}${suffix}`);
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
    if (messages.length === 0) return '';

    const parts = ['## Recent Conversation'];
    for (const m of messages) {
        const speaker = m.role === 'user' ? 'User' : 'Assistant';
        parts.push(`${speaker}: ${m.content}`);
    }
    return parts.join('\n');
}
