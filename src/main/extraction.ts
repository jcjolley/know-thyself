import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './db/sqlite.js';
import { getMessageById } from './db/messages.js';
import { buildExtractionPrompt } from './prompts/extraction.js';
import { isMockEnabled, getMockExtraction, getMockNarrative } from './claude-mock.js';
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
    clearAllProfileData,
    getUserMessagesForConversation,
    getExistingNarrative,
    saveNarrativeSummary,
    countMessagesSince,
    getNarrativeGeneratedAt,
    getCompleteProfile,
} from './db/profile.js';
import { NARRATIVE_SYNTHESIS_PROMPT, type NarrativeSummary } from './prompts/narrative-synthesis.js';
import type { ReanalyzeProgress } from '../shared/types.js';
import type { CompleteExtractionResult, Extraction } from '../shared/types.js';

const EXTRACTION_MODEL = 'claude-haiku-4-5';

export async function runExtraction(messageId: string, conversationId: string): Promise<Extraction> {
    const db = getDb();
    const message = getMessageById(messageId);

    if (!message) {
        throw new Error(`Message not found: ${messageId}`);
    }

    console.log('[extraction] Processing message:', messageId, 'content length:', message.content.length);

    let extractionJson: string;

    if (isMockEnabled()) {
        console.log('[extraction] Using mock extraction');
        extractionJson = getMockExtraction(message.content);
    } else {
        console.log('[extraction] Calling Claude API with model:', EXTRACTION_MODEL);
        const client = new Anthropic();

        try {
            const response = await client.messages.create({
                model: EXTRACTION_MODEL,
                max_tokens: 2000,
                messages: [{
                    role: 'user',
                    content: buildExtractionPrompt(message.content),
                }],
            });

            const rawResponse = response.content[0].type === 'text'
                ? response.content[0].text
                : '';
            console.log('[extraction] Claude response length:', rawResponse.length);
            console.log('[extraction] Claude response preview:', rawResponse.slice(0, 200));

            // Strip markdown code fences if present
            extractionJson = rawResponse
                .replace(/^```json\s*/i, '')
                .replace(/^```\s*/i, '')
                .replace(/\s*```$/i, '')
                .trim();
        } catch (err) {
            console.error('[extraction] Claude API error:', err);
            throw err;
        }
    }

    // Validate extraction
    const validation = validateExtraction(extractionJson, message.content);
    console.log('[extraction] Validation result:', validation.valid, 'errors:', validation.errors.length);

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
    console.log('[extraction] Saved extraction with status:', validation.valid ? 'validated' : 'rejected');

    // If valid, apply to profile
    if (validation.valid) {
        console.log('[extraction] Applying to profile...');
        const parsed = JSON.parse(extractionJson) as CompleteExtractionResult;
        console.log('[extraction] Parsed extraction keys:', Object.keys(parsed));
        console.log('[extraction] Values count:', parsed.values?.length || 0);
        console.log('[extraction] Challenges count:', parsed.challenges?.length || 0);
        console.log('[extraction] Goals count:', parsed.goals?.length || 0);
        console.log('[extraction] Maslow signals count:', parsed.maslow_signals?.length || 0);
        console.log('[extraction] Life situation:', parsed.life_situation ? 'present' : 'absent');
        console.log('[extraction] Moral signals count:', parsed.moral_signals?.length || 0);
        console.log('[extraction] Big Five signals count:', parsed.big_five_signals?.length || 0);

        await applyExtractionToProfile(
            id,
            parsed,
            messageId,
            conversationId
        );
        console.log('[extraction] Applied to profile successfully');

        // After extraction completes, check if narrative needs regeneration
        if (shouldRegenerateNarrative()) {
            // Run async - don't block
            synthesizeNarrative().catch(err => {
                console.error('[narrative] Background synthesis failed:', err);
            });
        }
    } else {
        console.log('[extraction] Skipping profile update due to validation failure');
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
    const warnings: string[] = [];

    let extraction: CompleteExtractionResult;
    try {
        extraction = JSON.parse(jsonStr);
    } catch {
        return { valid: false, errors: ['Invalid JSON format'] };
    }

    const normalizedMessage = originalMessage.toLowerCase().replace(/\s+/g, ' ');

    // Check quotes but only warn - Claude's quotes may not be exact substrings
    // especially for transcribed speech or when Claude normalizes text
    for (const quote of collectQuotes(extraction)) {
        const normalizedQuote = quote.toLowerCase().replace(/\s+/g, ' ').trim();
        if (normalizedQuote.length > 10 && !normalizedMessage.includes(normalizedQuote)) {
            // Use fuzzy check: see if most words from quote appear in message
            const quoteWords = normalizedQuote.split(' ').filter(w => w.length > 3);
            const matchingWords = quoteWords.filter(w => normalizedMessage.includes(w));
            const matchRatio = quoteWords.length > 0 ? matchingWords.length / quoteWords.length : 1;

            if (matchRatio < 0.5) {
                // Less than 50% of significant words match - this is suspicious
                warnings.push(`Quote may not match source: "${quote.slice(0, 50)}..." (${Math.round(matchRatio * 100)}% word match)`);
            }
        }
    }

    // Log warnings for debugging but don't reject the extraction
    if (warnings.length > 0) {
        console.warn('Extraction validation warnings:', warnings);
    }

    // Only reject if JSON is invalid - accept extractions with imperfect quotes
    return { valid: true, errors };
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
        updateLifeSituation(extractionId, extraction.life_situation, messageId);
    }

    // === NEW: Immediate Intent ===
    if (extraction.immediate_intent && extraction.immediate_intent.type !== 'unknown') {
        updateImmediateIntent(conversationId, extraction.immediate_intent, messageId);
    }

    // === NEW: Moral Foundations ===
    if (extraction.moral_signals && extraction.moral_signals.length > 0) {
        updateMoralFoundations(extractionId, extraction.moral_signals, messageId);
    }

    // === NEW: Support-Seeking Style ===
    if (extraction.support_seeking_style && extraction.support_seeking_style !== 'unclear') {
        updateSupportSeekingStyle(
            extraction.support_seeking_style,
            extraction.raw_quotes?.[0],
            messageId
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

// =============================================================================
// Narrative Synthesis (Phase 3.2)
// =============================================================================

const NARRATIVE_MODEL = 'claude-haiku-4-5';

/**
 * Check if narrative regeneration is needed based on trigger conditions.
 */
export function shouldRegenerateNarrative(): boolean {
    const lastGenerated = getNarrativeGeneratedAt();
    const messagesSince = countMessagesSince(lastGenerated);
    const existingNarrative = getExistingNarrative();

    // Trigger conditions (any one triggers regeneration)
    return (
        !existingNarrative ||           // First time - no narrative exists
        messagesSince >= 10             // 10+ messages since last generation
    );
}

/**
 * Generate narrative summary using Claude Haiku.
 */
export async function synthesizeNarrative(): Promise<NarrativeSummary | null> {
    try {
        let response: string;

        if (isMockEnabled()) {
            console.log('[narrative] Using mock narrative');
            response = getMockNarrative();
        } else {
            const profile = getCompleteProfile();
            const existingNarrative = getExistingNarrative();

            // Build prompt with profile data
            const prompt = NARRATIVE_SYNTHESIS_PROMPT
                .replace('{profile_data}', JSON.stringify(profile, null, 2))
                .replace('{existing_narrative}', existingNarrative
                    ? JSON.stringify(existingNarrative, null, 2)
                    : 'None (first generation)');

            // Call Claude Haiku
            response = await callHaikuForNarrative(prompt);
        }

        // Parse response
        const narrative = parseNarrativeResponse(response);
        if (!narrative) {
            console.error('[narrative] Failed to parse response');
            return null;
        }

        // Save to database
        saveNarrativeSummary(narrative);
        console.log('[narrative] Generated and saved narrative summary');

        return narrative;
    } catch (err) {
        console.error('[narrative] Synthesis failed:', err);
        return null;
    }
}

/**
 * Parse Claude's response into NarrativeSummary.
 */
function parseNarrativeResponse(response: string): NarrativeSummary | null {
    try {
        // Strip markdown code blocks if present
        let json = response.trim();
        if (json.startsWith('```')) {
            json = json.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        const parsed = JSON.parse(json);

        // Validate required structure
        return {
            identity_summary: parsed.identity_summary ?? null,
            current_phase: parsed.current_phase ?? null,
            primary_concerns: Array.isArray(parsed.primary_concerns) ? parsed.primary_concerns : [],
            emotional_baseline: parsed.emotional_baseline ?? null,
            patterns_to_watch: Array.isArray(parsed.patterns_to_watch) ? parsed.patterns_to_watch : [],
            recent_wins: Array.isArray(parsed.recent_wins) ? parsed.recent_wins : [],
            recent_struggles: Array.isArray(parsed.recent_struggles) ? parsed.recent_struggles : [],
        };
    } catch (err) {
        console.error('[narrative] JSON parse error:', err);
        return null;
    }
}

/**
 * Call Claude Haiku for narrative synthesis.
 * Separate from main chat to use cost-effective model.
 */
async function callHaikuForNarrative(prompt: string): Promise<string> {
    // Create Anthropic client (follows existing pattern in extraction.ts)
    const anthropic = new Anthropic();

    const response = await anthropic.messages.create({
        model: NARRATIVE_MODEL,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find(block => block.type === 'text');
    return textBlock?.text ?? '';
}

// =============================================================================
// Re-Analyze Conversation
// =============================================================================

export type ProgressCallback = (progress: ReanalyzeProgress) => void;

export async function reanalyzeConversation(
    conversationId: string,
    onProgress?: ProgressCallback
): Promise<void> {
    // Get all user messages for this conversation
    const messages = getUserMessagesForConversation(conversationId);

    if (messages.length === 0) {
        onProgress?.({
            status: 'completed',
            current: 0,
            total: 0,
        });
        return;
    }

    // Clear all profile data
    clearAllProfileData(conversationId);

    // Emit started event
    onProgress?.({
        status: 'started',
        current: 0,
        total: messages.length,
    });

    // Re-extract each message sequentially
    for (let i = 0; i < messages.length; i++) {
        const message = messages[i];

        onProgress?.({
            status: 'processing',
            current: i + 1,
            total: messages.length,
        });

        try {
            await runExtraction(message.id, conversationId);
        } catch (err) {
            console.error(`Extraction failed for message ${message.id}:`, err);
            onProgress?.({
                status: 'error',
                current: i + 1,
                total: messages.length,
                error: err instanceof Error ? err.message : 'Unknown error',
            });
            throw err;
        }
    }

    // Emit completed event
    onProgress?.({
        status: 'completed',
        current: messages.length,
        total: messages.length,
    });
}
