import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';

let db: Database.Database | null = null;

export function initSQLite(): Database.Database {
    if (db) return db;

    const dbPath = path.join(app.getPath('userData'), 'know-thyself.db');
    console.log(`Initializing SQLite at: ${dbPath}`);

    db = new Database(dbPath);

    // Enable foreign keys and WAL mode for better performance
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');

    // Create tables
    db.exec(SCHEMA);

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
`;
