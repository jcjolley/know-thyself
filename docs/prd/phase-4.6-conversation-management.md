# Phase 4.6: Conversation Management UI

## Overview

Enable users to manage multiple conversations - starting new ones, resuming old ones, and organizing their reflection history. Currently the app has a single implicit conversation thread; this phase adds explicit conversation management with titles, search, and navigation.

## Problem Statement

Users currently cannot:
- Start a fresh conversation without losing context
- Return to previous conversations to continue a line of thinking
- Find past conversations by topic or content
- See an overview of their reflection journey over time

This limits the app's usefulness for long-term self-reflection where users may want to explore different topics in separate threads.

## Goals

- [ ] Users can create and switch between multiple conversations
- [ ] Conversations have meaningful titles (auto-generated or user-set)
- [ ] Users can find past conversations through search
- [ ] Conversation list provides helpful metadata (date, message count, preview)

## Non-Goals

- **Not implementing conversation merging** - No combining conversations
- **Not adding conversation tagging/folders** - Simple flat list for now
- **Not building conversation export** - Export is a separate feature
- **Not adding conversation sharing** - Single-user app
- **Not implementing conversation archiving** - Delete or keep, no archive state
- **Not changing the extraction pipeline** - Extractions continue to work per-message as before
- **Not adding conversation-level insights** - Profile remains cross-conversation

---

## User Stories

### US-461: View Conversation List

**As a** user
**I want** to see a list of all my conversations
**So that** I can find and resume past discussions

**Acceptance Criteria:**
- [ ] Conversation list visible in a collapsible sidebar panel (left side)
- [ ] Each conversation shows: title, last message date, message count
- [ ] Conversations sorted by last activity (most recent first)
- [ ] Current conversation highlighted in the list
- [ ] Empty state when no conversations exist (prompts to start first one)

### US-462: Start New Conversation

**As a** user
**I want** to start a fresh conversation
**So that** I can explore a new topic without mixing contexts

**Acceptance Criteria:**
- [ ] "New Conversation" button prominently displayed at top of sidebar
- [ ] Clicking creates a new empty conversation and switches to it
- [ ] New conversation starts with a welcoming empty state in chat
- [ ] Previous conversation preserved (can switch back to it)
- [ ] Keyboard shortcut: Ctrl/Cmd+N creates new conversation

### US-463: Resume Old Conversation

**As a** user
**I want** to click on a past conversation to resume it
**So that** I can continue a previous line of thinking

**Acceptance Criteria:**
- [ ] Clicking a conversation in the list loads its messages in the chat area
- [ ] Chat history displays all previous messages
- [ ] Sending a new message adds to that conversation
- [ ] Scroll position starts at bottom (most recent)
- [ ] Loading indicator while fetching messages

### US-464: Auto-Generate Conversation Title

**As a** user
**I want** conversations to have meaningful titles automatically
**So that** I can identify them later without manual effort

**Acceptance Criteria:**
- [ ] New conversations start with title "New Conversation"
- [ ] After first user message, title auto-generates from message content
- [ ] Title generation uses first ~50 chars of first message, truncated at word boundary
- [ ] If first message is very short (< 10 chars), use "Conversation - [date]"
- [ ] Title updates only once (on first message), not on subsequent messages

### US-465: Edit Conversation Title

**As a** user
**I want** to rename a conversation
**So that** I can give it a more meaningful title

**Acceptance Criteria:**
- [ ] Double-click on conversation title in list enables inline editing
- [ ] Press Enter to save, Escape to cancel
- [ ] Title limited to 100 characters
- [ ] Empty title reverts to auto-generated title
- [ ] Title persists to database immediately on save

### US-466: Delete Conversation

**As a** user
**I want** to delete conversations I no longer need
**So that** I can keep my list organized

