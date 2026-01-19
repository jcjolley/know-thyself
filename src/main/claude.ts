import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

// Use -latest alias for automatic updates
const DEFAULT_MODEL = 'claude-sonnet-4-5-latest';

export function initClaude(): void {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error(
            'ANTHROPIC_API_KEY environment variable is required.\n' +
            'Create a .env file with: ANTHROPIC_API_KEY=sk-ant-...\n' +
            'Get your API key from: https://console.anthropic.com/'
        );
    }
    client = new Anthropic({ apiKey });
    console.log('Claude client initialized');
}

export function getClient(): Anthropic {
    if (!client) {
        throw new Error('Claude client not initialized. Call initClaude() first.');
    }
    return client;
}

export function isClaudeReady(): boolean {
    return client !== null;
}

export async function sendMessage(userMessage: string): Promise<string> {
    const anthropic = getClient();

    const response = await anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 1024,
        messages: [{ role: 'user', content: userMessage }],
    });

    const textBlock = response.content.find(block => block.type === 'text');
    return textBlock ? textBlock.text : '';
}

export async function* streamMessage(userMessage: string): AsyncGenerator<string> {
    const anthropic = getClient();

    const stream = anthropic.messages.stream({
        model: DEFAULT_MODEL,
        max_tokens: 1024,
        messages: [{ role: 'user', content: userMessage }],
    });

    for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            yield event.delta.text;
        }
    }
}
