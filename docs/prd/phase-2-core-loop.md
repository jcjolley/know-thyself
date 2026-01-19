# Phase 2: Core Loop

## Overview
Implement the core conversation loop with extraction pipeline, context assembly, and profile accumulation. After this phase, conversations will be stored, user signals will be extracted and validated, and responses will be context-aware.

## Problem Statement
Phase 1 established the skeleton - databases initialize, embeddings load, Claude responds. But messages aren't persisted, no extraction happens, and responses have no context. We need the full loop where every message contributes to a growing understanding of the user.

## Goals
- [ ] Messages persist across sessions (SQLite + LanceDB embeddings)
- [ ] Extraction pipeline runs after each user message
- [ ] Extractions are validated and stored in profile tables
- [ ] Responses use assembled context (profile + semantic search)
- [ ] Profile data accumulates over multiple conversations

## Non-Goals
- Not building the "Your Self-Portrait" UI (Phase 3)
- Not implementing guided onboarding flow (Phase 3)
- Not adding voice input or document ingestion (Phase 4)
- Not building conversation summaries yet (optimization for later)
- Not implementing full context planning prompt (simplified version first)

---

## User Stories

### US-101: Message Persistence
**As a** user
**I want** my conversation history to be saved
**So that** I can continue conversations across sessions

**Acceptance Criteria:**
- [ ] User message is stored in SQLite `messages` table before response
- [ ] Assistant response is stored in SQLite `messages` table after generation
- [ ] Both messages are embedded and stored in LanceDB `messages` collection
- [ ] Restarting the app shows previous messages in the conversation
- [ ] Message timestamps are accurate (ISO 8601 format)

### US-102: Extraction Pipeline
**As a** system
**I want** to extract psychological signals from each user message
**So that** I can build an understanding of the user over time

**Acceptance Criteria:**
- [ ] Extraction prompt runs in background after each user message
- [ ] Extraction includes: values, challenges, goals, maslow signals, emotional tone
- [ ] Each extraction includes source quotes from the original message
- [ ] Extractions are validated (schema + quote verification)
- [ ] Valid extractions are stored in `extractions` table with status 'validated'
- [ ] Invalid extractions are stored with status 'rejected' and error details

### US-103: Profile Updates
**As a** system
**I want** validated extractions to update the user profile
**So that** insights accumulate and improve over time

**Acceptance Criteria:**
- [ ] New values are added to `user_values` table with evidence
- [ ] Existing values have confidence increased on re-mention
- [ ] Challenges are added to `challenges` table
- [ ] Maslow signals are added to `maslow_signals` table
- [ ] Evidence table links every profile item to source quote
- [ ] Confidence scores follow the defined formula (evidence + recency)

### US-104: Context-Aware Responses
**As a** user
**I want** the AI to remember what I've shared
**So that** responses feel personalized and informed

**Acceptance Criteria:**
- [ ] Response generation includes current profile summary
- [ ] Semantic search retrieves relevant past messages (top 3)
- [ ] Response references user's values/challenges when appropriate
- [ ] Context window stays within ~10K tokens
- [ ] Response quality noticeably improves after 5+ messages

### US-105: Conversation Management
**As a** user
**I want** conversations to be organized
**So that** I can have distinct conversation threads

**Acceptance Criteria:**
- [ ] Each app session creates or continues a conversation
- [ ] Conversation ID is stored and associated with messages
- [ ] `conversations` table tracks created_at and updated_at
- [ ] Single conversation thread for MVP (no multi-conversation UI)

---

## Phases

### Phase 2.1: Message Persistence Layer
Store messages in SQLite and embed them in LanceDB.

#### 2.1.1 Message Storage Functions
**File:** `src/main/db/messages.ts` (new)

```typescript
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './sqlite.js';
import { addMessageEmbedding } from './lancedb.js';
import { embed } from '../embeddings.js';
import type { Message, Conversation } from '../../shared/types.js';

export async function getOrCreateConversation(): Promise<Conversation> {
    const db = getDb();

    // Get most recent conversation or create new one
    let conversation = db.prepare(`
        SELECT * FROM conversations
        ORDER BY updated_at DESC
        LIMIT 1
    `).get() as Conversation | undefined;

    if (!conversation) {
        const id = uuidv4();
        const now = new Date().toISOString();
        db.prepare(`
            INSERT INTO conversations (id, created_at, updated_at)
            VALUES (?, ?, ?)
        `).run(id, now, now);
        conversation = { id, created_at: now, updated_at: now };
    }

    return conversation;
}

export async function saveMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string
): Promise<Message> {
    const db = getDb();
    const id = uuidv4();
    const now = new Date().toISOString();

    // Store in SQLite
    db.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, created_at)
        VALUES (?, ?, ?, ?, ?)
    `).run(id, conversationId, role, content, now);

    // Update conversation timestamp
    db.prepare(`
        UPDATE conversations SET updated_at = ? WHERE id = ?
    `).run(now, conversationId);

    // Embed and store in LanceDB
    const vector = await embed(content, 'document');
    await addMessageEmbedding({
        id,
        vector,
        content,
        role,
        created_at: now,
    });

    return { id, conversation_id: conversationId, role, content, created_at: now };
}

