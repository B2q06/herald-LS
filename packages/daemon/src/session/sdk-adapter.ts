import Anthropic from '@anthropic-ai/sdk';

export interface SendMessageParams {
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
}

export interface SendMessageResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export interface SdkAdapter {
  sendMessage(params: SendMessageParams): Promise<SendMessageResult>;
}

export class AnthropicAdapter implements SdkAdapter {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: params.maxTokens ?? 4096,
      system: params.systemPrompt,
      messages: params.messages,
    });

    const textBlock = response.content.find((b) => b.type === 'text');

    return {
      text: textBlock?.text ?? '',
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }
}

export class NullAdapter implements SdkAdapter {
  async sendMessage(_params: SendMessageParams): Promise<SendMessageResult> {
    throw new Error('SDK not configured — no API key provided');
  }
}
