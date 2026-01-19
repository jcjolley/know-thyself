// Neural Observatory Design System
// A dark, clinical interface for viewing psychological profile data

export const adminColors = {
    // Base
    bg: '#0a0e14',
    surface: '#111820',
    surfaceElevated: '#1a2332',
    border: '#2a3545',

    // Text
    textPrimary: '#e6edf3',
    textSecondary: '#7d8590',
    textMuted: '#484f58',

    // Accent
    accent: '#00d9ff',
    accentDim: 'rgba(0, 217, 255, 0.15)',
    accentGlow: 'rgba(0, 217, 255, 0.4)',

    // Confidence colors
    confidenceHigh: '#00ff9d',
    confidenceMedium: '#ffb300',
    confidenceLow: '#5c6370',

    // Tier colors
    tier1: '#ff6b6b',  // Essential - Coral red
    tier2: '#ffd93d',  // Early Inference - Gold
    tier3: '#6bcb77',  // Personality - Sage
    tier4: '#4d96ff',  // Deeper - Electric blue
};

export const adminFonts = {
    display: "'Geist Mono', 'JetBrains Mono', 'Fira Code', monospace",
    body: "'SF Mono', 'Cascadia Code', 'Consolas', monospace",
};

export const tierColors: Record<number, string> = {
    1: adminColors.tier1,
    2: adminColors.tier2,
    3: adminColors.tier3,
    4: adminColors.tier4,
};

export function getConfidenceColor(level: 'high' | 'medium' | 'low'): string {
    switch (level) {
        case 'high': return adminColors.confidenceHigh;
        case 'medium': return adminColors.confidenceMedium;
        case 'low': return adminColors.confidenceLow;
    }
}

export const baseContainerStyle: React.CSSProperties = {
    height: '100%',
    background: adminColors.bg,
    color: adminColors.textPrimary,
    fontFamily: adminFonts.body,
    fontSize: 14,
    overflowY: 'auto',
};

export const pageContainerStyle: React.CSSProperties = {
    maxWidth: 1200,
    margin: '0 auto',
    padding: 24,
};

export function createTierSectionStyles(tier: number, expanded: boolean): {
    container: React.CSSProperties;
    header: React.CSSProperties;
    title: React.CSSProperties;
    description: React.CSSProperties;
    count: React.CSSProperties;
    chevron: React.CSSProperties;
    content: React.CSSProperties;
} {
    const color = tierColors[tier] || adminColors.accent;

    return {
        container: {
            marginBottom: 16,
            background: adminColors.surface,
            border: `1px solid ${adminColors.border}`,
            borderLeft: `3px solid ${color}`,
            borderRadius: 4,
            overflow: 'hidden',
        },
        header: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            cursor: 'pointer',
            transition: 'background 0.15s',
        },
        title: {
            fontFamily: adminFonts.display,
            fontSize: 12,
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.1em',
            color: adminColors.textPrimary,
        },
        description: {
            fontSize: 11,
            color: adminColors.textMuted,
            marginLeft: 12,
            fontStyle: 'italic',
        },
        count: {
            fontSize: 12,
            color: adminColors.textSecondary,
            marginRight: 8,
        },
        chevron: {
            fontSize: 12,
            color: adminColors.textMuted,
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease-out',
        },
        content: {
            display: expanded ? 'block' : 'none',
            padding: 16,
            borderTop: `1px solid ${adminColors.border}`,
        },
    };
}

function getConfidenceFillColor(confidence: number): string {
    if (confidence >= 0.7) return adminColors.confidenceHigh;
    if (confidence >= 0.5) return adminColors.confidenceMedium;
    return adminColors.confidenceLow;
}

export function createSignalCardStyles(confidence: number): {
    card: React.CSSProperties;
    dimension: React.CSSProperties;
    value: React.CSSProperties;
    confidenceBar: React.CSSProperties;
    confidenceFill: React.CSSProperties;
    footer: React.CSSProperties;
} {
    return {
        card: {
            background: adminColors.surfaceElevated,
            border: `1px solid ${adminColors.border}`,
            borderRadius: 4,
            padding: 16,
            transition: 'box-shadow 0.15s',
        },
        dimension: {
            fontSize: 11,
            fontFamily: adminFonts.display,
            color: adminColors.accent,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
            marginBottom: 8,
        },
        value: {
            fontSize: 18,
            fontWeight: 600,
            color: adminColors.textPrimary,
            marginBottom: 12,
        },
        confidenceBar: {
            height: 4,
            background: adminColors.border,
            borderRadius: 2,
            marginBottom: 12,
            overflow: 'hidden',
        },
        confidenceFill: {
            height: '100%',
            width: `${confidence * 100}%`,
            background: getConfidenceFillColor(confidence),
            borderRadius: 2,
            transition: 'width 0.3s ease-out',
        },
        footer: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 11,
            color: adminColors.textMuted,
        },
    };
}

export const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 16,
};

export const emptyStateStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '40px 20px',
    color: adminColors.textMuted,
};

export const evidenceListStyle: React.CSSProperties = {
    marginTop: 12,
    paddingTop: 12,
    borderTop: `1px solid ${adminColors.border}`,
};

export const evidenceItemStyle: React.CSSProperties = {
    padding: '8px 0 8px 12px',
    borderLeft: `2px solid ${adminColors.accentDim}`,
    marginBottom: 8,
};

export const evidenceQuoteStyle: React.CSSProperties = {
    fontStyle: 'italic',
    color: adminColors.textSecondary,
    fontSize: 13,
    lineHeight: 1.5,
};

export const evidenceIdStyle: React.CSSProperties = {
    fontSize: 10,
    color: adminColors.textMuted,
    fontFamily: adminFonts.display,
    marginTop: 4,
    textAlign: 'right' as const,
};

export const buttonStyle: React.CSSProperties = {
    background: 'transparent',
    border: `1px solid ${adminColors.border}`,
    color: adminColors.textSecondary,
    padding: '6px 12px',
    borderRadius: 3,
    fontSize: 11,
    cursor: 'pointer',
    transition: 'border-color 0.15s, color 0.15s',
};

export const loadingStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: adminColors.textMuted,
};

export const errorStyle: React.CSSProperties = {
    padding: 20,
    margin: 20,
    background: 'rgba(255, 107, 107, 0.1)',
    border: `1px solid ${adminColors.tier1}`,
    borderRadius: 4,
    color: adminColors.tier1,
};