export function getRecentMessages(conversationId: string, limit: number = 20): Message[] {
    const db = getDb();
    return db.prepare(`
        SELECT * FROM messages
        WHERE conversation_id = ?
        ORDER BY created_at DESC
        LIMIT ?
    `).all(conversationId, limit).reverse() as Message[];
}

export function getMessageById(id: string): Message | undefined {
    const db = getDb();
    return db.prepare(`SELECT * FROM messages WHERE id = ?`).get(id) as Message | undefined;
}
```

#### 2.1.2 Update Chat Handler
**File:** `src/main/ipc.ts` (modify)

Update the chat handlers to persist messages:

```typescript
import { getOrCreateConversation, saveMessage, getRecentMessages } from './db/messages.js';

// In registerIPCHandlers():

ipcMain.handle('chat:send', async (_event, message: string): Promise<string> => {
    const conversation = await getOrCreateConversation();

    // Save user message
    await saveMessage(conversation.id, 'user', message);

    // Generate response (will add context later)
    const response = await sendMessage(message);

    // Save assistant response
    await saveMessage(conversation.id, 'assistant', response);

    return response;
});

// Add handler to get conversation history
ipcMain.handle('messages:history', async (): Promise<Message[]> => {
    const conversation = await getOrCreateConversation();
    return getRecentMessages(conversation.id, 50);
});
```

---

### Phase 2.2: Extraction Pipeline
Run extraction prompt after each user message, validate, and store results.

#### 2.2.1 Extraction Types
**File:** `src/shared/types.ts` (add)

```typescript
// =============================================================================
// Extraction Types
// =============================================================================

export interface ExtractionResult {
    raw_quotes: string[];
    values: ExtractedValue[];
    challenges: ExtractedChallenge[];
    goals: ExtractedGoal[];
    maslow_signals: ExtractedMaslowSignal[];
    emotional_tone: string;
    support_seeking_style?: 'problem_solving' | 'emotional_support' | 'information' | 'unclear';
}

export interface ExtractedValue {
    name: string;
    description: string;
    value_type: 'stated' | 'revealed';
    confidence: number;
    quote: string;
}

export interface ExtractedChallenge {
    description: string;
    severity: 'minor' | 'moderate' | 'major';
    quote: string;
}

export interface ExtractedGoal {
    description: string;
    timeframe?: 'short_term' | 'medium_term' | 'long_term';
    quote: string;
}

export interface ExtractedMaslowSignal {
    level: MaslowLevel;
    signal_type: 'concern' | 'stable';
    description: string;
    quote: string;
}

