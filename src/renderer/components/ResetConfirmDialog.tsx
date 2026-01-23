import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface ResetConfirmDialogProps {
    messagePreview: string;  // Truncated to 60 chars
    deleteCount: number;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading: boolean;
}

/**
 * Amber-themed reset confirmation dialog.
 * Contemplative rather than alarming - reset is reflective editing, not destructive deletion.
 */
export function ResetConfirmDialog({
    messagePreview,
    deleteCount,
    onConfirm,
    onCancel,
    isLoading,
}: ResetConfirmDialogProps) {
    const { theme, isDark } = useTheme();
    const dialogRef = useRef<HTMLDivElement>(null);
    const cancelButtonRef = useRef<HTMLButtonElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger enter animation
        requestAnimationFrame(() => setIsVisible(true));

        // Focus cancel button (safe default)
        cancelButtonRef.current?.focus();

        // Handle escape key
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isLoading) {
                handleClose();
            }
        };

        // Trap focus within dialog
        const handleFocusTrap = (e: FocusEvent) => {
            if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
                cancelButtonRef.current?.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('focusin', handleFocusTrap);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('focusin', handleFocusTrap);
        };
    }, [isLoading]);

    const handleClose = () => {
        if (isLoading) return;
        setIsVisible(false);
        setTimeout(onCancel, 150);
    };

    const handleConfirm = () => {
        if (isLoading) return;
        onConfirm();
    };

    // Truncate preview to 60 chars
    const truncatedPreview = messagePreview.length > 60
        ? messagePreview.substring(0, 60) + '...'
        : messagePreview;

    const overlayStyle: React.CSSProperties = {
        position: 'fixed',
        inset: 0,
        background: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(61, 54, 48, 0.4)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 150ms ease',
    };

    const dialogStyle: React.CSSProperties = {
        background: isDark
            ? `linear-gradient(180deg, ${theme.colors.surface} 0%, ${theme.colors.background} 100%)`
            : 'linear-gradient(180deg, #fdfcfb 0%, #f8f5f0 100%)',
        borderRadius: 12,
        boxShadow: isDark
            ? '0 20px 40px rgba(0, 0, 0, 0.4), 0 8px 16px rgba(0, 0, 0, 0.3)'
            : '0 20px 40px rgba(61, 54, 48, 0.2), 0 8px 16px rgba(61, 54, 48, 0.1)',
        width: 380,
        maxWidth: '90vw',
        padding: '24px',
        transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-10px)',
        opacity: isVisible ? 1 : 0,
        transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
        border: `1px solid ${theme.colors.border}`,
    };

    // Amber/gold colors for contemplative action
    const iconBgColor = isDark ? 'rgba(212, 165, 116, 0.2)' : 'rgba(212, 165, 116, 0.15)';
    const accentColor = theme.colors.accent;

    const iconContainerStyle: React.CSSProperties = {
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: iconBgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    };

    const titleStyle: React.CSSProperties = {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: 18,
        fontWeight: 400,
        color: theme.colors.textPrimary,
        margin: '0 0 12px 0',
    };

    const messageStyle: React.CSSProperties = {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 14,
        color: theme.colors.textSecondary,
        margin: '0 0 16px 0',
        lineHeight: 1.5,
    };

    const previewBoxStyle: React.CSSProperties = {
        background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
        borderRadius: 8,
        padding: '12px 14px',
        marginBottom: 20,
        borderLeft: `3px solid ${accentColor}`,
    };

    const previewLabelStyle: React.CSSProperties = {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 11,
        fontWeight: 500,
        color: theme.colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: 6,
    };

    const previewTextStyle: React.CSSProperties = {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: 13,
        color: theme.colors.textPrimary,
        fontStyle: 'italic',
        lineHeight: 1.4,
        margin: 0,
    };

    const buttonsStyle: React.CSSProperties = {
        display: 'flex',
        gap: 12,
        justifyContent: 'flex-end',
    };

    const buttonBaseStyle: React.CSSProperties = {
        padding: '10px 20px',
        borderRadius: 8,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 14,
        fontWeight: 500,
        cursor: isLoading ? 'wait' : 'pointer',
        transition: 'all 150ms ease',
    };

    const cancelButtonStyle: React.CSSProperties = {
        ...buttonBaseStyle,
        background: 'transparent',
        border: `1px solid ${theme.colors.border}`,
        color: theme.colors.textSecondary,
        opacity: isLoading ? 0.5 : 1,
    };

    const confirmButtonStyle: React.CSSProperties = {
        ...buttonBaseStyle,
        background: isLoading
            ? (isDark ? theme.colors.surface : '#e8e4df')
            : `linear-gradient(135deg, ${accentColor} 0%, ${isDark ? '#b8896a' : '#b08560'} 100%)`,
        border: 'none',
        color: isLoading ? theme.colors.textMuted : '#fff',
        boxShadow: isLoading ? 'none' : `0 2px 6px rgba(196, 149, 106, 0.3)`,
    };

    return (
        <div
            style={overlayStyle}
            onClick={handleClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-dialog-title"
        >
            <div
                ref={dialogRef}
                style={dialogStyle}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={iconContainerStyle}>
                    {/* Hourglass/time-travel icon */}
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={accentColor}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                        <circle cx="12" cy="12" r="2" />
                    </svg>
                </div>

                <h2 id="reset-dialog-title" style={titleStyle}>Return to this moment?</h2>

                <p style={messageStyle}>
                    This will remove{' '}
                    <strong style={{ color: theme.colors.textPrimary }}>
                        {deleteCount} {deleteCount === 1 ? 'reflection' : 'reflections'}
                    </strong>{' '}
                    that came after. You can always explore new paths.
                </p>

                <div style={previewBoxStyle}>
                    <div style={previewLabelStyle}>Keeping this message</div>
                    <p style={previewTextStyle}>"{truncatedPreview}"</p>
                </div>

                <div style={buttonsStyle}>
                    <button
                        ref={cancelButtonRef}
                        style={cancelButtonStyle}
                        onClick={handleClose}
                        disabled={isLoading}
                        onMouseEnter={(e) => {
                            if (!isLoading) {
                                e.currentTarget.style.background = isDark
                                    ? 'rgba(255, 255, 255, 0.05)'
                                    : 'rgba(139, 129, 120, 0.08)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                        }}
                    >
                        Stay here
                    </button>
                    <button
                        style={confirmButtonStyle}
                        onClick={handleConfirm}
                        disabled={isLoading}
                        onMouseEnter={(e) => {
                            if (!isLoading) {
                                e.currentTarget.style.background = isDark
                                    ? `linear-gradient(135deg, #c4956a 0%, #a87a55 100%)`
                                    : `linear-gradient(135deg, #b8896a 0%, #a07850 100%)`;
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(196, 149, 106, 0.4)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isLoading) {
                                e.currentTarget.style.background = `linear-gradient(135deg, ${accentColor} 0%, ${isDark ? '#b8896a' : '#b08560'} 100%)`;
                                e.currentTarget.style.boxShadow = '0 2px 6px rgba(196, 149, 106, 0.3)';
                            }
                        }}
                    >
                        {isLoading ? 'Going back...' : 'Go back'}
                    </button>
                </div>
            </div>
        </div>
    );
}
