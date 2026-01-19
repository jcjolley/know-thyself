import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';
import { EMBEDDING_DIMENSIONS } from './db/lancedb.js';

let embedder: FeatureExtractionPipeline | null = null;
let loadPromise: Promise<void> | null = null;

const MODEL_NAME = 'voyageai/voyage-4-nano';

export async function initEmbeddings(): Promise<void> {
    if (embedder) return;
    if (loadPromise) {
        await loadPromise;
        return;
    }

    loadPromise = (async () => {
        console.log('Loading embedding model...');
        const startTime = Date.now();

        embedder = await pipeline('feature-extraction', MODEL_NAME);

        const elapsed = Date.now() - startTime;
        console.log(`Embedding model loaded in ${elapsed}ms`);
    })();

    await loadPromise;
}

export async function embed(text: string, dimensions: number = EMBEDDING_DIMENSIONS): Promise<number[]> {
    if (!embedder) {
        throw new Error('Embedding model not initialized. Call initEmbeddings() first.');
    }

    if (!text || text.trim().length === 0) {
        throw new Error('Cannot embed empty text');
    }

    const result = await embedder(text, { pooling: 'mean', normalize: true });

    // Extract array and truncate to desired dimensions (Matryoshka)
    const fullVector = Array.from(result.data as Float32Array);
    return fullVector.slice(0, dimensions);
}

export function isEmbeddingsReady(): boolean {
    return embedder !== null;
}
