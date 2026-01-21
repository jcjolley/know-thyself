import React, { useState } from 'react';

interface NewConversationButtonProps {
    onClick: () => void;
    collapsed: boolean;
}

export function NewConversationButton({ onClick, collapsed }: NewConversationButtonProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isPressed, setIsPressed] = useState(false);

    const buttonStyle: React.CSSProperties = {
        width: '100%',
        height: collapsed ? 32 : 40,
        border: 'none',
        borderRadius: 8,
        background: isPressed
            ? 'linear-gradient(135deg, #b8875f 0%, #a67a55 100%)'
            : isHovered
            ? 'linear-gradient(135deg, #d4a574 0%, #c4956a 100%)'
            : 'linear-gradient(135deg, #c4956a 0%, #b8875f 100%)',
        color: '#fff',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: '0.01em',
        transition: 'all 150ms ease',
        boxShadow: isHovered
            ? '0 4px 12px rgba(196, 149, 106, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
            : '0 2px 6px rgba(196, 149, 106, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        transform: isPressed ? 'scale(0.98)' : 'scale(1)',
    };

    const iconStyle: React.CSSProperties = {
        width: 16,
        height: 16,
        strokeWidth: 2,
    };

    return (
        <button
            style={buttonStyle}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
                setIsHovered(false);
                setIsPressed(false);
            }}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            aria-label="New conversation"
            title="New conversation (Ctrl+N)"
        >
            <svg
                style={iconStyle}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M12 5v14M5 12h14" />
            </svg>
            {!collapsed && <span>New Chapter</span>}
        </button>
    );
}
