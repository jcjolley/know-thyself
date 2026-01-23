import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface MessageActionSheetProps {
    isOpen: boolean;
    canReset: boolean;
    canRegenerate: boolean;
    deleteCount?: number;
    onClose: () => void;
    onResetAfter: () => void;
    onRegenerate: () => void;
}

/**
 * Mobile bottom sheet for message actions.
 * Triggered by long-press on messages.
 */
export function MessageActionSheet({
    isOpen,
    canReset,
    canRegenerate,
    deleteCount = 0,
    onClose,
    onResetAfter,
    onRegenerate,
}: MessageActionSheetProps) {
    const { theme, isDark } = useTheme();
    const sheetRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Trigger haptic feedback on open
            if (navigator.vibrate) {
                navigator.vibrate(10);
            }
            requestAnimationFrame(() => setIsVisible(true));
        } else {
            setIsVisible(false);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            // Prevent body scroll when sheet is open
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 200);
    };

    const handleResetClick = () => {
        handleClose();
        setTimeout(onResetAfter, 200);
    };

    const handleRegenerateClick = () => {
        handleClose();
        setTimeout(onRegenerate, 200);
    };

    if (!isOpen) return null;

    const overlayStyle: React.CSSProperties = {
        position: 'fixed',
        inset: 0,
        background: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(61, 54, 48, 0.4)',
        backdropFilter: 'blur(2px)',
        zIndex: 1000,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 200ms ease',
    };

    const sheetStyle: React.CSSProperties = {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: isDark ? theme.colors.surface : '#ffffff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        boxShadow: isDark
            ? '0 -8px 32px rgba(0, 0, 0, 0.4)'
            : '0 -8px 32px rgba(61, 54, 48, 0.15)',
        transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 200ms ease-out',
        maxHeight: '60vh',
        overflow: 'auto',
        paddingBottom: 'env(safe-area-inset-bottom, 20px)',
    };

    const handleStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'center',
        padding: '12px 0 8px',
    };

    const handleBarStyle: React.CSSProperties = {
        width: 36,
        height: 4,
        borderRadius: 2,
        background: theme.colors.textMuted,
        opacity: 0.4,
    };

    const actionRowStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '16px 20px',
        minHeight: 56,
        cursor: 'pointer',
        transition: 'background 100ms ease',
    };

    const iconContainerStyle: React.CSSProperties = {
        width: 36,
        height: 36,
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    };

    const actionTextStyle: React.CSSProperties = {
        flex: 1,
        minWidth: 0,
    };

    const actionLabelStyle: React.CSSProperties = {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 15,
        fontWeight: 500,
        color: theme.colors.textPrimary,
        margin: 0,
    };

    const actionDescStyle: React.CSSProperties = {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 12,
        color: theme.colors.textMuted,
        margin: '2px 0 0',
    };

    const dividerStyle: React.CSSProperties = {
        height: 1,
        background: theme.colors.border,
        margin: '0 20px',
    };

    const cancelRowStyle: React.CSSProperties = {
        ...actionRowStyle,
        justifyContent: 'center',
        borderTop: `1px solid ${theme.colors.border}`,
        marginTop: 8,
    };

    return (
        <>
            <div style={overlayStyle} onClick={handleClose} />
            <div ref={sheetRef} style={sheetStyle}>
                {/* Drag handle */}
                <div style={handleStyle}>
                    <div style={handleBarStyle} />
                </div>

                {/* Reset action */}
                {canReset && (
                    <div
                        style={actionRowStyle}
                        onClick={handleResetClick}
                        role="button"
                        tabIndex={0}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = isDark
                                ? 'rgba(255, 255, 255, 0.05)'
                                : 'rgba(0, 0, 0, 0.03)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                        }}
                    >
                        <div style={{
                            ...iconContainerStyle,
                            background: isDark
                                ? 'rgba(212, 165, 116, 0.2)'
                                : 'rgba(196, 149, 106, 0.12)',
                        }}>
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke={theme.colors.accent}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                <path d="M3 3v5h5" />
                            </svg>
                        </div>
                        <div style={actionTextStyle}>
                            <p style={actionLabelStyle}>Reset after this</p>
                            <p style={actionDescStyle}>
                                Remove {deleteCount} {deleteCount === 1 ? 'message' : 'messages'}
                            </p>
                        </div>
                    </div>
                )}

                {canReset && canRegenerate && <div style={dividerStyle} />}

                {/* Regenerate action */}
                {canRegenerate && (
                    <div
                        style={actionRowStyle}
                        onClick={handleRegenerateClick}
                        role="button"
                        tabIndex={0}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = isDark
                                ? 'rgba(255, 255, 255, 0.05)'
                                : 'rgba(0, 0, 0, 0.03)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                        }}
                    >
                        <div style={{
                            ...iconContainerStyle,
                            background: isDark
                                ? 'rgba(212, 165, 116, 0.2)'
                                : 'rgba(196, 149, 106, 0.12)',
                        }}>
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke={theme.colors.accent}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                                <path d="M3 3v5h5" />
                                <path d="M21 21v-5h-5" />
                            </svg>
                        </div>
                        <div style={actionTextStyle}>
                            <p style={actionLabelStyle}>Regenerate response</p>
                            <p style={actionDescStyle}>Get a new reflection</p>
                        </div>
                    </div>
                )}

                {/* Cancel */}
                <div
                    style={cancelRowStyle}
                    onClick={handleClose}
                    role="button"
                    tabIndex={0}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = isDark
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'rgba(0, 0, 0, 0.03)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                    }}
                >
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={theme.colors.textMuted}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <span style={{
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        fontSize: 15,
                        color: theme.colors.textMuted,
                        marginLeft: 8,
                    }}>
                        Cancel
                    </span>
                </div>
            </div>
        </>
    );
}
