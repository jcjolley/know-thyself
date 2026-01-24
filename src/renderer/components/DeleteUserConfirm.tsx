import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import type { User } from '../../shared/types';

interface DeleteUserConfirmProps {
    user: User;
    conversationCount: number;
    onConfirm: () => Promise<void>;
    onCancel: () => void;
}

export function DeleteUserConfirm({ user, conversationCount, onConfirm, onCancel }: DeleteUserConfirmProps) {
    const { theme, isDark } = useTheme();
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => setIsVisible(true));
    }, []);

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleClose = useCallback(() => {
        setIsVisible(false);
        setTimeout(onCancel, 150);
    }, [onCancel]);

    const handleDelete = async () => {
        setIsDeleting(true);
        setError(null);
        try {
            await onConfirm();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete profile');
            setIsDeleting(false);
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const overlayStyle: React.CSSProperties = {
        position: 'fixed',
        inset: 0,
        background: isDark ? 'rgba(10, 8, 6, 0.8)' : 'rgba(61, 54, 48, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 150ms ease',
    };

    const cardStyle: React.CSSProperties = {
        width: 400,
        maxWidth: '90vw',
        background: isDark
            ? `linear-gradient(180deg, ${theme.colors.surface} 0%, ${theme.colors.background} 100%)`
            : 'linear-gradient(180deg, #fdfcfb 0%, #f8f5f0 100%)',
        borderRadius: 16,
        padding: 28,
        boxShadow: isDark
            ? '0 20px 60px rgba(0, 0, 0, 0.5)'
            : '0 20px 60px rgba(61, 54, 48, 0.2)',
        border: `1px solid ${theme.colors.border}`,
        transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-10px)',
        opacity: isVisible ? 1 : 0,
        transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    };

    const iconContainerStyle: React.CSSProperties = {
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: `rgba(196, 90, 74, 0.1)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px',
    };

    const titleStyle: React.CSSProperties = {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: 20,
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
        marginBottom: 20,
        lineHeight: 1.5,
    };

    const userPreviewStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        background: isDark ? theme.colors.background : '#fff',
        border: `1px solid ${theme.colors.border}`,
        borderRadius: 10,
        marginBottom: 16,
    };

    const avatarStyle: React.CSSProperties = {
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: user.avatar_color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: 16,
        fontWeight: 500,
        color: 'rgba(255, 255, 255, 0.9)',
        boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.2)',
    };

    const deleteListStyle: React.CSSProperties = {
        background: isDark ? theme.colors.background : '#fff',
        border: `1px solid ${theme.colors.border}`,
        borderRadius: 10,
        padding: 16,
        marginBottom: 20,
    };

    const deleteItemStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 0',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 14,
        color: theme.colors.textSecondary,
    };

    const warningStyle: React.CSSProperties = {
        fontSize: 13,
        color: theme.colors.error,
        textAlign: 'center',
        marginBottom: 20,
        fontWeight: 500,
    };

    const buttonRowStyle: React.CSSProperties = {
        display: 'flex',
        gap: 12,
    };

    const cancelButtonStyle: React.CSSProperties = {
        flex: 1,
        padding: '12px 20px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 14,
        color: theme.colors.textSecondary,
        background: 'transparent',
        border: `1px solid ${theme.colors.border}`,
        borderRadius: 10,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    };

    const deleteButtonStyle: React.CSSProperties = {
        flex: 1,
        padding: '12px 20px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 14,
        fontWeight: 500,
        color: '#fff',
        background: `linear-gradient(135deg, ${theme.colors.error} 0%, #a04030 100%)`,
        border: 'none',
        borderRadius: 10,
        cursor: isDeleting ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        opacity: isDeleting ? 0.7 : 1,
        boxShadow: '0 4px 12px rgba(196, 90, 74, 0.3)',
    };

    return (
        <div style={overlayStyle} onClick={handleClose}>
            <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
                {/* Icon */}
                <div style={iconContainerStyle}>
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={theme.colors.error}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                        <line x1="5" y1="5" x2="19" y2="19" />
                    </svg>
                </div>

                <h2 style={titleStyle}>Delete Profile?</h2>
                <p style={subtitleStyle}>
                    This will permanently delete this profile and all associated data.
                </p>

                {/* User Preview */}
                <div style={userPreviewStyle}>
                    <div style={avatarStyle}>
                        {getInitials(user.name)}
                    </div>
                    <div>
                        <div style={{
                            fontFamily: 'Georgia, "Times New Roman", serif',
                            fontSize: 16,
                            color: theme.colors.textPrimary,
                        }}>
                            {user.name}
                        </div>
                        <div style={{
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                            fontSize: 12,
                            color: theme.colors.textMuted,
                        }}>
                            Created {new Date(user.created_at).toLocaleDateString()}
                        </div>
                    </div>
                </div>

                {/* What will be deleted */}
                <div style={deleteListStyle}>
                    <div style={{ ...deleteItemStyle, borderBottom: `1px solid ${theme.colors.border}`, paddingBottom: 10, marginBottom: 4 }}>
                        <strong style={{ color: theme.colors.textPrimary }}>The following will be deleted:</strong>
                    </div>
                    <div style={deleteItemStyle}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        {conversationCount} conversation{conversationCount !== 1 ? 's' : ''}
                    </div>
                    <div style={deleteItemStyle}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                        All profile insights and values
                    </div>
                    <div style={deleteItemStyle}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                        </svg>
                        All psychological signals
                    </div>
                </div>

                <p style={warningStyle}>
                    This action cannot be undone.
                </p>

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

                <div style={buttonRowStyle}>
                    <button
                        onClick={handleClose}
                        style={cancelButtonStyle}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(139, 129, 120, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        style={deleteButtonStyle}
                        onMouseEnter={(e) => {
                            if (!isDeleting) {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete Profile'}
                    </button>
                </div>
            </div>
        </div>
    );
}
