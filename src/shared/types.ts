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

export type SupportSeekingStyle =
    | 'emotional_support'
    | 'instrumental_support'
    | 'informational_support'
    | 'validation_support'
    | 'independence'
    | 'unclear';

export interface ExtractionResult {
    raw_quotes: string[];
    values: ExtractedValue[];
    challenges: ExtractedChallenge[];
    goals: ExtractedGoal[];
    maslow_signals: ExtractedMaslowSignal[];
    emotional_tone: string;
    support_seeking_style?: SupportSeekingStyle;
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
    status?: 'stated' | 'in_progress' | 'achieved' | 'abandoned';
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
    admin?: {
        getProfile: () => Promise<AdminProfileData>;
        getEvidence: (dimension: string) => Promise<SignalEvidence[]>;
    };
}

// =============================================================================
// Extended Extraction Types (Phase 2.5)
// =============================================================================

export interface ExtractedLifeSituation {
    work?: {
        status: 'employed' | 'unemployed' | 'student' | 'retired' | 'self_employed' | 'unknown';
        description?: string;
        quote?: string;
    };
    relationship?: {
        status: 'single' | 'dating' | 'partnered' | 'married' | 'divorced' | 'widowed' | 'unknown';
        quote?: string;
    };
    family?: {
        has_children?: boolean;
        children_details?: string;
        parent_relationship?: string;
        quote?: string;
    };
    living?: {
        situation?: string;
        location?: string;
        quote?: string;
    };
    health?: {
        physical_concerns?: string[];
        mental_health_context?: string;
        quote?: string;
    };
    age_stage?: 'young_adult' | 'adult' | 'midlife' | 'senior' | 'unknown';
}

export type IntentType =
    | 'specific_question'
    | 'general_exploration'
    | 'emotional_processing'
    | 'accountability'
    | 'self_discovery'
    | 'crisis_support'
    | 'just_curious'
    | 'unknown';

export interface ExtractedIntent {
    type: IntentType;
    description: string;
    confidence: number;
    quote?: string;
}

export type MoralFoundation =
    | 'care'
    | 'fairness'
    | 'loyalty'
    | 'authority'
    | 'sanctity'
    | 'liberty';

export interface ExtractedMoralSignal {
    foundation: MoralFoundation;
    valence: 'positive' | 'negative';
    strength: 'weak' | 'moderate' | 'strong';
    quote: string;
}

// =============================================================================
// Tier 3: Personality & Disposition
// =============================================================================

export type BigFiveTrait = 'openness' | 'conscientiousness' | 'extraversion' | 'agreeableness' | 'neuroticism';
export type TraitLevel = 'low' | 'moderate' | 'high';

export interface ExtractedBigFiveSignal {
    trait: BigFiveTrait;
    level: TraitLevel;
    confidence: number;
    quote: string;
}

export type RiskTolerance = 'seeking' | 'neutral' | 'averse';

export interface ExtractedRiskSignal {
    tolerance: RiskTolerance;
    confidence: number;
    quote: string;
}

export type MotivationStyle = 'approach' | 'avoidance' | 'mixed';

export interface ExtractedMotivationSignal {
    style: MotivationStyle;
    confidence: number;
    quote: string;
}

// =============================================================================
// Tier 4: Deeper Patterns
// =============================================================================

export type AttachmentStyle = 'secure' | 'anxious' | 'avoidant' | 'disorganized';

export interface ExtractedAttachmentSignal {
    style: AttachmentStyle;
    confidence: number;
    quote: string;
}

export type LocusOfControl = 'internal' | 'external' | 'mixed';

export interface ExtractedLocusSignal {
    locus: LocusOfControl;
    confidence: number;
    quote: string;
}

export type TemporalOrientation =
    | 'past_negative'
    | 'past_positive'
    | 'present_hedonistic'
    | 'present_fatalistic'
    | 'future';

export interface ExtractedTemporalSignal {
    orientation: TemporalOrientation;
    confidence: number;
    quote: string;
}

export type GrowthMindset = 'fixed' | 'growth' | 'mixed';

export interface ExtractedMindsetSignal {
    mindset: GrowthMindset;
    confidence: number;
    quote: string;
}

export type ChangeReadiness =
    | 'precontemplation'
    | 'contemplation'
    | 'preparation'
    | 'action'
    | 'maintenance';

export type StressResponse = 'fight' | 'flight' | 'freeze' | 'fawn';

export type EmotionalRegulation = 'suppression' | 'expression' | 'reappraisal' | 'rumination';

export type SelfEfficacy = 'low' | 'moderate' | 'high';

export interface ExtractedTier4Signals {
    change_readiness?: { stage: ChangeReadiness; confidence: number; quote?: string };
    stress_response?: { response: StressResponse; confidence: number; quote?: string };
    emotional_regulation?: { style: EmotionalRegulation; confidence: number; quote?: string };
    self_efficacy?: { level: SelfEfficacy; confidence: number; quote?: string };
}

// =============================================================================
// Complete Extraction Result
// =============================================================================

export interface CompleteExtractionResult extends ExtractionResult {
    // Tier 1 (new)
    life_situation?: ExtractedLifeSituation;
    immediate_intent?: ExtractedIntent;

    // Tier 2 (new)
    moral_signals?: ExtractedMoralSignal[];

    // Tier 3 (new)
    big_five_signals?: ExtractedBigFiveSignal[];
    risk_tolerance?: ExtractedRiskSignal;
    motivation_style?: ExtractedMotivationSignal;

    // Tier 4 (new)
    attachment_signals?: ExtractedAttachmentSignal;
    locus_of_control?: ExtractedLocusSignal;
    temporal_orientation?: ExtractedTemporalSignal;
    growth_mindset?: ExtractedMindsetSignal;
    tier4_signals?: ExtractedTier4Signals;
}

// =============================================================================
// Database Row Types
// =============================================================================

export interface Goal {
    id: string;
    description: string;
    status: 'stated' | 'in_progress' | 'achieved' | 'abandoned';
    timeframe?: 'short_term' | 'medium_term' | 'long_term';
    first_stated: string;
    last_mentioned: string | null;
}

export interface PsychologicalSignal {
    id: string;
    dimension: string;
    value: string;
    confidence: number;
    evidence_count: number;
    last_updated: string;
}

// =============================================================================
// Admin Page Types
// =============================================================================

export interface AdminSignal {
    id: string;
    dimension: string;
    value: string;
    confidence: number;
    evidence_count: number;
    last_updated: string;
}

export interface SignalEvidence {
    id: string;
    quote: string;
    message_id: string;
    created_at: string;
}

export interface AdminProfileData {
    signals: AdminSignal[];
    values: Value[];
    challenges: Challenge[];
    goals: Goal[];
    maslowSignals: MaslowSignal[];
}

declare global {
    interface Window {
        api: ElectronAPI;
    }
}
