import { v4 as uuidv4 } from 'uuid';
import { getDb } from './sqlite.js';
import { addMessageEmbedding } from './lancedb.js';
import { embed, isEmbeddingsReady } from '../embeddings.js';
import type { Message, Conversation } from '../../shared/types.js';

export async function getOrCreateConversation(): Promise<Conversation> {
    const db = getDb();

    // Get most recent conversation or create new one
    let conversation = db.prepare(`
        SELECT * FROM conversations
        ORDER BY updated_at DESC
        LIMIT 1
    `).get() as Conversation | undefined;

    if (!conversation) {
        const id = uuidv4();
        const now = new Date().toISOString();
        db.prepare(`
            INSERT INTO conversations (id, created_at, updated_at)
            VALUES (?, ?, ?)
        `).run(id, now, now);
        conversation = { id, created_at: now, updated_at: now };
    }

    return conversation;
}

export async function saveMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    prompt?: string
): Promise<Message> {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    // Store in SQLite
    db.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, created_at, prompt)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, conversationId, role, content, now, prompt || null);

    // Update conversation timestamp
    db.prepare(`
        UPDATE conversations SET updated_at = ? WHERE id = ?
    `).run(now, conversationId);

    // Get user_id from the conversation for embedding association
    const conv = db.prepare(`SELECT user_id FROM conversations WHERE id = ?`).get(conversationId) as { user_id: string | null } | undefined;
    const userId = conv?.user_id || undefined;

    // Embed and store in LanceDB (only if embeddings are ready and content is non-empty)
    if (isEmbeddingsReady() && content && content.trim().length > 0) {
        try {
            const vector = await embed(content, 'document');
            await addMessageEmbedding({
                id,
                vector,
                content,
                role,
                created_at: now,
            }, userId);
        } catch (err) {
            console.error('Failed to embed message:', err);
        }
    }

    return { id, conversation_id: conversationId, role, content, created_at: now };
}

export function getRecentMessages(conversationId: string, limit: number = 20): Message[] {
    const db = getDb();
    return db.prepare(`
        SELECT * FROM messages
        WHERE conversation_id = ?
        ORDER BY created_at DESC
        LIMIT ?
    `).all(conversationId, limit).reverse() as Message[];
}

export function getMessageById(id: string): Message | undefined {
    const db = getDb();
    return db.prepare(`SELECT * FROM messages WHERE id = ?`).get(id) as Message | undefined;
}

export interface MessageWithPrompt {
    id: string;
    conversation_id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
    prompt: string | null;
}

export function getMessagesWithPrompts(limit: number = 50): MessageWithPrompt[] {
    const db = getDb();
    return db.prepare(`
        SELECT id, conversation_id, role, content, created_at, prompt
        FROM messages
        WHERE role = 'assistant' AND prompt IS NOT NULL
        ORDER BY created_at DESC
        LIMIT ?
    `).all(limit) as MessageWithPrompt[];
}

/**
 * Delete all messages in a conversation after a specific message.
 * Uses transaction to ensure atomicity for SQLite operations.
 * Returns deleted message IDs for LanceDB cleanup.
 */
export function deleteMessagesAfter(
    conversationId: string,
    afterMessageId: string
): { deletedCount: number; deletedIds: string[] } {
    const db = getDb();

    // First, get the timestamp of the reference message
    const refMessage = db.prepare(`
        SELECT created_at FROM messages WHERE id = ? AND conversation_id = ?
    `).get(afterMessageId, conversationId) as { created_at: string } | undefined;

    if (!refMessage) {
        throw new Error(`Message ${afterMessageId} not found in conversation ${conversationId}`);
    }

    // Get the IDs of messages to be deleted (after the reference message)
    const messagesToDelete = db.prepare(`
        SELECT id FROM messages
        WHERE conversation_id = ? AND created_at > ?
        ORDER BY created_at ASC
    `).all(conversationId, refMessage.created_at) as { id: string }[];

    const deletedIds = messagesToDelete.map(m => m.id);

    if (deletedIds.length === 0) {
        return { deletedCount: 0, deletedIds: [] };
    }

    // Transaction to delete related data atomically
    const deleteTransaction = db.transaction(() => {
        // Create placeholders for IN clause
        const placeholders = deletedIds.map(() => '?').join(',');

        // Delete evidence linked to messages being deleted
        db.prepare(`
            DELETE FROM evidence
            WHERE message_id IN (${placeholders})
        `).run(...deletedIds);

        // Delete extractions linked to messages
        db.prepare(`
            DELETE FROM extractions
            WHERE message_id IN (${placeholders})
        `).run(...deletedIds);

        // Delete the messages
        const result = db.prepare(`
            DELETE FROM messages
            WHERE id IN (${placeholders})
        `).run(...deletedIds);

        // Update conversation timestamp
        const now = new Date().toISOString();
        db.prepare(`
            UPDATE conversations SET updated_at = ? WHERE id = ?
        `).run(now, conversationId);

        return result.changes;
    });

    const deletedCount = deleteTransaction();
    return { deletedCount, deletedIds };
}

/**
 * Get the user message immediately before an assistant message.
 * Returns null if no preceding user message exists.
 */
export function getPrecedingUserMessage(
    conversationId: string,
    assistantMessageId: string
): Message | null {
    const db = getDb();

    // Get the timestamp of the assistant message
    const assistantMessage = db.prepare(`
        SELECT created_at FROM messages WHERE id = ? AND conversation_id = ? AND role = 'assistant'
    `).get(assistantMessageId, conversationId) as { created_at: string } | undefined;

    if (!assistantMessage) {
        return null;
    }

    // Find the most recent user message before this assistant message
    const precedingUserMessage = db.prepare(`
        SELECT id, conversation_id, role, content, created_at
        FROM messages
        WHERE conversation_id = ?
          AND role = 'user'
          AND created_at < ?
        ORDER BY created_at DESC
        LIMIT 1
    `).get(conversationId, assistantMessage.created_at) as Message | undefined;

    return precedingUserMessage || null;
}

/**
 * Delete a single message and its related data.
 * Returns the deleted message ID for LanceDB cleanup.
 */
export function deleteMessage(messageId: string): boolean {
    const db = getDb();

    const deleteTransaction = db.transaction(() => {
        // Delete evidence linked to this message
        db.prepare(`DELETE FROM evidence WHERE message_id = ?`).run(messageId);

        // Delete extractions linked to this message
        db.prepare(`DELETE FROM extractions WHERE message_id = ?`).run(messageId);

        // Delete the message
        const result = db.prepare(`DELETE FROM messages WHERE id = ?`).run(messageId);

        return result.changes > 0;
    });

    return deleteTransaction();
}

/**
 * Get the count of messages after a specific message in a conversation.
 */
export function getMessageCountAfter(conversationId: string, afterMessageId: string): number {
    const db = getDb();

    const refMessage = db.prepare(`
        SELECT created_at FROM messages WHERE id = ? AND conversation_id = ?
    `).get(afterMessageId, conversationId) as { created_at: string } | undefined;

    if (!refMessage) {
        return 0;
    }

    const result = db.prepare(`
        SELECT COUNT(*) as count FROM messages
        WHERE conversation_id = ? AND created_at > ?
    `).get(conversationId, refMessage.created_at) as { count: number };

    return result.count;
}
