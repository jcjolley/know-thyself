# Testing Rules

## Requirements

| Requirement | Threshold |
|-------------|-----------|
| Code Coverage | >= 80% |
| All Tests Pass | Required |
| Test per User Story | Required |

## Test Structure

```
tests/
├── helpers/
│   └── electron.ts    # Shared utilities (launchApp, closeApp)
└── *.spec.ts          # Test files, one per user story
```

## Writing Tests

1. Each user story (US-XXX) must have a corresponding `tests/<feature>.spec.ts` file
2. Use shared helpers from `tests/helpers/electron.ts`:
   - `launchApp()` - Start Electron app
   - `closeApp()` - Clean shutdown
3. Tests run sequentially (Electron constraint - single worker)

## Before Committing

```bash
make test              # Run all tests
make test-coverage     # Verify 80%+ coverage
```

## Debugging Tests

```bash
# Run single test with UI
npx playwright test tests/app-launch.spec.ts --headed --debug

# View trace on failure
npx playwright show-trace test-results/*/trace.zip
```

## Test Patterns

**Basic test structure:**
```typescript
import { test, expect } from '@playwright/test';
import { launchApp, closeApp, getPage } from './helpers/electron';

test.describe('Feature Name', () => {
  test.beforeAll(async () => { await launchApp(); });
  test.afterAll(async () => { await closeApp(); });

  test('US-XXX: descriptive name', async () => {
    const page = getPage();
    // assertions
  });
});
```
