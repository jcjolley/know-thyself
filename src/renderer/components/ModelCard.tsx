import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import type { OllamaModel } from '../../shared/types';

interface ModelCardProps {
  model: OllamaModel;
  selected: boolean;
  onSelect: () => void;
}

function formatSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) {
    return `${gb.toFixed(1)}GB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)}MB`;
}

function extractParamSize(model: OllamaModel): string | null {
  // Try to extract from details first
  if (model.details?.parameterSize) {
    return model.details.parameterSize;
  }
  // Try to extract from model name (e.g., "llama3.2:7b" or "mistral:7b-instruct")
  const match = model.name.match(/(\d+\.?\d*)[bB]/);
  if (match) {
    return `${match[1]}B`;
  }
  return null;
}

export function ModelCard({ model, selected, onSelect }: ModelCardProps) {
  const { theme, isDark } = useTheme();

  const paramSize = extractParamSize(model);

  const cardStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '12px 14px',
    borderRadius: 8,
    border: selected
      ? `2px solid ${theme.colors.accent}`
      : `1px solid ${theme.colors.border}`,
    background: selected
      ? isDark
        ? 'rgba(176, 137, 104, 0.1)'
        : 'rgba(139, 120, 100, 0.08)'
      : isDark
        ? theme.colors.surface
        : '#fff',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    minWidth: 120,
    flexShrink: 0,
    position: 'relative',
  };

  const nameStyle: React.CSSProperties = {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: 13,
    fontWeight: 600,
    color: theme.colors.textPrimary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    paddingRight: selected ? 20 : 0,
  };

  const detailsStyle: React.CSSProperties = {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: 11,
    color: theme.colors.textMuted,
  };

  const checkStyle: React.CSSProperties = {
    position: 'absolute',
    top: 8,
    right: 8,
    color: theme.colors.accent,
  };

  return (
    <div
      style={cardStyle}
      onClick={onSelect}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = isDark
            ? theme.colors.textMuted
            : 'rgba(139, 120, 100, 0.4)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = theme.colors.border;
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      {selected && (
        <svg style={checkStyle} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      <div style={nameStyle} title={model.name}>
        {model.name.split(':')[0]}
      </div>
      <div style={detailsStyle}>
        {paramSize && <span>{paramSize}</span>}
        {paramSize && ' · '}
        <span>{formatSize(model.size)}</span>
      </div>
    </div>
  );
}
