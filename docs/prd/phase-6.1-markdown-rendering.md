# Markdown Rendering for Assistant Responses

## Overview
Render assistant responses as formatted markdown instead of plain text, allowing proper display of emphasis, lists, and other formatting that Claude naturally uses.

## Problem Statement
Currently, assistant responses display markdown syntax literally (e.g., `*emphasis*` shows as asterisks instead of italics). This creates a jarring experience and makes responses harder to read. The inner voice prompt encourages natural writing patterns, but the UI fails to render them properly.

## Goals
- [ ] Render assistant messages as formatted markdown
- [ ] Style rendered markdown to match the app's warm, literary aesthetic
- [ ] Maintain streaming behavior with live markdown rendering

## Non-Goals
- Not adding markdown input for user messages
- Not supporting all markdown features (no tables, images, or HTML)
- Not adding a markdown preview/editor
- Not changing how messages are stored (still plain text)

## Constraints
- Must not change user message rendering (stays plain text)
- Must not break existing streaming behavior
- Must use inline styles consistent with ChatPage (no external CSS)
- Message storage format remains unchanged (plain text strings)

---

## User Stories

### US-001: Basic Markdown Rendering
**As a** user reading assistant responses
**I want** emphasis and formatting to render properly
**So that** responses are easier to read and feel more natural

**Acceptance Criteria:**
- [ ] Given assistant response contains `*word*`, when rendered, then "word" displays in italic (`<em>` tag)
- [ ] Given assistant response contains `**word**`, when rendered, then "word" displays in bold (`<strong>` tag)
- [ ] Given assistant response contains two paragraphs separated by blank line, when rendered, then paragraphs have visible vertical spacing (margin-bottom >= 12px)
- [ ] Given assistant response contains `- item`, when rendered, then item displays as bullet point (`<li>` inside `<ul>`)
- [ ] Given assistant response contains `1. item`, when rendered, then item displays as numbered list (`<li>` inside `<ol>`)

### US-002: Styled Markdown Elements
**As a** user
**I want** markdown elements to match the app's aesthetic
**So that** formatted content feels cohesive with the design

**Acceptance Criteria:**
- [ ] Given italic text is rendered, when inspected, then font-family includes "Georgia"
- [ ] Given bold text is rendered, when inspected, then font-weight >= 600
- [ ] Given list is rendered, when inspected, then list has padding-left >= 20px
- [ ] Given blockquote is rendered, when inspected, then element has left border with color `#c4956a`

### US-003: Streaming Compatibility
**As a** user watching a response stream in
**I want** markdown to render progressively
**So that** I see formatted text as it arrives, not raw syntax

**Acceptance Criteria:**
- [ ] Given incomplete markdown `*partial` (no closing), when rendered during stream, then text displays as-is without error
- [ ] Given markdown `*complete*` finishes streaming, when rendered, then "complete" immediately displays as italic
- [ ] Given response streams in over 2 seconds, when observed, then no visible layout jumps or content repositioning occurs

---

## Phases

### Phase 1: Add Markdown Library

#### 1.1 Install react-markdown
```bash
npm install react-markdown
```

`react-markdown` is the standard React markdown renderer. It's lightweight, supports streaming content, and doesn't require `dangerouslySetInnerHTML`.

### Phase 2: Create MarkdownRenderer Component

#### 2.1 Create Component
**File:** `src/renderer/components/MarkdownRenderer.tsx`

Create a styled markdown renderer component that:
- Wraps `react-markdown`
- Provides custom styling for each element type
- Matches the app's design system

```typescript
interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      allowedElements={['p', 'em', 'strong', 'ul', 'ol', 'li', 'blockquote', 'code', 'br']}
      components={{
        p: ({ children }) => <p style={paragraphStyle}>{children}</p>,
        em: ({ children }) => <em style={emphasisStyle}>{children}</em>,
        strong: ({ children }) => <strong style={strongStyle}>{children}</strong>,
        ul: ({ children }) => <ul style={listStyle}>{children}</ul>,
        ol: ({ children }) => <ol style={listStyle}>{children}</ol>,
        li: ({ children }) => <li style={listItemStyle}>{children}</li>,
        blockquote: ({ children }) => <blockquote style={blockquoteStyle}>{children}</blockquote>,
        code: ({ children }) => <code style={codeStyle}>{children}</code>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
```

#### 2.2 Define Markdown Styles
**File:** `src/renderer/components/MarkdownRenderer.tsx`

```typescript
const paragraphStyle: React.CSSProperties = {
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: 15,
  lineHeight: 1.75,
  color: '#3d3630',
  margin: '0 0 12px 0',
};

const emphasisStyle: React.CSSProperties = {
  fontStyle: 'italic',
};

const strongStyle: React.CSSProperties = {
  fontWeight: 600,
  color: '#2d2620',
};

const listStyle: React.CSSProperties = {
  margin: '0 0 12px 0',
  paddingLeft: 24,
  color: '#3d3630',
};

const listItemStyle: React.CSSProperties = {
  marginBottom: 4,
  lineHeight: 1.6,
};

const blockquoteStyle: React.CSSProperties = {
  margin: '0 0 12px 0',
  paddingLeft: 16,
  borderLeft: '3px solid #c4956a',
  fontStyle: 'italic',
  color: '#5a524a',
};

const codeStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  fontSize: 13,
  background: 'rgba(196, 149, 106, 0.1)',
  padding: '2px 6px',
  borderRadius: 4,
};
```

