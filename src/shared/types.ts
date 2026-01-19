// =============================================================================
// IPC Request/Response Types
// =============================================================================

export interface ChatRequest {
    message: string;
}

export interface ChatChunk {
    chunk: string;
    done: boolean;
}

// =============================================================================
// Database Entity Types
// =============================================================================

export interface Conversation {
    id: string;
    created_at: string;
    updated_at: string;
}

export interface Message {
    id: string;
    conversation_id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}

export interface Value {
    id: string;
    name: string;
    description: string | null;
    value_type: 'stated' | 'revealed';
    confidence: number;
    evidence_count: number;
    first_seen: string;
    last_reinforced: string;
}

export interface Challenge {
    id: string;
    description: string;
    status: 'active' | 'resolved' | 'recurring';
    first_mentioned: string;
    last_mentioned: string | null;
    mention_count: number;
}

export type MaslowLevel = 'physiological' | 'safety' | 'belonging' | 'esteem' | 'self_actualization';

export interface MaslowSignal {
    id: string;
    level: MaslowLevel;
    signal_type: 'concern' | 'stable';
    description: string | null;
    created_at: string;
}

export interface ProfileSummary {
    maslow_status: MaslowSignal[];
    top_values: Value[];
    active_challenges: Challenge[];
}

// =============================================================================
// Embedding Types
// =============================================================================

export interface MessageEmbedding {
    id: string;
    vector: number[];
    content: string;
    role: 'user' | 'assistant';
    created_at: string;
}

export interface InsightEmbedding {
    id: string;
    vector: number[];
    insight_type: 'value' | 'challenge' | 'pattern' | 'goal';
    content: string;
    source_id: string;
    created_at: string;
}

// =============================================================================
// App Status
// =============================================================================

export interface AppStatus {
    embeddingsReady: boolean;
    databaseReady: boolean;
    claudeReady: boolean;
    error: string | null;
}

// =============================================================================
// API exposed to renderer via contextBridge
// =============================================================================

export interface ElectronAPI {
    chat: {
        send: (message: string) => Promise<string>;
        stream: (message: string) => void;
        onChunk: (callback: (chunk: string) => void) => void;
        onDone: (callback: () => void) => void;
        onError: (callback: (error: string) => void) => void;
        removeAllListeners: () => void;
    };
    profile: {
        get: () => Promise<ProfileSummary>;
    };
    embeddings: {
        embed: (text: string) => Promise<number[]>;
        isReady: () => Promise<boolean>;
    };
    app: {
        getStatus: () => Promise<AppStatus>;
    };
}

declare global {
    interface Window {
        api: ElectronAPI;
    }
}
