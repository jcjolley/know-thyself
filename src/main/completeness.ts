/**
 * Axis completeness calculation for guided onboarding.
 * Calculates how complete our data is for each psychological axis (0.0 to 1.0).
 */

import { getDb } from './db/sqlite.js';

export type AxisName =
    // Tier 1: Essential (gather first to avoid bad advice)
    | 'maslow_status'
    | 'support_seeking_style'
    | 'life_situation'
    | 'immediate_intent'
    // Tier 2: Early Inference (improve personalization)
    | 'core_values'
    | 'current_challenges'
    | 'goals'
    | 'moral_foundations'
    // Tier 3: Personality & Disposition (frame advice delivery)
    | 'big_five'
    | 'risk_tolerance'
    | 'motivation_style'
    // Tier 4: Deeper Patterns (emerge over time)
    | 'attachment_style'
    | 'locus_of_control'
    | 'temporal_orientation'
    | 'growth_mindset'
    | 'change_readiness'
    | 'stress_response'
    | 'emotional_regulation'
    | 'self_efficacy';

export interface AxisCompleteness {
    axis: AxisName;
    completeness: number;  // 0.0 to 1.0
    reason: string;        // Human-readable explanation
}

// Confidence threshold for "good" data
const CONFIDENCE_THRESHOLD = 0.7;

/**
 * Get completeness for a single axis.
 */
export function getAxisCompleteness(axis: AxisName): AxisCompleteness {
    switch (axis) {
        case 'maslow_status':
            return getMaslowCompleteness();
        case 'support_seeking_style':
            return getSupportStyleCompleteness();
        case 'life_situation':
            return getLifeSituationCompleteness();
        case 'immediate_intent':
            return getImmediateIntentCompleteness();
        case 'core_values':
            return getCoreValuesCompleteness();
        case 'current_challenges':
            return getChallengesCompleteness();
        case 'goals':
            return getGoalsCompleteness();
        case 'moral_foundations':
            return getMoralFoundationsCompleteness();
        case 'big_five':
            return getBigFiveCompleteness();
        case 'risk_tolerance':
            return getSingleSignalCompleteness('risk_tolerance');
        case 'motivation_style':
            return getSingleSignalCompleteness('motivation_style');
        case 'attachment_style':
            return getSingleSignalCompleteness('attachment_style');
        case 'locus_of_control':
            return getSingleSignalCompleteness('locus_of_control');
        case 'temporal_orientation':
            return getSingleSignalCompleteness('temporal_orientation');
        case 'growth_mindset':
            return getSingleSignalCompleteness('growth_mindset');
        case 'change_readiness':
            return getSingleSignalCompleteness('change_readiness');
        case 'stress_response':
            return getSingleSignalCompleteness('stress_response');
        case 'emotional_regulation':
            return getSingleSignalCompleteness('emotional_regulation');
        case 'self_efficacy':
            return getSingleSignalCompleteness('self_efficacy');
        default:
            return { axis, completeness: 0, reason: 'Unknown axis' };
    }
}

/**
 * Get completeness for all axes.
 */
export function getAllAxisCompleteness(): AxisCompleteness[] {
    const axes: AxisName[] = [
        // Tier 1: Essential
        'maslow_status',
        'support_seeking_style',
        'life_situation',
        'immediate_intent',
        // Tier 2: Early Inference
        'core_values',
        'current_challenges',
        'goals',
        'moral_foundations',
        // Tier 3: Personality
        'big_five',
        'risk_tolerance',
        'motivation_style',
        // Tier 4: Deeper Patterns
        'attachment_style',
        'locus_of_control',
        'temporal_orientation',
        'growth_mindset',
        'change_readiness',
        'stress_response',
        'emotional_regulation',
        'self_efficacy',
    ];

    return axes.map(axis => getAxisCompleteness(axis));
}

// =============================================================================
// Per-Axis Completeness Calculations
// =============================================================================

