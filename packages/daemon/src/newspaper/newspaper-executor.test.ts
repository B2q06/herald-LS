import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AgentConfig, HeraldConfig } from '@herald/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentRegistry } from '../agent-loader/agent-registry.ts';
import type { SdkAdapter, SendMessageParams, SendMessageResult } from '../session/sdk-adapter.ts';
import { SessionManager } from '../session/session-manager.ts';
import { executeNewspaperRun } from './newspaper-executor.ts';

class MockSdkAdapter implements SdkAdapter {
  public response: SendMessageResult = {
    text: '# Herald Daily Brief -- 2026-02-28\n\n## Top Stories\n\nSome content here',
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

describe('newspaper-executor', () => {
  let tempDir: string;
  let heraldConfig: HeraldConfig;
  let registry: AgentRegistry;
  let sessionManager: SessionManager;
  let mockAdapter: MockSdkAdapter;

  const makeConfig = (name: string, teamEligible = false): AgentConfig => ({
    name,
    persona: `${name}.md`,
    output_dir: `reports/${name}`,
    session_limit: 5,
    notify_policy: 'all',
    team_eligible: teamEligible,
  });

  beforeEach(async () => {
    tempDir = join(tmpdir(), `herald-newspaper-exec-test-${Date.now()}`);
    const personasDir = join(tempDir, 'personas');
    const memoryDir = join(tempDir, 'memory');

    await mkdir(personasDir, { recursive: true });
    await mkdir(join(memoryDir, 'agents', 'newspaper'), { recursive: true });
    await Bun.write(join(personasDir, 'newspaper.md'), '# Newspaper Persona');
    await Bun.write(join(memoryDir, 'agents', 'newspaper', 'knowledge.md'), '');
    await Bun.write(join(memoryDir, 'agents', 'newspaper', 'last-jobs.md'), '');

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
    mockAdapter = new MockSdkAdapter();
    sessionManager = new SessionManager(mockAdapter);

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('executeNewspaperRun', () => {
    it('gathers reports from team-eligible agents', async () => {
      registry.register('newspaper', makeConfig('newspaper', false));
      registry.register('ml-researcher', makeConfig('ml-researcher', true));

      // Create a report for the researcher
      const mlDir = join(heraldConfig.reports_dir, 'ml-researcher');
      await mkdir(mlDir, { recursive: true });
      await writeFile(
        join(mlDir, '20260228-050000.md'),
        '---\nstatus: success\n---\n# ML Report\nFindings here',
      );

      const result = await executeNewspaperRun(registry, sessionManager, heraldConfig);

      expect(result.sourcesUsed).toContain('ml-researcher');
      expect(result.sourcesMissing).toHaveLength(0);
    });

    it('creates edition directory structure', async () => {
      registry.register('newspaper', makeConfig('newspaper', false));

      const result = await executeNewspaperRun(registry, sessionManager, heraldConfig);

      expect(existsSync(result.editionDir)).toBe(true);
      expect(existsSync(join(result.editionDir, 'sources'))).toBe(true);
    });

    it('copies each researcher report to sources/{agent-name}.md', async () => {
      registry.register('newspaper', makeConfig('newspaper', false));
      registry.register('ml-researcher', makeConfig('ml-researcher', true));
      registry.register('compute-researcher', makeConfig('compute-researcher', true));

      const mlDir = join(heraldConfig.reports_dir, 'ml-researcher');
      const computeDir = join(heraldConfig.reports_dir, 'compute-researcher');
      await mkdir(mlDir, { recursive: true });
      await mkdir(computeDir, { recursive: true });

      await writeFile(join(mlDir, '20260228-050000.md'), '---\nstatus: success\n---\n# ML Report');
      await writeFile(
        join(computeDir, '20260228-050000.md'),
        '---\nstatus: success\n---\n# Compute Report',
      );

      const result = await executeNewspaperRun(registry, sessionManager, heraldConfig);

      const mlSource = await Bun.file(
        join(result.editionDir, 'sources', 'ml-researcher.md'),
      ).text();
      const computeSource = await Bun.file(
        join(result.editionDir, 'sources', 'compute-researcher.md'),
      ).text();

      expect(mlSource).toContain('ML Report');
      expect(computeSource).toContain('Compute Report');
    });

    it('calls executeRun with newspaper agent config and synthesis prompt', async () => {
      registry.register('newspaper', makeConfig('newspaper', false));

      const result = await executeNewspaperRun(registry, sessionManager, heraldConfig);

      expect(result.runId).toMatch(/^\d{8}-\d{6}-[a-z0-9]{4}$/);
      expect(result.status).toBe('success');
    });

    it('writes synthesis output to sources/editorial.md', async () => {
      registry.register('newspaper', makeConfig('newspaper', false));

      const result = await executeNewspaperRun(registry, sessionManager, heraldConfig);

      const editorialPath = join(result.editionDir, 'sources', 'editorial.md');
      expect(existsSync(editorialPath)).toBe(true);
      const content = await Bun.file(editorialPath).text();
      expect(content).toContain('Herald Daily Brief');
    });

    it('returns correct sourcesUsed and sourcesMissing', async () => {
      registry.register('newspaper', makeConfig('newspaper', false));
      registry.register('ml-researcher', makeConfig('ml-researcher', true));
      registry.register('compute-researcher', makeConfig('compute-researcher', true));

      const mlDir = join(heraldConfig.reports_dir, 'ml-researcher');
      await mkdir(mlDir, { recursive: true });
      await writeFile(join(mlDir, '20260228-050000.md'), '---\nstatus: success\n---\n# ML Report');

      // No compute-researcher report directory -> missing

      const result = await executeNewspaperRun(registry, sessionManager, heraldConfig);

      expect(result.sourcesUsed).toContain('ml-researcher');
      expect(result.sourcesMissing).toContain('compute-researcher');
    });

    it('throws when newspaper agent is not registered', async () => {
      // Only register a researcher, not the newspaper agent
      registry.register('ml-researcher', makeConfig('ml-researcher', true));

      await expect(executeNewspaperRun(registry, sessionManager, heraldConfig)).rejects.toThrow(
        'Newspaper agent not registered',
      );
    });

    it('handles case where no research reports are available (still produces newspaper)', async () => {
      registry.register('newspaper', makeConfig('newspaper', false));

      const result = await executeNewspaperRun(registry, sessionManager, heraldConfig);

      // Should still succeed -- missing research doesn't block publication
      expect(result.status).toBe('success');
      expect(result.sourcesUsed).toHaveLength(0);
    });

    it('never crashes daemon on SDK error', async () => {
      registry.register('newspaper', makeConfig('newspaper', false));
      mockAdapter.shouldThrow = true;
      mockAdapter.throwError = new Error('SDK failed');

      const result = await executeNewspaperRun(registry, sessionManager, heraldConfig);

      // executeRun catches errors and returns failed status
      expect(result.status).toBe('failed');
    });

    it('returns the correct editionDate', async () => {
      registry.register('newspaper', makeConfig('newspaper', false));

      const result = await executeNewspaperRun(registry, sessionManager, heraldConfig);

      // Should be today's date in YYYY-MM-DD format
      expect(result.editionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('executeNewspaperRun with mode=weekly', () => {
    it('writes output to newspaper/weekly/{date}-weekly.md', async () => {
      registry.register('newspaper', makeConfig('newspaper', false));

      const result = await executeNewspaperRun(
        registry,
        sessionManager,
        heraldConfig,
        undefined,
        'weekly',
      );

      expect(result.status).toBe('success');
      const weeklyDir = join(heraldConfig.newspaper_dir, 'weekly');
      expect(existsSync(weeklyDir)).toBe(true);
    });

    it('does not copy individual source files for weekly mode', async () => {
      registry.register('newspaper', makeConfig('newspaper', false));
      registry.register('ml-researcher', makeConfig('ml-researcher', true));

      const mlDir = join(heraldConfig.reports_dir, 'ml-researcher');
      await mkdir(mlDir, { recursive: true });
      await writeFile(join(mlDir, '20260228-050000.md'), '---\nstatus: success\n---\n# ML Report');

      const result = await executeNewspaperRun(
        registry,
        sessionManager,
        heraldConfig,
        undefined,
        'weekly',
      );

      // In weekly mode, sources should NOT be copied to sources/ dir
      const sourcesDir = join(result.editionDir, 'sources');
      expect(existsSync(sourcesDir)).toBe(false);
    });
  });
});
