import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AgentConfig, HeraldConfig } from '@herald/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentRegistry } from '../agent-loader/agent-registry.ts';
import { executeRun, generateRunId } from './run-executor.ts';
import type { SdkAdapter, SendMessageParams, SendMessageResult } from './sdk-adapter.ts';
import { SessionManager } from './session-manager.ts';

class MockSdkAdapter implements SdkAdapter {
  public response: SendMessageResult = {
    text: 'Mock agent patrol report content',
    inputTokens: 100,
    outputTokens: 50,
  };
  public shouldThrow = false;
  public throwError: Error = new Error('Mock SDK error');

  async sendMessage(_params: SendMessageParams): Promise<SendMessageResult> {
    if (this.shouldThrow) {
      throw this.throwError;
    }
    return this.response;
  }
}

describe('run-executor', () => {
  let tempDir: string;
  let heraldConfig: HeraldConfig;
  let registry: AgentRegistry;
  let sessionManager: SessionManager;
  let mockAdapter: MockSdkAdapter;

  const makeConfig = (name: string): AgentConfig => ({
    name,
    persona: `${name}.md`,
    output_dir: `reports/${name}`,
    session_limit: 10,
    notify_policy: 'failures',
    team_eligible: false,
  });

  beforeEach(async () => {
    tempDir = join(tmpdir(), `herald-executor-test-${Date.now()}`);
    const personasDir = join(tempDir, 'personas');
    const memoryDir = join(tempDir, 'memory');

    await mkdir(personasDir, { recursive: true });
    await mkdir(join(memoryDir, 'agents', 'test-agent'), { recursive: true });
    await Bun.write(join(personasDir, 'test-agent.md'), '# Test Persona');
    await Bun.write(join(memoryDir, 'agents', 'test-agent', 'knowledge.md'), '');
    await Bun.write(join(memoryDir, 'agents', 'test-agent', 'last-jobs.md'), '');

    heraldConfig = {
      port: 3117,
      data_dir: join(tempDir, 'data'),
      agents_dir: join(tempDir, 'agents'),
      personas_dir: personasDir,
      memory_dir: memoryDir,
      reports_dir: join(tempDir, 'reports'),
      newspaper_dir: join(tempDir, 'newspaper'),
      log_level: 'info',
    };

    registry = new AgentRegistry();
    registry.register('test-agent', makeConfig('test-agent'));

    mockAdapter = new MockSdkAdapter();
    sessionManager = new SessionManager(mockAdapter);

    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('generateRunId', () => {
    it('returns a string in YYYYMMDD-HHmmss format', () => {
      const runId = generateRunId();
      expect(runId).toMatch(/^\d{8}-\d{6}$/);
    });
  });

  describe('executeRun', () => {
    it('returns a successful RunResult', async () => {
      const result = await executeRun(
        'test-agent',
        makeConfig('test-agent'),
        heraldConfig,
        sessionManager,
        registry,
        'Do your thing',
      );

      expect(result.status).toBe('success');
      expect(result.result).toBe('Mock agent patrol report content');
      expect(result.runId).toMatch(/^\d{8}-\d{6}$/);
      expect(result.startedAt).toBeTruthy();
      expect(result.finishedAt).toBeTruthy();
    });

    it('writes report file with correct frontmatter', async () => {
      const result = await executeRun(
        'test-agent',
        makeConfig('test-agent'),
        heraldConfig,
        sessionManager,
        registry,
        'Do your thing',
      );

      const reportPath = join(tempDir, 'reports', 'test-agent', `${result.runId}.md`);
      const content = await Bun.file(reportPath).text();

      expect(content).toContain('---');
      expect(content).toContain('agent: test-agent');
      expect(content).toContain(`run_id: "${result.runId}"`);
      expect(content).toContain('status: success');
      expect(content).toContain('started_at:');
      expect(content).toContain('finished_at:');
      expect(content).toContain('# test-agent Patrol Report');
      expect(content).toContain('Mock agent patrol report content');
    });

    it('writes transcript file', async () => {
      const result = await executeRun(
        'test-agent',
        makeConfig('test-agent'),
        heraldConfig,
        sessionManager,
        registry,
        'Do your thing',
      );

      // Extract date from runId
      const dateStr = result.runId.slice(0, 8);
      const formattedDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;

      const transcriptPath = join(
        tempDir,
        'memory',
        'conversations',
        `${formattedDate}-test-agent.md`,
      );
      const content = await Bun.file(transcriptPath).text();

      expect(content).toContain('# Conversation: test-agent');
      expect(content).toContain(`## Run: ${result.runId}`);
    });

    it('updates registry lastRun on success', async () => {
      const result = await executeRun(
        'test-agent',
        makeConfig('test-agent'),
        heraldConfig,
        sessionManager,
        registry,
        'Do your thing',
      );

      const agent = registry.get('test-agent');
      expect(agent?.lastRun).toBeDefined();
      expect(agent?.lastRun?.runId).toBe(result.runId);
      expect(agent?.lastRun?.status).toBe('success');
    });

    it('handles errors and returns failed status', async () => {
      mockAdapter.shouldThrow = true;
      mockAdapter.throwError = new Error('Something went wrong');

      const result = await executeRun(
        'test-agent',
        makeConfig('test-agent'),
        heraldConfig,
        sessionManager,
        registry,
        'Do your thing',
      );

      expect(result.status).toBe('failed');
      expect(result.result).toContain('Something went wrong');
    });

    it('writes failed report on error', async () => {
      mockAdapter.shouldThrow = true;
      mockAdapter.throwError = new Error('SDK failure');

      const result = await executeRun(
        'test-agent',
        makeConfig('test-agent'),
        heraldConfig,
        sessionManager,
        registry,
        'Do your thing',
      );

      const reportPath = join(tempDir, 'reports', 'test-agent', `${result.runId}.md`);
      const content = await Bun.file(reportPath).text();

      expect(content).toContain('status: failed');
      expect(content).toContain('SDK failure');
    });

    it('updates registry lastRun on failure', async () => {
      mockAdapter.shouldThrow = true;

      const result = await executeRun(
        'test-agent',
        makeConfig('test-agent'),
        heraldConfig,
        sessionManager,
        registry,
        'Do your thing',
      );

      const agent = registry.get('test-agent');
      expect(agent?.lastRun?.status).toBe('failed');
      expect(agent?.lastRun?.runId).toBe(result.runId);
    });

    it('works without registry (optional)', async () => {
      const result = await executeRun(
        'test-agent',
        makeConfig('test-agent'),
        heraldConfig,
        sessionManager,
        undefined,
        'Do your thing',
      );

      expect(result.status).toBe('success');
    });

    it('uses default prompt when none provided', async () => {
      const result = await executeRun(
        'test-agent',
        makeConfig('test-agent'),
        heraldConfig,
        sessionManager,
        registry,
      );

      expect(result.status).toBe('success');
      expect(result.result).toBe('Mock agent patrol report content');
    });
  });
});
