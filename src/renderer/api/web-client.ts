const API_BASE = '/api';

// WebSocket management with automatic reconnection
class WebSocketManager {
    private ws: WebSocket | null = null;
    private messageHandlers = new Map<string, (data: unknown) => void>();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private pendingMessages: string[] = [];

    private getWsUrl(): string {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${window.location.host}/ws`;
    }

    connect(): Promise<WebSocket> {
        return new Promise((resolve, reject) => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                resolve(this.ws);
                return;
            }

            if (this.ws?.readyState === WebSocket.CONNECTING) {
                this.ws.addEventListener('open', () => resolve(this.ws!), { once: true });
                this.ws.addEventListener('error', reject, { once: true });
                return;
            }

            this.ws = new WebSocket(this.getWsUrl());

            this.ws.onopen = () => {
                console.log('[ws] Connected');
                this.reconnectAttempts = 0;
                // Send any pending messages
                while (this.pendingMessages.length > 0) {
                    const msg = this.pendingMessages.shift()!;
                    this.ws!.send(msg);
                }
                resolve(this.ws!);
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const handler = this.messageHandlers.get(data.type);
                    if (handler) handler(data);
                } catch (err) {
                    console.error('[ws] Parse error:', err);
                }
            };

            this.ws.onclose = () => {
                console.log('[ws] Disconnected');
                this.attemptReconnect();
            };

            this.ws.onerror = (err) => {
                console.error('[ws] Error:', err);
                reject(err);
            };
        });
    }

    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[ws] Max reconnect attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        console.log(`[ws] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        setTimeout(() => {
            this.connect().catch(() => {});
        }, delay);
    }

    send(message: object): void {
        const json = JSON.stringify(message);
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(json);
        } else {
            this.pendingMessages.push(json);
            this.connect().catch(() => {});
        }
    }

    on(type: string, handler: (data: unknown) => void): void {
        this.messageHandlers.set(type, handler);
    }

    off(type: string): void {
        this.messageHandlers.delete(type);
    }

    clearHandlers(): void {
        this.messageHandlers.clear();
    }
}

const wsManager = new WebSocketManager();

// Initialize WebSocket connection
wsManager.connect().catch(() => {});

// Helper for HTTP requests with error handling
async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json();
}

// Chat stream done payload type
interface ChatStreamDonePayload {
    conversationId: string;
    title?: string;
}

