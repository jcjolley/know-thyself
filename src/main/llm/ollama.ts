import type { ChatMessage, GenerationOptions, LLMProvider, OllamaModel } from './types.js';

interface OllamaTagsResponse {
  models: Array<{
    name: string;
    size: number;
    modified_at: string;
    digest: string;
    details?: {
      format: string;
      family: string;
      parameter_size: string;
      quantization_level: string;
    };
  }>;
}

interface OllamaChatRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  stream: boolean;
  options?: {
    num_predict?: number;
    temperature?: number;
  };
}

interface OllamaChatStreamChunk {
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

export class OllamaProvider implements LLMProvider {
  readonly name = 'ollama' as const;
  private baseUrl: string;
  private model: string | undefined;

  constructor(baseUrl: string, model?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.model = model;
  }

  isConfigured(): boolean {
    // Ollama just needs a URL - model is auto-detected
    return !!this.baseUrl;
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }

      const data = (await response.json()) as OllamaTagsResponse;

      if (!data.models || data.models.length === 0) {
        return { ok: true, error: 'Connected but no models installed' };
      }

      return { ok: true };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return { ok: false, error: 'Connection timeout' };
        }
        if (error.message.includes('ECONNREFUSED')) {
          return { ok: false, error: 'Ollama is not running. Start it with: ollama serve' };
        }
        return { ok: false, error: error.message };
      }
      return { ok: false, error: 'Unknown connection error' };
    }
  }

  async getModel(): Promise<string> {
    if (this.model) {
      return this.model;
    }

    // Auto-detect first available model
    const models = await OllamaProvider.listModels(this.baseUrl);
    if (models.length === 0) {
      throw new Error('No models available. Run: ollama pull llama3.2');
    }

    return models[0].name;
  }

  setModel(model: string): void {
    this.model = model;
  }

  static async listModels(baseUrl: string): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as OllamaTagsResponse;

      return (data.models || []).map((m) => ({
        name: m.name,
        size: m.size,
        modifiedAt: m.modified_at,
        digest: m.digest,
        details: m.details ? {
          format: m.details.format,
          family: m.details.family,
          parameterSize: m.details.parameter_size,
          quantizationLevel: m.details.quantization_level,
        } : undefined,
      }));
    } catch (error) {
      if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
        throw new Error('Ollama is not running. Start it with: ollama serve');
      }
      throw error;
    }
  }

  async generateText(
    messages: ChatMessage[],
    systemPrompt?: string,
    options?: GenerationOptions
  ): Promise<string> {
    const model = await this.getModel();
    const ollamaMessages = this.formatMessages(messages, systemPrompt);

    const request: OllamaChatRequest = {
      model,
      messages: ollamaMessages,
      stream: false,
      options: {
        num_predict: options?.maxTokens ?? 1024,
        temperature: options?.temperature ?? 0.7,
      },
    };

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama error: ${response.status} - ${text}`);
    }

    const data = (await response.json()) as { message: { content: string } };
    return data.message.content;
  }

  async *streamText(
    messages: ChatMessage[],
    systemPrompt?: string,
    options?: GenerationOptions
  ): AsyncGenerator<string, void, unknown> {
    const model = await this.getModel();
    const ollamaMessages = this.formatMessages(messages, systemPrompt);

    const request: OllamaChatRequest = {
      model,
      messages: ollamaMessages,
      stream: true,
      options: {
        num_predict: options?.maxTokens ?? 1024,
        temperature: options?.temperature ?? 0.7,
      },
    };

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama error: ${response.status} - ${text}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const chunk = JSON.parse(line) as OllamaChatStreamChunk;
            if (chunk.message?.content) {
              yield chunk.message.content;
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        try {
          const chunk = JSON.parse(buffer) as OllamaChatStreamChunk;
          if (chunk.message?.content) {
            yield chunk.message.content;
          }
        } catch {
          // Skip malformed JSON
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private formatMessages(
    messages: ChatMessage[],
    systemPrompt?: string
  ): Array<{ role: string; content: string }> {
    const formatted: Array<{ role: string; content: string }> = [];

    if (systemPrompt) {
      formatted.push({ role: 'system', content: systemPrompt });
    }

    for (const msg of messages) {
      formatted.push({ role: msg.role, content: msg.content });
    }

    return formatted;
  }
}

export function createOllamaProvider(baseUrl: string, model?: string): LLMProvider {
  return new OllamaProvider(baseUrl, model);
}
