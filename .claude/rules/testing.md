# Testing Rules

## Requirements

| Requirement | Threshold |
|-------------|-----------|
| Code Coverage | >= 80% |
| All Tests Pass | Required |
| Unit Test per User Story | Required |
| E2E Test per PRD | Required |

## Test Structure

```
tests/
├── helpers/
│   └── electron.ts       # Shared utilities (launchApp, closeApp)
├── unit/
│   └── <feature>.test.ts # Unit tests for user stories
└── <prd-name>.spec.ts    # E2E tests for complete PRD flows
```

## Test Types

### Unit Tests (per User Story)
- Location: `tests/unit/<feature>.test.ts`
- Purpose: Validate each acceptance criterion for a user story
- Naming: Reference the user story ID (e.g., `US-001`)

### E2E Tests (per PRD)
- Location: `tests/<prd-name>.spec.ts`
- Purpose: Verify complete feature works end-to-end
- Scope: Test the full user flow after all phases complete

## Writing Tests

1. Each user story (US-XXX) must have a unit test in `tests/unit/`
2. Each PRD must have an E2E test in `tests/`
3. Use shared helpers from `tests/helpers/electron.ts`:
   - `launchApp()` - Start Electron app
   - `closeApp()` - Clean shutdown
4. E2E tests run sequentially (Electron constraint - single worker)

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

### Unit Test (User Story)
Test names must reference the user story ID from the PRD (e.g., `US-001`):

```typescript
// tests/unit/markdown-renderer.test.ts
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

describe('US-001: Basic Markdown Rendering', () => {
  it('US-001: renders *italic* as italic text', () => {
    render(<MarkdownRenderer content="*emphasis*" />);
    expect(screen.getByText('emphasis').tagName).toBe('EM');
  });

  it('US-001: renders **bold** as bold text', () => {
    render(<MarkdownRenderer content="**strong**" />);
    expect(screen.getByText('strong').tagName).toBe('STRONG');
  });
});

describe('US-002: Styled Markdown Elements', () => {
  it('US-002: italic text uses Georgia font', () => { ... });
});
```

### E2E Test (PRD)
E2E tests verify complete flows. Reference the PRD phase and relevant user stories:

```typescript
// tests/markdown-rendering.spec.ts
import { test, expect } from '@playwright/test';
import { launchApp, closeApp, getPage } from './helpers/electron';

test.describe('Phase 6.1: Markdown Rendering', () => {
  test.beforeAll(async () => { await launchApp(); });
  test.afterAll(async () => { await closeApp(); });

  test('US-001/US-003: renders markdown in streamed assistant messages', async () => {
    const page = getPage();
    // Send message, wait for response, verify markdown renders during streaming
  });
});
```
