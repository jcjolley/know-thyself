import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import type { Theme } from '../styles/theme';

// =============================================================================
// Loading Messages - Contemplative phrases for journey preparation
// =============================================================================

const LOADING_MESSAGES = [
    'Preparing your space...',
    'Gathering your threads...',
    'Setting the stage...',
    'Finding the right words...',
    'Tuning in...',
    'Making room for reflection...',
    'Quieting the noise...',
    'Opening the door...',
    'Lighting the path...',
    'Almost there...',
];

// =============================================================================
// Types
// =============================================================================

interface Journey {
    id: string;
    title: string;
    description: string;
    duration: string;
    axes: string[];
    category: 'foundation' | 'understanding' | 'deeper';
}

interface JourneysPageProps {
    onStartJourney?: (journeyId: string) => void | Promise<void>;
}

// =============================================================================
// Journey Data
// =============================================================================

const JOURNEYS: Journey[] = [
    // Foundation
    {
        id: 'what-do-you-need',
        title: 'What Do You Actually Need?',
        description: 'Discover which of your fundamental needs are met and which are calling for attention.',
        duration: '15-25 min',
        axes: ['Maslow Status', 'Life Situation'],
        category: 'foundation',
    },
    {
        id: 'what-matters-most',
        title: 'What Matters Most to You?',
        description: 'Uncover your core values—the principles that guide your best decisions.',
        duration: '20-30 min',
        axes: ['Core Values', 'Moral Foundations'],
        category: 'foundation',
    },
    {
        id: 'where-are-you-going',
        title: 'Where Are You Going?',
        description: 'Clarify what you\'re working toward and what\'s been getting in the way.',
        duration: '15-25 min',
        axes: ['Goals', 'Challenges', 'Intent'],
        category: 'foundation',
    },
    // Understanding Yourself
    {
        id: 'how-you-show-up',
        title: 'How You Show Up',
        description: 'Understand your natural tendencies—how you recharge, approach problems, and relate to others.',
        duration: '20-30 min',
        axes: ['Personality (Big Five)'],
        category: 'understanding',
    },
    {
        id: 'relationship-with-risk',
        title: 'Your Relationship with Risk',
        description: 'Explore how you navigate uncertainty and what drives your decisions.',
        duration: '15-20 min',
        axes: ['Risk Tolerance', 'Motivation Style'],
        category: 'understanding',
    },
    {
        id: 'how-you-connect',
        title: 'How You Connect',
        description: 'Understand your patterns in close relationships and how you seek support.',
        duration: '20-30 min',
        axes: ['Attachment Style', 'Support-Seeking'],
        category: 'understanding',
    },
    // Going Deeper
    {
        id: 'whos-in-control',
        title: 'Who\'s in Control?',
        description: 'Explore your sense of personal agency and beliefs about change.',
        duration: '15-20 min',
        axes: ['Locus of Control', 'Growth Mindset', 'Self-Efficacy'],
        category: 'deeper',
    },
    {
        id: 'living-in-time',
        title: 'Living in Time',
        description: 'Discover where you psychologically live—past, present, or future.',
        duration: '15-20 min',
        axes: ['Temporal Orientation'],
        category: 'deeper',
    },
    {
        id: 'under-pressure',
        title: 'Under Pressure',
        description: 'Understand how you respond to stress and handle intense emotions.',
        duration: '15-20 min',
        axes: ['Stress Response', 'Emotional Regulation'],
        category: 'deeper',
    },
    {
        id: 'ready-for-change',
        title: 'Ready for Change',
        description: 'Assess your true readiness for the changes you\'re considering.',
        duration: '15-20 min',
        axes: ['Change Readiness'],
        category: 'deeper',
    },
];

const CATEGORIES = [
    {
        id: 'foundation',
        title: 'Foundation',
        subtitle: 'Start here',
        description: 'Fundamental questions that ground all other insights',
    },
    {
        id: 'understanding',
        title: 'Understanding Yourself',
        subtitle: 'Know your patterns',
        description: 'Personality, tendencies, and how you naturally operate',
    },
    {
        id: 'deeper',
        title: 'Going Deeper',
        subtitle: 'Explore further',
        description: 'Nuanced patterns that shape your inner world',
    },
] as const;

// =============================================================================
// Component
// =============================================================================

