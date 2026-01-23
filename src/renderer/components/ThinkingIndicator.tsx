import { useTheme } from '../contexts/ThemeContext';

/**
 * ThinkingIndicator - A meditative visual for when the model is in deep thought.
 *
 * Design: Three softly pulsing orbs that "breathe" at different rates,
 * creating an organic, non-mechanical rhythm. Like ripples on still water.
 */
export function ThinkingIndicator() {
    const { theme } = useTheme();

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 0',
            }}
        >
            <span
                style={{
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: 13,
                    fontStyle: 'italic',
                    color: theme.colors.textSecondary,
                    opacity: 0.8,
                }}
            >
                contemplating
            </span>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    marginLeft: 2,
                }}
            >
                {/* Three orbs with staggered, organic breathing animations */}
                <Orb delay={0} duration={2.4} color={theme.colors.accent} />
                <Orb delay={0.4} duration={2.8} color={theme.colors.accent} />
                <Orb delay={0.8} duration={2.2} color={theme.colors.accent} />
            </div>

            <style>{`
                @keyframes breathe {
                    0%, 100% {
                        transform: scale(0.6);
                        opacity: 0.3;
                    }
                    50% {
                        transform: scale(1);
                        opacity: 0.9;
                    }
                }
            `}</style>
        </div>
    );
}

function Orb({ delay, duration, color }: { delay: number; duration: number; color: string }) {
    return (
        <span
            style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: color,
                animation: `breathe ${duration}s ease-in-out ${delay}s infinite`,
                boxShadow: `0 0 8px ${color}40`,
            }}
        />
    );
}
