import { RESPONSE_SYSTEM_PROMPT, RESPONSE_USER_PROMPT, buildStyleGuidance, buildJourneySystemPrompt } from './prompts/response.js';
import { buildJourneyOpeningPrompt } from './prompts/journey-opening.js';
import { isMockEnabled, getMockResponse } from './claude-mock.js';
import { llmManager, THINKING_MARKER } from './llm/index.js';

// Re-export for use by callers
export { THINKING_MARKER };
import type { AssembledContext } from './context.js';
import type { JourneyInfo } from '../shared/types.js';

let mockMode = false;

export function initClaude(): void {
    // Check if mock mode is enabled
    if (isMockEnabled()) {
        mockMode = true;
        console.log('LLM initialized in MOCK mode');
        return;
    }
    console.log('LLM ready (using llmManager)');
}

export function isClaudeReady(): boolean {
    return mockMode || llmManager.isConfigured();
}

async function* simulateMockStream(response: string): AsyncGenerator<string> {
    const words = response.split(' ');
    for (const word of words) {
        yield word + ' ';
        await new Promise(resolve => setTimeout(resolve, 10));
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
        console.log(`[llm] Using journey prompt for: ${context.journey.id}`);
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
    const provider = llmManager.getProvider();
    return await provider.generateText(
        [{ role: 'user', content: prompts.user }],
        prompts.system,
        { maxTokens: 4096 }
    );
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
    const provider = llmManager.getProvider();
    // Use higher token limit for thinking models (thinking uses tokens too)
    yield* provider.streamText(
        [{ role: 'user', content: prompts.user }],
        prompts.system,
        { maxTokens: 4096 }
    );
}

/**
 * Generate an opening message for a journey conversation.
 * The LLM sends the first message to welcome the user and begin the journey.
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

    const provider = llmManager.getProvider();
    const result = await provider.generateText(
        [{ role: 'user', content: prompt }],
        undefined,
        { maxTokens: 500 }
    );

    // Ensure we don't return empty content
    if (!result || result.trim().length === 0) {
        console.warn('[llm] Journey opening returned empty, using fallback');
        return `Welcome to "${journey.title}". I'm looking forward to exploring this topic with you. What draws you to this area of reflection?`;
    }

    return result;
}