export interface Extraction {
    id: string;
    message_id: string;
    extraction_json: string;
    status: 'raw' | 'validated' | 'rejected';
    validation_errors: string | null;
    created_at: string;
}
```

#### 2.2.2 Extraction Prompt
**File:** `src/main/prompts/extraction.ts` (new)

```typescript
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
```

#### 2.2.3 Extraction Service
**File:** `src/main/extraction.ts` (new)

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './db/sqlite.js';
import { getMessageById } from './db/messages.js';
import { EXTRACTION_PROMPT } from './prompts/extraction.js';
import type { ExtractionResult, Extraction } from '../shared/types.js';

const EXTRACTION_MODEL = 'claude-haiku-4-5';

export async function runExtraction(messageId: string): Promise<Extraction> {
    const db = getDb();
    const message = getMessageById(messageId);

    if (!message) {
        throw new Error(`Message not found: ${messageId}`);
    }

    const client = new Anthropic();

    const response = await client.messages.create({
        model: EXTRACTION_MODEL,
        max_tokens: 2000,
        messages: [{
            role: 'user',
            content: EXTRACTION_PROMPT.replace('{message}', message.content),
        }],
    });

    const extractionJson = response.content[0].type === 'text'
        ? response.content[0].text
        : '';

    // Validate extraction
    const validation = validateExtraction(extractionJson, message.content);

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
        INSERT INTO extractions (id, message_id, extraction_json, status, validation_errors, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(
        id,
        messageId,
        extractionJson,
        validation.valid ? 'validated' : 'rejected',
        validation.errors.length > 0 ? JSON.stringify(validation.errors) : null,
        now
    );

    // If valid, apply to profile
    if (validation.valid) {
        await applyExtractionToProfile(id, JSON.parse(extractionJson) as ExtractionResult);
    }

    return {
        id,
        message_id: messageId,
        extraction_json: extractionJson,
        status: validation.valid ? 'validated' : 'rejected',
        validation_errors: validation.errors.length > 0 ? JSON.stringify(validation.errors) : null,
        created_at: now,
    };
}

interface ValidationResult {
    valid: boolean;
    errors: string[];
}

function validateExtraction(jsonStr: string, originalMessage: string): ValidationResult {
    const errors: string[] = [];

    // Layer 1: Parse JSON
    let extraction: ExtractionResult;
    try {
        extraction = JSON.parse(jsonStr);
    } catch (e) {
        return { valid: false, errors: ['Invalid JSON format'] };
    }

    // Layer 2: Verify quotes exist in original message
    const normalizedMessage = originalMessage.toLowerCase().replace(/\s+/g, ' ');

    const allQuotes = [
        ...(extraction.raw_quotes || []),
        ...(extraction.values?.map(v => v.quote) || []),
        ...(extraction.challenges?.map(c => c.quote) || []),
        ...(extraction.goals?.map(g => g.quote) || []),
        ...(extraction.maslow_signals?.map(m => m.quote) || []),
    ];

    for (const quote of allQuotes) {
        if (!quote) continue;
        const normalizedQuote = quote.toLowerCase().replace(/\s+/g, ' ').trim();
        if (normalizedQuote.length > 10 && !normalizedMessage.includes(normalizedQuote)) {
            errors.push(`Quote not found: "${quote.slice(0, 50)}..."`);
        }
    }

    return { valid: errors.length === 0, errors };
}

async function applyExtractionToProfile(extractionId: string, extraction: ExtractionResult): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();

    // Apply values
    for (const value of extraction.values || []) {
        const existingValue = db.prepare(`
            SELECT * FROM user_values WHERE name = ?
        `).get(value.name);

        if (existingValue) {
            // Increase confidence and evidence count
            db.prepare(`
                UPDATE user_values
                SET evidence_count = evidence_count + 1,
                    last_reinforced = ?,
                    confidence = MIN(0.95, confidence + 0.1)
                WHERE name = ?
            `).run(now, value.name);
        } else {
            // Insert new value
            const id = uuidv4();
            db.prepare(`
                INSERT INTO user_values (id, name, description, value_type, confidence, evidence_count, first_seen, last_reinforced)
                VALUES (?, ?, ?, ?, ?, 1, ?, ?)
            `).run(id, value.name, value.description, value.value_type, value.confidence, now, now);

            // Add evidence
            db.prepare(`
                INSERT INTO evidence (id, target_type, target_id, message_id, quote, created_at)
                VALUES (?, 'value', ?, (SELECT message_id FROM extractions WHERE id = ?), ?, ?)
            `).run(uuidv4(), id, extractionId, value.quote, now);
        }
    }

    // Apply challenges
    for (const challenge of extraction.challenges || []) {
        const existing = db.prepare(`
            SELECT * FROM challenges WHERE description LIKE ?
        `).get(`%${challenge.description.slice(0, 50)}%`);

        if (existing) {
            db.prepare(`
                UPDATE challenges
                SET mention_count = mention_count + 1, last_mentioned = ?
                WHERE id = ?
            `).run(now, (existing as { id: string }).id);
        } else {
            const id = uuidv4();
            db.prepare(`
                INSERT INTO challenges (id, description, status, first_mentioned, last_mentioned, mention_count)
                VALUES (?, ?, 'active', ?, ?, 1)
            `).run(id, challenge.description, now, now);

            db.prepare(`
                INSERT INTO evidence (id, target_type, target_id, message_id, quote, created_at)
                VALUES (?, 'challenge', ?, (SELECT message_id FROM extractions WHERE id = ?), ?, ?)
            `).run(uuidv4(), id, extractionId, challenge.quote, now);
        }
    }

    // Apply Maslow signals
    for (const signal of extraction.maslow_signals || []) {
        const id = uuidv4();
        db.prepare(`
            INSERT INTO maslow_signals (id, level, signal_type, description, created_at)
            VALUES (?, ?, ?, ?, ?)
        `).run(id, signal.level, signal.signal_type, signal.description, now);

        db.prepare(`
            INSERT INTO evidence (id, target_type, target_id, message_id, quote, created_at)
            VALUES (?, 'maslow', ?, (SELECT message_id FROM extractions WHERE id = ?), ?, ?)
        `).run(uuidv4(), id, extractionId, signal.quote, now);
    }
}
```

---

### Phase 2.3: Context Assembly
Build context for response generation from profile and semantic search.

#### 2.3.1 Context Builder
**File:** `src/main/context.ts` (new)

