import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import type { BackendType } from '../../shared/types';

interface BackendCardProps {
  type: BackendType;
  selected: boolean;
  connected: boolean;
  error?: string;
  modelName?: string;
  onSelect: () => void;
}

export function BackendCard({
  type,
  selected,
  connected,
  error,
  modelName,
  onSelect,
}: BackendCardProps) {
  const { theme, isDark } = useTheme();

  const isOllama = type === 'ollama';
  const title = isOllama ? 'Local' : 'Cloud';
  const subtitle = isOllama ? 'Ollama' : 'Claude';
  const description = isOllama ? 'Private & Local' : 'Powerful & Fast';

  const cardStyle: React.CSSProperties = {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    border: selected
      ? `2px solid ${theme.colors.accent}`
      : `1px solid ${theme.colors.border}`,
    background: selected
      ? isDark
        ? 'rgba(176, 137, 104, 0.08)'
        : 'rgba(139, 120, 100, 0.05)'
      : isDark
        ? theme.colors.surface
        : '#fff',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    opacity: selected ? 1 : 0.8,
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  };

  const radioStyle: React.CSSProperties = {
    width: 16,
    height: 16,
    borderRadius: '50%',
    border: selected
      ? `5px solid ${theme.colors.accent}`
      : `2px solid ${theme.colors.textMuted}`,
    background: selected ? '#fff' : 'transparent',
    transition: 'all 150ms ease',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: theme.colors.textMuted,
  };

  const iconContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: 10,
    background: isDark
      ? 'rgba(139, 120, 100, 0.15)'
      : 'rgba(139, 120, 100, 0.1)',
    marginBottom: 8,
  };

  const titleStyle: React.CSSProperties = {
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: 16,
    fontWeight: 400,
    color: theme.colors.textPrimary,
    margin: '0 0 2px 0',
  };

  const descriptionStyle: React.CSSProperties = {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: 12,
    color: theme.colors.textMuted,
    margin: 0,
  };

  const statusStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: 11,
    color: connected ? '#4c8b57' : error ? '#c45a4a' : theme.colors.textMuted,
  };

  const statusDotStyle: React.CSSProperties = {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: connected ? '#4c8b57' : error ? '#c45a4a' : theme.colors.textMuted,
  };

  const getStatusText = () => {
    if (!selected) return null;
    if (connected && modelName) return modelName;
    if (connected) return 'Connected';
    if (error) return error;
    return 'Not configured';
  };

  return (
    <div
      style={cardStyle}
      onClick={onSelect}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.borderColor = isDark
            ? theme.colors.textMuted
            : 'rgba(139, 120, 100, 0.3)';
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.opacity = '0.8';
          e.currentTarget.style.borderColor = theme.colors.border;
        }
      }}
    >
      <div style={headerStyle}>
        <div style={radioStyle} />
        <span style={labelStyle}>{title}</span>
      </div>

      <div style={iconContainerStyle}>
        {isOllama ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textSecondary} strokeWidth="1.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textSecondary} strokeWidth="1.5">
            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
          </svg>
        )}
      </div>

      <h4 style={titleStyle}>{subtitle}</h4>
      <p style={descriptionStyle}>{description}</p>

      {selected && (
        <div style={statusStyle}>
          <div style={statusDotStyle} />
          <span>{getStatusText()}</span>
        </div>
      )}
    </div>
  );
}
