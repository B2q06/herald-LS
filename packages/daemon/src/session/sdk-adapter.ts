import { ClaudeCode } from 'claude-code-js';

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

export class ClaudeCodeAdapter implements SdkAdapter {
  private claude: ClaudeCode;

  constructor() {
    this.claude = new ClaudeCode();
  }

  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    // Extract the last user message from the conversation history
    const lastUserMessage = [...params.messages].reverse().find((m) => m.role === 'user');

    if (!lastUserMessage) {
      throw new Error('No user message found in conversation history');
    }

    const response = await this.claude.chat({
      prompt: lastUserMessage.content,
      systemPrompt: params.systemPrompt,
    });

    if (!response.success) {
      throw new Error(response.error?.result ?? 'Claude Code CLI error');
    }

    return {
      text: response.message?.result ?? '',
      inputTokens: 0,
      outputTokens: 0,
    };
  }
}

export class NullAdapter implements SdkAdapter {
  async sendMessage(_params: SendMessageParams): Promise<SendMessageResult> {
    throw new Error('SDK not configured — Claude Code CLI not found');
  }
}
