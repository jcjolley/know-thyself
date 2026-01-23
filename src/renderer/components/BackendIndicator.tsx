import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useApi } from '../contexts/ApiContext';
import type { LLMStatus } from '../../shared/types';

interface BackendIndicatorProps {
  onClick?: () => void;
}

export function BackendIndicator({ onClick }: BackendIndicatorProps) {
  const { theme, isDark } = useTheme();
  const api = useApi();
  const [status, setStatus] = useState<LLMStatus | null>(null);

  // Load status on mount
  useEffect(() => {
    const loadStatus = async () => {
      try {
        const loadedStatus = await api.llm.getStatus();
        setStatus(loadedStatus);
      } catch (error) {
        console.error('Failed to load LLM status:', error);
      }
    };

    loadStatus();

    // Refresh status periodically
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, [api]);

  if (!status) {
    return null;
  }

  const isOllama = status.backend === 'ollama';
  const label = isOllama ? 'Local' : 'Claude';

  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 500,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: theme.colors.textSecondary,
    background: 'transparent',
    border: `1px solid ${theme.colors.border}`,
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 150ms ease',
    userSelect: 'none',
  };

  return (
    <div
      style={containerStyle}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.background = isDark
            ? theme.colors.surface
            : 'rgba(139, 120, 100, 0.06)';
          e.currentTarget.style.borderColor = isDark
            ? theme.colors.textMuted
            : 'rgba(139, 120, 100, 0.3)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.borderColor = theme.colors.border;
      }}
      title={onClick ? 'Click to open settings' : undefined}
    >
      {isOllama ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
        </svg>
      )}
      <span>{label}</span>
    </div>
  );
}