**Acceptance Criteria:**
- [ ] Delete button (trash icon) appears on hover over conversation item
- [ ] Clicking delete shows confirmation dialog: "Delete this conversation? This cannot be undone."
- [ ] Confirmation has "Delete" and "Cancel" buttons
- [ ] Deleting removes conversation and all its messages from database
- [ ] If deleted conversation was active, switch to most recent remaining conversation
- [ ] If no conversations remain, show empty state with "Start your first conversation"

### US-467: Search Conversations

**As a** user
**I want** to search through my conversations
**So that** I can find discussions about specific topics

**Acceptance Criteria:**
- [ ] Search input at top of conversation sidebar
- [ ] Search filters conversations by title and message content
- [ ] Results update as user types (debounced 300ms)
- [ ] Matching conversations shown with highlighted match context
- [ ] Clear button (X) resets search to show all conversations
- [ ] "No results" message when search finds nothing

### US-468: View Conversation Preview

**As a** user
**I want** to see a preview of each conversation
**So that** I can identify conversations without opening them

**Acceptance Criteria:**
- [ ] Each conversation item shows first ~60 chars of most recent message
- [ ] Preview text is muted/secondary color
- [ ] Preview truncates with ellipsis if longer
- [ ] Preview updates when new messages are added

### US-469: Toggle Sidebar Visibility

**As a** user
**I want** to collapse the conversation sidebar
**So that** I can focus on the current chat

**Acceptance Criteria:**
- [ ] Toggle button (hamburger or chevron) collapses/expands sidebar
- [ ] Collapsed state shows only icons (new conversation button)
- [ ] Keyboard shortcut: Ctrl/Cmd+B toggles sidebar
- [ ] Sidebar state persists across sessions (localStorage)
- [ ] Smooth animation on toggle (200ms slide)

---

## Technical Design

### Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Conversation   │────►│  IPC Handlers   │────►│  SQLite DB      │
│  Sidebar (React)│◄────│  (Main)         │◄────│  (messages.ts)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  Chat Page      │────►│  Context/State  │
│  (React)        │     │  (conversation) │
└─────────────────┘     └─────────────────┘
```

### Schema Changes

Add `title` column to conversations table:

```sql
-- Migration: Add title column to conversations
ALTER TABLE conversations ADD COLUMN title TEXT DEFAULT 'New Conversation';
```

### New IPC Channels

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `conversations:list` | R→M | Get all conversations with metadata |
| `conversations:create` | R→M | Create new empty conversation |
| `conversations:get` | R→M | Get single conversation with messages |
| `conversations:updateTitle` | R→M | Update conversation title |
| `conversations:delete` | R→M | Delete conversation and its messages |
| `conversations:search` | R→M | Search conversations by title/content |

### IPC Interfaces

```typescript
interface ConversationListItem {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    message_count: number;
    preview: string | null;  // First ~60 chars of last message
}

interface ConversationWithMessages {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    messages: Message[];
}

interface ConversationSearchResult {
    id: string;
    title: string;
    updated_at: string;
    match_context: string;  // Snippet with match highlighted
}
```

### Component Structure

```
src/renderer/
├── App.tsx                        # Add sidebar state management
├── components/
│   ├── ConversationSidebar.tsx    # Main sidebar container
│   ├── ConversationList.tsx       # List of conversation items
│   ├── ConversationItem.tsx       # Single conversation row
│   ├── ConversationSearch.tsx     # Search input component
│   ├── NewConversationButton.tsx  # Create new button
│   ├── DeleteConfirmDialog.tsx    # Confirmation modal
│   ├── EditableTitle.tsx          # Inline title editing
│   └── ChatPage.tsx               # Modified to accept conversationId
```

### State Management

```typescript
// App-level state (in App.tsx or context)
interface ConversationState {
    conversations: ConversationListItem[];
    activeConversationId: string | null;
    sidebarCollapsed: boolean;
    searchQuery: string;
}

