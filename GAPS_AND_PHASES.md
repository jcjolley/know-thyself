# Gaps and Implementation Phases

This document tracks the gaps between requirements and buildable prototype, and the phases to address them.

---

## Critical Gaps (Must Resolve Before Coding)

### 1. Data Schema
**Status:** ✅ Resolved
**What's Missing:** No actual table definitions for SQLite or LanceDB structure
**Why It Blocks:** Can't write any persistence code
**Resolution:** Schema defined below.

#### SQLite Tables

```sql
-- Core conversation data
CREATE TABLE conversations (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT REFERENCES conversations(id),
    role TEXT NOT NULL,  -- 'user' or 'assistant'
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Extraction results (raw output from extraction prompt)
CREATE TABLE extractions (
    id TEXT PRIMARY KEY,
    message_id TEXT REFERENCES messages(id),
    extraction_json TEXT NOT NULL,  -- Full JSON from extraction prompt
    status TEXT DEFAULT 'raw',  -- 'raw', 'validated', 'rejected'
    validation_errors TEXT,  -- JSON array of validation issues (if any)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Structured profile data (derived from extractions)
CREATE TABLE values (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,  -- e.g., "family_connection"
    description TEXT,
    value_type TEXT NOT NULL,  -- 'stated' or 'revealed'
    confidence REAL DEFAULT 0.5,  -- 0.0 to 1.0
    evidence_count INTEGER DEFAULT 1,
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_reinforced TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE challenges (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'active',  -- 'active', 'resolved', 'recurring'
    first_mentioned TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_mentioned TIMESTAMP,
    mention_count INTEGER DEFAULT 1
);

CREATE TABLE activities (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    category TEXT,  -- 'creative', 'social', 'work', 'health', etc.
    sentiment TEXT,  -- 'positive', 'negative', 'neutral'
    mentioned_date DATE,  -- When the activity occurred (if known)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE goals (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'stated',  -- 'stated', 'in_progress', 'achieved', 'abandoned'
    first_stated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_mentioned TIMESTAMP
);

CREATE TABLE maslow_signals (
    id TEXT PRIMARY KEY,
    level TEXT NOT NULL,  -- 'physiological', 'safety', 'belonging', 'esteem', 'self_actualization'
    signal_type TEXT NOT NULL,  -- 'concern' or 'stable'
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE psychological_signals (
    id TEXT PRIMARY KEY,
    dimension TEXT NOT NULL,  -- 'big_five_openness', 'attachment_style', 'locus_of_control', etc.
    value TEXT NOT NULL,  -- The assessed value
    confidence REAL DEFAULT 0.5,
    evidence_count INTEGER DEFAULT 1,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Living summary (regenerated after EVERY message)
CREATE TABLE profile_summary (
    id INTEGER PRIMARY KEY CHECK (id = 1),  -- Only one row
    summary_json TEXT NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversation summaries (rolling summaries for context window management)
CREATE TABLE conversation_summaries (
    id TEXT PRIMARY KEY,
    conversation_id TEXT REFERENCES conversations(id),
    summary_text TEXT NOT NULL,
    messages_covered INTEGER,  -- How many messages this summarizes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Source tracking - CRITICAL: Every profile item MUST link to evidence
-- This prevents hallucinations by grounding all insights in actual quotes
CREATE TABLE evidence (
    id TEXT PRIMARY KEY,
    target_type TEXT NOT NULL,  -- 'value', 'challenge', 'activity', 'goal', 'maslow', 'psychological'
    target_id TEXT NOT NULL,
    message_id TEXT REFERENCES messages(id),
    quote TEXT NOT NULL,  -- The specific text that supports this (required)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### LanceDB Collections

```typescript
// Embedding configuration - voyage-4-nano with Matryoshka dimensions
const EMBEDDING_DIMENSIONS = 1024;  // Can be 256, 512, 1024, or 2048

// Message embeddings - for semantic search over conversation history
interface MessageEmbedding {
    id: string;           // References messages.id
    vector: number[];     // Embedding vector (EMBEDDING_DIMENSIONS)
    content: string;      // Original text (for retrieval)
    role: 'user' | 'assistant';
    created_at: string;   // ISO timestamp
}

// Insight embeddings - for semantic search over extracted insights
interface InsightEmbedding {
    id: string;           // Unique ID
    vector: number[];     // Embedding vector (EMBEDDING_DIMENSIONS)
    insight_type: 'value' | 'challenge' | 'pattern' | 'goal';
    content: string;      // The insight text
    source_id: string;    // References the source table row
    created_at: string;   // ISO timestamp
}
```

**Note:** Thanks to voyage-4-nano's Matryoshka training, you can change `EMBEDDING_DIMENSIONS` without re-indexing - just truncate existing vectors. However, for consistency, pick a dimension at setup and stick with it.

#### Key Design Decisions

1. **Evidence is mandatory** - Every profile item (value, challenge, goal, etc.) MUST have at least one row in the `evidence` table with the source quote. No hallucinations allowed.

2. **Profile summary regenerates continuously** - After every user message, the profile summary is updated to reflect new learnings. This is the "living document" that evolves with each interaction.

3. **Dual tracking for values** - The `value_type` field distinguishes 'stated' vs 'revealed' values, enabling gap analysis.

4. **Extraction validation is mandatory** - Raw extractions go through multi-layer validation before updating the profile. See "Extraction Validation Strategy" section below.

#### Extraction Validation Strategy

Extractions are the foundation of the entire profile. Bad extractions compound over time, so we validate at multiple layers:

```
Layer 1: Schema Validation
├── JSON structure matches expected schema
├── Required fields present
└── Values within allowed ranges

