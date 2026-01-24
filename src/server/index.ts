import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { initPaths } from '../main/paths.js';
import { initSQLite } from '../main/db/sqlite.js';
import { initLanceDB } from '../main/db/lancedb.js';
import { initEmbeddings } from '../main/embeddings.js';
import { initClaude, isClaudeReady } from '../main/claude.js';
import { llmManager, createOllamaProvider, createClaudeProvider } from '../main/llm/index.js';
import { loadLLMConfig } from '../main/llm/storage.js';
import { setupRoutes } from './routes.js';
import { setupWebSocket } from './websocket.js';
import { loadLastUser } from './session.js';

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
    initSQLite();

    console.log('[server] Initializing LanceDB...');
    await initLanceDB();

    // Load user session
    console.log('[server] Loading user session...');
    loadLastUser();

    // Initialize LLM manager
    console.log('[server] Initializing LLM manager...');
    try {
        llmManager.registerProviderFactories(createOllamaProvider, createClaudeProvider);
        const llmConfig = await loadLLMConfig();
        console.log(`[server] Backend: ${llmConfig.backend}`);
        if (llmConfig.backend === 'ollama') {
            console.log(`[server] Ollama URL: ${llmConfig.ollamaBaseUrl || 'http://localhost:11434'}`);
        }
        await llmManager.initialize(llmConfig);
        console.log('[server] LLM manager initialized');
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn('[server] LLM manager init warning:', message);
    }

    // Initialize Claude client
    console.log('[server] Initializing Claude client...');
    try {
        initClaude();
        if (!isClaudeReady()) {
            setInitError('Claude client not ready - API key may be missing');
        }
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
    // __dirname is dist/server/server, so go up to dist/ then into renderer/
    const staticPath = path.join(__dirname, '../../renderer');
    app.use(express.static(staticPath));

    // WebSocket for streaming chat
    setupWebSocket(wss);

    // SPA fallback (after API routes) - Express 5 requires named wildcard
    app.get('*path', (_req: Request, res: Response) => {
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
