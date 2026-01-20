# Phase 3.4: User Profile Edit

## Overview

Enable users to edit and delete extracted profile data (values, challenges, goals). This implements the core transparency principle that users should be able to correct mistakes in the system's understanding of them.

## Problem Statement

The system extracts psychological insights from conversations, but extraction is imperfect. Users need the ability to:
- Correct inaccurate descriptions or labels
- Remove extractions that are completely wrong
- Maintain trust in the system by having full control over their data

Currently, ProfileSummary.tsx shows values, challenges, goals, and signals in a read-only view with no edit or delete capabilities.

## Goals

- [ ] Users can edit text content of values, challenges, and goals
- [ ] Users can delete incorrect extractions with appropriate confirmation
- [ ] Changes persist immediately to the database
- [ ] UI provides clear feedback on edit/delete actions

## Non-Goals

- **Not editing psychological signals** - Signals are derived from evidence patterns; users can already downvote them (Phase 3.4 voting)
- **Not editing Maslow signals** - These are conversation-scoped inferences, not user-correctable facts
- **Not adding new items manually** - Items come from extraction only; manual addition is a future feature
- **Not implementing undo/history** - Simple edit/delete without version history
- **Not bulk operations** - Edit/delete one item at a time
- **Not changing evidence** - Evidence quotes are immutable conversation records

---

## User Stories

### US-341: Edit Value Name and Description

**As a** user
**I want** to edit the name and description of an extracted value
**So that** I can correct inaccuracies in how the system describes my values

**Acceptance Criteria:**
- [ ] Each value card has an edit button (pencil icon) visible on hover
- [ ] Clicking edit opens an inline edit form with current name and description
- [ ] Name field is required, description is optional
- [ ] Save button commits changes to database immediately
- [ ] Cancel button discards changes and returns to view mode
- [ ] Visual feedback shows when save is in progress (loading state)
- [ ] Updated value appears immediately in the list without page refresh

### US-342: Edit Challenge Description

**As a** user
**I want** to edit the description of an extracted challenge
**So that** I can correct how the system has characterized my challenges

**Acceptance Criteria:**
- [ ] Each challenge card has an edit button visible on hover
- [ ] Clicking edit opens inline edit form with description and status dropdown
- [ ] Status options: "Active", "Resolved", "Recurring"
- [ ] Description is required (non-empty)
- [ ] Save commits changes immediately
- [ ] Cancel discards changes

### US-343: Edit Goal Description and Status

**As a** user
**I want** to edit goal descriptions, status, and timeframe
**So that** I can keep my goals accurate and up-to-date

**Acceptance Criteria:**
- [ ] Each goal card has an edit button visible on hover
- [ ] Edit form includes: description (required), status dropdown, timeframe dropdown
- [ ] Status options: "Stated", "In Progress", "Achieved", "Abandoned"
- [ ] Timeframe options: "Short-term", "Medium-term", "Long-term", "None"
- [ ] Save commits changes immediately
- [ ] Cancel discards changes

### US-344: Delete Value with Confirmation

**As a** user
**I want** to delete an incorrectly extracted value
**So that** wrong assumptions don't influence the system's understanding of me

**Acceptance Criteria:**
- [ ] Each value card has a delete button (trash icon) visible on hover
- [ ] Clicking delete shows a confirmation dialog: "Delete this value? This cannot be undone."
- [ ] Dialog has "Cancel" and "Delete" buttons
- [ ] Confirming delete removes value from database and UI immediately
- [ ] Associated evidence records are also deleted
- [ ] Cancel returns to normal view

### US-345: Delete Challenge with Confirmation

**As a** user
**I want** to delete an incorrectly extracted challenge
**So that** I can remove challenges that don't reflect my reality

**Acceptance Criteria:**
- [ ] Each challenge card has a delete button visible on hover
- [ ] Clicking delete shows confirmation dialog
- [ ] Confirming removes challenge and associated evidence from database
- [ ] UI updates immediately