Layer 2: Quote Verification
├── Every extraction MUST include source quote
├── Quote must actually appear in user message (fuzzy match)
└── Reject extractions with fabricated quotes

Layer 3: Confidence Threshold for Profile Updates
├── < 0.3 confidence → "tentative" (stored, not used in responses)
├── 0.3-0.5 → needs corroboration (2+ extractions) to become "emerging"
└── Only "emerging" (0.4+) and above inform response generation

Layer 4: Contradiction Detection
├── Flag when new extraction contradicts high-confidence existing item
├── Don't auto-overwrite - store both, let pattern emerge
└── Surface contradictions in Self-Portrait for user review
```

**Quote Verification Implementation:**

```typescript
function verifyQuotes(extraction: Extraction, originalMessage: string): ValidationResult {
    const errors: string[] = [];

    for (const quote of extraction.raw_quotes || []) {
        // Normalize whitespace for comparison
        const normalizedQuote = quote.toLowerCase().replace(/\s+/g, ' ').trim();
        const normalizedMessage = originalMessage.toLowerCase().replace(/\s+/g, ' ');

        if (!normalizedMessage.includes(normalizedQuote)) {
            errors.push(`Quote not found in message: "${quote.slice(0, 50)}..."`);
        }
    }

    return { valid: errors.length === 0, errors };
}
```

**Extraction Processing Pipeline:**

```typescript
async function processExtraction(messageId: string, extraction: unknown): Promise<void> {
    // Layer 1: Schema validation
    const schemaResult = validateExtractionSchema(extraction);
    if (!schemaResult.valid) {
        await saveExtraction(messageId, extraction, 'rejected', schemaResult.errors);
        return;
    }

    // Layer 2: Quote verification
    const message = await getMessage(messageId);
    const quoteResult = verifyQuotes(extraction as Extraction, message.content);
    if (!quoteResult.valid) {
        await saveExtraction(messageId, extraction, 'rejected', quoteResult.errors);
        return;
    }

    // Passed validation - save and process
    await saveExtraction(messageId, extraction, 'validated', []);

    // Layer 3 & 4: Apply to profile with thresholds and contradiction detection
    await applyToProfile(extraction as Extraction);
}
```

---

### 2. Embedding Strategy
**Status:** ✅ Resolved
**What's Missing:** What gets embedded? Which model? How chunked?
**Why It Blocks:** LanceDB is useless without this
**Resolution:** Defined below.

#### Embedding Model

**`voyage-4-nano`** (local, open weights from Voyage AI / MongoDB)

| Spec | Value |
|------|-------|
| Dimensions | 1024 (configurable: 256, 512, 1024, 2048 via Matryoshka) |
| Quality | Outperforms voyage-3.5-lite, optimized for Claude |
| Library | `@huggingface/transformers` |
| Provider | Voyage AI (Anthropic-recommended, now part of MongoDB) |
| Weights | Open, available on Hugging Face |

**Why voyage-4-nano over BGE:**
- **Claude-aligned**: Voyage AI is Anthropic's recommended embedding provider. Semantic space better matches how Claude understands concepts.
- **Shared embedding space**: Can upgrade to voyage-4-large later without re-indexing existing data.
- **Matryoshka dimensions**: Can trade off quality vs speed by using smaller dimensions.
- **Local & private**: Open weights run locally, no API calls needed.

Runs locally in Node.js main process. No external API calls. Privacy preserved.

```typescript
import { pipeline } from '@huggingface/transformers';

// Initialize once at startup
const embedder = await pipeline('feature-extraction', 'voyageai/voyage-4-nano');

async function embed(text: string, dimensions: number = 1024): Promise<number[]> {
    const result = await embedder(text, { pooling: 'mean', normalize: true });
    // Matryoshka: truncate to desired dimensions
    return Array.from(result.data).slice(0, dimensions);
}
```

**Dimension Selection:**

| Use Case | Dimensions | Trade-off |
|----------|------------|-----------|
| High fidelity (default) | 1024 | Best quality, moderate speed |
| Faster search | 512 | Slight quality loss, 2x faster |
| On-device / mobile | 256 | Acceptable quality, 4x faster |

#### What Gets Embedded

| Content | Embed? | Rationale |
|---------|--------|-----------|
| User messages | Yes | Core content for semantic search |
| Assistant responses | Yes | May contain relevant context |
| Extracted insights | Yes | Enables "find related values/challenges" |
| Profile summary | No | Used directly, not searched |
| Raw extraction JSON | No | Structured data, not for semantic search |

#### Chunking Strategy

- **MVP (conversations):** Each message is one chunk (messages are typically short)
- **Later (document ingestion):** Chunk into ~500 token segments with overlap, maintain source reference

---

### 3. IPC Protocol
**Status:** ✅ Resolved
**What's Missing:** How renderer and main process communicate
**Why It Blocks:** Can't wire the app together
**Resolution:** Defined below.

#### Protocol: Electron IPC (contextBridge)

| Spec | Value |
|------|-------|
| Framework | Electron native IPC |
| Streaming | Async iterators via IPC |
| Format | Typed TypeScript interfaces |
| Type Safety | Shared types between renderer and main |

#### IPC Channels

```typescript
// Shared types (src/shared/types.ts)
interface ChatRequest {
    message: string;
}

