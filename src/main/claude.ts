import Anthropic from '@anthropic-ai/sdk';
import { RESPONSE_SYSTEM_PROMPT, RESPONSE_USER_PROMPT, buildStyleGuidance, buildJourneySystemPrompt } from './prompts/response.js';
import { buildJourneyOpeningPrompt } from './prompts/journey-opening.js';
import { isMockEnabled, getMockResponse } from './claude-mock.js';
import { getApiKey } from './api-key-storage.js';
import { llmManager, THINKING_MARKER } from './llm/index.js';

// Re-export for use by callers
export { THINKING_MARKER };
import type { AssembledContext } from './context.js';
import type { JourneyInfo } from '../shared/types.js';

let client: Anthropic | null = null;
let mockMode = false;

// Models (use Haiku for development to save costs)
const DEFAULT_MODEL = 'claude-haiku-4-5';
const RESPONSE_MODEL = 'claude-haiku-4-5'; // Switch to 'claude-sonnet-4-5' for production

// Check if we should use the new LLM manager (provider-agnostic)
function shouldUseLLMManager(): boolean {
    try {
        llmManager.getProvider();
        return true;
    } catch {
        return false;
    }
}

export function initClaude(): void {
    // Check if mock mode is enabled
    if (isMockEnabled()) {
        mockMode = true;
        console.log('Claude client initialized in MOCK mode');
        return;
    }

    // Priority: env var > stored key
    const apiKey = getApiKey();
    if (!apiKey) {
        // Don't throw - let UI handle missing key
        console.log('No API key configured - waiting for user input');
        client = null;
        return;
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

async function* simulateMockStream(response: string): AsyncGenerator<string> {
    const words = response.split(' ');
    for (const word of words) {
        yield word + ' ';
        await new Promise(resolve => setTimeout(resolve, 10));
    }
}

export async function* streamMessage(userMessage: string): AsyncGenerator<string> {
    if (mockMode) {
        yield* simulateMockStream(getMockResponse(userMessage));
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

export interface ResponsePrompts {
    system: string;
    user: string;
}

export function buildResponsePrompts(message: string, context: AssembledContext): ResponsePrompts {
    let system: string;

    // Use journey-specific prompt if this is a journey conversation
    if (context.journey && context.journey.systemPrompt) {
        console.log(`[claude] Using journey prompt for: ${context.journey.id}`);
        system = buildJourneySystemPrompt(
            context.journey.systemPrompt,
            context.profileSummary || '',
            context.relevantMessages || ''
        );
    } else {
        // Standard conversation prompt
        const styleGuidance = buildStyleGuidance(
            context.supportStyle,
            context.currentIntent,
            context.guidedMode
        );

        system = RESPONSE_SYSTEM_PROMPT
            .replace('{profile_summary}', context.profileSummary || 'No profile data yet.')
            .replace('{relevant_messages}', context.relevantMessages || '')
            .replace('{style_guidance}', styleGuidance);
    }

    const user = RESPONSE_USER_PROMPT
        .replace('{recent_history}', context.recentHistory)
        .replace('{current_message}', message);

    return { system, user };
}

export async function generateResponse(
    message: string,
    context: AssembledContext
): Promise<string> {
    if (mockMode) {
        return getMockResponse(message);
    }

    const prompts = buildResponsePrompts(message, context);

    // Use LLM manager if available (supports Ollama and Claude)
    if (shouldUseLLMManager()) {
        const provider = llmManager.getProvider();
        return await provider.generateText(
            [{ role: 'user', content: prompts.user }],
            prompts.system,
            { maxTokens: 4096 }
        );
    }

    // Fallback to direct Anthropic SDK (legacy)
    const anthropic = getClient();

    const response = await anthropic.messages.create({
        model: RESPONSE_MODEL,
        max_tokens: 1024,
        system: prompts.system,
        messages: [{ role: 'user', content: prompts.user }],
    });

    const textBlock = response.content.find(block => block.type === 'text');
    return textBlock ? textBlock.text : '';
}

export async function* streamResponse(
    message: string,
    context: AssembledContext
): AsyncGenerator<string> {
    if (mockMode) {
        yield* simulateMockStream(getMockResponse(message));
        return;
    }

    const prompts = buildResponsePrompts(message, context);

    // Use LLM manager if available (supports Ollama and Claude)
    if (shouldUseLLMManager()) {
        const provider = llmManager.getProvider();
        // Use higher token limit for thinking models (thinking uses tokens too)
        yield* provider.streamText(
            [{ role: 'user', content: prompts.user }],
            prompts.system,
            { maxTokens: 4096 }
        );
        return;
    }

    // Fallback to direct Anthropic SDK (legacy)
    const anthropic = getClient();

    const stream = anthropic.messages.stream({
        model: RESPONSE_MODEL,
        max_tokens: 1024,
        system: prompts.system,
        messages: [{ role: 'user', content: prompts.user }],
    });

    for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            yield event.delta.text;
        }
    }
}

/**
 * Generate an opening message for a journey conversation.
 * Claude sends the first message to welcome the user and begin the journey.
 */
export async function generateJourneyOpening(
    journey: JourneyInfo,
    profileSummary: string
): Promise<string> {
    if (mockMode) {
        return `Welcome to "${journey.title}". I'm looking forward to exploring this with you. What brings you here today?`;
    }

    const prompt = buildJourneyOpeningPrompt(
        journey.title,
        journey.description,
        journey.systemPrompt,
        profileSummary
    );

    // Use LLM manager if available (supports Ollama and Claude)
    if (shouldUseLLMManager()) {
        const provider = llmManager.getProvider();
        return await provider.generateText(
            [{ role: 'user', content: prompt }],
            undefined,
            { maxTokens: 500 }
        );
    }

    // Fallback to direct Anthropic SDK (legacy)
    const anthropic = getClient();

    const response = await anthropic.messages.create({
        model: RESPONSE_MODEL,
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find(block => block.type === 'text');
    return textBlock ? textBlock.text : '';
}
