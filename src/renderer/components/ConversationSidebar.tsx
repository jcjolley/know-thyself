import React, { useEffect } from 'react';
import { ConversationList } from './ConversationList';
import { ConversationSearch } from './ConversationSearch';
import { NewConversationButton } from './NewConversationButton';

export interface ConversationListItem {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    message_count: number;
    preview: string | null;
}

interface ConversationSidebarProps {
    conversations: ConversationListItem[];
    activeId: string | null;
    collapsed: boolean;
    searchQuery: string;
    onSelect: (id: string) => void;
    onNew: () => void;
    onToggle: () => void;
    onSearch: (query: string) => void;
    onUpdateTitle: (id: string, title: string) => void;
    onDelete: (id: string) => void;
}

export function ConversationSidebar({
    conversations,
    activeId,
    collapsed,
    searchQuery,
    onSelect,
    onNew,
    onToggle,
    onSearch,
    onUpdateTitle,
    onDelete,
}: ConversationSidebarProps) {
    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const modifier = isMac ? e.metaKey : e.ctrlKey;

            if (modifier && e.key.toLowerCase() === 'n') {
                e.preventDefault();
                onNew();
            }
            if (modifier && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                onToggle();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onNew, onToggle]);

    const filteredConversations = searchQuery
        ? conversations.filter(
              (c) =>
                  c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  c.preview?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : conversations;

    const sidebarStyle: React.CSSProperties = {
        width: collapsed ? 48 : 280,
        minWidth: collapsed ? 48 : 280,
        height: '100%',
        background: 'linear-gradient(180deg, #f8f5f0 0%, #f5f2ed 100%)',
        borderRight: '1px solid rgba(139, 129, 120, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 200ms cubic-bezier(0.4, 0, 0.2, 1), min-width 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'inset -1px 0 0 rgba(255, 255, 255, 0.5)',
    };

    const headerStyle: React.CSSProperties = {
        padding: collapsed ? '12px 8px' : '16px',
        borderBottom: '1px solid rgba(139, 129, 120, 0.15)',
        background: 'rgba(255, 255, 255, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: collapsed ? 8 : 12,
    };

    const toggleButtonStyle: React.CSSProperties = {
        width: 32,
        height: 32,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
        color: '#8b8178',
        transition: 'all 150ms ease',
        alignSelf: collapsed ? 'center' : 'flex-end',
    };

    const titleStyle: React.CSSProperties = {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: 13,
        fontWeight: 400,
        color: '#6b6359',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        margin: 0,
        opacity: collapsed ? 0 : 1,
        transition: 'opacity 150ms ease',
        whiteSpace: 'nowrap',
    };

    const contentStyle: React.CSSProperties = {
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    };

    // Decorative page edge effect
    const pageEdgeStyle: React.CSSProperties = {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 3,
        background: 'linear-gradient(90deg, transparent 0%, rgba(139, 129, 120, 0.08) 100%)',
        pointerEvents: 'none',
    };

    return (
        <aside style={sidebarStyle} aria-label="Conversations">
            <div style={headerStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between' }}>
                    {!collapsed && <h2 style={titleStyle}>Chapters</h2>}
                    <button
                        style={toggleButtonStyle}
                        onClick={onToggle}
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        title={collapsed ? 'Expand (Ctrl+B)' : 'Collapse (Ctrl+B)'}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(196, 149, 106, 0.12)';
                            e.currentTarget.style.color = '#c4956a';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#8b8178';
                        }}
                    >
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                                transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 200ms ease',
                            }}
                        >
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <path d="M9 3v18" />
                            <path d="M14 9l-3 3 3 3" />
                        </svg>
                    </button>
                </div>

                <NewConversationButton onClick={onNew} collapsed={collapsed} />

                {!collapsed && (
                    <ConversationSearch
                        value={searchQuery}
                        onChange={onSearch}
                    />
                )}
            </div>

            <div style={contentStyle}>
                <ConversationList
                    conversations={filteredConversations}
                    activeId={activeId}
                    collapsed={collapsed}
                    searchQuery={searchQuery}
                    onSelect={onSelect}
                    onUpdateTitle={onUpdateTitle}
                    onDelete={onDelete}
                />
            </div>

            <div style={pageEdgeStyle} />
        </aside>
    );
}
