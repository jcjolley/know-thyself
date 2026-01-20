# Phase 3.3: Conversation Summaries

## Overview
Implement rolling conversation summaries to manage context window size. When conversations exceed ~20 messages, older history is summarized by Haiku while keeping the last 10 exchanges verbatim, ensuring Claude has full context without hitting token limits.

## Problem Statement
Currently, context assembly in `src/main/context.ts` uses `formatRecentHistory()` which includes only the last 10 messages verbatim. For longer conversations:
- Earlier context is lost entirely
- Users may reference topics discussed 30+ messages ago
- Claude cannot recall important earlier parts of the conversation
- The `conversation_summaries` table exists in schema but is completely unused

The system needs rolling summaries that compress older conversation history into digestible context.

## Goals
- [ ] Detect when summary generation is needed (20+ messages since last summary)
- [ ] Generate summaries using Claude Haiku for cost efficiency
- [ ] Store summaries in the existing `conversation_summaries` table
- [ ] Integrate summaries into context assembly so Claude has full conversation awareness
- [ ] Ensure summary generation runs asynchronously without blocking user experience

## Non-Goals
- Not implementing conversation branching or multiple summary versions
- Not building UI to view/edit summaries (that's Phase 3 profile visibility)
- Not changing the verbatim window size (stays at 10 exchanges)
- Not implementing summary for cross-conversation context (only within single conversation)
- Not implementing real-time streaming of summary generation progress

---

## User Stories

### US-301: Summary Generation Trigger
**As a** system
**I want** to detect when a conversation needs summarization
**So that** summaries are generated at the right time without over-processing

**Acceptance Criteria:**
- [ ] Given 19 messages in a conversation with no summary, when user sends 20th message, then summary generation is triggered
- [ ] Given 25 messages with existing summary covering 20, when user sends message, then no new summary triggered (only 5 since last)
- [ ] Given 45 messages with summary covering 20, when user sends message, then new summary triggered (25 since last >= 20)
- [ ] Given summary generation is triggered, when it completes, then `messages_covered` reflects total messages summarized
- [ ] Given conversation has < 20 messages, when context is assembled, then no summary exists and recent history is used alone

### US-302: Summary Generation with Haiku
**As a** system
**I want** to generate summaries using Claude Haiku
**So that** summaries are cost-effective while maintaining quality

**Acceptance Criteria:**
- [ ] Given summary generation is triggered, when Haiku is called, then model is `claude-haiku-4-5-latest`
- [ ] Given messages to summarize exist, when prompt is sent, then it includes all messages beyond verbatim window
- [ ] Given previous summary exists, when new summary is generated, then previous summary is included in prompt for continuity
- [ ] Given summary is generated, when stored, then `summary_text` is plain text under 500 words
- [ ] Given Haiku API fails, when error occurs, then system logs error and continues without summary (graceful degradation)

### US-303: Summary Storage
**As a** system
**I want** to persist summaries to the database
**So that** summaries can be reused across sessions

**Acceptance Criteria:**
- [ ] Given summary is generated, when stored, then row is inserted into `conversation_summaries` table
- [ ] Given summary is stored, when queried, then `conversation_id`, `summary_text`, `messages_covered`, `start_message_id`, `end_message_id` are populated
- [ ] Given conversation has multiple summaries, when latest is queried, then most recent by `created_at` is returned
- [ ] Given conversation is deleted (future feature), when summaries are queried, then foreign key cascade handles cleanup

### US-304: Summary Integration in Context Assembly
**As a** system
**I want** summaries included in the context sent to Claude
**So that** responses can reference earlier conversation topics

**Acceptance Criteria:**
- [ ] Given conversation has summary, when context is assembled, then summary appears before recent history
- [ ] Given summary exists, when formatted, then it has clear heading "## Earlier in this conversation"
- [ ] Given no summary exists, when context is assembled, then only recent history is included (current behavior)
- [ ] Given summary + recent history, when token estimate is calculated, then summary tokens are included
- [ ] Given user references topic from summarized portion, when Claude responds, then response acknowledges the earlier topic

### US-305: Async Summary Generation
**As a** system
**I want** summary generation to run asynchronously
**So that** user experience is not blocked by summary generation

**Acceptance Criteria:**
- [ ] Given summary trigger condition met, when user message is processed, then response returns before summary completes
- [ ] Given summary generation starts, when it runs, then extraction and response generation continue independently
- [ ] Given summary generation fails, when error occurs, then it does not affect current message processing
- [ ] Given multiple messages sent rapidly, when each triggers summary check, then only one summary generation runs at a time per conversation

---

## Phases

### Phase 3.3.1: Summary Types and Database Functions

#### 3.3.1.1 Add Summary Types
**File:** `src/shared/types.ts`

Add the following types:

```typescript
// =============================================================================
// Conversation Summary Types
// =============================================================================

export interface ConversationSummary {
    id: string;
    conversation_id: string;
    summary_text: string;
    messages_covered: number;
    start_message_id: string | null;
    end_message_id: string | null;
    created_at: string;
}
```

#### 3.3.1.2 Create Summary Database Functions
**File:** `src/main/db/summary.ts` (new)

```typescript
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './sqlite.js';
import type { ConversationSummary, Message } from '../../shared/types.js';

// Configuration constants
export const MESSAGES_PER_SUMMARY = 20;  // Generate summary every 20 messages
export const VERBATIM_WINDOW = 10;       // Keep last 10 exchanges (20 messages) verbatim

/**
 * Check if a new summary should be generated for this conversation.
 */
export function shouldGenerateSummary(conversationId: string): boolean {
    const db = getDb();

    // Count total messages in conversation
    const messageCount = db.prepare(`
        SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?
    `).get(conversationId) as { count: number };

    // Get the most recent summary
    const lastSummary = getLatestSummary(conversationId);

    // Calculate messages since last summary
    const messagesSinceSummary = lastSummary
        ? messageCount.count - lastSummary.messages_covered
        : messageCount.count;

    // Only generate if we have enough messages beyond the verbatim window
    // We need at least MESSAGES_PER_SUMMARY messages that AREN'T in the verbatim window
    const messagesOutsideVerbatimWindow = messageCount.count - (VERBATIM_WINDOW * 2);

    if (messagesOutsideVerbatimWindow <= 0) {
        return false; // All messages fit in verbatim window
    }

    return messagesSinceSummary >= MESSAGES_PER_SUMMARY;
}

/**
 * Get the most recent summary for a conversation.
 */
export function getLatestSummary(conversationId: string): ConversationSummary | null {
    const db = getDb();
    const row = db.prepare(`
        SELECT * FROM conversation_summaries
        WHERE conversation_id = ?
        ORDER BY created_at DESC
        LIMIT 1
    `).get(conversationId) as ConversationSummary | undefined;

    return row || null;
}

/**
 * Get messages that need to be summarized (excluding verbatim window).
 */
export function getMessagesForSummary(conversationId: string): Message[] {
    const db = getDb();

    // Get total message count
    const countResult = db.prepare(`
        SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?
    `).get(conversationId) as { count: number };

    // Calculate how many messages to skip (the verbatim window from the end)
    const verbatimCount = VERBATIM_WINDOW * 2; // 10 exchanges = 20 messages
    const messagesToFetch = Math.max(0, countResult.count - verbatimCount);

    if (messagesToFetch === 0) {
        return [];
    }

    // Get the latest summary to know where to start
    const lastSummary = getLatestSummary(conversationId);

    let query: string;
    let params: unknown[];

    if (lastSummary && lastSummary.end_message_id) {
        // Get messages after the last summary's end, excluding verbatim window
        query = `
            SELECT * FROM messages
            WHERE conversation_id = ?
            AND created_at > (SELECT created_at FROM messages WHERE id = ?)
            ORDER BY created_at ASC
            LIMIT ?
        `;
        const newMessageCount = countResult.count - lastSummary.messages_covered;
        const messagesToSummarize = Math.max(0, newMessageCount - verbatimCount);
        params = [conversationId, lastSummary.end_message_id, messagesToSummarize];
    } else {
        // No previous summary - get all except verbatim window
        query = `
            SELECT * FROM messages
            WHERE conversation_id = ?
            ORDER BY created_at ASC
            LIMIT ?
        `;
        params = [conversationId, messagesToFetch];
    }

    return db.prepare(query).all(...params) as Message[];
}

/**
 * Store a generated summary.
 */
export function saveSummary(
    conversationId: string,
    summaryText: string,
    messagesCovered: number,
    startMessageId: string | null,
    endMessageId: string | null
): ConversationSummary {
    const db = getDb();
    const now = new Date().toISOString();
    const id = uuidv4();

    db.prepare(`
        INSERT INTO conversation_summaries
        (id, conversation_id, summary_text, messages_covered, start_message_id, end_message_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, conversationId, summaryText, messagesCovered, startMessageId, endMessageId, now);

    return {
        id,
        conversation_id: conversationId,
        summary_text: summaryText,
        messages_covered: messagesCovered,
        start_message_id: startMessageId,
        end_message_id: endMessageId,
        created_at: now,
    };
}

