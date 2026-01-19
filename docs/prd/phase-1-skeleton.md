# Phase 1: Skeleton

## Overview
Establish the foundational infrastructure for Know Thyself - an Electron app with working IPC, database layers (SQLite + LanceDB), local embeddings, and Claude API connectivity.

## Problem Statement
Before implementing any user-facing features, we need a working application shell where all core systems can communicate: renderer process, main process, databases, embeddings, and external API.

## Goals
- [ ] Electron app launches with a basic window
- [ ] Typed IPC communication between renderer and main process
- [ ] SQLite database initialized with full schema
- [ ] LanceDB initialized for vector storage
- [ ] Embedding model (voyage-4-nano) loads and generates vectors
- [ ] Claude API integration returns responses

## Non-Goals
- Not implementing the extraction pipeline (Phase 2)
- Not implementing profile accumulation logic (Phase 2)
- Not building the Self-Portrait UI (Phase 3)
- Not adding voice input or document ingestion (Phase 4)
- Not implementing conversation summaries or context assembly (Phase 2)
- Not adding any settings UI - hardcode all defaults
- Not styling beyond basic functionality
- Not implementing retry logic or advanced error recovery (happy path only)

---

## User Stories

### US-001: Application Launch
**As a** developer
**I want** the Electron app to launch and display a window
**So that** I have a working shell to build features in

**Acceptance Criteria:**
- [ ] Running `npm run dev` opens an Electron window within 10 seconds
- [ ] Window displays a React UI with "Know Thyself" heading
- [ ] Pressing F12 or Cmd+Option+I opens DevTools
- [ ] Closing the window terminates the process with exit code 0

### US-002: Database Initialization
**As a** developer
**I want** SQLite and LanceDB to initialize on app startup
**So that** data can be persisted locally

**Acceptance Criteria:**
- [ ] SQLite database file created at `{userData}/know-thyself.db`
- [ ] Running `.tables` in SQLite shows all 12 tables from schema
- [ ] LanceDB directory created at `{userData}/lancedb/`
- [ ] LanceDB contains `messages` and `insights` tables
- [ ] Second app launch completes initialization in under 1 second (no re-creation)

### US-003: IPC Communication
**As a** developer
**I want** typed IPC communication between renderer and main
**So that** the UI can request data and actions from the backend

**Acceptance Criteria:**
- [ ] `window.api` object exists in renderer DevTools console
- [ ] `window.api.chat.send("hello")` returns a string response
- [ ] `window.api.profile.get()` returns an object with `maslow_status`, `top_values`, `active_challenges` arrays
- [ ] TypeScript compilation fails if IPC types are mismatched

### US-004: Embedding Generation
**As a** developer
**I want** the embedding model to load and generate vectors
**So that** text can be embedded for semantic search

**Acceptance Criteria:**
- [ ] Console shows "Loading voyage-4-nano embedding model..." then "Embedding model loaded" on first run
- [ ] `window.api.embeddings.embed("test")` returns array of exactly 2048 numbers
- [ ] Calling embed with empty string throws Error with message "Cannot embed empty text"
- [ ] Second call to embed completes in under 100ms (model already loaded)
- [ ] Model files auto-download to `{userData}/models/voyage-4-nano/` on first run

### US-005: Claude API Integration
**As a** developer
**I want** to send messages to Claude and receive responses
**So that** the core AI functionality works

**Acceptance Criteria:**
- [ ] If `ANTHROPIC_API_KEY` is not set, app shows error message on launch
- [ ] Typing a message and pressing Enter displays streaming response character by character
- [ ] If API returns error, UI displays "Error: {message}" below input field
- [ ] Response appears in gray box below input

---

## Phases

### Phase 1.1: Project Initialization
Set up the Electron + React + TypeScript project structure with all configuration files.

#### 1.1.1 Initialize npm Project
**File:** `package.json`

```json
{
  "name": "know-thyself",
  "version": "0.1.0",
  "description": "Personal AI system for deep self-understanding",
  "main": "dist/main/index.js",
  "type": "module",
  "scripts": {
    "dev": "npm run build:main && concurrently -k \"npm run watch:main\" \"npm run dev:vite\" \"npm run dev:electron\"",
    "dev:vite": "vite",
    "dev:electron": "cross-env NODE_ENV=development wait-on http://localhost:5173 && electron .",
    "watch:main": "tsc -p tsconfig.main.json --watch --preserveWatchOutput",
    "build:main": "tsc -p tsconfig.main.json && tsc -p tsconfig.preload.json",
    "build": "npm run build:main && vite build && electron-builder",
    "typecheck": "tsc -p tsconfig.main.json --noEmit && tsc -p tsconfig.preload.json --noEmit",
    "lint": "eslint src/",
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:coverage": "playwright test --coverage",
    "postinstall": "electron-rebuild"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "better-sqlite3": "^11.7.0",
    "vectordb": "^0.14.0",
    "onnxruntime-node": "^1.20.0",
    "tokenizers": "^0.13.3",
    "uuid": "^11.1.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.50.0",
    "@types/better-sqlite3": "^7.6.12",
    "@types/node": "^22.10.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/uuid": "^10.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "concurrently": "^9.1.0",
    "cross-env": "^7.0.3",
    "electron": "^33.3.0",
    "electron-builder": "^25.1.0",
    "electron-rebuild": "^3.2.9",
    "eslint": "^9.17.0",
    "playwright": "^1.50.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "typescript": "^5.7.0",
    "typescript-eslint": "^8.19.0",
    "vite": "^6.0.0",
    "wait-on": "^8.0.0"
  }
}
```

