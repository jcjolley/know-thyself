import Database from 'better-sqlite3';
import { paths } from '../paths.js';

let db: Database.Database | null = null;

export function initSQLite(): Database.Database {
    if (db) return db;

    const dbPath = paths.sqlite;
    console.log(`Initializing SQLite at: ${dbPath}`);

    db = new Database(dbPath);

    // Enable foreign keys and WAL mode for better performance
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');

    // Create tables
    db.exec(SCHEMA);

    // Run migrations for existing databases
    runMigrations(db);

    console.log('SQLite initialized');

    return db;
}

export function getDb(): Database.Database {
    if (!db) throw new Error('Database not initialized. Call initSQLite() first.');
    return db;
}

export function closeDb(): void {
    if (db) {
        db.close();
        db = null;
        console.log('SQLite connection closed');
    }
}

function runMigrations(database: Database.Database): void {
    // Check if goals table has timeframe column
    const goalsInfo = database.prepare("PRAGMA table_info(goals)").all() as { name: string }[];
    const hasTimeframe = goalsInfo.some(col => col.name === 'timeframe');

    if (!hasTimeframe) {
        console.log('Migration: Adding timeframe column to goals table');
        database.exec(`
            ALTER TABLE goals ADD COLUMN timeframe TEXT
            CHECK (timeframe IS NULL OR timeframe IN ('short_term', 'medium_term', 'long_term'))
        `);
    }

    // Check if messages table has prompt column (for storing the prompt that generated assistant responses)
    const messagesInfo = database.prepare("PRAGMA table_info(messages)").all() as { name: string }[];
    const hasPrompt = messagesInfo.some(col => col.name === 'prompt');

    if (!hasPrompt) {
        console.log('Migration: Adding prompt column to messages table');
        database.exec(`ALTER TABLE messages ADD COLUMN prompt TEXT`);
    }

    // Check if conversations table has title column
    const conversationsInfo = database.prepare("PRAGMA table_info(conversations)").all() as { name: string }[];
    const hasTitle = conversationsInfo.some(col => col.name === 'title');

    if (!hasTitle) {
        console.log('Migration: Adding title column to conversations table');
        database.exec(`ALTER TABLE conversations ADD COLUMN title TEXT DEFAULT 'New Conversation'`);
    }

    // Check if conversations table has journey_id column
    const conversationsInfoUpdated = database.prepare("PRAGMA table_info(conversations)").all() as { name: string }[];
    const hasJourneyId = conversationsInfoUpdated.some(col => col.name === 'journey_id');

    if (!hasJourneyId) {
        console.log('Migration: Adding journey_id column to conversations table');
        database.exec(`ALTER TABLE conversations ADD COLUMN journey_id TEXT`);
    }
}

const SCHEMA = `
-- Core conversation data
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT REFERENCES conversations(id),
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Extraction results
CREATE TABLE IF NOT EXISTS extractions (
    id TEXT PRIMARY KEY,
    message_id TEXT REFERENCES messages(id),
    extraction_json TEXT NOT NULL,
    status TEXT DEFAULT 'raw' CHECK (status IN ('raw', 'validated', 'rejected')),
    validation_errors TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Structured profile data
CREATE TABLE IF NOT EXISTS user_values (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    value_type TEXT NOT NULL CHECK (value_type IN ('stated', 'revealed')),
    confidence REAL DEFAULT 0.5,
    evidence_count INTEGER DEFAULT 1,
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_reinforced TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS challenges (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'recurring')),
    first_mentioned TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_mentioned TIMESTAMP,
    mention_count INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    category TEXT,
    sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
    mentioned_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'stated' CHECK (status IN ('stated', 'in_progress', 'achieved', 'abandoned')),
    timeframe TEXT CHECK (timeframe IS NULL OR timeframe IN ('short_term', 'medium_term', 'long_term')),
    first_stated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_mentioned TIMESTAMP
);

CREATE TABLE IF NOT EXISTS maslow_signals (
    id TEXT PRIMARY KEY,
    level TEXT NOT NULL CHECK (level IN ('physiological', 'safety', 'belonging', 'esteem', 'self_actualization')),
    signal_type TEXT NOT NULL CHECK (signal_type IN ('concern', 'stable')),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS psychological_signals (
    id TEXT PRIMARY KEY,
    dimension TEXT NOT NULL,
    value TEXT NOT NULL,
    confidence REAL DEFAULT 0.5,
    evidence_count INTEGER DEFAULT 1,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Living summary
CREATE TABLE IF NOT EXISTS profile_summary (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    computed_json TEXT NOT NULL,
    narrative_json TEXT,
    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    narrative_generated_at TIMESTAMP
);

-- Conversation summaries
CREATE TABLE IF NOT EXISTS conversation_summaries (
    id TEXT PRIMARY KEY,
    conversation_id TEXT REFERENCES conversations(id),
    summary_text TEXT NOT NULL,
    messages_covered INTEGER,
    start_message_id TEXT,
    end_message_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Evidence tracking
CREATE TABLE IF NOT EXISTS evidence (
    id TEXT PRIMARY KEY,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    message_id TEXT REFERENCES messages(id),
    quote TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_evidence_target ON evidence(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_extractions_message ON extractions(message_id);
CREATE INDEX IF NOT EXISTS idx_values_confidence ON user_values(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status);

-- Unique index for psychological signals (required for ON CONFLICT handling)
CREATE UNIQUE INDEX IF NOT EXISTS idx_psych_signals_dimension ON psychological_signals(dimension);
`;
