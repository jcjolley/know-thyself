# Phase 11: Quote Reply

## Overview

Enable users to click on any paragraph in an assistant message to quote it in their reply, facilitating focused discussion on specific points.

## Problem Statement

When assistant messages contain multiple ideas or paragraphs, users may want to respond to a specific point. Currently, they must manually copy text or reference it vaguely. A direct quote-reply mechanism would make conversations more focused and contextual.

## Goals

- [ ] Make assistant message paragraphs clickable
- [ ] Insert clicked text as a blockquote in the input
- [ ] Provide clear visual feedback for clickable areas
- [ ] Maintain seamless UX during streaming (disable until complete)

## Non-Goals

- Quoting user messages (only assistant messages)
- Multi-paragraph selection (one click = one paragraph)
- Nested quote support (no quotes within quotes)
- Persisting quote references in message history
- Mobile long-press (hover/click only for now)

## Constraints

- Must not interfere with existing markdown rendering
- Must work with theme system (light/dark mode)
- Must not break during message streaming
- Quote format must be standard markdown (`> text`)

---

## User Stories

### US-001: Click to Quote Paragraph
**As a** user reading an assistant's response
**I want** to click on a specific paragraph
**So that** I can quote it in my reply

**Acceptance Criteria:**
- [ ] Clicking a paragraph in an assistant message inserts it into the input
- [ ] The inserted text is prefixed with `> ` (markdown blockquote)
- [ ] A blank line follows the quote for the user's response
- [ ] The input textarea receives focus after insertion
- [ ] The cursor is positioned after the quote, ready for typing

### US-002: Visual Hover Feedback
**As a** user
**I want** visual indication that paragraphs are clickable
**So that** I discover and understand the feature

**Acceptance Criteria:**
- [ ] Paragraphs in assistant messages show subtle hover effect
- [ ] Cursor changes to pointer on hover
- [ ] Background highlight uses theme-aware accent color (low opacity)
- [ ] Hover effect has smooth transition (150ms)
- [ ] A small quote icon appears on hover (right side of paragraph)
- [ ] Quote icon uses theme-aware muted color

### US-003: Disable During Streaming
**As a** user
**I want** quote functionality disabled while message is streaming
**So that** I don't accidentally quote incomplete content

**Acceptance Criteria:**
- [ ] Paragraphs are not clickable while `isStreaming` is true
- [ ] No hover effect during streaming
- [ ] Quote functionality enables once streaming completes

### US-004: Append to Existing Input
**As a** user who has already started typing
**I want** quotes to append to my existing input
**So that** I don't lose what I've written

**Acceptance Criteria:**
- [ ] If input is empty, quote is inserted at start
- [ ] If input has content, quote is prepended with blank line separator
- [ ] Existing user text moves below the quote
- [ ] Focus and cursor position at end of input

### US-005: Quote Formatting
**As a** user
**I want** quotes formatted clearly
**So that** the assistant understands what I'm referencing

**Acceptance Criteria:**
- [ ] Single-line paragraphs: `> quoted text`
- [ ] Multi-line paragraphs: each line prefixed with `> `
- [ ] Two blank lines after quote before user text
- [ ] Preserves basic formatting (bold, italic) as plain text

---

## Technical Design

### Phase 1: MarkdownRenderer Enhancement

**File:** `src/renderer/components/MarkdownRenderer.tsx`

```typescript
interface MarkdownRendererProps {
    content: string;
    onParagraphClick?: (text: string) => void;  // NEW
    isClickable?: boolean;  // NEW - false during streaming
}
```

Modify the `p` component:
```typescript
p: ({ children }) => {
    const textContent = extractTextContent(children);
    const isQuotable = onParagraphClick && isClickable;

    return (
        <p
            style={{
                ...paragraphStyle,
                cursor: isQuotable ? 'pointer' : 'inherit',
                transition: 'background-color 150ms ease',
            }}
            onClick={isQuotable ? () => onParagraphClick(textContent) : undefined}
            onMouseEnter={isQuotable ? handleHoverEnter : undefined}
            onMouseLeave={isQuotable ? handleHoverLeave : undefined}
        >
            {children}
        </p>
    );
}
```

