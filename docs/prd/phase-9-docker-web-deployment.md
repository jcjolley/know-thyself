# Phase 9: Docker Web Deployment

## Overview
Convert Know Thyself from an Electron desktop app to a Docker-deployable web application. Users run `docker compose up` and access the app via browser at `http://localhost:3000`.

## Problem Statement
The current Electron architecture requires users to build and run a native desktop application. This creates friction for deployment, testing, and sharing. A containerized web version allows anyone with Docker to run the complete application with a single command.

## Goals
- [ ] Single-command deployment: `docker compose up` starts everything
- [ ] Full feature parity with Electron version
- [ ] Data persistence across container restarts
- [ ] Works on Linux, macOS, and Windows (via Docker Desktop)

## Non-Goals
- Not supporting multi-user/multi-tenant deployment (single-user focus)
- Not implementing user authentication (local use only)
- Not removing Electron support (web version runs alongside, not replacing)
- Not switching databases (keep SQLite + LanceDB)
- Not implementing HTTPS (localhost only; users add reverse proxy for production)
- Not splitting into separate frontend/backend containers (single container for simplicity)

---

## User Stories

### US-001: One-Command Startup
**As a** user with Docker installed
**I want** to run `docker compose up` and have the app work
**So that** I can use the app without installing Node.js or building anything

**Acceptance Criteria:**
- [ ] `docker compose up` starts the application without errors
- [ ] Application is accessible at `http://localhost:3000` within 60 seconds
- [ ] All services (server, databases, embeddings) initialize correctly
- [ ] Logs show clear startup progress
- [ ] Health endpoint returns 200 OK when ready

### US-002: Chat Functionality via Web
**As a** user accessing the web interface
**I want** to send messages and receive streaming AI responses
**So that** I have the same conversation experience as the Electron app

**Acceptance Criteria:**
- [ ] Message input and send button work in browser
- [ ] AI responses stream in real-time (not waiting for full response)
- [ ] Conversation history persists between page refreshes
- [ ] New conversations can be created
- [ ] Conversation titles auto-generate on first message
- [ ] Error messages display for API failures
- [ ] WebSocket reconnects automatically if connection drops

### US-003: Data Persistence
**As a** user
**I want** my conversations and profile data to persist
**So that** I don't lose my history when I restart Docker

**Acceptance Criteria:**
- [ ] Docker volume stores SQLite database
- [ ] Docker volume stores LanceDB vector data
- [ ] Docker volume stores downloaded ONNX model
- [ ] Stopping and restarting containers preserves all data
- [ ] `docker compose down` does not delete volume data

### US-004: Environment Configuration
**As a** user setting up the application
**I want** to configure my API key via environment variable or .env file
**So that** I can provide credentials without modifying code

**Acceptance Criteria:**
- [ ] `ANTHROPIC_API_KEY` can be set in `.env` file
- [ ] `ANTHROPIC_API_KEY` can be passed via `docker compose` environment
- [ ] Missing API key shows clear error message in UI
- [ ] API key is never logged or exposed in container output
- [ ] API key can be set/updated from Settings UI

### US-005: Profile View
**As a** user
**I want** to view my psychological profile in the web interface
**So that** I can see insights extracted from my conversations

**Acceptance Criteria:**
- [ ] Profile page displays values, challenges, and psychological signals
- [ ] Profile data updates after conversations
- [ ] Profile page matches Electron app functionality
- [ ] Full profile summary available

### US-006: Conversation Management
**As a** user
**I want** to manage my conversations
**So that** I can organize and find past discussions

**Acceptance Criteria:**
- [ ] List all conversations with titles and dates
- [ ] Search conversations by content
- [ ] Rename conversation titles
- [ ] Delete conversations
- [ ] Load and continue previous conversations

### US-007: Guided Journeys
**As a** user
**I want** to start guided journeys from the web interface
**So that** I can explore specific self-reflection topics

**Acceptance Criteria:**
- [ ] List available journeys
- [ ] Start a new journey (creates conversation with opening message)
- [ ] Journey conversations work like regular conversations

### US-008: LLM Backend Configuration
**As a** user
**I want** to switch between Claude and Ollama backends
**So that** I can use local models if preferred

**Acceptance Criteria:**
- [ ] View current LLM configuration
- [ ] Switch between Claude and Ollama backends
- [ ] Configure Ollama URL and model
- [ ] Test connection to verify settings
- [ ] List available Ollama models

---

## Phases

### Phase 1: Web Server Foundation
Create an Express.js server that replaces Electron's main process, exposing all existing functionality via HTTP/WebSocket.

#### 1.1 Create Server Entry Point
**File:** `src/server/index.ts`

```typescript
import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { initSQLite } from '../main/db/sqlite.js';
import { initLanceDB } from '../main/db/lancedb.js';
import { initEmbeddings } from '../main/embeddings.js';
import { initClaude } from '../main/claude.js';
import { setupRoutes } from './routes.js';
import { setupWebSocket } from './websocket.js';
import { initPaths } from './paths.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

let initError: string | null = null;

export function getInitError(): string | null {
  return initError;
}

export function setInitError(error: string): void {
  initError = error;
}

async function main() {
  console.log('[server] Starting Know Thyself server...');

  // Initialize paths first
  initPaths();

  // Initialize databases
  console.log('[server] Initializing SQLite...');
  await initSQLite();

  console.log('[server] Initializing LanceDB...');
  await initLanceDB();

  // Initialize Claude client
  console.log('[server] Initializing Claude client...');
  try {
    initClaude();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[server] Claude init warning:', message);
    setInitError(message);
  }

  // Start embedding model load (non-blocking)
  console.log('[server] Loading embeddings model (background)...');
  initEmbeddings().catch(err => {
    console.error('[server] Embeddings init error:', err);
  });

  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Middleware
  app.use(express.json());

  // API routes (before static files)
  setupRoutes(app);

  // Serve static React build
  const staticPath = path.join(__dirname, '../../dist/renderer');
  app.use(express.static(staticPath));

  // WebSocket for streaming chat
  setupWebSocket(wss);

  // SPA fallback (after API routes)
  app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });

  server.listen(PORT, () => {
    console.log(`[server] Ready at http://localhost:${PORT}`);
  });
}