export function JourneysPage({ onStartJourney }: JourneysPageProps) {
    const { theme, isDark } = useTheme();
    const [hoveredJourney, setHoveredJourney] = useState<string | null>(null);
    const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null);
    const [mounted, setMounted] = useState(false);
    const [isStarting, setIsStarting] = useState(false);

    const styles = getStyles(theme, isDark);

    useEffect(() => {
        // Trigger entrance animation
        const timer = setTimeout(() => setMounted(true), 50);
        return () => clearTimeout(timer);
    }, []);

    const handleJourneyClick = (journey: Journey) => {
        if (!isStarting) {
            setSelectedJourney(journey);
        }
    };

    const handleStartJourney = async () => {
        if (selectedJourney && onStartJourney && !isStarting) {
            setIsStarting(true);
            try {
                await onStartJourney(selectedJourney.id);
            } finally {
                // Reset after navigation (or on error)
                setIsStarting(false);
                setSelectedJourney(null);
            }
        }
    };

    const handleCloseDetail = () => {
        if (!isStarting) {
            setSelectedJourney(null);
        }
    };

    return (
        <div style={styles.container}>
            {/* Subtle texture overlay */}
            <div style={styles.textureOverlay} />

            <div style={{
                ...styles.content,
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
            }}>
                {/* Header */}
                <header style={styles.header}>
                    <div style={styles.headerIcon}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <h1 style={styles.title}>Guided Journeys</h1>
                    <p style={styles.subtitle}>
                        Choose a path of reflection. Each journey is a conversation designed to help you understand yourself more deeply.
                    </p>
                </header>

                {/* Journey Categories */}
                <div style={styles.categoriesContainer}>
                    {CATEGORIES.map((category, categoryIndex) => {
                        const categoryJourneys = JOURNEYS.filter(j => j.category === category.id);

                        return (
                            <section
                                key={category.id}
                                style={{
                                    ...styles.categorySection,
                                    animationDelay: `${categoryIndex * 0.15}s`,
                                }}
                            >
                                {/* Category Header */}
                                <div style={styles.categoryHeader}>
                                    <div style={styles.categoryTitleRow}>
                                        <h2 style={styles.categoryTitle}>{category.title}</h2>
                                        <span style={styles.categoryBadge}>{category.subtitle}</span>
                                    </div>
                                    <p style={styles.categoryDescription}>{category.description}</p>
                                </div>

                                {/* Journey Cards */}
                                <div style={styles.journeyGrid}>
                                    {categoryJourneys.map((journey, journeyIndex) => (
                                        <JourneyCard
                                            key={journey.id}
                                            journey={journey}
                                            isHovered={hoveredJourney === journey.id}
                                            onHover={() => setHoveredJourney(journey.id)}
                                            onLeave={() => setHoveredJourney(null)}
                                            onClick={() => handleJourneyClick(journey)}
                                            delay={journeyIndex * 0.08}
                                            styles={styles}
                                            isDark={isDark}
                                        />
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </div>

            {/* Journey Detail Modal */}
            {selectedJourney && (
                <JourneyDetail
                    journey={selectedJourney}
                    onClose={handleCloseDetail}
                    onStart={handleStartJourney}
                    isStarting={isStarting}
                    styles={styles}
                />
            )}

            {/* Animations */}
            <style>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(16px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                @keyframes breathe {
                    0%, 100% { opacity: 0.4; }
                    50% { opacity: 0.6; }
                }
                @keyframes modalIn {
                    from {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes dotPulse {
                    0%, 80%, 100% {
                        opacity: 0.3;
                        transform: scale(0.8);
                    }
                    40% {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
            `}</style>
        </div>
    );
}

// =============================================================================
// Journey Card Component
// =============================================================================

interface JourneyCardProps {
    journey: Journey;
    isHovered: boolean;
    onHover: () => void;
    onLeave: () => void;
    onClick: () => void;
    delay: number;
    styles: ReturnType<typeof getStyles>;
    isDark: boolean;
}

function JourneyCard({ journey, isHovered, onHover, onLeave, onClick, delay, styles, isDark }: JourneyCardProps) {
    return (
        <button
            style={{
                ...styles.journeyCard,
                transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: isHovered
                    ? isDark
                        ? '0 12px 40px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3)'
                        : '0 12px 40px rgba(140, 120, 100, 0.15), 0 4px 12px rgba(140, 120, 100, 0.1)'
                    : isDark
                        ? '0 2px 8px rgba(0, 0, 0, 0.3)'
                        : '0 2px 8px rgba(140, 120, 100, 0.06)',
                borderColor: isHovered
                    ? isDark ? '#4a4540' : '#d4c4b0'
                    : isDark ? '#3a3632' : '#e8e2d9',
                animation: `fadeInUp 0.5s ease-out ${delay}s both`,
            }}
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
            onClick={onClick}
        >
            {/* Decorative corner accent */}
            <div style={{
                ...styles.cardAccent,
                opacity: isHovered ? 1 : 0.5,
            }} />

            {/* Duration badge */}
            <div style={styles.durationBadge}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                </svg>
                {journey.duration}
            </div>

            {/* Title */}
            <h3 style={styles.journeyTitle}>{journey.title}</h3>

            {/* Description */}
            <p style={styles.journeyDescription}>{journey.description}</p>

            {/* Axes tags */}
            <div style={styles.axesTags}>
                {journey.axes.slice(0, 2).map(axis => (
                    <span key={axis} style={styles.axisTag}>{axis}</span>
                ))}
                {journey.axes.length > 2 && (
                    <span style={styles.axisTag}>+{journey.axes.length - 2}</span>
                )}
            </div>

            {/* Hover arrow */}
            <div style={{
                ...styles.hoverArrow,
                opacity: isHovered ? 1 : 0,
                transform: isHovered ? 'translateX(0)' : 'translateX(-8px)',
            }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
            </div>
        </button>
    );
}

// =============================================================================
// Journey Detail Modal
// =============================================================================

interface JourneyDetailProps {
    journey: Journey;
    onClose: () => void;
    onStart: () => void;
    isStarting: boolean;
    styles: ReturnType<typeof getStyles>;
}

function JourneyDetail({ journey, onClose, onStart, isStarting, styles }: JourneyDetailProps) {
    const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
    const [isMessageVisible, setIsMessageVisible] = useState(true);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Cycle through loading messages when starting
    useEffect(() => {
        if (isStarting) {
            // Reset to first message
            setLoadingMessageIndex(0);
            setIsMessageVisible(true);

            intervalRef.current = setInterval(() => {
                // Fade out
                setIsMessageVisible(false);

                // After fade out completes, change message and fade in
                setTimeout(() => {
                    setLoadingMessageIndex(prev =>
                        prev < LOADING_MESSAGES.length - 1 ? prev + 1 : prev
                    );
                    setIsMessageVisible(true);
                }, 1200);
            }, 6000);

            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            };
        }
    }, [isStarting]);

    const currentLoadingMessage = LOADING_MESSAGES[loadingMessageIndex];

    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div
                style={styles.modalContent}
                onClick={e => e.stopPropagation()}
            >
                {/* Close button */}
                <button style={styles.closeButton} onClick={onClose}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>

                {/* Decorative header gradient */}
                <div style={styles.modalHeaderGradient} />

                {/* Content */}
                <div style={styles.modalBody}>
                    {/* Category indicator */}
                    <div style={styles.modalCategory}>
                        {CATEGORIES.find(c => c.id === journey.category)?.title}
                    </div>

                    <h2 style={styles.modalTitle}>{journey.title}</h2>

                    <p style={styles.modalDescription}>
                        {journey.description}
                    </p>

                    {/* Details */}
                    <div style={styles.modalDetails}>
                        <div style={styles.detailItem}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 6v6l4 2" />
                            </svg>
                            <span>{journey.duration}</span>
                        </div>
                        <div style={styles.detailItem}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                <path d="M2 17l10 5 10-5" />
                                <path d="M2 12l10 5 10-5" />
                            </svg>
                            <span>{journey.axes.length} dimension{journey.axes.length > 1 ? 's' : ''} explored</span>
                        </div>
                    </div>

                    {/* Axes */}
                    <div style={styles.modalAxesSection}>
                        <h4 style={styles.modalAxesTitle}>What we'll explore</h4>
                        <div style={styles.modalAxesList}>
                            {journey.axes.map(axis => (
                                <div key={axis} style={styles.modalAxisItem}>
                                    <div style={styles.axisDot} />
                                    {axis}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* What to expect */}
                    <div style={styles.expectSection}>
                        <h4 style={styles.expectTitle}>What to expect</h4>
                        <p style={styles.expectText}>
                            This is a guided conversation, not a quiz. There are no right or wrong answers.
                            Take your time, be honest with yourself, and explore at your own pace.
                        </p>
                    </div>

                    {/* Start button */}
                    <button
                        style={{
                            ...styles.startButton,
                            cursor: isStarting ? 'wait' : 'pointer',
                        }}
                        onClick={onStart}
                        disabled={isStarting}
                    >
                        {isStarting ? (
                            <div style={styles.loadingContainer}>
                                {/* Animated dots */}
                                <div style={styles.loadingDots}>
                                    <span style={{ ...styles.loadingDot, animationDelay: '0s' }} />
                                    <span style={{ ...styles.loadingDot, animationDelay: '0.3s' }} />
                                    <span style={{ ...styles.loadingDot, animationDelay: '0.6s' }} />
                                </div>
                                {/* Rotating message */}
                                <span
                                    style={{
                                        ...styles.loadingMessage,
                                        opacity: isMessageVisible ? 1 : 0,
                                        transform: isMessageVisible ? 'translateY(0)' : 'translateY(-6px)',
                                    }}
                                >
                                    {currentLoadingMessage}
                                </span>
                            </div>
                        ) : (
                            <>
                                <span>Begin Journey</span>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// Styles
// =============================================================================

function getStyles(theme: Theme, isDark: boolean): Record<string, React.CSSProperties> {
    return {
        container: {
            position: 'relative',
            height: '100%',
            background: isDark
                ? `linear-gradient(180deg, ${theme.colors.background} 0%, #1e1b18 100%)`
                : 'linear-gradient(180deg, #faf8f5 0%, #f5f0ea 100%)',
            overflowY: 'auto',
        },
        textureOverlay: {
            position: 'absolute',
            inset: 0,
            opacity: isDark ? 0.02 : 0.04,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            pointerEvents: 'none',
        },
        content: {
            position: 'relative',
            maxWidth: 900,
            margin: '0 auto',
            padding: '40px 32px 60px',
        },
        header: {
            textAlign: 'center',
            marginBottom: 48,
        },
        headerIcon: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: isDark
                ? `linear-gradient(135deg, ${theme.colors.surface} 0%, #2d2a27 100%)`
                : 'linear-gradient(135deg, #e8dfd4 0%, #d4c7b8 100%)',
            color: theme.colors.accent,
            marginBottom: 20,
            boxShadow: isDark
                ? '0 4px 16px rgba(0, 0, 0, 0.3)'
                : '0 4px 16px rgba(140, 120, 100, 0.15)',
        },
        title: {
            fontFamily: '"Libre Baskerville", Georgia, serif',
            fontSize: 36,
            fontWeight: 400,
            color: theme.colors.textPrimary,
            margin: 0,
            letterSpacing: '-0.02em',
        },
        subtitle: {
            fontSize: 16,
            color: theme.colors.textSecondary,
            margin: '16px auto 0',
            maxWidth: 480,
            lineHeight: 1.6,
        },
        categoriesContainer: {
            display: 'flex',
            flexDirection: 'column',
            gap: 48,
        },
        categorySection: {
            animation: 'fadeInUp 0.5s ease-out both',
        },
        categoryHeader: {
            marginBottom: 20,
        },
        categoryTitleRow: {
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 6,
        },
        categoryTitle: {
            fontFamily: '"Libre Baskerville", Georgia, serif',
            fontSize: 22,
            fontWeight: 400,
            color: theme.colors.textPrimary,
            margin: 0,
        },
        categoryBadge: {
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: theme.colors.accent,
            background: isDark
                ? `linear-gradient(135deg, ${theme.colors.surface} 0%, #2d2a27 100%)`
                : 'linear-gradient(135deg, #f0e8df 0%, #e8ddd0 100%)',
            padding: '4px 10px',
            borderRadius: 12,
        },
        categoryDescription: {
            fontSize: 14,
            color: theme.colors.textMuted,
            margin: 0,
        },
        journeyGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 16,
        },
        journeyCard: {
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            textAlign: 'left',
            padding: '24px 20px 20px',
            background: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: 16,
            cursor: 'pointer',
            transition: 'all 0.25s ease',
            fontFamily: 'inherit',
            overflow: 'hidden',
        },
        cardAccent: {
            position: 'absolute',
            top: 0,
            left: 0,
            width: 60,
            height: 60,
            background: isDark
                ? 'linear-gradient(135deg, rgba(212, 165, 116, 0.15) 0%, transparent 60%)'
                : 'linear-gradient(135deg, rgba(196, 149, 106, 0.12) 0%, transparent 60%)',
            borderRadius: '16px 0 40px 0',
            transition: 'opacity 0.25s ease',
        },
        durationBadge: {
            display: 'flex',
            alignItems: 'center',
            fontSize: 11,
            fontWeight: 500,
            color: theme.colors.textMuted,
            marginBottom: 12,
        },
        journeyTitle: {
            fontSize: 17,
            fontWeight: 600,
            color: theme.colors.textPrimary,
            margin: '0 0 8px 0',
            lineHeight: 1.3,
        },
        journeyDescription: {
            fontSize: 13,
            color: theme.colors.textSecondary,
            margin: '0 0 16px 0',
            lineHeight: 1.5,
            flex: 1,
        },
        axesTags: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
        },
        axisTag: {
            fontSize: 10,
            fontWeight: 500,
            color: isDark ? theme.colors.textSecondary : '#8b7a68',
            background: isDark ? theme.colors.surfaceHover : '#f5f0ea',
            padding: '4px 8px',
            borderRadius: 6,
        },
        hoverArrow: {
            position: 'absolute',
            right: 16,
            bottom: 16,
            color: theme.colors.accent,
            transition: 'all 0.25s ease',
        },

        // Modal styles
        modalOverlay: {
            position: 'fixed',
            inset: 0,
            background: isDark ? 'rgba(10, 8, 6, 0.7)' : 'rgba(60, 50, 40, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            zIndex: 1000,
            animation: 'fadeInUp 0.2s ease-out',
        },
        modalContent: {
            position: 'relative',
            width: '100%',
            maxWidth: 480,
            background: theme.colors.surface,
            borderRadius: 24,
            overflow: 'hidden',
            boxShadow: isDark
                ? '0 24px 80px rgba(0, 0, 0, 0.5), 0 8px 24px rgba(0, 0, 0, 0.4)'
                : '0 24px 80px rgba(60, 50, 40, 0.25), 0 8px 24px rgba(60, 50, 40, 0.15)',
            animation: 'modalIn 0.3s ease-out',
        },
        closeButton: {
            position: 'absolute',
            top: 16,
            right: 16,
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isDark ? 'rgba(37, 34, 32, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            color: theme.colors.textSecondary,
            zIndex: 10,
            transition: 'background 0.15s ease',
        },
        modalHeaderGradient: {
            height: 100,
            background: isDark
                ? `linear-gradient(135deg, #3a3530 0%, #2d2825 50%, #252220 100%)`
                : 'linear-gradient(135deg, #e8dfd4 0%, #d4c4b0 50%, #c4b09a 100%)',
        },
        modalBody: {
            padding: '24px 32px 32px',
        },
        modalCategory: {
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: theme.colors.accent,
            marginBottom: 8,
        },
        modalTitle: {
            fontFamily: '"Libre Baskerville", Georgia, serif',
            fontSize: 26,
            fontWeight: 400,
            color: theme.colors.textPrimary,
            margin: '0 0 12px 0',
            lineHeight: 1.2,
        },
        modalDescription: {
            fontSize: 15,
            color: theme.colors.textSecondary,
            margin: '0 0 24px 0',
            lineHeight: 1.6,
        },
        modalDetails: {
            display: 'flex',
            gap: 24,
            marginBottom: 24,
            paddingBottom: 24,
            borderBottom: `1px solid ${theme.colors.border}`,
        },
        detailItem: {
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
            color: theme.colors.textSecondary,
        },
        modalAxesSection: {
            marginBottom: 24,
        },
        modalAxesTitle: {
            fontSize: 12,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: theme.colors.textMuted,
            margin: '0 0 12px 0',
        },
        modalAxesList: {
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
        },
        modalAxisItem: {
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 14,
            color: theme.colors.textPrimary,
        },
        axisDot: {
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: theme.colors.accent,
        },
        expectSection: {
            background: isDark ? theme.colors.surfaceHover : '#f8f5f0',
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
        },
        expectTitle: {
            fontSize: 12,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: theme.colors.textMuted,
            margin: '0 0 8px 0',
        },
        expectText: {
            fontSize: 13,
            color: theme.colors.textSecondary,
            margin: 0,
            lineHeight: 1.6,
        },
        startButton: {
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            width: '100%',
            padding: '16px 24px',
            background: `linear-gradient(135deg, ${theme.colors.accent} 0%, ${isDark ? '#a07850' : '#b08050'} 100%)`,
            border: 'none',
            borderRadius: 12,
            color: '#fff',
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            boxShadow: isDark
                ? '0 4px 16px rgba(212, 165, 116, 0.2)'
                : '0 4px 16px rgba(180, 130, 80, 0.3)',
            minHeight: 56,
        },
        loadingContainer: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
        },
        loadingDots: {
            position: 'absolute',
            left: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
        },
        loadingDot: {
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.9)',
            animation: 'dotPulse 2.4s ease-in-out infinite',
        },
        loadingMessage: {
            fontSize: 15,
            fontWeight: 500,
            fontStyle: 'italic',
            letterSpacing: '0.01em',
            transition: 'opacity 1.2s ease-in-out, transform 1.2s ease-in-out',
        },
    };
}