// Actions
type ConversationAction =
    | { type: 'SET_CONVERSATIONS'; payload: ConversationListItem[] }
    | { type: 'SET_ACTIVE'; payload: string }
    | { type: 'ADD_CONVERSATION'; payload: ConversationListItem }
    | { type: 'UPDATE_CONVERSATION'; payload: Partial<ConversationListItem> & { id: string } }
    | { type: 'DELETE_CONVERSATION'; payload: string }
    | { type: 'TOGGLE_SIDEBAR' }
    | { type: 'SET_SEARCH'; payload: string };
```

### Title Generation Logic

```typescript
function generateTitle(firstMessage: string): string {
    if (firstMessage.length < 10) {
        return `Conversation - ${formatDate(new Date())}`;
    }

    // Truncate at word boundary around 50 chars
    let title = firstMessage.substring(0, 60);
    const lastSpace = title.lastIndexOf(' ');
    if (lastSpace > 40) {
        title = title.substring(0, lastSpace);
    }

    // Remove trailing punctuation except period
    title = title.replace(/[,;:!?]+$/, '');

    return title.length > 50 ? title.substring(0, 50) + '...' : title;
}
```

### Search Query Implementation

```sql
-- Search conversations by title and message content
SELECT DISTINCT
    c.id,
    c.title,
    c.updated_at,
    COALESCE(
        (SELECT content FROM messages
         WHERE conversation_id = c.id AND content LIKE ?
         ORDER BY created_at DESC LIMIT 1),
        c.title
    ) as match_context
FROM conversations c
LEFT JOIN messages m ON m.conversation_id = c.id
WHERE c.title LIKE ? OR m.content LIKE ?
ORDER BY c.updated_at DESC
LIMIT 50;
```

---

## Phases

### Phase 4.6.1: Schema Migration and Core IPC

**Goal:** Database updated, basic CRUD operations working

**Files to Create:**
| File | Purpose |
|------|---------|
| `src/main/db/conversations.ts` | Conversation CRUD operations |

**Files to Modify:**
| File | Changes |
|------|---------|
| `src/main/db/sqlite.ts` | Add migration for title column |
| `src/main/ipc.ts` | Add conversation IPC handlers |
| `src/preload/index.ts` | Expose conversation API methods |
| `src/shared/types.ts` | Add ConversationListItem, etc. interfaces |

**Implementation Details:**

1. Add migration in `sqlite.ts`:
```typescript
// In runMigrations()
const conversationsInfo = database.prepare("PRAGMA table_info(conversations)").all() as { name: string }[];
const hasTitle = conversationsInfo.some(col => col.name === 'title');

if (!hasTitle) {
    console.log('Migration: Adding title column to conversations table');
    database.exec(`ALTER TABLE conversations ADD COLUMN title TEXT DEFAULT 'New Conversation'`);
}
```

2. Create `conversations.ts` with:
- `listConversations()` - Returns all conversations with message count and preview
- `createConversation()` - Creates new conversation, returns it
- `getConversation(id)` - Returns conversation with all messages
- `updateConversationTitle(id, title)` - Updates title
- `deleteConversation(id)` - Deletes conversation and messages
- `searchConversations(query)` - Searches by title/content

**Verification:**
- [ ] Migration adds title column without data loss
- [ ] `conversations:list` returns conversations with metadata
- [ ] `conversations:create` creates new conversation
- [ ] `conversations:delete` removes conversation and messages
- [ ] `make check` passes

### Phase 4.6.2: Sidebar UI Foundation

**Goal:** Conversation sidebar rendering with list

**Files to Create:**
| File | Purpose |
|------|---------|
| `src/renderer/components/ConversationSidebar.tsx` | Sidebar container |
| `src/renderer/components/ConversationList.tsx` | List component |
| `src/renderer/components/ConversationItem.tsx` | Single row item |
| `src/renderer/components/NewConversationButton.tsx` | Create button |

**Files to Modify:**
| File | Changes |
|------|---------|
| `src/renderer/App.tsx` | Add sidebar with state management |
| `src/renderer/components/ChatPage.tsx` | Accept conversationId prop |

**Implementation Details:**

1. Update `App.tsx` layout:
```typescript
<div style={{ display: 'flex', height: '100vh' }}>
    <ConversationSidebar
        conversations={conversations}
        activeId={activeConversationId}
        collapsed={sidebarCollapsed}
        onSelect={handleSelectConversation}
        onNew={handleNewConversation}
        onToggle={handleToggleSidebar}
    />
    <main style={{ flex: 1 }}>
        {/* Tab navigation and content */}
    </main>
