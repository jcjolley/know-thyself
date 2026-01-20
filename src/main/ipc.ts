import { ipcMain } from 'electron';
import { generateResponse, streamResponse, isClaudeReady, buildResponsePrompts } from './claude.js';
import { embed, isEmbeddingsReady } from './embeddings.js';
import { getDb } from './db/sqlite.js';
import { getOrCreateConversation, saveMessage, getRecentMessages, getMessagesWithPrompts, type MessageWithPrompt } from './db/messages.js';
import { runExtraction, reanalyzeConversation } from './extraction.js';
import { assembleContext } from './context.js';
import { getAllSignalsForAdmin, getEvidenceForDimension, getAllGoals, getFullProfileSummary } from './db/profile.js';
import type { ProfileSummary, MaslowSignal, Value, Challenge, AppStatus, Message, Extraction, AdminProfileData, SignalEvidence, FullProfileSummary } from '../shared/types.js';

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

        // Assemble context (now includes conversationId for intent tracking)
        const context = await assembleContext(message, recentMessages, conversation.id);

        // Build the prompt for logging
        const prompts = buildResponsePrompts(message, context);
        const fullPrompt = `=== SYSTEM PROMPT ===\n${prompts.system}\n\n=== USER PROMPT ===\n${prompts.user}`;

        // Generate response with context
        const response = await generateResponse(message, context);

        // Save assistant response with the prompt that generated it
        await saveMessage(conversation.id, 'assistant', response, fullPrompt);

        // Run extraction in background (don't await)
        runExtraction(userMessage.id, conversation.id).catch(err => {
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

            // Assemble context (now includes conversationId for intent tracking)
            const context = await assembleContext(message, recentMessages, conversation.id);

            // Build the prompt for logging
            const prompts = buildResponsePrompts(message, context);
            const fullPrompt = `=== SYSTEM PROMPT ===\n${prompts.system}\n\n=== USER PROMPT ===\n${prompts.user}`;

            // Stream response
            let fullResponse = '';
            for await (const chunk of streamResponse(message, context)) {
                fullResponse += chunk;
                if (!event.sender.isDestroyed()) {
                    event.reply('chat:chunk', chunk);
                }
            }

            // Save complete response with the prompt that generated it
            await saveMessage(conversation.id, 'assistant', fullResponse, fullPrompt);

            // Run extraction in background
            runExtraction(userMessage.id, conversation.id).catch(err => {
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

    ipcMain.handle('profile:getSummary', async (): Promise<FullProfileSummary> => {
        return getFullProfileSummary();
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
    // Debug Handlers (test/development mode only)
    // ==========================================================================

    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
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
                DELETE FROM psychological_signals;
                DELETE FROM goals;
            `);
        });

        ipcMain.handle('debug:getMessages', async (): Promise<Message[]> => {
            const db = getDb();
            return db.prepare(`SELECT * FROM messages ORDER BY created_at`).all() as Message[];
        });

        // Admin Page Handlers
        ipcMain.handle('admin:getProfile', async (): Promise<AdminProfileData> => {
            const db = getDb();
            const signals = getAllSignalsForAdmin();
            const values = db.prepare(`SELECT * FROM user_values ORDER BY confidence DESC`).all() as Value[];
            const challenges = db.prepare(`SELECT * FROM challenges ORDER BY mention_count DESC`).all() as Challenge[];
            const goals = getAllGoals();
            const maslowSignals = db.prepare(`SELECT * FROM maslow_signals ORDER BY created_at DESC`).all() as MaslowSignal[];

            return { signals, values, challenges, goals, maslowSignals };
        });

        ipcMain.handle('admin:getEvidence', async (_event, dimension: string): Promise<SignalEvidence[]> => {
            return getEvidenceForDimension(dimension);
        });

        ipcMain.handle('admin:getMessagesWithPrompts', async (_event, limit: number = 50): Promise<MessageWithPrompt[]> => {
            return getMessagesWithPrompts(limit);
        });

        ipcMain.handle('extraction:reanalyze', async (event): Promise<void> => {
            const conversation = await getOrCreateConversation();
            console.log('[reanalyze] Starting re-analysis for conversation:', conversation.id);

            // Log user messages
            const db = getDb();
            const userMessages = db.prepare(`
                SELECT id, content FROM messages
                WHERE conversation_id = ? AND role = 'user'
                ORDER BY created_at ASC
            `).all(conversation.id) as { id: string; content: string }[];
            console.log('[reanalyze] Found', userMessages.length, 'user messages');

            await reanalyzeConversation(conversation.id, (progress) => {
                console.log('[reanalyze] Progress:', progress);
                if (!event.sender.isDestroyed()) {
                    event.sender.send('extraction:progress', progress);
                }
            });

            // Log extraction results
            const extractions = db.prepare(`SELECT * FROM extractions ORDER BY created_at DESC LIMIT 10`).all();
            console.log('[reanalyze] Extractions after re-analysis:', extractions.length);

            const signals = db.prepare(`SELECT * FROM psychological_signals`).all();
            console.log('[reanalyze] Psychological signals:', signals.length);
        });
    }
}
