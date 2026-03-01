import { join } from 'node:path';
import type { AgentConfig, HeraldConfig } from '@herald/shared';
import type { MemoryLibrarian } from '../librarian/ask-librarian.ts';
import { loadPersonaContext } from './persona-loader.ts';
import type { SdkAdapter } from './sdk-adapter.ts';

export interface SessionState {
  agentName: string;
  status: 'idle' | 'active' | 'failed';
  interactionCount: number;
  sessionLimit: number;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  startedAt: string | null;
  lastError?: string;
}

export class SessionManager {
  private sessions = new Map<string, SessionState>();
  private sdkAdapter: SdkAdapter;
  private librarian?: MemoryLibrarian;

  constructor(sdkAdapter: SdkAdapter) {
    this.sdkAdapter = sdkAdapter;
  }

  setLibrarian(librarian: MemoryLibrarian): void {
    this.librarian = librarian;
  }

  async runAgent(
    agentName: string,
    config: AgentConfig,
    heraldConfig: HeraldConfig,
    prompt?: string,
  ): Promise<string> {
    // Get or create session state
    let session = this.sessions.get(agentName);
    if (!session) {
      session = {
        agentName,
        status: 'idle',
        interactionCount: 0,
        sessionLimit: config.session_limit,
        messages: [],
        startedAt: null,
      };
      this.sessions.set(agentName, session);
    }

    // Set status to active
    session.status = 'active';
    session.startedAt = session.startedAt ?? new Date().toISOString();
    session.lastError = undefined;

    try {
      // Load persona context (with optional cross-agent intelligence)
      const personaContext = await loadPersonaContext(config, heraldConfig, this.librarian);

      // Build user message with optional previous state context
      const now = new Date();
      const defaultPrompt = `Current date: ${now.toISOString().split('T')[0]}
Current time: ${now.toISOString().split('T')[1].slice(0, 5)} UTC

Execute your patrol workflow as defined in your persona. Follow your Source Strategy in order, apply your Taste Profile to evaluate findings.

IMPORTANT — Your final text response MUST be the complete patrol report following your persona's Report Format. Do NOT summarize what you did or describe your process. The text you return IS the deliverable. Output the full markdown report with all sections: Headlines, Featured Deep-Dive, Key Findings, Radar, Tangents & Discoveries, Recommendations, Opinions Formed, and Predictions. Do not include YAML frontmatter — that is added automatically.

During your patrol, also update your knowledge base file at: ${personaContext.knowledgePath}
- Form or update opinions based on this patrol's findings
- Record any predictions with confidence and timeframe
- Update your Domain Knowledge section with key learnings

This is a bounded patrol session. Complete your full patrol cycle. Your text output = the report.`;

      const userMessage = prompt ?? defaultPrompt;
      let fullUserMessage = userMessage;

      if (session.interactionCount === 0 && personaContext.previousState) {
        fullUserMessage = `Previous session context: ${personaContext.previousState}\n\n${userMessage}`;
      }

      // Add user message to history
      session.messages.push({ role: 'user', content: fullUserMessage });

      // Send message via SDK adapter (copy messages to avoid mutation issues)
      const result = await this.sdkAdapter.sendMessage({
        systemPrompt: personaContext.systemPrompt,
        messages: [...session.messages],
        maxTokens: 4096,
        logLabel: agentName,
      });

      // Add assistant response to history
      session.messages.push({ role: 'assistant', content: result.text });

      // Increment interaction count
      session.interactionCount++;

      // Check session limit
      if (session.interactionCount >= session.sessionLimit) {
        await this.saveState(agentName, heraldConfig);
        session.interactionCount = 0;
        session.messages = [];
        session.startedAt = null;
        session.status = 'idle';
      } else {
        session.status = 'idle';
      }

      return result.text;
    } catch (error: unknown) {
      // Error handling: NEVER crash daemon
      const errorMessage = error instanceof Error ? error.message : 'Unknown SDK error';
      session.status = 'failed';
      session.lastError = errorMessage;
      console.error(`[herald] Session error for agent "${agentName}": ${errorMessage}`);
      return `Error: ${errorMessage}`;
    }
  }

  async saveState(agentName: string, heraldConfig: HeraldConfig): Promise<void> {
    const session = this.sessions.get(agentName);
    if (!session) {
      return;
    }

    const lastJobsPath = join(heraldConfig.memory_dir, 'agents', agentName, 'last-jobs.md');

    // Build summary from last few messages
    const recentMessages = session.messages.slice(-6);
    const conversationSummary = recentMessages
      .map((m) => `**${m.role}:** ${m.content.substring(0, 200)}`)
      .join('\n\n');

    const summary = `# Last Session Summary

Date: ${new Date().toISOString()}
Interactions: ${session.interactionCount}

## Conversation Summary
${conversationSummary}

## Key Outputs
Session completed with ${session.interactionCount} interactions.
`;

    await Bun.write(lastJobsPath, summary);
  }

  getStatus(agentName: string): SessionState['status'] {
    const session = this.sessions.get(agentName);
    return session?.status ?? 'idle';
  }

  getSession(agentName: string): SessionState | undefined {
    return this.sessions.get(agentName);
  }
}