</div>
```

2. Sidebar styling matches existing warm design:
- Background: `#f5f2ed`
- Border: `1px solid var(--chat-border)`
- Width: `280px` expanded, `48px` collapsed

**Verification:**
- [ ] Sidebar displays on left side of app
- [ ] Conversations list shows all conversations
- [ ] Current conversation highlighted
- [ ] New conversation button visible
- [ ] `make check` passes

### Phase 4.6.3: Conversation Switching and Creation

**Goal:** Users can create new conversations and switch between them

**Files to Modify:**
| File | Changes |
|------|---------|
| `src/renderer/App.tsx` | Wire up conversation switching |
| `src/renderer/components/ChatPage.tsx` | Load messages for selected conversation |
| `src/main/ipc.ts` | Update chat handlers to use provided conversationId |
| `src/main/db/messages.ts` | Modify `getOrCreateConversation` to accept optional id |

**Implementation Details:**

1. Update chat IPC to accept conversationId:
```typescript
ipcMain.on('chat:stream', async (event, message: string, conversationId?: string) => {
    // If conversationId provided, use it; otherwise create/get latest
    const conversation = conversationId
        ? await getConversationById(conversationId)
        : await getOrCreateConversation();
    // ...
});
```

2. ChatPage loads history for active conversation:
```typescript
useEffect(() => {
    if (conversationId) {
        loadHistory(conversationId);
    }
}, [conversationId]);
```

3. Auto-generate title on first message:
```typescript
// In chat:stream handler, after saving first user message
const messageCount = getMessageCount(conversation.id);
if (messageCount === 1 && conversation.title === 'New Conversation') {
    const newTitle = generateTitle(message);
    updateConversationTitle(conversation.id, newTitle);
}
```

**Verification:**
- [ ] Clicking "New Conversation" creates new conversation
- [ ] Clicking conversation in list loads its messages
- [ ] Sending message updates the correct conversation
- [ ] Title auto-generates after first message
- [ ] Ctrl/Cmd+N creates new conversation
- [ ] `make check` passes

### Phase 4.6.4: Title Editing and Deletion

**Goal:** Users can edit titles and delete conversations

**Files to Create:**
| File | Purpose |
|------|---------|
| `src/renderer/components/EditableTitle.tsx` | Inline edit component |
| `src/renderer/components/DeleteConfirmDialog.tsx` | Confirmation modal |

**Files to Modify:**
| File | Changes |
|------|---------|
| `src/renderer/components/ConversationItem.tsx` | Add edit and delete functionality |
| `src/renderer/App.tsx` | Handle delete confirmation flow |

**Implementation Details:**

1. EditableTitle component:
- Double-click activates edit mode
- Input with title value
- Enter saves, Escape cancels
- Blur saves if value changed

2. Delete flow:
- Hover reveals delete icon (trash)
- Click opens DeleteConfirmDialog
- Confirm deletes and switches to next conversation
- Cancel closes dialog

**Verification:**
- [ ] Double-click enables title editing
- [ ] Enter saves new title
- [ ] Escape cancels editing
- [ ] Delete button shows on hover
- [ ] Confirmation dialog appears before delete
- [ ] After delete, switches to another conversation
- [ ] `make check` passes

### Phase 4.6.5: Search and Sidebar Toggle