/**
 * Get message count for a conversation.
 */
export function getMessageCount(conversationId: string): number {
    const db = getDb();
    const result = db.prepare(`
        SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?
    `).get(conversationId) as { count: number };
    return result.count;
}
```

---

### Phase 3.3.2: Summary Generation Service

#### 3.3.2.1 Create Summary Prompt
**File:** `src/main/prompts/summary.ts` (new)

```typescript
export const CONVERSATION_SUMMARY_PROMPT = `
You are summarizing a conversation segment for future context. Your summary will help an AI assistant recall what was discussed earlier.

## Messages to Summarize
{messages}

## Previous Summary (if any)
{previous_summary}

## Instructions
Create a concise summary that captures:
1. Key topics discussed
2. Important decisions or conclusions reached
3. Emotional tone and any significant moments
4. Any commitments, goals, or follow-ups mentioned
5. Important facts the user shared about themselves

## Guidelines
- Keep it under 300 words
- Focus on what would be useful context for future conversations
- Write in third person (e.g., "User discussed..." not "You discussed...")
- Preserve specific details that might be referenced later (names, dates, places)
- Note any unresolved questions or topics that might come up again
- If previous summary exists, integrate new information seamlessly

Output as plain text, not JSON. Write in natural paragraphs.
`;

export function buildSummaryPrompt(
    messages: { role: string; content: string }[],
    previousSummary: string | null
): string {
    const formattedMessages = messages
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');

    return CONVERSATION_SUMMARY_PROMPT
        .replace('{messages}', formattedMessages)
        .replace('{previous_summary}', previousSummary || 'None (start of conversation)');
}
```

#### 3.3.2.2 Create Summary Generation Service
**File:** `src/main/summary.ts` (new)

```typescript
import Anthropic from '@anthropic-ai/sdk';
import {
    shouldGenerateSummary,
    getLatestSummary,
    getMessagesForSummary,
    saveSummary,
    getMessageCount,
} from './db/summary.js';
import { buildSummaryPrompt } from './prompts/summary.js';
import { isMockEnabled, getMockSummary } from './claude-mock.js';
import type { ConversationSummary } from '../shared/types.js';

