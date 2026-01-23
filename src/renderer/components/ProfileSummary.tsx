import { useState } from 'react';
import type { FullProfileSummary, ProfileValueItem, ProfileChallengeItem, ProfileGoalItem, ProfileSignalItem } from '../../shared/types';

interface ProfileSummaryProps {
    summary: FullProfileSummary;
}

// Helper to format phase labels nicely
function formatPhaseLabel(phase: string | null): string {
    if (!phase) return '';
    return phase
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

// Helper to format emotional baseline
function formatEmotionalBaseline(baseline: string | null): string {
    if (!baseline) return '';
    return baseline
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

// Helper to format Maslow level names
function formatMaslowLevel(level: string): string {
    const labels: Record<string, string> = {
        'physiological': 'Basic Needs',
        'safety': 'Safety & Security',
        'belonging': 'Love & Belonging',
        'esteem': 'Self-Esteem',
        'self_actualization': 'Self-Actualization',
    };
    return labels[level] || level.replace(/_/g, ' ');
}

// Helper to format dimension names (e.g., "big_five.openness" → "Openness (Big Five)")
function formatDimensionName(dimension: string): { category: string; name: string } {
    const parts = dimension.split('.');
    if (parts.length === 2) {
        const categoryMap: Record<string, string> = {
            'big_five': 'Big Five',
            'moral': 'Moral Foundation',
            'intent': 'Intent Pattern',
        };
        const category = categoryMap[parts[0]] || parts[0].replace(/_/g, ' ');
        const name = parts[1].replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        return { category, name };
    }
    return { category: '', name: dimension.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) };
}

// Helper to format status badges
function formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Helper to format timeframe
function formatTimeframe(timeframe: string | undefined): string {
    if (!timeframe) return '';
    const map: Record<string, string> = {
        'short_term': 'Near term',
        'medium_term': 'Medium term',
        'long_term': 'Long term',
    };
    return map[timeframe] || timeframe.replace(/_/g, ' ');
}

export function ProfileSummary({ summary }: ProfileSummaryProps) {
    const { has_data } = summary;
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        values: true,
        challenges: true,
        goals: true,
        signals: false,
    });

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // Empty state - no data yet
    if (!has_data) {
        return (
            <div style={{
                animation: 'fadeInUp 0.6s ease-out 0.1s both',
            }}>
                <EmptyState />
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
        }}>
            {/* Identity Card - The main summary */}
            <div style={{
                background: 'var(--portrait-card)',
                borderRadius: 16,
                padding: 28,
                boxShadow: 'var(--portrait-shadow)',
                border: '1px solid var(--portrait-border)',
                animation: 'fadeInUp 0.6s ease-out 0.1s both',
            }}>
                {/* Life Phase Badge */}
                {summary.current_phase && (
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        background: 'var(--portrait-accent-soft)',
                        borderRadius: 20,
                        marginBottom: 16,
                    }}>
                        <span style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: 'var(--portrait-accent)',
                        }} />
                        <span style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: 'var(--portrait-accent)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}>
                            {formatPhaseLabel(summary.current_phase)}
                        </span>
                    </div>
                )}

                {/* Identity Summary */}
                {summary.identity_summary ? (
                    <p style={{
                        fontFamily: 'Georgia, "Times New Roman", serif',
                        fontSize: 20,
                        lineHeight: 1.7,
                        color: 'var(--portrait-text)',
                        margin: 0,
                        fontWeight: 400,
                    }}>
                        {summary.identity_summary}
                    </p>
                ) : (
                    <p style={{
                        fontFamily: 'Georgia, "Times New Roman", serif',
                        fontSize: 18,
                        lineHeight: 1.7,
                        color: 'var(--portrait-text-muted)',
                        margin: 0,
                        fontStyle: 'italic',
                    }}>
                        Your story is still unfolding. As we talk more, I'll learn who you are and what matters to you.
                    </p>
                )}

                {/* Emotional Baseline */}
                {summary.emotional_baseline && (
                    <div style={{
                        marginTop: 20,
                        paddingTop: 20,
                        borderTop: '1px solid var(--portrait-border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                    }}>
                        <span style={{
                            fontSize: 13,
                            color: 'var(--portrait-text-muted)',
                        }}>
                            Current emotional tone:
                        </span>
                        <span style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: 'var(--portrait-text)',
                        }}>
                            {formatEmotionalBaseline(summary.emotional_baseline)}
                        </span>
                    </div>
                )}
            </div>

            {/* Values Section */}
            <CollapsibleSection
                title="Your Values"
                icon="◆"
                count={summary.values_count}
                isExpanded={expandedSections.values}
                onToggle={() => toggleSection('values')}
                animationDelay={0.2}
            >
                {summary.values.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {summary.values.map((value, i) => (
                            <ValueCard key={value.id} value={value} index={i} />
                        ))}
                    </div>
                ) : (
                    <EmptySectionText>No values discovered yet. Share what matters to you.</EmptySectionText>
                )}
            </CollapsibleSection>

            {/* Challenges Section */}
            <CollapsibleSection
                title="Current Challenges"
                icon="△"
                count={summary.challenges_count}
                isExpanded={expandedSections.challenges}
                onToggle={() => toggleSection('challenges')}
                animationDelay={0.3}
            >
                {summary.challenges.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {summary.challenges.map((challenge, i) => (
                            <ChallengeCard key={challenge.id} challenge={challenge} index={i} />
                        ))}
                    </div>
                ) : (
                    <EmptySectionText>No active challenges tracked. Talk about what you're working through.</EmptySectionText>
                )}
            </CollapsibleSection>

            {/* Goals Section */}
            <CollapsibleSection
                title="Your Goals"
                icon="○"
                count={summary.goals_count}
                isExpanded={expandedSections.goals}
                onToggle={() => toggleSection('goals')}
                animationDelay={0.4}
            >
                {summary.goals.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {summary.goals.map((goal, i) => (
                            <GoalCard key={goal.id} goal={goal} index={i} />
                        ))}
                    </div>
                ) : (
                    <EmptySectionText>No goals captured yet. Share your aspirations and dreams.</EmptySectionText>
                )}
            </CollapsibleSection>

            {/* Psychological Signals Section */}
            <CollapsibleSection
                title="Patterns & Traits"
                icon="◇"
                count={summary.signals_count}
                isExpanded={expandedSections.signals}
                onToggle={() => toggleSection('signals')}
                animationDelay={0.5}
            >
                {summary.signals.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {summary.signals.map((signal, i) => (
                            <SignalCard key={signal.id} signal={signal} index={i} />
                        ))}
                    </div>
                ) : (
                    <EmptySectionText>Psychological patterns will emerge as we talk more.</EmptySectionText>
                )}
            </CollapsibleSection>

            {/* Primary Concerns */}
            {summary.primary_concerns.length > 0 && (
                <div style={{
                    background: 'var(--portrait-card)',
                    borderRadius: 16,
                    padding: 24,
                    boxShadow: 'var(--portrait-shadow)',
                    border: '1px solid var(--portrait-border)',
                    animation: 'fadeInUp 0.6s ease-out 0.6s both',
                }}>
                    <h3 style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--portrait-text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        marginBottom: 14,
                    }}>
                        What's on your mind
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {summary.primary_concerns.map((concern, i) => (
                            <span
                                key={i}
                                style={{
                                    padding: '8px 14px',
                                    background: 'var(--portrait-badge-bg)',
                                    borderRadius: 8,
                                    fontSize: 14,
                                    color: 'var(--portrait-text)',
                                }}
                            >
                                {concern}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Maslow Concerns */}
            {summary.maslow_concerns.length > 0 && (
                <div style={{
                    background: 'var(--portrait-card)',
                    borderRadius: 16,
                    padding: 24,
                    boxShadow: 'var(--portrait-shadow)',
                    border: '1px solid var(--portrait-border)',
                    animation: 'fadeInUp 0.6s ease-out 0.65s both',
                }}>
                    <h3 style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--portrait-text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        marginBottom: 14,
                    }}>
                        Areas needing attention
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {summary.maslow_concerns.map((level, i) => (
                            <div
                                key={i}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: '10px 14px',
                                    background: 'var(--portrait-maslow-soft)',
                                    borderRadius: 8,
                                    borderLeft: '3px solid var(--portrait-warning)',
                                }}
                            >
                                <span style={{
                                    fontSize: 14,
                                    color: 'var(--portrait-text)',
                                }}>
                                    {formatMaslowLevel(level)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Patterns to Watch */}
            {summary.patterns_to_watch.length > 0 && (
                <div style={{
                    background: 'var(--portrait-card)',
                    borderRadius: 16,
                    padding: 24,
                    boxShadow: 'var(--portrait-shadow)',
                    border: '1px solid var(--portrait-border)',
                    animation: 'fadeInUp 0.6s ease-out 0.7s both',
                }}>
                    <h3 style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--portrait-text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        marginBottom: 14,
                    }}>
                        Patterns I've noticed
                    </h3>
                    <ul style={{
                        margin: 0,
                        padding: 0,
                        listStyle: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                    }}>
                        {summary.patterns_to_watch.map((pattern, i) => (
                            <li
                                key={i}
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 10,
                                    fontSize: 14,
                                    lineHeight: 1.5,
                                    color: 'var(--portrait-text)',
                                }}
                            >
                                <span style={{
                                    color: 'var(--portrait-accent)',
                                    marginTop: 2,
                                }}>
                                    →
                                </span>
                                {pattern}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Recent Wins & Struggles */}
            {(summary.recent_wins.length > 0 || summary.recent_struggles.length > 0) && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 12,
                    animation: 'fadeInUp 0.6s ease-out 0.75s both',
                }}>
                    {summary.recent_wins.length > 0 && (
                        <div style={{
                            background: 'var(--portrait-card)',
                            borderRadius: 16,
                            padding: 20,
                            boxShadow: 'var(--portrait-shadow)',
                            border: '1px solid var(--portrait-border)',
                            borderTop: '3px solid var(--portrait-success)',
                        }}>
                            <h3 style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: 'var(--portrait-success)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                marginBottom: 12,
                            }}>
                                Recent wins
                            </h3>
                            <ul style={{
                                margin: 0,
                                padding: 0,
                                listStyle: 'none',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8,
                            }}>
                                {summary.recent_wins.map((win, i) => (
                                    <li
                                        key={i}
                                        style={{
                                            fontSize: 13,
                                            lineHeight: 1.5,
                                            color: 'var(--portrait-text)',
                                        }}
                                    >
                                        {win}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {summary.recent_struggles.length > 0 && (
                        <div style={{
                            background: 'var(--portrait-card)',
                            borderRadius: 16,
                            padding: 20,
                            boxShadow: 'var(--portrait-shadow)',
                            border: '1px solid var(--portrait-border)',
                            borderTop: '3px solid var(--portrait-warning)',
                        }}>
                            <h3 style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: 'var(--portrait-warning)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                marginBottom: 12,
                            }}>
                                Current struggles
                            </h3>
                            <ul style={{
                                margin: 0,
                                padding: 0,
                                listStyle: 'none',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8,
                            }}>
                                {summary.recent_struggles.map((struggle, i) => (
                                    <li
                                        key={i}
                                        style={{
                                            fontSize: 13,
                                            lineHeight: 1.5,
                                            color: 'var(--portrait-text)',
                                        }}
                                    >
                                        {struggle}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Last Updated */}
            {summary.last_updated && (
                <p style={{
                    fontSize: 12,
                    color: 'var(--portrait-text-muted)',
                    textAlign: 'center',
                    marginTop: 8,
                    animation: 'fadeIn 0.6s ease-out 0.8s both',
                }}>
                    Last updated {formatRelativeTime(summary.last_updated)}
                </p>
            )}
        </div>
    );
}

// Collapsible Section Component
interface CollapsibleSectionProps {
    title: string;
    icon: string;
    count: number;
    isExpanded: boolean;
    onToggle: () => void;
    animationDelay: number;
    children: React.ReactNode;
}

function CollapsibleSection({ title, icon, count, isExpanded, onToggle, animationDelay, children }: CollapsibleSectionProps) {
    return (
        <div style={{
            background: 'var(--portrait-card)',
            borderRadius: 16,
            boxShadow: 'var(--portrait-shadow)',
            border: '1px solid var(--portrait-border)',
            overflow: 'hidden',
            animation: `fadeInUp 0.6s ease-out ${animationDelay}s both`,
        }}>
            {/* Header - Always visible */}
            <button
                onClick={onToggle}
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '18px 24px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(196, 149, 106, 0.04)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                        fontSize: 16,
                        color: 'var(--portrait-accent)',
                    }}>
                        {icon}
                    </span>
                    <span style={{
                        fontSize: 15,
                        fontWeight: 500,
                        color: 'var(--portrait-text)',
                        letterSpacing: '0.01em',
                    }}>
                        {title}
                    </span>
                    <span style={{
                        fontSize: 12,
                        color: 'var(--portrait-badge-text)',
                        background: 'var(--portrait-badge-bg)',
                        padding: '3px 10px',
                        borderRadius: 12,
                        fontWeight: 500,
                    }}>
                        {count}
                    </span>
                </div>
                <span style={{
                    fontSize: 12,
                    color: 'var(--portrait-text-muted)',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s ease',
                }}>
                    ▼
                </span>
            </button>

            {/* Content - Collapsible */}
            <div style={{
                maxHeight: isExpanded ? '2000px' : '0',
                opacity: isExpanded ? 1 : 0,
                overflow: 'hidden',
                transition: 'max-height 0.4s ease, opacity 0.3s ease',
            }}>
                <div style={{
                    padding: '0 24px 20px 24px',
                    borderTop: '1px solid var(--portrait-border)',
                    paddingTop: 16,
                }}>
                    {children}
                </div>
            </div>
        </div>
    );
}

// Value Card Component
function ValueCard({ value, index }: { value: ProfileValueItem; index: number }) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: '14px 16px',
            background: 'linear-gradient(135deg, var(--portrait-card-inner) 0%, var(--portrait-card-inner-alt) 100%)',
            borderRadius: 10,
            borderLeft: '3px solid var(--portrait-accent)',
            animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: 15,
                    fontWeight: 500,
                    color: 'var(--portrait-text)',
                }}>
                    {value.name}
                </span>
                <ConfidenceIndicator confidence={value.confidence} />
            </div>
            {value.description && (
                <p style={{
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: 'var(--portrait-text-muted)',
                    margin: 0,
                }}>
                    {value.description}
                </p>
            )}
        </div>
    );
}

