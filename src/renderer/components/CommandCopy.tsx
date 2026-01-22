import React, { useState, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface CommandCopyProps {
  command: string;
}

export function CommandCopy({ command }: CommandCopyProps) {
  const { theme, isDark } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [command]);

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: isDark ? theme.colors.background : 'rgba(61, 54, 48, 0.05)',
    borderRadius: 6,
    padding: '8px 12px',
    fontFamily: 'monospace',
    fontSize: 13,
  };

  const codeStyle: React.CSSProperties = {
    color: theme.colors.textPrimary,
    flex: 1,
    userSelect: 'all',
  };

  const buttonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: '4px 10px',
    borderRadius: 4,
    border: 'none',
    background: copied
      ? 'rgba(76, 139, 87, 0.15)'
      : isDark
        ? theme.colors.surfaceHover
        : 'rgba(139, 129, 120, 0.1)',
    color: copied ? '#4c8b57' : theme.colors.textSecondary,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 150ms ease',
    minWidth: 60,
  };

  return (
    <div style={containerStyle}>
      <code style={codeStyle}>{command}</code>
      <button
        style={buttonStyle}
        onClick={handleCopy}
        onMouseEnter={(e) => {
          if (!copied) {
            e.currentTarget.style.background = isDark
              ? theme.colors.surface
              : 'rgba(139, 129, 120, 0.15)';
          }
        }}
        onMouseLeave={(e) => {
          if (!copied) {
            e.currentTarget.style.background = isDark
              ? theme.colors.surfaceHover
              : 'rgba(139, 129, 120, 0.1)';
          }
        }}
      >
        {copied ? (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Copied
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy
          </>
        )}
      </button>
    </div>
  );
}
