import Anthropic from '@anthropic-ai/sdk';
import type { ChatMessage, GenerationOptions, LLMProvider } from './types.js';

const DEFAULT_MODEL = 'claude-haiku-4-5';

export class ClaudeProvider implements LLMProvider {
  readonly name = 'claude' as const;
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model || DEFAULT_MODEL;
  }

  isConfigured(): boolean {
    return !!this.client;
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      // Make a minimal API call to verify the key works
      await this.client.messages.create({
        model: this.model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
      });
      return { ok: true };
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) {
        return { ok: false, error: 'Invalid API key' };
      }
      if (error instanceof Anthropic.RateLimitError) {
        // Rate limit means the key is valid
        return { ok: true };
      }
      if (error instanceof Error) {
        return { ok: false, error: error.message };
      }
      return { ok: false, error: 'Unknown error' };
    }
  }

  async generateText(
    messages: ChatMessage[],
    systemPrompt?: string,
    options?: GenerationOptions
  ): Promise<string> {
    const anthropicMessages = this.formatMessages(messages);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options?.maxTokens ?? 1024,
      system: systemPrompt,
      messages: anthropicMessages,
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    return textBlock && textBlock.type === 'text' ? textBlock.text : '';
  }

  async *streamText(
    messages: ChatMessage[],
    systemPrompt?: string,
    options?: GenerationOptions
  ): AsyncGenerator<string, void, unknown> {
    const anthropicMessages = this.formatMessages(messages);

    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: options?.maxTokens ?? 1024,
      system: systemPrompt,
      messages: anthropicMessages,
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text;
      }
    }
  }

  private formatMessages(
    messages: ChatMessage[]
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    // Filter out system messages (handled separately) and ensure proper typing
    return messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
  }
}

export function createClaudeProvider(apiKey: string, model?: string): LLMProvider {
  return new ClaudeProvider(apiKey, model);
}