interface ChatResponse {
    chunk: string;
    done: boolean;
}

interface ProfileSummary {
    maslow_status: MaslowConcern[];
    top_values: Value[];
    active_challenges: Challenge[];
    // ...
}

// Main process handlers (src/main/ipc.ts)
ipcMain.handle('chat:send', async (event, request: ChatRequest) => { ... });
ipcMain.handle('profile:get', async () => { ... });
ipcMain.handle('profile:values', async () => { ... });
ipcMain.handle('profile:challenges', async () => { ... });

// For streaming, use ipcMain.on with reply
ipcMain.on('chat:stream', async (event, request: ChatRequest) => {
    for await (const chunk of streamChatResponse(request)) {
        event.reply('chat:chunk', chunk);
    }
    event.reply('chat:done');
});
```

#### Why This Approach

- **No subprocess** - Main process is already Node.js, logic runs there directly
- **Type safety** - Shared TypeScript interfaces between renderer and main
- **Native streaming** - Electron IPC supports async iteration patterns
- **Simpler architecture** - No HTTP server, no port management

#### Preload Script (contextBridge)

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
    chat: {
        send: (message: string) => ipcRenderer.invoke('chat:send', { message }),
        onChunk: (callback: (chunk: string) => void) => {
            ipcRenderer.on('chat:chunk', (_, chunk) => callback(chunk));
        },
        onDone: (callback: () => void) => {
            ipcRenderer.on('chat:done', () => callback());
        },
    },
    profile: {
        get: () => ipcRenderer.invoke('profile:get'),
        getValues: () => ipcRenderer.invoke('profile:values'),
        getChallenges: () => ipcRenderer.invoke('profile:challenges'),
    },
});
```

---

### 4. MVP Scope
**Status:** ✅ Resolved
**What's Missing:** What features are in v0.1 vs later
**Why It Blocks:** Risk of building too much
**Resolution:** Defined below.

#### MVP (v0.1) - In Scope
| Feature | Notes |
|---------|-------|
| Text conversation | Core interaction loop |
| Extraction pipeline | Background processing after each message |
| Context-aware responses | The three-prompt system working |
| Basic profile storage | SQLite + LanceDB storing extractions |
| "Your Self-Portrait" (basic) | Simple view of what system has learned - formatted text/cards |
| Single conversation thread | No multiple conversations yet |

#### MVP - Out of Scope
| Feature | Why Defer |
|---------|-----------|
| Voice input | Adds Whisper complexity, VAD tuning |
| Document upload | Adds ingestion pipeline complexity |
| Onboarding deep dives | Nice-to-have, not core loop |
| Multiple conversations | Single thread is fine for proving concept |
| Fancy visualizations | Basic text/cards first |
| Settings UI | Hardcode defaults |
| User accounts / auth | Single-user local app |

#### MVP Success Criteria
1. User can have a multi-turn conversation
2. System extracts signals from each message
3. Responses feel more personalized over time (system "learns")
4. User can see their growing profile
5. Works in dev mode

---

### 5. Claude Model Selection
**Status:** ✅ Resolved
**What's Missing:** Which Claude model for each prompt type
**Why It Blocks:** Cost and quality implications
**Resolution:** Adaptive model selection based on conversation intensity.

#### Adaptive Model Selection

Models escalate based on conversation context, not fixed per prompt type.

| Prompt Type | Default | Escalates To | Trigger |
|-------------|---------|--------------|---------|
| Extraction | Haiku 4.5 | Sonnet 4.5 | High emotional intensity, crisis signals |
| Context Planning | Haiku 4.5 | — | Always Haiku 4.5 (adds intensity assessment) |
| Response Generation | Sonnet 4.5 | Opus 4.5 | High-stakes decisions, sensitive topics, deep insights |

#### Escalation Triggers

| Trigger | Detection Method | Action |
|---------|------------------|--------|
| Emotional intensity | Extraction detects distress, grief, anger | Response → Opus |
| Major life decisions | Context planning classifies high-stakes | Response → Opus |
| Deep insight moment | About to deliver Level 3-4 insight | Response → Opus |
| Sensitive topics | Mental health, trauma, loss, crisis | Response → Opus, Extraction → Sonnet |
| First interaction | No profile exists | Response → Sonnet (floor) |
| User requests depth | "Help me understand" / "Go deeper" | Response → Opus |
| Routine check-in | Low emotional load, simple question | Stay at defaults |

#### Context Planning Output (Extended)

```json
{
  "question_type": "decision_support",
  "timeframe": "present_focused",
  "intensity": "high",
  "sensitivity": ["career", "financial_stress"],
  "recommended_model": "opus",
  "reason": "Major career decision with financial anxiety"
}
```

#### Model Selection Logic

```typescript
// Use Claude 4.5 models only - update model IDs as new versions release
type ClaudeModel = 'claude-haiku-4-5-latest' | 'claude-sonnet-4-5-latest' | 'claude-opus-4-5-20251101';

interface ContextPlan {
    intensity?: 'low' | 'medium' | 'high' | 'critical';
    sensitivity?: string[];
}

interface Extraction {
    crisis_signals?: boolean;
}

function selectResponseModel(contextPlan: ContextPlan, extraction: Extraction): ClaudeModel {
    const sensitiveTopics = ['mental_health', 'trauma', 'grief', 'crisis'];

    if (contextPlan.intensity === 'critical') {
        return 'claude-opus-4-5-20251101';
    }
    if (extraction.crisis_signals) {
        return 'claude-opus-4-5-20251101';
    }
    if (contextPlan.intensity === 'high') {
        return 'claude-opus-4-5-20251101';
    }
    if (contextPlan.sensitivity?.some(s => sensitiveTopics.includes(s))) {
        return 'claude-opus-4-5-20251101';
    }
    return 'claude-sonnet-4-5-latest';  // Floor is Sonnet 4.5 for responses
}
```