### US-346: Delete Goal with Confirmation

**As a** user
**I want** to delete an incorrectly extracted goal
**So that** I can remove goals that were misinterpreted

**Acceptance Criteria:**
- [ ] Each goal card has a delete button visible on hover
- [ ] Clicking delete shows confirmation dialog
- [ ] Confirming removes goal and associated evidence from database
- [ ] UI updates immediately

---

## Technical Design

### Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  ProfileSummary │────>│  IPC Handlers   │────>│  SQLite DB      │
│  (Edit/Delete)  │<────│  (Main)         │<────│  (profile.ts)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                                              │
        │  Optimistic UI update                        │
        └──────────────────────────────────────────────┘
```

### New IPC Channels

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `profile:updateValue` | R->M | Update value name/description |
| `profile:deleteValue` | R->M | Delete value and evidence |
| `profile:updateChallenge` | R->M | Update challenge description/status |
| `profile:deleteChallenge` | R->M | Delete challenge and evidence |
| `profile:updateGoal` | R->M | Update goal description/status/timeframe |
| `profile:deleteGoal` | R->M | Delete goal and evidence |

### IPC Interfaces

```typescript
// Value operations
interface UpdateValueRequest {
    id: string;
    name: string;
    description: string | null;
}

interface DeleteItemRequest {
    id: string;
}

interface UpdateChallengeRequest {
    id: string;
    description: string;
    status: 'active' | 'resolved' | 'recurring';
}

interface UpdateGoalRequest {
    id: string;
    description: string;
    status: 'stated' | 'in_progress' | 'achieved' | 'abandoned';
    timeframe: 'short_term' | 'medium_term' | 'long_term' | null;
}

interface MutationResponse {
    success: boolean;
    error?: string;
}
```

### Component Changes

```
src/renderer/components/
├── ProfileSummary.tsx        # Modify: Add edit/delete handlers, pass to cards
├── ValueCard.tsx             # New: Extracted from ProfileSummary, with edit mode
├── ChallengeCard.tsx         # New: Extracted with edit mode
├── GoalCard.tsx              # New: Extracted with edit mode
├── EditableField.tsx         # New: Reusable inline edit component
├── ConfirmDialog.tsx         # New: Reusable confirmation modal
└── ProfileCardActions.tsx    # New: Edit/delete button group
```

### Database Operations

```typescript
// src/main/db/profile.ts

function updateValue(id: string, name: string, description: string | null): void {
    const db = getDb();
    db.prepare(`
        UPDATE user_values
        SET name = ?, description = ?, last_reinforced = ?
        WHERE id = ?
    `).run(name, description, new Date().toISOString(), id);
}

function deleteValue(id: string): void {
    const db = getDb();
    // Delete evidence first (foreign key constraint)
    db.prepare(`DELETE FROM evidence WHERE target_type = 'value' AND target_id = ?`).run(id);
    db.prepare(`DELETE FROM user_values WHERE id = ?`).run(id);
}

function updateChallenge(id: string, description: string, status: string): void {
    const db = getDb();
    db.prepare(`
        UPDATE challenges
        SET description = ?, status = ?, last_mentioned = ?
        WHERE id = ?
    `).run(description, status, new Date().toISOString(), id);
}

function deleteChallenge(id: string): void {
    const db = getDb();
    db.prepare(`DELETE FROM evidence WHERE target_type = 'challenge' AND target_id = ?`).run(id);
    db.prepare(`DELETE FROM challenges WHERE id = ?`).run(id);
}

function updateGoal(id: string, description: string, status: string, timeframe: string | null): void {
    const db = getDb();
    db.prepare(`
        UPDATE goals
        SET description = ?, status = ?, timeframe = ?, last_mentioned = ?
        WHERE id = ?
    `).run(description, status, timeframe, new Date().toISOString(), id);
}

