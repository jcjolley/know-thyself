import { useState, useEffect } from 'react';
import { ProfileSummary } from './ProfileSummary';
import type { FullProfileSummary } from '../../shared/types';
import { useTheme } from '../contexts/ThemeContext';
import { useApi } from '../contexts/ApiContext';

export function ProfileView() {
    const { theme, isDark } = useTheme();
    const api = useApi();

    // CSS Variables derived from theme
    const cssVars = {
        '--portrait-bg': theme.colors.background,
        '--portrait-card': theme.colors.surface,
        '--portrait-card-inner': isDark ? '#2a2724' : '#fdfcfa',
        '--portrait-card-inner-alt': isDark ? '#2f2b28' : '#f9f7f4',
        '--portrait-border': theme.colors.border,
        '--portrait-text': theme.colors.textPrimary,
        '--portrait-text-muted': theme.colors.textSecondary,
        '--portrait-accent': theme.colors.accent,
        '--portrait-accent-soft': theme.colors.accentSoft,
        '--portrait-success': theme.colors.success,
        '--portrait-success-soft': isDark ? 'rgba(143, 184, 138, 0.15)' : '#e8f5e9',
        '--portrait-warning': theme.colors.accent,
        '--portrait-warning-soft': isDark ? 'rgba(212, 165, 116, 0.15)' : '#fef3e6',
        '--portrait-maslow-soft': isDark ? 'rgba(212, 165, 116, 0.1)' : '#fdf8f4',
        '--portrait-badge-bg': isDark ? '#3a3632' : '#f5f3f0',
        '--portrait-badge-text': isDark ? '#a09890' : '#8b8178',
        '--portrait-confidence-bg': isDark ? '#3a3632' : '#f0ebe4',
        '--portrait-shadow': `0 2px 8px ${theme.colors.shadow}`,
        '--portrait-shadow-hover': `0 4px 16px ${theme.colors.shadow}`,
    } as React.CSSProperties;
    const [summary, setSummary] = useState<FullProfileSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                setIsLoading(true);
                const data = await api.profile.getSummary() as FullProfileSummary;
                setSummary(data);
            } catch (err) {
                console.error('Failed to load profile:', err);
                setError('Unable to load your self-portrait. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        loadProfile();
    }, [api]);

    return (
        <div style={{
            ...cssVars,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: 'var(--portrait-bg)',
            overflowY: 'auto',
        }}>
            <div style={{
                maxWidth: 800,
                width: '100%',
                margin: '0 auto',
                padding: '32px 24px',
            }}>
                {/* Header */}
                <header style={{
                    marginBottom: 32,
                    animation: 'fadeInUp 0.6s ease-out',
                }}>
                    <h1 style={{
                        fontFamily: 'Georgia, "Times New Roman", serif',
                        fontSize: 32,
                        fontWeight: 400,
                        color: 'var(--portrait-text)',
                        marginBottom: 8,
                        letterSpacing: '-0.02em',
                    }}>
                        Your Self-Portrait
                    </h1>
                    <p style={{
                        color: 'var(--portrait-text-muted)',
                        margin: 0,
                        fontSize: 15,
                        lineHeight: 1.6,
                    }}>
                        A reflection of who you are, drawn from our conversations
                    </p>
                </header>

                {/* Loading State */}
                {isLoading && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '80px 24px',
                        animation: 'fadeIn 0.3s ease-out',
                    }}>
                        <div style={{
                            width: 40,
                            height: 40,
                            border: '3px solid var(--portrait-border)',
                            borderTopColor: 'var(--portrait-accent)',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                        }} />
                        <p style={{
                            marginTop: 16,
                            color: 'var(--portrait-text-muted)',
                            fontSize: 14,
                        }}>
                            Gathering your reflections...
                        </p>
                    </div>
                )}

                {/* Error State */}
                {error && !isLoading && (
                    <div style={{
                        padding: 24,
                        background: isDark ? 'rgba(196, 90, 74, 0.1)' : '#fdf6f3',
                        border: `1px solid ${isDark ? 'rgba(196, 90, 74, 0.3)' : '#e8d4cc'}`,
                        borderRadius: 12,
                        color: theme.colors.error,
                        animation: 'fadeIn 0.3s ease-out',
                    }}>
                        <p style={{ margin: 0, fontSize: 14 }}>{error}</p>
                    </div>
                )}

                {/* Profile Content */}
                {!isLoading && !error && summary && (
                    <ProfileSummary summary={summary} />
                )}

                {/* Keyframe animations */}
                <style>{`
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes fadeInUp {
                        from {
                            opacity: 0;
                            transform: translateY(12px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        </div>
    );
}
