import * as lancedb from '@lancedb/lancedb';
import { paths } from '../paths.js';

// Import types using relative path (not alias) for main process compatibility
import type { MessageEmbedding, InsightEmbedding } from '../../shared/types.js';
import { EMBEDDING_DIMENSIONS } from '../embeddings.js';

let connection: lancedb.Connection | null = null;
let messagesTable: lancedb.Table | null = null;
let insightsTable: lancedb.Table | null = null;

// Extended embedding types with user_id
interface MessageEmbeddingWithUser extends MessageEmbedding {
    user_id: string | null;
}

interface InsightEmbeddingWithUser extends InsightEmbedding {
    user_id: string | null;
}

export async function initLanceDB(): Promise<void> {
    if (connection) return;

    const dbPath = paths.lancedb;
    console.log(`Initializing LanceDB at: ${dbPath}`);

    connection = await lancedb.connect(dbPath);

    const tables = await connection.tableNames();

    // Initialize messages table
    if (!tables.includes('messages')) {
        console.log('Creating messages table with user_id...');
        messagesTable = await connection.createTable('messages', [
            {
                id: '__schema__',
                vector: new Array(EMBEDDING_DIMENSIONS).fill(0),
                content: '',
                role: 'user' as const,
                created_at: new Date().toISOString(),
                user_id: '__placeholder__',  // Use placeholder for schema inference (will be deleted immediately)
            },
        ]);
        // Remove schema placeholder
        await messagesTable.delete('id = "__schema__"');
    } else {
        messagesTable = await connection.openTable('messages');
        // Check if existing table needs migration (dimensions or user_id)
        try {
            const schema = await messagesTable.schema();
            const vectorField = schema.fields.find((f: { name: string }) => f.name === 'vector');
            const hasUserId = schema.fields.some((f: { name: string }) => f.name === 'user_id');
            const existingDims = vectorField?.type?.listSize;

            const needsRecreate = (existingDims && existingDims !== EMBEDDING_DIMENSIONS) || !hasUserId;

            if (needsRecreate) {
                console.log(`Messages table needs migration (dimensions: ${existingDims || 'ok'}, user_id: ${hasUserId ? 'yes' : 'no'}), recreating...`);

                // Export existing data before dropping
                const existingData = await messagesTable.search([]).limit(100000).toArray();

                await connection.dropTable('messages');
                messagesTable = await connection.createTable('messages', [
                    {
                        id: '__schema__',
                        vector: new Array(EMBEDDING_DIMENSIONS).fill(0),
                        content: '',
                        role: 'user' as const,
                        created_at: new Date().toISOString(),
                        user_id: '__placeholder__',  // Use placeholder for schema inference
                    },
                ]);
                await messagesTable.delete('id = "__schema__"');

                // Re-insert existing data with user_id = null (will be claimed later)
                if (existingData.length > 0) {
                    const dataWithUserId = existingData.map(row => ({
                        ...row,
                        user_id: (row as Record<string, unknown>).user_id || null,
                    }));
                    await messagesTable.add(dataWithUserId as unknown as Record<string, unknown>[]);
                    console.log(`Migrated ${existingData.length} message embeddings`);
                }
            }
        } catch (err) {
            console.warn('Could not verify messages table schema:', err);
        }
    }

    // Initialize insights table
    if (!tables.includes('insights')) {
        console.log('Creating insights table with user_id...');
        insightsTable = await connection.createTable('insights', [
            {
                id: '__schema__',
                vector: new Array(EMBEDDING_DIMENSIONS).fill(0),
                insight_type: 'value' as const,
                content: '',
                source_id: '',
                created_at: new Date().toISOString(),
                user_id: '__placeholder__',  // Use placeholder for schema inference
            },
        ]);
        await insightsTable.delete('id = "__schema__"');
    } else {
        insightsTable = await connection.openTable('insights');
        // Check if existing table needs migration
        try {
            const schema = await insightsTable.schema();
            const vectorField = schema.fields.find((f: { name: string }) => f.name === 'vector');
            const hasUserId = schema.fields.some((f: { name: string }) => f.name === 'user_id');
            const existingDims = vectorField?.type?.listSize;

            const needsRecreate = (existingDims && existingDims !== EMBEDDING_DIMENSIONS) || !hasUserId;

            if (needsRecreate) {
                console.log(`Insights table needs migration (dimensions: ${existingDims || 'ok'}, user_id: ${hasUserId ? 'yes' : 'no'}), recreating...`);

                // Export existing data before dropping
                const existingData = await insightsTable.search([]).limit(100000).toArray();

                await connection.dropTable('insights');
                insightsTable = await connection.createTable('insights', [
                    {
                        id: '__schema__',
                        vector: new Array(EMBEDDING_DIMENSIONS).fill(0),
                        insight_type: 'value' as const,
                        content: '',
                        source_id: '',
                        created_at: new Date().toISOString(),
                        user_id: '__placeholder__',  // Use placeholder for schema inference
                    },
                ]);
                await insightsTable.delete('id = "__schema__"');

                // Re-insert existing data with user_id = null
                if (existingData.length > 0) {
                    const dataWithUserId = existingData.map(row => ({
                        ...row,
                        user_id: (row as Record<string, unknown>).user_id || null,
                    }));
                    await insightsTable.add(dataWithUserId as unknown as Record<string, unknown>[]);
                    console.log(`Migrated ${existingData.length} insight embeddings`);
                }
            }
        } catch (err) {
            console.warn('Could not verify insights table schema:', err);
        }
    }

    console.log('LanceDB initialized');
}

