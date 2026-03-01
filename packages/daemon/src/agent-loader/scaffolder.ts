import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { AgentConfig } from '@herald/shared';

function knowledgeTemplate(agentName: string): string {
  return `# ${agentName} — Knowledge Base

## Domain Knowledge
<!-- Accumulated domain expertise from patrol runs. Updated by the agent. -->

## Developing Opinions
<!-- Opinions with confidence levels, evidence, and timestamps. -->
<!-- Format:
### {Opinion Statement}
- **Confidence:** {0-100}
- **Evidence:** {supporting observations and citations}
- **First Stated:** {date}
- **Last Updated:** {date}
- **Status:** active | revised | archived
-->

## Predictions Log
<!-- Forward-looking predictions with accountability tracking. -->
<!-- Format:
### {Prediction Statement}
- **Confidence:** {0-100}
- **Evidence:** {supporting observations}
- **Stated:** {date}
- **Timeframe:** {expected by when}
- **Status:** active | confirmed | invalidated | expired
- **Outcome:** {filled in when resolved}
-->

## Accountability
<!-- Calibration tracking: how accurate are this agent's predictions? -->

### Calibration Record
| Confidence Range | Predictions Made | Confirmed | Invalidated | Accuracy |
|-----------------|-----------------|-----------|-------------|----------|
| 80-100          | 0               | 0         | 0           | —        |
| 60-79           | 0               | 0         | 0           | —        |
| 40-59           | 0               | 0         | 0           | —        |
| 20-39           | 0               | 0         | 0           | —        |
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