main().catch(err => {
  console.error('[server] Fatal error:', err);
  process.exit(1);
});
```

#### 1.2 Create HTTP Routes
**File:** `src/server/routes.ts`

```typescript
import { Router, type Express } from 'express';
import { isClaudeReady, initClaude } from '../main/claude.js';
import { isEmbeddingsReady, embed } from '../main/embeddings.js';
import { getDb } from '../main/db/sqlite.js';
import { getOrCreateConversation, saveMessage, getRecentMessages } from '../main/db/messages.js';
import {
  listConversations,
  createConversation,
  getConversationById,
  updateConversationTitle,
  deleteConversation,
  searchConversations,
  getMostRecentConversation,
} from '../main/db/conversations.js';
import { getAllSignalsForAdmin, getEvidenceForDimension, getAllGoals, getFullProfileSummary } from '../main/db/profile.js';
import { getApiKeyStatus, saveApiKey, clearApiKey, validateApiKeyFormat } from '../main/api-key-storage.js';
import { clearGuidedModeState } from '../main/guided-onboarding.js';
import { getAllJourneys, getJourney } from '../main/journeys.js';
import { generateJourneyOpening } from '../main/claude.js';
import { llmManager, saveLLMConfig, OllamaProvider } from '../main/llm/index.js';
import { getInitError } from './index.js';
import type { MaslowSignal, Value, Challenge } from '../shared/types.js';