Helper function to extract text:
```typescript
function extractTextContent(children: React.ReactNode): string {
    if (typeof children === 'string') return children;
    if (Array.isArray(children)) {
        return children.map(extractTextContent).join('');
    }
    if (React.isValidElement(children) && children.props?.children) {
        return extractTextContent(children.props.children);
    }
    return '';
}
```

### Phase 2: ChatPage Integration

**File:** `src/renderer/components/ChatPage.tsx`

Add quote handler:
```typescript
const handleQuoteClick = useCallback((text: string) => {
    // Format as blockquote
    const quotedText = text
        .split('\n')
        .map(line => `> ${line}`)
        .join('\n');

    // Append to existing input or set new
    setInput(prev => {
        if (prev.trim()) {
            return `${quotedText}\n\n${prev}`;
        }
        return `${quotedText}\n\n`;
    });

    // Focus textarea and position cursor at end
    setTimeout(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
            const length = textareaRef.current.value.length;
            textareaRef.current.setSelectionRange(length, length);
        }
    }, 0);
}, []);
```

Update MessageBubble to pass props:
```typescript
<MarkdownRenderer
    content={message.content}
    onParagraphClick={handleQuoteClick}
    isClickable={!isStreaming}
/>
```

### Phase 3: Visual Feedback

**Hover styles (in MarkdownRenderer):**
```typescript
const [hoveredParagraph, setHoveredParagraph] = useState<number | null>(null);

// For each paragraph, track index and apply hover style
const hoverStyle = isHovered ? {
    backgroundColor: 'var(--chat-accent-soft)',
    borderRadius: '4px',
    margin: '-4px -8px',
    padding: '4px 8px',
} : {};
```

**Quote icon on hover (required for affordance):**
```typescript
// Wrap paragraph in relative container for icon positioning
<div style={{ position: 'relative' }}>
    <p style={paragraphStyle} onClick={...}>
        {children}
    </p>
    {isHovered && (
        <span style={{
            position: 'absolute',
            top: '50%',
            right: -4,
            transform: 'translateY(-50%)',
            color: 'var(--chat-text-muted)',
            opacity: 0.7,
            fontSize: 14,
            pointerEvents: 'none',
            transition: 'opacity 150ms ease',
        }}>
            <QuoteIcon />  {/* SVG quote/reply icon */}
        </span>
    )}
</div>
```

**QuoteIcon SVG:**
```typescript
const QuoteIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21" />
        <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1" />
    </svg>
);
```

---

## Files Summary

### Files to Modify
| File | Changes |
|------|---------|
| `src/renderer/components/MarkdownRenderer.tsx` | Add click handler, hover states, text extraction |
| `src/renderer/components/ChatPage.tsx` | Add `handleQuoteClick`, pass to MessageBubble/MarkdownRenderer |

### Files to Create
| File | Purpose |
|------|---------|
| `tests/unit/quote-reply.test.tsx` | Unit tests for text extraction and formatting |
| `tests/web/quote-reply.spec.ts` | E2E tests for click-to-quote flow |

---

## Test Plan

### Unit Tests (`tests/unit/quote-reply.test.tsx`)

```typescript
describe('US-001: Click to Quote', () => {
    it('extracts plain text from paragraph');
    it('extracts text from nested elements (bold, italic)');
    it('formats single line as blockquote');
    it('formats multi-line text with > prefix on each line');
});

describe('US-004: Append to Existing Input', () => {
    it('inserts quote at start when input is empty');
    it('prepends quote when input has content');
    it('adds blank line separator');
});

describe('US-005: Quote Formatting', () => {
    it('preserves line breaks in quoted text');
    it('strips markdown formatting to plain text');
});
```

