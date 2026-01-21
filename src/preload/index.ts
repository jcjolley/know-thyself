import { contextBridge, ipcRenderer } from 'electron';

// Define the ReanalyzeProgress interface inline to avoid import issues
interface ReanalyzeProgress {
    status: 'started' | 'processing' | 'completed' | 'error';
    current: number;
    total: number;
    error?: string;
}

// Define ChatStreamDonePayload inline to avoid import issues
interface ChatStreamDonePayload {
    conversationId: string;
    title?: string;
}

// Define the API interface inline to avoid import resolution issues in preload
interface ElectronAPI {
    chat: {
        send: (message: string, conversationId?: string) => Promise<{ response: string; conversationId: string; title?: string }>;
        stream: (message: string, conversationId?: string) => void;
        onChunk: (callback: (chunk: string) => void) => void;
        onDone: (callback: (payload?: ChatStreamDonePayload) => void) => void;
        onError: (callback: (error: string) => void) => void;
        removeAllListeners: () => void;
    };
    messages: {
        history: (conversationId?: string) => Promise<unknown[]>;
    };
    conversations: {
        list: () => Promise<unknown[]>;
        create: () => Promise<unknown>;
        get: (id: string) => Promise<unknown | null>;
        updateTitle: (id: string, title: string) => Promise<boolean>;
        delete: (id: string) => Promise<boolean>;
        search: (query: string) => Promise<unknown[]>;
        getCurrent: () => Promise<unknown | null>;
    };
    profile: {
        get: () => Promise<unknown>;
        getSummary: () => Promise<unknown>;
    };
    embeddings: {
        embed: (text: string) => Promise<number[]>;
        isReady: () => Promise<boolean>;
    };
    app: {
        getStatus: () => Promise<unknown>;
    };
    debug: {
        getExtractions: (messageId?: string) => Promise<unknown[]>;
        waitForExtraction: (messageId: string, timeoutMs?: number) => Promise<unknown | null>;
        clearDatabase: () => Promise<void>;
        getMessages: () => Promise<unknown[]>;
    };
    admin?: {
        getProfile: () => Promise<unknown>;
        getEvidence: (dimension: string) => Promise<unknown[]>;
        getMessagesWithPrompts: (limit?: number) => Promise<unknown[]>;
        reanalyze: () => Promise<void>;
        onReanalyzeProgress: (callback: (progress: ReanalyzeProgress) => void) => void;
        removeReanalyzeProgressListener: () => void;
    };
}

const api: ElectronAPI = {
    chat: {
        send: (message: string, conversationId?: string) => ipcRenderer.invoke('chat:send', message, conversationId),
        stream: (message: string, conversationId?: string) => ipcRenderer.send('chat:stream', message, conversationId),
        onChunk: (callback: (chunk: string) => void) => {
            ipcRenderer.on('chat:chunk', (_event, chunk: string) => callback(chunk));
        },
        onDone: (callback: (payload?: ChatStreamDonePayload) => void) => {
            ipcRenderer.on('chat:done', (_event, payload?: ChatStreamDonePayload) => callback(payload));
        },
        onError: (callback: (error: string) => void) => {
            ipcRenderer.on('chat:error', (_event, error: string) => callback(error));
        },
        removeAllListeners: () => {
            ipcRenderer.removeAllListeners('chat:chunk');
            ipcRenderer.removeAllListeners('chat:done');
            ipcRenderer.removeAllListeners('chat:error');
        },
    },
    messages: {
        history: (conversationId?: string) => ipcRenderer.invoke('messages:history', conversationId),
    },
    conversations: {
        list: () => ipcRenderer.invoke('conversations:list'),
        create: () => ipcRenderer.invoke('conversations:create'),
        get: (id: string) => ipcRenderer.invoke('conversations:get', id),
        updateTitle: (id: string, title: string) => ipcRenderer.invoke('conversations:updateTitle', id, title),
        delete: (id: string) => ipcRenderer.invoke('conversations:delete', id),
        search: (query: string) => ipcRenderer.invoke('conversations:search', query),
        getCurrent: () => ipcRenderer.invoke('conversations:getCurrent'),
    },
    profile: {
        get: () => ipcRenderer.invoke('profile:get'),
        getSummary: () => ipcRenderer.invoke('profile:getSummary'),
    },
    embeddings: {
        embed: (text: string) => ipcRenderer.invoke('embeddings:embed', text),
        isReady: () => ipcRenderer.invoke('embeddings:ready'),
    },
    app: {
        getStatus: () => ipcRenderer.invoke('app:status'),
    },
    debug: {
        getExtractions: (messageId?: string) => ipcRenderer.invoke('debug:getExtractions', messageId),
        waitForExtraction: (messageId: string, timeoutMs?: number) => ipcRenderer.invoke('debug:waitForExtraction', messageId, timeoutMs),
        clearDatabase: () => ipcRenderer.invoke('debug:clearDatabase'),
        getMessages: () => ipcRenderer.invoke('debug:getMessages'),
    },
    admin: {
        getProfile: () => ipcRenderer.invoke('admin:getProfile'),
        getEvidence: (dimension: string) => ipcRenderer.invoke('admin:getEvidence', dimension),
        getMessagesWithPrompts: (limit?: number) => ipcRenderer.invoke('admin:getMessagesWithPrompts', limit),
        reanalyze: () => ipcRenderer.invoke('extraction:reanalyze'),
        onReanalyzeProgress: (callback: (progress: ReanalyzeProgress) => void) => {
            ipcRenderer.on('extraction:progress', (_event, progress: ReanalyzeProgress) => callback(progress));
        },
        removeReanalyzeProgressListener: () => {
            ipcRenderer.removeAllListeners('extraction:progress');
        },
    },
};

contextBridge.exposeInMainWorld('api', api);
