import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AgentConfig, HeraldConfig } from '@herald/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AgentRegistry } from '../agent-loader/agent-registry.ts';
import {
  buildSynthesisPrompt,
  ensureEditionDir,
  gatherResearchReports,
} from './team-orchestrator.ts';

describe('team-orchestrator', () => {
  let tempDir: string;
  let heraldConfig: HeraldConfig;
  let registry: AgentRegistry;

  const makeConfig = (name: string, teamEligible = false): AgentConfig => ({
    name,
    persona: `${name}.md`,
    output_dir: `reports/${name}`,
    session_limit: 10,
    notify_policy: 'failures',
    team_eligible: teamEligible,
  });

  beforeEach(async () => {
    tempDir = join(tmpdir(), `herald-team-orch-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    heraldConfig = {
      port: 3117,
      data_dir: join(tempDir, 'data'),
      agents_dir: join(tempDir, 'agents'),
      personas_dir: join(tempDir, 'personas'),
      memory_dir: join(tempDir, 'memory'),
      reports_dir: join(tempDir, 'reports'),
      newspaper_dir: join(tempDir, 'newspaper'),
      log_level: 'info',
    };

    registry = new AgentRegistry();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('gatherResearchReports', () => {
    it('returns available reports for team_eligible agents with successful reports', async () => {
      // Register team-eligible agents
      registry.register('ml-researcher', makeConfig('ml-researcher', true));
      registry.register('compute-researcher', makeConfig('compute-researcher', true));

      // Create report directories and files
      const mlDir = join(heraldConfig.reports_dir, 'ml-researcher');
      const computeDir = join(heraldConfig.reports_dir, 'compute-researcher');
      await mkdir(mlDir, { recursive: true });
      await mkdir(computeDir, { recursive: true });

      await writeFile(
        join(mlDir, '20260228-050000.md'),
        '---\nstatus: success\n---\n# ML Report\nSome ML findings',
      );
      await writeFile(
        join(computeDir, '20260228-050000.md'),
        '---\nstatus: success\n---\n# Compute Report\nSome compute findings',
      );

      const result = await gatherResearchReports(registry, heraldConfig);

      expect(result.available.size).toBe(2);
      expect(result.available.has('ml-researcher')).toBe(true);
      expect(result.available.has('compute-researcher')).toBe(true);
      expect(result.available.get('ml-researcher')).toContain('ML Report');
      expect(result.missing).toHaveLength(0);
    });

    it('returns missing for agents with no reports directory', async () => {
      registry.register('ml-researcher', makeConfig('ml-researcher', true));

      const result = await gatherResearchReports(registry, heraldConfig);

      expect(result.available.size).toBe(0);
      expect(result.missing).toContain('ml-researcher');
    });

    it('returns missing for agents with status: failed reports', async () => {
      registry.register('ml-researcher', makeConfig('ml-researcher', true));

      const mlDir = join(heraldConfig.reports_dir, 'ml-researcher');
      await mkdir(mlDir, { recursive: true });
      await writeFile(
        join(mlDir, '20260228-050000.md'),
        '---\nstatus: failed\n---\n# ML Report\nFailed run',
      );

      const result = await gatherResearchReports(registry, heraldConfig);

      expect(result.available.size).toBe(0);
      expect(result.missing).toContain('ml-researcher');
    });

    it('skips agents with team_eligible: false', async () => {
      registry.register('newspaper', makeConfig('newspaper', false));
      registry.register('ml-researcher', makeConfig('ml-researcher', true));

      const mlDir = join(heraldConfig.reports_dir, 'ml-researcher');
      await mkdir(mlDir, { recursive: true });
      await writeFile(join(mlDir, '20260228-050000.md'), '---\nstatus: success\n---\n# ML Report');

      const result = await gatherResearchReports(registry, heraldConfig);

      expect(result.available.size).toBe(1);
      expect(result.available.has('ml-researcher')).toBe(true);
      // newspaper agent should not appear anywhere
      expect(result.available.has('newspaper')).toBe(false);
      expect(result.missing).not.toContain('newspaper');
    });

    it('never throws on any error condition', async () => {
      registry.register('ml-researcher', makeConfig('ml-researcher', true));
      registry.register('broken-agent', makeConfig('broken-agent', true));

      // No directories created -- should not throw
      const result = await gatherResearchReports(registry, heraldConfig);

      expect(result.available.size).toBe(0);
      expect(result.missing).toContain('ml-researcher');
      expect(result.missing).toContain('broken-agent');
    });

    it('returns missing for agents with empty reports directory', async () => {
      registry.register('ml-researcher', makeConfig('ml-researcher', true));

      const mlDir = join(heraldConfig.reports_dir, 'ml-researcher');
      await mkdir(mlDir, { recursive: true });
      // No .md files in directory

      const result = await gatherResearchReports(registry, heraldConfig);

      expect(result.available.size).toBe(0);
      expect(result.missing).toContain('ml-researcher');
    });

    it('reads the most recent report when multiple exist', async () => {
      registry.register('ml-researcher', makeConfig('ml-researcher', true));

      const mlDir = join(heraldConfig.reports_dir, 'ml-researcher');
      await mkdir(mlDir, { recursive: true });

      await writeFile(join(mlDir, '20260227-050000.md'), '---\nstatus: success\n---\n# Old Report');
      await writeFile(
        join(mlDir, '20260228-050000.md'),
        '---\nstatus: success\n---\n# Latest Report',
      );

      const result = await gatherResearchReports(registry, heraldConfig);

      expect(result.available.size).toBe(1);
      expect(result.available.get('ml-researcher')).toContain('Latest Report');
    });
  });

  describe('buildSynthesisPrompt', () => {
    it('includes all available reports in prompt', () => {
      const reports = new Map<string, string>();
      reports.set('ml-researcher', '# ML findings here');
      reports.set('compute-researcher', '# Compute findings here');

      const prompt = buildSynthesisPrompt(reports, [], '2026-02-28', '/tmp/output/editorial.md');

      expect(prompt).toContain('ml-researcher');
      expect(prompt).toContain('ML findings here');
      expect(prompt).toContain('compute-researcher');
      expect(prompt).toContain('Compute findings here');
    });

    it('lists missing agents in prompt', () => {
      const reports = new Map<string, string>();
      reports.set('ml-researcher', '# ML findings');

      const prompt = buildSynthesisPrompt(
        reports,
        ['compute-researcher', 'ai-tooling-researcher'],
        '2026-02-28',
        '/tmp/output/editorial.md',
      );

      expect(prompt).toContain('Missing Coverage');
      expect(prompt).toContain('compute-researcher');
      expect(prompt).toContain('ai-tooling-researcher');
    });

    it('includes output path instructions', () => {
      const reports = new Map<string, string>();
      const outputPath = '/tmp/newspaper/editions/2026-02-28/sources/editorial.md';

      const prompt = buildSynthesisPrompt(reports, [], '2026-02-28', outputPath);

      expect(prompt).toContain(outputPath);
    });

    it('includes date and time', () => {
      const reports = new Map<string, string>();

      const prompt = buildSynthesisPrompt(reports, [], '2026-02-28', '/tmp/output/editorial.md');

      expect(prompt).toContain('2026-02-28');
      expect(prompt).toContain('Current date:');
    });

    it('generates daily brief prompt by default', () => {
      const reports = new Map<string, string>();

      const prompt = buildSynthesisPrompt(reports, [], '2026-02-28', '/tmp/output/editorial.md');

      expect(prompt).toContain('Daily Brief');
    });

    it('generates weekly synthesis prompt when mode is weekly', () => {
      const reports = new Map<string, string>();

      const prompt = buildSynthesisPrompt(
        reports,
        [],
        '2026-02-28',
        '/tmp/output/weekly.md',
        'weekly',
      );

      expect(prompt).toContain('Weekly Strategic Synthesis');
      expect(prompt).toContain('overarching trends');
    });

    it('does not include Missing Coverage section when no agents missing', () => {
      const reports = new Map<string, string>();
      reports.set('ml-researcher', '# Findings');

      const prompt = buildSynthesisPrompt(reports, [], '2026-02-28', '/tmp/output/editorial.md');

      expect(prompt).not.toContain('Missing Coverage');
    });
  });

  describe('ensureEditionDir', () => {
    it('creates edition directory structure', async () => {
      const editionDir = await ensureEditionDir(heraldConfig, '2026-02-28');

      expect(editionDir).toBe(join(heraldConfig.newspaper_dir, 'editions', '2026-02-28'));

      const { existsSync } = await import('node:fs');
      expect(existsSync(editionDir)).toBe(true);
      expect(existsSync(join(editionDir, 'sources'))).toBe(true);
    });

    it('creates sources subdirectory', async () => {
      const editionDir = await ensureEditionDir(heraldConfig, '2026-02-28');

      const { existsSync } = await import('node:fs');
      expect(existsSync(join(editionDir, 'sources'))).toBe(true);
    });

    it('is idempotent (running twice does not error)', async () => {
      const editionDir1 = await ensureEditionDir(heraldConfig, '2026-02-28');
      const editionDir2 = await ensureEditionDir(heraldConfig, '2026-02-28');

      expect(editionDir1).toBe(editionDir2);
    });
  });
});
