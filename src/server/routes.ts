import { Router, type Express, type Request, type Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import { isClaudeReady, initClaude, generateJourneyOpening } from '../main/claude.js';

// Helper to safely get a route param as string (Express 5 types params as string | string[])
function getParam(params: ParamsDictionary, key: string): string {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
}
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
import { llmManager, saveLLMConfig, OllamaProvider } from '../main/llm/index.js';
import { getInitError } from './index.js';
import {
    deleteMessagesAfter,
    getPrecedingUserMessage,
    deleteMessage,
    getMessageById,
    getMessageCountAfter,
} from '../main/db/messages.js';
import { deleteMessageEmbeddings, deleteUserEmbeddings } from '../main/db/lancedb.js';
import type { MaslowSignal, Value, Challenge, RegenerateResult } from '../shared/types.js';
import {
    listUsers,
    createUser,
    getUserById,
    deleteUser,
    getMigrationStatus,
    claimLegacyData,
    getUserCount,
    AVATAR_COLORS,
} from '../main/db/users.js';
import {
    getCurrentUser,
    setCurrentUser,
    getCurrentUserProfile,
    clearCurrentUser,
} from './session.js';
import { assignEmbeddingsToUser } from '../main/db/lancedb.js';

export function setupRoutes(app: Express): void {
    const router = Router();

    // ==========================================================================
    // Health Check
    // ==========================================================================

    router.get('/health', (_req: Request, res: Response) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // ==========================================================================
    // App Status
    // ==========================================================================

    router.get('/status', (_req: Request, res: Response) => {
        res.json({
            embeddingsReady: isEmbeddingsReady(),
            databaseReady: true,
            claudeReady: isClaudeReady(),
            error: getInitError(),
        });
    });

    // ==========================================================================
    // Users (Phase 10)
    // ==========================================================================

    /**
     * List all user profiles.
     */
    router.get('/users', (_req: Request, res: Response) => {
        try {
            res.json(listUsers());
        } catch (err) {
            res.status(500).json({ error: String(err) });
        }
    });

    /**
     * Get the currently active user.
     */
    router.get('/users/current', (_req: Request, res: Response) => {
        try {
            const user = getCurrentUserProfile();
            if (!user) {
                res.json(null);
                return;
            }
            res.json(user);
        } catch (err) {
            res.status(500).json({ error: String(err) });
        }
    });

    /**
     * Get available avatar colors.
     */
    router.get('/users/avatar-colors', (_req: Request, res: Response) => {
        res.json(AVATAR_COLORS);
    });

    /**
     * Create a new user profile.
     */
    router.post('/users', (req: Request, res: Response) => {
        try {
            const { name, avatarColor } = req.body;
            if (!name || typeof name !== 'string' || name.trim().length === 0) {
                res.status(400).json({ error: 'Name is required' });
                return;
            }
            const user = createUser(name.trim(), avatarColor);
            // Auto-select the new user
            setCurrentUser(user.id);
            res.json(user);
        } catch (err) {
            res.status(500).json({ error: String(err) });
        }
    });

    /**
     * Select a user (switch to their profile).
     */
    router.post('/users/:id/select', (req: Request, res: Response) => {
        try {
            const userId = getParam(req.params, 'id');
            const user = getUserById(userId);
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            setCurrentUser(userId);
            res.json(user);
        } catch (err) {
            res.status(500).json({ error: String(err) });
        }
    });

    /**
     * Delete a user profile.
     * Cannot delete the currently active user.
     */
    router.delete('/users/:id', async (req: Request, res: Response) => {
        try {
            const userId = getParam(req.params, 'id');

            // Check if trying to delete current user
            const currentUserId = getCurrentUser();
            if (userId === currentUserId) {
                res.status(400).json({ error: 'Cannot delete the currently active user. Switch to another user first.' });
                return;
            }

            const result = deleteUser(userId) as { success: boolean; error?: string; _messageIdsForCleanup?: string[] };
            if (!result.success) {
                res.status(404).json({ error: result.error || 'User not found' });
                return;
            }

            // Cleanup LanceDB embeddings (async, don't block response)
            if (result._messageIdsForCleanup && result._messageIdsForCleanup.length > 0) {
                deleteUserEmbeddings(userId).catch(err => {
                    console.error('[users] LanceDB cleanup failed:', err);
                });
            }

            // If no users left, clear the session
            if (getUserCount() === 0) {
                clearCurrentUser();
            }

            res.status(204).send();
        } catch (err) {
            res.status(500).json({ error: String(err) });
        }
    });

    // ==========================================================================
    // Migration (Phase 10)
    // ==========================================================================

    /**
     * Get migration status (pending legacy data).
     */
    router.get('/migration/status', (_req: Request, res: Response) => {
        try {
            res.json(getMigrationStatus());
        } catch (err) {
            res.status(500).json({ error: String(err) });
        }
    });

    /**
     * Claim legacy data for the current user.
     */
    router.post('/migration/claim', async (req: Request, res: Response) => {
        try {
            const userId = getCurrentUser();
            if (!userId) {
                res.status(400).json({ error: 'No user selected. Create or select a user first.' });
                return;
            }

            const { messageIds } = claimLegacyData(userId);

            // Update LanceDB embeddings (async)
            if (messageIds.length > 0) {
                assignEmbeddingsToUser(messageIds, userId).catch(err => {
                    console.error('[migration] LanceDB update failed:', err);
                });
            }

            res.json({ success: true, claimed: messageIds.length });
        } catch (err) {
            res.status(500).json({ error: String(err) });
        }
    });

    // ==========================================================================
    // Messages
    // ==========================================================================

    router.get('/messages', async (req: Request, res: Response) => {
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

    router.get('/conversations', (_req: Request, res: Response) => {
        try {
            const userId = getCurrentUser();
            res.json(listConversations(userId || undefined));
        } catch (err) {
            res.status(500).json({ error: String(err) });
        }
    });

    router.post('/conversations', (_req: Request, res: Response) => {
        try {
            const userId = getCurrentUser();
            res.json(createConversation('New Conversation', undefined, userId || undefined));
        } catch (err) {
            res.status(500).json({ error: String(err) });
        }
    });

    router.get('/conversations/current', (_req: Request, res: Response) => {
        try {
            const userId = getCurrentUser();
            res.json(getMostRecentConversation(userId || undefined));
        } catch (err) {
            res.status(500).json({ error: String(err) });
        }
    });

    router.get('/conversations/search', (req: Request, res: Response) => {
        try {
            const query = req.query.q as string || '';
            const userId = getCurrentUser();
            res.json(searchConversations(query, userId || undefined));
        } catch (err) {
            res.status(500).json({ error: String(err) });
        }
    });

    router.get('/conversations/:id', (req: Request, res: Response) => {
        try {
            const conversation = getConversationById(getParam(req.params, 'id'));
            if (!conversation) {
                res.status(404).json({ error: 'Conversation not found' });
                return;
            }
            res.json(conversation);
        } catch (err) {
            res.status(500).json({ error: String(err) });
        }
    });

    router.patch('/conversations/:id', (req: Request, res: Response) => {
        try {
            const { title } = req.body;
            if (!title) {
                res.status(400).json({ error: 'Title required' });
                return;
            }
            const success = updateConversationTitle(getParam(req.params, 'id'), title);
            res.json({ success });
        } catch (err) {
            res.status(500).json({ error: String(err) });
        }
    });

    router.delete('/conversations/:id', (req: Request, res: Response) => {
        try {
            clearGuidedModeState(getParam(req.params, 'id'));
            const success = deleteConversation(getParam(req.params, 'id'));
            res.status(success ? 204 : 404).send();
        } catch (err) {
            res.status(500).json({ error: String(err) });
        }
    });

    // ==========================================================================
    // Message Reset & Regenerate (Phase 10)
    // ==========================================================================

    /**
     * Reset a conversation after a specific message.
     * Deletes all messages after the specified message.
     */
    router.post('/conversations/:id/reset', async (req: Request, res: Response) => {
        try {
            const conversationId = getParam(req.params, 'id');
            const { afterMessageId } = req.body;

            if (!afterMessageId) {
                res.status(400).json({ success: false, error: 'afterMessageId is required' });
                return;
            }

            // Delete messages after the specified point
            const { deletedCount, deletedIds } = deleteMessagesAfter(conversationId, afterMessageId);

            // Best-effort cleanup of LanceDB embeddings (async, don't block response)
            if (deletedIds.length > 0) {
                deleteMessageEmbeddings(deletedIds).catch(err => {
                    console.error('[reset] LanceDB cleanup failed:', err);
                });
            }

            res.json({ success: true, deletedCount });
        } catch (err) {
            console.error('[reset] Error:', err);
            res.status(500).json({ success: false, error: String(err) });
        }
    });

    /**
     * Get the count of messages after a specific message.
     * Used for showing delete count in confirmation dialog.
     */
    router.get('/conversations/:id/messages-after/:messageId/count', (req: Request, res: Response) => {
        try {
            const conversationId = getParam(req.params, 'id');
            const messageId = getParam(req.params, 'messageId');

            const count = getMessageCountAfter(conversationId, messageId);
            res.json({ count });
        } catch (err) {
            res.status(500).json({ error: String(err) });
        }
    });

    /**
     * Prepare to regenerate an assistant response.
     * Returns the information needed to regenerate (either user message or journey info).
     * Also deletes the assistant message being regenerated.
     */
    router.post('/messages/:id/regenerate', async (req: Request, res: Response) => {
        try {
            const messageId = getParam(req.params, 'id');

            // Get the message to regenerate
            const message = getMessageById(messageId);
            if (!message) {
                res.json({ type: 'error', error: 'Message not found' } as RegenerateResult);
                return;
            }

            if (message.role !== 'assistant') {
                res.json({ type: 'error', error: 'Can only regenerate assistant messages' } as RegenerateResult);
                return;
            }

            const conversationId = message.conversation_id;

            // Check if this is a journey conversation
            const conversation = getConversationById(conversationId);
            if (!conversation) {
                res.json({ type: 'error', error: 'Conversation not found' } as RegenerateResult);
                return;
            }

            // Try to find the preceding user message
            const precedingMessage = getPrecedingUserMessage(conversationId, messageId);

            // Delete the assistant message (and any messages after it)
            const { deletedIds } = deleteMessagesAfter(conversationId, messageId);
            // Also delete the message itself
            deleteMessage(messageId);

            // Cleanup embeddings (best-effort)
            const allDeletedIds = [messageId, ...deletedIds];
            deleteMessageEmbeddings(allDeletedIds).catch(err => {
                console.error('[regenerate] LanceDB cleanup failed:', err);
            });

            // Determine the type of regeneration
            if (precedingMessage) {
                // Normal chat regeneration - re-send the user message
                res.json({
                    type: 'chat',
                    userMessage: precedingMessage.content,
                    conversationId,
                } as RegenerateResult);
            } else if (conversation.journey_id) {
                // Journey opening regeneration
                res.json({
                    type: 'journey',
                    journeyId: conversation.journey_id,
                    conversationId,
                } as RegenerateResult);
            } else {
                // No preceding message and no journey - can't regenerate
                res.json({
                    type: 'error',
                    error: 'Cannot regenerate: no preceding message',
                } as RegenerateResult);
            }
        } catch (err) {
            console.error('[regenerate] Error:', err);
            res.json({ type: 'error', error: String(err) } as RegenerateResult);
        }
    });

    // ==========================================================================
    // Profile
    // ==========================================================================

    router.get('/profile', (_req: Request, res: Response) => {
        try {
            const db = getDb();
            const userId = getCurrentUser();

            const maslowSignals = userId
                ? db.prepare(`
                    SELECT * FROM maslow_signals
                    WHERE user_id = ?
                    ORDER BY created_at DESC
                    LIMIT 10
                `).all(userId) as MaslowSignal[]
                : db.prepare(`
                    SELECT * FROM maslow_signals
                    ORDER BY created_at DESC
                    LIMIT 10
                `).all() as MaslowSignal[];

            const values = userId
                ? db.prepare(`
                    SELECT * FROM user_values
                    WHERE user_id = ?
                    ORDER BY confidence DESC
                    LIMIT 5
                `).all(userId) as Value[]
                : db.prepare(`
                    SELECT * FROM user_values
                    ORDER BY confidence DESC
                    LIMIT 5
                `).all() as Value[];

            const challenges = userId
                ? db.prepare(`
                    SELECT * FROM challenges
                    WHERE status = 'active' AND user_id = ?
                    ORDER BY mention_count DESC
                    LIMIT 5
                `).all(userId) as Challenge[]
                : db.prepare(`
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

    router.get('/profile/summary', (_req: Request, res: Response) => {
        try {
            const userId = getCurrentUser();
            res.json(getFullProfileSummary(userId || undefined));
        } catch (err) {
            res.status(500).json({ error: String(err) });
        }
    });

    // ==========================================================================
    // API Key Management
    // ==========================================================================

    router.get('/api-key/status', (_req: Request, res: Response) => {
        try {
            res.json(getApiKeyStatus());
        } catch (err) {
            res.status(500).json({ error: String(err) });
        }
    });

    router.post('/api-key', (req: Request, res: Response) => {
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

    router.delete('/api-key', (_req: Request, res: Response) => {
        try {
            const success = clearApiKey();
            res.json({ success });
        } catch (err) {
            res.status(500).json({ error: String(err) });
        }
    });

    router.post('/api-key/validate', (req: Request, res: Response) => {
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

    router.get('/journeys', (_req: Request, res: Response) => {
        try {
            res.json(getAllJourneys());
        } catch (err) {
            res.status(500).json({ error: String(err) });
        }
    });

    router.post('/journeys/:id/start', async (req: Request, res: Response) => {
        try {
            const journeyId = getParam(req.params, 'id');
            const journey = getJourney(journeyId);
            if (!journey) {
                res.status(404).json({ error: 'Journey not found' });
                return;
            }

            const userId = getCurrentUser();
            const conversation = createConversation(journey.title, journeyId, userId || undefined);

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
                journeyId,
                title: journey.title,
            });
        } catch (err) {
            res.status(500).json({ error: String(err) });
        }
    });

    // ==========================================================================
    // LLM Backend
    // ==========================================================================

    router.get('/llm/config', (_req: Request, res: Response) => {
        try {
            res.json(llmManager.getConfig());
        } catch (err) {
            res.status(500).json({ error: String(err) });
        }
    });

    router.put('/llm/config', async (req: Request, res: Response) => {
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

    router.post('/llm/test', async (_req: Request, res: Response) => {
        try {
            const provider = llmManager.getProvider();
            const result = await provider.testConnection();
            res.json(result);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            res.json({ ok: false, error: message });
        }
    });

    router.get('/llm/status', async (_req: Request, res: Response) => {
        try {
            res.json(await llmManager.getStatus());
        } catch (err) {
            res.status(500).json({ error: String(err) });
        }
    });

    router.get('/llm/ollama/models', async (req: Request, res: Response) => {
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

    router.get('/embeddings/ready', (_req: Request, res: Response) => {
        res.json({ ready: isEmbeddingsReady() });
    });

    router.post('/embeddings/embed', async (req: Request, res: Response) => {
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
    // Admin (profile introspection)
    // ==========================================================================

    router.get('/admin/profile', (_req: Request, res: Response) => {
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

    router.get('/admin/evidence/:dimension', (req: Request, res: Response) => {
        try {
            res.json(getEvidenceForDimension(getParam(req.params, 'dimension')));
        } catch (err) {
            res.status(500).json({ error: String(err) });
        }
    });

    router.get('/admin/messages-with-prompts', (req: Request, res: Response) => {
        try {
            const limit = parseInt(req.query.limit as string) || 50;
            const db = getDb();
            const messages = db.prepare(`
                SELECT id, conversation_id, role, content, prompt, created_at
                FROM messages
                WHERE role = 'assistant' AND prompt IS NOT NULL
                ORDER BY created_at DESC
                LIMIT ?
            `).all(limit);
            res.json(messages);
        } catch (err) {
            res.status(500).json({ error: String(err) });
        }
    });

    // ==========================================================================
    // Debug (development/test only)
    // ==========================================================================

    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        router.post('/debug/clear-database', (_req: Request, res: Response) => {
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
