import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AgentConfig, HeraldConfig } from '@herald/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SdkAdapter, SendMessageParams, SendMessageResult } from './sdk-adapter.ts';
import { SessionManager } from './session-manager.ts';

class MockSdkAdapter implements SdkAdapter {
  public calls: SendMessageParams[] = [];
  public response: SendMessageResult = {
    text: 'Mock response from Claude',
    inputTokens: 100,
    outputTokens: 50,
  };
  public shouldThrow = false;
  public throwError: Error = new Error('Mock SDK error');

  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    this.calls.push(params);
    if (this.shouldThrow) {
      throw this.throwError;
    }
    return this.response;
  }
}

describe('SessionManager', () => {
  let tempDir: string;
  let personasDir: string;
  let memoryDir: string;
  let mockAdapter: MockSdkAdapter;
  let manager: SessionManager;

  const makeConfig = (name: string, sessionLimit = 10): AgentConfig => ({
    name,
    persona: `${name}.md`,
    output_dir: `reports/${name}`,
    session_limit: sessionLimit,
    notify_policy: 'failures',
    team_eligible: false,
  });

  const makeHeraldConfig = (): HeraldConfig => ({
    port: 3117,
    data_dir: join(tempDir, 'data'),
    agents_dir: join(tempDir, 'agents'),
    personas_dir: personasDir,
    memory_dir: memoryDir,
    reports_dir: join(tempDir, 'reports'),
    newspaper_dir: join(tempDir, 'newspaper'),
    log_level: 'info',
  });

  beforeEach(async () => {
    tempDir = join(tmpdir(), `herald-session-test-${Date.now()}`);
    personasDir = join(tempDir, 'personas');
    memoryDir = join(tempDir, 'memory');

    await mkdir(personasDir, { recursive: true });
    await mkdir(join(memoryDir, 'agents', 'test-agent'), { recursive: true });
    await Bun.write(join(personasDir, 'test-agent.md'), '# Test Persona');
    await Bun.write(join(memoryDir, 'agents', 'test-agent', 'knowledge.md'), '');
    await Bun.write(join(memoryDir, 'agents', 'test-agent', 'last-jobs.md'), '');

    mockAdapter = new MockSdkAdapter();
    manager = new SessionManager(mockAdapter);

    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('runAgent', () => {
    it('sends message via SDK adapter and returns response', async () => {
      const result = await manager.runAgent(
        'test-agent',
        makeConfig('test-agent'),
        makeHeraldConfig(),
        'Hello agent',
      );

      expect(result).toBe('Mock response from Claude');
      expect(mockAdapter.calls).toHaveLength(1);
      expect(mockAdapter.calls[0].messages).toHaveLength(1);
      expect(mockAdapter.calls[0].messages[0].content).toBe('Hello agent');
    });

    it('uses default patrol prompt when none provided', async () => {
      await manager.runAgent('test-agent', makeConfig('test-agent'), makeHeraldConfig());

      const prompt = mockAdapter.calls[0].messages[0].content;
      expect(prompt).toContain('Execute your patrol workflow');
      expect(prompt).toContain('Current date:');
      expect(prompt).toContain('This is a bounded patrol session');
    });

    it('includes persona in system prompt', async () => {
      await manager.runAgent('test-agent', makeConfig('test-agent'), makeHeraldConfig(), 'Hello');

      expect(mockAdapter.calls[0].systemPrompt).toContain('# Test Persona');
    });

    it('prepends previous state to first message when last-jobs exists', async () => {
      await Bun.write(
        join(memoryDir, 'agents', 'test-agent', 'last-jobs.md'),
        '# Previous work done.',
      );

      await manager.runAgent(
        'test-agent',
        makeConfig('test-agent'),
        makeHeraldConfig(),
        'Continue work',
      );

      expect(mockAdapter.calls[0].messages[0].content).toContain('Previous session context:');
      expect(mockAdapter.calls[0].messages[0].content).toContain('# Previous work done.');
      expect(mockAdapter.calls[0].messages[0].content).toContain('Continue work');
    });

    it('does not prepend previous state on subsequent interactions', async () => {
      await Bun.write(
        join(memoryDir, 'agents', 'test-agent', 'last-jobs.md'),
        '# Previous work done.',
      );

      // First interaction — will include previous state
      await manager.runAgent(
        'test-agent',
        makeConfig('test-agent'),
        makeHeraldConfig(),
        'First prompt',
      );

      // Second interaction — should NOT include previous state prefix
      await manager.runAgent(
        'test-agent',
        makeConfig('test-agent'),
        makeHeraldConfig(),
        'Second prompt',
      );

      // Second call should have the user message without "Previous session context:"
      const secondCallMessages = mockAdapter.calls[1].messages;
      const lastMessage = secondCallMessages[secondCallMessages.length - 1];
      expect(lastMessage.content).toBe('Second prompt');
    });

    it('tracks interaction count', async () => {
      const heraldConfig = makeHeraldConfig();
      await manager.runAgent('test-agent', makeConfig('test-agent'), heraldConfig, 'Hello');

      const session = manager.getSession('test-agent');
      expect(session?.interactionCount).toBe(1);

      await manager.runAgent('test-agent', makeConfig('test-agent'), heraldConfig, 'Again');
      expect(manager.getSession('test-agent')?.interactionCount).toBe(2);
    });

    it('accumulates messages across interactions', async () => {
      const heraldConfig = makeHeraldConfig();
      await manager.runAgent('test-agent', makeConfig('test-agent'), heraldConfig, 'First');
      await manager.runAgent('test-agent', makeConfig('test-agent'), heraldConfig, 'Second');

      // Second call should have full history: user, assistant, user
      expect(mockAdapter.calls[1].messages).toHaveLength(3);
      expect(mockAdapter.calls[1].messages[0].role).toBe('user');
      expect(mockAdapter.calls[1].messages[1].role).toBe('assistant');
      expect(mockAdapter.calls[1].messages[2].role).toBe('user');
    });

    it('sets status to idle after successful run', async () => {
      await manager.runAgent('test-agent', makeConfig('test-agent'), makeHeraldConfig(), 'Hello');

      expect(manager.getStatus('test-agent')).toBe('idle');
    });
  });

  describe('session_limit bounding', () => {
    it('resets session when interaction count reaches session_limit', async () => {
      const heraldConfig = makeHeraldConfig();
      const config = makeConfig('test-agent', 2);

      await manager.runAgent('test-agent', config, heraldConfig, 'First');
      expect(manager.getSession('test-agent')?.interactionCount).toBe(1);

      await manager.runAgent('test-agent', config, heraldConfig, 'Second');
      // After reaching limit, interaction count resets to 0
      expect(manager.getSession('test-agent')?.interactionCount).toBe(0);
      expect(manager.getStatus('test-agent')).toBe('idle');
    });

    it('writes last-jobs.md when session limit reached', async () => {
      const heraldConfig = makeHeraldConfig();
      const config = makeConfig('test-agent', 1);

      await manager.runAgent('test-agent', config, heraldConfig, 'Single interaction');

      const lastJobsPath = join(memoryDir, 'agents', 'test-agent', 'last-jobs.md');
      const content = await Bun.file(lastJobsPath).text();
      expect(content).toContain('# Last Session Summary');
      expect(content).toContain('Interactions:');
    });

    it('clears messages after session limit reached', async () => {
      const heraldConfig = makeHeraldConfig();
      const config = makeConfig('test-agent', 1);

      await manager.runAgent('test-agent', config, heraldConfig, 'Only one');

      const session = manager.getSession('test-agent');
      expect(session?.messages).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('sets status to failed on SDK error', async () => {
      mockAdapter.shouldThrow = true;

      await manager.runAgent('test-agent', makeConfig('test-agent'), makeHeraldConfig(), 'Hello');

      expect(manager.getStatus('test-agent')).toBe('failed');
    });

    it('stores error message in session', async () => {
      mockAdapter.shouldThrow = true;
      mockAdapter.throwError = new Error('Rate limit exceeded');

      await manager.runAgent('test-agent', makeConfig('test-agent'), makeHeraldConfig(), 'Hello');

      const session = manager.getSession('test-agent');
      expect(session?.lastError).toBe('Rate limit exceeded');
    });

    it('returns error message string instead of throwing', async () => {
      mockAdapter.shouldThrow = true;

      const result = await manager.runAgent(
        'test-agent',
        makeConfig('test-agent'),
        makeHeraldConfig(),
        'Hello',
      );

      expect(result).toContain('Error:');
    });

    it('does not crash on non-Error thrown value', async () => {
      mockAdapter.shouldThrow = true;
      // biome-ignore lint/suspicious/noExplicitAny: testing non-Error throw
      (mockAdapter as any).throwError = 'string error';
      mockAdapter.sendMessage = async () => {
        throw 'string error';
      };

      const result = await manager.runAgent(
        'test-agent',
        makeConfig('test-agent'),
        makeHeraldConfig(),
        'Hello',
      );

      expect(result).toContain('Error:');
      expect(manager.getStatus('test-agent')).toBe('failed');
    });

    it('clears error on subsequent successful run', async () => {
      mockAdapter.shouldThrow = true;
      await manager.runAgent('test-agent', makeConfig('test-agent'), makeHeraldConfig(), 'Fail');
      expect(manager.getStatus('test-agent')).toBe('failed');

      mockAdapter.shouldThrow = false;
      await manager.runAgent('test-agent', makeConfig('test-agent'), makeHeraldConfig(), 'Succeed');
      expect(manager.getStatus('test-agent')).toBe('idle');
      expect(manager.getSession('test-agent')?.lastError).toBeUndefined();
    });
  });

  describe('saveState', () => {
    it('writes session summary to last-jobs.md', async () => {
      const heraldConfig = makeHeraldConfig();
      await manager.runAgent('test-agent', makeConfig('test-agent'), heraldConfig, 'Hello');

      await manager.saveState('test-agent', heraldConfig);

      const lastJobsPath = join(memoryDir, 'agents', 'test-agent', 'last-jobs.md');
      const content = await Bun.file(lastJobsPath).text();

      expect(content).toContain('# Last Session Summary');
      expect(content).toContain('Date:');
      expect(content).toContain('Interactions:');
      expect(content).toContain('## Conversation Summary');
      expect(content).toContain('## Key Outputs');
    });

    it('does nothing when no session exists', async () => {
      // Should not throw
      await manager.saveState('nonexistent', makeHeraldConfig());
    });
  });

  describe('getStatus', () => {
    it('returns idle for unknown agent', () => {
      expect(manager.getStatus('unknown')).toBe('idle');
    });

    it('returns current status for known agent', async () => {
      await manager.runAgent('test-agent', makeConfig('test-agent'), makeHeraldConfig(), 'Hello');

      expect(manager.getStatus('test-agent')).toBe('idle');
    });
  });

  describe('getSession', () => {
    it('returns undefined for unknown agent', () => {
      expect(manager.getSession('unknown')).toBeUndefined();
    });

    it('returns session state for known agent', async () => {
      await manager.runAgent('test-agent', makeConfig('test-agent'), makeHeraldConfig(), 'Hello');

      const session = manager.getSession('test-agent');
      expect(session).toBeDefined();
      expect(session?.agentName).toBe('test-agent');
      expect(session?.interactionCount).toBe(1);
    });
  });
});
