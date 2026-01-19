export const EXTRACTION_PROMPT = `
You are analyzing a user message to extract psychological signals for a personal AI system.

## User Message
{message}

## Conversation Context (if available)
{context}

## Your Task
Extract any signals present in this message. Not every message will contain all signal types - only extract what's clearly present.

For EVERY extraction, you MUST include a direct quote from the message that supports it.

## Output Format (JSON)
{
    "raw_quotes": ["exact quotes containing key insights"],

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
            "status": "stated|in_progress|achieved|abandoned",
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

    "life_situation": {
        "work": {
            "status": "employed|unemployed|student|retired|self_employed|unknown",
            "description": "job/role description if mentioned",
            "quote": "supporting quote"
        },
        "relationship": {
            "status": "single|dating|partnered|married|divorced|widowed|unknown",
            "quote": "supporting quote"
        },
        "family": {
            "has_children": true|false,
            "children_details": "any details about children",
            "parent_relationship": "any details about parents",
            "quote": "supporting quote"
        },
        "living": {
            "situation": "alone|with_partner|with_roommates|with_family",
            "location": "city/region if mentioned",
            "quote": "supporting quote"
        },
        "health": {
            "physical_concerns": ["any health issues mentioned"],
            "mental_health_context": "any mental health context",
            "quote": "supporting quote"
        },
        "age_stage": "young_adult|adult|midlife|senior|unknown"
    },

    "immediate_intent": {
        "type": "specific_question|general_exploration|emotional_processing|accountability|self_discovery|crisis_support|just_curious|unknown",
        "description": "what they seem to want from this conversation",
        "confidence": 0.0-1.0,
        "quote": "supporting quote if available"
    },

    "moral_signals": [
        {
            "foundation": "care|fairness|loyalty|authority|sanctity|liberty",
            "valence": "positive|negative",
            "strength": "weak|moderate|strong",
            "quote": "exact supporting quote"
        }
    ],

    "emotional_tone": "overall emotional quality of the message",

    "support_seeking_style": "emotional_support|instrumental_support|informational_support|validation_support|independence|unclear",

    "big_five_signals": [
        {
            "trait": "openness|conscientiousness|extraversion|agreeableness|neuroticism",
            "level": "low|moderate|high",
            "confidence": 0.0-1.0,
            "quote": "supporting quote"
        }
    ],

    "risk_tolerance": {
        "tolerance": "seeking|neutral|averse",
        "confidence": 0.0-1.0,
        "quote": "supporting quote"
    },

    "motivation_style": {
        "style": "approach|avoidance|mixed",
        "confidence": 0.0-1.0,
        "quote": "supporting quote"
    },

    "attachment_signals": {
        "style": "secure|anxious|avoidant|disorganized",
        "confidence": 0.0-1.0,
        "quote": "supporting quote"
    },

    "locus_of_control": {
        "locus": "internal|external|mixed",
        "confidence": 0.0-1.0,
        "quote": "supporting quote"
    },

    "temporal_orientation": {
        "orientation": "past_negative|past_positive|present_hedonistic|present_fatalistic|future",
        "confidence": 0.0-1.0,
        "quote": "supporting quote"
    },

    "growth_mindset": {
        "mindset": "fixed|growth|mixed",
        "confidence": 0.0-1.0,
        "quote": "supporting quote"
    },

    "tier4_signals": {
        "change_readiness": {
            "stage": "precontemplation|contemplation|preparation|action|maintenance",
            "confidence": 0.0-1.0,
            "quote": "supporting quote"
        },
        "stress_response": {
            "response": "fight|flight|freeze|fawn",
            "confidence": 0.0-1.0,
            "quote": "supporting quote"
        },
        "emotional_regulation": {
            "style": "suppression|expression|reappraisal|rumination",
            "confidence": 0.0-1.0,
            "quote": "supporting quote"
        },
        "self_efficacy": {
            "level": "low|moderate|high",
            "confidence": 0.0-1.0,
            "quote": "supporting quote"
        }
    }
}

## Extraction Guidelines

### Life Situation
- Only extract what is explicitly stated or very strongly implied
- "My wife" → relationship: married/partnered
- "I work at..." → work: employed with description
- "My kids" → family: has_children: true
- Don't infer age from unrelated context

### Immediate Intent
- What do they want from THIS conversation right now?
- "Should I..." → specific_question
- "I just need to vent" → emotional_processing
- "I've been thinking about..." → general_exploration
- "Help me stay on track" → accountability
- "Why do I always..." → self_discovery

### Moral Foundations
- Care: concern for harm/suffering ("that's cruel", "I couldn't hurt...")
- Fairness: justice, equality, rights ("that's not fair", "they deserve...")
- Loyalty: group bonds, betrayal ("you don't abandon...", "they're family")
- Authority: hierarchy, tradition ("respect your elders", "that's how it's done")
- Sanctity: purity, disgust ("that's disgusting", "sacred", "pure")
- Liberty: autonomy, oppression ("don't tell me what to do", "freedom")

### Support-Seeking Style
- emotional_support: "I just need to be heard", wants validation
- instrumental_support: "What should I do?", wants solutions
- informational_support: "What do you think about...", wants analysis
- validation_support: "Am I crazy for thinking...", wants agreement
- independence: "Let me think out loud", wants space to process

### Big Five (OCEAN) - Tier 3
Infer from communication patterns, not direct questions:
- **Openness**: Curiosity, abstract thinking, tries new things (high) vs practical, prefers familiar (low)
- **Conscientiousness**: Organized, detailed, plans ahead (high) vs spontaneous, flexible (low)
- **Extraversion**: Energized by people, shares readily (high) vs prefers solitude, reserved (low)
- **Agreeableness**: Avoids conflict, cooperative (high) vs direct, comfortable with conflict (low)
- **Neuroticism**: Worry, anxiety, stress sensitivity (high) vs calm under pressure (low)

### Risk Tolerance - Tier 3
- seeking: "What's the worst that could happen?", excitement about uncertainty
- neutral: Weighs pros/cons analytically, calculated decisions
- averse: "But what if...", worst-case focus, needs guarantees

### Motivation Style - Tier 3
- approach: Goals framed positively ("I want to achieve X")
- avoidance: Goals framed as escaping negatives ("I need to stop X", "I don't want to...")

### Attachment Style - Tier 4
- secure: Balanced relationship talk, comfortable with vulnerability
- anxious: Relationship worry, needs reassurance, fears rejection
- avoidant: Values independence, uncomfortable with emotional demands
- disorganized: Contradictory patterns, intense then distant

### Locus of Control - Tier 4
- internal: "I made it happen", takes responsibility, agency language
- external: "It just happened", blames circumstances, feels helpless

### Temporal Orientation - Tier 4
- past_negative: Regrets, old hurts, "if only I had..."
- past_positive: Fond memories, tradition importance
- present_hedonistic: Spontaneous, pleasure-focused, "YOLO"
- present_fatalistic: "It is what it is", passive acceptance
- future: Goal-focused, planning, delayed gratification

### Growth Mindset - Tier 4
- growth: "I can learn this", embraces challenge, curious about improvement
- fixed: "I'm just not good at...", avoids difficulty, defensive about feedback

### Change Readiness (Prochaska) - Tier 4
- precontemplation: Doesn't see a problem, defensive
- contemplation: "Maybe I should...", ambivalent
- preparation: "I'm going to...", making plans
- action: "I've started...", doing the work
- maintenance: "I've been...", sustaining change

### Stress Response - Tier 4
- fight: Confronts, takes control, may become aggressive
- flight: Avoids, distracts, escapes
- freeze: Paralysis, can't decide, shuts down
- fawn: People-pleasing, over-accommodating

### Emotional Regulation - Tier 4
- suppression: Pushes feelings down
- expression: Lets emotions out
- reappraisal: Reframes the meaning
- rumination: Cycles on same thoughts

### Self-Efficacy - Tier 4
- high: "I can figure this out", confident in abilities
- low: "I don't think I can do this", doubts capabilities

### Sparse Extraction (Critical)
Most messages will only contain signals for 0-3 axes. This is expected and correct.

**Examples:**
- "What time is it?" → No psychological signals (return empty/null for all)
- "I'm stressed about my job interview tomorrow" → Maslow (safety concern), Challenge, possibly Goal
- "My wife thinks I should take the job" → Life situation (married), possibly Values conflict

**Rules:**
- Return \`null\` or omit fields entirely when no signal is present
- Return empty arrays \`[]\` for array fields with no signals
- NEVER invent signals to fill out the response
- A message with zero extractions is a valid, correct extraction

### General Rules
- Only extract what's explicitly present or strongly implied
- Confidence: 0.3 = tentative, 0.7 = clear, 0.9 = explicit
- NEVER fabricate quotes - use exact text from the message
- Omit fields or return null/empty when no signal is present
- life_situation fields are cumulative across conversations

Output valid JSON only, no markdown formatting.
`;

export function buildExtractionPrompt(message: string, context?: string): string {
    return EXTRACTION_PROMPT
        .replace('{message}', message)
        .replace('{context}', context || 'No prior context available.');
}
