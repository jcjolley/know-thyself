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

    // Embed and store in LanceDB (only if embeddings are ready)
    if (isEmbeddingsReady()) {
        try {
            const vector = await embed(content, 'document');
            await addMessageEmbedding({
                id,
                vector,
                content,
                role,
                created_at: now,
            });
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
