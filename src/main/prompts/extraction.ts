export const EXTRACTION_PROMPT = `
You are analyzing a user message to extract psychological signals for a personal AI system.

## User Message
{message}

## Your Task
Extract any signals present in this message. Not every message will contain all signal types - only extract what's clearly present.

For EVERY extraction, you MUST include a direct quote from the message that supports it.

## Output Format (JSON)
{
    "raw_quotes": ["exact quotes from the message that contain key insights"],
    "values": [
        {
            "name": "short_identifier",
            "description": "what this value means to them",
            "value_type": "stated|revealed",
            "confidence": 0.0-1.0,
            "quote": "exact supporting quote"
        }
    ],
    "challenges": [
        {
            "description": "what they're struggling with",
            "severity": "minor|moderate|major",
            "quote": "exact supporting quote"
        }
    ],
    "goals": [
        {
            "description": "what they want to achieve",
            "timeframe": "short_term|medium_term|long_term",
            "quote": "exact supporting quote"
        }
    ],
    "maslow_signals": [
        {
            "level": "physiological|safety|belonging|esteem|self_actualization",
            "signal_type": "concern|stable",
            "description": "brief description",
            "quote": "exact supporting quote"
        }
    ],
    "emotional_tone": "overall emotional quality of the message",
    "support_seeking_style": "problem_solving|emotional_support|information|unclear"
}

## Guidelines
- Only extract what's explicitly present or strongly implied
- Confidence reflects how certain you are (0.3 = tentative, 0.7 = clear, 0.9 = explicit)
- "stated" values are what they say matters; "revealed" are shown through behavior/choices
- If the message is simple/transactional, return mostly empty arrays
- NEVER fabricate quotes - use exact text from the message

Output valid JSON only, no markdown formatting.
`;
