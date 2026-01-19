import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './db/sqlite.js';
import { getMessageById } from './db/messages.js';
import { EXTRACTION_PROMPT } from './prompts/extraction.js';
import { isMockEnabled, getMockExtraction } from './claude-mock.js';
import type { ExtractionResult, Extraction } from '../shared/types.js';

const EXTRACTION_MODEL = 'claude-haiku-4-5';

export async function runExtraction(messageId: string): Promise<Extraction> {
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
                content: EXTRACTION_PROMPT.replace('{message}', message.content),
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
        await applyExtractionToProfile(id, JSON.parse(extractionJson) as ExtractionResult);
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

export function validateExtraction(jsonStr: string, originalMessage: string): ValidationResult {
    const errors: string[] = [];

    // Layer 1: Parse JSON
    let extraction: ExtractionResult;
    try {
        extraction = JSON.parse(jsonStr);
    } catch {
        return { valid: false, errors: ['Invalid JSON format'] };
    }

    // Layer 2: Verify quotes exist in original message
    const normalizedMessage = originalMessage.toLowerCase().replace(/\s+/g, ' ');

    const allQuotes = [
        ...(extraction.raw_quotes || []),
        ...(extraction.values?.map(v => v.quote) || []),
        ...(extraction.challenges?.map(c => c.quote) || []),
        ...(extraction.goals?.map(g => g.quote) || []),
        ...(extraction.maslow_signals?.map(m => m.quote) || []),
    ];

    for (const quote of allQuotes) {
        if (!quote) continue;
        const normalizedQuote = quote.toLowerCase().replace(/\s+/g, ' ').trim();
        if (normalizedQuote.length > 10 && !normalizedMessage.includes(normalizedQuote)) {
            errors.push(`Quote not found: "${quote.slice(0, 50)}..."`);
        }
    }

    return { valid: errors.length === 0, errors };
}

async function applyExtractionToProfile(extractionId: string, extraction: ExtractionResult): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();

    // Apply values
    for (const value of extraction.values || []) {
        const existingValue = db.prepare(`
            SELECT * FROM user_values WHERE name = ?
        `).get(value.name) as { id: string } | undefined;

        if (existingValue) {
            // Increase confidence and evidence count
            db.prepare(`
                UPDATE user_values
                SET evidence_count = evidence_count + 1,
                    last_reinforced = ?,
                    confidence = MIN(0.95, confidence + 0.1)
                WHERE name = ?
            `).run(now, value.name);
        } else {
            // Insert new value
            const id = uuidv4();
            db.prepare(`
                INSERT INTO user_values (id, name, description, value_type, confidence, evidence_count, first_seen, last_reinforced)
                VALUES (?, ?, ?, ?, ?, 1, ?, ?)
            `).run(id, value.name, value.description, value.value_type, value.confidence, now, now);

            // Add evidence
            db.prepare(`
                INSERT INTO evidence (id, target_type, target_id, message_id, quote, created_at)
                VALUES (?, 'value', ?, (SELECT message_id FROM extractions WHERE id = ?), ?, ?)
            `).run(uuidv4(), id, extractionId, value.quote, now);
        }
    }

    // Apply challenges
    for (const challenge of extraction.challenges || []) {
        const existing = db.prepare(`
            SELECT * FROM challenges WHERE description LIKE ?
        `).get(`%${challenge.description.slice(0, 50)}%`) as { id: string } | undefined;

        if (existing) {
            db.prepare(`
                UPDATE challenges
                SET mention_count = mention_count + 1, last_mentioned = ?
                WHERE id = ?
            `).run(now, existing.id);
        } else {
            const id = uuidv4();
            db.prepare(`
                INSERT INTO challenges (id, description, status, first_mentioned, last_mentioned, mention_count)
                VALUES (?, ?, 'active', ?, ?, 1)
            `).run(id, challenge.description, now, now);

            db.prepare(`
                INSERT INTO evidence (id, target_type, target_id, message_id, quote, created_at)
                VALUES (?, 'challenge', ?, (SELECT message_id FROM extractions WHERE id = ?), ?, ?)
            `).run(uuidv4(), id, extractionId, challenge.quote, now);
        }
    }

    // Apply Maslow signals
    for (const signal of extraction.maslow_signals || []) {
        const id = uuidv4();
        db.prepare(`
            INSERT INTO maslow_signals (id, level, signal_type, description, created_at)
            VALUES (?, ?, ?, ?, ?)
        `).run(id, signal.level, signal.signal_type, signal.description, now);

        db.prepare(`
            INSERT INTO evidence (id, target_type, target_id, message_id, quote, created_at)
            VALUES (?, 'maslow', ?, (SELECT message_id FROM extractions WHERE id = ?), ?, ?)
        `).run(uuidv4(), id, extractionId, signal.quote, now);
    }
}