```typescript
import { getDb } from './db/sqlite.js';
import { searchSimilarMessages } from './db/lancedb.js';
import { embed } from './embeddings.js';
import type { Message, Value, Challenge, MaslowSignal } from '../shared/types.js';

export interface AssembledContext {
    profileSummary: string;
    relevantMessages: string;
    recentHistory: string;
    tokenEstimate: number;
}

export async function assembleContext(
    currentMessage: string,
    recentMessages: Message[]
): Promise<AssembledContext> {
    const db = getDb();

    // Get profile data
    const values = db.prepare(`
        SELECT * FROM user_values ORDER BY confidence DESC LIMIT 5
    `).all() as Value[];

    const challenges = db.prepare(`
        SELECT * FROM challenges WHERE status = 'active' ORDER BY mention_count DESC LIMIT 3
    `).all() as Challenge[];

    const maslowSignals = db.prepare(`
        SELECT * FROM maslow_signals ORDER BY created_at DESC LIMIT 5
    `).all() as MaslowSignal[];

    // Build profile summary
    const profileSummary = buildProfileSummary(values, challenges, maslowSignals);

    // Semantic search for relevant past messages
    const queryVector = await embed(currentMessage, 'query');
    const similarMessages = await searchSimilarMessages(queryVector, 3);
    const relevantMessages = formatRelevantMessages(similarMessages);

    // Format recent history
    const recentHistory = formatRecentHistory(recentMessages.slice(-10));

    // Estimate tokens (rough: 4 chars = 1 token)
    const tokenEstimate = Math.ceil(
        (profileSummary.length + relevantMessages.length + recentHistory.length) / 4
    );

    return {
        profileSummary,
        relevantMessages,
        recentHistory,
        tokenEstimate,
    };
}

function buildProfileSummary(
    values: Value[],
    challenges: Challenge[],
    maslowSignals: MaslowSignal[]
): string {
    const parts: string[] = [];

    if (values.length > 0) {
        parts.push('## What Matters to This Person');
        for (const v of values) {
            const confidence = v.confidence >= 0.7 ? '' : ' (emerging)';
            parts.push(`- ${v.name}: ${v.description}${confidence}`);
        }
    }

    if (challenges.length > 0) {
        parts.push('\n## Current Challenges');
        for (const c of challenges) {
            parts.push(`- ${c.description}`);
        }
    }

    if (maslowSignals.length > 0) {
        const concerns = maslowSignals.filter(s => s.signal_type === 'concern');
        if (concerns.length > 0) {
            parts.push('\n## Areas of Concern');
            for (const s of concerns) {
                parts.push(`- ${s.level}: ${s.description}`);
            }
        }
    }

    return parts.join('\n');
}

function formatRelevantMessages(messages: { content: string; role: string }[]): string {
    if (messages.length === 0) return '';

    const parts = ['## Relevant Past Context'];
    for (const m of messages) {
        const speaker = m.role === 'user' ? 'They said' : 'You said';
        parts.push(`${speaker}: "${m.content.slice(0, 200)}${m.content.length > 200 ? '...' : ''}"`);
    }
    return parts.join('\n');
}

function formatRecentHistory(messages: Message[]): string {
    if (messages.length === 0) return '';

    const parts = ['## Recent Conversation'];
    for (const m of messages) {
        const speaker = m.role === 'user' ? 'User' : 'Assistant';
        parts.push(`${speaker}: ${m.content}`);
    }
    return parts.join('\n');
}
```

#### 2.3.2 Response Generation Prompt
**File:** `src/main/prompts/response.ts` (new)

```typescript
export const RESPONSE_SYSTEM_PROMPT = `
You are a thoughtful AI companion focused on helping the user understand themselves better. You have access to context about who they are and what they're dealing with.

