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
