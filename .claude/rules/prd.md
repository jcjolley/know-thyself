# PRD Rules for AI Coding Agents

## Core Philosophy

PRDs for AI agents serve as **programming interfaces**, not alignment documents. They must be precise enough to execute, structured enough to sequence, and constrained enough to prevent scope drift.

> "The specification becomes the source of truth and determines what gets built." — GitHub Engineering, 2025

---

## Structure Requirements

### 1. Use Predictable Sections
Every PRD must include:
- **Overview** - 1-2 sentences max
- **Non-Goals** - Explicit scope boundaries (AI cannot infer from omission)
- **User Stories** - Atomic, testable requirements
- **Phases** - Dependency-ordered implementation steps
- **Files Summary** - Explicit file paths
- **Verification Checklist** - Testable completion criteria

### 2. Write for Sequential Execution
AI agents perform better with dependency-ordered, testable phases:

```
Phase 1: Database/data layer (foundation)
Phase 2: Core logic/hooks (builds on Phase 1)
Phase 3: UI components (consumes Phase 2)
Phase 4: Integration/wiring
Phase 5: Polish and edge cases
```

**Why**: Human developers debug mid-stream; AI agents execute as written. Incomplete foundations compound into implementation failures.

### 3. Keep Each Phase Self-Contained
Each phase should:
- Build on completed previous phases
- Be testable independently
- Produce working (if incomplete) code
- Have clear acceptance criteria

---

## Writing Guidelines

### Be Literal and Specific
Write as if explaining to a very literal-minded junior developer:

| Avoid | Prefer |
|-------|--------|
| "Handle errors gracefully" | "Display error toast with message from API response" |
| "Make it fast" | "Page load under 2 seconds on 3G" |
| "Support mobile" | "Full width panel at viewport < 768px" |
| "Clean up the UI" | "Add 16px padding, remove unused button" |

### Use Atomic User Stories
Each story should be completable in one agent session:
- Describable in 2-3 sentences
- Has 3-5 specific acceptance criteria
- Maps to 1-3 files maximum

**Format**:
```markdown
### US-001: [Descriptive Title]
**As a** [specific user type]
**I want** [single capability]
**So that** [measurable benefit]

**Acceptance Criteria:**
- [ ] Given [context], when [action], then [result]
```

### Write Testable Acceptance Criteria
Use Given-When-Then or explicit conditions:

| Vague | Testable |
|-------|----------|
| "Form validates correctly" | "Form displays validation error below invalid field within 100ms" |
| "Looks good on mobile" | "Button width is 100% at viewport < 480px" |
| "Handles edge cases" | "Shows 'No results' message when API returns empty array" |

---

## File References

### Always Specify Paths
```markdown
**File:** `ui/src/hooks/useFeature.ts`
```

### List All Affected Files
```markdown
## Files to Create
| File | Purpose |
|------|---------|
| `ui/src/components/Feature/Feature.tsx` | Main component |

## Files to Modify
| File | Changes |
|------|---------|
| `ui/src/App.tsx` | Add Feature to render tree |
```

### Include Code Structures
When introducing new patterns, show the shape:
```typescript
interface FeatureState {
  items: Item[];
  isLoading: boolean;
  error: string | null;
}
```

---

## Scope Management

### Explicit Non-Goals
AI cannot infer scope from omission. Always state:
```markdown
## Non-Goals
- Not refactoring existing authentication
- Not adding new API endpoints
- Out of scope: accessibility audit
```

### Protect Existing Functionality
Explicitly state what must not change:
```markdown
## Constraints
- Must not modify existing localStorage keys
- Carousel animation timing must remain unchanged
- API response format is fixed
```

---

## Quality Gates

### Define Verification Commands
```markdown
## Quality Gates
- `npm run typecheck` - Type checking passes
- `npm run lint` - No linting errors
- `npm run test` - All tests pass
- `npm run build` - Build succeeds
```

### Include Manual Verification
```markdown
## Verification Checklist
1. [ ] Click X → Y appears
2. [ ] Refresh page → State persists
3. [ ] Resize to mobile → Layout adapts
```

---

## Anti-Patterns to Avoid

### Don't Write Monolithic Specs
Split large features into multiple PRDs or clearly separated phases.

### Don't Use Relative References
```markdown
# Bad
See the component mentioned above...

# Good
See `ui/src/components/Feature/Feature.tsx`
```

### Don't Assume Context
Every PRD should be understandable in isolation. Include necessary background.

### Don't Mix Concerns
Keep each section focused:
- Overview = what and why
- User Stories = user-facing requirements
- Technical Specs = implementation details
- Phases = execution order

---

## Template Location

Reference template: `docs/prd/TEMPLATE.md`

---

## Workflow Integration

1. **Before implementing**: Read full PRD, ask clarifying questions
2. **During implementation**: Follow phases sequentially, mark completed items
3. **After each phase**: Verify against acceptance criteria and quality gates
4. **On completion**: Run full verification checklist

---

## Sources

This guidance synthesizes best practices from:
- [Anthropic Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
- [ChatPRD Best Practices for Claude Code](https://www.chatprd.ai/resources/PRD-for-Claude-Code)
- [Writing PRDs for AI Coding Agents](https://medium.com/@haberlah/how-to-write-prds-for-ai-coding-agents-d60d72efb797) (Jan 2026)
- [Claude Code for Product Managers](https://ccforpms.com/advanced/write-prd)
- [AI PRD Template by Miqdad Jaffer](https://www.productcompass.pm/p/ai-prd-template)
- [How to Write PRD for Vibe Coding Tools](https://theaidya.com/how-to-write-a-prd-for-vibe-coding-tools)
- [Ralph TUI PRD Format](https://ralph-tui.com/docs/cli/create-prd)
- [Claude Code Modular Rules](https://claude-blog.setec.rs/blog/claude-code-rules-directory)