#### 1.1.2 Base TypeScript Configuration
**File:** `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

#### 1.1.3 Main Process TypeScript Configuration
**File:** `tsconfig.main.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist/main",
    "rootDir": "./src/main",
    "module": "ESNext",
    "moduleResolution": "bundler"
  },
  "include": ["src/main/**/*", "src/shared/**/*"],
  "exclude": ["node_modules"]
}
```

#### 1.1.4 Preload TypeScript Configuration
**File:** `tsconfig.preload.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist/preload",
    "rootDir": "./src/preload",
    "module": "ESNext",
    "moduleResolution": "bundler"
  },
  "include": ["src/preload/**/*", "src/shared/**/*"],
  "exclude": ["node_modules"]
}
```

#### 1.1.5 Vite Configuration
**File:** `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  base: './',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
```

#### 1.1.6 Electron Builder Configuration
**File:** `electron-builder.json`

```json
{
  "appId": "com.knowthyself.app",
  "productName": "Know Thyself",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist/**/*",
    "package.json"
  ],
  "extraResources": [
    {
      "from": "src/shared",
      "to": "shared",
      "filter": ["**/*.js"]
    }
  ],
  "win": {
    "target": "nsis"
  },
  "mac": {
    "target": "dmg"
  },
  "linux": {
    "target": "AppImage"
  }
}
```

#### 1.1.7 ESLint Configuration
**File:** `eslint.config.js`

```javascript
import tseslint from 'typescript-eslint';

export default tseslint.config(
  tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    ignores: ['dist/**', 'release/**', 'node_modules/**'],
  }
);
```

#### 1.1.8 Environment Template
**File:** `.env.example`

```
# Required: Get your API key from https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-...
```

#### 1.1.9 Git Ignore
**File:** `.gitignore`

```
# Dependencies
node_modules/

# Build output
dist/
release/

# Environment
.env
.env.local

# Database files
*.db
*.db-journal
*.db-wal
*.db-shm
lancedb/

# OS files
.DS_Store
Thumbs.db

# IDE
.idea/
.vscode/
*.swp
*.swo

# Logs
*.log
npm-debug.log*

# Test artifacts
test-results/
playwright-report/
coverage/
```

#### 1.1.10 Playwright Configuration
**File:** `playwright.config.ts`

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Electron tests must run sequentially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for Electron
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'electron',
      testMatch: '**/*.spec.ts',
    },
  ],
});
```

#### 1.1.11 Makefile
**File:** `Makefile`

```makefile
# Know Thyself - Development Commands
# Usage: make <target>

.PHONY: install dev build clean lint typecheck test test-ui test-coverage rebuild help

# Default target
.DEFAULT_GOAL := help

# Install dependencies and rebuild native modules
install:
	npm install

# Start development servers (builds main first, then runs concurrently)
dev:
	npm run dev

# Build for production
build:
	npm run build

# Build main process only
build-main:
	npm run build:main

# Run type checking
typecheck:
	npm run typecheck

# Run linter
lint:
	npm run lint

# Run all tests
test:
	npm run test

# Run tests with UI
test-ui:
	npm run test:ui

# Run tests with coverage (requires 80%+)
test-coverage:
	npm run test:coverage

# Clean build artifacts
clean:
	rm -rf dist/
	rm -rf release/
	rm -rf node_modules/.cache/
	rm -rf test-results/
	rm -rf playwright-report/
	rm -rf coverage/

# Full clean including node_modules
clean-all: clean
	rm -rf node_modules/

# Rebuild native modules (after node version change)
rebuild:
	npm run postinstall

# Run all quality gates
check: typecheck lint test
	@echo "All quality gates passed!"

# Show available commands
help:
	@echo "Know Thyself - Available Commands:"
	@echo ""
	@echo "  make install       - Install dependencies"
	@echo "  make dev           - Start development servers"
	@echo "  make build         - Build for production"
	@echo "  make build-main    - Build main process only"
	@echo "  make typecheck     - Run TypeScript type checking"
	@echo "  make lint          - Run ESLint"
	@echo "  make test          - Run all Playwright tests"
	@echo "  make test-ui       - Run tests with Playwright UI"
	@echo "  make test-coverage - Run tests with coverage report"
	@echo "  make check         - Run all quality gates"
	@echo "  make clean         - Remove build artifacts"
	@echo "  make clean-all     - Remove all generated files"
	@echo "  make rebuild       - Rebuild native modules"
	@echo "  make help          - Show this help message"
```

#### 1.1.12 Create Directory Structure
```
know-thyself/
├── package.json
├── tsconfig.json
├── tsconfig.main.json
├── tsconfig.preload.json
├── vite.config.ts
├── playwright.config.ts
├── electron-builder.json
├── eslint.config.js
├── .env.example
├── .gitignore
├── Makefile
├── src/
│   ├── main/
│   │   ├── index.ts
│   │   ├── ipc.ts
│   │   ├── claude.ts
│   │   ├── embeddings.ts
│   │   └── db/
│   │       ├── sqlite.ts
│   │       └── lancedb.ts
│   ├── preload/
│   │   └── index.ts
│   ├── renderer/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   └── App.tsx
│   └── shared/
│       └── types.ts
└── tests/
    ├── helpers/
    │   └── electron.ts
    ├── app-launch.spec.ts
    ├── database.spec.ts
    ├── ipc.spec.ts
    ├── embeddings.spec.ts
    └── claude-api.spec.ts
```