### Phase 3: Integrate into ChatPage

#### 3.1 Update MessageBubble Component
**File:** `src/renderer/components/ChatPage.tsx`

Modify the `MessageBubble` component to use `MarkdownRenderer` for assistant messages only:

```typescript
import { MarkdownRenderer } from './MarkdownRenderer';

function MessageBubble({ message, timestamp, index, isStreaming }: Props) {
  const isUser = message.role === 'user';

  return (
    <div style={bubbleStyle}>
      {isUser ? (
        // User messages: plain text, preserve whitespace
        <p style={userTextStyle}>{message.content}</p>
      ) : (
        // Assistant messages: render as markdown
        <>
          <MarkdownRenderer content={message.content} />
          {isStreaming && <StreamingCursor />}
        </>
      )}
    </div>
  );
}
```

#### 3.2 Handle Streaming Edge Cases
Ensure partial markdown doesn't break rendering:
- Incomplete emphasis (`*partial`) should show as-is until closed
- react-markdown handles this gracefully by default

### Phase 4: Write Tests

#### 4.1 Unit Tests
**File:** `tests/unit/markdown-renderer.test.ts`

Write unit tests covering all acceptance criteria for US-001, US-002, US-003.

#### 4.2 E2E Test
**File:** `tests/markdown-rendering.spec.ts`

Write Playwright E2E test verifying complete flow.

### Phase 5: Polish & Edge Cases

#### 5.1 Verify Element Restrictions
Confirm react-markdown `allowedElements` prop restricts to safe subset:
- Allowed: `p`, `em`, `strong`, `ul`, `ol`, `li`, `blockquote`, `code`, `br`
- Blocked: `img`, `a`, `h1-h6`, `table`, `script`, raw HTML

#### 5.2 Test with Real Responses
Verify rendering with actual Claude responses that include:
- Single emphasis: `*word*`
- Double emphasis: `**word**`
- Mixed: `*this* and **that**`
- Lists with emphasis inside
- Paragraph breaks

---

## Technical Specifications

### Dependencies
```json
{
  "react-markdown": "^9.0.0"
}
```

### Component API
```typescript
interface MarkdownRendererProps {
  content: string;
}
```

Note: react-markdown v10 removed className prop support.

### Styling Approach
Use inline styles consistent with the rest of ChatPage, matching:
- `--chat-text`: `#3d3630`
- `--chat-accent`: `#c4956a`
- Font: Georgia, "Times New Roman", serif
- Line height: 1.75

---

## Files Summary

### Files to Create
| File | Purpose |
|------|---------|
| `src/renderer/components/MarkdownRenderer.tsx` | Styled markdown rendering component |
| `tests/unit/markdown-renderer.test.ts` | Unit tests for US-001, US-002, US-003 |
| `tests/markdown-rendering.spec.ts` | E2E test for complete PRD flow |

### Files to Modify
| File | Changes |
|------|---------|
| `src/renderer/components/ChatPage.tsx` | Import and use MarkdownRenderer in MessageBubble |
| `package.json` | Add react-markdown dependency |

---

## Test Plan

### Unit Tests
**File:** `tests/unit/markdown-renderer.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownRenderer } from '../../src/renderer/components/MarkdownRenderer';

describe('US-001: Basic Markdown Rendering', () => {
  it('US-001: renders *italic* as <em> tag', () => {
    render(<MarkdownRenderer content="*emphasis*" />);
    const em = screen.getByText('emphasis');
    expect(em.tagName).toBe('EM');
  });

  it('US-001: renders **bold** as <strong> tag', () => {
    render(<MarkdownRenderer content="**strong**" />);
    const strong = screen.getByText('strong');
    expect(strong.tagName).toBe('STRONG');
  });

  it('US-001: renders paragraphs with margin-bottom >= 12px', () => {
    render(<MarkdownRenderer content="Para 1\n\nPara 2" />);
    const paragraphs = screen.getAllByRole('paragraph');
    expect(paragraphs[0]).toHaveStyle({ marginBottom: '12px' });
  });

  it('US-001: renders - item as <ul><li>', () => {
    render(<MarkdownRenderer content="- item one\n- item two" />);
    expect(screen.getByRole('list').tagName).toBe('UL');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('US-001: renders 1. item as <ol><li>', () => {
    render(<MarkdownRenderer content="1. first\n2. second" />);
    expect(screen.getByRole('list').tagName).toBe('OL');
  });
});

describe('US-002: Styled Markdown Elements', () => {
  it('US-002: italic text uses Georgia font', () => {
    render(<MarkdownRenderer content="*emphasis*" />);
    const em = screen.getByText('emphasis');
    const p = em.closest('p');
    expect(p).toHaveStyle({ fontFamily: expect.stringContaining('Georgia') });
  });

  it('US-002: bold text has font-weight >= 600', () => {
    render(<MarkdownRenderer content="**strong**" />);
    const strong = screen.getByText('strong');
    expect(strong).toHaveStyle({ fontWeight: '600' });
  });

  it('US-002: lists have padding-left >= 20px', () => {
    render(<MarkdownRenderer content="- item" />);
    const ul = screen.getByRole('list');
    expect(ul).toHaveStyle({ paddingLeft: '24px' });
  });

  it('US-002: blockquotes have left border in accent color', () => {
    render(<MarkdownRenderer content="> quote" />);
    const blockquote = screen.getByText('quote').closest('blockquote');
    expect(blockquote).toHaveStyle({ borderLeft: '3px solid #c4956a' });
  });
});

describe('US-003: Streaming Compatibility', () => {
  it('US-003: incomplete markdown renders without error', () => {
    expect(() => {
      render(<MarkdownRenderer content="*incomplete" />);
    }).not.toThrow();
    expect(screen.getByText('*incomplete')).toBeInTheDocument();
  });

  it('US-003: complete markdown formats immediately', () => {
    const { rerender } = render(<MarkdownRenderer content="*incomp" />);
    rerender(<MarkdownRenderer content="*complete*" />);
    expect(screen.getByText('complete').tagName).toBe('EM');
  });
});
```

