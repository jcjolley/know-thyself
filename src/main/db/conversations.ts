import { v4 as uuidv4 } from 'uuid';
import { getDb } from './sqlite.js';
import type { Message, Conversation } from '../../shared/types.js';

export interface ConversationListItem {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    message_count: number;
    preview: string | null;
}

export interface ConversationWithMessages extends Conversation {
    title: string;
    messages: Message[];
}

export interface ConversationSearchResult {
    id: string;
    title: string;
    updated_at: string;
    match_context: string;
}

/**
 * List all conversations with metadata (title, message count, preview).
 * Sorted by most recently updated first.
 */
export function listConversations(): ConversationListItem[] {
    const db = getDb();

    return db.prepare(`
        SELECT
            c.id,
            COALESCE(c.title, 'New Conversation') as title,
            c.created_at,
            c.updated_at,
            COUNT(m.id) as message_count,
            (
                SELECT SUBSTR(content, 1, 60)
                FROM messages
                WHERE conversation_id = c.id
                ORDER BY created_at DESC
                LIMIT 1
            ) as preview
        FROM conversations c
        LEFT JOIN messages m ON m.conversation_id = c.id
        GROUP BY c.id
        ORDER BY c.updated_at DESC
    `).all() as ConversationListItem[];
}

/**
 * Create a new empty conversation.
 */
export function createConversation(title: string = 'New Conversation'): Conversation & { title: string } {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
        INSERT INTO conversations (id, title, created_at, updated_at)
        VALUES (?, ?, ?, ?)
    `).run(id, title, now, now);

    return { id, title, created_at: now, updated_at: now };
}

/**
 * Get a conversation by ID with all its messages.
 */
export function getConversationById(id: string): ConversationWithMessages | null {
    const db = getDb();

    const conversation = db.prepare(`
        SELECT id, COALESCE(title, 'New Conversation') as title, created_at, updated_at
        FROM conversations
        WHERE id = ?
    `).get(id) as (Conversation & { title: string }) | undefined;

    if (!conversation) {
        return null;
    }

    const messages = db.prepare(`
        SELECT id, conversation_id, role, content, created_at
        FROM messages
        WHERE conversation_id = ?
        ORDER BY created_at ASC
    `).all(id) as Message[];

    return { ...conversation, messages };
}

/**
 * Update the title of a conversation.
 */
export function updateConversationTitle(id: string, title: string): boolean {
    const db = getDb();
    const now = new Date().toISOString();

    const result = db.prepare(`
        UPDATE conversations
        SET title = ?, updated_at = ?
        WHERE id = ?
    `).run(title, now, id);

    return result.changes > 0;
}

/**
 * Delete a conversation and all its messages.
 */
export function deleteConversation(id: string): boolean {
    const db = getDb();

    // Start a transaction to ensure atomicity
    const deleteTransaction = db.transaction(() => {
        // Delete evidence linked to messages in this conversation
        db.prepare(`
            DELETE FROM evidence
            WHERE message_id IN (SELECT id FROM messages WHERE conversation_id = ?)
        `).run(id);

        // Delete extractions linked to messages
        db.prepare(`
            DELETE FROM extractions
            WHERE message_id IN (SELECT id FROM messages WHERE conversation_id = ?)
        `).run(id);

        // Delete conversation summaries
        db.prepare(`
            DELETE FROM conversation_summaries
            WHERE conversation_id = ?
        `).run(id);

        // Delete messages
        db.prepare(`
            DELETE FROM messages
            WHERE conversation_id = ?
        `).run(id);

        // Delete conversation
        const result = db.prepare(`
            DELETE FROM conversations
            WHERE id = ?
        `).run(id);

        return result.changes > 0;
    });

    return deleteTransaction();
}

/**
 * Search conversations by title and message content.
 */
export function searchConversations(query: string): ConversationSearchResult[] {
    const db = getDb();
    const pattern = `%${query}%`;

    return db.prepare(`
        SELECT DISTINCT
            c.id,
            COALESCE(c.title, 'New Conversation') as title,
            c.updated_at,
            COALESCE(
                (
                    SELECT SUBSTR(content, 1, 80)
                    FROM messages
                    WHERE conversation_id = c.id AND content LIKE ?
                    ORDER BY created_at DESC
                    LIMIT 1
                ),
                COALESCE(c.title, 'New Conversation')
            ) as match_context
        FROM conversations c
        LEFT JOIN messages m ON m.conversation_id = c.id
        WHERE COALESCE(c.title, '') LIKE ? OR m.content LIKE ?
        ORDER BY c.updated_at DESC
        LIMIT 50
    `).all(pattern, pattern, pattern) as ConversationSearchResult[];
}

/**
 * Get the message count for a conversation.
 */
export function getMessageCount(conversationId: string): number {
    const db = getDb();
    const result = db.prepare(`
        SELECT COUNT(*) as count
        FROM messages
        WHERE conversation_id = ?
    `).get(conversationId) as { count: number };

    return result.count;
}

/**
 * Auto-generate a title from the first user message.
 * Truncates at word boundary around 50 characters.
 */
export function generateTitleFromMessage(message: string): string {
    const trimmed = message.trim();

    if (trimmed.length < 10) {
        const date = new Date();
        return `Conversation - ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }

    // Truncate at word boundary around 50 chars
    let title = trimmed.substring(0, 60);
    const lastSpace = title.lastIndexOf(' ');

    if (lastSpace > 40) {
        title = title.substring(0, lastSpace);
    }

    // Remove trailing punctuation except period
    title = title.replace(/[,;:!?]+$/, '');

    // Add ellipsis if truncated
    if (trimmed.length > title.length) {
        title = title.trim() + '...';
    }

    return title.length > 50 ? title.substring(0, 50) + '...' : title;
}

/**
 * Get the most recent conversation (for backwards compatibility).
 */
export function getMostRecentConversation(): (Conversation & { title: string }) | null {
    const db = getDb();

    const conversation = db.prepare(`
        SELECT id, COALESCE(title, 'New Conversation') as title, created_at, updated_at
        FROM conversations
        ORDER BY updated_at DESC
        LIMIT 1
    `).get() as (Conversation & { title: string }) | undefined;

    return conversation || null;
}