const SUMMARY_MODEL = 'claude-haiku-4-5-latest';

// Track in-progress summaries to prevent duplicate generation
const summaryInProgress = new Set<string>();

/**
 * Check and generate a summary if needed. Runs asynchronously.
 */
export async function checkAndGenerateSummary(conversationId: string): Promise<void> {
    // Prevent duplicate summary generation for same conversation
    if (summaryInProgress.has(conversationId)) {
        console.log(`[summary] Summary already in progress for conversation ${conversationId}`);
        return;
    }

    if (!shouldGenerateSummary(conversationId)) {
        return;
    }

    summaryInProgress.add(conversationId);

    try {
        console.log(`[summary] Generating summary for conversation ${conversationId}`);
        await generateSummary(conversationId);
        console.log(`[summary] Summary generated successfully`);
    } catch (err) {
        console.error('[summary] Summary generation failed:', err);
        // Graceful degradation - don't throw, just log
    } finally {
        summaryInProgress.delete(conversationId);
    }
}

/**
 * Generate a summary for the conversation.
 */
async function generateSummary(conversationId: string): Promise<ConversationSummary> {
    const lastSummary = getLatestSummary(conversationId);
    const messagesToSummarize = getMessagesForSummary(conversationId);

    if (messagesToSummarize.length === 0) {
        throw new Error('No messages to summarize');
    }

    let summaryText: string;

    if (isMockEnabled()) {
        console.log('[summary] Using mock summary');
        summaryText = getMockSummary();
    } else {
        const client = new Anthropic();
        const prompt = buildSummaryPrompt(
            messagesToSummarize.map(m => ({ role: m.role, content: m.content })),
            lastSummary?.summary_text || null
        );

        const response = await client.messages.create({
            model: SUMMARY_MODEL,
            max_tokens: 500,
            messages: [{ role: 'user', content: prompt }],
        });

        summaryText = response.content[0].type === 'text'
            ? response.content[0].text
            : '';
    }

    // Calculate total messages covered
    const totalMessageCount = getMessageCount(conversationId);
    const verbatimCount = 20; // VERBATIM_WINDOW * 2
    const messagesCovered = totalMessageCount - verbatimCount;

    // Get first and last message IDs for tracking
    const startMessageId = messagesToSummarize[0]?.id || null;
    const endMessageId = messagesToSummarize[messagesToSummarize.length - 1]?.id || null;

    return saveSummary(
        conversationId,
        summaryText,
        messagesCovered,
        startMessageId,
        endMessageId
    );
}
```

#### 3.3.2.3 Add Mock Summary Function
**File:** `src/main/claude-mock.ts` (modify - add export)

Add the following function to the existing mock file:

```typescript
export function getMockSummary(): string {
    return `User discussed personal challenges related to work-life balance and career decisions. They expressed feeling overwhelmed by competing priorities and uncertainty about their professional direction.

Key points covered:
- Considering a job change but uncertain about timing
- Values family time but feels pressure to advance career
- Has been exploring options but hasn't made concrete plans

The conversation had a reflective, somewhat anxious tone. User seemed to be processing their thoughts rather than seeking immediate solutions.`;
}
```

---

### Phase 3.3.3: Context Assembly Integration

#### 3.3.3.1 Update Context Assembly
**File:** `src/main/context.ts` (modify)

Add import at top:
```typescript
import { getLatestSummary } from './db/summary.js';
```

Modify `assembleContext` function to include summary:

```typescript
export async function assembleContext(
    currentMessage: string,
    recentMessages: Message[],
    conversationId: string
): Promise<AssembledContext> {
    const db = getDb();

    // ... existing code for profile data retrieval ...

    // Get conversation summary if available
    const conversationSummary = getLatestSummary(conversationId);

    // ... existing code for profile summary building ...

    // Semantic search for relevant past messages
    let relevantMessages = '';
    if (isEmbeddingsReady()) {
        // ... existing semantic search code ...
    }

    // Format recent history with conversation summary prefix
    const recentHistory = formatRecentHistoryWithSummary(
        recentMessages.slice(-10),
        conversationSummary
    );

    // Estimate tokens (including summary)
    const summaryTokens = conversationSummary
        ? Math.ceil(conversationSummary.summary_text.length / 4)
        : 0;
    const tokenEstimate = Math.ceil(
        (profileSummary.length + relevantMessages.length + recentHistory.length + summaryTokens) / 4
    );

    return {
        profileSummary,
        relevantMessages,
        recentHistory,
        tokenEstimate,
        supportStyle: supportStyle?.style || null,
        currentIntent: currentIntent?.type || null,
        questionType: plan?.question_type || null,
    };
}
```

Add new function to format history with summary:

```typescript
function formatRecentHistoryWithSummary(
    messages: Message[],
    summary: ConversationSummary | null
): string {
    const parts: string[] = [];

    // Include conversation summary if available
    if (summary) {
        parts.push('## Earlier in this conversation');
        parts.push(summary.summary_text);
        parts.push('');
    }

    // Include recent messages
    if (messages.length === 0) {
        if (!summary) {
            return '(No prior messages in this conversation)';
        }
    } else {
        parts.push('## CONVERSATION HISTORY (for context only - do NOT respond to these)');
        for (const m of messages) {
            const speaker = m.role === 'user' ? '[PAST] User' : '[PAST] Assistant';
            parts.push(`${speaker}: ${m.content}`);
        }
        parts.push('\n(End of conversation history)');
    }

    return parts.join('\n');
}
```

Add import for ConversationSummary type:
```typescript
import type { Message, Value, Challenge, MaslowSignal, Goal, ConversationSummary } from '../shared/types.js';
```

---

### Phase 3.3.4: IPC Integration

#### 3.3.4.1 Trigger Summary Generation
**File:** `src/main/ipc.ts` (modify)

Add import at top:
```typescript
import { checkAndGenerateSummary } from './summary.js';
```

In the `chat:stream` handler (after storing assistant message), add summary check:

```typescript
// After storing assistant message, check if summary needed (async, don't wait)
checkAndGenerateSummary(conversation.id).catch(err => {
    console.error('Summary check failed:', err);
});
```

Similarly update `chat:send` handler if it exists and is used.

---

### Phase 3.3.5: Testing

#### 3.3.5.1 Create Summary Tests
**File:** `tests/conversation-summaries.spec.ts` (new)

```typescript
import { test, expect } from '@playwright/test';
import { launchApp, closeApp, getPage } from './helpers/electron';