**Goal:** Search functionality and collapsible sidebar

**Files to Create:**
| File | Purpose |
|------|---------|
| `src/renderer/components/ConversationSearch.tsx` | Search input |

**Files to Modify:**
| File | Changes |
|------|---------|
| `src/renderer/components/ConversationSidebar.tsx` | Add search, toggle collapse |
| `src/renderer/App.tsx` | Handle sidebar state persistence |
| `src/main/ipc.ts` | Add search handler |
| `src/main/db/conversations.ts` | Add search function |

**Implementation Details:**

1. Search component:
- Input with search icon
- Clear button (X) when has value
- Debounced onChange (300ms)

2. Search handler queries both title and message content:
```typescript
function searchConversations(query: string): ConversationSearchResult[] {
    const pattern = `%${query}%`;
    return db.prepare(`
        SELECT DISTINCT c.id, c.title, c.updated_at,
            SUBSTR(COALESCE(m.content, c.title), 1, 60) as match_context
        FROM conversations c
        LEFT JOIN messages m ON m.conversation_id = c.id
        WHERE c.title LIKE ? OR m.content LIKE ?
        ORDER BY c.updated_at DESC
        LIMIT 50
    `).all(pattern, pattern) as ConversationSearchResult[];
}
```

3. Sidebar toggle:
- Collapse button in sidebar header
- Saves state to localStorage
- Smooth CSS transition

**Verification:**
- [ ] Search filters conversations by title
- [ ] Search filters conversations by message content
- [ ] Clear button resets search
- [ ] Sidebar collapses with button click
- [ ] Ctrl/Cmd+B toggles sidebar
- [ ] Sidebar state persists after reload
- [ ] `make check` passes

### Phase 4.6.6: Polish and Testing

**Goal:** Complete tests and UX polish

**Files to Create:**
| File | Purpose |
|------|---------|
| `tests/conversations.spec.ts` | E2E tests for conversation management |

**Files to Modify:**
| File | Changes |
|------|---------|
| All conversation components | Loading states, error handling, animations |
| `tests/helpers/electron.ts` | Add conversation helpers if needed |

**Verification:**
- [ ] All user stories have passing tests
- [ ] Loading indicators during data fetch
- [ ] Error handling for failed operations
- [ ] Animations smooth and not jarring
- [ ] `make check` passes
- [ ] `make test-coverage` >= 80%

---

## Files Summary

### Files to Create

| File | Purpose |
|------|---------|
| `src/main/db/conversations.ts` | Conversation CRUD operations |
| `src/renderer/components/ConversationSidebar.tsx` | Sidebar container |
| `src/renderer/components/ConversationList.tsx` | List of conversations |
| `src/renderer/components/ConversationItem.tsx` | Single conversation row |
| `src/renderer/components/ConversationSearch.tsx` | Search input |
| `src/renderer/components/NewConversationButton.tsx` | Create new button |
| `src/renderer/components/EditableTitle.tsx` | Inline title editing |
| `src/renderer/components/DeleteConfirmDialog.tsx` | Delete confirmation |
| `tests/conversations.spec.ts` | E2E tests |

### Files to Modify

| File | Changes |
|------|---------|
| `src/main/db/sqlite.ts` | Add migration for title column |
| `src/main/ipc.ts` | Add 6 conversation IPC handlers |
| `src/main/db/messages.ts` | Update to accept conversationId |
| `src/preload/index.ts` | Expose conversation API methods |
| `src/shared/types.ts` | Add conversation interfaces |
| `src/renderer/App.tsx` | Add sidebar, manage conversation state |
| `src/renderer/components/ChatPage.tsx` | Accept conversationId, load specific history |

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

### Functional Requirements

