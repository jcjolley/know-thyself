import Anthropic from '@anthropic-ai/sdk';
import { RESPONSE_SYSTEM_PROMPT, RESPONSE_USER_PROMPT } from './prompts/response.js';
import { isMockEnabled, getMockResponse } from './claude-mock.js';
import type { AssembledContext } from './context.js';

let client: Anthropic | null = null;
let mockMode = false;

// Models (use Haiku for development to save costs)
const DEFAULT_MODEL = 'claude-haiku-4-5';
const RESPONSE_MODEL = 'claude-haiku-4-5'; // Switch to 'claude-sonnet-4-5' for production

export function initClaude(): void {
    // Check if mock mode is enabled
    if (isMockEnabled()) {
        mockMode = true;
        console.log('Claude client initialized in MOCK mode');
        return;
    }

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
    if (mockMode) {
        throw new Error('Cannot get client in mock mode');
    }
    if (!client) {
        throw new Error('Claude client not initialized. Call initClaude() first.');
    }
    return client;
}

export function isClaudeReady(): boolean {
    return mockMode || client !== null;
}

export async function sendMessage(userMessage: string): Promise<string> {
    if (mockMode) {
        return getMockResponse(userMessage);
    }

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
    if (mockMode) {
        const response = getMockResponse(userMessage);
        // Simulate streaming by yielding words
        const words = response.split(' ');
        for (const word of words) {
            yield word + ' ';
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        return;
    }

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

export async function generateResponse(
    message: string,
    context: AssembledContext
): Promise<string> {
    if (mockMode) {
        return getMockResponse(message);
    }

    const anthropic = getClient();

    const systemPrompt = RESPONSE_SYSTEM_PROMPT
        .replace('{profile_summary}', context.profileSummary || 'No profile data yet.')
        .replace('{relevant_messages}', context.relevantMessages || '');

    const userPrompt = RESPONSE_USER_PROMPT
        .replace('{recent_history}', context.recentHistory)
        .replace('{current_message}', message);

    const response = await anthropic.messages.create({
        model: RESPONSE_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find(block => block.type === 'text');
    return textBlock ? textBlock.text : '';
}

export async function* streamResponse(
    message: string,
    context: AssembledContext
): AsyncGenerator<string> {
    if (mockMode) {
        const response = getMockResponse(message);
        // Simulate streaming by yielding words
        const words = response.split(' ');
        for (const word of words) {
            yield word + ' ';
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        return;
    }

    const anthropic = getClient();

    const systemPrompt = RESPONSE_SYSTEM_PROMPT
        .replace('{profile_summary}', context.profileSummary || 'No profile data yet.')
        .replace('{relevant_messages}', context.relevantMessages || '');

    const userPrompt = RESPONSE_USER_PROMPT
        .replace('{recent_history}', context.recentHistory)
        .replace('{current_message}', message);

    const stream = anthropic.messages.stream({
        model: RESPONSE_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
    });

    for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            yield event.delta.text;
        }
    }
}