test.describe('Conversation Summaries', () => {
    test.beforeAll(async () => {
        await launchApp();
    });

    test.afterAll(async () => {
        await closeApp();
    });

    test('US-301: should not generate summary for short conversations', async () => {
        const page = getPage();

        // Send a few messages (less than threshold)
        for (let i = 0; i < 5; i++) {
            await page.fill('[data-testid="chat-input"]', `Test message ${i}`);
            await page.click('[data-testid="send-button"]');
            await page.waitForSelector('[data-testid="assistant-message"]');
        }

        // Verify no summary generated (check via debug API or DB)
        // Implementation depends on available debug endpoints
    });

    test('US-302: should generate summary after threshold', async () => {
        const page = getPage();

        // Send enough messages to trigger summary
        for (let i = 0; i < 25; i++) {
            await page.fill('[data-testid="chat-input"]', `Message ${i}: discussing topic ${i % 5}`);
            await page.click('[data-testid="send-button"]');
            await page.waitForSelector('[data-testid="assistant-message"]', { state: 'visible' });
            // Wait for response to complete
            await page.waitForTimeout(500);
        }

        // Wait for async summary generation
        await page.waitForTimeout(3000);

        // Verify summary was generated
        // This would require a debug endpoint or checking DB directly
    });

    test('US-304: context should include summary when available', async () => {
        // This test verifies that responses reference earlier context
        // after summary is generated
        const page = getPage();

        // Reference something from early in the conversation
        await page.fill('[data-testid="chat-input"]', 'What did we talk about at the start?');
        await page.click('[data-testid="send-button"]');

        // Response should acknowledge earlier topics (requires summary)
        const response = await page.textContent('[data-testid="assistant-message"]:last-child');
        expect(response).toBeTruthy();
        // Actual assertion depends on what was discussed
    });
});
```

---

## Technical Specifications

### Data Flow

```
User sends message
       │
       ├──> Store message
       │
       ├──> Run extraction (async)
       │
       ├──> Assemble context
       │        │
       │        ├──> Get profile summary
       │        ├──> Get conversation summary ←── NEW
       │        ├──> Get recent messages
       │        └──> Build context string
       │
       ├──> Generate response
       │
       ├──> Store response
       │
       └──> Check if summary needed (async) ←── NEW
                    │
                    └──> If yes, generate with Haiku
                    └──> Store summary
