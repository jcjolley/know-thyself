import { v4 as uuidv4 } from 'uuid';
import { getDb } from './sqlite.js';
import type {
    ExtractedLifeSituation,
    ExtractedIntent,
    ExtractedMoralSignal,
    ExtractedGoal,
    ExtractedBigFiveSignal,
    ExtractedRiskSignal,
    ExtractedMotivationSignal,
    ExtractedAttachmentSignal,
    ExtractedLocusSignal,
    ExtractedTemporalSignal,
    ExtractedMindsetSignal,
    ExtractedTier4Signals,
    Goal,
    SupportSeekingStyle,
    AdminSignal,
    SignalEvidence,
} from '../../shared/types.js';

// =============================================================================
// Life Situation
// =============================================================================

export function updateLifeSituation(
    extractionId: string,
    situation: ExtractedLifeSituation
): void {
    if (situation.work?.status && situation.work.status !== 'unknown') {
        upsertPsychSignal('life_situation.work_status', situation.work.status, situation.work.quote);
        if (situation.work.description) {
            upsertPsychSignal('life_situation.work_description', situation.work.description, situation.work.quote);
        }
    }

    if (situation.relationship?.status && situation.relationship.status !== 'unknown') {
        upsertPsychSignal('life_situation.relationship_status', situation.relationship.status, situation.relationship.quote);
    }

    if (situation.family) {
        if (situation.family.has_children !== undefined) {
            upsertPsychSignal('life_situation.has_children', String(situation.family.has_children), situation.family.quote);
        }
        if (situation.family.children_details) {
            upsertPsychSignal('life_situation.children_details', situation.family.children_details, situation.family.quote);
        }
    }

    if (situation.living?.situation) {
        upsertPsychSignal('life_situation.living', situation.living.situation, situation.living.quote);
        if (situation.living.location) {
            upsertPsychSignal('life_situation.location', situation.living.location, situation.living.quote);
        }
    }

    if (situation.age_stage && situation.age_stage !== 'unknown') {
        upsertPsychSignal('life_situation.age_stage', situation.age_stage);
    }
}

// =============================================================================
// Immediate Intent
// =============================================================================

export function updateImmediateIntent(
    conversationId: string,
    intent: ExtractedIntent
): void {
    const db = getDb();
    const now = new Date().toISOString();

    // Intent is conversation-scoped, so we use a different pattern
    // Store as psychological signal with conversation qualifier
    const dimension = `intent.${conversationId}`;

    db.prepare(`
        INSERT INTO psychological_signals (id, dimension, value, confidence, evidence_count, last_updated)
        VALUES (?, ?, ?, ?, 1, ?)
        ON CONFLICT(dimension) DO UPDATE SET
            value = excluded.value,
            confidence = excluded.confidence,
            last_updated = excluded.last_updated
    `).run(uuidv4(), dimension, JSON.stringify(intent), intent.confidence, now);

    // Also store the general pattern (what kind of conversations do they have?)
    upsertPsychSignal('intent.pattern.' + intent.type, intent.type, intent.quote, 0.1);
}

export function getCurrentIntent(conversationId: string): ExtractedIntent | null {
    const db = getDb();
    const row = db.prepare(`
        SELECT value FROM psychological_signals
        WHERE dimension = ?
    `).get(`intent.${conversationId}`) as { value: string } | undefined;

    if (!row) return null;
    return JSON.parse(row.value) as ExtractedIntent;
}

// =============================================================================
// Moral Foundations
// =============================================================================