- [ ] US-461: Conversation list shows all conversations with metadata
- [ ] US-462: New conversation button creates fresh conversation
- [ ] US-463: Clicking conversation loads its messages
- [ ] US-464: Titles auto-generate from first message
- [ ] US-465: Double-click enables inline title editing
- [ ] US-466: Delete with confirmation removes conversation
- [ ] US-467: Search filters by title and content
- [ ] US-468: Preview shows recent message snippet
- [ ] US-469: Sidebar toggles and persists state

### Manual Verification

1. [ ] Launch app with empty database -> Shows "Start your first conversation"
2. [ ] Click New Conversation -> Creates conversation, shows empty chat
3. [ ] Send first message -> Title updates to message summary
4. [ ] Create second conversation -> Both visible in sidebar
5. [ ] Click between conversations -> Chat content switches correctly
6. [ ] Double-click title -> Inline edit activates
7. [ ] Edit and press Enter -> Title saved
8. [ ] Hover conversation -> Delete button appears
9. [ ] Click delete -> Confirmation dialog shows
10. [ ] Confirm delete -> Conversation removed, switches to next
11. [ ] Type in search -> List filters to matches
12. [ ] Click sidebar toggle -> Sidebar collapses
13. [ ] Ctrl/Cmd+B -> Sidebar toggles
14. [ ] Reload app -> Sidebar state preserved
15. [ ] Ctrl/Cmd+N -> New conversation created

---

## Implementation Order

1. **Schema migration** - Add title column to conversations
2. **IPC handlers** - Create conversation CRUD operations
3. **Sidebar component** - Basic layout with conversation list
4. **Conversation switching** - Load messages for selected conversation
5. **New conversation** - Create and switch to new conversation
6. **Title auto-generation** - Generate title from first message
7. **Title editing** - Inline edit functionality
8. **Delete functionality** - With confirmation dialog
9. **Search** - Filter conversations by title/content
10. **Sidebar toggle** - Collapse/expand with persistence
11. **Polish** - Animations, loading states, error handling
12. **Tests** - E2E tests for all user stories

---

## Open Questions

- [ ] Should we limit conversation history retention? (e.g., auto-archive after 6 months)
- [ ] Should deleted conversations be soft-deleted for potential recovery?
- [ ] Should sidebar width be resizable?

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Performance with many conversations | Medium | Virtualize list if > 100 conversations |
| Search slow with large message volumes | Low | Index conversation content, limit results |
| Accidental deletion | Medium | Confirmation dialog required |
| Title generation produces poor titles | Low | User can always edit manually |
| State sync between sidebar and chat | Medium | Lift state to App level, use context |

---

## Design Notes

### Visual Consistency

The sidebar should match the warm, journal-like aesthetic:
- Same color palette as chat and profile pages
- Subtle shadows and borders
- Georgia/serif fonts for titles
- Muted colors for metadata

### Conversation Item Layout

```
┌────────────────────────────────────┐
│ [icon] My thoughts on career       │  <- Title (truncated)
│        3 messages - Today          │  <- Metadata
│        I've been thinking about... │  <- Preview (muted)
│                              [del] │  <- Delete on hover
└────────────────────────────────────┘
```

### Empty State

```
┌────────────────────────────────────┐
│                                    │
│        [conversation icon]         │
│                                    │
│    Start your first conversation   │
│                                    │
│    Begin your journey of          │
│    self-reflection by starting    │
│    a new conversation.            │
│                                    │
│    [  + New Conversation  ]       │
│                                    │
└────────────────────────────────────┘
```

### Keyboard Shortcuts Summary

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd+N | New conversation |
| Ctrl/Cmd+B | Toggle sidebar |
| Ctrl/Cmd+P | Open profile (existing) |
| Enter | Save title edit |
| Escape | Cancel title edit |

---

## Future Considerations (Out of Scope)

- Conversation folders/tags for organization
- Drag-and-drop to reorder conversations
- Pin important conversations to top
- Conversation templates (e.g., "Daily check-in")
- Bulk operations (delete multiple)
- Conversation export (JSON, PDF)
- Conversation sharing between devices
