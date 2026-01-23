import React from 'react';
import ReactMarkdown from 'react-markdown';
import { useTheme } from '../contexts/ThemeContext';

interface MarkdownRendererProps {
  content: string;
}

const allowedElements = [
  'p', 'em', 'strong', 'ul', 'ol', 'li', 'blockquote', 'code', 'br'
];

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const { theme, isDark } = useTheme();

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

  return (
    <ReactMarkdown
      allowedElements={allowedElements}
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
