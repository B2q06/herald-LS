import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseAgentYaml } from './yaml-parser.ts';

describe('parseAgentYaml', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'herald-yaml-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  const validYaml = `
name: ml-researcher
persona: personas/ml-researcher.md
schedule: "0 5 * * *"
output_dir: reports/ml-researcher
session_limit: 15
notify_policy: failures
memory_paths:
  knowledge: memory/agents/ml-researcher/knowledge.md
  preferences: memory/agents/ml-researcher/preferences.md
  last_jobs: memory/agents/ml-researcher/last-jobs.md
  rag: memory/agents/ml-researcher/rag
team_eligible: true
`;

  it('parses a valid YAML agent config', async () => {
    const filePath = join(tempDir, 'ml-researcher.yaml');
    await writeFile(filePath, validYaml, 'utf-8');

    const result = await parseAgentYaml(filePath);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.config.name).toBe('ml-researcher');
      expect(result.config.persona).toBe('personas/ml-researcher.md');
      expect(result.config.session_limit).toBe(15);
      expect(result.config.team_eligible).toBe(true);
    }
  });

  it('returns failure for invalid schema (missing required fields)', async () => {
    const filePath = join(tempDir, 'bad-agent.yaml');
    await writeFile(filePath, 'schedule: "0 5 * * *"\n', 'utf-8');

    const result = await parseAgentYaml(filePath);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Validation failed');
    }
  });

  it('returns failure for malformed YAML', async () => {
    const filePath = join(tempDir, 'malformed.yaml');
    await writeFile(filePath, ':::bad yaml{{{\n  - broken:', 'utf-8');

    const result = await parseAgentYaml(filePath);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Failed to parse');
    }
  });

  it('returns failure for missing file', async () => {
    const result = await parseAgentYaml(join(tempDir, 'nonexistent.yaml'));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('File not found');
    }
  });

  it('applies schema defaults for optional fields', async () => {
    const minimalYaml = `
name: simple-agent
persona: personas/simple.md
output_dir: reports/simple
`;
    const filePath = join(tempDir, 'simple.yaml');
    await writeFile(filePath, minimalYaml, 'utf-8');

    const result = await parseAgentYaml(filePath);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.config.session_limit).toBe(10);
      expect(result.config.notify_policy).toBe('failures');
      expect(result.config.team_eligible).toBe(false);
    }
  });

  it('returns failure for empty YAML content', async () => {
    const filePath = join(tempDir, 'empty.yaml');
    await writeFile(filePath, '', 'utf-8');

    const result = await parseAgentYaml(filePath);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid YAML structure');
    }
  });
});
