import React, { useState, useRef, useEffect } from 'react';
import type { ConversationListItem } from './ConversationSidebar';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { useTheme } from '../contexts/ThemeContext';

interface ContextMenuState {
    visible: boolean;
    x: number;
    y: number;
}

interface ConversationItemProps {
    conversation: ConversationListItem;
    isActive: boolean;
    collapsed: boolean;
    index: number;
    onSelect: () => void;
    onUpdateTitle: (title: string) => void;
    onDelete: () => void;
}

export function ConversationItem({
    conversation,
    isActive,
    collapsed,
    index,
    onSelect,
    onUpdateTitle,
    onDelete,
}: ConversationItemProps) {
    const { theme, isDark } = useTheme();
    const [isHovered, setIsHovered] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(conversation.title);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0 });
    const inputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    // Update edit value when conversation title changes externally
    useEffect(() => {
        setEditValue(conversation.title);
    }, [conversation.title]);

    // Close context menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setContextMenu({ visible: false, x: 0, y: 0 });
            }
        };
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setContextMenu({ visible: false, x: 0, y: 0 });
            }
        };
        if (contextMenu.visible) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [contextMenu.visible]);

    const handleContextMenu = (e: React.MouseEvent) => {
        if (collapsed) return;
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
    };

    const handleRename = () => {
        setContextMenu({ visible: false, x: 0, y: 0 });
        setIsEditing(true);
    };

    const handleDeleteFromMenu = () => {
        setContextMenu({ visible: false, x: 0, y: 0 });
        setShowDeleteConfirm(true);
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        if (collapsed) return;
        e.preventDefault();
        e.stopPropagation();
        setIsEditing(true);
    };

    const handleSave = () => {
        const trimmed = editValue.trim();
        if (trimmed && trimmed !== conversation.title) {
            onUpdateTitle(trimmed);
        } else {
            setEditValue(conversation.title);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            setEditValue(conversation.title);
            setIsEditing(false);
        }
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowDeleteConfirm(true);
    };

    const containerStyle: React.CSSProperties = {
        position: 'relative',
        padding: collapsed ? '8px 4px' : '12px 14px',
        borderRadius: 8,
        cursor: 'pointer',
        background: isActive
            ? `linear-gradient(135deg, ${theme.colors.accentSoft} 0%, rgba(196, 149, 106, 0.08) 100%)`
            : isHovered
            ? (isDark ? theme.colors.surfaceHover : 'rgba(255, 255, 255, 0.6)')
            : 'transparent',
        border: isActive
            ? `1px solid ${isDark ? theme.colors.accent : 'rgba(196, 149, 106, 0.3)'}`
            : '1px solid transparent',
        transition: 'all 150ms ease',
        animation: `fadeInItem 200ms ease ${index * 30}ms both`,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        overflow: 'hidden',
    };

    const chapterNumberStyle: React.CSSProperties = {
        position: 'absolute',
        top: collapsed ? 8 : 10,
        left: collapsed ? '50%' : 14,
        transform: collapsed ? 'translateX(-50%)' : 'none',
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: collapsed ? 14 : 11,
        fontWeight: 400,
        color: isActive ? theme.colors.accent : theme.colors.textMuted,
        fontStyle: 'italic',
        lineHeight: 1,
    };

    const titleContainerStyle: React.CSSProperties = {
        paddingLeft: collapsed ? 0 : 0,
        opacity: collapsed ? 0 : 1,
        transition: 'opacity 150ms ease',
    };

    const titleStyle: React.CSSProperties = {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: 14,
        fontWeight: 400,
        color: isActive ? theme.colors.textPrimary : (isDark ? theme.colors.textSecondary : '#4a4540'),
        margin: 0,
        lineHeight: 1.35,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        display: 'block',
    };

    const inputStyle: React.CSSProperties = {
        ...titleStyle,
        width: '100%',
        padding: '2px 4px',
        margin: '-2px -4px',
        border: `1px solid ${theme.colors.accent}`,
        borderRadius: 4,
        background: theme.colors.surface,
        color: theme.colors.textPrimary,
        outline: 'none',
        boxSizing: 'border-box',
    };

    const metaStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 11,
        color: theme.colors.textSecondary,
    };

    const previewStyle: React.CSSProperties = {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 12,
        color: theme.colors.textMuted,
        margin: 0,
        lineHeight: 1.4,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontStyle: 'italic',
    };

    // Roman numeral conversion for chapter numbers (simplified)
    const toRoman = (num: number): string => {
        if (num <= 0 || num > 50) return String(num);
        const roman = ['', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x',
            'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi', 'xvii', 'xviii', 'xix', 'xx',
            'xxi', 'xxii', 'xxiii', 'xxiv', 'xxv', 'xxvi', 'xxvii', 'xxviii', 'xxix', 'xxx'];
        return roman[num] || String(num);
    };

    return (
        <>
            <style>{`
                @keyframes fadeInItem {
                    from {
                        opacity: 0;
                        transform: translateX(-8px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
            `}</style>

            <div
                style={containerStyle}
                onClick={onSelect}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onDoubleClick={handleDoubleClick}
                onContextMenu={handleContextMenu}
                role="button"
                tabIndex={0}
                aria-label={`${conversation.title}, ${conversation.message_count} messages, ${formatDate(conversation.updated_at)}`}
                aria-current={isActive ? 'true' : undefined}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isEditing) {
                        onSelect();
                    }
                }}
            >
                {/* Chapter number indicator */}
                {collapsed && (
                    <span style={chapterNumberStyle}>{toRoman(index + 1)}</span>
                )}

                {!collapsed && (
                    <>
                        {/* Header row: title on left, actions on right - never overlap */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 8,
                        }}>
                            {/* Title area - takes remaining space, truncates */}
                            <div style={{ ...titleContainerStyle, flex: 1, minWidth: 0 }}>
                                {isEditing ? (
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={handleSave}
                                        onKeyDown={handleKeyDown}
                                        onClick={(e) => e.stopPropagation()}
                                        style={inputStyle}
                                        maxLength={100}
                                        aria-label="Edit conversation title"
                                    />
                                ) : (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                        {conversation.journey_id && (
                                            <svg
                                                width="14"
                                                height="14"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke={theme.colors.accent}
                                                strokeWidth="1.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                title="Guided Journey"
                                                style={{ flexShrink: 0 }}
                                            >
                                                <circle cx="12" cy="12" r="10" />
                                                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                                            </svg>
                                        )}
                                        <span style={titleStyle} title={conversation.title}>
                                            {conversation.title}
                                        </span>
                                    </span>
                                )}
                            </div>

                            {/* Action buttons - fixed width, appear on hover */}
                            <div
                                style={{
                                    display: 'flex',
                                    gap: 2,
                                    flexShrink: 0,
                                    opacity: isHovered ? 1 : 0,
                                    transition: 'opacity 150ms ease',
                                    marginTop: -2,
                                    marginRight: -4,
                                }}
                            >
                                {/* Rename button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsEditing(true);
                                    }}
                                    style={{
                                        width: 22,
                                        height: 22,
                                        border: 'none',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: 4,
                                        color: theme.colors.textSecondary,
                                        padding: 0,
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = theme.colors.accentSoft;
                                        e.currentTarget.style.color = theme.colors.accent;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = theme.colors.textSecondary;
                                    }}
                                    aria-label="Rename conversation"
                                    title="Rename"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                </button>
                                {/* Delete button */}
                                <button
                                    onClick={handleDeleteClick}
                                    style={{
                                        width: 22,
                                        height: 22,
                                        border: 'none',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: 4,
                                        color: theme.colors.textSecondary,
                                        padding: 0,
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = `rgba(196, 90, 74, ${isDark ? '0.2' : '0.1'})`;
                                        e.currentTarget.style.color = theme.colors.error;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = theme.colors.textSecondary;
                                    }}
                                    aria-label="Delete conversation"
                                    title="Delete"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div style={metaStyle}>
                            <span>{conversation.message_count} {conversation.message_count === 1 ? 'entry' : 'entries'}</span>
                            <span style={{ color: theme.colors.textMuted }}>·</span>
                            <span>{formatDate(conversation.updated_at)}</span>
                        </div>

                        {conversation.preview && (
                            <p style={previewStyle} title={conversation.preview}>
                                "{conversation.preview}"
                            </p>
                        )}
                    </>
                )}
            </div>

            {showDeleteConfirm && (
                <DeleteConfirmDialog
                    title={conversation.title}
                    onConfirm={() => {
                        setShowDeleteConfirm(false);
                        onDelete();
                    }}
                    onCancel={() => setShowDeleteConfirm(false)}
                />
            )}

            {/* Context Menu */}
            {contextMenu.visible && (
                <div
                    ref={menuRef}
                    style={{
                        position: 'fixed',
                        top: contextMenu.y,
                        left: contextMenu.x,
                        background: theme.colors.surface,
                        borderRadius: 8,
                        boxShadow: `0 4px 20px ${theme.colors.shadow}, 0 0 0 1px ${theme.colors.border}`,
                        padding: '4px 0',
                        minWidth: 160,
                        zIndex: 1000,
                        animation: 'menuFadeIn 100ms ease',
                    }}
                >
                    <style>{`
                        @keyframes menuFadeIn {
                            from { opacity: 0; transform: scale(0.95); }
                            to { opacity: 1; transform: scale(1); }
                        }
                    `}</style>
                    <button
                        onClick={handleRename}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            width: '100%',
                            padding: '8px 14px',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                            fontSize: 13,
                            color: theme.colors.textPrimary,
                            textAlign: 'left',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = theme.colors.accentSoft; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Rename
                    </button>
                    <div style={{ height: 1, background: theme.colors.border, margin: '4px 8px' }} />
                    <button
                        onClick={handleDeleteFromMenu}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            width: '100%',
                            padding: '8px 14px',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                            fontSize: 13,
                            color: theme.colors.error,
                            textAlign: 'left',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = `rgba(196, 90, 74, ${isDark ? '0.15' : '0.08'})`; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        Delete
                    </button>
                </div>
            )}
        </>
    );
}
