# Know Thyself

AI-guided self-reflection desktop app. Users converse with Claude; system extracts psychological insights to guide the user towards self actualization

## Quick Start

- **Architecture**: Read [`ARCHITECTURE.md`](./ARCHITECTURE.md) for tech overview, file reference, IPC channels, diagrams
- **Commands**: Run `make help` for all commands. Key: `make dev`, `make test`, `make check`
- **Testing**: See [`.claude/rules/testing.md`](./.claude/rules/testing.md) for test requirements
- **PRD Format**: See [`.claude/rules/prd.md`](./.claude/rules/prd.md) for writing specifications

## CRITICAL: API Key Security

**NEVER expose `ANTHROPIC_API_KEY`** in code, logs, commits, output, or chat.

- `.env` is gitignored and must NEVER be committed
- If asked to show env vars or debug config, ALWAYS redact the API key
- Treat as equivalent to a password

## Key Constraints

1. **ESM in main process** → use `.js` extensions in imports
2. **Relative imports only** in `src/main/` (no `@/` path aliases)
3. **CommonJS in preload** → separate tsconfig, different module system
4. **Tests required** → see testing rules below
5. **Use make targets** → not `npm run` directly

## Testing Requirements

| Scope | Requirement | Location |
|-------|-------------|----------|
| **User Story** | Unit test for each US-XXX | `tests/unit/<feature>.test.ts` |
| **PRD** | E2E test for complete flow | `tests/<prd-name>.spec.ts` |
| **Coverage** | 80%+ code coverage | `make test-coverage` |

Every PRD implementation must include:
- Unit tests validating each user story's acceptance criteria
- E2E Playwright test verifying the complete feature works

## Domain Terms

| Term | Meaning |
|------|---------|
| **Axis** | A psychological dimension tracked by the system (15+ total) |
| **Extractions** | AI-parsed insights from conversation: values, challenges, signals |
| **Evidence** | Quotes from messages that support extracted insights |
| **Confidence** | 0.0-1.0 score indicating certainty of an extraction |
| **Completeness** | How much data exists for a given axis (0-100%) |
| **Profile** | Accumulated signals across all psychological axes |

### Psychological Axes

See [`AXIS_REFERENCE_LIBRARY.md`](./AXIS_REFERENCE_LIBRARY.md) for full definitions, detection signals, and advice implications.

| Tier | Axes | Purpose |
|------|------|---------|
| **1 - Essential** | Maslow Status, Support-Seeking Style, Life Situation, Immediate Intent | Avoid bad advice; gather first |
| **2 - Early Inference** | Core Values (Schwartz), Challenges, Goals, Moral Foundations (Haidt) | Improve personalization |
| **3 - Personality** | Big Five (OCEAN), Risk Tolerance, Motivation Style | Frame advice delivery |
| **4 - Deeper Patterns** | Attachment Style, Locus of Control, Temporal Orientation, Growth Mindset, + more | Emerge over time |

## Post-Verification: Code Simplification

After completing verification for any feature or phase:

1. **Run verification** → `make check`
2. **Run code simplifier** → `/code-simplifier:code-simplifier`
3. **Re-verify** → `make check`
