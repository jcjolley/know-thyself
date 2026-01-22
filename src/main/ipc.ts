import { ipcMain } from 'electron';
import { generateResponse, streamResponse, isClaudeReady, buildResponsePrompts, initClaude, generateJourneyOpening } from './claude.js';
import { embed, isEmbeddingsReady } from './embeddings.js';
import { getDb } from './db/sqlite.js';
import { getOrCreateConversation, saveMessage, getRecentMessages, getMessagesWithPrompts, type MessageWithPrompt } from './db/messages.js';
import {
    listConversations,
    createConversation,
    getConversationById,
    updateConversationTitle,
    deleteConversation,
    searchConversations,
    generateTitleFromMessage,
    getMessageCount,
    getMostRecentConversation,
    type ConversationListItem,
    type ConversationWithMessages,
    type ConversationSearchResult,
} from './db/conversations.js';
import { runExtraction, reanalyzeConversation } from './extraction.js';
import { assembleContext } from './context.js';
import { getAllSignalsForAdmin, getEvidenceForDimension, getAllGoals, getFullProfileSummary } from './db/profile.js';
import { getApiKeyStatus, saveApiKey, clearApiKey, validateApiKeyFormat } from './api-key-storage.js';
import { clearGuidedModeState, checkBaselineStatus, updateGuidedModeState, getGuidedModeState } from './guided-onboarding.js';
import type { ProfileSummary, MaslowSignal, Value, Challenge, AppStatus, Message, Extraction, AdminProfileData, SignalEvidence, FullProfileSummary, Conversation, ApiKeyStatus, JourneyInfo, JourneyStartResult } from '../shared/types.js';
import { getAllJourneys, getJourney } from './journeys.js';
import { llmManager, saveLLMConfig, OllamaProvider } from './llm/index.js';
import type { LLMConfig, LLMStatus, OllamaModel } from './llm/types.js';

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

    ipcMain.handle('chat:send', async (_event, message: string, conversationId?: string): Promise<{ response: string; conversationId: string; title?: string }> => {
        // Use provided conversationId or get/create one
        let conversation: Conversation & { title?: string };
        if (conversationId) {
            const existing = getConversationById(conversationId);
            if (!existing) throw new Error(`Conversation not found: ${conversationId}`);
            conversation = existing;
        } else {
            conversation = await getOrCreateConversation() as Conversation & { title?: string };
        }

        // Check if this is the first message (for title generation)
        const messageCountBefore = getMessageCount(conversation.id);

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

        // Auto-generate title on first user message
        let newTitle: string | undefined;
        if (messageCountBefore === 0) {
            newTitle = generateTitleFromMessage(message);
            updateConversationTitle(conversation.id, newTitle);
        }

        // Run extraction in background (don't await)
        runExtraction(userMessage.id, conversation.id)
            .then(() => {
                // Check if baseline is now met after extraction
                const baselineStatus = checkBaselineStatus();
                const state = getGuidedModeState(conversation.id);
                if (baselineStatus.baselineComplete && state.isActive) {
                    updateGuidedModeState(conversation.id, {
                        isActive: false,
                        deactivationReason: 'baseline_met',
                    });
                    console.log('[guided] Baseline met after extraction, deactivating guided mode');
                }
            })
            .catch(err => {
                console.error('Extraction failed:', err);
            });

        return { response, conversationId: conversation.id, title: newTitle };
    });

    ipcMain.on('chat:stream', async (event, message: string, conversationId?: string) => {
        try {
            // Use provided conversationId or get/create one
            let conversation: Conversation & { title?: string };
            if (conversationId) {
                const existing = getConversationById(conversationId);
                if (!existing) throw new Error(`Conversation not found: ${conversationId}`);
                conversation = existing;
            } else {
                conversation = await getOrCreateConversation() as Conversation & { title?: string };
            }

            // Check if this is the first message (for title generation)
            const messageCountBefore = getMessageCount(conversation.id);

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

            // Auto-generate title on first user message
            let newTitle: string | undefined;
            if (messageCountBefore === 0) {
                newTitle = generateTitleFromMessage(message);
                updateConversationTitle(conversation.id, newTitle);
            }

            // Run extraction in background
            runExtraction(userMessage.id, conversation.id)
                .then(() => {
                    // Check if baseline is now met after extraction
                    const baselineStatus = checkBaselineStatus();
                    const state = getGuidedModeState(conversation.id);
                    if (baselineStatus.baselineComplete && state.isActive) {
                        updateGuidedModeState(conversation.id, {
                            isActive: false,
                            deactivationReason: 'baseline_met',
                        });
                        console.log('[guided] Baseline met after extraction, deactivating guided mode');
                    }
                })
                .catch(err => {
                    console.error('Extraction failed:', err);
                });

            if (!event.sender.isDestroyed()) {
                event.reply('chat:done', { conversationId: conversation.id, title: newTitle });
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

    ipcMain.handle('messages:history', async (_event, conversationId?: string): Promise<Message[]> => {
        if (conversationId) {
            return getRecentMessages(conversationId, 50);
        }
        const conversation = await getOrCreateConversation();
        return getRecentMessages(conversation.id, 50);
    });

    // ==========================================================================
    // Conversation Management
    // ==========================================================================

    ipcMain.handle('conversations:list', async (): Promise<ConversationListItem[]> => {
        return listConversations();
    });

    ipcMain.handle('conversations:create', async (): Promise<Conversation & { title: string }> => {
        return createConversation();
    });

    ipcMain.handle('conversations:get', async (_event, id: string): Promise<ConversationWithMessages | null> => {
        return getConversationById(id);
    });

    ipcMain.handle('conversations:updateTitle', async (_event, id: string, title: string): Promise<boolean> => {
        return updateConversationTitle(id, title);
    });

    ipcMain.handle('conversations:delete', async (_event, id: string): Promise<boolean> => {
        // Clear guided mode state for this conversation
        clearGuidedModeState(id);
        return deleteConversation(id);
    });

    ipcMain.handle('conversations:search', async (_event, query: string): Promise<ConversationSearchResult[]> => {
        return searchConversations(query);
    });

    ipcMain.handle('conversations:getCurrent', async (): Promise<(Conversation & { title: string }) | null> => {
        return getMostRecentConversation();
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
    // API Key Management
    // ==========================================================================

    ipcMain.handle('apiKey:getStatus', async (): Promise<ApiKeyStatus> => {
        return getApiKeyStatus();
    });

    ipcMain.handle('apiKey:save', async (_event, key: string): Promise<{ success: boolean; error?: string }> => {
        const result = saveApiKey(key);
        if (result.success) {
            // Re-initialize Claude with new key
            try {
                initClaude();
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                return { success: false, error: `Key saved but Claude init failed: ${message}` };
            }
        }
        return result;
    });

    ipcMain.handle('apiKey:clear', async (): Promise<boolean> => {
        return clearApiKey();
    });

    ipcMain.handle('apiKey:validate', async (_event, key: string): Promise<{ valid: boolean; error?: string }> => {
        return validateApiKeyFormat(key);
    });

    // ==========================================================================
    // LLM Backend Handlers
    // ==========================================================================

    ipcMain.handle('llm:getConfig', async (): Promise<LLMConfig> => {
        return llmManager.getConfig();
    });

    ipcMain.handle('llm:setConfig', async (_event, config: Partial<LLMConfig>): Promise<void> => {
        // Save to storage (excluding sensitive data that's stored separately)
        await saveLLMConfig({
            backend: config.backend,
            ollamaBaseUrl: config.ollamaBaseUrl,
            ollamaModel: config.ollamaModel,
        });

        // Update the manager (which recreates the provider if needed)
        await llmManager.updateConfig(config);
    });

    ipcMain.handle('llm:testConnection', async (): Promise<{ ok: boolean; error?: string }> => {
        try {
            const provider = llmManager.getProvider();
            return await provider.testConnection();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { ok: false, error: message };
        }
    });

    ipcMain.handle('llm:getStatus', async (): Promise<LLMStatus> => {
        return await llmManager.getStatus();
    });

    ipcMain.handle('llm:listOllamaModels', async (_event, baseUrl?: string): Promise<OllamaModel[]> => {
        const url = baseUrl || llmManager.getConfig().ollamaBaseUrl || 'http://localhost:11434';
        try {
            return await OllamaProvider.listModels(url);
        } catch (error) {
            console.error('Failed to list Ollama models:', error);
            return [];
        }
    });

    // ==========================================================================
    // Journey Handlers
    // ==========================================================================

    ipcMain.handle('journeys:list', async (): Promise<JourneyInfo[]> => {
        return getAllJourneys();
    });

    ipcMain.handle('journeys:start', async (_event, journeyId: string): Promise<JourneyStartResult> => {
        const journey = getJourney(journeyId);
        if (!journey) {
            throw new Error(`Journey not found: ${journeyId}`);
        }

        // Create a new conversation with this journey
        const conversation = createConversation(journey.title, journeyId);

        // Generate opening message from Claude
        try {
            // Get brief profile summary for the opening
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

            // Generate and save the opening message
            const openingMessage = await generateJourneyOpening(journey, profileSummary);
            await saveMessage(conversation.id, 'assistant', openingMessage);
            console.log(`[journeys] Generated opening message for journey: ${journeyId}`);
        } catch (err) {
            console.error('[journeys] Failed to generate opening message:', err);
            // Continue without opening message - user can still use the conversation
        }

        return {
            conversationId: conversation.id,
            journeyId: journeyId,
            title: journey.title,
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
