export type BackendType = 'ollama' | 'claude';

export interface LLMConfig {
  backend: BackendType;
  // Ollama-specific
  ollamaBaseUrl?: string;
  ollamaModel?: string; // Optional - auto-detected if not set
  // Claude-specific
  claudeApiKey?: string;
  claudeModel?: string;
}

export interface GenerationOptions {
  maxTokens?: number;
  temperature?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMProvider {
  readonly name: BackendType;

  isConfigured(): boolean;
  testConnection(): Promise<{ ok: boolean; error?: string }>;

  generateText(
    messages: ChatMessage[],
    systemPrompt?: string,
    options?: GenerationOptions
  ): Promise<string>;

  streamText(
    messages: ChatMessage[],
    systemPrompt?: string,
    options?: GenerationOptions
  ): AsyncGenerator<string, void, unknown>;
}

export interface OllamaModel {
  name: string;
  size: number;
  modifiedAt: string;
  digest: string;
  details?: {
    format: string;
    family: string;
    parameterSize: string;
    quantizationLevel: string;
  };
}

export interface LLMStatus {
  backend: BackendType;
  connected: boolean;
  error?: string;
  model?: string;
}