/**
 * Maslow Status Completeness:
 * 0% - No signals
 * 25% - General sense (1 signal)
 * 50% - 1-2 level concerns
 * 75% - Specific concerns with context (3+ levels)
 * 100% - Full picture: 4+ levels with both concerns AND stable signals
 */
function getMaslowCompleteness(): AxisCompleteness {
    const db = getDb();

    const concerns = db.prepare(`
        SELECT DISTINCT level FROM maslow_signals WHERE signal_type = 'concern'
    `).all() as { level: string }[];

    const stables = db.prepare(`
        SELECT DISTINCT level FROM maslow_signals WHERE signal_type = 'stable'
    `).all() as { level: string }[];

    const totalSignals = concerns.length + stables.length;
    const uniqueLevels = new Set([...concerns.map(c => c.level), ...stables.map(s => s.level)]);

    if (totalSignals === 0) {
        return { axis: 'maslow_status', completeness: 0, reason: 'No Maslow signals detected' };
    }

    // Full picture: 4+ levels with both concerns and stable signals
    if (uniqueLevels.size >= 4 && concerns.length > 0 && stables.length > 0) {
        return { axis: 'maslow_status', completeness: 1.0, reason: `Full picture: ${uniqueLevels.size} levels with concerns and stable areas` };
    }

    // Specific concerns with context: 3+ levels
    if (uniqueLevels.size >= 3) {
        return { axis: 'maslow_status', completeness: 0.75, reason: `Good coverage: ${uniqueLevels.size} levels identified` };
    }

    // 1-2 level concerns
    if (concerns.length >= 1) {
        return { axis: 'maslow_status', completeness: 0.5, reason: `${concerns.length} concern area(s) identified` };
    }

    // General sense
    return { axis: 'maslow_status', completeness: 0.25, reason: 'Some Maslow context available' };
}

/**
 * Support-Seeking Style Completeness:
 * 0% - No signal
 * 50% - Have a guess (low confidence)
 * 100% - Explicitly stated or clearly demonstrated (confidence >= 0.7)
 */
function getSupportStyleCompleteness(): AxisCompleteness {
    const db = getDb();

    const signal = db.prepare(`
        SELECT value, confidence FROM psychological_signals WHERE dimension = 'support_seeking_style'
    `).get() as { value: string; confidence: number } | undefined;

    if (!signal) {
        return { axis: 'support_seeking_style', completeness: 0, reason: 'No support style signal detected' };
    }

    if (signal.confidence >= CONFIDENCE_THRESHOLD) {
        return { axis: 'support_seeking_style', completeness: 1.0, reason: `Clear style: ${signal.value} (high confidence)` };
    }

    return { axis: 'support_seeking_style', completeness: 0.5, reason: `Tentative style: ${signal.value} (needs confirmation)` };
}

/**
 * Life Situation Completeness:
 * 0% - Nothing known
 * 25% - 1 dimension
 * 50% - 2-3 dimensions
 * 75% - Most dimensions
 * 100% - 4+ dimensions known
 */
function getLifeSituationCompleteness(): AxisCompleteness {
    const db = getDb();

    const dimensions = db.prepare(`
        SELECT DISTINCT dimension FROM psychological_signals WHERE dimension LIKE 'life_situation.%'
    `).all() as { dimension: string }[];

    const count = dimensions.length;

    if (count === 0) {
        return { axis: 'life_situation', completeness: 0, reason: 'No life situation data' };
    }

    if (count >= 4) {
        return { axis: 'life_situation', completeness: 1.0, reason: `Rich context: ${count} dimensions known` };
    }

    if (count >= 3) {
        return { axis: 'life_situation', completeness: 0.75, reason: `Good context: ${count} dimensions known` };
    }

    if (count >= 2) {
        return { axis: 'life_situation', completeness: 0.5, reason: `Partial context: ${count} dimensions known` };
    }

    return { axis: 'life_situation', completeness: 0.25, reason: `Limited context: 1 dimension known` };
}

