import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface ConversationSearchProps {
    value: string;
    onChange: (value: string) => void;
}

export function ConversationSearch({ value, onChange }: ConversationSearchProps) {
    const { theme, isDark } = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;

        // Debounce the search
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            onChange(newValue);
        }, 300);

        // Update input immediately for responsive feel
        if (inputRef.current) {
            inputRef.current.value = newValue;
        }
    };

    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    const containerStyle: React.CSSProperties = {
        position: 'relative',
        width: '100%',
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        height: 36,
        padding: '0 32px 0 36px',
        border: `1px solid ${isFocused ? theme.colors.accent : theme.colors.border}`,
        borderRadius: 8,
        background: isFocused ? theme.colors.surface : (isDark ? theme.colors.background : 'rgba(255, 255, 255, 0.6)'),
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 13,
        color: theme.colors.textPrimary,
        outline: 'none',
        transition: 'all 150ms ease',
        boxShadow: isFocused
            ? `0 2px 8px ${theme.colors.accentSoft}, inset 0 1px 2px rgba(0, 0, 0, 0.02)`
            : 'inset 0 1px 2px rgba(0, 0, 0, 0.02)',
        boxSizing: 'border-box',
    };

    const iconStyle: React.CSSProperties = {
        position: 'absolute',
        left: 12,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 16,
        height: 16,
        color: isFocused ? theme.colors.accent : theme.colors.textSecondary,
        transition: 'color 150ms ease',
        pointerEvents: 'none',
    };

    const clearButtonStyle: React.CSSProperties = {
        position: 'absolute',
        right: 8,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 20,
        height: 20,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        display: value ? 'flex' : 'none',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
        color: theme.colors.textSecondary,
        padding: 0,
        transition: 'all 150ms ease',
    };

    return (
        <div style={containerStyle}>
            <svg
                style={iconStyle}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
                ref={inputRef}
                type="text"
                placeholder="Search chapters..."
                defaultValue={value}
                onChange={handleChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                style={inputStyle}
                aria-label="Search conversations"
            />
            <button
                style={clearButtonStyle}
                onClick={() => {
                    onChange('');
                    if (inputRef.current) {
                        inputRef.current.value = '';
                        inputRef.current.focus();
                    }
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = theme.colors.accentSoft;
                    e.currentTarget.style.color = theme.colors.textPrimary;
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = theme.colors.textSecondary;
                }}
                aria-label="Clear search"
                tabIndex={value ? 0 : -1}
            >
                <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M18 6L6 18M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}
