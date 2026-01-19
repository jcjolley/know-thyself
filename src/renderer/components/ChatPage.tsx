import { useState, useEffect, useCallback, useRef } from 'react';

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

export function ChatPage() {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [streamingResponse, setStreamingResponse] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<AppStatus | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingResponse]);

    // Load message history on mount
    useEffect(() => {
        const loadHistory = async () => {
            try {
                const history = await window.api.messages.history() as Message[];
                setMessages(history);
            } catch (err) {
                console.error('Failed to load history:', err);
            }
        };
        loadHistory();
    }, []);

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

        window.api.chat.onDone(() => {
            setIsLoading(false);
            // Reload history to get persisted messages with proper IDs
            window.api.messages.history().then((history) => {
                setMessages(history as Message[]);
                setStreamingResponse('');
            });
            inputRef.current?.focus();
        });

        window.api.chat.onError((err: string) => {
            setError(`Error: ${err}`);
            setIsLoading(false);
            setStreamingResponse('');
            // Remove optimistic user message on error
            setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));
        });

        // Start streaming
        window.api.chat.stream(userMessage);
    }, [input, isLoading]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            maxWidth: 800,
            margin: '0 auto',
            padding: '16px 24px',
        }}>
            <header style={{ marginBottom: 16 }}>
                <h1 style={{ marginBottom: 4, fontSize: 24 }}>Know Thyself</h1>
                <p style={{ color: '#666', margin: 0, fontSize: 14 }}>AI-guided self-reflection</p>
            </header>

            {/* Status Display */}
            <div style={{
                marginBottom: 16,
                padding: 12,
                background: '#fff',
                borderRadius: 8,
                border: '1px solid #e0e0e0',
                fontSize: 14,
            }}>
                <strong>Status:</strong>{' '}
                <span style={{ marginLeft: 8 }}>
                    {status?.databaseReady ? '✅ DB' : '⏳ DB'}{' '}
                    {status?.claudeReady ? '✅ Claude' : '❌ Claude'}{' '}
                    {status?.embeddingsReady ? '✅ Embeddings' : '⏳ Embeddings'}
                </span>
            </div>

            {/* Error Display */}
            {error && (
                <div style={{
                    marginBottom: 16,
                    padding: 12,
                    background: '#ffebee',
                    border: '1px solid #f44336',
                    borderRadius: 4,
                    color: '#c62828',
                    whiteSpace: 'pre-wrap',
                    fontSize: 14,
                }}>
                    {error}
                </div>
            )}

            {/* Messages */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                marginBottom: 16,
                padding: 16,
                background: '#fafafa',
                borderRadius: 8,
                border: '1px solid #e0e0e0',
            }}>
                {messages.length === 0 && !streamingResponse && (
                    <p style={{ color: '#999', textAlign: 'center', marginTop: 40 }}>
                        Start a conversation to begin your self-reflection journey.
                    </p>
                )}

                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        style={{
                            marginBottom: 16,
                            padding: 12,
                            background: msg.role === 'user' ? '#e3f2fd' : '#fff',
                            borderRadius: 8,
                            border: '1px solid #e0e0e0',
                        }}
                    >
                        <div style={{
                            fontSize: 12,
                            color: '#666',
                            marginBottom: 4,
                            fontWeight: 500,
                        }}>
                            {msg.role === 'user' ? 'You' : 'Assistant'}
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                            {msg.content}
                        </div>
                    </div>
                ))}

                {/* Streaming response */}
                {streamingResponse && (
                    <div
                        style={{
                            marginBottom: 16,
                            padding: 12,
                            background: '#fff',
                            borderRadius: 8,
                            border: '1px solid #e0e0e0',
                        }}
                    >
                        <div style={{
                            fontSize: 12,
                            color: '#666',
                            marginBottom: 4,
                            fontWeight: 500,
                        }}>
                            Assistant
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                            {streamingResponse}
                            <span style={{ opacity: 0.5 }}>▊</span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ display: 'flex', gap: 8 }}>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    disabled={isLoading || !status?.claudeReady}
                    style={{
                        flex: 1,
                        padding: '12px 16px',
                        fontSize: 16,
                        border: '1px solid #ccc',
                        borderRadius: 4,
                        outline: 'none',
                    }}
                />
                <button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim() || !status?.claudeReady}
                    style={{
                        padding: '12px 24px',
                        fontSize: 16,
                        background: isLoading ? '#ccc' : '#1976d2',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                    }}
                >
                    {isLoading ? 'Sending...' : 'Send'}
                </button>
            </div>
        </div>
    );
}