### E2E Tests (`tests/web/quote-reply.spec.ts`)

```typescript
test('US-001: clicking paragraph inserts quote in input', async ({ page }) => {
    // Send a message, wait for response
    // Click on a paragraph in the response
    // Verify input contains quoted text with > prefix
});

test('US-002: paragraph shows hover effect and quote icon', async ({ page }) => {
    // Hover over paragraph
    // Verify cursor is pointer
    // Verify background color change
    // Verify quote icon appears
});

test('US-003: quote disabled during streaming', async ({ page }) => {
    // Start a message, while streaming
    // Verify paragraphs are not clickable
    // Wait for stream to complete
    // Verify paragraphs become clickable
});
```

---

## Visual Design

### Hover State
```
┌─────────────────────────────────────────────────────┐
│ ASSISTANT                                           │
├─────────────────────────────────────────────────────┤
│                                                     │
│  That's a great question about finding balance.    │
│                                                     │
│ ┌───────────────────────────────────────────────┐  │
│ │ One approach is to start with small,          │❝ │  ← Hovered paragraph
│ │ sustainable changes rather than dramatic      │  │    - highlighted bg
│ │ overhauls.                                    │  │    - quote icon on right
│ └───────────────────────────────────────────────┘  │
│                                                     │
│  Another thing to consider is...                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Quote Icon Appearance:**
- Position: Right edge of paragraph, vertically centered
- Size: 14×14px
- Color: `var(--chat-text-muted)` at 70% opacity
- Appears only on hover (with 150ms fade-in)

### After Click
```
┌─────────────────────────────────────────────────────┐
│  > One approach is to start with small,            │
│  > sustainable changes rather than dramatic        │
│  > overhauls.                                      │
│                                                     │
│  |  ← Cursor here, ready for user's response       │
└─────────────────────────────────────────────────────┘
```

### Color Tokens
```typescript
// Hover background (theme-aware)
const quoteHoverBg = isDark
    ? 'rgba(212, 165, 116, 0.08)'  // Warm amber, very subtle
    : 'rgba(196, 149, 106, 0.08)';

// Transition
const hoverTransition = 'background-color 150ms ease, padding 150ms ease';
```

---

## Quality Gates

```bash
make typecheck    # Type checking passes
make lint         # No linting errors
make test-unit    # Unit tests pass
make test         # E2E tests pass
make build        # Build succeeds
```

---

## Verification Checklist

1. [ ] Hover over assistant paragraph → background highlights, cursor changes
2. [ ] Hover over assistant paragraph → quote icon appears on right
3. [ ] Click paragraph → text appears in input with `> ` prefix
4. [ ] Input receives focus after click
5. [ ] Cursor positioned at end, ready to type
6. [ ] Click when input has text → quote prepended, existing text preserved
7. [ ] Hover during streaming → no highlight, no icon, not clickable
8. [ ] After streaming completes → paragraphs become clickable
9. [ ] Works in light mode (icon visible)
10. [ ] Works in dark mode (icon visible)
11. [ ] User messages are NOT clickable (only assistant)
12. [ ] Multi-line paragraphs quoted correctly
13. [ ] Text with bold/italic extracts as plain text

---

## Design Decisions

1. **Paragraph-level granularity** - Clicking quotes entire paragraph, not individual sentences. Simpler UX and implementation.

2. **Prepend vs append** - Quote is prepended to existing input so user's cursor ends up at the end, ready to type their response.

3. **No visual quote in message** - The original message stays unchanged. The quote only appears in the input. This keeps the conversation clean.

4. **Markdown blockquote format** - Using `> ` prefix is standard markdown and will render correctly if we ever show quotes in the chat history.

5. **Disabled during streaming** - Prevents quoting incomplete text and avoids UX confusion.

6. **Subtle hover** - Low-opacity background change rather than bold borders. Discoverable but not distracting.

7. **No mobile long-press** - Keeping scope small. Can add in future phase if needed.