export function updateMoralFoundations(
    extractionId: string,
    signals: ExtractedMoralSignal[],
    messageId: string
): void {
    const db = getDb();
    const now = new Date().toISOString();

    for (const signal of signals) {
        const dimension = `moral.${signal.foundation}`;
        const strengthMultiplier = signal.strength === 'strong' ? 0.15 : signal.strength === 'moderate' ? 0.1 : 0.05;

        upsertPsychSignal(dimension, signal.valence, signal.quote, strengthMultiplier);

        // Store evidence
        const signalRow = db.prepare(`
            SELECT id FROM psychological_signals WHERE dimension = ?
        `).get(dimension) as { id: string } | undefined;

        if (signalRow) {
            db.prepare(`
                INSERT INTO evidence (id, target_type, target_id, message_id, quote, created_at)
                VALUES (?, 'moral_foundation', ?, ?, ?, ?)
            `).run(uuidv4(), signalRow.id, messageId, signal.quote, now);
        }
    }
}

// =============================================================================
// Goals
// =============================================================================

export function updateGoals(
    extractionId: string,
    goals: ExtractedGoal[],
    messageId: string
): void {
    const db = getDb();
    const now = new Date().toISOString();

    for (const goal of goals) {
        // Check for existing similar goal
        const existing = db.prepare(`
            SELECT * FROM goals
            WHERE description LIKE ?
            AND status NOT IN ('achieved', 'abandoned')
        `).get(`%${goal.description.slice(0, 30)}%`) as Goal | undefined;

        if (existing) {
            // Update existing goal
            const newStatus = goal.status || existing.status;
            db.prepare(`
                UPDATE goals
                SET last_mentioned = ?,
                    status = ?
                WHERE id = ?
            `).run(now, newStatus, existing.id);
        } else {
            // Insert new goal
            const id = uuidv4();
            db.prepare(`
                INSERT INTO goals (id, description, status, timeframe, first_stated, last_mentioned)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(id, goal.description, goal.status || 'stated', goal.timeframe || null, now, now);

            // Store evidence
            if (goal.quote) {
                db.prepare(`
                    INSERT INTO evidence (id, target_type, target_id, message_id, quote, created_at)
                    VALUES (?, 'goal', ?, ?, ?, ?)
                `).run(uuidv4(), id, messageId, goal.quote, now);
            }
        }
    }
}

export function getActiveGoals(limit: number = 5): Goal[] {
    const db = getDb();
    return db.prepare(`
        SELECT * FROM goals
        WHERE status IN ('stated', 'in_progress')
        ORDER BY last_mentioned DESC
        LIMIT ?
    `).all(limit) as Goal[];
}

// =============================================================================
// Support-Seeking Style
// =============================================================================

export function updateSupportSeekingStyle(
    style: SupportSeekingStyle,
    quote?: string
): void {
    if (style === 'unclear') return;
    upsertPsychSignal('support_seeking_style', style, quote, 0.15);
}

export function getSupportSeekingStyle(): { style: SupportSeekingStyle; confidence: number } | null {
    const db = getDb();
    const row = db.prepare(`
        SELECT value, confidence FROM psychological_signals
        WHERE dimension = 'support_seeking_style'
    `).get() as { value: string; confidence: number } | undefined;

    if (!row) return null;
    return { style: row.value as SupportSeekingStyle, confidence: row.confidence };
}

// =============================================================================
// Helpers
// =============================================================================

function upsertPsychSignal(
    dimension: string,
    value: string,
    quote?: string,
    confidenceIncrement: number = 0.1
): void {
    const db = getDb();
    const now = new Date().toISOString();

    const existing = db.prepare(`
        SELECT id, confidence, evidence_count FROM psychological_signals
        WHERE dimension = ?
    `).get(dimension) as { id: string; confidence: number; evidence_count: number } | undefined;

    if (existing) {
        // Update: increase confidence, increment evidence count
        const newConfidence = Math.min(0.95, existing.confidence + confidenceIncrement);
        db.prepare(`
            UPDATE psychological_signals
            SET value = ?,
                confidence = ?,
                evidence_count = evidence_count + 1,
                last_updated = ?
            WHERE dimension = ?
        `).run(value, newConfidence, now, dimension);
    } else {
        // Insert new
        db.prepare(`
            INSERT INTO psychological_signals (id, dimension, value, confidence, evidence_count, last_updated)
            VALUES (?, ?, ?, ?, 1, ?)
        `).run(uuidv4(), dimension, value, 0.5 + confidenceIncrement, now);
    }
}

// =============================================================================
// Aggregate Queries
// =============================================================================

export function getLifeSituation(): Record<string, string> {
    const db = getDb();
    const rows = db.prepare(`
        SELECT dimension, value FROM psychological_signals
        WHERE dimension LIKE 'life_situation.%'
    `).all() as { dimension: string; value: string }[];

    const result: Record<string, string> = {};
    for (const row of rows) {
        const key = row.dimension.replace('life_situation.', '');
        result[key] = row.value;
    }
    return result;
}

export function getMoralFoundations(): { foundation: string; valence: string; confidence: number }[] {
    const db = getDb();
    return db.prepare(`
        SELECT
            REPLACE(dimension, 'moral.', '') as foundation,
            value as valence,
            confidence
        FROM psychological_signals
        WHERE dimension LIKE 'moral.%'
        ORDER BY confidence DESC
    `).all() as { foundation: string; valence: string; confidence: number }[];
}

// =============================================================================
// Tier 3: Big Five, Risk Tolerance, Motivation Style
// =============================================================================

function updateSignalWithEvidence(
    dimension: string,
    value: string,
    quote: string | undefined,
    confidence: number,
    messageId: string
): void {
    upsertPsychSignal(dimension, value, quote, confidence * 0.1);
    storeEvidence(dimension, dimension, messageId, quote);
}

export function updateBigFiveSignals(
    signals: ExtractedBigFiveSignal[],
    messageId: string
): void {
    for (const signal of signals) {
        const dimension = `big_five.${signal.trait}`;
        upsertPsychSignal(dimension, signal.level, signal.quote, signal.confidence * 0.1);
        storeEvidence('big_five', dimension, messageId, signal.quote);
    }
}

export function updateRiskTolerance(signal: ExtractedRiskSignal, messageId: string): void {
    updateSignalWithEvidence('risk_tolerance', signal.tolerance, signal.quote, signal.confidence, messageId);
}

export function updateMotivationStyle(signal: ExtractedMotivationSignal, messageId: string): void {
    updateSignalWithEvidence('motivation_style', signal.style, signal.quote, signal.confidence, messageId);
}

export function getBigFiveProfile(): { trait: string; level: string; confidence: number }[] {
    const db = getDb();
    return db.prepare(`
        SELECT
            REPLACE(dimension, 'big_five.', '') as trait,
            value as level,
            confidence
        FROM psychological_signals
        WHERE dimension LIKE 'big_five.%'
        ORDER BY confidence DESC
    `).all() as { trait: string; level: string; confidence: number }[];
}

// =============================================================================
// Tier 4: Attachment, Locus, Temporal, Mindset, etc.
// =============================================================================

export function updateAttachmentStyle(signal: ExtractedAttachmentSignal, messageId: string): void {
    updateSignalWithEvidence('attachment_style', signal.style, signal.quote, signal.confidence, messageId);
}

export function updateLocusOfControl(signal: ExtractedLocusSignal, messageId: string): void {
    updateSignalWithEvidence('locus_of_control', signal.locus, signal.quote, signal.confidence, messageId);
}

export function updateTemporalOrientation(signal: ExtractedTemporalSignal, messageId: string): void {
    updateSignalWithEvidence('temporal_orientation', signal.orientation, signal.quote, signal.confidence, messageId);
}

export function updateGrowthMindset(signal: ExtractedMindsetSignal, messageId: string): void {
    updateSignalWithEvidence('growth_mindset', signal.mindset, signal.quote, signal.confidence, messageId);
}

export function updateTier4Signals(signals: ExtractedTier4Signals, messageId: string): void {
    const tier4Updates: [string, { confidence: number; quote?: string } & Record<string, unknown> | undefined, string][] = [
        ['change_readiness', signals.change_readiness, 'stage'],
        ['stress_response', signals.stress_response, 'response'],
        ['emotional_regulation', signals.emotional_regulation, 'style'],
        ['self_efficacy', signals.self_efficacy, 'level'],
    ];

    for (const [dimension, signal, valueKey] of tier4Updates) {
        if (signal) {
            const value = signal[valueKey as keyof typeof signal] as string;
            updateSignalWithEvidence(dimension, value, signal.quote, signal.confidence, messageId);
        }
    }
}

// =============================================================================
// Evidence Helper
// =============================================================================

function storeEvidence(targetType: string, targetId: string, messageId: string, quote?: string): void {
    if (!quote) return;
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(`
        INSERT INTO evidence (id, target_type, target_id, message_id, quote, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), targetType, targetId, messageId, quote, now);
}

// =============================================================================
// Complete Profile Query
// =============================================================================

export interface CompleteProfile {
    lifeSituation: Record<string, string>;
    moralFoundations: { foundation: string; valence: string; confidence: number }[];
    bigFive: { trait: string; level: string; confidence: number }[];
    riskTolerance: { value: string; confidence: number } | null;
    motivationStyle: { value: string; confidence: number } | null;
    attachmentStyle: { value: string; confidence: number } | null;
    locusOfControl: { value: string; confidence: number } | null;
    temporalOrientation: { value: string; confidence: number } | null;
    growthMindset: { value: string; confidence: number } | null;
    changeReadiness: { value: string; confidence: number } | null;
    stressResponse: { value: string; confidence: number } | null;
    emotionalRegulation: { value: string; confidence: number } | null;
    selfEfficacy: { value: string; confidence: number } | null;
}

export function getCompleteProfile(): CompleteProfile {
    const db = getDb();

    const getSingleSignal = (dimension: string): { value: string; confidence: number } | null => {
        const row = db.prepare(`
            SELECT value, confidence FROM psychological_signals WHERE dimension = ?
        `).get(dimension) as { value: string; confidence: number } | undefined;
        return row || null;
    };

    return {
        lifeSituation: getLifeSituation(),
        moralFoundations: getMoralFoundations(),
        bigFive: getBigFiveProfile(),
        riskTolerance: getSingleSignal('risk_tolerance'),
        motivationStyle: getSingleSignal('motivation_style'),
        attachmentStyle: getSingleSignal('attachment_style'),
        locusOfControl: getSingleSignal('locus_of_control'),
        temporalOrientation: getSingleSignal('temporal_orientation'),
        growthMindset: getSingleSignal('growth_mindset'),
        changeReadiness: getSingleSignal('change_readiness'),
        stressResponse: getSingleSignal('stress_response'),
        emotionalRegulation: getSingleSignal('emotional_regulation'),
        selfEfficacy: getSingleSignal('self_efficacy'),
    };
}

// =============================================================================
// Admin Page Queries
// =============================================================================

export function getAllSignalsForAdmin(): AdminSignal[] {
    const db = getDb();
    return db.prepare(`
        SELECT id, dimension, value, confidence, evidence_count, last_updated
        FROM psychological_signals
        ORDER BY last_updated DESC
    `).all() as AdminSignal[];
}

export function getEvidenceForDimension(dimension: string): SignalEvidence[] {
    const db = getDb();
    return db.prepare(`
        SELECT e.id, e.quote, e.message_id, e.created_at
        FROM evidence e
        WHERE e.target_id = ?
        ORDER BY e.created_at DESC
    `).all(dimension) as SignalEvidence[];
}

export function getAllGoals(): Goal[] {
    const db = getDb();
    return db.prepare(`
        SELECT * FROM goals ORDER BY last_mentioned DESC
    `).all() as Goal[];
}