// Challenge Card Component
function ChallengeCard({ challenge, index }: { challenge: ProfileChallengeItem; index: number }) {
    const statusColors: Record<string, { bg: string; text: string }> = {
        'active': { bg: 'var(--portrait-warning-soft)', text: 'var(--portrait-accent)' },
        'resolved': { bg: 'var(--portrait-success-soft)', text: 'var(--portrait-success)' },
        'recurring': { bg: 'var(--portrait-warning-soft)', text: 'var(--portrait-warning)' },
    };
    const colors = statusColors[challenge.status] || statusColors.active;

    return (
        <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            padding: '12px 14px',
            background: 'var(--portrait-card-inner)',
            borderRadius: 8,
            animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`,
        }}>
            <p style={{
                fontSize: 14,
                lineHeight: 1.5,
                color: 'var(--portrait-text)',
                margin: 0,
                flex: 1,
            }}>
                {challenge.description}
            </p>
            <span style={{
                fontSize: 11,
                fontWeight: 500,
                padding: '4px 10px',
                borderRadius: 12,
                background: colors.bg,
                color: colors.text,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                whiteSpace: 'nowrap',
            }}>
                {formatStatus(challenge.status)}
            </span>
        </div>
    );
}

// Goal Card Component
function GoalCard({ goal, index }: { goal: ProfileGoalItem; index: number }) {
    const statusColors: Record<string, { bg: string; text: string }> = {
        'stated': { bg: 'var(--portrait-badge-bg)', text: 'var(--portrait-badge-text)' },
        'in_progress': { bg: 'var(--portrait-accent-soft)', text: 'var(--portrait-accent)' },
        'achieved': { bg: 'var(--portrait-success-soft)', text: 'var(--portrait-success)' },
        'abandoned': { bg: 'var(--portrait-badge-bg)', text: 'var(--portrait-text-muted)' },
    };
    const colors = statusColors[goal.status] || statusColors.stated;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: '12px 14px',
            background: 'var(--portrait-card-inner)',
            borderRadius: 8,
            animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`,
        }}>
            <p style={{
                fontSize: 14,
                lineHeight: 1.5,
                color: 'var(--portrait-text)',
                margin: 0,
            }}>
                {goal.description}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{
                    fontSize: 11,
                    fontWeight: 500,
                    padding: '4px 10px',
                    borderRadius: 12,
                    background: colors.bg,
                    color: colors.text,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                }}>
                    {formatStatus(goal.status)}
                </span>
                {goal.timeframe && (
                    <span style={{
                        fontSize: 11,
                        fontWeight: 500,
                        padding: '4px 10px',
                        borderRadius: 12,
                        background: 'var(--portrait-badge-bg)',
                        color: 'var(--portrait-badge-text)',
                        letterSpacing: '0.02em',
                    }}>
                        {formatTimeframe(goal.timeframe)}
                    </span>
                )}
            </div>
        </div>
    );
}

