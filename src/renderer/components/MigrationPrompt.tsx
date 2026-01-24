import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import type { MigrationStatus } from '../../shared/types';

interface MigrationPromptProps {
    migrationStatus: MigrationStatus;
    onClaimData: () => Promise<void>;
    onStartFresh: () => void;
}

export function MigrationPrompt({ migrationStatus, onClaimData, onStartFresh }: MigrationPromptProps) {
    const { theme, isDark } = useTheme();
    const [isClaiming, setIsClaiming] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleClaim = async () => {
        setIsClaiming(true);
        setError(null);
        try {
            await onClaimData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to claim data');
            setIsClaiming(false);
        }
    };

    const { counts } = migrationStatus;
    const totalItems = counts.conversations + counts.values + counts.challenges + counts.goals;

    const containerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: isDark
            ? `radial-gradient(ellipse at center, ${theme.colors.surface} 0%, ${theme.colors.background} 70%)`
            : 'radial-gradient(ellipse at center, #fdfcfb 0%, #f5f0e8 70%)',
        padding: 24,
    };

    const cardStyle: React.CSSProperties = {
        width: 440,
        maxWidth: '90vw',
        background: isDark
            ? `linear-gradient(180deg, ${theme.colors.surface} 0%, ${theme.colors.background} 100%)`
            : 'linear-gradient(180deg, #fdfcfb 0%, #f8f5f0 100%)',
        borderRadius: 16,
        padding: 32,
        boxShadow: isDark
            ? '0 20px 60px rgba(0, 0, 0, 0.5)'
            : '0 20px 60px rgba(61, 54, 48, 0.2)',
        border: `1px solid ${theme.colors.border}`,
    };

    const iconContainerStyle: React.CSSProperties = {
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: theme.colors.accentSoft,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px',
    };

    const titleStyle: React.CSSProperties = {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: 24,
        fontWeight: 400,
        color: theme.colors.textPrimary,
        textAlign: 'center',
        marginBottom: 8,
    };

    const subtitleStyle: React.CSSProperties = {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 14,
        color: theme.colors.textMuted,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 1.5,
    };

    const dataCardStyle: React.CSSProperties = {
        background: isDark ? theme.colors.background : '#fff',
        border: `1px solid ${theme.colors.border}`,
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
    };

    const dataItemStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 0',
        borderBottom: `1px solid ${theme.colors.border}`,
    };

    const dataLabelStyle: React.CSSProperties = {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 14,
        color: theme.colors.textSecondary,
    };

    const dataValueStyle: React.CSSProperties = {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: 16,
        fontWeight: 500,
        color: theme.colors.textPrimary,
    };

    const primaryButtonStyle: React.CSSProperties = {
        width: '100%',
        padding: '14px 20px',
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: 16,
        fontWeight: 500,
        color: '#fff',
        background: `linear-gradient(135deg, ${theme.colors.accent} 0%, #a07850 100%)`,
        border: 'none',
        borderRadius: 10,
        cursor: isClaiming ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        opacity: isClaiming ? 0.7 : 1,
        boxShadow: `0 4px 12px ${theme.colors.accentSoft}`,
    };

    const secondaryButtonStyle: React.CSSProperties = {
        width: '100%',
        padding: '12px 20px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 14,
        color: theme.colors.textMuted,
        background: 'transparent',
        border: `1px solid ${theme.colors.border}`,
        borderRadius: 10,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        marginTop: 12,
    };

    return (
        <div style={containerStyle}>
            <div style={cardStyle}>
                {/* Logo */}
                <div style={iconContainerStyle}>
                    <svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={theme.colors.accent}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                    </svg>
                </div>

                <h2 style={titleStyle}>Welcome Back</h2>
                <p style={subtitleStyle}>
                    We found your existing reflections. Would you like to claim them for your new profile?
                </p>

                {/* Data Summary */}
                <div style={dataCardStyle}>
                    <div style={{ ...dataItemStyle }}>
                        <span style={dataLabelStyle}>Conversations</span>
                        <span style={dataValueStyle}>{counts.conversations}</span>
                    </div>
                    <div style={dataItemStyle}>
                        <span style={dataLabelStyle}>Values Discovered</span>
                        <span style={dataValueStyle}>{counts.values}</span>
                    </div>
                    <div style={dataItemStyle}>
                        <span style={dataLabelStyle}>Challenges Identified</span>
                        <span style={dataValueStyle}>{counts.challenges}</span>
                    </div>
                    <div style={{ ...dataItemStyle, borderBottom: 'none' }}>
                        <span style={dataLabelStyle}>Goals Set</span>
                        <span style={dataValueStyle}>{counts.goals}</span>
                    </div>
                </div>

                {totalItems > 0 && (
                    <p style={{
                        fontSize: 13,
                        color: theme.colors.textMuted,
                        textAlign: 'center',
                        marginBottom: 20,
                    }}>
                        {totalItems} item{totalItems !== 1 ? 's' : ''} will be linked to your profile
                    </p>
                )}

                {error && (
                    <p style={{
                        color: theme.colors.error,
                        fontSize: 13,
                        marginBottom: 16,
                        textAlign: 'center',
                    }}>
                        {error}
                    </p>
                )}

                <button
                    onClick={handleClaim}
                    disabled={isClaiming}
                    style={primaryButtonStyle}
                    onMouseEnter={(e) => {
                        if (!isClaiming) {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = `0 6px 16px ${theme.colors.accentSoft}`;
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = `0 4px 12px ${theme.colors.accentSoft}`;
                    }}
                >
                    {isClaiming ? 'Claiming Your Reflections...' : 'Claim My Reflections'}
                </button>

                <button
                    onClick={onStartFresh}
                    style={secondaryButtonStyle}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(139, 129, 120, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                    }}
                >
                    Start Fresh Instead
                </button>

                <p style={{
                    fontSize: 12,
                    color: theme.colors.textMuted,
                    textAlign: 'center',
                    marginTop: 16,
                    lineHeight: 1.5,
                }}>
                    Starting fresh will keep your existing data but leave it unassigned.
                    You can claim it later from Settings.
                </p>
            </div>
        </div>
    );
}
