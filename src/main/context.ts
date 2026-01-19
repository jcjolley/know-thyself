import { getDb } from './db/sqlite.js';
import { searchSimilarMessages } from './db/lancedb.js';
import { embed, isEmbeddingsReady } from './embeddings.js';
import type { Message, Value, Challenge, MaslowSignal } from '../shared/types.js';

export interface AssembledContext {
    profileSummary: string;
    relevantMessages: string;
    recentHistory: string;
    tokenEstimate: number;
}

export async function assembleContext(
    currentMessage: string,
    recentMessages: Message[]
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

    // Build profile summary
    const profileSummary = buildProfileSummary(values, challenges, maslowSignals);

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
    };
}

function buildProfileSummary(
    values: Value[],
    challenges: Challenge[],
    maslowSignals: MaslowSignal[]
): string {
    const parts: string[] = [];

    if (values.length > 0) {
        parts.push('## What Matters to This Person');
        for (const v of values) {
            const confidence = v.confidence >= 0.7 ? '' : ' (emerging)';
            parts.push(`- ${v.name}: ${v.description}${confidence}`);
        }
    }

    if (challenges.length > 0) {
        parts.push('\n## Current Challenges');
        for (const c of challenges) {
            parts.push(`- ${c.description}`);
        }
    }

    if (maslowSignals.length > 0) {
        const concerns = maslowSignals.filter(s => s.signal_type === 'concern');
        if (concerns.length > 0) {
            parts.push('\n## Areas of Concern');
            for (const s of concerns) {
                parts.push(`- ${s.level}: ${s.description}`);
            }
        }
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
