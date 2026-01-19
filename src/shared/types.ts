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

// =============================================================================
// Extraction Types
// =============================================================================

export interface ExtractionResult {
    raw_quotes: string[];
    values: ExtractedValue[];
    challenges: ExtractedChallenge[];
    goals: ExtractedGoal[];
    maslow_signals: ExtractedMaslowSignal[];
    emotional_tone: string;
    support_seeking_style?: 'problem_solving' | 'emotional_support' | 'information' | 'unclear';
}

export interface ExtractedValue {
    name: string;
    description: string;
    value_type: 'stated' | 'revealed';
    confidence: number;
    quote: string;
}

export interface ExtractedChallenge {
    description: string;
    severity: 'minor' | 'moderate' | 'major';
    quote: string;
}

export interface ExtractedGoal {
    description: string;
    timeframe?: 'short_term' | 'medium_term' | 'long_term';
    quote: string;
}

export interface ExtractedMaslowSignal {
    level: MaslowLevel;
    signal_type: 'concern' | 'stable';
    description: string;
    quote: string;
}

export interface Extraction {
    id: string;
    message_id: string;
    extraction_json: string;
    status: 'raw' | 'validated' | 'rejected';
    validation_errors: string | null;
    created_at: string;
}

// =============================================================================
// Database Entity Types (continued)
// =============================================================================

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
    messages: {
        history: () => Promise<Message[]>;
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
    debug: {
        getExtractions: (messageId?: string) => Promise<Extraction[]>;
        waitForExtraction: (messageId: string, timeoutMs?: number) => Promise<Extraction | null>;
        clearDatabase: () => Promise<void>;
        getMessages: () => Promise<Message[]>;
    };
}

declare global {
    interface Window {
        api: ElectronAPI;
    }
}
