import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChatStreamDonePayload, RegenerateResult } from '../../shared/types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { BackendIndicator } from './BackendIndicator';
import { ThinkingIndicator } from './ThinkingIndicator';
import { MessageActions } from './MessageActions';
import { ResetConfirmDialog } from './ResetConfirmDialog';
import { MessageActionSheet } from './MessageActionSheet';
import { useTheme } from '../contexts/ThemeContext';
import { useApi } from '../contexts/ApiContext';

interface AppStatus {
    embeddingsReady: boolean;
    databaseReady: boolean;
    claudeReady: boolean;
    error: string | null;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}

interface ChatPageProps {
    conversationId: string | null;
    onConversationUpdated?: (conversationId: string, title?: string) => void;
}

// Detect touch device
function isTouchDevice(): boolean {
    return window.matchMedia('(pointer: coarse)').matches;
}

export function ChatPage({ conversationId, onConversationUpdated }: ChatPageProps) {
    const { theme, isDark } = useTheme();
    const api = useApi();

    // CSS Variables derived from theme
    const cssVars = {
        '--chat-bg': theme.colors.background,
        '--chat-card': theme.colors.surface,
        '--chat-text': theme.colors.textPrimary,
        '--chat-text-muted': theme.colors.textSecondary,
        '--chat-accent': theme.colors.accent,
        '--chat-accent-soft': theme.colors.accentSoft,
        '--chat-border': theme.colors.border,
        '--chat-shadow': `0 2px 8px ${theme.colors.shadow}`,
        '--chat-shadow-hover': `0 4px 16px ${theme.colors.shadow}`,
        '--chat-success': theme.colors.success,
        '--chat-error': theme.colors.error,
    } as React.CSSProperties;
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [status, setStatus] = useState<AppStatus | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Message action states
    const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
    const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
    const [showResetDialog, setShowResetDialog] = useState(false);
    const [resetTargetMessage, setResetTargetMessage] = useState<Message | null>(null);
    const [resetDeleteCount, setResetDeleteCount] = useState(0);
    const [isResetting, setIsResetting] = useState(false);
    const [actionSheetOpen, setActionSheetOpen] = useState(false);
    const [actionSheetMessage, setActionSheetMessage] = useState<Message | null>(null);
    const [actionSheetDeleteCount, setActionSheetDeleteCount] = useState(0);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Auto-resize textarea
    const adjustTextareaHeight = useCallback(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            const minHeight = 100; // Match the CSS minHeight
            const maxHeight = 240; // Match the CSS maxHeight
            const newHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight));
            textarea.style.height = `${newHeight}px`;
        }
    }, []);

    useEffect(() => {
        adjustTextareaHeight();
    }, [input, adjustTextareaHeight]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Load message history when conversation changes
    useEffect(() => {
        const loadHistory = async () => {
            if (!conversationId) {
                setMessages([]);
                return;
            }
            try {
                const history = await api.messages.history(conversationId) as Message[];
                setMessages(history);
            } catch (err) {
                console.error('Failed to load history:', err);
            }
        };
        loadHistory();
    }, [api, conversationId]);

    // Poll for app status
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const s = await api.app.getStatus() as AppStatus;
                setStatus(s);
                if (s.error && !error) {
                    setError(s.error);
                }
            } catch (err) {
                console.error('Failed to get status:', err);
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 2000);
        return () => clearInterval(interval);
    }, [api, error]);

    // Close expanded actions when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            setExpandedActionId(null);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const handleSend = useCallback(async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setIsLoading(true);
        setError(null);
        setInput('');

        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        // Optimistically add user message AND assistant placeholder to UI
        const tempUserMessage: Message = {
            id: `temp-user-${Date.now()}`,
            role: 'user',
            content: userMessage,
            created_at: new Date().toISOString(),
        };
        const tempAssistantMessage: Message = {
            id: `temp-assistant-${Date.now()}`,
            role: 'assistant',
            content: '',
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempUserMessage, tempAssistantMessage]);

        // Set up streaming listeners
        api.chat.removeAllListeners();

        api.chat.onThinking(() => {
            // Model has entered thinking/reasoning mode
            setIsThinking(true);
        });

        api.chat.onChunk((chunk: string) => {
            // First chunk of actual content means thinking is done
            setIsThinking(false);
            // Stream directly into the assistant message
            setMessages(prev => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                    updated[updated.length - 1] = {
                        ...lastMsg,
                        content: lastMsg.content + chunk,
                    };
                }
                return updated;
            });
        });

        api.chat.onDone((payload?: ChatStreamDonePayload) => {
            setIsLoading(false);
            setIsThinking(false);
            // Don't reload history - we already have the content streamed in.
            // This avoids the flash caused by replacing temp IDs with database IDs.
            // History will be properly loaded when navigating or on next refresh.

            // Notify parent of conversation update (title change, etc.)
            if (payload?.conversationId && onConversationUpdated) {
                onConversationUpdated(payload.conversationId, payload.title);
            }
            textareaRef.current?.focus();
        });

        api.chat.onError((err: string) => {
            setError(`Error: ${err}`);
            setIsLoading(false);
            setIsThinking(false);
            // Remove optimistic messages on error
            setMessages(prev => prev.filter(m =>
                m.id !== tempUserMessage.id && m.id !== tempAssistantMessage.id
            ));
        });

        // Start streaming with conversationId
        api.chat.stream(userMessage, conversationId || undefined);
    }, [api, input, isLoading, conversationId, onConversationUpdated]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Format timestamp for display
    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Handle reset after - show confirmation dialog
    const handleResetAfterClick = useCallback(async (message: Message) => {
        if (!conversationId) return;

        setExpandedActionId(null);
        setResetTargetMessage(message);

        // Get count of messages to be deleted
        try {
            const count = await api.conversations.getMessagesAfterCount(conversationId, message.id);
            setResetDeleteCount(count);
            setShowResetDialog(true);
        } catch (err) {
            console.error('Failed to get message count:', err);
            setError('Failed to get message count');
        }
    }, [api, conversationId]);

    // Confirm reset
    const handleResetConfirm = useCallback(async () => {
        if (!conversationId || !resetTargetMessage) return;

        setIsResetting(true);

        try {
            const result = await api.conversations.resetAfter(conversationId, resetTargetMessage.id);

            if (result.success) {
                // Reload messages from server
                const history = await api.messages.history(conversationId) as Message[];
                setMessages(history);
                setShowResetDialog(false);
                setResetTargetMessage(null);
            } else {
                setError(result.error || 'Failed to reset conversation');
            }
        } catch (err) {
            console.error('Failed to reset:', err);
            setError('Failed to reset conversation');
        } finally {
            setIsResetting(false);
        }
    }, [api, conversationId, resetTargetMessage]);

    // Handle regenerate
    const handleRegenerate = useCallback(async (message: Message) => {
        if (!conversationId || isLoading) return;

        setExpandedActionId(null);
        setIsLoading(true);
        setError(null);

        try {
            // Call regenerate API
            const result = await api.messages.regenerate(message.id) as RegenerateResult;

            if (result.type === 'error') {
                setError(result.error);
                setIsLoading(false);
                return;
            }

            // Remove the regenerated message from UI
            setMessages(prev => prev.filter(m => m.id !== message.id));

            // Add placeholder for new response
            const tempAssistantMessage: Message = {
                id: `temp-assistant-${Date.now()}`,
                role: 'assistant',
                content: '',
                created_at: new Date().toISOString(),
            };
            setMessages(prev => [...prev, tempAssistantMessage]);

            // Set up streaming listeners
            api.chat.removeAllListeners();

            api.chat.onThinking(() => {
                setIsThinking(true);
            });

            api.chat.onChunk((chunk: string) => {
                setIsThinking(false);
                setMessages(prev => {
                    const updated = [...prev];
                    const lastMsg = updated[updated.length - 1];
                    if (lastMsg && lastMsg.role === 'assistant') {
                        updated[updated.length - 1] = {
                            ...lastMsg,
                            content: lastMsg.content + chunk,
                        };
                    }
                    return updated;
                });
            });

            api.chat.onDone((payload?: ChatStreamDonePayload) => {
                setIsLoading(false);
                setIsThinking(false);
                if (payload?.conversationId && onConversationUpdated) {
                    onConversationUpdated(payload.conversationId, payload.title);
                }
            });

            api.chat.onError((err: string) => {
                setError(`Error: ${err}`);
                setIsLoading(false);
                setIsThinking(false);
            });

            // Start regeneration based on type
            if (result.type === 'chat') {
                // Re-send the user message
                api.chat.stream(result.userMessage, result.conversationId);
            } else if (result.type === 'journey') {
                // For journey opening, use the journey start endpoint
                // The server already deleted the old message, so we just need to reload
                const history = await api.messages.history(conversationId) as Message[];
                setMessages(history);
                setIsLoading(false);
            }
        } catch (err) {
            console.error('Failed to regenerate:', err);
            setError('Failed to regenerate response');
            setIsLoading(false);
        }
    }, [api, conversationId, isLoading, onConversationUpdated]);

    // Long press handlers for mobile
    const handleTouchStart = useCallback((message: Message, _index: number) => {
        if (!isTouchDevice()) return;

        longPressTimerRef.current = setTimeout(async () => {
            // Haptic feedback
            if (navigator.vibrate) {
                navigator.vibrate(10);
            }

            // Get delete count for action sheet
            if (conversationId) {
                try {
                    const count = await api.conversations.getMessagesAfterCount(conversationId, message.id);
                    setActionSheetDeleteCount(count);
                } catch {
                    setActionSheetDeleteCount(0);
                }
            }

            setActionSheetMessage(message);
            setActionSheetOpen(true);
        }, 500);
    }, [api, conversationId]);

    const handleTouchEnd = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    const handleTouchMove = useCallback(() => {
        // Cancel long press if user moves finger
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    // Determine if a message can be reset (not last message, not streaming)
    const canResetMessage = (index: number) => {
        return !isLoading && index < messages.length - 1;
    };

    // Determine if a message can be regenerated (assistant, not streaming)
    const canRegenerateMessage = (message: Message) => {
        return !isLoading && message.role === 'assistant';
    };

    return (
        <div style={{
            ...cssVars,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            maxWidth: 800,
            margin: '0 auto',
            padding: '24px 24px 20px',
        }}>
            {/* Header */}
            <header style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
                paddingBottom: 16,
                borderBottom: '1px solid var(--chat-border)',
                animation: 'fadeIn 0.5s ease-out',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <h1 style={{
                        fontFamily: 'Georgia, "Times New Roman", serif',
                        fontSize: 20,
                        fontWeight: 400,
                        fontStyle: 'italic',
                        color: 'var(--chat-text-muted)',
                        margin: 0,
                        letterSpacing: '0.02em',
                    }}>
                        The Mirror
                    </h1>
                    <BackendIndicator />
                </div>

                {/* Status indicators - only show if there's a problem */}
                {(status && (!status.databaseReady || !status.claudeReady || !status.embeddingsReady)) && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        fontSize: 11,
                        color: 'var(--chat-text-muted)',
                        padding: '6px 12px',
                        background: 'rgba(196, 90, 74, 0.06)',
                        borderRadius: 6,
                        border: '1px solid rgba(196, 90, 74, 0.15)',
                    }}>
                        {!status.databaseReady && <StatusIndicator ready={false} label="DB" />}
                        {!status.claudeReady && <StatusIndicator ready={false} label="Claude" />}
                        {!status.embeddingsReady && <StatusIndicator ready={false} label="Embeddings" />}
                    </div>
                )}
            </header>

            {/* Error Display */}
            {error && (
                <div style={{
                    marginBottom: 16,
                    padding: '14px 18px',
                    background: 'rgba(196, 90, 74, 0.08)',
                    border: '1px solid rgba(196, 90, 74, 0.2)',
                    borderLeft: '3px solid var(--chat-error)',
                    borderRadius: 8,
                    color: 'var(--chat-error)',
                    fontSize: 14,
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    animation: 'fadeIn 0.3s ease-out',
                }}>
                    {error}
                </div>
            )}

            {/* Messages Area */}
            <div
                className="chat-messages-area"
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    marginBottom: 16,
                    paddingRight: 8,
                    animation: 'fadeIn 0.5s ease-out 0.2s both',
                }}
            >
                {messages.length === 0 && (
                    <EmptyState />
                )}

                {messages.map((msg, index) => (
                    <MessageBubble
                        key={msg.id}
                        message={msg}
                        timestamp={formatTime(msg.created_at)}
                        index={index}
                        isStreaming={isLoading && index === messages.length - 1 && msg.role === 'assistant'}
                        isThinking={isThinking && index === messages.length - 1 && msg.role === 'assistant'}
                        isHovered={hoveredMessageId === msg.id}
                        onMouseEnter={() => setHoveredMessageId(msg.id)}
                        onMouseLeave={() => setHoveredMessageId(null)}
                        canReset={canResetMessage(index)}
                        canRegenerate={canRegenerateMessage(msg)}
                        expandedActionId={expandedActionId}
                        onToggleActions={() => setExpandedActionId(expandedActionId === msg.id ? null : msg.id)}
                        onResetAfter={() => handleResetAfterClick(msg)}
                        onRegenerate={() => handleRegenerate(msg)}
                        onTouchStart={() => handleTouchStart(msg, index)}
                        onTouchEnd={handleTouchEnd}
                        onTouchMove={handleTouchMove}
                    />
                ))}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{
                background: 'var(--chat-card)',
                borderRadius: 16,
                border: '1px solid var(--chat-border)',
                boxShadow: 'var(--chat-shadow)',
                padding: 16,
                animation: 'fadeInUp 0.5s ease-out 0.3s both',
            }}>
                <textarea
                    ref={textareaRef}
                    className="chat-textarea"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    disabled={isLoading || !status?.claudeReady}
                    rows={3}
                    style={{
                        width: '100%',
                        padding: '16px 18px',
                        fontSize: 15,
                        fontFamily: 'Georgia, "Times New Roman", serif',
                        lineHeight: 1.7,
                        color: theme.colors.textPrimary,
                        background: theme.colors.background,
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: 12,
                        outline: 'none',
                        resize: 'none',
                        minHeight: 100,
                        maxHeight: 240,
                        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                        boxSizing: 'border-box',
                    }}
                    onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--chat-accent)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px var(--chat-accent-soft)';
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--chat-border)';
                        e.currentTarget.style.boxShadow = 'none';
                    }}
                />
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 12,
                }}>
                    <span style={{
                        fontSize: 12,
                        color: 'var(--chat-text-muted)',
                    }}>
                        Press <kbd style={{
                            padding: '2px 6px',
                            background: isDark ? theme.colors.surface : '#f5f3f0',
                            borderRadius: 4,
                            fontSize: 11,
                            fontFamily: 'system-ui, sans-serif',
                            border: isDark ? `1px solid ${theme.colors.border}` : 'none',
                        }}>Enter</kbd> to send, <kbd style={{
                            padding: '2px 6px',
                            background: isDark ? theme.colors.surface : '#f5f3f0',
                            borderRadius: 4,
                            fontSize: 11,
                            fontFamily: 'system-ui, sans-serif',
                            border: isDark ? `1px solid ${theme.colors.border}` : 'none',
                        }}>Shift+Enter</kbd> for new line
                    </span>
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim() || !status?.claudeReady}
                        style={{
                            padding: '10px 24px',
                            fontSize: 14,
                            fontWeight: 500,
                            background: (isLoading || !input.trim() || !status?.claudeReady)
                                ? (isDark ? theme.colors.surface : '#e8e4df')
                                : theme.colors.accent,
                            color: (isLoading || !input.trim() || !status?.claudeReady)
                                ? theme.colors.textMuted
                                : '#ffffff',
                            border: (isLoading || !input.trim() || !status?.claudeReady) && isDark
                                ? `1px solid ${theme.colors.border}`
                                : 'none',
                            borderRadius: 8,
                            cursor: (isLoading || !input.trim() || !status?.claudeReady)
                                ? 'not-allowed'
                                : 'pointer',
                            transition: 'all 0.2s ease',
                            letterSpacing: '0.02em',
                        }}
                        onMouseEnter={(e) => {
                            if (!isLoading && input.trim() && status?.claudeReady) {
                                e.currentTarget.style.background = isDark ? '#c4956a' : '#b8896a';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isLoading && input.trim() && status?.claudeReady) {
                                e.currentTarget.style.background = theme.colors.accent;
                                e.currentTarget.style.transform = 'translateY(0)';
                            }
                        }}
                    >
                        {isLoading ? 'Reflecting...' : 'Send'}
                    </button>
                </div>
            </div>

            {/* Reset Confirmation Dialog */}
            {showResetDialog && resetTargetMessage && (
                <ResetConfirmDialog
                    messagePreview={resetTargetMessage.content}
                    deleteCount={resetDeleteCount}
                    onConfirm={handleResetConfirm}
                    onCancel={() => {
                        setShowResetDialog(false);
                        setResetTargetMessage(null);
                    }}
                    isLoading={isResetting}
                />
            )}

            {/* Mobile Action Sheet */}
            {actionSheetMessage && (
                <MessageActionSheet
                    isOpen={actionSheetOpen}
                    canReset={canResetMessage(messages.findIndex(m => m.id === actionSheetMessage.id))}
                    canRegenerate={canRegenerateMessage(actionSheetMessage)}
                    deleteCount={actionSheetDeleteCount}
                    onClose={() => {
                        setActionSheetOpen(false);
                        setActionSheetMessage(null);
                    }}
                    onResetAfter={() => handleResetAfterClick(actionSheetMessage)}
                    onRegenerate={() => handleRegenerate(actionSheetMessage)}
                />
            )}

            {/* Keyframe animations and scrollbar styling */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }

                /* Custom scrollbar styling */
                .chat-messages-area {
                    scrollbar-width: thin;
                    scrollbar-color: transparent transparent;
                    transition: scrollbar-color 0.3s ease;
                }
                .chat-messages-area:hover {
                    scrollbar-color: rgba(196, 149, 106, 0.4) transparent;
                }
                .chat-messages-area::-webkit-scrollbar {
                    width: 6px;
                }
                .chat-messages-area::-webkit-scrollbar-track {
                    background: transparent;
                }
                .chat-messages-area::-webkit-scrollbar-thumb {
                    background: transparent;
                    border-radius: 3px;
                    transition: background 0.3s ease;
                }
                .chat-messages-area:hover::-webkit-scrollbar-thumb {
                    background: rgba(196, 149, 106, 0.4);
                }
                .chat-messages-area::-webkit-scrollbar-thumb:hover {
                    background: rgba(196, 149, 106, 0.6);
                }

                /* Textarea scrollbar */
                .chat-textarea {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(196, 149, 106, 0.3) transparent;
                }
                .chat-textarea::-webkit-scrollbar {
                    width: 4px;
                }
                .chat-textarea::-webkit-scrollbar-track {
                    background: transparent;
                }
                .chat-textarea::-webkit-scrollbar-thumb {
                    background: rgba(196, 149, 106, 0.3);
                    border-radius: 2px;
                }
                .chat-textarea::-webkit-scrollbar-thumb:hover {
                    background: rgba(196, 149, 106, 0.5);
                }
            `}</style>
        </div>
    );
}

// Status Indicator Component
function StatusIndicator({ ready, label }: { ready?: boolean; label: string }) {
    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
        }}>
            <span style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: ready ? '#7d9e7a' : ready === false ? '#c45a4a' : '#d4a574',
                boxShadow: ready ? '0 0 6px rgba(125, 158, 122, 0.4)' : 'none',
            }} />
            {label}
        </span>
    );
}

// Message Bubble Component
interface MessageBubbleProps {
    message: Message;
    timestamp: string;
    index: number;
    isStreaming?: boolean;
    isThinking?: boolean;
    isHovered?: boolean;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    canReset: boolean;
    canRegenerate: boolean;
    expandedActionId: string | null;
    onToggleActions: () => void;
    onResetAfter: () => void;
    onRegenerate: () => void;
    onTouchStart: () => void;
    onTouchEnd: () => void;
    onTouchMove: () => void;
}

function MessageBubble({
    message,
    timestamp,
    index,
    isStreaming,
    isThinking,
    isHovered,
    onMouseEnter,
    onMouseLeave,
    canReset,
    canRegenerate,
    expandedActionId,
    onToggleActions,
    onResetAfter,
    onRegenerate,
    onTouchStart,
    onTouchEnd,
    onTouchMove,
}: MessageBubbleProps) {
    const isUser = message.role === 'user';
    const showActions = isHovered && !isStreaming && (canReset || canRegenerate);

    return (
        <div
            style={{
                marginBottom: 20,
                animation: `fadeIn 0.4s ease-out ${Math.min(index * 0.05, 0.3)}s both`,
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onTouchMove={onTouchMove}
        >
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
            }}>
                <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: isUser ? 'var(--chat-accent)' : 'var(--chat-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                }}>
                    {isUser ? 'You' : 'Assistant'}
                </span>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                }}>
                    <span style={{
                        fontSize: 11,
                        color: 'var(--chat-text-muted)',
                        opacity: 0.7,
                    }}>
                        {timestamp}
                    </span>
                    {/* Message Actions */}
                    <div style={{
                        opacity: showActions ? 1 : 0,
                        transition: 'opacity 150ms ease',
                        pointerEvents: showActions ? 'auto' : 'none',
                    }}>
                        <MessageActions
                            messageId={message.id}
                            messageRole={message.role}
                            canReset={canReset}
                            canRegenerate={canRegenerate}
                            isExpanded={expandedActionId === message.id}
                            onToggle={onToggleActions}
                            onResetAfter={onResetAfter}
                            onRegenerate={onRegenerate}
                        />
                    </div>
                </div>
            </div>
            <div style={{
                padding: '18px 22px',
                background: isUser ? 'var(--chat-accent-soft)' : 'var(--chat-card)',
                borderRadius: 12,
                borderLeft: isUser ? '3px solid var(--chat-accent)' : 'none',
                boxShadow: isUser ? 'none' : 'var(--chat-shadow)',
                border: isUser ? 'none' : '1px solid var(--chat-border)',
            }}>
                {isUser ? (
                    <p style={{
                        fontFamily: 'Georgia, "Times New Roman", serif',
                        fontSize: 15,
                        lineHeight: 1.75,
                        color: 'var(--chat-text)',
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                    }}>
                        {message.content}
                    </p>
                ) : (
                    <>
                        {/* Show thinking indicator when model is in thinking mode */}
                        {isThinking && !message.content && (
                            <ThinkingIndicator />
                        )}
                        {/* Show content with streaming cursor */}
                        {message.content && (
                            <>
                                <MarkdownRenderer content={message.content} />
                                {isStreaming && (
                                    <span style={{
                                        display: 'inline-block',
                                        width: 2,
                                        height: '1em',
                                        marginLeft: 2,
                                        background: 'var(--chat-accent)',
                                        animation: 'blink 1s ease-in-out infinite',
                                        verticalAlign: 'text-bottom',
                                    }} />
                                )}
                            </>
                        )}
                        {/* Show cursor when loading but not thinking (waiting for first chunk) */}
                        {isStreaming && !isThinking && !message.content && (
                            <span style={{
                                display: 'inline-block',
                                width: 2,
                                height: '1em',
                                background: 'var(--chat-accent)',
                                animation: 'blink 1s ease-in-out infinite',
                            }} />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// Empty State Component
function EmptyState() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 40px',
            textAlign: 'center',
            animation: 'fadeIn 0.6s ease-out 0.2s both',
        }}>
            {/* Decorative Element */}
            <div style={{
                width: 72,
                height: 72,
                marginBottom: 24,
                background: 'linear-gradient(135deg, var(--chat-accent-soft) 0%, rgba(196, 149, 106, 0.05) 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--chat-accent)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
            </div>

            <h2 style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: 22,
                fontWeight: 400,
                color: 'var(--chat-text)',
                margin: 0,
                marginBottom: 12,
            }}>
                Begin your reflection
            </h2>

            <p style={{
                fontSize: 14,
                lineHeight: 1.7,
                color: 'var(--chat-text-muted)',
                maxWidth: 380,
                margin: 0,
            }}>
                This is a space for honest self-exploration. Share what's on your mind—your
                thoughts, feelings, challenges, or aspirations. I'm here to listen and help
                you understand yourself more deeply.
            </p>

            <div style={{
                marginTop: 32,
                display: 'flex',
                gap: 24,
                fontSize: 12,
                color: 'var(--chat-text-muted)',
            }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'var(--chat-accent)',
                    }} />
                    Private & local
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'var(--chat-accent)',
                    }} />
                    No judgment
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'var(--chat-accent)',
                    }} />
                    Always here
                </span>
            </div>
        </div>
    );
}
