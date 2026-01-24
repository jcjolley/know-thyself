import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import type { User } from '../../shared/types';

interface UserSwitcherProps {
    onAddProfile: () => void;
}

export function UserSwitcher({ onAddProfile }: UserSwitcherProps) {
    const { theme } = useTheme();
    const { currentUser, users, selectUser } = useUser();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close on escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleSelectUser = async (user: User) => {
        if (user.id === currentUser?.id) {
            setIsOpen(false);
            return;
        }
        try {
            await selectUser(user.id);
            setIsOpen(false);
            // Reload the page to refresh all data for the new user
            window.location.reload();
        } catch (err) {
            console.error('Failed to switch user:', err);
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

    if (!currentUser) return null;

    const triggerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        background: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    };

    const avatarStyle = (color: string, size: number = 28): React.CSSProperties => ({
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: size * 0.4,
        fontWeight: 500,
        color: 'rgba(255, 255, 255, 0.9)',
        boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.2)',
        flexShrink: 0,
    });

    const dropdownStyle: React.CSSProperties = {
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        minWidth: 220,
        background: `linear-gradient(180deg, ${theme.colors.surface} 0%, ${theme.colors.background} 100%)`,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: 12,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
        overflow: 'hidden',
        zIndex: 1000,
        animation: isOpen ? 'dropdownEnter 150ms ease' : undefined,
    };

    const userItemStyle = (isActive: boolean): React.CSSProperties => ({
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        cursor: 'pointer',
        transition: 'background 0.15s ease',
        background: isActive ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
    });

    const addButtonStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        cursor: 'pointer',
        transition: 'background 0.15s ease',
        borderTop: `1px solid ${theme.colors.border}`,
        color: theme.colors.textMuted,
    };

    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            <style>
                {`
                    @keyframes dropdownEnter {
                        from {
                            opacity: 0;
                            transform: scale(0.95) translateY(-4px);
                        }
                        to {
                            opacity: 1;
                            transform: scale(1) translateY(0);
                        }
                    }
                `}
            </style>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={triggerStyle}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                }}
            >
                <div style={avatarStyle(currentUser.avatar_color)}>
                    {getInitials(currentUser.name)}
                </div>
                <span style={{
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: 14,
                    color: 'rgba(255, 255, 255, 0.9)',
                }}>
                    {currentUser.name}
                </span>
                <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                        color: 'rgba(255, 255, 255, 0.5)',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                    }}
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {isOpen && (
                <div style={dropdownStyle}>
                    {users.map((user) => (
                        <div
                            key={user.id}
                            style={userItemStyle(user.id === currentUser.id)}
                            onClick={() => handleSelectUser(user)}
                            onMouseEnter={(e) => {
                                if (user.id !== currentUser.id) {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (user.id !== currentUser.id) {
                                    e.currentTarget.style.background = 'transparent';
                                }
                            }}
                        >
                            <div style={avatarStyle(user.avatar_color, 32)}>
                                {getInitials(user.name)}
                            </div>
                            <span style={{
                                flex: 1,
                                fontFamily: 'Georgia, "Times New Roman", serif',
                                fontSize: 14,
                                color: theme.colors.textPrimary,
                            }}>
                                {user.name}
                            </span>
                            {user.id === currentUser.id && (
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke={theme.colors.accent}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            )}
                        </div>
                    ))}
                    <div
                        style={addButtonStyle}
                        onClick={() => {
                            setIsOpen(false);
                            onAddProfile();
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                        }}
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="16" />
                            <line x1="8" y1="12" x2="16" y2="12" />
                        </svg>
                        <span style={{
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                            fontSize: 14,
                        }}>
                            Add Profile
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
