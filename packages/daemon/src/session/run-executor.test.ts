import { mkdir, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AgentConfig, HeraldConfig } from '@herald/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentRegistry } from '../agent-loader/agent-registry.ts';
import { executeRun, generateRunId } from './run-executor.ts';
import type { PostRunContext } from './run-executor.ts';
import type { SdkAdapter, SendMessageParams, SendMessageResult } from './sdk-adapter.ts';
import { SessionManager } from './session-manager.ts';

// Module-scope mocks (hoisted by vitest)
vi.mock('../librarian/post-run-hook.ts', () => ({
  processRunOutput: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../librarian/connections-writer.ts', () => ({
  writeConnections: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../memory/knowledge-manager.ts', () => ({
  KnowledgeManager: vi.fn().mockImplementation(() => ({
    syncKnowledge: vi.fn().mockResolvedValue(undefined),
  })),
}));
vi.mock('../newspaper/breaking-update.ts', () => ({
  processBreakingUpdate: vi.fn().mockResolvedValue({
    updateId: 'update-120000',
    updatePath: '/tmp/update.md',
    editionDate: '2026-02-28',
    recompiled: true,
    committed: true,
  }),
}));
vi.mock('../newspaper/featured-story.ts', () => ({
  parseFeaturedStoriesFromFrontmatter: vi.fn().mockReturnValue(null),
  processAllFeaturedStories: vi.fn().mockResolvedValue([]),
}));

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
    tempDir = join(tmpdir(), `herald-executor-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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
      expect(runId).toMatch(/^\d{8}-\d{6}-[a-z0-9]{4}$/);
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
      expect(result.runId).toMatch(/^\d{8}-\d{6}-[a-z0-9]{4}$/);
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
      // Agent output is written directly — no duplicate header wrapping
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

  describe('breaking event detection in post-run hooks', () => {
    // These tests verify that when a report starts with BREAKING:,
    // the post-run hook calls processBreakingUpdate.

    // We mock the librarian, connections-writer, knowledge-manager, and breaking-update modules
    // so the hooks run without real dependencies.
    beforeEach(async () => {
      vi.clearAllMocks();
      vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    it('detects BREAKING: prefix in report and calls processBreakingUpdate', async () => {
      // Set the mock to return a report that starts with BREAKING:
      mockAdapter.response = {
        text: 'BREAKING: Major GPU Architecture Shift\n\nNVIDIA announces a new architecture...',
        inputTokens: 100,
        outputTokens: 50,
      };

      const mockPostRunContext: PostRunContext = {
        db: {} as any,
        embedder: {} as any,
        heraldConfig,
      };

      await executeRun(
        'test-agent',
        makeConfig('test-agent'),
        heraldConfig,
        sessionManager,
        registry,
        'Do your thing',
        mockPostRunContext,
      );

      // Wait for fire-and-forget hooks to complete
      await new Promise((resolve) => setTimeout(resolve, 200));

      const { processBreakingUpdate } = await import(
        '../newspaper/breaking-update.ts'
      );
      expect(processBreakingUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          source_agent: 'test-agent',
          headline: 'Major GPU Architecture Shift',
          urgency: 'high',
        }),
        expect.objectContaining({ heraldConfig }),
      );
    });

    it('does not call processBreakingUpdate for non-breaking reports', async () => {
      mockAdapter.response = {
        text: 'Normal report without breaking prefix\n\nJust regular content.',
        inputTokens: 100,
        outputTokens: 50,
      };

      const mockPostRunContext: PostRunContext = {
        db: {} as any,
        embedder: {} as any,
        heraldConfig,
      };

      await executeRun(
        'test-agent',
        makeConfig('test-agent'),
        heraldConfig,
        sessionManager,
        registry,
        'Do your thing',
        mockPostRunContext,
      );

      // Wait for fire-and-forget hooks to complete
      await new Promise((resolve) => setTimeout(resolve, 200));

      const { processBreakingUpdate } = await import(
        '../newspaper/breaking-update.ts'
      );
      expect(processBreakingUpdate).not.toHaveBeenCalled();
    });

    it('does not crash on malformed breaking content', async () => {
      mockAdapter.response = {
        text: 'BREAKING: \n\n',
        inputTokens: 100,
        outputTokens: 50,
      };

      const mockPostRunContext: PostRunContext = {
        db: {} as any,
        embedder: {} as any,
        heraldConfig,
      };

      // Should not throw
      const result = await executeRun(
        'test-agent',
        makeConfig('test-agent'),
        heraldConfig,
        sessionManager,
        registry,
        'Do your thing',
        mockPostRunContext,
      );

      // Wait for fire-and-forget hooks
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(result.status).toBe('success');

      // processBreakingUpdate should NOT be called because headline is empty
      const { processBreakingUpdate } = await import(
        '../newspaper/breaking-update.ts'
      );
      expect(processBreakingUpdate).not.toHaveBeenCalled();
    });
  });

  describe('featured story detection in post-run hooks', () => {
    beforeEach(async () => {
      vi.clearAllMocks();
      vi.spyOn(console, 'log').mockImplementation(() => {});

      // Set up newspaper agent in registry
      const personasDir = heraldConfig.personas_dir;
      const memoryDir = heraldConfig.memory_dir;
      await mkdir(join(personasDir), { recursive: true });
      await mkdir(join(memoryDir, 'agents', 'newspaper'), { recursive: true });
      await Bun.write(join(personasDir, 'newspaper.md'), '# Newspaper');
      await Bun.write(
        join(memoryDir, 'agents', 'newspaper', 'knowledge.md'),
        '',
      );
      await Bun.write(
        join(memoryDir, 'agents', 'newspaper', 'last-jobs.md'),
        '',
      );

      registry.register('newspaper', makeConfig('newspaper'));
    });

    it('does not trigger featured story processing for non-newspaper agents', async () => {
      mockAdapter.response = {
        text: 'Regular report from non-newspaper agent',
        inputTokens: 100,
        outputTokens: 50,
      };

      const mockPostRunContext: PostRunContext = {
        db: {} as any,
        embedder: {} as any,
        heraldConfig,
        featuredStoryDeps: {
          heraldConfig,
          registry,
          sessionManager,
        },
      };

      await executeRun(
        'test-agent',
        makeConfig('test-agent'),
        heraldConfig,
        sessionManager,
        registry,
        'Do your thing',
        mockPostRunContext,
      );

      // Wait for hooks
      await new Promise((resolve) => setTimeout(resolve, 200));

      const { parseFeaturedStoriesFromFrontmatter } = await import(
        '../newspaper/featured-story.ts'
      );
      expect(parseFeaturedStoriesFromFrontmatter).not.toHaveBeenCalled();
    });

    it('triggers featured story processing for newspaper agent with featured stories', async () => {
      const { parseFeaturedStoriesFromFrontmatter, processAllFeaturedStories } =
        await import('../newspaper/featured-story.ts');

      (
        parseFeaturedStoriesFromFrontmatter as ReturnType<typeof vi.fn>
      ).mockReturnValue([
        {
          headline: 'Test Story',
          summary: 'A test story',
          assigned_agent: 'ml-researcher',
          research_prompt: 'Research this',
          edition_date: '2026-02-28',
        },
      ]);

      mockAdapter.response = {
        text: '# Herald Daily Brief\n\nContent here',
        inputTokens: 100,
        outputTokens: 50,
      };

      const mockPostRunContext: PostRunContext = {
        db: {} as any,
        embedder: {} as any,
        heraldConfig,
        featuredStoryDeps: {
          heraldConfig,
          registry,
          sessionManager,
        },
      };

      await executeRun(
        'newspaper',
        makeConfig('newspaper'),
        heraldConfig,
        sessionManager,
        registry,
        'Synthesize the newspaper',
        mockPostRunContext,
      );

      // Wait for hooks
      await vi.waitFor(() => {
        expect(parseFeaturedStoriesFromFrontmatter).toHaveBeenCalled();
        expect(processAllFeaturedStories).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ headline: 'Test Story' }),
          ]),
          expect.objectContaining({ heraldConfig }),
        );
      }, { timeout: 1000 });
    });

    it('does not trigger processing when newspaper has no featured stories', async () => {
      const { parseFeaturedStoriesFromFrontmatter, processAllFeaturedStories } =
        await import('../newspaper/featured-story.ts');

      (
        parseFeaturedStoriesFromFrontmatter as ReturnType<typeof vi.fn>
      ).mockReturnValue(null);

      mockAdapter.response = {
        text: '# Herald Daily Brief\n\nNo featured stories today',
        inputTokens: 100,
        outputTokens: 50,
      };

      const mockPostRunContext: PostRunContext = {
        db: {} as any,
        embedder: {} as any,
        heraldConfig,
        featuredStoryDeps: {
          heraldConfig,
          registry,
          sessionManager,
        },
      };

      await executeRun(
        'newspaper',
        makeConfig('newspaper'),
        heraldConfig,
        sessionManager,
        registry,
        'Synthesize',
        mockPostRunContext,
      );

      // Wait for hooks — use vi.waitFor for the positive assertion, then check negative
      await vi.waitFor(() => {
        expect(parseFeaturedStoriesFromFrontmatter).toHaveBeenCalled();
      }, { timeout: 1000 });
      expect(processAllFeaturedStories).not.toHaveBeenCalled();
    });
  });
});