## Your Approach
- Be warm but not effusive
- Reference what you know about them when relevant (but don't force it)
- Ask thoughtful follow-up questions
- Notice patterns and gently surface insights
- Match their emotional register

## What You Know About Them
{profile_summary}

{relevant_messages}

## Guidelines
- If you reference something from their profile, do so naturally ("You mentioned before that...")
- Don't list everything you know - use context subtly
- If profile is empty, focus on getting to know them
- Keep responses conversational, not clinical
`;

export const RESPONSE_USER_PROMPT = `
{recent_history}

User: {current_message}

Respond thoughtfully, using the context you have about this person.
`;
```

#### 2.3.3 Updated Claude Client
**File:** `src/main/claude.ts` (modify)

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { RESPONSE_SYSTEM_PROMPT, RESPONSE_USER_PROMPT } from './prompts/response.js';
import type { AssembledContext } from './context.js';

let client: Anthropic | null = null;

const DEFAULT_MODEL = 'claude-haiku-4-5';
const RESPONSE_MODEL = 'claude-sonnet-4-5-latest';

// ... existing initClaude, getClient, isClaudeReady ...

export async function generateResponse(
    message: string,
    context: AssembledContext
): Promise<string> {
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
```

---

### Phase 2.4: Wire It All Together
Connect extraction, context, and response generation in the IPC handlers.

#### 2.4.1 Updated IPC Handlers
**File:** `src/main/ipc.ts` (full update)

```typescript
import { ipcMain } from 'electron';
import { generateResponse, streamResponse, isClaudeReady } from './claude.js';
import { embed, isEmbeddingsReady } from './embeddings.js';
import { getDb } from './db/sqlite.js';
import { getOrCreateConversation, saveMessage, getRecentMessages } from './db/messages.js';
import { runExtraction } from './extraction.js';
import { assembleContext } from './context.js';
import type { ProfileSummary, MaslowSignal, Value, Challenge, AppStatus, Message } from '../shared/types.js';

let initError: string | null = null;

export function setInitError(error: string): void {
    initError = error;
}

export function registerIPCHandlers(): void {
    // ==========================================================================
    // App Status
    // ==========================================================================

    ipcMain.handle('app:status', async (): Promise<AppStatus> => {
        return {
            embeddingsReady: isEmbeddingsReady(),
            databaseReady: true,
            claudeReady: isClaudeReady(),
            error: initError,
        };
    });

    // ==========================================================================
    // Chat Handlers
    // ==========================================================================

    ipcMain.handle('chat:send', async (_event, message: string): Promise<string> => {
        const conversation = await getOrCreateConversation();

        // Save user message
        const userMessage = await saveMessage(conversation.id, 'user', message);

        // Get recent history for context
        const recentMessages = getRecentMessages(conversation.id, 20);

        // Assemble context
        const context = await assembleContext(message, recentMessages);

        // Generate response with context
        const response = await generateResponse(message, context);

        // Save assistant response
        await saveMessage(conversation.id, 'assistant', response);

        // Run extraction in background (don't await)
        runExtraction(userMessage.id).catch(err => {
            console.error('Extraction failed:', err);
        });

        return response;
    });

    ipcMain.on('chat:stream', async (event, message: string) => {
        try {
            const conversation = await getOrCreateConversation();

            // Save user message
            const userMessage = await saveMessage(conversation.id, 'user', message);

            // Get recent history for context
            const recentMessages = getRecentMessages(conversation.id, 20);

            // Assemble context
            const context = await assembleContext(message, recentMessages);

            // Stream response
            let fullResponse = '';
            for await (const chunk of streamResponse(message, context)) {
                fullResponse += chunk;
                if (!event.sender.isDestroyed()) {
                    event.reply('chat:chunk', chunk);
                }
            }

            // Save complete response
            await saveMessage(conversation.id, 'assistant', fullResponse);

            // Run extraction in background
            runExtraction(userMessage.id).catch(err => {
                console.error('Extraction failed:', err);
            });

            if (!event.sender.isDestroyed()) {
                event.reply('chat:done');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            if (!event.sender.isDestroyed()) {
                event.reply('chat:error', errorMessage);
            }
        }
    });

    // ==========================================================================
    // Message History
    // ==========================================================================

    ipcMain.handle('messages:history', async (): Promise<Message[]> => {
        const conversation = await getOrCreateConversation();
        return getRecentMessages(conversation.id, 50);
    });

    // ==========================================================================
    // Profile Handlers
    // ==========================================================================

    ipcMain.handle('profile:get', async (): Promise<ProfileSummary> => {
        const db = getDb();

        const maslowSignals = db.prepare(`
            SELECT * FROM maslow_signals
            ORDER BY created_at DESC
            LIMIT 10
        `).all() as MaslowSignal[];

        const values = db.prepare(`
            SELECT * FROM user_values
            ORDER BY confidence DESC
            LIMIT 5
        `).all() as Value[];

        const challenges = db.prepare(`
            SELECT * FROM challenges
            WHERE status = 'active'
            ORDER BY mention_count DESC
            LIMIT 5
        `).all() as Challenge[];

        return {
            maslow_status: maslowSignals,
            top_values: values,
            active_challenges: challenges,
        };
    });

    // ==========================================================================
    // Embedding Handlers
    // ==========================================================================

    ipcMain.handle('embeddings:embed', async (_event, text: string): Promise<number[]> => {
        return await embed(text);
    });

    ipcMain.handle('embeddings:ready', async (): Promise<boolean> => {
        return isEmbeddingsReady();
    });
}
```

---

## Technical Specifications

### New Database Tables Used
From existing schema in `src/main/db/sqlite.ts`:
- `conversations` - Conversation sessions
- `messages` - All messages
- `extractions` - Raw extraction results
- `user_values` - Extracted values with confidence
- `challenges` - Identified challenges
- `maslow_signals` - Maslow hierarchy signals
- `evidence` - Links profile items to source quotes

### Token Budget (~10K target)
| Component | Tokens |
|-----------|--------|
| System prompt + profile | ~1,500 |
| Relevant past messages | ~500 |
| Recent history (10 exchanges) | ~3,000 |
| Current message | ~500 |
| Response space | ~1,000 |
| **Total** | ~6,500 |

### Model Usage
| Task | Model | Reason |
|------|-------|--------|
| Extraction | claude-haiku-4-5 | Fast, cheap, sufficient for structured extraction |
| Response | claude-sonnet-4-5-latest | Quality responses, personalization |

---

## Files Summary

### Files to Create
| File | Purpose |
|------|---------|
| `src/main/db/messages.ts` | Message persistence layer |
| `src/main/extraction.ts` | Extraction pipeline service |
| `src/main/context.ts` | Context assembly for responses |
| `src/main/prompts/extraction.ts` | Extraction prompt template |
| `src/main/prompts/response.ts` | Response generation prompts |
| `tests/core-loop.spec.ts` | Phase 2 integration tests |

### Files to Modify
| File | Changes |
|------|---------|
| `src/main/ipc.ts` | Add message persistence, context assembly, extraction trigger |
| `src/main/claude.ts` | Add generateResponse with context |
| `src/shared/types.ts` | Add extraction types |
| `src/renderer/App.tsx` | Load message history on start |
| `src/preload/index.ts` | Expose messages:history handler |

---

## Quality Gates

- `make typecheck` - Type checking passes
- `make lint` - No linting errors
- `make test` - All tests pass (including new Phase 2 tests)
- `make build` - Build succeeds

---

## Verification Checklist

1. [ ] Send a message → response appears → both stored in SQLite
2. [ ] Restart app → previous messages load in conversation
3. [ ] Check `extractions` table → extraction exists with status 'validated'
4. [ ] Check `user_values` table → values extracted from messages appear
5. [ ] Send 5+ messages mentioning a value → confidence increases
6. [ ] Send message referencing past topic → response shows awareness
7. [ ] Semantic search works → relevant past messages influence context
8. [ ] Extraction with fabricated quote → rejected with error logged

---

## Implementation Order

1. Create `src/main/db/messages.ts` - message persistence
2. Create `src/main/prompts/extraction.ts` - extraction prompt
3. Create `src/main/extraction.ts` - extraction service
4. Add extraction types to `src/shared/types.ts`
5. Create `src/main/prompts/response.ts` - response prompts
6. Create `src/main/context.ts` - context assembly
7. Update `src/main/claude.ts` - add generateResponse with context
8. Update `src/main/ipc.ts` - wire everything together
9. Update `src/preload/index.ts` - expose messages:history
10. Update `src/renderer/App.tsx` - load history on mount
11. Write tests `tests/core-loop.spec.ts`
12. Run full verification checklist

---

## Testing Strategy

### Test Structure

```
tests/
├── helpers/
│   ├── electron.ts           # App launcher (exists)
│   ├── fixtures.ts           # Test data, mock responses (new)
│   └── db-utils.ts           # Database inspection helpers (new)
├── unit/
│   ├── extraction-validation.test.ts
│   ├── context-assembly.test.ts
│   └── confidence-scoring.test.ts
├── integration/
│   ├── message-persistence.spec.ts
│   ├── extraction-pipeline.spec.ts
│   ├── profile-updates.spec.ts
│   └── context-responses.spec.ts
└── e2e/
    └── conversation-flow.spec.ts
```

### Testing Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| Extraction is async/background | Expose `debug:waitForExtraction` IPC handler |
| Need DB access for verification | Expose `debug:*` IPC handlers in test mode |
| API costs during tests | Mock Claude for unit tests, real API for integration |
| Test isolation (state bleed) | Use `NODE_ENV=test` with separate DB path |

### Debug IPC Handlers (Test Mode Only)

**File:** `src/main/ipc.ts` (add to registerIPCHandlers)

```typescript
// ==========================================================================
// Debug Handlers (test mode only)
// ==========================================================================

if (process.env.NODE_ENV === 'test') {
    ipcMain.handle('debug:getExtractions', async (_event, messageId?: string): Promise<Extraction[]> => {
        const db = getDb();
        if (messageId) {
            return db.prepare(`SELECT * FROM extractions WHERE message_id = ?`).all(messageId) as Extraction[];
        }
        return db.prepare(`SELECT * FROM extractions ORDER BY created_at DESC LIMIT 10`).all() as Extraction[];
    });

    ipcMain.handle('debug:waitForExtraction', async (_event, messageId: string, timeoutMs: number = 5000): Promise<Extraction | null> => {
        const db = getDb();
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
            const extraction = db.prepare(`SELECT * FROM extractions WHERE message_id = ?`).get(messageId) as Extraction | undefined;
            if (extraction) return extraction;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return null;
    });

    ipcMain.handle('debug:clearDatabase', async (): Promise<void> => {
        const db = getDb();
        db.exec(`
            DELETE FROM evidence;
            DELETE FROM extractions;
            DELETE FROM maslow_signals;
            DELETE FROM challenges;
            DELETE FROM user_values;
            DELETE FROM messages;
            DELETE FROM conversations;
        `);
    });

    ipcMain.handle('debug:getMessages', async (): Promise<Message[]> => {
        const db = getDb();
        return db.prepare(`SELECT * FROM messages ORDER BY created_at`).all() as Message[];
    });
}
```

### Test Helpers

**File:** `tests/helpers/fixtures.ts` (new)

```typescript
export const TEST_MESSAGES = {
    withValue: "Family is the most important thing to me. I'd do anything for them.",
    withChallenge: "I've been really stressed about money lately. Bills are piling up.",
    withGoal: "I want to learn to play guitar by the end of the year.",
    withMaslow: "I haven't been sleeping well and my diet has been terrible.",
    neutral: "The weather is nice today.",
    multiSignal: "I value honesty above all else, but I'm struggling with a difficult conversation I need to have with my boss about a raise.",
};

export const EXPECTED_EXTRACTIONS = {
    withValue: {
        values: [{ name: expect.stringContaining('family'), value_type: 'stated' }],
    },
    withChallenge: {
        challenges: [{ description: expect.stringContaining('money') }],
    },
};
```

**File:** `tests/helpers/db-utils.ts` (new)

```typescript
import { Page } from 'playwright';

export async function clearTestDatabase(page: Page): Promise<void> {
    await page.evaluate(async () => {
        await (window as any).api.debug.clearDatabase();
    });
}

export async function waitForExtraction(page: Page, messageId: string, timeout = 5000): Promise<any> {
    return page.evaluate(async ({ messageId, timeout }) => {
        return await (window as any).api.debug.waitForExtraction(messageId, timeout);
    }, { messageId, timeout });
}

export async function getExtractions(page: Page, messageId?: string): Promise<any[]> {
    return page.evaluate(async (msgId) => {
        return await (window as any).api.debug.getExtractions(msgId);
    }, messageId);
}

export async function getMessages(page: Page): Promise<any[]> {
    return page.evaluate(async () => {
        return await (window as any).api.debug.getMessages();
    });
}
```

### Unit Tests

**File:** `tests/unit/extraction-validation.test.ts`

```typescript
import { describe, test, expect } from 'vitest';

// Import the validation function directly (not through Electron)
// This requires the function to be exported separately for testing
import { validateExtraction } from '../../src/main/extraction.js';

describe('Extraction Validation', () => {
    describe('Quote Verification', () => {
        test('accepts quotes that exist in message', () => {
            const extraction = JSON.stringify({
                values: [{ name: 'family', quote: 'I love my family' }],
            });
            const message = 'I love my family more than anything';

            const result = validateExtraction(extraction, message);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('rejects fabricated quotes', () => {
            const extraction = JSON.stringify({
                values: [{ name: 'hatred', quote: 'I hate everything' }],
            });
            const message = 'I love my family';

            const result = validateExtraction(extraction, message);
            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('Quote not found');
        });

        test('handles whitespace normalization', () => {
            const extraction = JSON.stringify({
                values: [{ name: 'family', quote: 'I   love my  family' }],
            });
            const message = 'I love my family';

            const result = validateExtraction(extraction, message);
            expect(result.valid).toBe(true);
        });

        test('rejects invalid JSON', () => {
            const extraction = 'not valid json {{{';
            const message = 'any message';

            const result = validateExtraction(extraction, message);
            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('Invalid JSON');
        });
    });
});
```

### Integration Tests

**File:** `tests/integration/message-persistence.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { launchApp, closeApp, getPage } from '../helpers/electron';
import { clearTestDatabase, getMessages } from '../helpers/db-utils';

test.describe('US-101: Message Persistence', () => {
    test.beforeAll(async () => {
        await launchApp();
    });

    test.afterAll(async () => {
        await closeApp();
    });

    test.beforeEach(async () => {
        await clearTestDatabase(getPage());
    });

    test('user message is stored in database', async () => {
        const page = getPage();

        await page.evaluate(async () => {
            await (window as any).api.chat.send('Test message for persistence');
        });

        const messages = await getMessages(page);

        expect(messages.length).toBeGreaterThanOrEqual(2); // user + assistant
        expect(messages.find(m => m.role === 'user')?.content).toContain('Test message');
        expect(messages.find(m => m.role === 'assistant')).toBeDefined();
    });

    test('messages have valid timestamps', async () => {
        const page = getPage();

        const before = new Date().toISOString();
        await page.evaluate(async () => {
            await (window as any).api.chat.send('Timestamp test');
        });
        const after = new Date().toISOString();

        const messages = await getMessages(page);
        const userMsg = messages.find(m => m.role === 'user');

        expect(userMsg?.created_at >= before).toBe(true);
        expect(userMsg?.created_at <= after).toBe(true);
    });

    test('messages persist across history calls', async () => {
        const page = getPage();

        await page.evaluate(async () => {
            await (window as any).api.chat.send('First message');
            await (window as any).api.chat.send('Second message');
        });

        const history = await page.evaluate(async () => {
            return await (window as any).api.messages.history();
        });

        expect(history.length).toBeGreaterThanOrEqual(4); // 2 user + 2 assistant
    });
});
```

**File:** `tests/integration/extraction-pipeline.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { launchApp, closeApp, getPage } from '../helpers/electron';
import { clearTestDatabase, waitForExtraction, getExtractions } from '../helpers/db-utils';
import { TEST_MESSAGES } from '../helpers/fixtures';

test.describe('US-102: Extraction Pipeline', () => {
    test.beforeAll(async () => {
        await launchApp();
    });

    test.afterAll(async () => {
        await closeApp();
    });

    test.beforeEach(async () => {
        await clearTestDatabase(getPage());
    });

    test('extraction runs after user message', async () => {
        const page = getPage();

        // Send message and get the response (which includes message save)
        const response = await page.evaluate(async (msg) => {
            return await (window as any).api.chat.send(msg);
        }, TEST_MESSAGES.withValue);

        // Wait for background extraction
        const messages = await page.evaluate(async () => {
            return await (window as any).api.debug.getMessages();
        });
        const userMsg = messages.find(m => m.role === 'user');

        const extraction = await waitForExtraction(page, userMsg.id, 10000);

        expect(extraction).not.toBeNull();
        expect(extraction.status).toBe('validated');
    });

    test('extraction includes source quotes', async () => {
        const page = getPage();

        await page.evaluate(async (msg) => {
            return await (window as any).api.chat.send(msg);
        }, TEST_MESSAGES.withValue);

        // Wait for extraction
        await page.waitForTimeout(3000);

        const extractions = await getExtractions(page);
        expect(extractions.length).toBeGreaterThan(0);

        const parsed = JSON.parse(extractions[0].extraction_json);
        expect(parsed.raw_quotes?.length).toBeGreaterThan(0);
    });

    test('invalid extraction is rejected', async () => {
        // This test would require mocking Claude to return invalid data
        // For now, we test the validation function directly in unit tests
        test.skip();
    });
});
```

**File:** `tests/integration/profile-updates.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { launchApp, closeApp, getPage } from '../helpers/electron';
import { clearTestDatabase, waitForExtraction } from '../helpers/db-utils';
import { TEST_MESSAGES } from '../helpers/fixtures';

test.describe('US-103: Profile Updates', () => {
    test.beforeAll(async () => {
        await launchApp();
    });

    test.afterAll(async () => {
        await closeApp();
    });

    test.beforeEach(async () => {
        await clearTestDatabase(getPage());
    });

    test('values are added to profile after extraction', async () => {
        const page = getPage();

        // Get initial profile
        const initialProfile = await page.evaluate(async () => {
            return await (window as any).api.profile.get();
        });
        const initialValueCount = initialProfile.top_values.length;

        // Send message with clear value statement
        await page.evaluate(async (msg) => {
            return await (window as any).api.chat.send(msg);
        }, TEST_MESSAGES.withValue);

        // Wait for extraction to complete
        await page.waitForTimeout(5000);

        // Check profile updated
        const updatedProfile = await page.evaluate(async () => {
            return await (window as any).api.profile.get();
        });

        expect(updatedProfile.top_values.length).toBeGreaterThan(initialValueCount);
    });

    test('confidence increases on repeated mention', async () => {
        const page = getPage();

        // Send same value twice
        await page.evaluate(async () => {
            await (window as any).api.chat.send('Family means everything to me');
        });
        await page.waitForTimeout(3000);

        const profile1 = await page.evaluate(async () => {
            return await (window as any).api.profile.get();
        });
        const initialConfidence = profile1.top_values[0]?.confidence || 0;

        await page.evaluate(async () => {
            await (window as any).api.chat.send('I would do anything for my family');
        });
        await page.waitForTimeout(3000);

        const profile2 = await page.evaluate(async () => {
            return await (window as any).api.profile.get();
        });

        // Find the family-related value
        const familyValue = profile2.top_values.find(v =>
            v.name.toLowerCase().includes('family')
        );

        expect(familyValue?.confidence).toBeGreaterThan(initialConfidence);
    });
});
```

### E2E Conversation Flow Test

**File:** `tests/e2e/conversation-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { launchApp, closeApp, getPage } from '../helpers/electron';
import { clearTestDatabase } from '../helpers/db-utils';

test.describe('Full Conversation Flow', () => {
    test.beforeAll(async () => {
        await launchApp();
    });

    test.afterAll(async () => {
        await closeApp();
    });

    test.beforeEach(async () => {
        await clearTestDatabase(getPage());
    });

    test('multi-turn conversation with profile accumulation', async () => {
        const page = getPage();

        // Turn 1: Share a value
        await page.evaluate(async () => {
            await (window as any).api.chat.send(
                'I really value being creative. Art and music are my escape.'
            );
        });

        // Turn 2: Share a challenge
        await page.evaluate(async () => {
            await (window as any).api.chat.send(
                "But lately I haven't had time for any of it. Work is consuming everything."
            );
        });

        // Turn 3: Reference the tension
        await page.evaluate(async () => {
            await (window as any).api.chat.send(
                'How do I find balance?'
            );
        });

        // Wait for all extractions
        await page.waitForTimeout(8000);

        // Verify profile accumulated correctly
        const profile = await page.evaluate(async () => {
            return await (window as any).api.profile.get();
        });

        expect(profile.top_values.length).toBeGreaterThan(0);
        expect(profile.active_challenges.length).toBeGreaterThan(0);

        // Verify conversation history
        const history = await page.evaluate(async () => {
            return await (window as any).api.messages.history();
        });

        expect(history.length).toBe(6); // 3 user + 3 assistant
    });
});
```

### Running Tests

```bash
# Run all tests
make test

# Run unit tests only (fast, no Electron)
npx vitest run tests/unit/

# Run integration tests only
npx playwright test tests/integration/

# Run with UI for debugging
make test-ui

# Run specific test file
npx playwright test tests/integration/extraction-pipeline.spec.ts
```

### Test Database Isolation

**File:** `src/main/db/sqlite.ts` (modify initSQLite)

```typescript
export async function initSQLite(): Promise<void> {
    if (db) return;

    // Use separate database for tests
    const dbName = process.env.NODE_ENV === 'test'
        ? 'know-thyself-test.db'
        : 'know-thyself.db';

    const dbPath = path.join(app.getPath('userData'), dbName);
    // ... rest of initialization
}
```

---

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Extraction produces invalid JSON | Medium | Robust parsing with fallback to 'rejected' status |
| Quote verification too strict | Medium | Use fuzzy matching, normalize whitespace |
| Context window exceeds budget | High | Token counting, truncate older history |
| Extraction prompt misses signals | Medium | Iterate on prompt, add examples |
| LanceDB embedding search slow | Low | Limit results, index optimization |

---

## Open Questions
- [x] Should extraction run synchronously or in background? → **Background (don't block response)**
- [ ] How to handle extraction failures gracefully in UI?
- [ ] Should we show extraction results to user (debug mode)?
