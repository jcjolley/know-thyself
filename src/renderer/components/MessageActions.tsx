import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface MessageActionsProps {
    messageId: string;
    messageRole: 'user' | 'assistant';
    canReset: boolean;      // false if last message or streaming
    canRegenerate: boolean; // true only for assistant, false if streaming
    isExpanded: boolean;    // whether action menu is open
    onToggle: () => void;
    onResetAfter: () => void;
    onRegenerate: () => void;
}

/**
 * Progressive disclosure action buttons for message hover state.
 * Shows a trigger dot that expands to reveal Reset and Regenerate actions.
 */
export function MessageActions({
    messageRole,
    canReset,
    canRegenerate,
    isExpanded,
    onToggle,
    onResetAfter,
    onRegenerate,
}: MessageActionsProps) {
    const { theme } = useTheme();
    const [hoveredAction, setHoveredAction] = useState<'reset' | 'regenerate' | null>(null);

    // Don't render if no actions available
    if (!canReset && !canRegenerate) {
        return null;
    }

    const handleResetClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (canReset) {
            onResetAfter();
        }
    };

    const handleRegenerateClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (canRegenerate) {
            onRegenerate();
        }
    };

    const handleTriggerClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggle();
    };

    const iconStyle = (isHovered: boolean, disabled: boolean): React.CSSProperties => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
        borderRadius: 4,
        background: 'transparent',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled
            ? theme.colors.textMuted
            : isHovered
            ? theme.colors.accent
            : theme.colors.textMuted,
        opacity: disabled ? 0.5 : 1,
        transition: 'all 150ms ease',
    });

    if (!isExpanded) {
        // Collapsed state: show trigger dot
        return (
            <button
                onClick={handleTriggerClick}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 16,
                    height: 16,
                    padding: 0,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: 4,
                }}
                aria-label="Show message actions"
                title="Actions"
            >
                <span
                    style={{
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: theme.colors.textMuted,
                        transition: 'background 150ms ease',
                    }}
                />
            </button>
        );
    }

    // Expanded state: show action icons
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                animation: 'fadeInActions 150ms ease',
            }}
        >
            <style>{`
                @keyframes fadeInActions {
                    from {
                        opacity: 0;
                        transform: translateX(4px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
            `}</style>

            {/* Reset After Icon (counterclockwise arrow) */}
            {canReset && (
                <button
                    onClick={handleResetClick}
                    style={iconStyle(hoveredAction === 'reset', false)}
                    onMouseEnter={() => setHoveredAction('reset')}
                    onMouseLeave={() => setHoveredAction(null)}
                    aria-label="Reset conversation after this message"
                    title="Reset after this"
                >
                    <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                    </svg>
                </button>
            )}

            {/* Regenerate Icon (refresh) - only for assistant messages */}
            {canRegenerate && messageRole === 'assistant' && (
                <button
                    onClick={handleRegenerateClick}
                    style={iconStyle(hoveredAction === 'regenerate', false)}
                    onMouseEnter={() => setHoveredAction('regenerate')}
                    onMouseLeave={() => setHoveredAction(null)}
                    aria-label="Regenerate this response"
                    title="Regenerate"
                >
                    <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                        <path d="M3 3v5h5" />
                        <path d="M21 21v-5h-5" />
                    </svg>
                </button>
            )}
        </div>
    );
}
