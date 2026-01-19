// Mock Claude responses for testing
// These are used when MOCK_CLAUDE=true is set

export const MOCK_RESPONSES: Record<string, string> = {
    default: "I understand. Could you tell me more about what's on your mind?",
    hello: "Hello! How are you doing today? I'm here to help you explore your thoughts and feelings.",
    greeting: "It's nice to meet you! What would you like to talk about today?",
};

export const MOCK_EXTRACTION = {
    raw_quotes: ["mock quote from message"],
    values: [],
    challenges: [],
    goals: [],
    maslow_signals: [],
    emotional_tone: "neutral",
    support_seeking_style: "unclear" as const,
};

export function getMockResponse(message: string): string {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
        return MOCK_RESPONSES.hello;
    }
    if (lowerMessage.includes('nice to meet') || lowerMessage.includes('how are you')) {
        return MOCK_RESPONSES.greeting;
    }
    return MOCK_RESPONSES.default;
}

export function getMockExtraction(message: string): string {
    // Return a minimal valid extraction
    const extraction = {
        ...MOCK_EXTRACTION,
        raw_quotes: [message.slice(0, 50)],
    };
    return JSON.stringify(extraction);
}

export function isMockEnabled(): boolean {
    return process.env.MOCK_CLAUDE === 'true';
}
