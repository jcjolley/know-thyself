import { fork, ChildProcess } from 'child_process';
import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MODEL_REPO = 'thomasht86/voyage-4-nano-ONNX';
const TOKENIZER_REPO = 'voyageai/voyage-4-nano';
const MODEL_FILE = 'model_fp32.onnx';
const TOKENIZER_FILE = 'tokenizer.json';

// voyage-4-nano outputs 2048 dimensions
export const EMBEDDING_DIMENSIONS = 2048;

let childProcess: ChildProcess | null = null;
let isReady = false;
let requestId = 0;
const pendingRequests = new Map<number, { resolve: (value: number[]) => void; reject: (error: Error) => void }>();

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
    if (childProcess) return;

    console.log('Loading voyage-4-nano embedding model in child process...');

    const { modelPath, tokenizerPath } = await ensureModelFiles();

    return new Promise((resolve, reject) => {
        const workerPath = path.join(__dirname, 'embeddings-worker.js');

        // Use fork to create a separate Node.js process
        childProcess = fork(workerPath, [], {
            stdio: ['pipe', 'pipe', 'pipe', 'ipc']
        });

        // Forward stdout/stderr from child process
        childProcess.stdout?.on('data', (data) => {
            console.log(data.toString().trim());
        });
        childProcess.stderr?.on('data', (data) => {
            console.error(data.toString().trim());
        });

        childProcess.on('message', (msg: { type: string; id?: number; result?: number[]; error?: string }) => {
            if (msg.type === 'started') {
                // Child process is ready to receive init message
                childProcess?.send({ type: 'init', modelPath, tokenizerPath });
            } else if (msg.type === 'ready') {
                console.log('Embedding process ready');
                isReady = true;
                resolve();
            } else if (msg.type === 'result') {
                const pending = pendingRequests.get(msg.id!);
                if (pending) {
                    pending.resolve(msg.result!);
                    pendingRequests.delete(msg.id!);
                }
            } else if (msg.type === 'error') {
                if (msg.id !== undefined) {
                    const pending = pendingRequests.get(msg.id);
                    if (pending) {
                        pending.reject(new Error(msg.error));
                        pendingRequests.delete(msg.id);
                    }
                } else {
                    reject(new Error(msg.error));
                }
            }
        });

        childProcess.on('error', (error) => {
            console.error('Embedding process error:', error);
            reject(error);
        });

        childProcess.on('exit', (code) => {
            if (code !== 0) {
                console.error(`Embedding process exited with code ${code}`);
            }
            childProcess = null;
            isReady = false;
        });
    });
}

export async function embed(
    text: string,
    inputType: 'query' | 'document' = 'document'
): Promise<number[]> {
    if (!childProcess || !isReady) {
        throw new Error('Embedding model not initialized. Call initEmbeddings() first.');
    }

    if (!text || text.trim().length === 0) {
        throw new Error('Cannot embed empty text');
    }

    const id = requestId++;

    return new Promise((resolve, reject) => {
        pendingRequests.set(id, { resolve, reject });
        childProcess!.send({ type: 'embed', id, text, inputType });
    });
}

export function isEmbeddingsReady(): boolean {
    return isReady;
}
