# Know Thyself

AI-guided self-reflection desktop app. Users converse with Claude; system extracts psychological insights (values, challenges, Maslow signals) for pattern recognition.

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
4. **Tests required** → every feature needs Playwright tests (80%+ coverage)
5. **Use make targets** → not `npm run` directly

## Domain Terms

| Term | Meaning |
|------|---------|
| **Maslow signals** | User needs mapped to hierarchy (physiological → safety → belonging → esteem → self-actualization) |
| **Extractions** | AI-parsed insights from conversation: values, challenges, patterns |
| **Evidence** | Quotes from messages that support/link to extracted insights |
| **Confidence** | 0.0-1.0 score indicating certainty of an extraction |
| **Profile summary** | Computed psychological profile from accumulated signals |