#### Estimated Monthly Cost

**LLM Calls Per User Message:**

| Call | Model | Frequency | Est. Tokens |
|------|-------|-----------|-------------|
| Extraction | Haiku 4.5 | Every message | ~2K in, ~1K out |
| Context Planning | Haiku 4.5 | Every message | ~1K in, ~0.5K out |
| Response Generation | Sonnet 4.5 (90%) / Opus 4.5 (10%) | Every message | ~10K in, ~1K out |
| Narrative Synthesis | Haiku 4.5 | Every ~10 messages | ~3K in, ~1K out |
| Conversation Summary | Haiku 4.5 | Every ~20 messages | ~4K in, ~0.5K out |

**Cost by Usage Level:**

| Usage Level | Messages/Month | Estimated Cost | User Profile |
|-------------|----------------|----------------|--------------|
| Light | 100 | ~$4 | Occasional check-ins |
| Moderate | 300 | ~$12 | Regular user, few times per week |
| Heavy | 1,000 | ~$35 | Daily conversations |
| Power User | 3,000 | ~$100 | Multiple daily sessions |

**Cost Breakdown (Moderate User, 300 messages):**

| Component | Cost |
|-----------|------|
| Extraction (Haiku 4.5, 300 calls) | ~$0.60 |
| Context Planning (Haiku 4.5, 300 calls) | ~$0.25 |
| Response Generation (Sonnet 4.5 270 + Opus 4.5 30) | ~$10.50 |
| Narrative Synthesis (Haiku 4.5, ~30 calls) | ~$0.15 |
| Conversation Summary (Haiku 4.5, ~15 calls) | ~$0.10 |
| **Total** | **~$12/month** |

*Note: Estimates based on Claude 4.5 pricing. Actual costs may vary. Response generation dominates cost due to large context windows and Sonnet/Opus usage.*

---

## Important Gaps (Should Resolve Before Coding)

### 6. Conversation Storage
**Status:** ✅ Resolved
**What's Missing:** Full transcripts? Summaries? Both? Retention policy?
**Why It Matters:** Affects schema and context assembly
**Resolution:** Store both full transcripts and rolling summaries.

#### Storage Strategy

| Layer | What | Purpose |
|-------|------|---------|
| `messages` table | Every message verbatim, forever | Source of truth, evidence quotes, re-processing |
| `conversation_summaries` | Rolling summary, updated periodically | Context window management, quick reference |

#### Schema

```sql
CREATE TABLE conversation_summaries (
    id TEXT PRIMARY KEY,
    conversation_id TEXT REFERENCES conversations(id),
    summary_text TEXT NOT NULL,
    messages_covered INTEGER,  -- Total messages summarized so far
    start_message_id TEXT,     -- First message included in this summary
    end_message_id TEXT,       -- Last message included in this summary
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### When to Generate Summary

```typescript
const MESSAGES_PER_SUMMARY = 20;  // Generate summary every 20 messages
const VERBATIM_WINDOW = 10;       // Keep last 10 exchanges (20 messages) verbatim

function shouldGenerateSummary(conversationId: string): boolean {
    const messageCount = getMessageCount(conversationId);
    const lastSummary = getLatestSummary(conversationId);
    const messagesSinceSummary = lastSummary
        ? messageCount - lastSummary.messages_covered
        : messageCount;

    // Generate when we have 20+ messages beyond the verbatim window
    return messagesSinceSummary >= MESSAGES_PER_SUMMARY;
}
```

#### Summary Generation Prompt

```typescript
const CONVERSATION_SUMMARY_PROMPT = `
Summarize this conversation segment for future context.

## Messages to Summarize
{messages}

## Previous Summary (if any)
{previous_summary}

## Instructions
Create a concise summary that captures:
1. Key topics discussed
2. Important decisions or conclusions reached
3. Emotional tone and any significant moments
4. Any commitments or follow-ups mentioned

Keep it under 300 words. Focus on what would be useful context for future conversations.
Write in third person (e.g., "User discussed..." not "You discussed...").

Output as plain text, not JSON.
`;

