# [Feature Name]

## Overview
[1-2 sentence summary of what this feature does and why it matters]

## Problem Statement
[What user pain point or business need does this address?]

## Goals
- [ ] [Primary goal with measurable outcome]
- [ ] [Secondary goal]
- [ ] [Optional tertiary goal]

## Non-Goals
[Explicitly state what this feature will NOT do to prevent scope creep]
- Not building [X]
- Not changing [Y]
- Out of scope: [Z]

---

## User Stories

### US-001: [Story Title]
**As a** [user type]
**I want** [specific capability]
**So that** [benefit/outcome]

**Acceptance Criteria:**
- [ ] Given [context], when [action], then [observable result]
- [ ] [Specific testable condition]
- [ ] [Edge case handling]

### US-002: [Story Title]
**As a** [user type]
**I want** [specific capability]
**So that** [benefit/outcome]

**Acceptance Criteria:**
- [ ] [Criterion 1]
- [ ] [Criterion 2]

---

## Phases

### Phase 1: [Foundation/Core]
[Brief description of what this phase accomplishes]

#### 1.1 [Specific Task]
**File:** `path/to/file.ts`

[Implementation details, code snippets if helpful]

```typescript
// Example interface or code structure
interface Example {
  field: type;
}
```

#### 1.2 [Next Task]
**File:** `path/to/file.ts`

[Details]

### Phase 2: [Feature Layer]
[Brief description]

#### 2.1 [Task]
**Files to modify:**
- `path/to/file1.ts` - [What changes]
- `path/to/file2.ts` - [What changes]

### Phase 3: [Integration/Polish]
[Brief description]

---

## Technical Specifications

### Data Models
```typescript
interface FeatureModel {
  id: string;
  // ... fields with types
}
```

### API Changes
[If applicable - endpoints, request/response formats]

### State Management
[How state flows, where it lives, localStorage keys if any]

---

## Files Summary

### Files to Create
| File | Purpose |
|------|---------|
| `path/to/new/file.ts` | [Brief purpose] |
| `tests/unit/<feature>.test.ts` | Unit tests for US-001, US-002, etc. |
| `tests/<prd-name>.spec.ts` | E2E test for complete PRD flow |

### Files to Modify
| File | Changes |
|------|---------|
| `path/to/existing.ts` | [What changes] |

---

## Test Plan

### Unit Tests (per User Story)
**File:** `tests/unit/<feature>.test.ts`

```typescript
describe('US-001: [Story Title]', () => {
  it('US-001: [acceptance criterion 1]', () => { ... });
  it('US-001: [acceptance criterion 2]', () => { ... });
});

describe('US-002: [Story Title]', () => {
  it('US-002: [acceptance criterion 1]', () => { ... });
});
```

### E2E Test (for PRD)
**File:** `tests/<prd-name>.spec.ts`

```typescript
test.describe('[PRD Phase]: [Feature Name]', () => {
  test('US-001/US-002: [complete user flow description]', async () => {
    // Verify end-to-end functionality
  });
});
```

---

## Quality Gates
[Commands that must pass for each phase/story]

- `npm run typecheck` - Type checking passes
- `npm run lint` - No linting errors
- `npm run test` - All tests pass (unit + E2E)
- `npm run build` - Build succeeds
- Unit tests cover all user story acceptance criteria
- E2E test validates complete feature flow

### Post-Verification: Code Simplification
After all quality gates pass, run the code simplifier and re-verify:

1. Run `/code-simplifier:code-simplifier` on modified files
2. Re-run all quality gates above
3. Repeat until no further simplifications are made

---

## Verification Checklist
[Manual verification steps to confirm feature works]

1. [ ] [Specific action] → [Expected result]
2. [ ] [Another action] → [Expected result]
3. [ ] Edge case: [Scenario] → [Expected behavior]
4. [ ] Mobile: [Specific mobile behavior to verify]

---

## Implementation Order
[Numbered list for Claude to follow sequentially]

1. [First thing to build - foundation]
2. [Second thing - builds on #1]
3. [Third thing]
4. [Integration/wiring]
5. [Testing & polish]

---

## Open Questions
[Anything needing clarification before or during implementation]

- [ ] [Question about approach]
- [ ] [Decision that needs user input]

---

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| [Potential issue] | [High/Medium/Low] | [How to handle] |
