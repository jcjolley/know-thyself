import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChatStreamDonePayload } from '../../shared/types';

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

// CSS Variables matching the Profile page
const cssVars = {
    '--chat-bg': '#faf8f5',
    '--chat-card': '#ffffff',
    '--chat-text': '#3d3630',
    '--chat-text-muted': '#8b8178',
    '--chat-accent': '#c4956a',
    '--chat-accent-soft': 'rgba(196, 149, 106, 0.12)',
    '--chat-border': 'rgba(139, 129, 120, 0.15)',
    '--chat-shadow': '0 2px 8px rgba(61, 54, 48, 0.06)',
    '--chat-shadow-hover': '0 4px 16px rgba(61, 54, 48, 0.1)',
    '--chat-success': '#7d9e7a',
    '--chat-error': '#c45a4a',
} as React.CSSProperties;

export function ChatPage({ conversationId, onConversationUpdated }: ChatPageProps) {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [streamingResponse, setStreamingResponse] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<AppStatus | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

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
    }, [messages, streamingResponse]);

    // Load message history when conversation changes
    useEffect(() => {
        const loadHistory = async () => {
            if (!conversationId) {
                setMessages([]);
                return;
            }
            try {
                const history = await window.api.messages.history(conversationId) as Message[];
                setMessages(history);
            } catch (err) {
                console.error('Failed to load history:', err);
            }
        };
        loadHistory();
    }, [conversationId]);

    // Poll for app status
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const s = await window.api.app.getStatus() as AppStatus;
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
    }, [error]);

    const handleSend = useCallback(async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setIsLoading(true);
        setStreamingResponse('');
        setError(null);
        setInput('');

        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        // Optimistically add user message to UI
        const tempUserMessage: Message = {
            id: `temp-${Date.now()}`,
            role: 'user',
            content: userMessage,
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempUserMessage]);

        // Set up streaming listeners
        window.api.chat.removeAllListeners();

        window.api.chat.onChunk((chunk: string) => {
            setStreamingResponse(prev => prev + chunk);
        });

        window.api.chat.onDone((payload?: ChatStreamDonePayload) => {
            setIsLoading(false);
            // Reload history to get persisted messages with proper IDs
            const convId = payload?.conversationId || conversationId;
            window.api.messages.history(convId || undefined).then((history) => {
                setMessages(history as Message[]);
                setStreamingResponse('');
            });
            // Notify parent of conversation update (title change, etc.)
            if (payload?.conversationId && onConversationUpdated) {
                onConversationUpdated(payload.conversationId, payload.title);
            }
            textareaRef.current?.focus();
        });

        window.api.chat.onError((err: string) => {
            setError(`Error: ${err}`);
            setIsLoading(false);
            setStreamingResponse('');
            // Remove optimistic user message on error
            setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));
        });

        // Start streaming with conversationId
        window.api.chat.stream(userMessage, conversationId || undefined);
    }, [input, isLoading, conversationId, onConversationUpdated]);

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
                marginBottom: 20,
                paddingBottom: 20,
                borderBottom: '1px solid var(--chat-border)',
                animation: 'fadeIn 0.5s ease-out',
            }}>
                <h1 style={{
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: 28,
                    fontWeight: 400,
                    color: 'var(--chat-text)',
                    margin: 0,
                    marginBottom: 6,
                    letterSpacing: '-0.01em',
                }}>
                    Know Thyself
                </h1>
                <p style={{
                    color: 'var(--chat-text-muted)',
                    margin: 0,
                    fontSize: 14,
                    letterSpacing: '0.02em',
                }}>
                    AI-guided self-reflection
                </p>
            </header>

            {/* Status Display - Subtle */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                marginBottom: 16,
                fontSize: 12,
                color: 'var(--chat-text-muted)',
                animation: 'fadeIn 0.5s ease-out 0.1s both',
            }}>
                <span style={{ fontWeight: 500 }}>Status:</span>
                <div style={{ display: 'flex', gap: 12 }}>
                    <StatusIndicator ready={status?.databaseReady} label="DB" />
                    <StatusIndicator ready={status?.claudeReady} label="Claude" />
                    <StatusIndicator ready={status?.embeddingsReady} label="Embeddings" />
                </div>
            </div>

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
                {messages.length === 0 && !streamingResponse && (
                    <EmptyState />
                )}

                {messages.map((msg, index) => (
                    <MessageBubble
                        key={msg.id}
                        message={msg}
                        timestamp={formatTime(msg.created_at)}
                        index={index}
                    />
                ))}

                {/* Streaming response */}
                {streamingResponse && (
                    <div style={{
                        marginBottom: 20,
                        animation: 'fadeIn 0.3s ease-out',
                    }}>
                        {/* Separator for current conversation */}
                        {messages.length > 0 && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                marginBottom: 20,
                                marginTop: 8,
                            }}>
                                <div style={{
                                    flex: 1,
                                    height: 1,
                                    background: 'linear-gradient(to right, transparent, var(--chat-border), var(--chat-border))',
                                }} />
                                <span style={{
                                    fontSize: 10,
                                    fontWeight: 500,
                                    color: 'var(--chat-text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                    opacity: 0.7,
                                }}>
                                    Now
                                </span>
                                <div style={{
                                    flex: 1,
                                    height: 1,
                                    background: 'linear-gradient(to left, transparent, var(--chat-border), var(--chat-border))',
                                }} />
                            </div>
                        )}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 8,
                        }}>
                            <span style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: 'var(--chat-text-muted)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                            }}>
                                Assistant
                            </span>
                            <span style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: 'var(--chat-accent)',
                                animation: 'pulse 1.5s ease-in-out infinite',
                            }} />
                        </div>
                        <div style={{
                            padding: '18px 22px',
                            background: 'var(--chat-card)',
                            borderRadius: 12,
                            boxShadow: 'var(--chat-shadow)',
                            border: '1px solid var(--chat-border)',
                        }}>
                            <p style={{
                                fontFamily: 'Georgia, "Times New Roman", serif',
                                fontSize: 15,
                                lineHeight: 1.75,
                                color: 'var(--chat-text)',
                                margin: 0,
                                whiteSpace: 'pre-wrap',
                            }}>
                                {streamingResponse}
                                <span style={{
                                    display: 'inline-block',
                                    width: 2,
                                    height: 18,
                                    background: 'var(--chat-accent)',
                                    marginLeft: 2,
                                    verticalAlign: 'text-bottom',
                                    animation: 'blink 1s step-end infinite',
                                }} />
                            </p>
                        </div>
                    </div>
                )}

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
                        color: 'var(--chat-text)',
                        background: '#faf8f5',
                        border: '1px solid var(--chat-border)',
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
                            background: '#f5f3f0',
                            borderRadius: 4,
                            fontSize: 11,
                            fontFamily: 'system-ui, sans-serif',
                        }}>Enter</kbd> to send, <kbd style={{
                            padding: '2px 6px',
                            background: '#f5f3f0',
                            borderRadius: 4,
                            fontSize: 11,
                            fontFamily: 'system-ui, sans-serif',
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
                                ? '#e8e4df'
                                : 'var(--chat-accent)',
                            color: (isLoading || !input.trim() || !status?.claudeReady)
                                ? 'var(--chat-text-muted)'
                                : '#ffffff',
                            border: 'none',
                            borderRadius: 8,
                            cursor: (isLoading || !input.trim() || !status?.claudeReady)
                                ? 'not-allowed'
                                : 'pointer',
                            transition: 'all 0.2s ease',
                            letterSpacing: '0.02em',
                        }}
                        onMouseEnter={(e) => {
                            if (!isLoading && input.trim() && status?.claudeReady) {
                                e.currentTarget.style.background = '#b8896a';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isLoading && input.trim() && status?.claudeReady) {
                                e.currentTarget.style.background = 'var(--chat-accent)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }
                        }}
                    >
                        {isLoading ? 'Reflecting...' : 'Send'}
                    </button>
                </div>
            </div>

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
function MessageBubble({ message, timestamp, index }: { message: Message; timestamp: string; index: number }) {
    const isUser = message.role === 'user';

    return (
        <div style={{
            marginBottom: 20,
            animation: `fadeIn 0.4s ease-out ${Math.min(index * 0.05, 0.3)}s both`,
        }}>
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
                <span style={{
                    fontSize: 11,
                    color: 'var(--chat-text-muted)',
                    opacity: 0.7,
                }}>
                    {timestamp}
                </span>
            </div>
            <div style={{
                padding: '18px 22px',
                background: isUser ? 'var(--chat-accent-soft)' : 'var(--chat-card)',
                borderRadius: 12,
                borderLeft: isUser ? '3px solid var(--chat-accent)' : 'none',
                boxShadow: isUser ? 'none' : 'var(--chat-shadow)',
                border: isUser ? 'none' : '1px solid var(--chat-border)',
            }}>
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
