import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import type { BackendType, LLMConfig } from './types.js';
import { getApiKey } from '../api-key-storage.js';

const CONFIG_FILE = 'llm-config.json';

export interface StoredLLMConfig {
  backend: BackendType;
  ollamaBaseUrl: string;
  ollamaModel?: string;
  // Claude API key is stored separately via api-key-storage.ts
}

function getConfigPath(): string {
  return path.join(app.getPath('userData'), CONFIG_FILE);
}

export function getDefaultConfig(): StoredLLMConfig {
  return {
    backend: 'ollama',
    ollamaBaseUrl: 'http://localhost:11434',
    // ollamaModel intentionally omitted - auto-detect first available
  };
}

export async function loadLLMConfig(): Promise<LLMConfig> {
  const configPath = getConfigPath();
  let stored: StoredLLMConfig;

  if (fs.existsSync(configPath)) {
    try {
      const data = fs.readFileSync(configPath, 'utf-8');
      stored = JSON.parse(data) as StoredLLMConfig;
    } catch (error) {
      console.error('Failed to load LLM config, using defaults:', error);
      stored = getDefaultConfig();
    }
  } else {
    stored = getDefaultConfig();
  }

  // Merge with Claude API key from separate secure storage
  const claudeApiKey = getApiKey();

  return {
    backend: stored.backend,
    ollamaBaseUrl: stored.ollamaBaseUrl,
    ollamaModel: stored.ollamaModel,
    claudeApiKey: claudeApiKey ?? undefined,
  };
}

export async function saveLLMConfig(config: Partial<StoredLLMConfig>): Promise<void> {
  const configPath = getConfigPath();

  // Load existing config
  let existing: StoredLLMConfig;
  if (fs.existsSync(configPath)) {
    try {
      const data = fs.readFileSync(configPath, 'utf-8');
      existing = JSON.parse(data) as StoredLLMConfig;
    } catch {
      existing = getDefaultConfig();
    }
  } else {
    existing = getDefaultConfig();
  }

  // Merge updates
  const updated: StoredLLMConfig = {
    ...existing,
    ...config,
  };

  try {
    fs.writeFileSync(configPath, JSON.stringify(updated, null, 2), 'utf-8');
    console.log('LLM config saved:', updated);
  } catch (error) {
    console.error('Failed to save LLM config:', error);
    throw error;
  }
}

export function clearLLMConfig(): boolean {
  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    return true;
  }

  try {
    fs.unlinkSync(configPath);
    console.log('LLM config cleared');
    return true;
  } catch (error) {
    console.error('Failed to clear LLM config:', error);
    return false;
  }
}
