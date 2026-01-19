import type { AdminSignal } from '../../shared/types';

// Map dimension prefixes to tiers
const TIER_MAP: Record<string, number> = {
    'life_situation': 1,
    'intent': 1,
    'support_seeking_style': 1,
    'moral': 2,
    'big_five': 3,
    'risk_tolerance': 3,
    'motivation_style': 3,
    'attachment_style': 4,
    'locus_of_control': 4,
    'temporal_orientation': 4,
    'growth_mindset': 4,
    'change_readiness': 4,
    'stress_response': 4,
    'emotional_regulation': 4,
    'self_efficacy': 4,
};

export const TIER_INFO: Record<number, { name: string; description: string }> = {
    1: { name: 'Essential', description: 'Avoid bad advice; gather first' },
    2: { name: 'Early Inference', description: 'Improve personalization' },
    3: { name: 'Personality', description: 'Frame advice delivery' },
    4: { name: 'Deeper Patterns', description: 'Emerge over time' },
};

export function getTierForDimension(dimension: string): number {
    // Extract the prefix (before the first dot, or the whole thing)
    const prefix = dimension.split('.')[0];
    return TIER_MAP[prefix] || 4; // Default to tier 4 if unknown
}

export function groupSignalsByTier(signals: AdminSignal[]): Record<number, AdminSignal[]> {
    const grouped: Record<number, AdminSignal[]> = { 1: [], 2: [], 3: [], 4: [] };

    for (const signal of signals) {
        // Skip conversation-specific intent signals
        if (signal.dimension.startsWith('intent.') && !signal.dimension.startsWith('intent.pattern.')) {
            continue;
        }
        const tier = getTierForDimension(signal.dimension);
        if (!grouped[tier]) grouped[tier] = [];
        grouped[tier].push(signal);
    }

    return grouped;
}

export function formatDimensionName(dimension: string): string {
    // Remove prefix and convert to human-readable
    // e.g., "life_situation.work_status" -> "Work Status"
    // e.g., "big_five.openness" -> "Openness"

    const parts = dimension.split('.');
    const lastPart = parts[parts.length - 1];

    // Handle intent.pattern.* specially
    if (dimension.startsWith('intent.pattern.')) {
        return `Intent Pattern: ${formatSnakeCase(parts[2])}`;
    }

    // Use the last meaningful part
    return formatSnakeCase(lastPart);
}

function formatSnakeCase(str: string): string {
    return str
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 0.7) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
}

export function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}
