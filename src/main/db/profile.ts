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
    FullProfileSummary,
    ProfileValueItem,
    ProfileChallengeItem,
    ProfileGoalItem,
    ProfileSignalItem,
} from '../../shared/types.js';

// =============================================================================
// Life Situation
// =============================================================================

export function updateLifeSituation(
    extractionId: string,
    situation: ExtractedLifeSituation,
    messageId: string
): void {
    if (situation.work?.status && situation.work.status !== 'unknown') {
        upsertPsychSignal('life_situation.work_status', situation.work.status, situation.work.quote, 0.1, messageId);
        if (situation.work.description) {
            upsertPsychSignal('life_situation.work_description', situation.work.description, situation.work.quote, 0.1, messageId);
        }
    }

    if (situation.relationship?.status && situation.relationship.status !== 'unknown') {
        upsertPsychSignal('life_situation.relationship_status', situation.relationship.status, situation.relationship.quote, 0.1, messageId);
    }

    if (situation.family) {
        if (situation.family.has_children !== undefined) {
            upsertPsychSignal('life_situation.has_children', String(situation.family.has_children), situation.family.quote, 0.1, messageId);
        }
        if (situation.family.children_details) {
            upsertPsychSignal('life_situation.children_details', situation.family.children_details, situation.family.quote, 0.1, messageId);
        }
    }

    if (situation.living?.situation) {
        upsertPsychSignal('life_situation.living', situation.living.situation, situation.living.quote, 0.1, messageId);
        if (situation.living.location) {
            upsertPsychSignal('life_situation.location', situation.living.location, situation.living.quote, 0.1, messageId);
        }
    }

    if (situation.age_stage && situation.age_stage !== 'unknown') {
        upsertPsychSignal('life_situation.age_stage', situation.age_stage, undefined, 0.1, messageId);
    }
}

// =============================================================================
// Immediate Intent
// =============================================================================

