import { useState, useEffect, useCallback, useRef } from 'react';

interface AppStatus {
    embeddingsReady: boolean;
    databaseReady: boolean;
    claudeReady: boolean;
    error: string | null;
}

export default function App() {
    const [message, setMessage] = useState('');
    const [response, setResponse] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<AppStatus | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

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
        if (!message.trim() || isLoading) return;

        setIsLoading(true);
        setResponse('');
        setError(null);

        // Set up streaming listeners
        window.api.chat.removeAllListeners();

        window.api.chat.onChunk((chunk: string) => {
            setResponse(prev => prev + chunk);
        });

        window.api.chat.onDone(() => {
            setIsLoading(false);
            inputRef.current?.focus();
        });

        window.api.chat.onError((err: string) => {
            setError(`Error: ${err}`);
            setIsLoading(false);
        });

        // Start streaming
        window.api.chat.stream(message);
        setMessage('');
    }, [message, isLoading]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
            <h1 style={{ marginBottom: 8 }}>Know Thyself</h1>
            <p style={{ color: '#666', marginBottom: 24 }}>Phase 1 - Skeleton Test</p>

            {/* Status Display */}
            <div style={{
                marginBottom: 24,
                padding: 16,
                background: '#fff',
                borderRadius: 8,
                border: '1px solid #e0e0e0'
            }}>
                <strong>System Status:</strong>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                    <li>Database: {status?.databaseReady ? '✅ Ready' : '⏳ Initializing...'}</li>
                    <li>Claude API: {status?.claudeReady ? '✅ Ready' : '❌ Not configured'}</li>
                    <li>Embeddings: {status?.embeddingsReady ? '✅ Ready' : '⏳ Loading model...'}</li>
                </ul>
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
                }}>
                    {error}
                </div>
            )}

            {/* Input */}
            <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
                <input
                    ref={inputRef}
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
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
                    disabled={isLoading || !message.trim() || !status?.claudeReady}
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

            {/* Response */}
            {response && (
                <div style={{
                    padding: 16,
                    background: '#f5f5f5',
                    borderRadius: 8,
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.6,
                }}>
                    {response}
                </div>
            )}
        </div>
    );
}
