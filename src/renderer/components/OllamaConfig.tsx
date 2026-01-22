import React, { useState, useCallback, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ModelCard } from './ModelCard';
import { CommandCopy } from './CommandCopy';
import type { OllamaModel } from '../../shared/types';

interface OllamaConfigProps {
  baseUrl: string;
  selectedModel?: string;
  models: OllamaModel[];
  connected: boolean;
  checking: boolean;
  error?: string;
  onBaseUrlChange: (url: string) => void;
  onModelSelect: (model: string) => void;
  onTestConnection: () => void;
  onRefreshModels: () => void;
}

export function OllamaConfig({
  baseUrl,
  selectedModel,
  models,
  connected,
  checking,
  error,
  onBaseUrlChange,
  onModelSelect,
  onTestConnection,
  onRefreshModels,
}: OllamaConfigProps) {
  const { theme, isDark } = useTheme();
  const [localUrl, setLocalUrl] = useState(baseUrl);

  // Sync local URL with prop
  useEffect(() => {
    setLocalUrl(baseUrl);
  }, [baseUrl]);

  const handleUrlBlur = useCallback(() => {
    if (localUrl !== baseUrl) {
      onBaseUrlChange(localUrl);
    }
  }, [localUrl, baseUrl, onBaseUrlChange]);

  const handleUrlKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUrlBlur();
    }
  }, [handleUrlBlur]);

  const sectionStyle: React.CSSProperties = {
    marginTop: 16,
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  };

  const labelTextStyle: React.CSSProperties = {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: 12,
    fontWeight: 600,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const statusStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: 11,
    color: checking
      ? theme.colors.textMuted
      : connected
        ? '#4c8b57'
        : '#c45a4a',
  };

  const statusDotStyle: React.CSSProperties = {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: checking
      ? theme.colors.textMuted
      : connected
        ? '#4c8b57'
        : '#c45a4a',
    animation: checking ? 'pulse 1s infinite' : 'none',
  };

  const inputContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: 8,
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: '10px 12px',
    borderRadius: 6,
    border: `1px solid ${theme.colors.border}`,
    background: isDark ? theme.colors.background : '#fff',
    fontFamily: 'monospace',
    fontSize: 13,
    color: theme.colors.textPrimary,
    outline: 'none',
    transition: 'border-color 150ms ease',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '10px 14px',
    borderRadius: 6,
    border: `1px solid ${theme.colors.border}`,
    background: isDark ? theme.colors.surface : '#fff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: 12,
    fontWeight: 500,
    color: theme.colors.textSecondary,
    cursor: 'pointer',
    transition: 'all 150ms ease',
    whiteSpace: 'nowrap',
  };

  const modelsContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    paddingBottom: 4,
    marginTop: 8,
  };

  const emptyStateStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    padding: 24,
    background: isDark ? theme.colors.background : 'rgba(139, 120, 100, 0.03)',
    borderRadius: 8,
    marginTop: 8,
  };

  const emptyIconStyle: React.CSSProperties = {
    fontSize: 32,
    opacity: 0.6,
  };

  const emptyTextStyle: React.CSSProperties = {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
  };

  const errorContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: 16,
    background: isDark ? 'rgba(196, 90, 74, 0.1)' : 'rgba(196, 90, 74, 0.05)',
    borderRadius: 8,
    marginTop: 8,
  };

  const errorHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: '#c45a4a',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: 13,
    fontWeight: 500,
  };

  const errorTextStyle: React.CSSProperties = {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 1.5,
  };

  const retryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    alignSelf: 'flex-start',
    marginTop: 4,
  };

  const linkStyle: React.CSSProperties = {
    color: theme.colors.accent,
    textDecoration: 'underline',
    cursor: 'pointer',
  };

  // Error state
  if (error && !connected) {
    return (
      <div style={sectionStyle}>
        <div style={labelStyle}>
          <span style={labelTextStyle}>Connection</span>
        </div>
        <div style={inputContainerStyle}>
          <input
            type="text"
            value={localUrl}
            onChange={(e) => setLocalUrl(e.target.value)}
            onBlur={handleUrlBlur}
            onKeyDown={handleUrlKeyDown}
            style={inputStyle}
            placeholder="http://localhost:11434"
          />
        </div>

        <div style={errorContainerStyle}>
          <div style={errorHeaderStyle}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Cannot connect to Ollama
          </div>
          <p style={errorTextStyle}>
            Make sure Ollama is running. Start it with:
          </p>
          <CommandCopy command="ollama serve" />
          <p style={errorTextStyle}>
            Or install from:{' '}
            <a
              href="https://ollama.ai"
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle}
              onClick={(e) => {
                e.preventDefault();
                window.open('https://ollama.ai', '_blank');
              }}
            >
              https://ollama.ai
            </a>
          </p>
          <button
            style={retryButtonStyle}
            onClick={onTestConnection}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark
                ? theme.colors.surfaceHover
                : 'rgba(139, 120, 100, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isDark
                ? theme.colors.surface
                : '#fff';
            }}
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={sectionStyle}>
      {/* Connection URL */}
      <div style={labelStyle}>
        <span style={labelTextStyle}>Connection</span>
        <div style={statusStyle}>
          <div style={statusDotStyle} />
          <span>{checking ? 'Checking...' : 'Connected'}</span>
        </div>
      </div>
      <div style={inputContainerStyle}>
        <input
          type="text"
          value={localUrl}
          onChange={(e) => setLocalUrl(e.target.value)}
          onBlur={handleUrlBlur}
          onKeyDown={handleUrlKeyDown}
          style={inputStyle}
          placeholder="http://localhost:11434"
          onFocus={(e) => {
            e.currentTarget.style.borderColor = theme.colors.accent;
          }}
          onBlurCapture={(e) => {
            e.currentTarget.style.borderColor = theme.colors.border;
          }}
        />
        <button
          style={buttonStyle}
          onClick={onTestConnection}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isDark
              ? theme.colors.surfaceHover
              : 'rgba(139, 120, 100, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isDark
              ? theme.colors.surface
              : '#fff';
          }}
        >
          Test
        </button>
      </div>

      {/* Model Selection */}
      <div style={{ ...sectionStyle, marginTop: 20 }}>
        <div style={labelStyle}>
          <span style={labelTextStyle}>Model</span>
          {models.length > 0 && (
            <button
              style={{
                ...buttonStyle,
                padding: '4px 8px',
                fontSize: 11,
              }}
              onClick={onRefreshModels}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark
                  ? theme.colors.surfaceHover
                  : 'rgba(139, 120, 100, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isDark
                  ? theme.colors.surface
                  : '#fff';
              }}
            >
              Refresh
            </button>
          )}
        </div>

        {models.length > 0 ? (
          <div style={modelsContainerStyle}>
            {models.map((model) => (
              <ModelCard
                key={model.name}
                model={model}
                selected={selectedModel === model.name}
                onSelect={() => onModelSelect(model.name)}
              />
            ))}
          </div>
        ) : (
          <div style={emptyStateStyle}>
            <span style={emptyIconStyle}>📦</span>
            <p style={emptyTextStyle}>
              No models installed yet
            </p>
            <p style={{ ...emptyTextStyle, marginTop: -8 }}>
              Run this command in your terminal:
            </p>
            <CommandCopy command="ollama pull llama3.2" />
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
