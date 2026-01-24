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

    // Multi-user support migrations (Phase 10)
    runMultiUserMigrations(database);
}

/**
 * Multi-user support migrations (Phase 10).
 * Adds users table, app_settings table, and user_id columns to data tables.
 */
function runMultiUserMigrations(database: Database.Database): void {
    // Check if users table exists
    const tables = database.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='users'
    `).get();

    if (!tables) {
        console.log('Migration: Creating users table');
        database.exec(`
            CREATE TABLE users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                avatar_color TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }

    // Check if app_settings table exists
    const appSettingsTable = database.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='app_settings'
    `).get();

    if (!appSettingsTable) {
        console.log('Migration: Creating app_settings table');
        database.exec(`
            CREATE TABLE app_settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `);
    }

    // Add user_id column to tables that need it
    const tablesToMigrate = [
        'conversations',
        'user_values',
        'challenges',
        'goals',
        'activities',
        'maslow_signals',
        'psychological_signals',
    ];

    for (const tableName of tablesToMigrate) {
        const tableInfo = database.prepare(`PRAGMA table_info(${tableName})`).all() as { name: string }[];
        const hasUserId = tableInfo.some(col => col.name === 'user_id');

        if (!hasUserId) {
            console.log(`Migration: Adding user_id column to ${tableName} table`);
            database.exec(`ALTER TABLE ${tableName} ADD COLUMN user_id TEXT REFERENCES users(id)`);
            // Create index for efficient user-scoped queries
            database.exec(`CREATE INDEX IF NOT EXISTS idx_${tableName}_user_id ON ${tableName}(user_id)`);
        }
    }

    // Handle profile_summary specially - it uses id=1 singleton pattern, needs different approach
    // We'll change it to use user_id as the key instead of singleton id
    const profileSummaryInfo = database.prepare(`PRAGMA table_info(profile_summary)`).all() as { name: string }[];
    const profileHasUserId = profileSummaryInfo.some(col => col.name === 'user_id');

    if (!profileHasUserId) {
        console.log('Migration: Migrating profile_summary to multi-user');
        // profile_summary has a CHECK constraint on id=1, so we need to recreate it
        // First, save existing data
        const existingData = database.prepare(`SELECT * FROM profile_summary WHERE id = 1`).get() as {
            computed_json?: string;
            narrative_json?: string;
            computed_at?: string;
            narrative_generated_at?: string;
        } | undefined;

        // Drop the old table
        database.exec(`DROP TABLE IF EXISTS profile_summary`);

        // Create new table with user_id as primary key
        database.exec(`
            CREATE TABLE profile_summary (
                user_id TEXT PRIMARY KEY REFERENCES users(id),
                computed_json TEXT NOT NULL,
                narrative_json TEXT,
                computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                narrative_generated_at TIMESTAMP
            )
        `);

        // If there was existing data, insert it with NULL user_id (will be claimed during migration)
        if (existingData) {
            // We can't insert with NULL user_id as primary key, so we'll store as orphan marker
            database.prepare(`
                INSERT INTO app_settings (key, value) VALUES ('orphan_profile_summary', ?)
            `).run(JSON.stringify(existingData));
        }
    }

    // Check for orphan data (data without user_id) and set migration_pending flag
    const orphanConversations = database.prepare(`
        SELECT COUNT(*) as count FROM conversations WHERE user_id IS NULL
    `).get() as { count: number };

    if (orphanConversations.count > 0) {
        console.log(`Migration: Found ${orphanConversations.count} orphan conversations, setting migration_pending flag`);
        database.prepare(`
            INSERT OR REPLACE INTO app_settings (key, value) VALUES ('migration_pending', 'true')
        `).run();
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
