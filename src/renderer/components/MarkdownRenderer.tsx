import React, { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTheme } from '../contexts/ThemeContext';

interface MarkdownRendererProps {
  content: string;
  onParagraphClick?: (text: string) => void;
  isClickable?: boolean;
}

const allowedElements = [
  'p', 'em', 'strong', 'ul', 'ol', 'li', 'blockquote', 'code', 'br'
];

// Helper to extract plain text from React children
function extractTextContent(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (!children) return '';

  if (Array.isArray(children)) {
    return children.map(extractTextContent).join('');
  }

  if (React.isValidElement(children)) {
    const props = children.props as { children?: React.ReactNode };
    if (props?.children) {
      return extractTextContent(props.children);
    }
  }

  return '';
}

// Quote icon SVG component
function QuoteIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21" />
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1" />
    </svg>
  );
}

export function MarkdownRenderer({ content, onParagraphClick, isClickable = true }: MarkdownRendererProps) {
  const { theme, isDark } = useTheme();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Track paragraph index for hover state
  let paragraphIndex = 0;

  const isQuotable = onParagraphClick && isClickable;

  const paragraphStyle: React.CSSProperties = {
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: 15,
    lineHeight: 1.75,
    color: theme.colors.textPrimary,
    margin: '0 0 12px 0',
  };

  const emphasisStyle: React.CSSProperties = {
    fontStyle: 'italic',
  };

  const strongStyle: React.CSSProperties = {
    fontWeight: 600,
    color: isDark ? theme.colors.textPrimary : '#2d2620',
  };

  const listStyle: React.CSSProperties = {
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: 15,
    lineHeight: 1.75,
    margin: '0 0 12px 0',
    paddingLeft: 24,
    color: theme.colors.textPrimary,
  };

  const listItemStyle: React.CSSProperties = {
    marginBottom: 4,
    lineHeight: 1.6,
  };

  const blockquoteStyle: React.CSSProperties = {
    margin: '0 0 12px 0',
    paddingLeft: 16,
    borderLeft: `3px solid ${theme.colors.accent}`,
    fontStyle: 'italic',
    color: theme.colors.textSecondary,
  };

  const codeStyle: React.CSSProperties = {
    fontFamily: 'monospace',
    fontSize: 13,
    background: theme.colors.accentSoft,
    padding: '2px 6px',
    borderRadius: 4,
  };

  // Hover background color
  const hoverBg = isDark
    ? 'rgba(212, 165, 116, 0.08)'
    : 'rgba(196, 149, 106, 0.08)';

  const handleParagraphClick = useCallback((text: string) => {
    if (onParagraphClick && isClickable) {
      onParagraphClick(text);
    }
  }, [onParagraphClick, isClickable]);

  // Quotable paragraph component
  const QuotableParagraph = ({ children }: { children: React.ReactNode }) => {
    const currentIndex = paragraphIndex++;
    const isHovered = hoveredIndex === currentIndex;
    const textContent = extractTextContent(children);

    if (!isQuotable) {
      return <p style={paragraphStyle}>{children}</p>;
    }

    return (
      <div
        style={{
          position: 'relative',
          margin: '0 0 12px 0',
        }}
        onMouseEnter={() => setHoveredIndex(currentIndex)}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <p
          style={{
            ...paragraphStyle,
            margin: 0,
            cursor: 'pointer',
            padding: '4px 8px',
            marginLeft: -8,
            marginRight: -8,
            borderRadius: 4,
            backgroundColor: isHovered ? hoverBg : 'transparent',
            transition: 'background-color 150ms ease',
          }}
          onClick={() => handleParagraphClick(textContent)}
        >
          {children}
        </p>
        {isHovered && (
          <span
            style={{
              position: 'absolute',
              top: '50%',
              right: 0,
              transform: 'translateY(-50%)',
              color: theme.colors.textMuted,
              opacity: 0.7,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <QuoteIcon />
          </span>
        )}
      </div>
    );
  };

  return (
    <ReactMarkdown
      allowedElements={allowedElements}
      components={{
        p: ({ children }) => <QuotableParagraph>{children}</QuotableParagraph>,
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
