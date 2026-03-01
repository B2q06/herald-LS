import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AgentConfig, HeraldConfig } from '@herald/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MemoryLibrarian } from '../librarian/ask-librarian.ts';
import { loadPersonaContext } from './persona-loader.ts';

describe('loadPersonaContext', () => {
  let tempDir: string;
  let personasDir: string;
  let memoryDir: string;

  const makeConfig = (name: string, overrides?: Partial<AgentConfig>): AgentConfig => ({
    name,
    persona: `${name}.md`,
    output_dir: `reports/${name}`,
    session_limit: 10,
    notify_policy: 'failures',
    team_eligible: false,
    ...overrides,
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
    await mkdir(join(tempDir, 'agents'), { recursive: true });
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

  it('includes knowledge content with write instructions', async () => {
    await Bun.write(join(personasDir, 'test-agent.md'), '# Persona');
    await Bun.write(
      join(memoryDir, 'agents', 'test-agent', 'knowledge.md'),
      '# Knowledge\nImportant facts here.',
    );

    const result = await loadPersonaContext(makeConfig('test-agent'), makeHeraldConfig());

    expect(result.systemPrompt).toContain('# Persona');
    expect(result.systemPrompt).toContain('## Your Knowledge Base');
    expect(result.systemPrompt).toContain('Important facts here.');
    expect(result.systemPrompt).toContain('Knowledge file location:');
  });

  it('shows empty knowledge message when knowledge.md is empty', async () => {
    await Bun.write(join(personasDir, 'test-agent.md'), '# Persona');
    await Bun.write(join(memoryDir, 'agents', 'test-agent', 'knowledge.md'), '');

    const result = await loadPersonaContext(makeConfig('test-agent'), makeHeraldConfig());

    expect(result.systemPrompt).toContain('knowledge base is empty');
    expect(result.systemPrompt).toContain('Knowledge file location:');
  });

  it('injects agent configuration context', async () => {
    await Bun.write(join(personasDir, 'test-agent.md'), '# Persona');

    const result = await loadPersonaContext(
      makeConfig('test-agent', {
        schedule: '30 5 * * *',
        discovery_mode: 'aggressive',
      }),
      makeHeraldConfig(),
    );

    expect(result.systemPrompt).toContain('## Active Configuration');
    expect(result.systemPrompt).toContain('Agent: test-agent');
    expect(result.systemPrompt).toContain('Discovery Mode: aggressive');
    expect(result.systemPrompt).toContain('Schedule: 30 5 * * *');
  });

  it('defaults discovery_mode to moderate when not set', async () => {
    await Bun.write(join(personasDir, 'test-agent.md'), '# Persona');

    const result = await loadPersonaContext(makeConfig('test-agent'), makeHeraldConfig());

    expect(result.systemPrompt).toContain('Discovery Mode: moderate');
  });

  it('shows manual schedule when none set', async () => {
    await Bun.write(join(personasDir, 'test-agent.md'), '# Persona');

    const result = await loadPersonaContext(makeConfig('test-agent'), makeHeraldConfig());

    expect(result.systemPrompt).toContain('Schedule: manual');
  });

  it('injects discovery mode rules when config file exists', async () => {
    await Bun.write(join(personasDir, 'test-agent.md'), '# Persona');
    await mkdir(join(tempDir, 'config'), { recursive: true });
    await Bun.write(
      join(tempDir, 'config', 'discovery-modes.md'),
      '# Discovery Modes\n\n## Aggressive\n\nCast a wide net.\n\n## Moderate\n\nStick to domain.',
    );

    const result = await loadPersonaContext(
      makeConfig('test-agent', { discovery_mode: 'aggressive' }),
      makeHeraldConfig(),
    );

    expect(result.systemPrompt).toContain('## Active Discovery Mode Rules');
    expect(result.systemPrompt).toContain('Cast a wide net.');
    expect(result.systemPrompt).not.toContain('Stick to domain.');
  });

  it('handles missing discovery-modes.md gracefully', async () => {
    await Bun.write(join(personasDir, 'test-agent.md'), '# Persona');

    const result = await loadPersonaContext(
      makeConfig('test-agent', { discovery_mode: 'aggressive' }),
      makeHeraldConfig(),
    );

    expect(result.systemPrompt).not.toContain('## Active Discovery Mode Rules');
  });

  it('returns knowledgePath in result', async () => {
    await Bun.write(join(personasDir, 'test-agent.md'), '# Persona');

    const result = await loadPersonaContext(makeConfig('test-agent'), makeHeraldConfig());

    expect(result.knowledgePath).toContain('memory');
    expect(result.knowledgePath).toContain('test-agent');
    expect(result.knowledgePath).toContain('knowledge.md');
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

    expect(result.systemPrompt).toContain('## Active Configuration');
    expect(result.previousState).toBeNull();
  });

  it('does not add knowledge content when knowledge.md is only whitespace', async () => {
    await Bun.write(join(personasDir, 'test-agent.md'), '# Persona');
    await Bun.write(join(memoryDir, 'agents', 'test-agent', 'knowledge.md'), '   \n  \n  ');

    const result = await loadPersonaContext(makeConfig('test-agent'), makeHeraldConfig());

    expect(result.systemPrompt).toContain('knowledge base is empty');
  });

  describe('cross-agent intelligence injection', () => {
    it('injects cross-agent section when librarian returns results', async () => {
      await Bun.write(join(personasDir, 'test-agent.md'), '# Persona');
      await Bun.write(
        join(memoryDir, 'agents', 'test-agent', 'knowledge.md'),
        '## Domain Knowledge\n### MoE Architecture\nSome content.',
      );

      const mockLibrarian = {
        queryForAgent: vi.fn().mockResolvedValue(
          '## Cross-Agent Intelligence\nRecent findings from other agents:\n\n### From ai-tooling\n- MoE in production systems',
        ),
      } as unknown as MemoryLibrarian;

      const result = await loadPersonaContext(
        makeConfig('test-agent'),
        makeHeraldConfig(),
        mockLibrarian,
      );

      expect(result.systemPrompt).toContain('## Cross-Agent Intelligence');
      expect(result.systemPrompt).toContain('ai-tooling');
      expect(mockLibrarian.queryForAgent).toHaveBeenCalledWith('test-agent', ['MoE Architecture']);
    });

    it('skips cross-agent section when librarian returns empty', async () => {
      await Bun.write(join(personasDir, 'test-agent.md'), '# Persona');
      await Bun.write(
        join(memoryDir, 'agents', 'test-agent', 'knowledge.md'),
        '## Domain Knowledge\n### Some Topic\nContent.',
      );

      const mockLibrarian = {
        queryForAgent: vi.fn().mockResolvedValue(''),
      } as unknown as MemoryLibrarian;

      const result = await loadPersonaContext(
        makeConfig('test-agent'),
        makeHeraldConfig(),
        mockLibrarian,
      );

      expect(result.systemPrompt).not.toContain('Cross-Agent Intelligence');
    });

    it('degrades gracefully when librarian throws', async () => {
      await Bun.write(join(personasDir, 'test-agent.md'), '# Persona');
      await Bun.write(
        join(memoryDir, 'agents', 'test-agent', 'knowledge.md'),
        '## Domain Knowledge\n### Topic\nContent.',
      );

      const mockLibrarian = {
        queryForAgent: vi.fn().mockRejectedValue(new Error('DB error')),
      } as unknown as MemoryLibrarian;

      const result = await loadPersonaContext(
        makeConfig('test-agent'),
        makeHeraldConfig(),
        mockLibrarian,
      );

      // Should still return a valid persona context
      expect(result.systemPrompt).toContain('# Persona');
      expect(result.systemPrompt).not.toContain('Cross-Agent Intelligence');
    });

    it('skips cross-agent when no librarian provided', async () => {
      await Bun.write(join(personasDir, 'test-agent.md'), '# Persona');
      await Bun.write(
        join(memoryDir, 'agents', 'test-agent', 'knowledge.md'),
        '## Domain Knowledge\n### Topic\nContent.',
      );

      const result = await loadPersonaContext(makeConfig('test-agent'), makeHeraldConfig());

      expect(result.systemPrompt).not.toContain('Cross-Agent Intelligence');
    });
  });
});
