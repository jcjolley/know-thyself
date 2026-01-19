# Know Thyself - Development Guidelines

## Development Commands

**All development commands must have a simple `make` target.** Use `make <target>` for all common operations:

| Command | Purpose |
|---------|---------|
| `make install` | Install dependencies |
| `make dev` | Start development servers |
| `make build` | Build for production |
| `make typecheck` | Run TypeScript type checking |
| `make lint` | Run ESLint |
| `make test` | Run all Playwright tests |
| `make test-ui` | Run tests with Playwright UI |
| `make test-coverage` | Run tests with coverage report |
| `make check` | Run all quality gates (typecheck, lint, test) |
| `make clean` | Remove build artifacts |
| `make help` | Show all available commands |

Do not use `npm run <script>` directly - always use the corresponding `make` target.

## Testing Requirements

**Every feature must have corresponding Playwright tests.**

| Requirement | Threshold |
|-------------|-----------|
| Code Coverage | >= 80% |
| All Tests Pass | Required |
| Test per User Story | Required |

### Test Structure
- `tests/helpers/` - Shared test utilities (Electron launcher, etc.)
- `tests/*.spec.ts` - Test files, one per user story

### Writing Tests
1. Each user story (US-XXX) must have a corresponding `tests/<feature>.spec.ts` file
2. Use the shared `launchApp()` and `closeApp()` helpers from `tests/helpers/electron.ts`
3. Tests run sequentially (Electron constraint - single worker)
4. Run `make test` before committing any changes
5. Run `make test-coverage` to verify 80%+ coverage

## Project Structure

- `src/main/` - Electron main process (Node.js)
- `src/preload/` - Preload scripts (contextBridge)
- `src/renderer/` - React UI (Vite)
- `src/shared/` - Shared TypeScript types
- `tests/` - Playwright test files

## Key Constraints

1. **ESM Modules**: Project uses `"type": "module"` - all imports need `.js` extension in main process
2. **Relative Imports in Main**: Use relative paths (not path aliases) in main process files
3. **Separate tsconfigs**: `tsconfig.main.json` for main process, `tsconfig.preload.json` for preload
4. **Environment Variables**: Loaded via `dotenv` at the top of `src/main/index.ts`
5. **Tests Required**: Every feature must have Playwright tests with 80%+ coverage