### E2E Test
**File:** `tests/markdown-rendering.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { launchApp, closeApp, getPage } from './helpers/electron';

test.describe('Phase 6.1: Markdown Rendering', () => {
  test.beforeAll(async () => { await launchApp(); });
  test.afterAll(async () => { await closeApp(); });

  test('US-001/US-002: assistant messages render formatted markdown', async () => {
    const page = getPage();

    // Navigate to chat, send message that triggers markdown response
    await page.fill('[data-testid="chat-input"]', 'Tell me something with emphasis');
    await page.click('[data-testid="send-button"]');

    // Wait for assistant response
    await page.waitForSelector('[data-testid="assistant-message"]');

    // Verify markdown rendered (no raw asterisks visible)
    const messageText = await page.textContent('[data-testid="assistant-message"]');
    expect(messageText).not.toContain('*');

    // Verify italic elements exist
    const italics = await page.$$('[data-testid="assistant-message"] em');
    expect(italics.length).toBeGreaterThan(0);
  });

  test('US-003: streaming responses render markdown progressively', async () => {
    const page = getPage();

    await page.fill('[data-testid="chat-input"]', 'Give me a list');
    await page.click('[data-testid="send-button"]');

    // During streaming, watch for list elements appearing
    await page.waitForSelector('[data-testid="assistant-message"] ul', { timeout: 10000 });

    // Verify no raw markdown syntax visible
    const content = await page.textContent('[data-testid="assistant-message"]');
    expect(content).not.toMatch(/^- /m);
  });

  test('user messages display literal text (not markdown)', async () => {
    const page = getPage();

    // Send message with asterisks
    await page.fill('[data-testid="chat-input"]', 'I want *literal* asterisks');
    await page.click('[data-testid="send-button"]');

    // Verify user message shows literal asterisks
    const userMessage = await page.textContent('[data-testid="user-message"]:last-of-type');
    expect(userMessage).toContain('*literal*');
  });
});
```

---

## Quality Gates

- `npm run typecheck` - Type checking passes
- `npm run lint` - No linting errors
- `npm run test` - All tests pass (unit + E2E)
- `npm run build` - Build succeeds
- Unit tests cover all acceptance criteria for US-001, US-002, US-003
- E2E test validates complete markdown rendering flow

### Post-Verification: Code Simplification
After all quality gates pass:
1. Run `/code-simplifier:code-simplifier` on modified files
2. Re-run all quality gates above

---

## Verification Checklist

1. [ ] Given response contains `*emphasis*`, when displayed, then text renders as italic (no asterisks visible)
2. [ ] Given response contains `**bold**`, when displayed, then text renders as bold
3. [ ] Given response contains `- item`, when displayed, then bullet list renders
4. [ ] Given response is streaming, when markdown completes, then formatting appears progressively
5. [ ] Given user sends message with `*asterisks*`, when displayed, then asterisks show literally
6. [ ] Given response has multiple paragraphs, when displayed, then proper vertical spacing exists
7. [ ] Given response contains mixed `*italic* and **bold**`, when displayed, then both render correctly

---

## Implementation Order

1. Install react-markdown dependency
2. Create MarkdownRenderer component with styled elements
3. Write unit tests for US-001, US-002, US-003
4. Update MessageBubble to use MarkdownRenderer for assistant messages
5. Test with streaming responses
6. Limit allowed elements for security/simplicity
7. Write E2E test for complete flow
8. Run quality gates and simplify

---

## Open Questions

- [x] Should user messages also render markdown? **No** - keep them as literal text
- [x] Should we support code blocks with syntax highlighting? **No** - not needed for inner voice use case

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Streaming causes flicker | Medium | react-markdown handles partial content well; test thoroughly |
| Overly complex markdown breaks layout | Low | Limit allowed elements via `allowedElements` prop |
| Performance with long messages | Low | react-markdown is lightweight; memoize if needed |