```

### Token Budget Update

| Component | Tokens | Notes |
|-----------|--------|-------|
| System prompt + scaffold | ~1,500 | Fixed |
| Profile summary | ~800 | Living summary |
| **Conversation summary** | **~500** | **NEW: Compressed older history** |
| Last 10 exchanges VERBATIM | ~3,000 | Recent messages |
| Assembled context | ~2,000 | Values, challenges, goals |
| Semantic search results | ~1,500 | Relevant past moments |
| Response space | ~1,000 | Output room |
| **Total** | **~10,300** | Within limits |

---

## Files Summary

### Files to Create
| File | Purpose |
|------|---------|
| `src/main/db/summary.ts` | Summary database functions |
| `src/main/prompts/summary.ts` | Summary generation prompt |
| `src/main/summary.ts` | Summary generation service |
| `tests/conversation-summaries.spec.ts` | Integration tests |

### Files to Modify
| File | Changes |
|------|---------|
| `src/shared/types.ts` | Add `ConversationSummary` interface |
| `src/main/context.ts` | Import summary functions, integrate into `assembleContext` |
| `src/main/ipc.ts` | Trigger `checkAndGenerateSummary` after response |
| `src/main/claude-mock.ts` | Add `getMockSummary` function |

---

## Quality Gates

- `make typecheck` - Type checking passes
- `make lint` - No linting errors
- `make test` - All tests pass
- `make build` - Build succeeds

### Post-Verification: Code Simplification
After all quality gates pass, run the code simplifier and re-verify:

1. Run `/code-simplifier:code-simplifier` on modified files
2. Re-run all quality gates above
3. Repeat until no further simplifications are made

---

## Verification Checklist

### Summary Generation Trigger (US-301)
1. [ ] Send 15 messages → No summary generated
2. [ ] Send 25 messages total → Summary generated (covers first ~5, keeping last 20 verbatim)
3. [ ] Send 10 more (35 total) → No new summary (only 10 since last)
4. [ ] Send 15 more (50 total) → New summary generated (25 since last >= 20)

### Summary Quality (US-302)
5. [ ] Summary uses Haiku model (check logs)
6. [ ] Summary is plain text, not JSON
7. [ ] Summary is under 500 words
8. [ ] Summary captures key topics from messages
9. [ ] API failure → Graceful degradation, no crash

### Storage (US-303)
10. [ ] `conversation_summaries` table has row after generation
11. [ ] `messages_covered` matches expected count
12. [ ] `start_message_id` and `end_message_id` are populated
13. [ ] Multiple summaries → Latest returned by `getLatestSummary`

### Context Integration (US-304)
14. [ ] Context includes "## Earlier in this conversation" section
15. [ ] Summary text appears in context
16. [ ] Token estimate includes summary length
17. [ ] Reference early topic → Claude acknowledges it in response

### Async Behavior (US-305)
18. [ ] Response returns before summary completes
19. [ ] Rapid messages → Only one summary generation at a time
20. [ ] Summary failure → Current message still processed successfully

---

## Implementation Order

1. **Add types**: Add `ConversationSummary` interface to `src/shared/types.ts`
2. **Create DB functions**: Create `src/main/db/summary.ts` with CRUD operations
3. **Create prompt**: Create `src/main/prompts/summary.ts` with summary prompt
4. **Add mock**: Add `getMockSummary` to `src/main/claude-mock.ts`
5. **Create service**: Create `src/main/summary.ts` with generation logic
6. **Update context**: Modify `src/main/context.ts` to include summary
7. **Wire IPC**: Update `src/main/ipc.ts` to trigger summary check
8. **Write tests**: Create `tests/conversation-summaries.spec.ts`
9. **Run verification checklist**

---

## Dependencies

- **Requires Phase 2 complete**: Message persistence, basic conversation flow
- **No new npm packages**: Uses existing Anthropic SDK, uuid, better-sqlite3

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Summary generation slow | Blocks user if awaited | Async execution, don't wait |
| Summary quality poor | Loses important context | Clear prompt, include previous summary |
| Haiku API rate limits | Summary generation fails | Graceful degradation, retry logic (future) |
| Summary too long | Exceeds token budget | Hard cap at 300 words in prompt |
| Duplicate summaries | Wasted API calls | In-progress tracking set |
| Summary doesn't match messages | Confusing context | Include message IDs for debugging |

---

## Future Considerations

- **Summary editing**: Allow users to correct or expand summaries
- **Summary UI**: Show summaries in conversation view (Phase 3 profile visibility)
- **Multi-conversation summaries**: Cross-conversation themes and patterns
- **Summary compression levels**: Short/medium/detailed summaries based on context budget
- **Incremental updates**: Update existing summary instead of creating new one
- **Summary invalidation**: Regenerate if user edits/deletes messages