function deleteGoal(id: string): void {
    const db = getDb();
    db.prepare(`DELETE FROM evidence WHERE target_type = 'goal' AND target_id = ?`).run(id);
    db.prepare(`DELETE FROM goals WHERE id = ?`).run(id);
}
```

---

## Phases

### Phase 1: IPC Handlers and Database Functions

**Goal:** Backend support for update/delete operations

**Files to Create:**
| File | Purpose |
|------|---------|
| (none) | All additions to existing files |

**Files to Modify:**
| File | Changes |
|------|---------|
| `src/main/db/profile.ts` | Add `updateValue`, `deleteValue`, `updateChallenge`, `deleteChallenge`, `updateGoal`, `deleteGoal` functions |
| `src/main/ipc.ts` | Add 6 new IPC handlers for profile mutations |
| `src/preload/index.ts` | Expose new profile mutation methods |
| `src/shared/types.ts` | Add request/response interfaces for mutations |

**Verification:**
- [ ] New functions exist in profile.ts
- [ ] IPC handlers registered in ipc.ts
- [ ] Methods exposed via preload
- [ ] `make typecheck` passes

### Phase 2: UI Components for Edit/Delete

**Goal:** Create reusable edit and confirmation components

**Files to Create:**
| File | Purpose |
|------|---------|
| `src/renderer/components/EditableField.tsx` | Inline text edit with save/cancel |
| `src/renderer/components/ConfirmDialog.tsx` | Modal confirmation dialog |
| `src/renderer/components/ProfileCardActions.tsx` | Edit/delete button group |

**Files to Modify:**
| File | Changes |
|------|---------|

**Verification:**
- [ ] EditableField renders input and buttons
- [ ] ConfirmDialog shows modal with customizable message
- [ ] ProfileCardActions shows edit/delete icons on hover
- [ ] `make typecheck` passes

### Phase 3: Integrate Edit/Delete into Profile Cards

**Goal:** Wire up edit and delete functionality to existing profile cards

**Files to Create:**
| File | Purpose |
|------|---------|

**Files to Modify:**
| File | Changes |
|------|---------|
| `src/renderer/components/ProfileSummary.tsx` | Extract card components, add edit/delete state management |
| `src/shared/types.ts` | Add `ElectronAPI.profile` mutation methods |

**Verification:**
- [ ] Value cards show edit/delete buttons on hover
- [ ] Challenge cards show edit/delete buttons on hover
- [ ] Goal cards show edit/delete buttons on hover
- [ ] Clicking edit enters edit mode with form
- [ ] Clicking delete shows confirmation dialog
- [ ] `make typecheck` passes

### Phase 4: Integration and Persistence

**Goal:** Complete the edit/delete flow with database persistence

**Files to Modify:**
| File | Changes |
|------|---------|
| `src/renderer/components/ProfileSummary.tsx` | Connect to IPC, handle loading/error states |

**Verification:**
- [ ] Editing a value updates database
- [ ] Deleting a value removes from database and evidence
- [ ] Editing a challenge updates database
- [ ] Deleting a challenge removes from database
- [ ] Editing a goal updates database
- [ ] Deleting a goal removes from database
- [ ] UI updates immediately after mutations
- [ ] Changes persist after app restart
- [ ] `make check` passes

### Phase 5: Tests and Polish

**Goal:** E2E test coverage and UX refinements

**Files to Create:**
| File | Purpose |
|------|---------|
| `tests/profile-edit.spec.ts` | E2E tests for edit functionality |
| `tests/profile-delete.spec.ts` | E2E tests for delete functionality |

**Files to Modify:**
| File | Changes |
|------|---------|
| All profile components | Add loading states, error handling, accessibility attributes |

**Verification:**
- [ ] All user stories have passing tests
- [ ] Edit operations show loading state during save
- [ ] Delete operations show loading state during deletion
- [ ] Error states display on failure
- [ ] `make check` passes
- [ ] `make test-coverage` >= 80%

---

## Files Summary

### Files to Create

| File | Purpose |
|------|---------|
| `src/renderer/components/EditableField.tsx` | Inline edit component |
| `src/renderer/components/ConfirmDialog.tsx` | Confirmation modal |
| `src/renderer/components/ProfileCardActions.tsx` | Edit/delete buttons |
| `tests/profile-edit.spec.ts` | Edit tests |
| `tests/profile-delete.spec.ts` | Delete tests |

### Files to Modify

| File | Changes |
|------|---------|
| `src/main/db/profile.ts` | Add 6 mutation functions |
| `src/main/ipc.ts` | Add 6 IPC handlers |
| `src/preload/index.ts` | Expose profile mutation API |
| `src/shared/types.ts` | Add mutation request/response types |
| `src/renderer/components/ProfileSummary.tsx` | Add edit/delete functionality to cards |

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

- [ ] US-341: Value name and description editable
- [ ] US-342: Challenge description and status editable
- [ ] US-343: Goal description, status, and timeframe editable
- [ ] US-344: Value deletion with confirmation dialog
- [ ] US-345: Challenge deletion with confirmation dialog
- [ ] US-346: Goal deletion with confirmation dialog

### Manual Verification

1. [ ] Navigate to Profile view with existing data
2. [ ] Hover over a value card -> Edit and delete buttons appear
3. [ ] Click edit on value -> Inline form appears with current values
4. [ ] Change name and save -> Value updates in UI and database
5. [ ] Click delete on value -> Confirmation dialog appears
6. [ ] Confirm delete -> Value removed from UI and database
7. [ ] Restart app -> Changes persisted
8. [ ] Repeat for challenges and goals
9. [ ] Cancel edit -> Returns to view mode without changes
10. [ ] Cancel delete -> Returns to view mode without deletion

---

## Implementation Order

1. Add database mutation functions to `src/main/db/profile.ts`
2. Add IPC handlers to `src/main/ipc.ts`
3. Update `src/preload/index.ts` with new API methods
4. Add type definitions to `src/shared/types.ts`
5. Create `EditableField.tsx` component
6. Create `ConfirmDialog.tsx` component
7. Create `ProfileCardActions.tsx` component
8. Modify `ProfileSummary.tsx` to integrate edit/delete
9. Add loading and error states
10. Write E2E tests
11. Run code simplifier

---

## Design Notes

### Edit UX

- Edit mode is inline, not a separate modal
- Form replaces the card content, maintaining position
- Save/Cancel buttons are clearly visible
- Tab key cycles through form fields
- Enter key submits (in single-line fields)
- Escape key cancels

### Delete UX

- Delete button is subtle (ghost style) until hovered
- Confirmation dialog is centered modal
- Dialog uses destructive color for delete button (red)
- Dialog clearly states the action is irreversible
- Cancel is the default/focused button

### Visual Consistency

- Edit/delete buttons match existing vote button styling
- Edit form inputs match app's form styling
- Confirmation dialog matches any existing modal patterns
- Loading states use consistent spinner/animation

### Accessibility

- All buttons have aria-labels
- Edit mode has proper focus management
- Dialog traps focus while open
- Delete confirmation is keyboard navigable
- Screen readers announce state changes

---

## Open Questions

- [x] Should editing require re-extraction or just update the text? -> Just update text
- [x] Should we show a "last edited" timestamp? -> No, keep it simple for now
- [x] Should deleted items be soft-deleted or hard-deleted? -> Hard delete (user explicitly wants it gone)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| User accidentally deletes important data | High | Confirmation dialog required for all deletes |
| Edit doesn't save due to error | Medium | Show error toast, keep edit mode open |
| Evidence orphaned after delete | Low | Delete evidence records in same transaction |
| Performance with many edits | Low | Single-item updates are fast; no batch concerns |