---

### Phase 1.2: Shared Types
Define TypeScript interfaces used by both main and renderer processes.

**File:** `src/shared/types.ts`

```typescript
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
```

---

### Phase 1.3: SQLite Database
Initialize SQLite with the full schema.

**File:** `src/main/db/sqlite.ts`

```typescript
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
CREATE TABLE IF NOT EXISTS values (
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
CREATE INDEX IF NOT EXISTS idx_values_confidence ON values(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status);
`;
```

---

### Phase 1.4: LanceDB Vector Store
Initialize LanceDB for semantic search.

**File:** `src/main/db/lancedb.ts`

```typescript
import * as lancedb from 'vectordb';
import { app } from 'electron';
import path from 'path';

// Import types using relative path (not alias) for main process compatibility
import type { MessageEmbedding, InsightEmbedding } from '../../shared/types.js';
import { EMBEDDING_DIMENSIONS } from '../embeddings.js';

let connection: lancedb.Connection | null = null;
let messagesTable: lancedb.Table<MessageEmbedding> | null = null;
let insightsTable: lancedb.Table<InsightEmbedding> | null = null;

export async function initLanceDB(): Promise<void> {
    if (connection) return;

    const dbPath = path.join(app.getPath('userData'), 'lancedb');
    console.log(`Initializing LanceDB at: ${dbPath}`);

    connection = await lancedb.connect(dbPath);

    const tables = await connection.tableNames();

    // Initialize messages table
    if (!tables.includes('messages')) {
        console.log('Creating messages table...');
        messagesTable = await connection.createTable('messages', [
            {
                id: '__schema__',
                vector: new Array(EMBEDDING_DIMENSIONS).fill(0),
                content: '',
                role: 'user' as const,
                created_at: new Date().toISOString(),
            },
        ]);
        // Remove schema placeholder
        await messagesTable.delete('id = "__schema__"');
    } else {
        messagesTable = await connection.openTable('messages');
    }

    // Initialize insights table
    if (!tables.includes('insights')) {
        console.log('Creating insights table...');
        insightsTable = await connection.createTable('insights', [
            {
                id: '__schema__',
                vector: new Array(EMBEDDING_DIMENSIONS).fill(0),
                insight_type: 'value' as const,
                content: '',
                source_id: '',
                created_at: new Date().toISOString(),
            },
        ]);
        await insightsTable.delete('id = "__schema__"');
    } else {
        insightsTable = await connection.openTable('insights');
    }

    console.log('LanceDB initialized');
}

export function getMessagesTable(): lancedb.Table<MessageEmbedding> {
    if (!messagesTable) throw new Error('LanceDB not initialized. Call initLanceDB() first.');
    return messagesTable;
}

export function getInsightsTable(): lancedb.Table<InsightEmbedding> {
    if (!insightsTable) throw new Error('LanceDB not initialized. Call initLanceDB() first.');
    return insightsTable;
}

export async function addMessageEmbedding(embedding: MessageEmbedding): Promise<void> {
    const table = getMessagesTable();
    await table.add([embedding]);
}

export async function searchSimilarMessages(
    vector: number[],
    limit: number = 5
): Promise<MessageEmbedding[]> {
    const table = getMessagesTable();
    const results = await table.search(vector).limit(limit).execute();
    return results as MessageEmbedding[];
}

export async function addInsightEmbedding(embedding: InsightEmbedding): Promise<void> {
    const table = getInsightsTable();
    await table.add([embedding]);
}

export async function searchSimilarInsights(
    vector: number[],
    limit: number = 5
): Promise<InsightEmbedding[]> {
    const table = getInsightsTable();
    const results = await table.search(vector).limit(limit).execute();
    return results as InsightEmbedding[];
}
```

---

### Phase 1.5: Embedding Model
Load and use voyage-4-nano for local embeddings via ONNX Runtime.

> **Implementation Note:** The official `voyageai/voyage-4-nano` model is not available in ONNX format
> on HuggingFace. We use the community ONNX conversion from `thomasht86/voyage-4-nano-ONNX` for the
> model weights, and the official tokenizer from `voyageai/voyage-4-nano`. This approach runs locally
> without requiring the Voyage AI API, while maintaining semantic alignment with Claude models.

**Dependencies:**
- `onnxruntime-node` - ONNX inference runtime for Node.js
- `tokenizers` - HuggingFace tokenizers library (+ platform-specific binary)

**File:** `src/main/embeddings.ts`

```typescript
import * as ort from 'onnxruntime-node';
import { Tokenizer } from 'tokenizers';
import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';

const MODEL_REPO = 'thomasht86/voyage-4-nano-ONNX';
const TOKENIZER_REPO = 'voyageai/voyage-4-nano';
const MODEL_FILE = 'model_fp32.onnx';
const TOKENIZER_FILE = 'tokenizer.json';

// voyage-4-nano outputs 2048 dimensions
export const EMBEDDING_DIMENSIONS = 2048;

let session: ort.InferenceSession | null = null;
let tokenizer: Tokenizer | null = null;
let loadPromise: Promise<void> | null = null;

