import React from 'react';
import { ConversationItem } from './ConversationItem';
import type { ConversationListItem } from './ConversationSidebar';
import { useTheme } from '../contexts/ThemeContext';

interface ConversationListProps {
    conversations: ConversationListItem[];
    activeId: string | null;
    collapsed: boolean;
    searchQuery: string;
    onSelect: (id: string) => void;
    onUpdateTitle: (id: string, title: string) => void;
    onDelete: (id: string) => void;
}

export function ConversationList({
    conversations,
    activeId,
    collapsed,
    searchQuery,
    onSelect,
    onUpdateTitle,
    onDelete,
}: ConversationListProps) {
    const { theme } = useTheme();

    const containerStyle: React.CSSProperties = {
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: collapsed ? '8px 4px' : '8px 12px',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(139, 129, 120, 0.3) transparent',
    };

    const emptyStateStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        textAlign: 'center',
        opacity: collapsed ? 0 : 1,
        transition: 'opacity 150ms ease',
    };

    const emptyIconStyle: React.CSSProperties = {
        width: 48,
        height: 48,
        marginBottom: 16,
        color: theme.colors.textMuted,
    };

    const emptyTitleStyle: React.CSSProperties = {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: 15,
        fontWeight: 400,
        color: theme.colors.textMuted,
        margin: '0 0 8px 0',
    };

    const emptyTextStyle: React.CSSProperties = {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 13,
        color: theme.colors.textSecondary,
        margin: 0,
        lineHeight: 1.5,
    };

    const noResultsStyle: React.CSSProperties = {
        ...emptyStateStyle,
        padding: '24px 16px',
    };

    // Empty state - no conversations at all
    if (conversations.length === 0 && !searchQuery) {
        return (
            <div style={containerStyle}>
                {!collapsed && (
                    <div style={emptyStateStyle}>
                        <svg
                            style={emptyIconStyle}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                            <path d="M8 7h8" />
                            <path d="M8 11h6" />
                        </svg>
                        <h3 style={emptyTitleStyle}>Begin Your Journey</h3>
                        <p style={emptyTextStyle}>
                            Start your first chapter of<br />
                            self-discovery above.
                        </p>
                    </div>
                )}
            </div>
        );
    }

    // No results from search
    if (conversations.length === 0 && searchQuery) {
        return (
            <div style={containerStyle}>
                {!collapsed && (
                    <div style={noResultsStyle}>
                        <svg
                            style={{ ...emptyIconStyle, width: 32, height: 32, marginBottom: 12 }}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <path d="M21 21l-4.35-4.35" />
                            <path d="M8 8l6 6" />
                            <path d="M14 8l-6 6" />
                        </svg>
                        <p style={{ ...emptyTextStyle, fontSize: 13 }}>
                            No chapters found for<br />
                            "<span style={{ color: theme.colors.textPrimary }}>{searchQuery}</span>"
                        </p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            <style>{`
                .conversation-list::-webkit-scrollbar {
                    width: 6px;
                }
                .conversation-list::-webkit-scrollbar-track {
                    background: transparent;
                }
                .conversation-list::-webkit-scrollbar-thumb {
                    background: rgba(139, 129, 120, 0.3);
                    border-radius: 3px;
                }
                .conversation-list::-webkit-scrollbar-thumb:hover {
                    background: rgba(139, 129, 120, 0.5);
                }
            `}</style>
            <div className="conversation-list" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {conversations.map((conversation, index) => (
                    <ConversationItem
                        key={conversation.id}
                        conversation={conversation}
                        isActive={conversation.id === activeId}
                        collapsed={collapsed}
                        index={index}
                        onSelect={() => onSelect(conversation.id)}
                        onUpdateTitle={(title) => onUpdateTitle(conversation.id, title)}
                        onDelete={() => onDelete(conversation.id)}
                    />
                ))}
            </div>
        </div>
    );
}
