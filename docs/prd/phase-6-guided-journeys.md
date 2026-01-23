# PRD: Phase 6 - Guided Journey Conversations

## Overview

Enable users to start guided self-reflection journeys from the Journeys page. When a user clicks "Begin Journey," the system creates a special conversation that uses the journey-specific system prompt to guide a structured exploration of psychological dimensions.

## Non-Goals

- Not implementing journey recommendations based on profile completeness (future work)
- Not tracking journey phase progression in real-time (journeys are freeform conversations, not rigid state machines)
- Not modifying the extraction system (existing extraction handles all axes)
- Not adding journey-specific UI chrome during conversation (conversation looks normal)
- Not implementing journey "completion" criteria (user decides when they're done)
- Not supporting multiple concurrent journeys (one active journey per conversation)

## User Stories

### US-001: Start a Journey from the Journeys Page
**As a** user browsing journeys
**I want** to click "Begin Journey" and be taken to a conversation
**So that** I can start my guided self-reflection

**Acceptance Criteria:**
- [ ] Clicking "Begin Journey" creates a new conversation with `journey_id` set
- [ ] User is navigated to the Chat tab with the new conversation active
- [ ] The conversation title is set to the journey name (e.g., "What Do You Actually Need?")
- [ ] Claude sends an opening message appropriate to the journey (not user-initiated)

### US-002: Journey Conversations Use Journey-Specific Prompts
**As a** user in a journey conversation
**I want** Claude to guide me through the journey's exploration
**So that** I receive a structured, therapeutic conversation experience

**Acceptance Criteria:**
- [ ] Journey conversations use the journey's system prompt from `docs/journeys/*.md`
- [ ] The system prompt replaces (not appends to) the default response prompt
- [ ] Context (profile, recent messages) is still included as dynamic content
- [ ] Claude's responses follow the journey's conversational style and phases

### US-003: Journey Conversations Are Visually Identified in Sidebar
**As a** user viewing my conversation list
**I want** to see which conversations are journeys
**So that** I can distinguish them from regular chats

**Acceptance Criteria:**
- [ ] Journey conversations show a small journey icon next to the title
- [ ] Journey conversations can optionally show the journey category (Foundation, etc.)
- [ ] Sidebar item otherwise behaves identically to regular conversations

### US-004: Resume a Journey Conversation
**As a** user who started a journey earlier
**I want** to continue where I left off by selecting the conversation
**So that** I don't lose my progress

**Acceptance Criteria:**
- [ ] Selecting a journey conversation from sidebar loads it normally
- [ ] The journey system prompt continues to be used for new messages
- [ ] Previous messages are displayed as with any conversation

### US-005: Journey Opening Message
**As a** user who just started a journey
**I want** Claude to greet me and begin the journey
**So that** I don't have to figure out how to start

**Acceptance Criteria:**
- [ ] When a journey conversation is created, Claude sends the first message
- [ ] The opening message welcomes the user and introduces the journey
- [ ] The opening reflects the journey's tone and purpose

---

## Technical Specification

### Journey Data Structure

```typescript
// In shared/types.ts
interface JourneyInfo {
  id: string;           // e.g., 'what-do-you-need'
  title: string;        // e.g., 'What Do You Actually Need?'
  category: 'foundation' | 'understanding' | 'deeper';
  axes: string[];       // Axes this journey explores
  systemPrompt: string; // The full system prompt for Claude
}

// Conversation metadata addition
interface ConversationMetadata {
  // ... existing fields
  journey_id: string | null;  // null for regular chats
}
```

### Journey Registry

Create a registry that loads and parses journey prompts from markdown files at startup.

```typescript
// src/main/journeys.ts
interface JourneyRegistry {
  getJourney(id: string): JourneyInfo | null;
  getAllJourneys(): JourneyInfo[];
  getJourneysByCategory(category: string): JourneyInfo[];
}
```

### Database Schema Addition

```sql
-- Add journey_id column to conversations table
ALTER TABLE conversations ADD COLUMN journey_id TEXT;
```

### IPC Channels

| Channel | Direction | Payload | Response |
|---------|-----------|---------|----------|
| `journeys:list` | renderer → main | none | `JourneyInfo[]` |
| `journeys:start` | renderer → main | `{ journeyId: string }` | `{ conversationId: string }` |

---

## Phases

### Phase 1: Journey Registry and Data Layer
**Goal:** Load journey data from markdown files and expose via IPC

**Files to Create:**
| File | Purpose |
|------|---------|
| `src/main/journeys.ts` | Journey registry: parse markdown, extract prompts, expose getters |

**Files to Modify:**
| File | Changes |
|------|---------|
| `src/main/db/schema.sql` | Add `journey_id` column to conversations |
| `src/main/db/conversations.ts` | Support `journey_id` in create/get operations |
| `src/main/ipc.ts` | Add `journeys:list` and `journeys:start` handlers |
| `src/preload/index.ts` | Expose journey IPC methods |
| `src/shared/types.ts` | Add `JourneyInfo` type |

**Acceptance Criteria:**
- [ ] `journeys:list` returns all 10 journeys with their system prompts
- [ ] Journey prompts are correctly extracted from markdown code blocks
- [ ] `journeys:start` creates a conversation with `journey_id` set

### Phase 2: Journey Conversation Flow
**Goal:** Journey conversations use journey-specific system prompts

**Files to Modify:**
| File | Changes |
|------|---------|
| `src/main/context.ts` | Check for journey_id, load journey prompt instead of default |
| `src/main/prompts/response.ts` | Add `buildJourneyPrompt()` function |
| `src/main/ipc.ts` | On journey start, generate opening message from Claude |

**Acceptance Criteria:**
- [ ] When `journey_id` is set, `assembleContext` uses journey prompt
- [ ] Journey prompt includes dynamic context (profile summary, recent messages)
- [ ] Opening message is generated and saved when journey starts

### Phase 3: Frontend Integration
**Goal:** Connect JourneysPage to the backend and handle navigation

**Files to Modify:**
| File | Changes |
|------|---------|
| `src/renderer/components/JourneysPage.tsx` | Call `journeys:start`, handle response |
| `src/renderer/App.tsx` | Handle journey start: create conversation, switch to chat tab |
| `src/renderer/components/ConversationSidebar.tsx` | Show journey indicator on journey conversations |

**Acceptance Criteria:**
- [ ] "Begin Journey" calls backend and creates conversation
- [ ] User is navigated to Chat tab with new conversation active
- [ ] Journey conversations show visual indicator in sidebar

### Phase 4: Journey Opening Message
**Goal:** Claude sends the first message to start the journey

**Files to Modify:**
| File | Changes |
|------|---------|
| `src/main/ipc.ts` | After creating journey conversation, generate opening message |
| `src/main/prompts/journey-opening.ts` | Template for journey opening prompt |

**Acceptance Criteria:**
- [ ] Opening message appears immediately in new journey conversation
- [ ] Opening is warm, inviting, and matches the journey's tone
- [ ] User can respond naturally to continue the journey

---

## Files Summary

### Files to Create
| File | Purpose |
|------|---------|
| `src/main/journeys.ts` | Journey registry: loading, parsing, and accessing journey data |
| `src/main/prompts/journey-opening.ts` | Prompt template for generating journey opening messages |

### Files to Modify
| File | Changes |
|------|---------|
| `src/main/db/schema.sql` | Add `journey_id TEXT` column to conversations table |
| `src/main/db/conversations.ts` | Add `journey_id` to create/get/list operations |
| `src/main/context.ts` | Load journey prompt when `journey_id` is present |
| `src/main/prompts/response.ts` | Add `buildJourneyPrompt()` for journey conversations |
| `src/main/ipc.ts` | Add journey IPC handlers, generate opening message |
| `src/preload/index.ts` | Expose `journeys.list()` and `journeys.start()` |
| `src/shared/types.ts` | Add `JourneyInfo` interface |
| `src/renderer/components/JourneysPage.tsx` | Call `onStartJourney` with IPC integration |
| `src/renderer/App.tsx` | Handle journey start callback, switch tabs |
| `src/renderer/components/ConversationSidebar.tsx` | Show journey indicator icon |

---

## Verification Checklist

### Automated
- [ ] `make check` passes (typecheck, lint, build)
- [ ] Unit tests for journey registry parsing
- [ ] Integration test: start journey, verify conversation created

### Manual
1. [ ] Open Journeys tab, browse all 10 journeys
2. [ ] Click "Begin Journey" on "What Do You Actually Need?"
3. [ ] Verify: navigated to Chat tab with new conversation
4. [ ] Verify: Claude's opening message appears (not user-initiated)
5. [ ] Verify: conversation title is "What Do You Actually Need?"
6. [ ] Respond to Claude's opening message
7. [ ] Verify: Claude's response follows the journey's conversational style
8. [ ] Verify: conversation appears in sidebar with journey indicator
9. [ ] Close app, reopen, select the journey conversation
10. [ ] Verify: journey prompt continues to be used for new messages
11. [ ] Start a different journey, verify it works independently
12. [ ] Verify: regular (non-journey) conversations still work normally

---

## Implementation Notes

### Parsing Journey Prompts from Markdown

Journey markdown files contain a system prompt in a code block after the "## System Prompt" header. The parser should:

1. Find the `## System Prompt` section
2. Extract the content between ``` markers
3. Trim whitespace and store as the journey's system prompt

Example regex pattern:
```typescript
const promptMatch = markdown.match(/## System Prompt\s*```[\s\S]*?\n([\s\S]*?)```/);
```

### Journey Prompt Integration

The journey prompt should replace the generic response prompt but still include:
- Profile context (values, challenges, current situation)
- Recent conversation history
- Basic humanization guidelines (anti-AI-tells)

Structure:
```
[JOURNEY SYSTEM PROMPT from markdown]

---

CONTEXT ABOUT THIS USER:
[Profile summary - values, challenges, situation]

CONVERSATION SO FAR:
[Recent messages]
```

### Opening Message Generation

When a journey starts, we need Claude to send the first message. This requires:

1. Creating the conversation with `journey_id`
2. Generating an opening message using a dedicated prompt:
   ```
   You are beginning a guided journey called "[Journey Title]".

   Generate a warm, inviting opening message that:
   - Welcomes the user to this exploration
   - Briefly introduces what you'll be exploring together
   - Asks an opening question to begin the journey

   Keep it to 2-3 short paragraphs. Be warm and natural.
   ```
3. Saving the assistant message to the conversation
4. Returning the conversation ID (UI will load and display)

### Sidebar Journey Indicator

Add a small icon (compass, map, or layers) next to journey conversation titles. Use the journey category color as an accent if desired.

```tsx
{conversation.journey_id && (
  <svg className="journey-icon" ... />
)}
```

---

## Future Considerations

- **Journey recommendations**: Suggest next journey based on profile completeness
- **Journey progress tracking**: Show which phases the user has explored
- **Journey completion celebration**: Special UI when journey insights are synthesized
- **Re-take journeys**: Allow users to start a fresh journey for the same topic
- **Journey insights summary**: Show what was learned at the end of a journey
