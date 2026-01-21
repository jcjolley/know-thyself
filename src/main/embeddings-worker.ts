// This runs as a separate child process to avoid blocking the main Electron process
import * as ort from 'onnxruntime-node';
import { Tokenizer } from 'tokenizers';

interface EmbedRequest {
    type: 'init' | 'embed';
    id?: number;
    modelPath?: string;
    tokenizerPath?: string;
    text?: string;
    inputType?: 'query' | 'document';
}

let session: ort.InferenceSession | null = null;
let tokenizer: Tokenizer | null = null;

async function initialize(modelPath: string, tokenizerPath: string): Promise<void> {
    console.log('[EmbeddingsProcess] Loading model...');
    const startTime = Date.now();

    tokenizer = await Tokenizer.fromFile(tokenizerPath);
    session = await ort.InferenceSession.create(modelPath);

    const elapsed = Date.now() - startTime;
    console.log(`[EmbeddingsProcess] Model loaded in ${elapsed}ms`);
}

async function embed(text: string, inputType: 'query' | 'document'): Promise<number[]> {
    if (!session || !tokenizer) {
        throw new Error('Model not initialized');
    }

    const inputText = inputType === 'query'
        ? `Represent the query for retrieving supporting documents: ${text}`
        : text;

    const encoding = await tokenizer.encode(inputText);
    const inputIds = encoding.getIds();
    const attentionMask = encoding.getAttentionMask();

    const inputIdsTensor = new ort.Tensor('int64', BigInt64Array.from(inputIds.map(BigInt)), [1, inputIds.length]);
    const attentionMaskTensor = new ort.Tensor('int64', BigInt64Array.from(attentionMask.map(BigInt)), [1, attentionMask.length]);

    const results = await session.run({
        input_ids: inputIdsTensor,
        attention_mask: attentionMaskTensor,
    });

    const embeddings = results.embeddings.data as Float32Array;
    return Array.from(embeddings);
}

process.on('message', async (request: EmbedRequest) => {
    try {
        if (request.type === 'init') {
            await initialize(request.modelPath!, request.tokenizerPath!);
            process.send?.({ type: 'ready' });
        } else if (request.type === 'embed') {
            const result = await embed(request.text!, request.inputType || 'document');
            process.send?.({ type: 'result', id: request.id, result });
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        process.send?.({ type: 'error', id: request.id, error: message });
    }
});

// Signal that the process is ready to receive messages
process.send?.({ type: 'started' });
