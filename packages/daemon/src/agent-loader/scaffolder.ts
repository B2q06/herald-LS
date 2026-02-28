import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { AgentConfig } from '@herald/shared';

function knowledgeTemplate(agentName: string): string {
  return `# ${agentName} Knowledge

## Domain Knowledge

## Developing Opinions

## Predictions Log

## Accountability
`;
}

export interface ScaffoldOptions {
  memoryDir: string;
  reportsDir: string;
}

export async function scaffoldAgentDirs(
  name: string,
  _config: AgentConfig,
  options: ScaffoldOptions,
): Promise<void> {
  const { memoryDir, reportsDir } = options;

  const agentMemoryDir = join(memoryDir, 'agents', name);
  const agentRagDir = join(agentMemoryDir, 'rag');
  const agentReportsDir = join(reportsDir, name);

  // Create directories (recursive: true means no error if they exist)
  await mkdir(agentMemoryDir, { recursive: true });
  await mkdir(agentRagDir, { recursive: true });
  await mkdir(agentReportsDir, { recursive: true });

  // Create knowledge.md only if it doesn't exist
  const knowledgePath = join(agentMemoryDir, 'knowledge.md');
  const knowledgeFile = Bun.file(knowledgePath);
  if (!(await knowledgeFile.exists())) {
    await Bun.write(knowledgePath, knowledgeTemplate(name));
  }

  // Create preferences.md only if it doesn't exist
  const preferencesPath = join(agentMemoryDir, 'preferences.md');
  const preferencesFile = Bun.file(preferencesPath);
  if (!(await preferencesFile.exists())) {
    await Bun.write(preferencesPath, '');
  }

  // Create last-jobs.md only if it doesn't exist
  const lastJobsPath = join(agentMemoryDir, 'last-jobs.md');
  const lastJobsFile = Bun.file(lastJobsPath);
  if (!(await lastJobsFile.exists())) {
    await Bun.write(lastJobsPath, '');
  }
}
