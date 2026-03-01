import { query } from '@anthropic-ai/claude-agent-sdk';

export interface SendMessageParams {
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
  /** Label for progress logs (e.g. agent name). */
  logLabel?: string;
}

export interface SendMessageResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  costUsd?: number;
  durationMs?: number;
  sessionId?: string;
}

export interface SdkAdapter {
  sendMessage(params: SendMessageParams): Promise<SendMessageResult>;
}

export interface AgentSdkOptions {
  /** Tools available to the agent. Defaults to research tools. */
  tools?: string[];
  /** Maximum conversation turns. */
  maxTurns?: number;
  /** Maximum budget in USD. */
  maxBudgetUsd?: number;
  /** Working directory for the agent process. */
  cwd?: string;
  /** Claude model to use. Defaults to claude-sonnet-4-6-20250514. */
  model?: string;
}

const DEFAULT_RESEARCH_TOOLS = ['WebSearch', 'WebFetch', 'Read', 'Write', 'Glob', 'Grep'];

export class AgentSdkAdapter implements SdkAdapter {
  private options: AgentSdkOptions;

  constructor(options: AgentSdkOptions = {}) {
    this.options = options;
  }

  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    const lastUserMessage = [...params.messages].reverse().find((m) => m.role === 'user');

    if (!lastUserMessage) {
      throw new Error('No user message found in conversation history');
    }

    let resultText = '';
    let costUsd: number | undefined;
    let durationMs: number | undefined;
    let sessionId: string | undefined;
    let inputTokens = 0;
    let outputTokens = 0;

    const tools = this.options.tools ?? DEFAULT_RESEARCH_TOOLS;

    const label = params.logLabel ?? 'agent';

    for await (const message of query({
      prompt: lastUserMessage.content,
      options: {
        systemPrompt: params.systemPrompt,
        tools,
        allowedTools: tools,
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        maxTurns: this.options.maxTurns,
        maxBudgetUsd: this.options.maxBudgetUsd,
        cwd: this.options.cwd,
        model: this.options.model ?? 'claude-sonnet-4-6',
        persistSession: false,
      },
    })) {
      if (message.type === 'system' && 'subtype' in message && message.subtype === 'init') {
        sessionId = message.session_id;
        console.log(`[herald:${label}] Session started (model: ${'model' in message ? message.model : 'unknown'})`);
      }

      if (message.type === 'assistant' && 'message' in message) {
        const content = (message as { message: { content?: unknown[] } }).message.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block && typeof block === 'object' && 'type' in block) {
              if (block.type === 'tool_use' && 'name' in block) {
                console.log(`[herald:${label}] Tool: ${block.name}`);
              }
            }
          }
        }
      }

      if (message.type === 'result') {
        durationMs = message.duration_ms;
        costUsd = message.total_cost_usd;

        if (message.usage) {
          inputTokens = Number(message.usage.input_tokens) || 0;
          outputTokens = Number(message.usage.output_tokens) || 0;
        }

        const turns = 'num_turns' in message ? message.num_turns : '?';
        console.log(`[herald:${label}] Completed in ${Math.round((durationMs ?? 0) / 1000)}s | ${turns} turns | $${(costUsd ?? 0).toFixed(4)} | ${inputTokens + outputTokens} tokens`);

        if (message.subtype === 'success') {
          resultText = message.result;
        } else {
          const errors = 'errors' in message ? message.errors.join('; ') : message.subtype;
          throw new Error(`Agent SDK error (${message.subtype}): ${errors}`);
        }
      }
    }

    if (!resultText) {
      throw new Error('Agent SDK returned no result');
    }

    return {
      text: resultText,
      inputTokens,
      outputTokens,
      costUsd,
      durationMs,
      sessionId,
    };
  }
}

export class NullAdapter implements SdkAdapter {
  async sendMessage(_params: SendMessageParams): Promise<SendMessageResult> {
    throw new Error('SDK not configured — set ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN');
  }
}