export function updateImmediateIntent(
    conversationId: string,
    intent: ExtractedIntent,
    messageId: string
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
    upsertPsychSignal('intent.pattern.' + intent.type, intent.type, intent.quote, 0.1, messageId);
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
    for (const signal of signals) {
        const dimension = `moral.${signal.foundation}`;
        const strengthMultiplier = signal.strength === 'strong' ? 0.15 : signal.strength === 'moderate' ? 0.1 : 0.05;

        // upsertPsychSignal now handles evidence storage
        upsertPsychSignal(dimension, signal.valence, signal.quote, strengthMultiplier, messageId);
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
    quote?: string,
    messageId?: string
): void {
    if (style === 'unclear') return;
    upsertPsychSignal('support_seeking_style', style, quote, 0.15, messageId);
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
    confidenceIncrement: number = 0.1,
    messageId?: string
): void {
    // CRITICAL: No evidence = no update. Every datapoint must have a supporting quote.
    if (!quote || !messageId) {
        console.log(`[profile] Skipping ${dimension} update - no evidence provided`);
        return;
    }

    const db = getDb();
    const now = new Date().toISOString();

    const existing = db.prepare(`
        SELECT id, confidence, evidence_count FROM psychological_signals
        WHERE dimension = ?
    `).get(dimension) as { id: string; confidence: number; evidence_count: number } | undefined;

    let signalId: string;

    if (existing) {
        signalId = existing.id;
        // Update: increase confidence and evidence count
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
        // Insert new signal with evidence
        signalId = uuidv4();
        db.prepare(`
            INSERT INTO psychological_signals (id, dimension, value, confidence, evidence_count, last_updated)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(signalId, dimension, value, 0.5 + confidenceIncrement, 1, now);
    }

    // Store the evidence
    db.prepare(`
        INSERT INTO evidence (id, target_type, target_id, message_id, quote, created_at)
        VALUES (?, 'psychological_signal', ?, ?, ?, ?)
    `).run(uuidv4(), signalId, messageId, quote, now);
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
    // upsertPsychSignal now handles evidence storage and requires quote
    upsertPsychSignal(dimension, value, quote, confidence * 0.1, messageId);
}

export function updateBigFiveSignals(
    signals: ExtractedBigFiveSignal[],
    messageId: string
): void {
    for (const signal of signals) {
        const dimension = `big_five.${signal.trait}`;
        // upsertPsychSignal now handles evidence storage and requires quote
        upsertPsychSignal(dimension, signal.level, signal.quote, signal.confidence * 0.1, messageId);
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
    console.log('[evidence] Looking up dimension:', dimension);

    // First get the signal ID for this dimension
    const signal = db.prepare(`
        SELECT id, evidence_count FROM psychological_signals WHERE dimension = ?
    `).get(dimension) as { id: string; evidence_count: number } | undefined;

    console.log('[evidence] Signal found:', signal);

    if (!signal) return [];

    // Query evidence by either:
    // - signal UUID (used by upsertPsychSignal)
    // - dimension string (used by storeEvidence for Big Five, Tier 3/4)
    const evidence = db.prepare(`
        SELECT e.id, e.quote, e.message_id, e.created_at
        FROM evidence e
        WHERE e.target_id = ? OR e.target_id = ?
        ORDER BY e.created_at DESC
    `).all(signal.id, dimension) as SignalEvidence[];

    console.log('[evidence] Evidence found:', evidence.length);

    // Debug: show what target_ids exist in evidence table
    const allTargetIds = db.prepare(`
        SELECT DISTINCT target_type, target_id FROM evidence LIMIT 20
    `).all();
    console.log('[evidence] All target_ids in evidence table:', allTargetIds);

    return evidence;
}

export function getAllGoals(): Goal[] {
    const db = getDb();
    return db.prepare(`
        SELECT * FROM goals ORDER BY last_mentioned DESC
    `).all() as Goal[];
}

// =============================================================================
// Full Profile Reset (for re-analysis)
// =============================================================================

export function clearAllProfileData(_conversationId: string): void {
    const db = getDb();

    // Clear in order respecting foreign keys
    // Note: Currently clears all profile data globally (single-user app)
    db.exec(`
        DELETE FROM evidence;
        DELETE FROM extractions;
        DELETE FROM psychological_signals;
        DELETE FROM maslow_signals;
        DELETE FROM user_values;
        DELETE FROM challenges;
        DELETE FROM goals;
    `);
}

export function getUserMessagesForConversation(conversationId: string): { id: string; content: string }[] {
    const db = getDb();
    return db.prepare(`
        SELECT id, content FROM messages
        WHERE conversation_id = ? AND role = 'user'
        ORDER BY created_at ASC
    `).all(conversationId) as { id: string; content: string }[];
}

// =============================================================================
// Profile Summary for Self-Portrait View (Phase 3)
// =============================================================================

export function getFullProfileSummary(): FullProfileSummary {
    const db = getDb();

    // Get counts for each category
    const valuesCount = (db.prepare(`SELECT COUNT(*) as count FROM user_values`).get() as { count: number }).count;
    const challengesCount = (db.prepare(`SELECT COUNT(*) as count FROM challenges WHERE status = 'active'`).get() as { count: number }).count;
    const goalsCount = (db.prepare(`SELECT COUNT(*) as count FROM goals WHERE status IN ('stated', 'in_progress')`).get() as { count: number }).count;
    const signalsCount = (db.prepare(`SELECT COUNT(*) as count FROM psychological_signals`).get() as { count: number }).count;

    // Get actual values (top 10 by confidence)
    const values = db.prepare(`
        SELECT id, name, description, confidence
        FROM user_values
        ORDER BY confidence DESC, last_reinforced DESC
        LIMIT 10
    `).all() as ProfileValueItem[];

    // Get actual challenges (active ones)
    const challenges = db.prepare(`
        SELECT id, description, status
        FROM challenges
        WHERE status = 'active'
        ORDER BY last_mentioned DESC
        LIMIT 10
    `).all() as ProfileChallengeItem[];

    // Get actual goals (active ones)
    const goals = db.prepare(`
        SELECT id, description, status, timeframe
        FROM goals
        WHERE status IN ('stated', 'in_progress')
        ORDER BY last_mentioned DESC
        LIMIT 10
    `).all() as ProfileGoalItem[];

    // Get psychological signals (excluding intent patterns and life situation details)
    const signals = db.prepare(`
        SELECT id, dimension, value, confidence
        FROM psychological_signals
        WHERE dimension NOT LIKE 'intent.%'
        AND dimension NOT LIKE 'life_situation.%'
        ORDER BY confidence DESC, last_updated DESC
        LIMIT 15
    `).all() as ProfileSignalItem[];

    // Get Maslow concerns (deduplicated by level)
    const maslowSignals = db.prepare(`
        SELECT level, MAX(description) as description
        FROM maslow_signals
        WHERE signal_type = 'concern'
        GROUP BY level
        ORDER BY MAX(created_at) DESC
        LIMIT 5
    `).all() as { level: string; description: string | null }[];
    const maslowConcerns = maslowSignals.map(s => s.level);

    // Get narrative summary from profile_summary table if it exists
    const summaryRow = db.prepare(`SELECT * FROM profile_summary WHERE id = 1`).get() as {
        computed_summary?: string;
        narrative_summary?: string;
        updated_at?: string;
    } | undefined;

    let narrativeSummary: {
        identity_summary?: string;
        current_phase?: string;
        primary_concerns?: string[];
        emotional_baseline?: string;
        patterns_to_watch?: string[];
        recent_wins?: string[];
        recent_struggles?: string[];
    } | null = null;

    if (summaryRow?.narrative_summary) {
        try {
            narrativeSummary = JSON.parse(summaryRow.narrative_summary);
        } catch {
            // Invalid JSON, ignore
        }
    }

    // Determine if we have meaningful data
    const hasData = valuesCount > 0 || challengesCount > 0 || goalsCount > 0 || signalsCount > 0 || maslowSignals.length > 0;

    // Get the most recent update timestamp
    const latestMessage = db.prepare(`
        SELECT created_at FROM messages ORDER BY created_at DESC LIMIT 1
    `).get() as { created_at: string } | undefined;

    return {
        // Narrative (from LLM synthesis, may be null)
        identity_summary: narrativeSummary?.identity_summary ?? null,
        current_phase: narrativeSummary?.current_phase ?? null,
        primary_concerns: narrativeSummary?.primary_concerns ?? [],
        emotional_baseline: narrativeSummary?.emotional_baseline ?? null,
        patterns_to_watch: narrativeSummary?.patterns_to_watch ?? [],
        recent_wins: narrativeSummary?.recent_wins ?? [],
        recent_struggles: narrativeSummary?.recent_struggles ?? [],

        // Actual items
        values,
        challenges,
        goals,
        signals,

        // Computed counts
        values_count: valuesCount,
        challenges_count: challengesCount,
        goals_count: goalsCount,
        signals_count: signalsCount,
        maslow_concerns: maslowConcerns,

        // Metadata
        has_data: hasData,
        last_updated: latestMessage?.created_at ?? null,
    };
}