export const webApi = {
    chat: {
        send: async (message: string, conversationId?: string) => {
            // For non-streaming, we still use WebSocket but collect the full response
            return new Promise<{ response: string; conversationId: string; title?: string }>((resolve, reject) => {
                let response = '';
                let resultConversationId = conversationId || '';
                let resultTitle: string | undefined;

                const cleanup = () => {
                    wsManager.off('chat:chunk');
                    wsManager.off('chat:done');
                    wsManager.off('chat:error');
                };

                wsManager.on('chat:chunk', (data: unknown) => {
                    response += (data as { chunk: string }).chunk;
                });

                wsManager.on('chat:done', (data: unknown) => {
                    cleanup();
                    const payload = data as ChatStreamDonePayload;
                    resultConversationId = payload.conversationId || resultConversationId;
                    resultTitle = payload.title;
                    resolve({ response, conversationId: resultConversationId, title: resultTitle });
                });

                wsManager.on('chat:error', (data: unknown) => {
                    cleanup();
                    reject(new Error((data as { error: string }).error));
                });

                wsManager.send({ type: 'chat:stream', conversationId, content: message });
            });
        },

        stream: (message: string, conversationId?: string) => {
            wsManager.send({ type: 'chat:stream', conversationId, content: message });
        },

        onChunk: (callback: (chunk: string) => void) => {
            wsManager.on('chat:chunk', (data: unknown) => callback((data as { chunk: string }).chunk));
        },

        onThinking: (callback: () => void) => {
            wsManager.on('chat:thinking', callback);
        },

        onDone: (callback: (payload?: ChatStreamDonePayload) => void) => {
            wsManager.on('chat:done', callback as (data: unknown) => void);
        },

        onError: (callback: (error: string) => void) => {
            wsManager.on('chat:error', (data: unknown) => callback((data as { error: string }).error));
        },

        removeAllListeners: () => {
            wsManager.off('chat:chunk');
            wsManager.off('chat:thinking');
            wsManager.off('chat:done');
            wsManager.off('chat:error');
        },
    },

    messages: {
        history: (conversationId?: string) =>
            fetchJson(`${API_BASE}/messages${conversationId ? `?conversationId=${conversationId}` : ''}`),
        regenerate: (messageId: string) =>
            fetchJson(`${API_BASE}/messages/${messageId}/regenerate`, { method: 'POST' }),
    },

    conversations: {
        list: () => fetchJson(`${API_BASE}/conversations`),
        create: () => fetchJson(`${API_BASE}/conversations`, { method: 'POST' }),
        get: (id: string) => fetchJson(`${API_BASE}/conversations/${id}`),
        updateTitle: (id: string, title: string) =>
            fetchJson(`${API_BASE}/conversations/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ title }),
            }).then(() => true),
        delete: (id: string) =>
            fetchJson(`${API_BASE}/conversations/${id}`, { method: 'DELETE' }).then(() => true),
        search: (query: string) =>
            fetchJson(`${API_BASE}/conversations/search?q=${encodeURIComponent(query)}`),
        getCurrent: () => fetchJson(`${API_BASE}/conversations/current`),
        resetAfter: (conversationId: string, afterMessageId: string) =>
            fetchJson<{ success: boolean; deletedCount?: number; error?: string }>(
                `${API_BASE}/conversations/${conversationId}/reset`,
                {
                    method: 'POST',
                    body: JSON.stringify({ afterMessageId }),
                }
            ),
        getMessagesAfterCount: (conversationId: string, messageId: string) =>
            fetchJson<{ count: number }>(
                `${API_BASE}/conversations/${conversationId}/messages-after/${messageId}/count`
            ).then(r => r.count),
    },

    profile: {
        get: () => fetchJson(`${API_BASE}/profile`),
        getSummary: () => fetchJson(`${API_BASE}/profile/summary`),
    },

    embeddings: {
        embed: (text: string) =>
            fetchJson<{ vector: number[] }>(`${API_BASE}/embeddings/embed`, {
                method: 'POST',
                body: JSON.stringify({ text }),
            }).then((r) => r.vector),
        isReady: () =>
            fetchJson<{ ready: boolean }>(`${API_BASE}/embeddings/ready`).then((r) => r.ready),
    },

    app: {
        getStatus: () => fetchJson(`${API_BASE}/status`),
    },

    apiKey: {
        getStatus: () => fetchJson(`${API_BASE}/api-key/status`),
        save: (key: string) =>
            fetchJson(`${API_BASE}/api-key`, {
                method: 'POST',
                body: JSON.stringify({ key }),
            }),
        clear: () =>
            fetchJson<{ success: boolean }>(`${API_BASE}/api-key`, { method: 'DELETE' }).then((r) => r.success),
        validate: (key: string) =>
            fetchJson(`${API_BASE}/api-key/validate`, {
                method: 'POST',
                body: JSON.stringify({ key }),
            }),
    },

    journeys: {
        list: () => fetchJson(`${API_BASE}/journeys`),
        start: (journeyId: string) =>
            fetchJson(`${API_BASE}/journeys/${journeyId}/start`, { method: 'POST' }),
    },

    llm: {
        getConfig: () => fetchJson(`${API_BASE}/llm/config`),
        setConfig: (config: unknown) =>
            fetchJson(`${API_BASE}/llm/config`, {
                method: 'PUT',
                body: JSON.stringify(config),
            }),
        testConnection: () => fetchJson(`${API_BASE}/llm/test`, { method: 'POST' }),
        getStatus: () => fetchJson(`${API_BASE}/llm/status`),
        listOllamaModels: (baseUrl?: string) =>
            fetchJson(`${API_BASE}/llm/ollama/models${baseUrl ? `?baseUrl=${encodeURIComponent(baseUrl)}` : ''}`),
    },

    // Debug endpoints (development only)
    debug: {
        getExtractions: (messageId?: string) =>
            fetchJson(`${API_BASE}/debug/extractions${messageId ? `?messageId=${messageId}` : ''}`),
        waitForExtraction: async (messageId: string, timeoutMs = 5000) => {
            // Poll for extraction
            const startTime = Date.now();
            while (Date.now() - startTime < timeoutMs) {
                const extractions = await fetchJson<unknown[]>(`${API_BASE}/debug/extractions?messageId=${messageId}`);
                if (extractions.length > 0) return extractions[0];
                await new Promise((r) => setTimeout(r, 100));
            }
            return null;
        },
        clearDatabase: () =>
            fetchJson(`${API_BASE}/debug/clear-database`, { method: 'POST' }),
        getMessages: () => fetchJson(`${API_BASE}/debug/messages`),
    },

    admin: {
        getProfile: () => fetchJson(`${API_BASE}/admin/profile`),
        getEvidence: (dimension: string) => fetchJson(`${API_BASE}/admin/evidence/${dimension}`),
        getMessagesWithPrompts: (limit = 50) =>
            fetchJson(`${API_BASE}/admin/messages-with-prompts?limit=${limit}`),
        reanalyze: () => fetchJson(`${API_BASE}/admin/reanalyze`, { method: 'POST' }),
        onReanalyzeProgress: () => {}, // WebSocket-based, implement if needed
        removeReanalyzeProgressListener: () => {},
    },
};

export type WebApiType = typeof webApi;
