import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useApi } from '../contexts/ApiContext';
import { BackendCard } from './BackendCard';
import { OllamaConfig } from './OllamaConfig';
import type { LLMConfig, LLMStatus, OllamaModel, BackendType } from '../../shared/types';

interface BackendSettingsProps {
  onConfigChange?: () => void;
}

export function BackendSettings({ onConfigChange }: BackendSettingsProps) {
  const { theme, isDark } = useTheme();
  const api = useApi();

  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [status, setStatus] = useState<LLMStatus | null>(null);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load initial config and status
  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedConfig, loadedStatus] = await Promise.all([
          api.llm.getConfig(),
          api.llm.getStatus(),
        ]);
        setConfig(loadedConfig);
        setStatus(loadedStatus);

        // If Ollama backend, load models
        if (loadedConfig.backend === 'ollama') {
          const loadedModels = await api.llm.listOllamaModels(loadedConfig.ollamaBaseUrl);
          setModels(loadedModels);

          // Auto-select first model if none selected
          if (loadedModels.length > 0 && !loadedConfig.ollamaModel) {
            await api.llm.setConfig({ ollamaModel: loadedModels[0].name });
            setConfig((prev) => prev ? { ...prev, ollamaModel: loadedModels[0].name } : prev);
          }
        }
      } catch (error) {
        console.error('Failed to load LLM config:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [api]);

  // Auto-test connection when backend changes
  const testConnection = useCallback(async () => {
    setChecking(true);
    try {
      const result = await api.llm.testConnection();
      const newStatus = await api.llm.getStatus();
      setStatus(newStatus);

      // If Ollama connected, refresh models
      if (config?.backend === 'ollama' && result.ok) {
        const loadedModels = await api.llm.listOllamaModels(config.ollamaBaseUrl);
        setModels(loadedModels);
      }
    } catch (error) {
      console.error('Connection test failed:', error);
    } finally {
      setChecking(false);
    }
  }, [api, config?.backend, config?.ollamaBaseUrl]);

  // Handle backend selection
  const handleBackendSelect = useCallback(async (backend: BackendType) => {
    if (!config || backend === config.backend) return;

    try {
      await api.llm.setConfig({ backend });
      setConfig((prev) => prev ? { ...prev, backend } : prev);

      // Test new backend connection
      setChecking(true);
      const result = await api.llm.testConnection();
      const newStatus = await api.llm.getStatus();
      setStatus(newStatus);

      // If switching to Ollama, load models
      if (backend === 'ollama' && result.ok) {
        const loadedModels = await api.llm.listOllamaModels(config.ollamaBaseUrl);
        setModels(loadedModels);

        // Auto-select first model if needed
        if (loadedModels.length > 0 && !config.ollamaModel) {
          await api.llm.setConfig({ ollamaModel: loadedModels[0].name });
          setConfig((prev) => prev ? { ...prev, ollamaModel: loadedModels[0].name } : prev);
        }
      }

      onConfigChange?.();
    } catch (error) {
      console.error('Failed to switch backend:', error);
    } finally {
      setChecking(false);
    }
  }, [api, config, onConfigChange]);

  // Handle Ollama URL change
  const handleBaseUrlChange = useCallback(async (url: string) => {
    if (!config) return;

    try {
      await api.llm.setConfig({ ollamaBaseUrl: url });
      setConfig((prev) => prev ? { ...prev, ollamaBaseUrl: url } : prev);

      // Test connection with new URL
      await testConnection();
      onConfigChange?.();
    } catch (error) {
      console.error('Failed to update base URL:', error);
    }
  }, [api, config, testConnection, onConfigChange]);

  // Handle model selection
  const handleModelSelect = useCallback(async (model: string) => {
    if (!config) return;

    try {
      await api.llm.setConfig({ ollamaModel: model });
      setConfig((prev) => prev ? { ...prev, ollamaModel: model } : prev);
      onConfigChange?.();
    } catch (error) {
      console.error('Failed to select model:', error);
    }
  }, [api, config, onConfigChange]);

  // Refresh models
  const handleRefreshModels = useCallback(async () => {
    if (!config) return;

    try {
      const loadedModels = await api.llm.listOllamaModels(config.ollamaBaseUrl);
      setModels(loadedModels);
    } catch (error) {
      console.error('Failed to refresh models:', error);
    }
  }, [api, config]);

  if (loading || !config) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        color: theme.colors.textMuted,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 13,
      }}>
        Loading...
      </div>
    );
  }

  const cardContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: 12,
  };

  const configPanelStyle: React.CSSProperties = {
    background: isDark ? theme.colors.background : 'rgba(139, 120, 100, 0.03)',
    borderRadius: 10,
    padding: 16,
    marginTop: 16,
  };

  const claudeConfigStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    background: isDark ? theme.colors.background : 'rgba(139, 120, 100, 0.03)',
    borderRadius: 8,
    marginTop: 16,
  };

  const claudeStatusStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: 12,
    color: status?.connected ? '#4c8b57' : '#c45a4a',
  };

  const claudeStatusDotStyle: React.CSSProperties = {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: status?.connected ? '#4c8b57' : '#c45a4a',
  };

  const claudeTextStyle: React.CSSProperties = {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: 12,
    color: theme.colors.textSecondary,
    flex: 1,
  };

  const isOllamaSelected = config.backend === 'ollama';
  const ollamaConnected = isOllamaSelected && status?.connected === true;
  const ollamaError = isOllamaSelected && !status?.connected ? status?.error : undefined;
  const claudeConnected = !isOllamaSelected && status?.connected === true;
  const claudeError = !isOllamaSelected && !status?.connected ? status?.error : undefined;

  return (
    <div>
      {/* Backend Cards */}
      <div style={cardContainerStyle}>
        <BackendCard
          type="ollama"
          selected={isOllamaSelected}
          connected={ollamaConnected}
          error={ollamaError}
          modelName={config.ollamaModel}
          onSelect={() => handleBackendSelect('ollama')}
        />
        <BackendCard
          type="claude"
          selected={!isOllamaSelected}
          connected={claudeConnected}
          error={claudeError}
          onSelect={() => handleBackendSelect('claude')}
        />
      </div>

      {/* Ollama Config Panel */}
      {isOllamaSelected && (
        <div style={configPanelStyle}>
          <OllamaConfig
            baseUrl={config.ollamaBaseUrl || 'http://localhost:11434'}
            selectedModel={config.ollamaModel}
            models={models}
            connected={ollamaConnected}
            checking={checking}
            error={ollamaError}
            onBaseUrlChange={handleBaseUrlChange}
            onModelSelect={handleModelSelect}
            onTestConnection={testConnection}
            onRefreshModels={handleRefreshModels}
          />
        </div>
      )}

      {/* Claude Config Panel */}
      {!isOllamaSelected && (
        <div style={claudeConfigStyle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textMuted} strokeWidth="1.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span style={claudeTextStyle}>
            API key managed in API Key section below
          </span>
          <div style={claudeStatusStyle}>
            <div style={claudeStatusDotStyle} />
            <span>{status?.connected ? 'Configured' : claudeError || 'Not configured'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
