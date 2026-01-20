import { useState, useEffect } from 'react';
import { ProfileSummary } from './ProfileSummary';
import type { FullProfileSummary } from '../../shared/types';

// CSS Variables for the warm, contemplative theme
const cssVars = {
    '--portrait-bg': '#faf8f5',
    '--portrait-card': '#ffffff',
    '--portrait-border': '#e8e4de',
    '--portrait-text': '#3d3830',
    '--portrait-text-muted': '#7a7267',
    '--portrait-accent': '#c4956a',
    '--portrait-accent-soft': '#f5ede4',
    '--portrait-success': '#7d9e7a',
    '--portrait-warning': '#d4a574',
    '--portrait-shadow': '0 2px 8px rgba(61, 56, 48, 0.08)',
    '--portrait-shadow-hover': '0 4px 16px rgba(61, 56, 48, 0.12)',
} as React.CSSProperties;

export function ProfileView() {
    const [summary, setSummary] = useState<FullProfileSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                setIsLoading(true);
                const data = await window.api.profile.getSummary() as FullProfileSummary;
                setSummary(data);
            } catch (err) {
                console.error('Failed to load profile:', err);
                setError('Unable to load your self-portrait. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        loadProfile();
    }, []);

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
                        background: '#fdf6f3',
                        border: '1px solid #e8d4cc',
                        borderRadius: 12,
                        color: '#8b5a42',
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
