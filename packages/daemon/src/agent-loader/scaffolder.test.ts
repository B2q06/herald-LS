import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AgentConfig } from '@herald/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { scaffoldAgentDirs } from './scaffolder.ts';

describe('scaffoldAgentDirs', () => {
  let tempDir: string;
  let memoryDir: string;
  let reportsDir: string;

  const makeConfig = (name: string): AgentConfig => ({
    name,
    persona: `personas/${name}.md`,
    output_dir: `reports/${name}`,
    session_limit: 10,
    notify_policy: 'failures',
    team_eligible: false,
  });

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'herald-scaffold-test-'));
    memoryDir = join(tempDir, 'memory');
    reportsDir = join(tempDir, 'reports');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('creates all required directories', async () => {
    await scaffoldAgentDirs('test-agent', makeConfig('test-agent'), { memoryDir, reportsDir });

    const agentMemDir = join(memoryDir, 'agents', 'test-agent');
    const agentRagDir = join(agentMemDir, 'rag');
    const agentReportDir = join(reportsDir, 'test-agent');

    // Check dirs exist by listing them
    const memContents = await readdir(agentMemDir);
    expect(memContents).toContain('rag');
    expect(memContents).toContain('knowledge.md');
    expect(memContents).toContain('preferences.md');
    expect(memContents).toContain('last-jobs.md');

    const ragContents = await readdir(agentRagDir);
    expect(ragContents).toEqual([]);

    const reportContents = await readdir(agentReportDir);
    expect(reportContents).toEqual([]);
  });

  it('creates knowledge.md with BMAD skeleton', async () => {
    await scaffoldAgentDirs('test-agent', makeConfig('test-agent'), { memoryDir, reportsDir });

    const knowledgePath = join(memoryDir, 'agents', 'test-agent', 'knowledge.md');
    const content = await Bun.file(knowledgePath).text();

    expect(content).toContain('# test-agent — Knowledge Base');
    expect(content).toContain('## Domain Knowledge');
    expect(content).toContain('## Developing Opinions');
    expect(content).toContain('## Predictions Log');
    expect(content).toContain('## Accountability');
    expect(content).toContain('Calibration Record');
  });

  it('creates empty preferences.md and last-jobs.md', async () => {
    await scaffoldAgentDirs('test-agent', makeConfig('test-agent'), { memoryDir, reportsDir });

    const prefsPath = join(memoryDir, 'agents', 'test-agent', 'preferences.md');
    const jobsPath = join(memoryDir, 'agents', 'test-agent', 'last-jobs.md');

    const prefsContent = await Bun.file(prefsPath).text();
    const jobsContent = await Bun.file(jobsPath).text();

    expect(prefsContent).toBe('');
    expect(jobsContent).toBe('');
  });

  it('does not overwrite existing knowledge.md', async () => {
    await scaffoldAgentDirs('test-agent', makeConfig('test-agent'), { memoryDir, reportsDir });

    // Write custom content
    const knowledgePath = join(memoryDir, 'agents', 'test-agent', 'knowledge.md');
    await Bun.write(knowledgePath, '# Custom Knowledge');

    // Scaffold again
    await scaffoldAgentDirs('test-agent', makeConfig('test-agent'), { memoryDir, reportsDir });

    const content = await Bun.file(knowledgePath).text();
    expect(content).toBe('# Custom Knowledge');
  });

  it('does not overwrite existing preferences.md or last-jobs.md', async () => {
    await scaffoldAgentDirs('test-agent', makeConfig('test-agent'), { memoryDir, reportsDir });

    const prefsPath = join(memoryDir, 'agents', 'test-agent', 'preferences.md');
    await Bun.write(prefsPath, '# My Preferences');

    await scaffoldAgentDirs('test-agent', makeConfig('test-agent'), { memoryDir, reportsDir });

    const content = await Bun.file(prefsPath).text();
    expect(content).toBe('# My Preferences');
  });

  it('is safe to call multiple times', async () => {
    const config = makeConfig('test-agent');
    await scaffoldAgentDirs('test-agent', config, { memoryDir, reportsDir });
    await scaffoldAgentDirs('test-agent', config, { memoryDir, reportsDir });

    const agentMemDir = join(memoryDir, 'agents', 'test-agent');
    const contents = await readdir(agentMemDir);
    expect(contents).toContain('knowledge.md');
  });
});
