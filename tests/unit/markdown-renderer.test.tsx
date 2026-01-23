import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownRenderer } from '../../src/renderer/components/MarkdownRenderer';
import { ThemeProvider } from '../../src/renderer/contexts/ThemeContext';

// Helper to render with ThemeProvider
function renderWithTheme(component: React.ReactElement) {
  return render(<ThemeProvider>{component}</ThemeProvider>);
}

// Mock matchMedia for ThemeProvider
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false, // Default to light mode
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
  localStorage.clear();
});

describe('US-001: Basic Markdown Rendering', () => {
  it('US-001: renders *italic* as <em> tag', () => {
    renderWithTheme(<MarkdownRenderer content="*emphasis*" />);
    const em = screen.getByText('emphasis');
    expect(em.tagName).toBe('EM');
  });

  it('US-001: renders **bold** as <strong> tag', () => {
    renderWithTheme(<MarkdownRenderer content="**strong**" />);
    const strong = screen.getByText('strong');
    expect(strong.tagName).toBe('STRONG');
  });

  it('US-001: renders paragraphs with margin-bottom', () => {
    const content = `Para 1

Para 2`;
    renderWithTheme(<MarkdownRenderer content={content} />);
    const para1 = screen.getByText('Para 1');
    expect(para1.tagName).toBe('P');
    expect(para1).toHaveStyle({ marginBottom: '12px' });
  });

  it('US-001: renders - item as <ul><li>', () => {
    const content = `- item one
- item two`;
    renderWithTheme(<MarkdownRenderer content={content} />);
    const list = screen.getByRole('list');
    expect(list.tagName).toBe('UL');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('US-001: renders 1. item as <ol><li>', () => {
    const content = `1. first
2. second`;
    renderWithTheme(<MarkdownRenderer content={content} />);
    const list = screen.getByRole('list');
    expect(list.tagName).toBe('OL');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});

describe('US-002: Styled Markdown Elements', () => {
  it('US-002: paragraph text uses Georgia font', () => {
    renderWithTheme(<MarkdownRenderer content="Some text here" />);
    const p = screen.getByText('Some text here');
    expect(p).toHaveStyle({ fontFamily: 'Georgia, "Times New Roman", serif' });
  });

  it('US-002: bold text has font-weight 600', () => {
    renderWithTheme(<MarkdownRenderer content="**strong**" />);
    const strong = screen.getByText('strong');
    expect(strong).toHaveStyle({ fontWeight: '600' });
  });

  it('US-002: lists have padding-left 24px', () => {
    renderWithTheme(<MarkdownRenderer content="- item" />);
    const ul = screen.getByRole('list');
    expect(ul).toHaveStyle({ paddingLeft: '24px' });
  });

  it('US-002: blockquotes have left border in accent color', () => {
    renderWithTheme(<MarkdownRenderer content="> quote text" />);
    const blockquote = screen.getByText('quote text').closest('blockquote');
    // In light theme, accent color is #c4956a
    expect(blockquote).toHaveStyle({ borderLeft: '3px solid #c4956a' });
  });
});

describe('US-003: Streaming Compatibility', () => {
  it('US-003: incomplete markdown renders without error', () => {
    expect(() => {
      renderWithTheme(<MarkdownRenderer content="*incomplete" />);
    }).not.toThrow();
    // Incomplete markdown should render as plain text
    expect(screen.getByText('*incomplete')).toBeInTheDocument();
  });

  it('US-003: complete markdown formats immediately on rerender', () => {
    const { rerender } = renderWithTheme(<MarkdownRenderer content="*incomp" />);
    // Simulate streaming completion
    rerender(<ThemeProvider><MarkdownRenderer content="*complete*" /></ThemeProvider>);
    const em = screen.getByText('complete');
    expect(em.tagName).toBe('EM');
  });

  it('US-003: mixed content with complete and incomplete markdown', () => {
    renderWithTheme(<MarkdownRenderer content="This is *complete* but this is *not" />);
    // The complete part should be formatted
    const em = screen.getByText('complete');
    expect(em.tagName).toBe('EM');
  });
});

describe('Security: Element Restrictions', () => {
  it('blocks image elements', () => {
    renderWithTheme(<MarkdownRenderer content="![alt](http://example.com/img.png)" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('blocks link elements', () => {
    renderWithTheme(<MarkdownRenderer content="[link](http://example.com)" />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('blocks heading elements', () => {
    renderWithTheme(<MarkdownRenderer content="# Heading" />);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