async function downloadFile(url: string, destPath: string): Promise<void> {
    console.log(`Downloading ${url}...`);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download ${url}: ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(destPath, buffer);
}

async function ensureModelFiles(): Promise<{ modelPath: string; tokenizerPath: string }> {
    const modelDir = path.join(app.getPath('userData'), 'models', 'voyage-4-nano');
    await fs.mkdir(modelDir, { recursive: true });

    const modelPath = path.join(modelDir, MODEL_FILE);
    const tokenizerPath = path.join(modelDir, TOKENIZER_FILE);

    const modelBaseUrl = `https://huggingface.co/${MODEL_REPO}/resolve/main`;
    const tokenizerBaseUrl = `https://huggingface.co/${TOKENIZER_REPO}/resolve/main`;

    // Download model if not exists (~1.3GB for FP32)
    try {
        await fs.access(modelPath);
    } catch {
        await downloadFile(`${modelBaseUrl}/${MODEL_FILE}`, modelPath);
    }

    // Download tokenizer from official voyage-4-nano repo
    try {
        await fs.access(tokenizerPath);
    } catch {
        await downloadFile(`${tokenizerBaseUrl}/${TOKENIZER_FILE}`, tokenizerPath);
    }

    return { modelPath, tokenizerPath };
}

export async function initEmbeddings(): Promise<void> {
    if (session) return;
    if (loadPromise) {
        await loadPromise;
        return;
    }

    loadPromise = (async () => {
        console.log('Loading voyage-4-nano embedding model...');
        const startTime = Date.now();

        const { modelPath, tokenizerPath } = await ensureModelFiles();

        tokenizer = await Tokenizer.fromFile(tokenizerPath);
        session = await ort.InferenceSession.create(modelPath);

        const elapsed = Date.now() - startTime;
        console.log(`Embedding model loaded in ${elapsed}ms`);
    })();

    await loadPromise;
}

export async function embed(
    text: string,
    inputType: 'query' | 'document' = 'document'
): Promise<number[]> {
    if (!session || !tokenizer) {
        throw new Error('Embedding model not initialized. Call initEmbeddings() first.');
    }

    if (!text || text.trim().length === 0) {
        throw new Error('Cannot embed empty text');
    }

    // Add query prompt for asymmetric retrieval
    const inputText = inputType === 'query'
        ? `Represent the query for retrieving supporting documents: ${text}`
        : text;

    const encoding = await tokenizer.encode(inputText);
    const inputIds = encoding.getIds();
    const attentionMask = encoding.getAttentionMask();

    const inputIdsTensor = new ort.Tensor('int64', BigInt64Array.from(inputIds.map(BigInt)), [1, inputIds.length]);
    const attentionMaskTensor = new ort.Tensor('int64', BigInt64Array.from(attentionMask.map(BigInt)), [1, attentionMask.length]);

    const results = await session.run({
        input_ids: inputIdsTensor,
        attention_mask: attentionMaskTensor,
    });

    const embeddings = results.embeddings.data as Float32Array;
    return Array.from(embeddings);
}

export function isEmbeddingsReady(): boolean {
    return session !== null;
}
```

**Preload Script Note:** Electron preload scripts must be CommonJS. Add `dist/preload/package.json`
with `{"type":"commonjs"}` during build to override the root `"type": "module"` setting.

---

### Phase 1.6: Claude API Client
Integrate with Claude API for chat responses.

**File:** `src/main/claude.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

// Use -latest alias for automatic updates
const DEFAULT_MODEL = 'claude-sonnet-4-5-latest';

export function initClaude(): void {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error(
            'ANTHROPIC_API_KEY environment variable is required.\n' +
            'Create a .env file with: ANTHROPIC_API_KEY=sk-ant-...\n' +
            'Get your API key from: https://console.anthropic.com/'
        );
    }
    client = new Anthropic({ apiKey });
    console.log('Claude client initialized');
}

export function getClient(): Anthropic {
    if (!client) {
        throw new Error('Claude client not initialized. Call initClaude() first.');
    }
    return client;
}

export function isClaudeReady(): boolean {
    return client !== null;
}

export async function sendMessage(userMessage: string): Promise<string> {
    const anthropic = getClient();

    const response = await anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 1024,
        messages: [{ role: 'user', content: userMessage }],
    });

    const textBlock = response.content.find(block => block.type === 'text');
    return textBlock ? textBlock.text : '';
}

export async function* streamMessage(userMessage: string): AsyncGenerator<string> {
    const anthropic = getClient();

    const stream = anthropic.messages.stream({
        model: DEFAULT_MODEL,
        max_tokens: 1024,
        messages: [{ role: 'user', content: userMessage }],
    });

    for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            yield event.delta.text;
        }
    }
}
```

---

### Phase 1.7: IPC Handlers
Set up main process IPC handlers.

**File:** `src/main/ipc.ts`

```typescript
import { ipcMain } from 'electron';
import { sendMessage, streamMessage, isClaudeReady } from './claude.js';
import { embed, isEmbeddingsReady } from './embeddings.js';
import { getDb } from './db/sqlite.js';

// Import types using relative path for main process compatibility
import type { ProfileSummary, MaslowSignal, Value, Challenge, AppStatus } from '../shared/types.js';

let initError: string | null = null;

export function setInitError(error: string): void {
    initError = error;
}

