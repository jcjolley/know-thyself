import * as ort from 'onnxruntime-node';
import { Tokenizer } from 'tokenizers';
import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';

const MODEL_REPO = 'thomasht86/voyage-4-nano-ONNX';
const TOKENIZER_REPO = 'voyageai/voyage-4-nano';
const MODEL_FILE = 'model_fp32.onnx';
const TOKENIZER_FILE = 'tokenizer.json';

// voyage-4-nano outputs 2048 dimensions
export const EMBEDDING_DIMENSIONS = 2048;

let session: ort.InferenceSession | null = null;
let tokenizer: Tokenizer | null = null;
let loadPromise: Promise<void> | null = null;

async function downloadFile(url: string, destPath: string): Promise<void> {
    console.log(`Downloading ${url}...`);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download ${url}: ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(destPath, buffer);
}

async function ensureModelFiles(): Promise<{ modelPath: string; tokenizerPath: string }> {
    const modelDir = path.join(app.getPath('userData'), 'models', 'voyage-4-nano');
    await fs.mkdir(modelDir, { recursive: true });

    const modelPath = path.join(modelDir, MODEL_FILE);
    const tokenizerPath = path.join(modelDir, TOKENIZER_FILE);

    const modelBaseUrl = `https://huggingface.co/${MODEL_REPO}/resolve/main`;
    const tokenizerBaseUrl = `https://huggingface.co/${TOKENIZER_REPO}/resolve/main`;

    // Download model if not exists
    try {
        await fs.access(modelPath);
        console.log('Model file already exists');
    } catch {
        await downloadFile(`${modelBaseUrl}/${MODEL_FILE}`, modelPath);
    }

    // Download tokenizer from official voyage-4-nano repo
    try {
        await fs.access(tokenizerPath);
        console.log('Tokenizer file already exists');
    } catch {
        await downloadFile(`${tokenizerBaseUrl}/${TOKENIZER_FILE}`, tokenizerPath);
    }

    return { modelPath, tokenizerPath };
}

export async function initEmbeddings(): Promise<void> {
    if (session) return;
    if (loadPromise) {
        await loadPromise;
        return;
    }

    loadPromise = (async () => {
        console.log('Loading voyage-4-nano embedding model...');
        const startTime = Date.now();

        const { modelPath, tokenizerPath } = await ensureModelFiles();

        // Load tokenizer using HuggingFace tokenizers library
        tokenizer = await Tokenizer.fromFile(tokenizerPath);

        // Load ONNX model
        session = await ort.InferenceSession.create(modelPath);

        const elapsed = Date.now() - startTime;
        console.log(`Embedding model loaded in ${elapsed}ms`);
    })();

    await loadPromise;
}

export async function embed(
    text: string,
    inputType: 'query' | 'document' = 'document'
): Promise<number[]> {
    if (!session || !tokenizer) {
        throw new Error('Embedding model not initialized. Call initEmbeddings() first.');
    }

    if (!text || text.trim().length === 0) {
        throw new Error('Cannot embed empty text');
    }

    // Add query prompt if needed
    const inputText = inputType === 'query'
        ? `Represent the query for retrieving supporting documents: ${text}`
        : text;

    // Tokenize using HuggingFace tokenizers
    const encoding = await tokenizer.encode(inputText);
    const inputIds = encoding.getIds();
    const attentionMask = encoding.getAttentionMask();

    // Create tensors
    const inputIdsTensor = new ort.Tensor('int64', BigInt64Array.from(inputIds.map(BigInt)), [1, inputIds.length]);
    const attentionMaskTensor = new ort.Tensor('int64', BigInt64Array.from(attentionMask.map(BigInt)), [1, attentionMask.length]);

    // Run inference
    const results = await session.run({
        input_ids: inputIdsTensor,
        attention_mask: attentionMaskTensor,
    });

    // Extract embeddings
    const embeddings = results.embeddings.data as Float32Array;
    return Array.from(embeddings);
}

export function isEmbeddingsReady(): boolean {
    return session !== null;
}
