import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useApi } from '../contexts/ApiContext';

// Avatar color palette - bookshelf-inspired colors
const AVATAR_COLORS = [
    '#8b6f5c',  // Worn leather
    '#6b7c6f',  // Sage green
    '#9a7b6a',  // Terra cotta
    '#5d6d7e',  // Slate blue
    '#8e7a5e',  // Parchment gold
    '#7a6b6b',  // Dusty rose
    '#5e7d7b',  // Teal patina
    '#7c6a54',  // Walnut
];

interface CreateUserModalProps {
    isFullScreen?: boolean;
    onComplete: (userId: string) => void;
    onCancel?: () => void;
}

export function CreateUserModal({ isFullScreen = false, onComplete, onCancel }: CreateUserModalProps) {
    const { theme, isDark } = useTheme();
    const api = useApi();
    const [name, setName] = useState('');
    const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => setIsVisible(true));
    }, []);

    // Handle escape key for modal mode
    useEffect(() => {
        if (isFullScreen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && onCancel) {
                handleClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isFullScreen, onCancel]);

    const handleClose = useCallback(() => {
        if (!onCancel) return;
        setIsVisible(false);
        setTimeout(onCancel, 150);
    }, [onCancel]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Please enter your name');
            return;
        }

        setIsCreating(true);
        setError(null);

        try {
            const user = await api.users.create(name.trim(), selectedColor);
            onComplete(user.id);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create profile');
            setIsCreating(false);
        }
    };

    const getInitials = (n: string) => {
        return n
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) || '?';
    };

    const containerStyle: React.CSSProperties = isFullScreen
        ? {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: isDark
                ? `radial-gradient(ellipse at center, ${theme.colors.surface} 0%, ${theme.colors.background} 70%)`
                : 'radial-gradient(ellipse at center, #fdfcfb 0%, #f5f0e8 70%)',
            padding: 24,
        }
        : {
            position: 'fixed' as const,
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
        width: 380,
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
        transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-10px)',
        opacity: isVisible ? 1 : 0,
        transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
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
        marginBottom: 28,
        lineHeight: 1.5,
    };

    const labelStyle: React.CSSProperties = {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 13,
        fontWeight: 500,
        color: theme.colors.textSecondary,
        marginBottom: 8,
        display: 'block',
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '12px 14px',
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: 16,
        color: theme.colors.textPrimary,
        background: isDark ? theme.colors.background : '#fff',
        border: `1px solid ${theme.colors.border}`,
        borderRadius: 8,
        outline: 'none',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        boxSizing: 'border-box' as const,
    };

    const colorSwatchStyle = (color: string, isSelected: boolean): React.CSSProperties => ({
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: color,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        transform: isSelected ? 'scale(1.15)' : 'scale(1)',
        boxShadow: isSelected
            ? `0 0 0 3px ${theme.colors.background}, 0 0 0 5px ${color}`
            : 'inset 0 1px 3px rgba(0, 0, 0, 0.2)',
    });

    const previewStyle: React.CSSProperties = {
        width: 64,
        height: 64,
        borderRadius: '50%',
        background: selectedColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: 24,
        fontWeight: 500,
        color: 'rgba(255, 255, 255, 0.9)',
        boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.2)',
        margin: '0 auto 24px',
    };

    const buttonStyle: React.CSSProperties = {
        width: '100%',
        padding: '14px 20px',
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: 16,
        fontWeight: 500,
        color: '#fff',
        background: `linear-gradient(135deg, ${theme.colors.accent} 0%, #a07850 100%)`,
        border: 'none',
        borderRadius: 10,
        cursor: isCreating ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        opacity: isCreating ? 0.7 : 1,
        marginTop: 8,
        boxShadow: `0 4px 12px ${theme.colors.accentSoft}`,
    };

    const cancelButtonStyle: React.CSSProperties = {
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
        <div style={containerStyle} onClick={!isFullScreen ? handleClose : undefined}>
            <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: theme.colors.accentSoft,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto',
                    }}>
                        <svg
                            width="24"
                            height="24"
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
                </div>

                <h2 style={titleStyle}>
                    {isFullScreen ? 'Welcome to Know Thyself' : 'Create Profile'}
                </h2>
                <p style={subtitleStyle}>
                    {isFullScreen
                        ? 'Begin your journey of self-reflection. Create your profile to get started.'
                        : 'Add a new profile to keep your reflections separate.'}
                </p>

                <form onSubmit={handleSubmit}>
                    {/* Preview Avatar */}
                    <div style={previewStyle}>
                        {getInitials(name || '?')}
                    </div>

                    {/* Name Input */}
                    <label style={labelStyle}>Your Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name"
                        style={inputStyle}
                        autoFocus
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = theme.colors.accent;
                            e.currentTarget.style.boxShadow = `0 0 0 3px ${theme.colors.accentSoft}`;
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = theme.colors.border;
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    />

                    {/* Color Picker */}
                    <div style={{ marginTop: 20 }}>
                        <label style={labelStyle}>Avatar Color</label>
                        <div style={{
                            display: 'flex',
                            gap: 10,
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                        }}>
                            {AVATAR_COLORS.map((color) => (
                                <div
                                    key={color}
                                    style={colorSwatchStyle(color, selectedColor === color)}
                                    onClick={() => setSelectedColor(color)}
                                />
                            ))}
                        </div>
                    </div>

                    {error && (
                        <p style={{
                            color: theme.colors.error,
                            fontSize: 13,
                            marginTop: 16,
                            textAlign: 'center',
                        }}>
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={isCreating}
                        style={buttonStyle}
                        onMouseEnter={(e) => {
                            if (!isCreating) {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = `0 6px 16px ${theme.colors.accentSoft}`;
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = `0 4px 12px ${theme.colors.accentSoft}`;
                        }}
                    >
                        {isCreating ? 'Creating...' : (isFullScreen ? 'Begin Your Journey' : 'Create Profile')}
                    </button>

                    {onCancel && !isFullScreen && (
                        <button
                            type="button"
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
                    )}
                </form>
            </div>
        </div>
    );
}
