import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AgentRegistry } from '../agent-loader/agent-registry.ts';
import { initialScan } from './agent-discovery.ts';

describe('initialScan', () => {
  let tempDir: string;
  let agentsDir: string;
  let memoryDir: string;
  let reportsDir: string;
  let registry: AgentRegistry;

  const validYaml = (name: string) => `
name: ${name}
persona: personas/${name}.md
output_dir: reports/${name}
session_limit: 10
notify_policy: failures
`;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'herald-discovery-test-'));
    agentsDir = join(tempDir, 'agents');
    memoryDir = join(tempDir, 'memory');
    reportsDir = join(tempDir, 'reports');
    await mkdir(agentsDir, { recursive: true });
    registry = new AgentRegistry();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('loads all valid YAML files from agents directory', async () => {
    await writeFile(join(agentsDir, 'agent-a.yaml'), validYaml('agent-a'), 'utf-8');
    await writeFile(join(agentsDir, 'agent-b.yaml'), validYaml('agent-b'), 'utf-8');

    await initialScan({
      agentsDir,
      registry,
      scaffoldOptions: { memoryDir, reportsDir },
    });

    expect(registry.size).toBe(2);
    expect(registry.has('agent-a')).toBe(true);
    expect(registry.has('agent-b')).toBe(true);
  });

  it('skips invalid YAML files without crashing', async () => {
    await writeFile(join(agentsDir, 'good.yaml'), validYaml('good-agent'), 'utf-8');
    await writeFile(join(agentsDir, 'bad.yaml'), 'invalid: yaml: broken:', 'utf-8');

    await initialScan({
      agentsDir,
      registry,
      scaffoldOptions: { memoryDir, reportsDir },
    });

    // Good agent should be loaded, bad one skipped
    expect(registry.has('good-agent')).toBe(true);
    expect(registry.size).toBe(1);
  });

  it('skips non-YAML files', async () => {
    await writeFile(join(agentsDir, 'readme.txt'), 'not a yaml', 'utf-8');
    await writeFile(join(agentsDir, 'agent.yaml'), validYaml('agent'), 'utf-8');

    await initialScan({
      agentsDir,
      registry,
      scaffoldOptions: { memoryDir, reportsDir },
    });

    expect(registry.size).toBe(1);
  });

  it('handles empty agents directory', async () => {
    await initialScan({
      agentsDir,
      registry,
      scaffoldOptions: { memoryDir, reportsDir },
    });

    expect(registry.size).toBe(0);
  });

  it('handles non-existent agents directory', async () => {
    await initialScan({
      agentsDir: join(tempDir, 'nonexistent'),
      registry,
      scaffoldOptions: { memoryDir, reportsDir },
    });

    expect(registry.size).toBe(0);
  });

  it('scaffolds directories for loaded agents', async () => {
    await writeFile(join(agentsDir, 'agent.yaml'), validYaml('test-agent'), 'utf-8');

    await initialScan({
      agentsDir,
      registry,
      scaffoldOptions: { memoryDir, reportsDir },
    });

    const knowledgePath = join(memoryDir, 'agents', 'test-agent', 'knowledge.md');
    const knowledgeFile = Bun.file(knowledgePath);
    expect(await knowledgeFile.exists()).toBe(true);

    const content = await knowledgeFile.text();
    expect(content).toContain('# test-agent — Knowledge Base');
  });
});
