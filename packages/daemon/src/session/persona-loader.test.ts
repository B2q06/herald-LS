import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AgentConfig, HeraldConfig } from '@herald/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadPersonaContext } from './persona-loader.ts';

describe('loadPersonaContext', () => {
  let tempDir: string;
  let personasDir: string;
  let memoryDir: string;

  const makeConfig = (name: string): AgentConfig => ({
    name,
    persona: `${name}.md`,
    output_dir: `reports/${name}`,
    session_limit: 10,
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
    tempDir = join(tmpdir(), `herald-persona-test-${Date.now()}`);
    personasDir = join(tempDir, 'personas');
    memoryDir = join(tempDir, 'memory');

    await mkdir(personasDir, { recursive: true });
    await mkdir(join(memoryDir, 'agents', 'test-agent'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('loads persona MD into systemPrompt', async () => {
    await Bun.write(
      join(personasDir, 'test-agent.md'),
      '# Test Agent Persona\nYou are a test agent.',
    );

    const result = await loadPersonaContext(makeConfig('test-agent'), makeHeraldConfig());

    expect(result.systemPrompt).toContain('# Test Agent Persona');
    expect(result.systemPrompt).toContain('You are a test agent.');
  });

  it('combines persona and knowledge into systemPrompt', async () => {
    await Bun.write(join(personasDir, 'test-agent.md'), '# Persona');
    await Bun.write(
      join(memoryDir, 'agents', 'test-agent', 'knowledge.md'),
      '# Knowledge\nImportant facts here.',
    );

    const result = await loadPersonaContext(makeConfig('test-agent'), makeHeraldConfig());

    expect(result.systemPrompt).toContain('# Persona');
    expect(result.systemPrompt).toContain('## Current Knowledge');
    expect(result.systemPrompt).toContain('Important facts here.');
  });

  it('returns previousState from non-empty last-jobs.md', async () => {
    await Bun.write(join(personasDir, 'test-agent.md'), '# Persona');
    await Bun.write(
      join(memoryDir, 'agents', 'test-agent', 'last-jobs.md'),
      '# Last Session\nDid some work.',
    );

    const result = await loadPersonaContext(makeConfig('test-agent'), makeHeraldConfig());

    expect(result.previousState).toBe('# Last Session\nDid some work.');
  });

  it('returns null previousState when last-jobs.md is empty', async () => {
    await Bun.write(join(personasDir, 'test-agent.md'), '# Persona');
    await Bun.write(join(memoryDir, 'agents', 'test-agent', 'last-jobs.md'), '');

    const result = await loadPersonaContext(makeConfig('test-agent'), makeHeraldConfig());

    expect(result.previousState).toBeNull();
  });

  it('returns null previousState when last-jobs.md does not exist', async () => {
    await Bun.write(join(personasDir, 'test-agent.md'), '# Persona');

    const result = await loadPersonaContext(makeConfig('test-agent'), makeHeraldConfig());

    expect(result.previousState).toBeNull();
  });

  it('handles missing persona file gracefully', async () => {
    const result = await loadPersonaContext(makeConfig('test-agent'), makeHeraldConfig());

    expect(result.systemPrompt).toBe('');
    expect(result.previousState).toBeNull();
  });

  it('handles missing knowledge file gracefully', async () => {
    await Bun.write(join(personasDir, 'test-agent.md'), '# Persona');

    const result = await loadPersonaContext(makeConfig('test-agent'), makeHeraldConfig());

    // No "## Current Knowledge" section when knowledge is empty
    expect(result.systemPrompt).toBe('# Persona');
    expect(result.systemPrompt).not.toContain('## Current Knowledge');
  });

  it('does not add knowledge section when knowledge.md is only whitespace', async () => {
    await Bun.write(join(personasDir, 'test-agent.md'), '# Persona');
    await Bun.write(join(memoryDir, 'agents', 'test-agent', 'knowledge.md'), '   \n  \n  ');

    const result = await loadPersonaContext(makeConfig('test-agent'), makeHeraldConfig());

    expect(result.systemPrompt).not.toContain('## Current Knowledge');
  });
});
