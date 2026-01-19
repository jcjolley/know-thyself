import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './db/sqlite.js';
import { getMessageById } from './db/messages.js';
import { buildExtractionPrompt } from './prompts/extraction.js';
import { isMockEnabled, getMockExtraction } from './claude-mock.js';
import {
    updateLifeSituation,
    updateImmediateIntent,
    updateMoralFoundations,
    updateGoals,
    updateSupportSeekingStyle,
    updateBigFiveSignals,
    updateRiskTolerance,
    updateMotivationStyle,
    updateAttachmentStyle,
    updateLocusOfControl,
    updateTemporalOrientation,
    updateGrowthMindset,
    updateTier4Signals,
} from './db/profile.js';
import type { CompleteExtractionResult, Extraction } from '../shared/types.js';

const EXTRACTION_MODEL = 'claude-haiku-4-5';

export async function runExtraction(messageId: string, conversationId: string): Promise<Extraction> {
    const db = getDb();
    const message = getMessageById(messageId);

    if (!message) {
        throw new Error(`Message not found: ${messageId}`);
    }

    let extractionJson: string;

    if (isMockEnabled()) {
        extractionJson = getMockExtraction(message.content);
    } else {
        const client = new Anthropic();

        const response = await client.messages.create({
            model: EXTRACTION_MODEL,
            max_tokens: 2000,
            messages: [{
                role: 'user',
                content: buildExtractionPrompt(message.content),
            }],
        });

        extractionJson = response.content[0].type === 'text'
            ? response.content[0].text
            : '';
    }

    // Validate extraction
    const validation = validateExtraction(extractionJson, message.content);

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
        INSERT INTO extractions (id, message_id, extraction_json, status, validation_errors, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(
        id,
        messageId,
        extractionJson,
        validation.valid ? 'validated' : 'rejected',
        validation.errors.length > 0 ? JSON.stringify(validation.errors) : null,
        now
    );

    // If valid, apply to profile
    if (validation.valid) {
        await applyExtractionToProfile(
            id,
            JSON.parse(extractionJson) as CompleteExtractionResult,
            messageId,
            conversationId
        );
    }

    return {
        id,
        message_id: messageId,
        extraction_json: extractionJson,
        status: validation.valid ? 'validated' : 'rejected',
        validation_errors: validation.errors.length > 0 ? JSON.stringify(validation.errors) : null,
        created_at: now,
    };
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

function collectQuotes(extraction: CompleteExtractionResult): string[] {
    const quotes: (string | undefined)[] = [
        ...(extraction.raw_quotes || []),
        ...(extraction.values?.map(v => v.quote) || []),
        ...(extraction.challenges?.map(c => c.quote) || []),
        ...(extraction.goals?.map(g => g.quote) || []),
        ...(extraction.maslow_signals?.map(m => m.quote) || []),
        ...(extraction.moral_signals?.map(m => m.quote) || []),
        ...(extraction.big_five_signals?.map(b => b.quote) || []),
        extraction.life_situation?.work?.quote,
        extraction.life_situation?.relationship?.quote,
        extraction.life_situation?.family?.quote,
        extraction.life_situation?.living?.quote,
        extraction.immediate_intent?.quote,
        extraction.risk_tolerance?.quote,
        extraction.motivation_style?.quote,
        extraction.attachment_signals?.quote,
        extraction.locus_of_control?.quote,
        extraction.temporal_orientation?.quote,
        extraction.growth_mindset?.quote,
        extraction.tier4_signals?.change_readiness?.quote,
        extraction.tier4_signals?.stress_response?.quote,
        extraction.tier4_signals?.emotional_regulation?.quote,
        extraction.tier4_signals?.self_efficacy?.quote,
    ];
    return quotes.filter((q): q is string => Boolean(q));
}

export function validateExtraction(jsonStr: string, originalMessage: string): ValidationResult {
    const errors: string[] = [];

    let extraction: CompleteExtractionResult;
    try {
        extraction = JSON.parse(jsonStr);
    } catch {
        return { valid: false, errors: ['Invalid JSON format'] };
    }

    const normalizedMessage = originalMessage.toLowerCase().replace(/\s+/g, ' ');

    for (const quote of collectQuotes(extraction)) {
        const normalizedQuote = quote.toLowerCase().replace(/\s+/g, ' ').trim();
        if (normalizedQuote.length > 10 && !normalizedMessage.includes(normalizedQuote)) {
            errors.push(`Quote not found: "${quote.slice(0, 50)}..."`);
        }
    }

    return { valid: errors.length === 0, errors };
}

async function applyExtractionToProfile(
    extractionId: string,
    extraction: CompleteExtractionResult,
    messageId: string,
    conversationId: string
): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();

    // === Existing: Values ===
    for (const value of extraction.values || []) {
        const existingValue = db.prepare(`
            SELECT * FROM user_values WHERE name = ?
        `).get(value.name);

        if (existingValue) {
            db.prepare(`
                UPDATE user_values
                SET evidence_count = evidence_count + 1,
                    last_reinforced = ?,
                    confidence = MIN(0.95, confidence + 0.1)
                WHERE name = ?
            `).run(now, value.name);
        } else {
            const id = uuidv4();
            db.prepare(`
                INSERT INTO user_values (id, name, description, value_type, confidence, evidence_count, first_seen, last_reinforced)
                VALUES (?, ?, ?, ?, ?, 1, ?, ?)
            `).run(id, value.name, value.description, value.value_type, value.confidence, now, now);

            db.prepare(`
                INSERT INTO evidence (id, target_type, target_id, message_id, quote, created_at)
                VALUES (?, 'value', ?, ?, ?, ?)
            `).run(uuidv4(), id, messageId, value.quote, now);
        }
    }

    // === Existing: Challenges ===
    for (const challenge of extraction.challenges || []) {
        const existing = db.prepare(`
            SELECT * FROM challenges WHERE description LIKE ?
        `).get(`%${challenge.description.slice(0, 50)}%`);

        if (existing) {
            db.prepare(`
                UPDATE challenges
                SET mention_count = mention_count + 1, last_mentioned = ?
                WHERE id = ?
            `).run(now, (existing as { id: string }).id);
        } else {
            const id = uuidv4();
            db.prepare(`
                INSERT INTO challenges (id, description, status, first_mentioned, last_mentioned, mention_count)
                VALUES (?, ?, 'active', ?, ?, 1)
            `).run(id, challenge.description, now, now);

            db.prepare(`
                INSERT INTO evidence (id, target_type, target_id, message_id, quote, created_at)
                VALUES (?, 'challenge', ?, ?, ?, ?)
            `).run(uuidv4(), id, messageId, challenge.quote, now);
        }
    }

    // === Existing: Maslow Signals ===
    for (const signal of extraction.maslow_signals || []) {
        const id = uuidv4();
        db.prepare(`
            INSERT INTO maslow_signals (id, level, signal_type, description, created_at)
            VALUES (?, ?, ?, ?, ?)
        `).run(id, signal.level, signal.signal_type, signal.description, now);

        db.prepare(`
            INSERT INTO evidence (id, target_type, target_id, message_id, quote, created_at)
            VALUES (?, 'maslow', ?, ?, ?, ?)
        `).run(uuidv4(), id, messageId, signal.quote, now);
    }

    // === NEW: Goals ===
    if (extraction.goals && extraction.goals.length > 0) {
        updateGoals(extractionId, extraction.goals, messageId);
    }

    // === NEW: Life Situation ===
    if (extraction.life_situation) {
        updateLifeSituation(extractionId, extraction.life_situation);
    }

    // === NEW: Immediate Intent ===
    if (extraction.immediate_intent && extraction.immediate_intent.type !== 'unknown') {
        updateImmediateIntent(conversationId, extraction.immediate_intent);
    }

    // === NEW: Moral Foundations ===
    if (extraction.moral_signals && extraction.moral_signals.length > 0) {
        updateMoralFoundations(extractionId, extraction.moral_signals, messageId);
    }

    // === NEW: Support-Seeking Style ===
    if (extraction.support_seeking_style && extraction.support_seeking_style !== 'unclear') {
        updateSupportSeekingStyle(
            extraction.support_seeking_style,
            extraction.raw_quotes?.[0]
        );
    }

    // === NEW: Tier 3 - Big Five ===
    if (extraction.big_five_signals && extraction.big_five_signals.length > 0) {
        updateBigFiveSignals(extraction.big_five_signals, messageId);
    }

    // === NEW: Tier 3 - Risk Tolerance ===
    if (extraction.risk_tolerance) {
        updateRiskTolerance(extraction.risk_tolerance, messageId);
    }

    // === NEW: Tier 3 - Motivation Style ===
    if (extraction.motivation_style) {
        updateMotivationStyle(extraction.motivation_style, messageId);
    }

    // === NEW: Tier 4 - Attachment Style ===
    if (extraction.attachment_signals) {
        updateAttachmentStyle(extraction.attachment_signals, messageId);
    }

    // === NEW: Tier 4 - Locus of Control ===
    if (extraction.locus_of_control) {
        updateLocusOfControl(extraction.locus_of_control, messageId);
    }

    // === NEW: Tier 4 - Temporal Orientation ===
    if (extraction.temporal_orientation) {
        updateTemporalOrientation(extraction.temporal_orientation, messageId);
    }

    // === NEW: Tier 4 - Growth Mindset ===
    if (extraction.growth_mindset) {
        updateGrowthMindset(extraction.growth_mindset, messageId);
    }

    // === NEW: Tier 4 - Additional Signals ===
    if (extraction.tier4_signals) {
        updateTier4Signals(extraction.tier4_signals, messageId);
    }
}