async function generateConversationSummary(conversationId: string): Promise<string> {
    const lastSummary = getLatestSummary(conversationId);
    const messagesToSummarize = getMessagesForSummary(conversationId, lastSummary);

    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-latest',  // Haiku is sufficient for summarization
        max_tokens: 500,
        messages: [{
            role: 'user',
            content: CONVERSATION_SUMMARY_PROMPT
                .replace('{messages}', formatMessagesForPrompt(messagesToSummarize))
                .replace('{previous_summary}', lastSummary?.summary_text || 'None (start of conversation)'),
        }],
    });

    return response.content[0].text;
}
```

#### Context Assembly Integration

```
Context Window (~10K tokens)
├── System prompt + scaffold (~1,500)
├── Profile summary (~800)
├── Conversation summary (older history) (~500)  ← LLM-generated summary
├── Last 10 exchanges VERBATIM (~3,000)          ← Recent messages, no summarization
├── Assembled context (values, etc.) (~2,000)
├── Semantic search results (~1,500)
└── Response space (~1,000)
```

```typescript
function assembleConversationContext(conversationId: string): string {
    const summary = getLatestSummary(conversationId);
    const recentMessages = getRecentMessages(conversationId, VERBATIM_WINDOW * 2);  // 20 messages

    let context = '';

    if (summary) {
        context += `## Earlier in this conversation\n${summary.summary_text}\n\n`;
    }

    context += `## Recent messages\n`;
    for (const msg of recentMessages) {
        context += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n\n`;
    }

    return context;
}
```

#### Retention Policy

- Full transcripts: Keep forever (local storage is cheap)
- Summaries: Keep forever (small, useful for quick context)
- User can export or delete at will

---

### 7. Profile Update Logic
**Status:** ✅ Resolved
**What's Missing:** When do extractions become profile updates? Conflict resolution?
**Why It Matters:** Core system behavior undefined
**Resolution:**
- Profile summary regenerates after EVERY user message
- Extractions feed into structured profile tables (values, challenges, etc.)
- Every profile item requires evidence (source quote) - no hallucinations
- Confidence scores increase with repeated evidence, not overwritten
- Conflict resolution: New evidence adds to existing items, doesn't replace

---

### 8. Confidence/Trust Scoring
**Status:** ✅ Resolved
**What's Missing:** How are confidence scores calculated? Do they decay over time?
**Why It Matters:** We reference confidence levels everywhere but never defined the algorithm
**Resolution:** Evidence-based scoring with recency decay.

#### Confidence Formula

```typescript
function calculateConfidence(evidenceCount: number, daysSinceLast: number): number {
    // Base confidence from evidence count (diminishing returns)
    const base = Math.min(0.9, 0.2 + (0.1 * Math.log2(evidenceCount + 1)));

    // Recency decay (no decay for 30 days, then gradual decline)
    let recencyFactor: number;
    if (daysSinceLast <= 30) {
        recencyFactor = 1.0;
    } else {
        recencyFactor = Math.max(0.5, 1.0 - ((daysSinceLast - 30) / 365));
    }

    return Math.round(base * recencyFactor * 100) / 100;
}
```

#### Example Scores

| Evidence Count | Last Mentioned | Confidence |
|----------------|----------------|------------|
| 1 mention | Today | 0.30 |
| 3 mentions | Today | 0.52 |
| 5 mentions | Today | 0.66 |
| 10 mentions | Today | 0.86 |
| 10 mentions | 6 months ago | 0.65 |

#### Confidence Thresholds

| Level | Range | Meaning |
|-------|-------|---------|
| Tentative | 0.0 - 0.4 | Single mention, treat carefully |
| Emerging | 0.4 - 0.6 | Pattern forming |
| Established | 0.6 - 0.8 | Solid evidence, reliable |
| Core | 0.8 - 1.0 | Deeply confirmed |

#### When to Surface Insights

| Confidence | Action |
|------------|--------|
| < 0.4 | Don't reference directly, maybe ask to confirm |
| 0.4 - 0.6 | Mention with hedging ("It seems like...") |
| 0.6+ | State with confidence |

*Can refine thresholds based on real-world testing.*

#### Completeness Calculation

Each psychological axis has a `getDataCompleteness(axis)` function that returns 0.0-1.0. This is used for:
- Priority scoring during guided conversation (priority = importance × (1 - completeness))
- Determining when baseline is met (exit onboarding)
- Showing data gaps in Self-Portrait

**Implementation: Rules-Based Per Axis**

```typescript
function getDataCompleteness(axis: string): number {
    switch (axis) {
        case 'maslow_status':
            return calculateMaslowCompleteness();
        case 'support_seeking_style':
            return calculateSupportStyleCompleteness();
        case 'life_situation':
            return calculateLifeSituationCompleteness();
        case 'core_values':
            return calculateValuesCompleteness();
        case 'current_challenges':
            return calculateChallengesCompleteness();
        case 'goals':
            return calculateGoalsCompleteness();
        // ... other axes
        default:
            return 0;
    }
}

function calculateMaslowCompleteness(): number {
    const signals = getMaslowSignals();
    if (signals.length === 0) return 0;

    const levels = new Set(signals.map(s => s.level));
    const hasConcerns = signals.some(s => s.signal_type === 'concern');
    const hasStable = signals.some(s => s.signal_type === 'stable');

    if (levels.size >= 4 && hasConcerns && hasStable) return 1.0;  // Full picture
    if (levels.size >= 3 && hasConcerns) return 0.75;              // Most levels covered
    if (levels.size >= 1 && hasConcerns) return 0.5;               // Know primary concerns
    if (signals.length > 0) return 0.25;                           // General sense
    return 0;
}

function calculateSupportStyleCompleteness(): number {
    const signal = getPsychologicalSignal('support_seeking_style');
    if (!signal) return 0;
    if (signal.confidence >= 0.7) return 1.0;  // Explicitly stated or clearly demonstrated
    return 0.5;  // Have a guess
}

function calculateLifeSituationCompleteness(): number {
    const dimensions = ['work', 'relationships', 'family', 'living', 'health', 'age_stage'];
    const known = dimensions.filter(d => hasLifeSituationData(d));
    return Math.min(1.0, known.length / 4);  // 4+ dimensions = 100%
}

function calculateValuesCompleteness(): number {
    const values = getValues();
    const stated = values.filter(v => v.value_type === 'stated');
    const revealed = values.filter(v => v.value_type === 'revealed');

    if (stated.length >= 3 && revealed.length >= 2) return 1.0;  // Full profile with gap tracking
    if (values.length >= 3) return 0.75;                          // Clear hierarchy emerging
    if (values.length >= 2) return 0.5;                           // Core values emerging
    if (values.length >= 1) return 0.25;                          // 1-2 values spotted
    return 0;
}

function calculateChallengesCompleteness(): number {
    const challenges = getActiveChallenges();
    if (challenges.length === 0) return 0;

    const hasContext = challenges.some(c => c.mention_count > 1);
    if (challenges.length >= 2 && hasContext) return 1.0;  // Clear picture with context
    if (challenges.length >= 1) return 0.5;                 // Know main challenges
    return 0;
}

function calculateGoalsCompleteness(): number {
    const goals = getActiveGoals();
    if (goals.length === 0) return 0;

    const hasProgress = goals.some(g => g.status === 'in_progress');
    if (goals.length >= 2 && hasProgress) return 1.0;  // Clear goals with status tracking
    if (goals.length >= 1) return 0.5;                  // Know some goals
    return 0;
}
```

**Completeness for Tier 3/4 Axes (Inferred)**

For axes that are inferred from patterns rather than stated directly:

```typescript
function calculateBigFiveCompleteness(): number {
    const traits = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
    const signals = traits.map(t => getPsychologicalSignal(`big_five_${t}`)).filter(Boolean);
    return Math.min(1.0, signals.length / 3);  // 3+ traits = 100%
}

function calculateAttachmentCompleteness(): number {
    const signal = getPsychologicalSignal('attachment_style');
    if (!signal) return 0;
    // Attachment requires multiple relationship discussions to be confident
    if (signal.evidence_count >= 3 && signal.confidence >= 0.6) return 1.0;
    if (signal.evidence_count >= 1) return 0.5;
    return 0;
}
```

---

### 9. Conversation Context Window
**Status:** ✅ Resolved
**What's Missing:** How much conversation history goes into each prompt?
**Why It Matters:** Token budget, cost, quality tradeoffs
**Resolution:** Defined token budget with verbatim recent + summarized older history.

#### Token Budget (~10K target)

| Component | Tokens | Notes |
|-----------|--------|-------|
| System prompt + scaffold | ~1,500 | Fixed |
| Profile summary | ~800 | Living summary |
| Assembled context | ~2,000 | Values, challenges, goals |
| Semantic search results | ~1,500 | Relevant past moments |
| Recent messages (verbatim) | ~3,000 | Last 10 exchanges |
| Conversation summary | ~500 | Compressed older history |
| Response space | ~1,000 | Output room |

#### Context Assembly Strategy

```
├── Last 10 exchanges verbatim (20 messages)
├── Conversation summary (older context)
├── Profile summary
├── Retrieved context (values, challenges, goals)
├── Semantic search hits (relevant past moments)
└── Prompt scaffold
```

*Can tune message count and budget based on real-world testing.*

---

### 10. First-Run Experience
**Status:** ✅ Resolved
**What's Missing:** What does the user see before any data exists?
**Why It Matters:** UX for day-one users
**Resolution:** Priority-driven guided conversation that adapts as we learn.

#### Axis Priority Ranking

Each axis has an importance weight. Priority score = importance × (1 - completeness).

| Tier | Axis | Weight | Why Critical |
|------|------|--------|--------------|
| **1** | Maslow Status | 1.0 | Prevents tone-deaf advice |
| **1** | Support-Seeking Style | 1.0 | Wrong style breaks trust |
| **1** | Life Situation | 0.9 | Basic grounding |
| **1** | Immediate Intent | 0.9 | What brought them here today |
| **2** | Core Values | 0.85 | Central to personalization |
| **2** | Current Challenges | 0.8 | What they're dealing with |
| **2** | Goals | 0.75 | What they're working toward |
| **2** | Moral Foundations | 0.7 | What feels right/wrong to them |
| **3** | Big Five (OCEAN) | 0.6 | How to frame advice |
| **3** | Risk Tolerance | 0.55 | How to present options |
| **3** | Motivation Style | 0.5 | Approach vs avoidance |
| **4** | Attachment Style | 0.4 | Relationship depth |
| **4** | Locus of Control | 0.4 | Agency framing |
| **4** | Temporal Orientation | 0.35 | Time focus |
| **4** | Growth Mindset | 0.3 | Challenge framing |

#### Priority Score Calculation

```typescript
const IMPORTANCE_WEIGHTS: Record<string, number> = {
    maslow_status: 1.0,
    support_seeking_style: 1.0,
    life_situation: 0.9,
    immediate_intent: 0.9,
    core_values: 0.85,
    current_challenges: 0.8,
    goals: 0.75,
    moral_foundations: 0.7,
    big_five: 0.6,
    risk_tolerance: 0.55,
    motivation_style: 0.5,
    attachment_style: 0.4,
    locus_of_control: 0.4,
    temporal_orientation: 0.35,
    growth_mindset: 0.3,
};

function calculatePriority(axis: string): number {
    const importance = IMPORTANCE_WEIGHTS[axis] ?? 0.5;
    const completeness = getDataCompleteness(axis);  // 0.0 to 1.0
    return importance * (1.0 - completeness);
}

function getNextQuestionAxis(): string {
    const axes = Object.keys(IMPORTANCE_WEIGHTS);
    const priorities = new Map(axes.map(axis => [axis, calculatePriority(axis)]));

    return [...priorities.entries()].reduce((a, b) =>
        a[1] > b[1] ? a : b
    )[0];
}
```

#### Guided Conversation Flow

```
System picks highest priority axis
         ↓
System asks conversational question for that axis
         ↓
User responds (OR diverts to their own topic)
         ↓
If user diverted → follow their lead, exit guided mode
         ↓
Extraction runs on response
Updates completeness for ALL axes (responses reveal multiple signals)
         ↓
Recalculate priorities
Pick next highest priority axis
Ask follow-up that flows naturally
         ↓
Repeat until exit condition
```

#### Key Principle: User Can Divert Anytime

The guided questions are a **fallback**, not a gate. If user says:
- "Actually, I wanted to ask about..."
- "Can we talk about something specific?"
- Or just starts discussing a topic

→ System immediately follows their lead. Guided mode is for when they don't have something specific in mind.

#### Exit Conditions

1. **Baseline met:** All Tier 1 axes > 0.5 AND 2+ Tier 2 axes > 0.3
2. **User diverts:** They bring up their own topic
3. **Natural transition:** Response contains a clear question
4. **Max turns:** After ~5-7 guided exchanges, open up

#### Example Questions by Axis

| Axis | Question |
|------|----------|
| Maslow | "How are things going with the basics - work, health, finances? Any of those weighing on you?" |
| Support Style | "When something's on your mind, do you usually want help solving it, or do you need to talk it through first?" |
| Life Situation | "Tell me about your life right now - what does a typical week look like?" |
| Core Values | "What matters most to you? What would you never compromise on?" |
| Challenges | "What's the biggest thing you're dealing with right now?" |
| Goals | "Is there something you're working toward, or wish were different?" |

---

### 11. Profile Summary Regeneration Mechanism
**Status:** ✅ Resolved
**What's Missing:** How does profile summary actually regenerate after every message?
**Why It Matters:** Core system behavior
**Resolution:** Hybrid approach - computed from DB every message, LLM synthesis periodically.

#### Schema Update

```sql
-- Updated profile_summary table with separate computed and narrative fields
CREATE TABLE profile_summary (
    id INTEGER PRIMARY KEY CHECK (id = 1),  -- Only one row
    computed_json TEXT NOT NULL,             -- Fast DB query result, updated every message
    narrative_json TEXT,                      -- LLM-generated insights, updated periodically
    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    narrative_generated_at TIMESTAMP
);
```

#### Computed Summary (Every Message)

Fast, no API call - just query structured data:

```typescript
interface ComputedSummary {
    generated_at: string;
    maslow_status: MaslowConcern[];
    top_values: Value[];
    active_challenges: Challenge[];
    current_goals: Goal[];
    support_style: string | null;
    axis_completeness: Record<string, number>;
    // Change detection flags (for triggering narrative regeneration)
    new_values_count: number;
    new_challenges_count: number;
    maslow_level_changed: boolean;
    contradiction_detected: boolean;
}

function computeProfileSummary(): ComputedSummary {
    const previous = getPreviousComputedSummary();
    const current = {
        generated_at: new Date().toISOString(),
        maslow_status: getMaslowConcerns(),
        top_values: getTopValues(5),
        active_challenges: getActiveChallenges(),
        current_goals: getActiveGoals(),
        support_style: getPsychologicalSignal('support_seeking_style'),
        axis_completeness: calculateAllCompleteness(),
    };

    return {
        ...current,
        new_values_count: countNewValues(previous, current),
        new_challenges_count: countNewChallenges(previous, current),
        maslow_level_changed: detectMaslowShift(previous, current),
        contradiction_detected: hasNewContradiction(),
    };
}
```

#### LLM Synthesis Trigger Conditions

```typescript
function shouldRegenerateNarrative(): boolean {
    const summary = getProfileSummary();
    const messagesSinceNarrative = countMessagesSince(summary.narrative_generated_at);
    const computed = JSON.parse(summary.computed_json) as ComputedSummary;

    // Trigger on any of these conditions
    return (
        !summary.narrative_json ||                    // First time (no narrative exists)
        messagesSinceNarrative >= 10 ||              // Every 10 messages
        computed.new_values_count > 0 ||             // New value discovered
        computed.new_challenges_count > 0 ||         // New challenge identified
        computed.maslow_level_changed ||             // Maslow status shifted
        computed.contradiction_detected              // Gap between stated/revealed detected
    );
}
```

#### LLM Synthesis Prompt

```typescript
const NARRATIVE_SYNTHESIS_PROMPT = `
You are synthesizing a psychological profile narrative from structured data.

## Current Computed Summary
{computed_json}

## Recent Extractions (last 10 messages)
{recent_extractions}

## Previous Narrative (if any)
{existing_narrative}

## Your Task

Generate a brief, insightful narrative that:
1. Summarizes who this person is in 2-3 sentences
2. Identifies their current life phase and primary concerns
3. Notes any patterns or tensions worth watching
4. Highlights what's changed since the last narrative (if applicable)

Output as JSON:
{
    "identity_summary": "...",       // Who they are in 2-3 sentences
    "current_phase": "...",          // Life phase label (e.g., "career_transition", "new_parent")
    "primary_concerns": ["..."],     // Top 3 things on their mind
    "emotional_baseline": "...",     // General emotional state (e.g., "anxious_but_hopeful")
    "patterns_to_watch": ["..."],    // Interesting patterns or tensions
    "recent_wins": ["..."],          // Positive developments
    "recent_struggles": ["..."],     // Current difficulties
    "changes_since_last": "..."      // What's new (null if first narrative)
}
`;

async function synthesizeProfileNarrative(): Promise<NarrativeSummary> {
    const anthropic = new Anthropic();

    const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-latest',  // Haiku 4.5 is sufficient for synthesis
        max_tokens: 1000,
        messages: [{
            role: 'user',
            content: NARRATIVE_SYNTHESIS_PROMPT
                .replace('{computed_json}', JSON.stringify(computeProfileSummary(), null, 2))
                .replace('{recent_extractions}', JSON.stringify(getRecentExtractions(10), null, 2))
                .replace('{existing_narrative}', getExistingNarrative() || 'None (first narrative)'),
        }],
    });

    return parseNarrativeResponse(response);
}
```

#### Benefits
- Every message gets up-to-date computed summary (no API cost)
- Narrative synthesis runs only when meaningful changes occur
- Change detection flags prevent unnecessary API calls
- Balances cost and insight quality

---

## Deferrable Gaps (Resolve During/After Prototype)

### 11. Profile Visualization Design
**Status:** Deferred
**What's Missing:** Specific UI components for "Your Self-Portrait"
**Can Defer Because:** Can start with raw data view, iterate on visuals later

---

### 12. Settings/Preferences
**Status:** Deferred
**What's Missing:** Hotkey customization, model selection UI, user preferences
**Can Defer Because:** Hardcode sensible defaults for prototype

---

### 13. Packaging/Distribution
**Status:** Deferred
**What's Missing:** Installer, auto-updates, Python bundling strategy
**Can Defer Because:** Dev mode is fine for prototype

---

### 14. Error Handling
**Status:** Deferred
**What's Missing:** API failures, data corruption, network issues
**Can Defer Because:** Happy path first, harden later

---

### 15. Testing Strategy
**Status:** Deferred
**What's Missing:** How to validate extraction quality, integration tests
**Can Defer Because:** Manual testing initially, formalize later

---

## Implementation Phases

### Phase 0: Pin Down Critical Gaps
**Goal:** Resolve all critical gaps so we can start coding
**Status:** In progress

- [x] Define MVP Scope
- [x] Define Data Schema
- [x] Decide Embedding Strategy
- [x] Define IPC Protocol
- [x] Choose Claude Models per prompt type

---

### Phase 1: Skeleton
**Goal:** Get the pieces talking to each other
**Status:** Not started

- [ ] Electron app launches and shows window
- [ ] Main process initializes (all TypeScript)
- [ ] IPC via contextBridge works
- [ ] SQLite database initializes (better-sqlite3)
- [ ] LanceDB initializes (vectordb)
- [ ] Embedding model loads (@xenova/transformers)
- [ ] Can send a message and get a response from Claude API (@anthropic-ai/sdk)

---

### Phase 2: Core Loop
**Goal:** Basic conversation with extraction works
**Status:** Not started

- [ ] User sends message via UI
- [ ] Message stored in database
- [ ] Extraction prompt runs (background)
- [ ] Extraction results stored
- [ ] Context planning prompt runs
- [ ] Relevant context retrieved from DB
- [ ] Response generation prompt runs with context
- [ ] Response displayed to user
- [ ] Response stored in database
- [ ] Profile begins to accumulate data

---

### Phase 3: Profile Visibility
**Goal:** User can see what the system knows about them
**Status:** Not started

- [ ] Basic "Your Self-Portrait" view exists
- [ ] Shows extracted values with confidence
- [ ] Shows identified challenges
- [ ] Shows patterns and observations
- [ ] User can correct/edit extracted information

---

### Phase 4: Refinement
**Goal:** Polish and additional features
**Status:** Not started

- [ ] Voice input (toggle-to-talk with VAD)
- [ ] Document ingestion (plain text journals)
- [ ] Onboarding deep dives
- [ ] Better visualizations
- [ ] Settings UI

---

---

## Additional Resources

### Axis Reference Library

See **AXIS_REFERENCE_LIBRARY.md** for comprehensive reference material on all psychological axes:
- Definitions and frameworks
- Detection signals
- Example questions
- Completeness criteria
- How each axis affects advice

This material is used by:
- Extraction prompts (what to look for)
- Guided conversation (what to ask)
- Response generation (how to tailor advice)
- Completeness calculation (when we have enough data)

---

## Document History

| Date | Changes |
|------|---------|
| 2025-01-18 | Initial gaps analysis and phase planning |
| 2025-01-18 | Resolved all critical gaps (MVP scope, data schema, embeddings, IPC, model selection) |
| 2025-01-18 | Resolved all important gaps (conversation storage, confidence scoring, context window, first-run experience) |
| 2025-01-18 | Created Axis Reference Library with full documentation for all psychological axes |
| 2025-01-18 | Updated all code examples from Python to TypeScript (tech stack change) |
| 2026-01-18 | Added extraction validation strategy (schema validation, quote verification, confidence thresholds, contradiction detection) |
| 2026-01-18 | Added completeness calculation rules for all psychological axes |
| 2026-01-18 | Switched embedding model from bge-large-en-v1.5 to voyage-4-nano (Claude-optimized, local) |
| 2026-01-18 | Expanded profile summary regeneration with trigger conditions and synthesis prompt |
| 2026-01-18 | Added conversation summary mechanism with generation triggers and prompt |
| 2026-01-18 | Updated cost estimates with usage tiers (Light/Moderate/Heavy/Power User) |