/**
 * Immediate Intent Completeness:
 * This is session-scoped, so we check for any intent patterns.
 * 0% - No idea
 * 50% - General sense (any intent signal)
 * 100% - Clear understanding (high confidence intent)
 */
function getImmediateIntentCompleteness(): AxisCompleteness {
    const db = getDb();

    // Check for intent patterns (cross-conversation patterns)
    const patterns = db.prepare(`
        SELECT COUNT(DISTINCT dimension) as count FROM psychological_signals WHERE dimension LIKE 'intent.pattern.%'
    `).get() as { count: number };

    if (patterns.count === 0) {
        return { axis: 'immediate_intent', completeness: 0, reason: 'No intent patterns detected' };
    }

    if (patterns.count >= 2) {
        return { axis: 'immediate_intent', completeness: 1.0, reason: `Clear patterns: ${patterns.count} types observed` };
    }

    return { axis: 'immediate_intent', completeness: 0.5, reason: 'Some intent context available' };
}

/**
 * Core Values Completeness:
 * 0% - No signals
 * 25% - 1-2 values
 * 50% - 3-4 values ranked
 * 75% - Clear hierarchy
 * 100% - Full profile with stated vs revealed
 */
function getCoreValuesCompleteness(): AxisCompleteness {
    const db = getDb();

    const values = db.prepare(`
        SELECT id, value_type, confidence FROM user_values ORDER BY confidence DESC
    `).all() as { id: string; value_type: string; confidence: number }[];

    const count = values.length;

    if (count === 0) {
        return { axis: 'core_values', completeness: 0, reason: 'No values detected' };
    }

    const hasStated = values.some(v => v.value_type === 'stated');
    const hasRevealed = values.some(v => v.value_type === 'revealed');
    const hasHighConfidence = values.some(v => v.confidence >= CONFIDENCE_THRESHOLD);

    // Full profile: 5+ values with both stated and revealed, high confidence
    if (count >= 5 && hasStated && hasRevealed && hasHighConfidence) {
        return { axis: 'core_values', completeness: 1.0, reason: `Full profile: ${count} values (stated and revealed)` };
    }

    // Clear hierarchy: 5+ values or high confidence
    if (count >= 5 || (count >= 3 && hasHighConfidence)) {
        return { axis: 'core_values', completeness: 0.75, reason: `Good coverage: ${count} values identified` };
    }

    // 3-4 values
    if (count >= 3) {
        return { axis: 'core_values', completeness: 0.5, reason: `Moderate coverage: ${count} values identified` };
    }

    return { axis: 'core_values', completeness: 0.25, reason: `Limited: ${count} value(s) identified` };
}

/**
 * Current Challenges Completeness:
 * 0% - None
 * 50% - 1-2 main challenges
 * 100% - Clear picture with context (3+ challenges or high mention count)
 */
function getChallengesCompleteness(): AxisCompleteness {
    const db = getDb();

    const challenges = db.prepare(`
        SELECT id, mention_count FROM challenges WHERE status = 'active'
    `).all() as { id: string; mention_count: number }[];

    const count = challenges.length;

    if (count === 0) {
        return { axis: 'current_challenges', completeness: 0, reason: 'No challenges detected' };
    }

    const hasRecurring = challenges.some(c => c.mention_count >= 2);

    if (count >= 3 || (count >= 2 && hasRecurring)) {
        return { axis: 'current_challenges', completeness: 1.0, reason: `Clear picture: ${count} active challenges` };
    }

    return { axis: 'current_challenges', completeness: 0.5, reason: `${count} challenge(s) identified` };
}

/**
 * Goals Completeness:
 * 0% - None
 * 50% - 1-2 goals
 * 100% - Clear goals with priority and status (3+ goals or in_progress status)
 */