// Signal Card Component
function SignalCard({ signal, index }: { signal: ProfileSignalItem; index: number }) {
    const { category, name } = formatDimensionName(signal.dimension);

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            background: 'var(--portrait-card-inner)',
            borderRadius: 8,
            animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`,
        }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--portrait-text)',
                }}>
                    {name}
                </span>
                {category && (
                    <span style={{
                        fontSize: 11,
                        color: 'var(--portrait-text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                    }}>
                        {category}
                    </span>
                )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--portrait-accent)',
                    background: 'var(--portrait-accent-soft)',
                    padding: '4px 12px',
                    borderRadius: 6,
                }}>
                    {signal.value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
                <ConfidenceIndicator confidence={signal.confidence} />
            </div>
        </div>
    );
}

// Confidence Indicator Component
function ConfidenceIndicator({ confidence }: { confidence: number }) {
    const percent = Math.round(confidence * 100);

    // Color gradient from amber (low) to green (high)
    const getColor = (conf: number) => {
        if (conf >= 0.8) return '#7d9e7a'; // Sage green
        if (conf >= 0.6) return '#9eb87a'; // Light green
        if (conf >= 0.4) return '#c4956a'; // Amber
        return '#d4a574'; // Light amber
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
        }}>
            <div style={{
                width: 40,
                height: 4,
                background: 'var(--portrait-confidence-bg)',
                borderRadius: 2,
                overflow: 'hidden',
            }}>
                <div style={{
                    width: `${percent}%`,
                    height: '100%',
                    background: getColor(confidence),
                    borderRadius: 2,
                    transition: 'width 0.3s ease',
                }} />
            </div>
            <span style={{
                fontSize: 11,
                color: 'var(--portrait-text-muted)',
                minWidth: 28,
                textAlign: 'right',
            }}>
                {percent}%
            </span>
        </div>
    );
}

// Empty Section Text Component
function EmptySectionText({ children }: { children: React.ReactNode }) {
    return (
        <p style={{
            fontSize: 13,
            color: 'var(--portrait-text-muted)',
            fontStyle: 'italic',
            margin: 0,
            padding: '8px 0',
        }}>
            {children}
        </p>
    );
}

// Empty State Component
function EmptyState() {
    return (
        <div style={{
            background: 'var(--portrait-card)',
            borderRadius: 20,
            padding: '60px 40px',
            boxShadow: 'var(--portrait-shadow)',
            border: '1px solid var(--portrait-border)',
            textAlign: 'center',
        }}>
            {/* Decorative Element */}
            <div style={{
                width: 80,
                height: 80,
                margin: '0 auto 24px',
                background: 'linear-gradient(135deg, var(--portrait-accent-soft) 0%, var(--portrait-card-inner-alt) 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <svg
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--portrait-accent)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                </svg>
            </div>

            <h2 style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: 24,
                fontWeight: 400,
                color: 'var(--portrait-text)',
                marginBottom: 12,
            }}>
                Your portrait awaits
            </h2>

            <p style={{
                fontSize: 15,
                lineHeight: 1.7,
                color: 'var(--portrait-text-muted)',
                maxWidth: 400,
                margin: '0 auto 24px',
            }}>
                As we talk, I'll begin to see the contours of who you are—your values,
                your challenges, what matters most to you. Start a conversation to begin
                painting your self-portrait.
            </p>

            <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 24,
                color: 'var(--portrait-text-muted)',
                fontSize: 12,
            }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--portrait-accent)' }}>◆</span>
                    Values
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--portrait-accent)' }}>△</span>
                    Challenges
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--portrait-accent)' }}>○</span>
                    Goals
                </span>
            </div>
        </div>
    );
}

// Helper to format relative time
function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
}
