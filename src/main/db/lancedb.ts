import * as lancedb from 'vectordb';
import { app } from 'electron';
import path from 'path';

// Import types using relative path (not alias) for main process compatibility
import type { MessageEmbedding, InsightEmbedding } from '../../shared/types.js';
import { EMBEDDING_DIMENSIONS } from '../embeddings.js';

let connection: lancedb.Connection | null = null;
let messagesTable: lancedb.Table | null = null;
let insightsTable: lancedb.Table | null = null;

export async function initLanceDB(): Promise<void> {
    if (connection) return;

    const dbPath = path.join(app.getPath('userData'), 'lancedb');
    console.log(`Initializing LanceDB at: ${dbPath}`);

    connection = await lancedb.connect(dbPath);

    const tables = await connection.tableNames();

    // Initialize messages table
    if (!tables.includes('messages')) {
        console.log('Creating messages table...');
        messagesTable = await connection.createTable('messages', [
            {
                id: '__schema__',
                vector: new Array(EMBEDDING_DIMENSIONS).fill(0),
                content: '',
                role: 'user' as const,
                created_at: new Date().toISOString(),
            },
        ]);
        // Remove schema placeholder
        await messagesTable.delete('id = "__schema__"');
    } else {
        messagesTable = await connection.openTable('messages');
    }

    // Initialize insights table
    if (!tables.includes('insights')) {
        console.log('Creating insights table...');
        insightsTable = await connection.createTable('insights', [
            {
                id: '__schema__',
                vector: new Array(EMBEDDING_DIMENSIONS).fill(0),
                insight_type: 'value' as const,
                content: '',
                source_id: '',
                created_at: new Date().toISOString(),
            },
        ]);
        await insightsTable.delete('id = "__schema__"');
    } else {
        insightsTable = await connection.openTable('insights');
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

export async function addMessageEmbedding(embedding: MessageEmbedding): Promise<void> {
    const table = getMessagesTable();
    await table.add([embedding]);
}

export async function searchSimilarMessages(
    vector: number[],
    limit: number = 5
): Promise<MessageEmbedding[]> {
    const table = getMessagesTable();
    const results = await table.search(vector).limit(limit).execute();
    return results as unknown as MessageEmbedding[];
}

export async function addInsightEmbedding(embedding: InsightEmbedding): Promise<void> {
    const table = getInsightsTable();
    await table.add([embedding]);
}

export async function searchSimilarInsights(
    vector: number[],
    limit: number = 5
): Promise<InsightEmbedding[]> {
    const table = getInsightsTable();
    const results = await table.search(vector).limit(limit).execute();
    return results as unknown as InsightEmbedding[];
}