export function getMessagesTable(): lancedb.Table {
    if (!messagesTable) throw new Error('LanceDB not initialized. Call initLanceDB() first.');
    return messagesTable;
}

export function getInsightsTable(): lancedb.Table {
    if (!insightsTable) throw new Error('LanceDB not initialized. Call initLanceDB() first.');
    return insightsTable;
}

/**
 * Add a message embedding to the vector store.
 * @param embedding - The message embedding
 * @param userId - Optional user ID to associate with the embedding
 */
export async function addMessageEmbedding(embedding: MessageEmbedding, userId?: string): Promise<void> {
    const table = getMessagesTable();
    const embeddingWithUser: MessageEmbeddingWithUser = {
        ...embedding,
        user_id: userId || null,
    };
    await table.add([embeddingWithUser as unknown as Record<string, unknown>]);
}

/**
 * Search for similar messages in the vector store.
 * @param vector - The query vector
 * @param limit - Maximum number of results
 * @param userId - If provided, only search embeddings for this user
 */
export async function searchSimilarMessages(
    vector: number[],
    limit: number = 5,
    userId?: string
): Promise<MessageEmbedding[]> {
    const table = getMessagesTable();
    // Check if table has any rows before searching
    const count = await table.countRows();
    if (count === 0) {
        return [];
    }

    if (userId) {
        // Filter by user_id
        const results = await table
            .vectorSearch(vector)
            .where(`user_id = '${userId}'`)
            .limit(limit)
            .toArray();
        return results as unknown as MessageEmbedding[];
    }

    const results = await table.vectorSearch(vector).limit(limit).toArray();
    return results as unknown as MessageEmbedding[];
}

/**
 * Add an insight embedding to the vector store.
 * @param embedding - The insight embedding
 * @param userId - Optional user ID to associate with the embedding
 */
export async function addInsightEmbedding(embedding: InsightEmbedding, userId?: string): Promise<void> {
    const table = getInsightsTable();
    const embeddingWithUser: InsightEmbeddingWithUser = {
        ...embedding,
        user_id: userId || null,
    };
    await table.add([embeddingWithUser as unknown as Record<string, unknown>]);
}

/**
 * Search for similar insights in the vector store.
 * @param vector - The query vector
 * @param limit - Maximum number of results
 * @param userId - If provided, only search embeddings for this user
 */
export async function searchSimilarInsights(
    vector: number[],
    limit: number = 5,
    userId?: string
): Promise<InsightEmbedding[]> {
    const table = getInsightsTable();
    // Check if table has any rows before searching
    const count = await table.countRows();
    if (count === 0) {
        return [];
    }

    if (userId) {
        // Filter by user_id
        const results = await table
            .vectorSearch(vector)
            .where(`user_id = '${userId}'`)
            .limit(limit)
            .toArray();
        return results as unknown as InsightEmbedding[];
    }

    const results = await table.vectorSearch(vector).limit(limit).toArray();
    return results as unknown as InsightEmbedding[];
}

/**
 * Delete embeddings for specific message IDs.
 * Best-effort: logs errors but doesn't throw.
 */
export async function deleteMessageEmbeddings(messageIds: string[]): Promise<void> {
    if (messageIds.length === 0) return;

    try {
        const table = getMessagesTable();

        // Delete each message embedding by ID
        // LanceDB uses SQL-like filter syntax
        for (const id of messageIds) {
            try {
                await table.delete(`id = '${id}'`);
            } catch (err) {
                console.error(`Failed to delete embedding for message ${id}:`, err);
            }
        }
    } catch (err) {
        console.error('Failed to delete message embeddings:', err);
    }
}

/**
 * Assign embeddings to a user (for migration/claiming legacy data).
 * LanceDB doesn't support UPDATE, so we delete and re-insert each row.
 */
export async function assignEmbeddingsToUser(messageIds: string[], userId: string): Promise<void> {
    if (messageIds.length === 0) return;

    const table = getMessagesTable();
    let updated = 0;

    for (const id of messageIds) {
        try {
            // LanceDB doesn't have UPDATE, so delete + re-insert
            const rows = await table.search([]).where(`id = '${id}'`).limit(1).toArray();
            if (rows.length > 0) {
                await table.delete(`id = '${id}'`);
                await table.add([{ ...rows[0], user_id: userId }]);
                updated++;
            }
        } catch (err) {
            console.error(`Failed to assign embedding ${id} to user:`, err);
        }
    }

    console.log(`[lancedb] Assigned ${updated}/${messageIds.length} embeddings to user ${userId}`);
}

/**
 * Delete all embeddings for a specific user.
 * Used when deleting a user profile.
 */
export async function deleteUserEmbeddings(userId: string): Promise<void> {
    try {
        const messagesTable = getMessagesTable();
        await messagesTable.delete(`user_id = '${userId}'`);
    } catch (err) {
        console.error(`Failed to delete message embeddings for user ${userId}:`, err);
    }

    try {
        const insightsTable = getInsightsTable();
        await insightsTable.delete(`user_id = '${userId}'`);
    } catch (err) {
        console.error(`Failed to delete insight embeddings for user ${userId}:`, err);
    }

    console.log(`[lancedb] Deleted embeddings for user ${userId}`);
}
