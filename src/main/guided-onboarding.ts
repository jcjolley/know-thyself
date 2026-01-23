/**
 * Guided onboarding system for priority-driven psychological data gathering.
 * Manages guided mode state, priority calculation, and exit conditions.
 */

import type { AxisName } from './completeness.js';
import { getAxisCompleteness, getAllAxisCompleteness } from './completeness.js';

// =============================================================================
// Constants and Types
// =============================================================================

export const IMPORTANCE_WEIGHTS: Record<AxisName, number> = {
    // Tier 1: Essential - gather first to avoid bad advice
    maslow_status: 1.0,
    support_seeking_style: 1.0,
    life_situation: 0.9,
    immediate_intent: 0.9,
    // Tier 2: Early Inference - improve personalization
    core_values: 0.85,
    current_challenges: 0.8,
    goals: 0.75,
    moral_foundations: 0.7,
    // Tier 3: Personality - frame advice delivery
    big_five: 0.6,
    risk_tolerance: 0.55,
    motivation_style: 0.5,
    // Tier 4: Deeper Patterns - emerge over time
    attachment_style: 0.4,
    locus_of_control: 0.4,
    temporal_orientation: 0.35,
    growth_mindset: 0.3,
    change_readiness: 0.3,
    stress_response: 0.25,
    emotional_regulation: 0.25,
    self_efficacy: 0.25,
};

// Tier definitions for baseline checking
export const TIER_1_AXES: AxisName[] = [
    'maslow_status',
    'support_seeking_style',
    'life_situation',
    'immediate_intent',
];

export const TIER_2_AXES: AxisName[] = [
    'core_values',
    'current_challenges',
    'goals',
    'moral_foundations',
];

// Baseline thresholds
export const TIER_1_THRESHOLD = 0.5;  // All Tier 1 axes must be >= 0.5
export const TIER_2_THRESHOLD = 0.3;  // At least 2 Tier 2 axes must be >= 0.3
export const MAX_GUIDED_TURNS = 7;

// Diversion detection markers
const DIVERSION_MARKERS = [
    'help me with',
    'i want to talk about',
    'can we discuss',
    'i need advice',
    'what should i do about',
    'i\'m struggling with',
    'i\'ve been thinking about',
    'something happened',
    'i just found out',
    'i\'m worried about',
    'i need to figure out',
    'i have a question about',
];

export interface AxisPriority {
    axis: AxisName;
    importance: number;
    completeness: number;
    priority: number;  // importance * (1 - completeness)
}

export interface GuidedModeState {
    isActive: boolean;
    turnCount: number;
    lastQuestionAxis: AxisName | null;
    deactivationReason: 'baseline_met' | 'user_diverted' | 'max_turns' | null;
}

export interface BaselineStatus {
    tier1Met: boolean;
    tier2Met: boolean;
    baselineComplete: boolean;
    details: {
        tier1Axes: { axis: AxisName; completeness: number }[];
        tier2Axes: { axis: AxisName; completeness: number }[];
    };
}

// =============================================================================
// Priority Calculation
// =============================================================================

/**
 * Calculate priority for a single axis.
 * Priority = importance * (1 - completeness)
 */
export function calculateAxisPriority(axis: AxisName): AxisPriority {
    const { completeness } = getAxisCompleteness(axis);
    const importance = IMPORTANCE_WEIGHTS[axis];
    const priority = importance * (1 - completeness);

    return {
        axis,
        importance,
        completeness,
        priority,
    };
}

/**
 * Calculate priority for all axes.
 */
export function calculateAllPriorities(): AxisPriority[] {
    return getAllAxisCompleteness().map(({ axis, completeness }) => ({
        axis,
        importance: IMPORTANCE_WEIGHTS[axis],
        completeness,
        priority: IMPORTANCE_WEIGHTS[axis] * (1 - completeness),
    }));
}

/**
 * Get the highest priority axis that needs data.
 * Returns null if all axes are complete (priority = 0 for all).
 */
export function getHighestPriorityAxis(): AxisPriority | null {
    const priorities = calculateAllPriorities();

    // Sort by priority descending
    priorities.sort((a, b) => b.priority - a.priority);

    // Return highest priority if it's > 0
    if (priorities.length > 0 && priorities[0].priority > 0) {
        return priorities[0];
    }

    return null;
}

// =============================================================================
// Guided Mode State Management
// =============================================================================

// In-memory state per conversation
const guidedModeStates = new Map<string, GuidedModeState>();

/**
 * Initialize or get state for a conversation.
 * New conversations start with guided mode active.
 */
export function getGuidedModeState(conversationId: string): GuidedModeState {
    let state = guidedModeStates.get(conversationId);

    if (!state) {
        state = {
            isActive: true,
            turnCount: 0,
            lastQuestionAxis: null,
            deactivationReason: null,
        };
        guidedModeStates.set(conversationId, state);
    }

    return state;
}

/**
 * Update state for a conversation.
 */
export function updateGuidedModeState(
    conversationId: string,
    updates: Partial<GuidedModeState>
): void {
    const state = getGuidedModeState(conversationId);
    Object.assign(state, updates);
}