export function setupRoutes(app: Express): void {
  const router = Router();

  // ==========================================================================
  // Health Check
  // ==========================================================================

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ==========================================================================
  // App Status
  // ==========================================================================

  router.get('/status', (_req, res) => {
    res.json({
      embeddingsReady: isEmbeddingsReady(),
      databaseReady: true,
      claudeReady: isClaudeReady(),
      error: getInitError(),
    });
  });

  // ==========================================================================
  // Messages
  // ==========================================================================

  router.get('/messages', async (req, res) => {
    try {
      const conversationId = req.query.conversationId as string | undefined;
      if (conversationId) {
        const messages = getRecentMessages(conversationId, 50);
        res.json(messages);
      } else {
        const conversation = await getOrCreateConversation();
        const messages = getRecentMessages(conversation.id, 50);
        res.json(messages);
      }
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ==========================================================================
  // Conversations
  // ==========================================================================

  router.get('/conversations', (_req, res) => {
    try {
      res.json(listConversations());
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  router.post('/conversations', (_req, res) => {
    try {
      res.json(createConversation());
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  router.get('/conversations/current', (_req, res) => {
    try {
      res.json(getMostRecentConversation());
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  router.get('/conversations/search', (req, res) => {
    try {
      const query = req.query.q as string || '';
      res.json(searchConversations(query));
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  router.get('/conversations/:id', (req, res) => {
    try {
      const conversation = getConversationById(req.params.id);
      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }
      res.json(conversation);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  router.patch('/conversations/:id', (req, res) => {
    try {
      const { title } = req.body;
      if (!title) {
        res.status(400).json({ error: 'Title required' });
        return;
      }
      const success = updateConversationTitle(req.params.id, title);
      res.json({ success });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  router.delete('/conversations/:id', (req, res) => {
    try {
      clearGuidedModeState(req.params.id);
      const success = deleteConversation(req.params.id);
      res.status(success ? 204 : 404).send();
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ==========================================================================
  // Profile
  // ==========================================================================

  router.get('/profile', (_req, res) => {
    try {
      const db = getDb();

      const maslowSignals = db.prepare(`
        SELECT * FROM maslow_signals
        ORDER BY created_at DESC
        LIMIT 10
      `).all() as MaslowSignal[];

      const values = db.prepare(`
        SELECT * FROM user_values
        ORDER BY confidence DESC
        LIMIT 5
      `).all() as Value[];

      const challenges = db.prepare(`
        SELECT * FROM challenges
        WHERE status = 'active'
        ORDER BY mention_count DESC
        LIMIT 5
      `).all() as Challenge[];

      res.json({
        maslow_status: maslowSignals,
        top_values: values,
        active_challenges: challenges,
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  router.get('/profile/summary', (_req, res) => {
    try {
      res.json(getFullProfileSummary());
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ==========================================================================
  // API Key Management
  // ==========================================================================

  router.get('/api-key/status', (_req, res) => {
    try {
      res.json(getApiKeyStatus());
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  router.post('/api-key', (req, res) => {
    try {
      const { key } = req.body;
      if (!key) {
        res.status(400).json({ success: false, error: 'Key required' });
        return;
      }
      const result = saveApiKey(key);
      if (result.success) {
        try {
          initClaude();
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          res.json({ success: false, error: `Key saved but Claude init failed: ${message}` });
          return;
        }
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  router.delete('/api-key', (_req, res) => {
    try {
      const success = clearApiKey();
      res.json({ success });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  router.post('/api-key/validate', (req, res) => {
    try {
      const { key } = req.body;
      if (!key) {
        res.status(400).json({ valid: false, error: 'Key required' });
        return;
      }
      res.json(validateApiKeyFormat(key));
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ==========================================================================
  // Journeys
  // ==========================================================================

  router.get('/journeys', (_req, res) => {
    try {
      res.json(getAllJourneys());
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  router.post('/journeys/:id/start', async (req, res) => {
    try {
      const journey = getJourney(req.params.id);
      if (!journey) {
        res.status(404).json({ error: 'Journey not found' });
        return;
      }

      const conversation = createConversation(journey.title, req.params.id);

      // Generate opening message
      try {
        const db = getDb();
        const parts: string[] = [];

        const values = db.prepare(`
          SELECT name FROM user_values ORDER BY confidence DESC LIMIT 3
        `).all() as { name: string }[];
        const challenges = db.prepare(`
          SELECT description FROM challenges WHERE status = 'active' LIMIT 2
        `).all() as { description: string }[];

        if (values.length > 0) {
          parts.push(`Values: ${values.map(v => v.name).join(', ')}`);
        }
        if (challenges.length > 0) {
          parts.push(`Current challenges: ${challenges.map(c => c.description.slice(0, 50)).join('; ')}`);
        }
        const profileSummary = parts.join('\n') || 'New user, minimal profile data.';

        const openingMessage = await generateJourneyOpening(journey, profileSummary);
        await saveMessage(conversation.id, 'assistant', openingMessage);
      } catch (err) {
        console.error('[journeys] Failed to generate opening:', err);
      }

      res.json({
        conversationId: conversation.id,
        journeyId: req.params.id,
        title: journey.title,
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ==========================================================================
  // LLM Backend
  // ==========================================================================

  router.get('/llm/config', (_req, res) => {
    try {
      res.json(llmManager.getConfig());
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  router.put('/llm/config', async (req, res) => {
    try {
      const config = req.body;
      await saveLLMConfig({
        backend: config.backend,
        ollamaBaseUrl: config.ollamaBaseUrl,
        ollamaModel: config.ollamaModel,
      });
      await llmManager.updateConfig(config);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  router.post('/llm/test', async (_req, res) => {
    try {
      const provider = llmManager.getProvider();
      const result = await provider.testConnection();
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.json({ ok: false, error: message });
    }
  });

  router.get('/llm/status', async (_req, res) => {
    try {
      res.json(await llmManager.getStatus());
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  router.get('/llm/ollama/models', async (req, res) => {
    try {
      const baseUrl = (req.query.baseUrl as string) || llmManager.getConfig().ollamaBaseUrl || 'http://localhost:11434';
      const models = await OllamaProvider.listModels(baseUrl);
      res.json(models);
    } catch (err) {
      console.error('Failed to list Ollama models:', err);
      res.json([]);
    }
  });

  // ==========================================================================
  // Embeddings
  // ==========================================================================

  router.get('/embeddings/ready', (_req, res) => {
    res.json({ ready: isEmbeddingsReady() });
  });

  router.post('/embeddings/embed', async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        res.status(400).json({ error: 'Text required' });
        return;
      }
      const vector = await embed(text);
      res.json({ vector });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ==========================================================================
  // Admin/Debug (development only)
  // ==========================================================================

  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    router.get('/admin/profile', (_req, res) => {
      try {
        const db = getDb();
        const signals = getAllSignalsForAdmin();
        const values = db.prepare(`SELECT * FROM user_values ORDER BY confidence DESC`).all() as Value[];
        const challenges = db.prepare(`SELECT * FROM challenges ORDER BY mention_count DESC`).all() as Challenge[];
        const goals = getAllGoals();
        const maslowSignals = db.prepare(`SELECT * FROM maslow_signals ORDER BY created_at DESC`).all() as MaslowSignal[];
        res.json({ signals, values, challenges, goals, maslowSignals });
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
    });

    router.get('/admin/evidence/:dimension', (req, res) => {
      try {
        res.json(getEvidenceForDimension(req.params.dimension));
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
    });

    router.post('/debug/clear-database', (_req, res) => {
      try {
        const db = getDb();
        db.exec(`
          DELETE FROM evidence;
          DELETE FROM extractions;
          DELETE FROM maslow_signals;
          DELETE FROM challenges;
          DELETE FROM user_values;
          DELETE FROM messages;
          DELETE FROM conversations;
          DELETE FROM psychological_signals;
          DELETE FROM goals;
        `);
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
    });
  }

  // Mount all routes under /api
  app.use('/api', router);
}
```

#### 1.3 Create WebSocket Handler for Streaming
**File:** `src/server/websocket.ts`

```typescript
import { WebSocketServer, WebSocket } from 'ws';
import { streamResponse, buildResponsePrompts } from '../main/claude.js';
import { runExtraction } from '../main/extraction.js';
import { assembleContext } from '../main/context.js';
import { getOrCreateConversation, saveMessage, getRecentMessages } from '../main/db/messages.js';
import {
  getConversationById,
  updateConversationTitle,
  generateTitleFromMessage,
  getMessageCount,
} from '../main/db/conversations.js';
import { checkBaselineStatus, updateGuidedModeState, getGuidedModeState } from '../main/guided-onboarding.js';
import type { Conversation } from '../shared/types.js';

interface ChatStreamMessage {
  type: 'chat:stream';
  conversationId?: string;
  content: string;
}

interface WebSocketWithState extends WebSocket {
  isAlive?: boolean;
}

export function setupWebSocket(wss: WebSocketServer): void {
  // Heartbeat to detect broken connections
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const socket = ws as WebSocketWithState;
      if (socket.isAlive === false) {
        return socket.terminate();
      }
      socket.isAlive = false;
      socket.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  wss.on('connection', (ws: WebSocket) => {
    const socket = ws as WebSocketWithState;
    socket.isAlive = true;

    socket.on('pong', () => {
      socket.isAlive = true;
    });

    socket.on('message', async (data: Buffer) => {
      let message: ChatStreamMessage;
      try {
        message = JSON.parse(data.toString());
      } catch {
        socket.send(JSON.stringify({ type: 'chat:error', error: 'Invalid JSON' }));
        return;
      }

      if (message.type === 'chat:stream') {
        await handleChatStream(socket, message);
      }
    });

    socket.on('error', (err) => {
      console.error('[websocket] Error:', err);
    });
  });
}

async function handleChatStream(ws: WebSocket, message: ChatStreamMessage): Promise<void> {
  try {
    // Get or create conversation
    let conversation: Conversation & { title?: string };
    if (message.conversationId) {
      const existing = getConversationById(message.conversationId);
      if (!existing) {
        ws.send(JSON.stringify({ type: 'chat:error', error: `Conversation not found: ${message.conversationId}` }));
        return;
      }
      conversation = existing;
    } else {
      conversation = await getOrCreateConversation() as Conversation & { title?: string };
    }

    // Check if first message (for title generation)
    const messageCountBefore = getMessageCount(conversation.id);

    // Save user message
    const userMessage = await saveMessage(conversation.id, 'user', message.content);

    // Get recent history for context
    const recentMessages = getRecentMessages(conversation.id, 20);

    // Assemble context
    const context = await assembleContext(message.content, recentMessages, conversation.id);

    // Build prompt for logging
    const prompts = buildResponsePrompts(message.content, context);
    const fullPrompt = `=== SYSTEM PROMPT ===\n${prompts.system}\n\n=== USER PROMPT ===\n${prompts.user}`;

    // Stream response
    let fullResponse = '';
    for await (const chunk of streamResponse(message.content, context)) {
      fullResponse += chunk;
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'chat:chunk', chunk }));
      }
    }

    // Save complete response
    await saveMessage(conversation.id, 'assistant', fullResponse, fullPrompt);

    // Auto-generate title on first user message
    let newTitle: string | undefined;
    if (messageCountBefore === 0) {
      newTitle = generateTitleFromMessage(message.content);
      updateConversationTitle(conversation.id, newTitle);
    }

    // Run extraction in background
    runExtraction(userMessage.id, conversation.id)
      .then(() => {
        const baselineStatus = checkBaselineStatus();
        const state = getGuidedModeState(conversation.id);
        if (baselineStatus.baselineComplete && state.isActive) {
          updateGuidedModeState(conversation.id, {
            isActive: false,
            deactivationReason: 'baseline_met',
          });
        }
      })
      .catch(err => {
        console.error('[websocket] Extraction failed:', err);
      });

    // Send done with conversation info
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'chat:done',
        conversationId: conversation.id,
        title: newTitle,
      }));
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'chat:error', error: errorMessage }));
    }
  }
}
```

#### 1.4 Create Configurable Paths Module
**File:** `src/server/paths.ts`

```typescript
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

// Determine if we're running in Electron or standalone Node
const isElectron = typeof process !== 'undefined' && process.versions && !!process.versions.electron;

function getDataDir(): string {
  // Environment variable takes precedence
  if (process.env.DATA_DIR) {
    return process.env.DATA_DIR;
  }

  // In Electron, use userData
  if (isElectron) {
    return app.getPath('userData');
  }

  // Standalone server: use ./data or /data (Docker)
  return path.join(process.cwd(), 'data');
}

let dataDir: string;

export function initPaths(): void {
  dataDir = getDataDir();

  // Ensure directories exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const modelsDir = path.join(dataDir, 'models');
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
  }

  const lanceDir = path.join(dataDir, 'lancedb');
  if (!fs.existsSync(lanceDir)) {
    fs.mkdirSync(lanceDir, { recursive: true });
  }

  console.log('[paths] Data directory:', dataDir);
}

export const paths = {
  get dataDir() { return dataDir; },
  get sqlite() { return path.join(dataDir, 'know-thyself.db'); },
  get lancedb() { return path.join(dataDir, 'lancedb'); },
  get models() { return path.join(dataDir, 'models'); },
};
```

#### 1.5 Add Server Dependencies
**File:** `package.json` (additions)

```json
{
  "dependencies": {
    "express": "^4.21.0",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/ws": "^8.5.12"
  }
}
```

### Phase 2: Frontend Adaptation
Create a web-compatible API client that replaces `window.api` (Electron preload) with HTTP/WebSocket calls.

#### 2.1 Create Web API Client
**File:** `src/renderer/api/web-client.ts`

```typescript
const API_BASE = '/api';

// WebSocket management with automatic reconnection
class WebSocketManager {
  private ws: WebSocket | null = null;
  private messageHandlers = new Map<string, (data: any) => void>();
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

  on(type: string, handler: (data: any) => void): void {
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

        wsManager.on('chat:chunk', (data) => {
          response += data.chunk;
        });

        wsManager.on('chat:done', (data: ChatStreamDonePayload) => {
          cleanup();
          resultConversationId = data.conversationId || resultConversationId;
          resultTitle = data.title;
          resolve({ response, conversationId: resultConversationId, title: resultTitle });
        });

        wsManager.on('chat:error', (data) => {
          cleanup();
          reject(new Error(data.error));
        });

        wsManager.send({ type: 'chat:stream', conversationId, content: message });
      });
    },

    stream: (message: string, conversationId?: string) => {
      wsManager.send({ type: 'chat:stream', conversationId, content: message });
    },

    onChunk: (callback: (chunk: string) => void) => {
      wsManager.on('chat:chunk', (data) => callback(data.chunk));
    },

    onDone: (callback: (payload?: ChatStreamDonePayload) => void) => {
      wsManager.on('chat:done', callback);
    },

    onError: (callback: (error: string) => void) => {
      wsManager.on('chat:error', (data) => callback(data.error));
    },

    removeAllListeners: () => {
      wsManager.off('chat:chunk');
      wsManager.off('chat:done');
      wsManager.off('chat:error');
    },
  },

  messages: {
    history: (conversationId?: string) =>
      fetchJson(`${API_BASE}/messages${conversationId ? `?conversationId=${conversationId}` : ''}`),
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
      fetchJson(`${API_BASE}/api-key`, { method: 'DELETE' }).then((r: any) => r.success),
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
    setConfig: (config: any) =>
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
        const extractions = await fetchJson<any[]>(`${API_BASE}/debug/extractions?messageId=${messageId}`);
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
```

#### 2.2 Create API Context Provider
**File:** `src/renderer/contexts/ApiContext.tsx`

```typescript
import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { webApi, type WebApiType } from '../api/web-client';

const ApiContext = createContext<WebApiType | null>(null);

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!(window as any).api;

export function ApiProvider({ children }: { children: ReactNode }) {
  const api = useMemo(() => {
    if (isElectron) {
      // In Electron, use the preload-exposed API
      return (window as any).api as WebApiType;
    }
    // In web mode, use HTTP/WebSocket client
    return webApi;
  }, []);

  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function useApi(): WebApiType {
  const api = useContext(ApiContext);
  if (!api) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return api;
}
```

#### 2.3 Update React Components
**Files to modify:**
- `src/renderer/App.tsx` - Wrap with `ApiProvider`
- `src/renderer/components/ChatPage.tsx` - Replace `window.api` with `useApi()`
- `src/renderer/components/ProfileView.tsx` - Replace `window.api` with `useApi()`
- `src/renderer/components/ConversationList.tsx` - Replace `window.api` with `useApi()`
- `src/renderer/components/ConversationSidebar.tsx` - Replace `window.api` with `useApi()`
- `src/renderer/components/SettingsPanel.tsx` - Replace `window.api` with `useApi()`
- `src/renderer/components/JourneysPage.tsx` - Replace `window.api` with `useApi()`

**Pattern:**
```typescript
// Before
const status = await window.api.app.getStatus();

// After
import { useApi } from '../contexts/ApiContext';
// ...
const api = useApi();
const status = await api.app.getStatus();
```

### Phase 3: Docker Configuration

#### 3.1 Create Dockerfile
**File:** `Dockerfile`

```dockerfile
# =============================================================================
# Build stage - compile TypeScript and build frontend
# =============================================================================
FROM node:20-bookworm AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first (better layer caching)
COPY package*.json ./

# Install ALL dependencies (including dev for build)
RUN npm ci

# Copy source code
COPY . .

# Build server (TypeScript) and renderer (Vite)
RUN npm run build:server && npm run build:renderer

# =============================================================================
# Production stage - minimal runtime image
# =============================================================================
FROM node:20-bookworm-slim

WORKDIR /app

# Install runtime dependencies for native modules
# Note: We need build tools because native modules must be compiled for this specific Node version
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install production dependencies only (includes native module compilation)
RUN npm ci --omit=dev

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN useradd -m -s /bin/bash appuser && \
    mkdir -p /data && \
    chown -R appuser:appuser /app /data

USER appuser

# Environment
ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

EXPOSE 3000

VOLUME /data

CMD ["node", "dist/server/index.js"]
```

#### 3.2 Create docker-compose.yml
**File:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  know-thyself:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "${PORT:-3000}:3000"
    volumes:
      - know-thyself-data:/data
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - DATA_DIR=/data
      - NODE_ENV=production
    restart: unless-stopped
    # Resource limits (adjust as needed)
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 512M

volumes:
  know-thyself-data:
    name: know-thyself-data
```

#### 3.3 Create .dockerignore
**File:** `.dockerignore`

```
# Dependencies
node_modules

# Build outputs
dist
release
out

# Development files
*.log
*.tmp
.env
.env.local
.env.*.local

# Version control
.git
.gitignore

# IDE
.vscode
.idea
*.swp
*.swo

# Tests
tests
*.spec.ts
*.test.ts
coverage
test-results
playwright-report

# Documentation (not needed in container)
docs
*.md
!README.md

# macOS
.DS_Store

# Electron-specific (not needed for web)
electron-builder.yml
```

#### 3.4 Create .env.example
**File:** `.env.example`

```bash
# =============================================================================
# Know Thyself - Environment Configuration
# =============================================================================

# Required: Your Anthropic API key
# Get one at: https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-api03-...

# Optional: Server port (default: 3000)
# PORT=3000

# Optional: Data directory (default: ./data locally, /data in Docker)
# DATA_DIR=/path/to/data

# Optional: Node environment (default: production in Docker)
# NODE_ENV=production
```

### Phase 4: Build System Updates

#### 4.1 Add Server TypeScript Config
**File:** `tsconfig.server.json`

```json
{
  "extends": "./tsconfig.main.json",
  "compilerOptions": {
    "outDir": "dist/server",
    "rootDir": "src",
    "declaration": false,
    "declarationMap": false
  },
  "include": [
    "src/server/**/*",
    "src/main/**/*",
    "src/shared/**/*"
  ],
  "exclude": [
    "src/renderer/**/*",
    "src/preload/**/*",
    "node_modules",
    "dist"
  ]
}
```

#### 4.2 Update package.json Scripts
**File:** `package.json` (add/modify scripts)

```json
{
  "scripts": {
    "build:server": "tsc -p tsconfig.server.json",
    "build:renderer": "vite build",
    "build:docker": "npm run build:server && npm run build:renderer",
    "dev:server": "tsc -p tsconfig.server.json --watch",
    "start:server": "node dist/server/index.js",
    "docker:build": "docker compose build",
    "docker:up": "docker compose up",
    "docker:up:detach": "docker compose up -d",
    "docker:down": "docker compose down",
    "docker:logs": "docker compose logs -f",
    "docker:clean": "docker compose down -v"
  }
}
```

#### 4.3 Update Vite Config
**File:** `vite.config.ts` (ensure web compatibility)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  root: 'src/renderer',
  base: '/',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    sourcemap: mode === 'development',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
    },
  },
  define: {
    // Ensure process.env works in browser
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  // Exclude electron from bundle
  optimizeDeps: {
    exclude: ['electron'],
  },
  build: {
    rollupOptions: {
      external: ['electron'],
    },
  },
}));
```

### Phase 5: Database Path Updates

#### 5.1 Update SQLite Initialization
**File:** `src/main/db/sqlite.ts` (modify `initSQLite`)

```typescript
import { app } from 'electron';
import path from 'path';

// Check if running in Electron or standalone
const isElectron = typeof process !== 'undefined' && process.versions && !!process.versions.electron;

function getDbPath(): string {
  if (process.env.DATA_DIR) {
    return path.join(process.env.DATA_DIR, 'know-thyself.db');
  }
  if (isElectron) {
    return path.join(app.getPath('userData'), 'know-thyself.db');
  }
  return path.join(process.cwd(), 'data', 'know-thyself.db');
}

export function initSQLite(): void {
  const dbPath = getDbPath();
  // ... rest of initialization
}
```

#### 5.2 Update LanceDB Initialization
**File:** `src/main/db/lancedb.ts` (similar pattern)

#### 5.3 Update Embeddings Model Path
**File:** `src/main/embeddings.ts` (similar pattern)

### Phase 6: Testing & Documentation

#### 6.1 Create Docker E2E Test
**File:** `tests/docker-deployment.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const DOCKER_STARTUP_TIMEOUT = 120000; // 2 minutes for build + start
const APP_URL = 'http://localhost:3000';

// Skip these tests unless DOCKER_TEST=true
const runDockerTests = process.env.DOCKER_TEST === 'true';

test.describe('Phase 9: Docker Web Deployment', () => {
  test.skip(!runDockerTests, 'Skipping Docker tests (set DOCKER_TEST=true to run)');

  test.beforeAll(async () => {
    if (!runDockerTests) return;

    console.log('Building and starting Docker containers...');
    await execAsync('docker compose up -d --build', {
      timeout: DOCKER_STARTUP_TIMEOUT,
      cwd: process.cwd(),
    });

    // Wait for health check to pass
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`${APP_URL}/api/health`);
        if (response.ok) {
          console.log('Server is ready');
          return;
        }
      } catch {
        // Server not ready yet
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error('Server did not become ready in time');
  });

  test.afterAll(async () => {
    if (!runDockerTests) return;
    await execAsync('docker compose down');
  });

  test('US-001: Application starts and serves UI', async ({ page }) => {
    const response = await page.goto(APP_URL);
    expect(response?.status()).toBe(200);

    // Check that React app loaded
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('US-001: Health endpoint returns OK', async ({ request }) => {
    const response = await request.get(`${APP_URL}/api/health`);
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.status).toBe('ok');
  });

  test('US-001: Status endpoint returns app state', async ({ request }) => {
    const response = await request.get(`${APP_URL}/api/status`);
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body).toHaveProperty('embeddingsReady');
    expect(body).toHaveProperty('databaseReady');
    expect(body).toHaveProperty('claudeReady');
  });

  test('US-006: Conversations API works', async ({ request }) => {
    // Create conversation
    const createRes = await request.post(`${APP_URL}/api/conversations`);
    expect(createRes.ok()).toBe(true);
    const conversation = await createRes.json();
    expect(conversation).toHaveProperty('id');

    // List conversations
    const listRes = await request.get(`${APP_URL}/api/conversations`);
    expect(listRes.ok()).toBe(true);
    const list = await listRes.json();
    expect(Array.isArray(list)).toBe(true);

    // Delete conversation
    const deleteRes = await request.delete(`${APP_URL}/api/conversations/${conversation.id}`);
    expect(deleteRes.status()).toBe(204);
  });

  test('US-005: Profile endpoint returns data structure', async ({ request }) => {
    const response = await request.get(`${APP_URL}/api/profile`);
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body).toHaveProperty('maslow_status');
    expect(body).toHaveProperty('top_values');
    expect(body).toHaveProperty('active_challenges');
  });

  test('US-007: Journeys endpoint returns list', async ({ request }) => {
    const response = await request.get(`${APP_URL}/api/journeys`);
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });
});
```

#### 6.2 Create Unit Tests
**File:** `tests/unit/web-client.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((err: any) => void) | null = null;

  send = vi.fn();
  close = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();

  constructor() {
    setTimeout(() => this.onopen?.(), 0);
  }
}
global.WebSocket = MockWebSocket as any;

describe('US-001: One-Command Startup', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('US-001: webApi provides all required methods', async () => {
    const { webApi } = await import('../../src/renderer/api/web-client');

    // Chat
    expect(webApi.chat.stream).toBeDefined();
    expect(webApi.chat.send).toBeDefined();
    expect(webApi.chat.onChunk).toBeDefined();
    expect(webApi.chat.onDone).toBeDefined();
    expect(webApi.chat.onError).toBeDefined();
    expect(webApi.chat.removeAllListeners).toBeDefined();

    // Conversations
    expect(webApi.conversations.list).toBeDefined();
    expect(webApi.conversations.create).toBeDefined();
    expect(webApi.conversations.get).toBeDefined();
    expect(webApi.conversations.delete).toBeDefined();
    expect(webApi.conversations.search).toBeDefined();
    expect(webApi.conversations.updateTitle).toBeDefined();
    expect(webApi.conversations.getCurrent).toBeDefined();

    // Profile
    expect(webApi.profile.get).toBeDefined();
    expect(webApi.profile.getSummary).toBeDefined();

    // App
    expect(webApi.app.getStatus).toBeDefined();

    // API Key
    expect(webApi.apiKey.getStatus).toBeDefined();
    expect(webApi.apiKey.save).toBeDefined();
    expect(webApi.apiKey.clear).toBeDefined();
    expect(webApi.apiKey.validate).toBeDefined();

    // Journeys
    expect(webApi.journeys.list).toBeDefined();
    expect(webApi.journeys.start).toBeDefined();

    // LLM
    expect(webApi.llm.getConfig).toBeDefined();
    expect(webApi.llm.setConfig).toBeDefined();
    expect(webApi.llm.testConnection).toBeDefined();
    expect(webApi.llm.getStatus).toBeDefined();
    expect(webApi.llm.listOllamaModels).toBeDefined();

    // Embeddings
    expect(webApi.embeddings.isReady).toBeDefined();
    expect(webApi.embeddings.embed).toBeDefined();
  });
});

describe('US-002: Chat Functionality via Web', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('US-002: status endpoint returns app state', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        embeddingsReady: true,
        databaseReady: true,
        claudeReady: true,
        error: null,
      }),
    });

    const { webApi } = await import('../../src/renderer/api/web-client');
    const status = await webApi.app.getStatus();

    expect(status).toHaveProperty('embeddingsReady');
    expect(status).toHaveProperty('claudeReady');
  });
});

describe('US-003: Data Persistence', () => {
  it('US-003: paths module exports correct structure', async () => {
    // This would test the paths module
    // In actual test, we'd verify paths are constructed correctly
  });
});

describe('US-004: Environment Configuration', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('US-004: API key status can be retrieved', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        hasKey: true,
        source: 'stored',
        maskedKey: 'sk-ant-***',
        encryptionAvailable: true,
      }),
    });

    const { webApi } = await import('../../src/renderer/api/web-client');
    const status = await webApi.apiKey.getStatus();

    expect(status).toHaveProperty('hasKey');
    expect(status).toHaveProperty('source');
  });
});

describe('US-006: Conversation Management', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('US-006: conversations can be listed', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([
        { id: '1', title: 'Test', created_at: '2024-01-01' },
      ]),
    });

    const { webApi } = await import('../../src/renderer/api/web-client');
    const list = await webApi.conversations.list();

    expect(Array.isArray(list)).toBe(true);
  });

  it('US-006: conversation can be created', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'new-id', title: 'New Conversation' }),
    });

    const { webApi } = await import('../../src/renderer/api/web-client');
    const conv = await webApi.conversations.create();

    expect(conv).toHaveProperty('id');
  });
});

describe('US-007: Guided Journeys', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('US-007: journeys can be listed', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([
        { id: 'values', title: 'Values Exploration', description: 'Test' },
      ]),
    });

    const { webApi } = await import('../../src/renderer/api/web-client');
    const journeys = await webApi.journeys.list();

    expect(Array.isArray(journeys)).toBe(true);
  });
});

describe('US-008: LLM Backend Configuration', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('US-008: LLM config can be retrieved', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        backend: 'claude',
        ollamaBaseUrl: 'http://localhost:11434',
      }),
    });

    const { webApi } = await import('../../src/renderer/api/web-client');
    const config = await webApi.llm.getConfig();

    expect(config).toHaveProperty('backend');
  });
});
```

#### 6.3 Create Docker Deployment Documentation
**File:** `docs/docker-deployment.md`

```markdown
# Docker Deployment

Run Know Thyself with a single command using Docker.

## Quick Start

1. **Clone and configure:**
   ```bash
   git clone <repo-url>
   cd know-thyself
   cp .env.example .env
   ```

2. **Add your API key:**
   Edit `.env` and set your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-...
   ```

3. **Start the application:**
   ```bash
   docker compose up
   ```

4. **Open in browser:**
   Navigate to http://localhost:3000

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes* | - | Your Anthropic API key |
| `PORT` | No | 3000 | Server port |
| `DATA_DIR` | No | /data | Data storage directory |

*Can also be configured via the Settings UI after startup.

## Commands

```bash
# Start (foreground)
docker compose up

# Start (background)
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down

# Stop and remove data
docker compose down -v

# Rebuild after code changes
docker compose up --build
```

## Data Persistence

All data is stored in a Docker volume named `know-thyself-data`:

- SQLite database (conversations, profile)
- LanceDB vector store
- Downloaded ONNX embedding model

### Backup Data

```bash
# Create backup
docker run --rm \
  -v know-thyself-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/know-thyself-backup.tar.gz -C /data .

# Restore backup
docker run --rm \
  -v know-thyself-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/know-thyself-backup.tar.gz -C /data
```

## First Startup

On first startup, the application will:
1. Initialize the SQLite database
2. Download the embedding model (~100MB)
3. Start accepting connections

The health check will report ready once initialization completes (typically 30-60 seconds).

## Troubleshooting

### Container won't start

Check logs:
```bash
docker compose logs know-thyself
```

### API key errors

Verify your key is set:
```bash
docker compose exec know-thyself printenv ANTHROPIC_API_KEY
```

### Reset everything

```bash
docker compose down -v
docker compose up --build
```

## Resource Requirements

- **Memory:** 512MB minimum, 2GB recommended
- **Disk:** ~500MB for image + data volume
- **CPU:** Any modern CPU

## Development

Build and run without Docker:
```bash
npm install
npm run build:docker
ANTHROPIC_API_KEY=your-key npm run start:server
```
```

---

## Technical Specifications

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Docker Container                                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Express Server (Node.js)                                │ │
│ │ ┌───────────────┐ ┌───────────────────────────────────┐ │ │
│ │ │ Static Files  │ │ API Routes                        │ │ │
│ │ │ (React Build) │ │ /api/status, /api/conversations,  │ │ │
│ │ └───────────────┘ │ /api/profile, /api/journeys, etc. │ │ │
│ │                   └───────────────────────────────────┘ │ │
│ │ ┌───────────────────────────────────────────────────────┐│ │
│ │ │ WebSocket Server (/ws)                               ││ │
│ │ │ - Streaming chat responses                           ││ │
│ │ │ - Automatic reconnection                             ││ │
│ │ └───────────────────────────────────────────────────────┘│ │
│ │ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │ │
│ │ │ SQLite      │ │ LanceDB     │ │ ONNX Runtime       │ │ │
│ │ │ (Profile,   │ │ (Vectors)   │ │ (Embeddings)       │ │ │
│ │ │ Messages)   │ │             │ │                    │ │ │
│ │ └─────────────┘ └─────────────┘ └─────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
│                          ▲                                  │
│                          │ Volume Mount                     │
│                     ┌────┴────┐                             │
│                     │ /data   │                             │
│                     └─────────┘                             │
└─────────────────────────────────────────────────────────────┘
              ▲
              │ HTTP/WebSocket :3000
         ┌────┴────┐
         │ Browser │
         └─────────┘
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/status` | GET | App initialization status |
| `/api/messages` | GET | Get message history |
| `/api/conversations` | GET | List conversations |
| `/api/conversations` | POST | Create conversation |
| `/api/conversations/current` | GET | Get most recent conversation |
| `/api/conversations/search` | GET | Search conversations |
| `/api/conversations/:id` | GET | Get conversation by ID |
| `/api/conversations/:id` | PATCH | Update conversation title |
| `/api/conversations/:id` | DELETE | Delete conversation |
| `/api/profile` | GET | Get profile summary |
| `/api/profile/summary` | GET | Get full profile summary |
| `/api/api-key/status` | GET | Get API key status |
| `/api/api-key` | POST | Save API key |
| `/api/api-key` | DELETE | Clear API key |
| `/api/api-key/validate` | POST | Validate API key format |
| `/api/journeys` | GET | List journeys |
| `/api/journeys/:id/start` | POST | Start a journey |
| `/api/llm/config` | GET | Get LLM configuration |
| `/api/llm/config` | PUT | Update LLM configuration |
| `/api/llm/test` | POST | Test LLM connection |
| `/api/llm/status` | GET | Get LLM status |
| `/api/llm/ollama/models` | GET | List Ollama models |
| `/api/embeddings/ready` | GET | Check embeddings status |
| `/api/embeddings/embed` | POST | Generate embedding |
| `/ws` | WebSocket | Streaming chat |

### WebSocket Messages

**Client → Server:**
```typescript
{ type: 'chat:stream', conversationId?: string, content: string }
```

**Server → Client:**
```typescript
{ type: 'chat:chunk', chunk: string }
{ type: 'chat:done', conversationId: string, title?: string }
{ type: 'chat:error', error: string }
```

---

## Files Summary

### Files to Create
| File | Purpose |
|------|---------|
| `src/server/index.ts` | Express server entry point |
| `src/server/routes.ts` | HTTP API routes |
| `src/server/websocket.ts` | WebSocket chat handler |
| `src/server/paths.ts` | Configurable data paths |
| `src/renderer/api/web-client.ts` | Browser API client with WebSocket |
| `src/renderer/contexts/ApiContext.tsx` | API context provider |
| `Dockerfile` | Multi-stage container build |
| `docker-compose.yml` | Service orchestration |
| `.dockerignore` | Build exclusions |
| `.env.example` | Environment template |
| `tsconfig.server.json` | Server TypeScript config |
| `docs/docker-deployment.md` | Deployment documentation |
| `tests/docker-deployment.spec.ts` | E2E Docker tests |
| `tests/unit/web-client.test.ts` | Unit tests for web client |

### Files to Modify
| File | Changes |
|------|---------|
| `package.json` | Add dependencies (express, ws) and scripts |
| `vite.config.ts` | Configure for web-only build |
| `src/main/db/sqlite.ts` | Support configurable data path |
| `src/main/db/lancedb.ts` | Support configurable data path |
| `src/main/embeddings.ts` | Support configurable model path |
| `src/renderer/App.tsx` | Wrap with ApiProvider |
| `src/renderer/components/ChatPage.tsx` | Use useApi() hook |
| `src/renderer/components/ProfileView.tsx` | Use useApi() hook |
| `src/renderer/components/ConversationList.tsx` | Use useApi() hook |
| `src/renderer/components/ConversationSidebar.tsx` | Use useApi() hook |
| `src/renderer/components/SettingsPanel.tsx` | Use useApi() hook |
| `src/renderer/components/JourneysPage.tsx` | Use useApi() hook |

---

## Test Plan

### Unit Tests (per User Story)
**File:** `tests/unit/web-client.test.ts`

- US-001: webApi provides all required methods
- US-002: status endpoint returns app state
- US-003: paths module exports correct structure
- US-004: API key status can be retrieved
- US-006: conversations can be listed and created
- US-007: journeys can be listed
- US-008: LLM config can be retrieved

### E2E Test (for PRD)
**File:** `tests/docker-deployment.spec.ts`

- US-001: Application starts and serves UI
- US-001: Health endpoint returns OK
- US-001: Status endpoint returns app state
- US-005: Profile endpoint returns data structure
- US-006: Conversations API works (create, list, delete)
- US-007: Journeys endpoint returns list

---

## Quality Gates

- `npm run typecheck` - Type checking passes
- `npm run lint` - No linting errors
- `npm run test:unit` - Unit tests pass
- `npm run build:docker` - Server and renderer build successfully
- `docker compose build` - Docker image builds without errors
- `docker compose up` - Container starts and health check passes
- `DOCKER_TEST=true npm run test` - E2E tests pass against container

---

## Verification Checklist

1. [ ] `docker compose up` completes without errors
2. [ ] Health check passes (`curl http://localhost:3000/api/health`)
3. [ ] Browser loads `http://localhost:3000` showing chat UI
4. [ ] Can create new conversation
5. [ ] Send message → receive streaming AI response
6. [ ] Conversation title auto-generates
7. [ ] Profile page displays values and signals
8. [ ] Journeys page lists available journeys
9. [ ] Can start a journey
10. [ ] Settings page shows API key status
11. [ ] Stop container, restart → data persists
12. [ ] Search conversations works
13. [ ] Delete conversation works
14. [ ] `docker compose down -v && docker compose up` → fresh start works

---

## Implementation Order

1. **Phase 1.5**: Add dependencies (express, ws, types)
2. **Phase 5**: Update database modules for configurable paths
3. **Phase 1.4**: Create paths module
4. **Phase 1.1**: Create server entry point
5. **Phase 1.2**: Create HTTP routes
6. **Phase 1.3**: Create WebSocket handler
7. **Phase 2.1**: Create web API client
8. **Phase 2.2**: Create API context provider
9. **Phase 2.3**: Update React components to use API context
10. **Phase 4**: Update build system (tsconfig, package.json scripts)
11. **Phase 3**: Create Docker configuration
12. **Phase 6**: Tests and documentation

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Native modules fail in Docker | High | Use Debian-based image, install build tools |
| ONNX model download slow on first run | Medium | Document expected startup time, health check waits |
| WebSocket connection drops | Medium | Implemented auto-reconnection with exponential backoff |
| SQLite concurrent access issues | Low | Single-user design, WAL mode enabled |
| Large Docker image size | Low | Multi-stage build, production deps only |
| Electron imports break server | Medium | Conditional imports, separate entry points |
