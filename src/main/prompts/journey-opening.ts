/**
 * Prompt template for generating journey opening messages.
 * When a user starts a journey, Claude sends the first message to welcome them.
 */

export function buildJourneyOpeningPrompt(
    journeyTitle: string,
    journeyDescription: string,
    journeySystemPrompt: string,
    profileSummary: string
): string {
    return `You are beginning a guided self-reflection journey called "${journeyTitle}".

${journeyDescription}

${journeySystemPrompt}

---

WHAT YOU KNOW ABOUT THIS PERSON:
${profileSummary || 'This is a new user. You don\'t know much about them yet, which is fine - this journey will help you learn.'}

---

YOUR TASK: Generate a warm, inviting opening message that:
1. Welcomes the user to this exploration in a natural, conversational way
2. Briefly introduces what you'll be exploring together (without being clinical or test-like)
3. Asks a gentle opening question to begin the journey

IMPORTANT GUIDELINES:
- Keep it to 2-3 short paragraphs maximum
- Be warm, curious, and genuinely interested
- Avoid clinical or academic language
- Don't list out what you'll cover - let the conversation unfold naturally
- The opening question should feel like the start of a real conversation, not an interview
- Write as if you're a thoughtful friend beginning a meaningful conversation
- Never use phrases like "I'm here to help" or "feel free to share" - just be natural

Generate ONLY the opening message. Do not include any meta-commentary or explanation.`;
}