function getGoalsCompleteness(): AxisCompleteness {
    const db = getDb();

    const goals = db.prepare(`
        SELECT id, status FROM goals WHERE status IN ('stated', 'in_progress')
    `).all() as { id: string; status: string }[];

    const count = goals.length;

    if (count === 0) {
        return { axis: 'goals', completeness: 0, reason: 'No goals detected' };
    }

    const hasInProgress = goals.some(g => g.status === 'in_progress');

    if (count >= 3 || (count >= 1 && hasInProgress)) {
        return { axis: 'goals', completeness: 1.0, reason: `Clear goals: ${count} active goals` };
    }

    return { axis: 'goals', completeness: 0.5, reason: `${count} goal(s) identified` };
}

/**
 * Moral Foundations Completeness:
 * 0% - No signals
 * 50% - 1-2 prominent foundations
 * 100% - Good sense of profile (3+ foundations or high confidence)
 */
function getMoralFoundationsCompleteness(): AxisCompleteness {
    const db = getDb();

    const foundations = db.prepare(`
        SELECT DISTINCT REPLACE(dimension, 'moral.', '') as foundation, confidence
        FROM psychological_signals
        WHERE dimension LIKE 'moral.%'
    `).all() as { foundation: string; confidence: number }[];

    const count = foundations.length;

    if (count === 0) {
        return { axis: 'moral_foundations', completeness: 0, reason: 'No moral foundations detected' };
    }

    const hasHighConfidence = foundations.some(f => f.confidence >= CONFIDENCE_THRESHOLD);

    if (count >= 3 || (count >= 2 && hasHighConfidence)) {
        return { axis: 'moral_foundations', completeness: 1.0, reason: `Good profile: ${count} foundations identified` };
    }

    return { axis: 'moral_foundations', completeness: 0.5, reason: `${count} foundation(s) identified` };
}

/**
 * Big Five Completeness:
 * 0% - No signals
 * 50% - 2-3 traits
 * 100% - Good sense of all five (4-5 traits with reasonable confidence)
 */
function getBigFiveCompleteness(): AxisCompleteness {
    const db = getDb();

    const traits = db.prepare(`
        SELECT DISTINCT REPLACE(dimension, 'big_five.', '') as trait, confidence
        FROM psychological_signals
        WHERE dimension LIKE 'big_five.%'
    `).all() as { trait: string; confidence: number }[];

    const count = traits.length;

    if (count === 0) {
        return { axis: 'big_five', completeness: 0, reason: 'No Big Five traits detected' };
    }

    if (count >= 4) {
        return { axis: 'big_five', completeness: 1.0, reason: `Good coverage: ${count}/5 traits identified` };
    }

    if (count >= 2) {
        return { axis: 'big_five', completeness: 0.5, reason: `Partial coverage: ${count}/5 traits identified` };
    }

    return { axis: 'big_five', completeness: 0.25, reason: `Limited: ${count}/5 traits identified` };
}

/**
 * Single Signal Completeness (for risk_tolerance, motivation_style, etc.):
 * 0% - No signal
 * 50% - General sense (low confidence)
 * 100% - Clear pattern (high confidence)
 */
function getSingleSignalCompleteness(dimension: AxisName): AxisCompleteness {
    const db = getDb();

    const signal = db.prepare(`
        SELECT value, confidence FROM psychological_signals WHERE dimension = ?
    `).get(dimension) as { value: string; confidence: number } | undefined;

    if (!signal) {
        return { axis: dimension, completeness: 0, reason: `No ${dimension.replace('_', ' ')} signal detected` };
    }

    if (signal.confidence >= CONFIDENCE_THRESHOLD) {
        return { axis: dimension, completeness: 1.0, reason: `Clear pattern: ${signal.value}` };
    }

    return { axis: dimension, completeness: 0.5, reason: `Tentative: ${signal.value}` };
}