/**
 * Increment turn count for guided mode.
 */
export function incrementGuidedTurn(conversationId: string): void {
    const state = getGuidedModeState(conversationId);
    state.turnCount++;

    // Check if max turns reached
    if (state.turnCount >= MAX_GUIDED_TURNS && state.isActive) {
        state.isActive = false;
        state.deactivationReason = 'max_turns';
    }
}

/**
 * Check if guided mode should be active for a conversation.
 * Takes into account turn count, baseline status, and previous deactivation.
 */
export function shouldBeGuidedMode(conversationId: string): boolean {
    const state = getGuidedModeState(conversationId);

    // Already deactivated
    if (!state.isActive) {
        return false;
    }

    // Max turns reached
    if (state.turnCount >= MAX_GUIDED_TURNS) {
        return false;
    }

    // Check baseline
    const baseline = checkBaselineStatus();
    if (baseline.baselineComplete) {
        return false;
    }

    return true;
}

/**
 * Clear guided mode state for a conversation (e.g., when conversation is deleted).
 */
export function clearGuidedModeState(conversationId: string): void {
    guidedModeStates.delete(conversationId);
}

// =============================================================================
// Baseline and Exit Condition Detection
// =============================================================================

/**
 * Check if baseline data requirements are met.
 * Baseline = all Tier 1 axes >= 0.5 AND at least 2 Tier 2 axes >= 0.3
 */
export function checkBaselineStatus(): BaselineStatus {
    const tier1Axes = TIER_1_AXES.map(axis => ({
        axis,
        completeness: getAxisCompleteness(axis).completeness,
    }));

    const tier2Axes = TIER_2_AXES.map(axis => ({
        axis,
        completeness: getAxisCompleteness(axis).completeness,
    }));

    const tier1Met = tier1Axes.every(a => a.completeness >= TIER_1_THRESHOLD);
    const tier2MetCount = tier2Axes.filter(a => a.completeness >= TIER_2_THRESHOLD).length;
    const tier2Met = tier2MetCount >= 2;

    return {
        tier1Met,
        tier2Met,
        baselineComplete: tier1Met && tier2Met,
        details: {
            tier1Axes,
            tier2Axes,
        },
    };
}

/**
 * Detect if user is diverting from guided flow to their own topic.
 * Returns true if user appears to have their own specific topic to discuss.
 */
export function detectUserDiversion(
    userMessage: string,
    lastQuestionAxis: AxisName | null
): boolean {
    const messageLower = userMessage.toLowerCase();

    // Check for explicit diversion markers
    for (const marker of DIVERSION_MARKERS) {
        if (messageLower.includes(marker)) {
            return true;
        }
    }

    // Check for question marks (user asking their own questions)
    if (messageLower.includes('?') && messageLower.length > 20) {
        // Longer messages with questions are likely user-driven
        return true;
    }

    // Check for emotional urgency markers
    const urgencyMarkers = ['urgent', 'emergency', 'help', 'crisis', 'need to talk'];
    for (const marker of urgencyMarkers) {
        if (messageLower.includes(marker)) {
            return true;
        }
    }

    // If we just asked about a specific axis and the response is very short,
    // it's probably a direct answer, not a diversion
    if (lastQuestionAxis && messageLower.length < 50) {
        return false;
    }

    // Long messages (100+ chars) that aren't direct answers are likely user-driven topics
    if (messageLower.length > 100) {
        return true;
    }

    return false;
}

/**
 * Process a user message and update guided mode state accordingly.
 * Returns whether guided mode should be active for the response.
 */
export function processUserMessageForGuidedMode(
    conversationId: string,
    userMessage: string
): { isGuidedMode: boolean; suggestedAxis: AxisName | null } {
    const state = getGuidedModeState(conversationId);

    // Check for diversion
    if (state.isActive && detectUserDiversion(userMessage, state.lastQuestionAxis)) {
        updateGuidedModeState(conversationId, {
            isActive: false,
            deactivationReason: 'user_diverted',
        });
        return { isGuidedMode: false, suggestedAxis: null };
    }

    // Increment turn count
    incrementGuidedTurn(conversationId);

    // Check if still in guided mode
    const shouldContinue = shouldBeGuidedMode(conversationId);

    if (!shouldContinue) {
        // Check why we're stopping
        const baseline = checkBaselineStatus();
        if (baseline.baselineComplete && state.deactivationReason === null) {
            updateGuidedModeState(conversationId, {
                isActive: false,
                deactivationReason: 'baseline_met',
            });
        }
        return { isGuidedMode: false, suggestedAxis: null };
    }

    // Get highest priority axis for next question
    const priorityAxis = getHighestPriorityAxis();
    const suggestedAxis = priorityAxis?.axis ?? null;

    // Update last question axis
    if (suggestedAxis) {
        updateGuidedModeState(conversationId, {
            lastQuestionAxis: suggestedAxis,
        });
    }

    return { isGuidedMode: true, suggestedAxis };
}
