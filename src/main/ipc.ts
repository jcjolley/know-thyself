import { ipcMain } from 'electron';
import { generateResponse, streamResponse, isClaudeReady } from './claude.js';
import { embed, isEmbeddingsReady } from './embeddings.js';
import { getDb } from './db/sqlite.js';
import { getOrCreateConversation, saveMessage, getRecentMessages } from './db/messages.js';
import { runExtraction } from './extraction.js';
import { assembleContext } from './context.js';
import type { ProfileSummary, MaslowSignal, Value, Challenge, AppStatus, Message, Extraction } from '../shared/types.js';

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
            databaseReady: true,
            claudeReady: isClaudeReady(),
            error: initError,
        };
    });

    // ==========================================================================
    // Chat Handlers
    // ==========================================================================

    ipcMain.handle('chat:send', async (_event, message: string): Promise<string> => {
        const conversation = await getOrCreateConversation();

        // Save user message
        const userMessage = await saveMessage(conversation.id, 'user', message);

        // Get recent history for context
        const recentMessages = getRecentMessages(conversation.id, 20);

        // Assemble context
        const context = await assembleContext(message, recentMessages);

        // Generate response with context
        const response = await generateResponse(message, context);

        // Save assistant response
        await saveMessage(conversation.id, 'assistant', response);

        // Run extraction in background (don't await)
        runExtraction(userMessage.id).catch(err => {
            console.error('Extraction failed:', err);
        });

        return response;
    });

    ipcMain.on('chat:stream', async (event, message: string) => {
        try {
            const conversation = await getOrCreateConversation();

            // Save user message
            const userMessage = await saveMessage(conversation.id, 'user', message);

            // Get recent history for context
            const recentMessages = getRecentMessages(conversation.id, 20);

            // Assemble context
            const context = await assembleContext(message, recentMessages);

            // Stream response
            let fullResponse = '';
            for await (const chunk of streamResponse(message, context)) {
                fullResponse += chunk;
                if (!event.sender.isDestroyed()) {
                    event.reply('chat:chunk', chunk);
                }
            }

            // Save complete response
            await saveMessage(conversation.id, 'assistant', fullResponse);

            // Run extraction in background
            runExtraction(userMessage.id).catch(err => {
                console.error('Extraction failed:', err);
            });

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
    // Message History
    // ==========================================================================

    ipcMain.handle('messages:history', async (): Promise<Message[]> => {
        const conversation = await getOrCreateConversation();
        return getRecentMessages(conversation.id, 50);
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

    // ==========================================================================
    // Debug Handlers (test mode only)
    // ==========================================================================

    if (process.env.NODE_ENV === 'test') {
        ipcMain.handle('debug:getExtractions', async (_event, messageId?: string): Promise<Extraction[]> => {
            const db = getDb();
            if (messageId) {
                return db.prepare(`SELECT * FROM extractions WHERE message_id = ?`).all(messageId) as Extraction[];
            }
            return db.prepare(`SELECT * FROM extractions ORDER BY created_at DESC LIMIT 10`).all() as Extraction[];
        });

        ipcMain.handle('debug:waitForExtraction', async (_event, messageId: string, timeoutMs: number = 5000): Promise<Extraction | null> => {
            const db = getDb();
            const startTime = Date.now();

            while (Date.now() - startTime < timeoutMs) {
                const extraction = db.prepare(`SELECT * FROM extractions WHERE message_id = ?`).get(messageId) as Extraction | undefined;
                if (extraction) return extraction;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return null;
        });

        ipcMain.handle('debug:clearDatabase', async (): Promise<void> => {
            const db = getDb();
            db.exec(`
                DELETE FROM evidence;
                DELETE FROM extractions;
                DELETE FROM maslow_signals;
                DELETE FROM challenges;
                DELETE FROM user_values;
                DELETE FROM messages;
                DELETE FROM conversations;
            `);
        });

        ipcMain.handle('debug:getMessages', async (): Promise<Message[]> => {
            const db = getDb();
            return db.prepare(`SELECT * FROM messages ORDER BY created_at`).all() as Message[];
        });
    }
}