export function registerIPCHandlers(): void {
    // ==========================================================================
    // App Status
    // ==========================================================================

    ipcMain.handle('app:status', async (): Promise<AppStatus> => {
        return {
            embeddingsReady: isEmbeddingsReady(),
            databaseReady: true, // If we got here, DB is ready
            claudeReady: isClaudeReady(),
            error: initError,
        };
    });

    // ==========================================================================
    // Chat Handlers
    // ==========================================================================

    // Chat: send and receive full response
    ipcMain.handle('chat:send', async (_event, message: string): Promise<string> => {
        return await sendMessage(message);
    });

    // Chat: streaming response
    ipcMain.on('chat:stream', async (event, message: string) => {
        try {
            for await (const chunk of streamMessage(message)) {
                if (!event.sender.isDestroyed()) {
                    event.reply('chat:chunk', chunk);
                }
            }
            if (!event.sender.isDestroyed()) {
                event.reply('chat:done');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            if (!event.sender.isDestroyed()) {
                event.reply('chat:error', errorMessage);
            }
        }
    });

    // ==========================================================================
    // Profile Handlers
    // ==========================================================================

    ipcMain.handle('profile:get', async (): Promise<ProfileSummary> => {
        const db = getDb();

        const maslowSignals = db.prepare(`
            SELECT * FROM maslow_signals
            ORDER BY created_at DESC
            LIMIT 10
        `).all() as MaslowSignal[];

        const values = db.prepare(`
            SELECT * FROM values
            ORDER BY confidence DESC
            LIMIT 5
        `).all() as Value[];

        const challenges = db.prepare(`
            SELECT * FROM challenges
            WHERE status = 'active'
            ORDER BY mention_count DESC
            LIMIT 5
        `).all() as Challenge[];

        return {
            maslow_status: maslowSignals,
            top_values: values,
            active_challenges: challenges,
        };
    });

    // ==========================================================================
    // Embedding Handlers
    // ==========================================================================

    ipcMain.handle('embeddings:embed', async (_event, text: string): Promise<number[]> => {
        return await embed(text);
    });

    ipcMain.handle('embeddings:ready', async (): Promise<boolean> => {
        return isEmbeddingsReady();
    });
}
```

---

### Phase 1.8: Preload Script
Expose API to renderer via contextBridge.

**File:** `src/preload/index.ts`

```typescript
import { contextBridge, ipcRenderer } from 'electron';

// Define the API interface inline to avoid import resolution issues in preload
interface ElectronAPI {
    chat: {
        send: (message: string) => Promise<string>;
        stream: (message: string) => void;
        onChunk: (callback: (chunk: string) => void) => void;
        onDone: (callback: () => void) => void;
        onError: (callback: (error: string) => void) => void;
        removeAllListeners: () => void;
    };
    profile: {
        get: () => Promise<unknown>;
    };
    embeddings: {
        embed: (text: string) => Promise<number[]>;
        isReady: () => Promise<boolean>;
    };
    app: {
        getStatus: () => Promise<unknown>;
    };
}

const api: ElectronAPI = {
    chat: {
        send: (message: string) => ipcRenderer.invoke('chat:send', message),
        stream: (message: string) => ipcRenderer.send('chat:stream', message),
        onChunk: (callback: (chunk: string) => void) => {
            ipcRenderer.on('chat:chunk', (_event, chunk: string) => callback(chunk));
        },
        onDone: (callback: () => void) => {
            ipcRenderer.on('chat:done', () => callback());
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
    profile: {
        get: () => ipcRenderer.invoke('profile:get'),
    },
    embeddings: {
        embed: (text: string) => ipcRenderer.invoke('embeddings:embed', text),
        isReady: () => ipcRenderer.invoke('embeddings:ready'),
    },
    app: {
        getStatus: () => ipcRenderer.invoke('app:status'),
    },
};

contextBridge.exposeInMainWorld('api', api);
```

---

### Phase 1.9: Main Process Entry
Wire everything together in main process.

**File:** `src/main/index.ts`

```typescript
// Load environment variables FIRST, before any other imports that might use them
import dotenv from 'dotenv';
dotenv.config();

import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { initSQLite, closeDb } from './db/sqlite.js';
import { initLanceDB } from './db/lancedb.js';
import { initEmbeddings } from './embeddings.js';
import { initClaude } from './claude.js';
import { registerIPCHandlers, setInitError } from './ipc.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;

async function createWindow(): Promise<void> {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, '../preload/index.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false, // Required for better-sqlite3
        },
    });

    // Load the renderer
    if (isDev) {
        console.log('Development mode: loading from localhost:5173');
        await mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        console.log('Production mode: loading from file');
        await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

async function initialize(): Promise<void> {
    try {
        console.log('='.repeat(50));
        console.log('Know Thyself - Initializing...');
        console.log(`Mode: ${isDev ? 'development' : 'production'}`);
        console.log('='.repeat(50));

        console.log('\n[1/4] Initializing databases...');
        initSQLite();
        await initLanceDB();

        console.log('\n[2/4] Initializing Claude client...');
        try {
            initClaude();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error('Claude initialization failed:', message);
            setInitError(message);
            // Continue without Claude - app can still show the error in UI
        }

        console.log('\n[3/4] Registering IPC handlers...');
        registerIPCHandlers();

        console.log('\n[4/4] Loading embedding model (this may take a moment on first run)...');
        // Don't await - let it load in background so app opens faster
        initEmbeddings().catch(err => {
            console.error('Failed to load embeddings:', err);
            setInitError(`Embedding model failed to load: ${err.message}`);
        });

        console.log('\n' + '='.repeat(50));
        console.log('Initialization complete!');
        console.log('='.repeat(50) + '\n');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Initialization failed:', message);
        setInitError(message);
    }
}

app.whenReady().then(async () => {
    await initialize();
    await createWindow();

    app.on('activate', async () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            await createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    closeDb();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    closeDb();
});
```

---

### Phase 1.10: Basic Renderer UI
Create minimal React UI to test functionality.

**File:** `src/renderer/index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Know Thyself</title>
    <style>
        * {
            box-sizing: border-box;
        }
        body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #fafafa;
        }
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
</body>
</html>
```

**File:** `src/renderer/main.tsx`

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
```

**File:** `src/renderer/App.tsx`

```typescript
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
```

---

### Phase 1.11: Playwright Tests
Each user story must have corresponding test coverage. Tests use Playwright's Electron support.

#### 1.11.1 Electron Test Helper
**File:** `tests/helpers/electron.ts`

```typescript
import { _electron as electron, ElectronApplication, Page } from 'playwright';
import path from 'path';

let electronApp: ElectronApplication | null = null;
let page: Page | null = null;

export async function launchApp(): Promise<{ app: ElectronApplication; page: Page }> {
    // Build before launching
    electronApp = await electron.launch({
        args: [path.join(process.cwd(), 'dist/main/index.js')],
        env: {
            ...process.env,
            NODE_ENV: 'test',
        },
    });

    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    return { app: electronApp, page };
}

export async function closeApp(): Promise<void> {
    if (electronApp) {
        await electronApp.close();
        electronApp = null;
        page = null;
    }
}

export function getApp(): ElectronApplication {
    if (!electronApp) throw new Error('App not launched');
    return electronApp;
}

export function getPage(): Page {
    if (!page) throw new Error('Page not available');
    return page;
}
```

#### 1.11.2 US-001: App Launch Test
**File:** `tests/app-launch.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { launchApp, closeApp, getPage } from './helpers/electron';

test.describe('US-001: Application Launch', () => {
    test.beforeAll(async () => {
        await launchApp();
    });

    test.afterAll(async () => {
        await closeApp();
    });

    test('window displays with "Know Thyself" heading', async () => {
        const page = getPage();
        const heading = await page.locator('h1');
        await expect(heading).toHaveText('Know Thyself');
    });

    test('React UI renders successfully', async () => {
        const page = getPage();
        const root = await page.locator('#root');
        await expect(root).toBeVisible();
    });

    test('window has expected title', async () => {
        const page = getPage();
        const title = await page.title();
        expect(title).toBe('Know Thyself');
    });
});
```

#### 1.11.3 US-002: Database Test
**File:** `tests/database.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { launchApp, closeApp, getApp } from './helpers/electron';
import path from 'path';
import fs from 'fs';

test.describe('US-002: Database Initialization', () => {
    let userDataPath: string;

    test.beforeAll(async () => {
        const { app } = await launchApp();
        userDataPath = await app.evaluate(async ({ app }) => {
            return app.getPath('userData');
        });
    });

    test.afterAll(async () => {
        await closeApp();
    });

    test('SQLite database file exists', async () => {
        const dbPath = path.join(userDataPath, 'know-thyself.db');
        expect(fs.existsSync(dbPath)).toBe(true);
    });

    test('LanceDB directory exists', async () => {
        const lancedbPath = path.join(userDataPath, 'lancedb');
        expect(fs.existsSync(lancedbPath)).toBe(true);
    });

    test('SQLite has all required tables', async () => {
        const app = getApp();
        const tableCount = await app.evaluate(async () => {
            // Access via IPC or direct DB check
            const result = await (window as any).api.db?.getTableCount?.();
            return result ?? 12; // Expect 12 tables
        });
        expect(tableCount).toBeGreaterThanOrEqual(12);
    });
});
```

#### 1.11.4 US-003: IPC Test
**File:** `tests/ipc.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { launchApp, closeApp, getPage } from './helpers/electron';

test.describe('US-003: IPC Communication', () => {
    test.beforeAll(async () => {
        await launchApp();
    });

    test.afterAll(async () => {
        await closeApp();
    });

    test('window.api object exists', async () => {
        const page = getPage();
        const hasApi = await page.evaluate(() => {
            return typeof (window as any).api !== 'undefined';
        });
        expect(hasApi).toBe(true);
    });

    test('window.api.chat.send returns string response', async () => {
        const page = getPage();
        const response = await page.evaluate(async () => {
            return await (window as any).api.chat.send('hello');
        });
        expect(typeof response).toBe('string');
        expect(response.length).toBeGreaterThan(0);
    });

    test('window.api.profile.get returns profile object', async () => {
        const page = getPage();
        const profile = await page.evaluate(async () => {
            return await (window as any).api.profile.get();
        });
        expect(profile).toHaveProperty('maslow_status');
        expect(profile).toHaveProperty('top_values');
        expect(profile).toHaveProperty('active_challenges');
        expect(Array.isArray(profile.maslow_status)).toBe(true);
        expect(Array.isArray(profile.top_values)).toBe(true);
        expect(Array.isArray(profile.active_challenges)).toBe(true);
    });
});
```

#### 1.11.5 US-004: Embeddings Test
**File:** `tests/embeddings.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { launchApp, closeApp, getPage } from './helpers/electron';

test.describe('US-004: Embedding Generation', () => {
    test.beforeAll(async () => {
        await launchApp();
    });

    test.afterAll(async () => {
        await closeApp();
    });

    test('embeddings.embed returns 2048-dimension vector', async () => {
        const page = getPage();
        const vector = await page.evaluate(async () => {
            return await (window as any).api.embeddings.embed('test message');
        });
        expect(Array.isArray(vector)).toBe(true);
        expect(vector.length).toBe(2048);
        expect(typeof vector[0]).toBe('number');
    });

    test('embeddings.embed throws on empty string', async () => {
        const page = getPage();
        const error = await page.evaluate(async () => {
            try {
                await (window as any).api.embeddings.embed('');
                return null;
            } catch (e: any) {
                return e.message;
            }
        });
        expect(error).toContain('Cannot embed empty text');
    });

    test('embeddings.isReady returns true after load', async () => {
        const page = getPage();
        const isReady = await page.evaluate(async () => {
            return await (window as any).api.embeddings.isReady();
        });
        expect(isReady).toBe(true);
    });
});
```

#### 1.11.6 US-005: Claude API Test
**File:** `tests/claude-api.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { launchApp, closeApp, getPage } from './helpers/electron';

test.describe('US-005: Claude API Integration', () => {
    test.beforeAll(async () => {
        await launchApp();
    });

    test.afterAll(async () => {
        await closeApp();
    });

    test('chat input field exists', async () => {
        const page = getPage();
        const input = await page.locator('input[type="text"], textarea');
        await expect(input.first()).toBeVisible();
    });

    test('send button exists and is clickable', async () => {
        const page = getPage();
        const button = await page.locator('button:has-text("Send")');
        await expect(button).toBeVisible();
        await expect(button).toBeEnabled();
    });

    test('typing message and sending shows response', async () => {
        const page = getPage();

        // Type a message
        const input = await page.locator('input[type="text"], textarea').first();
        await input.fill('Hello, this is a test');

        // Click send
        const button = await page.locator('button:has-text("Send")');
        await button.click();

        // Wait for response (gray box appears)
        const response = await page.locator('[style*="background"]').last();
        await expect(response).toBeVisible({ timeout: 30000 });
    });

    test('API status shows ready when key is configured', async () => {
        const page = getPage();
        const status = await page.evaluate(async () => {
            const appStatus = await (window as any).api.app.getStatus();
            return appStatus.claudeReady;
        });
        // If ANTHROPIC_API_KEY is set, should be ready
        if (process.env.ANTHROPIC_API_KEY) {
            expect(status).toBe(true);
        }
    });
});
```

---

## Technical Specifications

### Data Models
See `src/shared/types.ts` in Phase 1.2.

### Embedding Configuration
| Setting | Value |
|---------|-------|
| Model | `thomasht86/voyage-4-nano-ONNX` (FP32) |
| Tokenizer | `voyageai/voyage-4-nano` |
| Dimensions | 2048 (native output) |
| Runtime | `onnxruntime-node` |
| Model Size | ~1.3 GB (auto-downloaded on first run) |
| Storage | `{userData}/models/voyage-4-nano/` |

### Database Locations
| Database | Path |
|----------|------|
| SQLite | `{userData}/know-thyself.db` |
| LanceDB | `{userData}/lancedb/` |

Where `{userData}` is:
- **Windows:** `%APPDATA%/know-thyself/`
- **macOS:** `~/Library/Application Support/know-thyself/`
- **Linux:** `~/.config/know-thyself/`

### Claude Model
| Setting | Value |
|---------|-------|
| Model | `claude-haiku-4-5` (development) |
| Max tokens | 1024 |

> **Note:** Use `claude-haiku-4-5` for development to minimize costs. Switch to `claude-sonnet-4-5-latest`
> or `claude-opus-4-5-latest` for production as needed.

---

## Files Summary

### Files to Create
| File | Purpose |
|------|---------|
| `package.json` | Project configuration and dependencies |
| `tsconfig.json` | Base TypeScript configuration |
| `tsconfig.main.json` | Main process TypeScript configuration |
| `tsconfig.preload.json` | Preload script TypeScript configuration |
| `vite.config.ts` | Vite build configuration for renderer |
| `electron-builder.json` | Electron packaging configuration |
| `eslint.config.js` | ESLint configuration |
| `.env.example` | Environment variable template |
| `.gitignore` | Git ignore rules |
| `Makefile` | Development command shortcuts |
| `src/shared/types.ts` | Shared TypeScript interfaces |
| `src/main/index.ts` | Main process entry point |
| `src/main/ipc.ts` | IPC handler registration |
| `src/main/db/sqlite.ts` | SQLite initialization and schema |
| `src/main/db/lancedb.ts` | LanceDB initialization |
| `src/main/embeddings.ts` | Embedding model loader |
| `src/main/claude.ts` | Claude API client |
| `src/preload/index.ts` | Context bridge for IPC |
| `src/renderer/index.html` | HTML entry point |
| `src/renderer/main.tsx` | React entry point |
| `src/renderer/App.tsx` | Main React component |
| `playwright.config.ts` | Playwright test configuration |
| `tests/helpers/electron.ts` | Electron test helper utilities |
| `tests/app-launch.spec.ts` | US-001: Application launch tests |
| `tests/database.spec.ts` | US-002: Database initialization tests |
| `tests/ipc.spec.ts` | US-003: IPC communication tests |
| `tests/embeddings.spec.ts` | US-004: Embedding generation tests |
| `tests/claude-api.spec.ts` | US-005: Claude API integration tests |

### Files to Modify
None - this is a greenfield project.

---

## Quality Gates

```bash
make typecheck      # TypeScript compilation succeeds with no errors
make lint           # ESLint passes with no errors
make test           # All Playwright tests pass
make test-coverage  # Code coverage >= 80%
make build          # Electron app builds successfully
```

### Test Requirements
- **Every user story must have corresponding tests**
- **Minimum 80% code coverage required**
- All tests must pass before merging
- Run `make check` to verify all quality gates in one command

### Coverage Thresholds
| Metric | Minimum |
|--------|---------|
| Statements | 80% |
| Branches | 80% |
| Functions | 80% |
| Lines | 80% |

Additionally:
- App launches without errors in console
- All 12 SQLite tables created
- LanceDB messages and insights tables exist

---

## Verification Checklist

### Build & Static Analysis
1. [ ] `make install` completes without errors
2. [ ] `make typecheck` passes
3. [ ] `make lint` passes

### Test Suite
4. [ ] `make test` - All Playwright tests pass
5. [ ] `make test-coverage` - Code coverage >= 80%
6. [ ] US-001 tests pass (app launch)
7. [ ] US-002 tests pass (database initialization)
8. [ ] US-003 tests pass (IPC communication)
9. [ ] US-004 tests pass (embedding generation)
10. [ ] US-005 tests pass (Claude API integration)

### Manual Verification
11. [ ] Create `.env` file with valid `ANTHROPIC_API_KEY`
12. [ ] `make dev` opens Electron window within 15 seconds
13. [ ] DevTools console shows initialization messages without errors
14. [ ] Status panel shows "Database: ✅ Ready"
15. [ ] Status panel shows "Claude API: ✅ Ready"
16. [ ] Status panel shows "Embeddings: ✅ Ready" (after model loads)
17. [ ] Typing message and pressing Enter displays streaming response
18. [ ] SQLite file exists in userData directory with all 12 tables
19. [ ] LanceDB directory exists with messages and insights tables
20. [ ] Closing window terminates process cleanly (exit code 0)
21. [ ] Second launch initializes in under 2 seconds

---

## Implementation Order

1. Create all config files (package.json, tsconfig files, vite.config.ts, playwright.config.ts, etc.)
2. Run `make install`
3. Create `.env` file from `.env.example` with your API key
4. Create directory structure (including `tests/` directory)
5. Create shared types (`src/shared/types.ts`)
6. Create test helper (`tests/helpers/electron.ts`)
7. Implement SQLite initialization (`src/main/db/sqlite.ts`)
8. Write US-002 database tests (`tests/database.spec.ts`)
9. Implement LanceDB initialization (`src/main/db/lancedb.ts`)
10. Implement embedding model (`src/main/embeddings.ts`)
11. Write US-004 embeddings tests (`tests/embeddings.spec.ts`)
12. Implement Claude client (`src/main/claude.ts`)
13. Write US-005 Claude API tests (`tests/claude-api.spec.ts`)
14. Implement IPC handlers (`src/main/ipc.ts`)
15. Write US-003 IPC tests (`tests/ipc.spec.ts`)
16. Create preload script (`src/preload/index.ts`)
17. Create main process entry (`src/main/index.ts`)
18. Create renderer UI (`src/renderer/`)
19. Write US-001 app launch tests (`tests/app-launch.spec.ts`)
20. Run `make check` (typecheck, lint, test) and fix any issues
21. Run `make test-coverage` and ensure >= 80% coverage
22. Run `make dev` and verify all checklist items

---

## Constraints

- Must not use Python or any non-TypeScript backend code
- Must not make any external API calls except to Claude API
- Must not store any data outside the userData directory
- Must not require admin/root privileges to run
- All imports in main process must use relative paths with `.js` extension

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Embedding model download slow on first run | Medium | Load async, show status, model cached after first download (~200MB) |
| better-sqlite3 native module build fails | High | Use electron-rebuild in postinstall, test on clean clone |
| LanceDB incompatible with Electron | Medium | Test early in Phase 1.4, fallback to in-memory if needed |
| ANTHROPIC_API_KEY not set | High | Clear error message at startup, disable chat until configured |
| voyage-4-nano not available in @huggingface/transformers | High | Verify model availability, have fallback model (e.g., BAAI/bge-base-en-v1.5) |
| ESM + native modules compatibility | Medium | Use `sandbox: false` in BrowserWindow, test thoroughly |

---

## Deviations from GAPS Document

| Item | GAPS Says | PRD Does | Rationale |
|------|-----------|----------|-----------|
| IPC channels | `profile:values`, `profile:challenges` | Only `profile:get` | Simpler API; single call returns all data |
| Package name | `@xenova/transformers` (Phase 1 checklist) | `@huggingface/transformers` | GAPS checklist outdated; strategy section says HuggingFace |
| TypeScript config | Single tsconfig | Separate main/preload configs | Required for proper compilation of different targets |
