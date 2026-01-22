import type { BackendType, LLMConfig, LLMProvider, LLMStatus } from './types.js';

export class LLMManager {
  private provider: LLMProvider | null = null;
  private config: LLMConfig;
  private createOllamaProvider: ((baseUrl: string, model?: string) => LLMProvider) | null = null;
  private createClaudeProvider: ((apiKey: string, model?: string) => LLMProvider) | null = null;

  constructor() {
    this.config = {
      backend: 'ollama',
      ollamaBaseUrl: 'http://localhost:11434',
    };
  }

  registerProviderFactories(
    ollamaFactory: (baseUrl: string, model?: string) => LLMProvider,
    claudeFactory: (apiKey: string, model?: string) => LLMProvider
  ): void {
    this.createOllamaProvider = ollamaFactory;
    this.createClaudeProvider = claudeFactory;
  }

  async initialize(config: LLMConfig): Promise<void> {
    this.config = { ...config };
    await this.createProvider();
  }

  private async createProvider(): Promise<void> {
    if (this.config.backend === 'ollama') {
      if (!this.createOllamaProvider) {
        throw new Error('Ollama provider factory not registered');
      }
      const baseUrl = this.config.ollamaBaseUrl || 'http://localhost:11434';
      this.provider = this.createOllamaProvider(baseUrl, this.config.ollamaModel);
    } else {
      if (!this.createClaudeProvider) {
        throw new Error('Claude provider factory not registered');
      }
      if (!this.config.claudeApiKey) {
        throw new Error('Claude API key not configured');
      }
      this.provider = this.createClaudeProvider(this.config.claudeApiKey, this.config.claudeModel);
    }
  }

  getProvider(): LLMProvider {
    if (!this.provider) {
      throw new Error('LLM provider not initialized. Call initialize() first.');
    }
    return this.provider;
  }

  getConfig(): LLMConfig {
    return { ...this.config };
  }

  async updateConfig(updates: Partial<LLMConfig>): Promise<void> {
    const needsProviderRecreation =
      updates.backend !== undefined && updates.backend !== this.config.backend ||
      updates.ollamaBaseUrl !== undefined && updates.ollamaBaseUrl !== this.config.ollamaBaseUrl ||
      updates.ollamaModel !== undefined && updates.ollamaModel !== this.config.ollamaModel ||
      updates.claudeApiKey !== undefined && updates.claudeApiKey !== this.config.claudeApiKey ||
      updates.claudeModel !== undefined && updates.claudeModel !== this.config.claudeModel;

    this.config = { ...this.config, ...updates };

    if (needsProviderRecreation) {
      await this.createProvider();
    }
  }

  async switchBackend(backend: BackendType): Promise<void> {
    await this.updateConfig({ backend });
  }

  async getStatus(): Promise<LLMStatus> {
    if (!this.provider) {
      return {
        backend: this.config.backend,
        connected: false,
        error: 'Provider not initialized',
      };
    }

    const result = await this.provider.testConnection();
    return {
      backend: this.config.backend,
      connected: result.ok,
      error: result.error,
      model: this.config.backend === 'ollama' ? this.config.ollamaModel : this.config.claudeModel,
    };
  }

  isConfigured(): boolean {
    return this.provider?.isConfigured() ?? false;
  }
}

// Singleton instance
export const llmManager = new LLMManager();
