import React, { useState, useRef, useEffect } from 'react';
import type { ConversationListItem } from './ConversationSidebar';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

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
    const [isHovered, setIsHovered] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(conversation.title);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

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
            ? 'linear-gradient(135deg, rgba(196, 149, 106, 0.15) 0%, rgba(196, 149, 106, 0.08) 100%)'
            : isHovered
            ? 'rgba(255, 255, 255, 0.6)'
            : 'transparent',
        border: isActive
            ? '1px solid rgba(196, 149, 106, 0.3)'
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
        color: isActive ? '#c4956a' : '#a09890',
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
        color: isActive ? '#3d3630' : '#4a4540',
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
        border: '1px solid rgba(196, 149, 106, 0.5)',
        borderRadius: 4,
        background: '#fff',
        outline: 'none',
        boxSizing: 'border-box',
    };

    const metaStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 11,
        color: '#8b8178',
    };

    const previewStyle: React.CSSProperties = {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 12,
        color: '#9a918a',
        margin: 0,
        lineHeight: 1.4,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontStyle: 'italic',
    };

    const deleteButtonStyle: React.CSSProperties = {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
        color: '#8b8178',
        opacity: isHovered && !collapsed ? 1 : 0,
        transition: 'all 150ms ease',
        padding: 0,
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
                        <div style={titleContainerStyle}>
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
                                <span style={titleStyle} title={conversation.title}>
                                    {conversation.title}
                                </span>
                            )}
                        </div>

                        <div style={metaStyle}>
                            <span>{conversation.message_count} {conversation.message_count === 1 ? 'entry' : 'entries'}</span>
                            <span style={{ color: '#c4b5a8' }}>·</span>
                            <span>{formatDate(conversation.updated_at)}</span>
                        </div>

                        {conversation.preview && (
                            <p style={previewStyle} title={conversation.preview}>
                                "{conversation.preview}"
                            </p>
                        )}

                        <button
                            style={deleteButtonStyle}
                            onClick={handleDeleteClick}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(196, 90, 74, 0.1)';
                                e.currentTarget.style.color = '#c45a4a';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = '#8b8178';
                            }}
                            aria-label="Delete conversation"
                            title="Delete conversation"
                        >
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                        </button>
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
        </>
    );
}
