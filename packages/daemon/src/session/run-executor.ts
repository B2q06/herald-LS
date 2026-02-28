import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { AgentConfig, HeraldConfig } from '@herald/shared';
import type { AgentRegistry } from '../agent-loader/agent-registry.ts';
import { writeTranscript } from '../logger/transcript-writer.ts';
import type { SessionManager } from './session-manager.ts';

export interface RunResult {
  runId: string;
  status: 'success' | 'failed';
  result: string;
  startedAt: string;
  finishedAt: string;
}

export function generateRunId(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const mo = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const h = String(now.getUTCHours()).padStart(2, '0');
  const mi = String(now.getUTCMinutes()).padStart(2, '0');
  const s = String(now.getUTCSeconds()).padStart(2, '0');
  return `${y}${mo}${d}-${h}${mi}${s}`;
}

async function writeReport(
  agentName: string,
  runId: string,
  startedAt: string,
  finishedAt: string,
  status: 'success' | 'failed',
  content: string,
  heraldConfig: HeraldConfig,
): Promise<void> {
  const reportDir = join(heraldConfig.reports_dir, agentName);
  await mkdir(reportDir, { recursive: true });

  const frontmatter = [
    '---',
    `agent: ${agentName}`,
    `run_id: "${runId}"`,
    `started_at: "${startedAt}"`,
    `finished_at: "${finishedAt}"`,
    `status: ${status}`,
    '---',
  ].join('\n');

  const report = `${frontmatter}\n\n# ${agentName} Patrol Report\n\n${content}\n`;
  const filepath = join(reportDir, `${runId}.md`);
  await Bun.write(filepath, report);
}

export async function executeRun(
  agentName: string,
  config: AgentConfig,
  heraldConfig: HeraldConfig,
  sessionManager: SessionManager,
  registry?: AgentRegistry,
  prompt?: string,
): Promise<RunResult> {
  const runId = generateRunId();
  const startedAt = new Date().toISOString();

  try {
    const result = await sessionManager.runAgent(agentName, config, heraldConfig, prompt);
    const finishedAt = new Date().toISOString();

    // SessionManager swallows errors and returns "Error: ..." strings,
    // so check session status to detect failures
    const sessionStatus = sessionManager.getStatus(agentName);
    const isFailed = sessionStatus === 'failed';
    const status: 'success' | 'failed' = isFailed ? 'failed' : 'success';

    // Write report to reports/{agent-name}/{runId}.md
    await writeReport(agentName, runId, startedAt, finishedAt, status, result, heraldConfig);

    // Write transcript
    const messages = sessionManager.getSession(agentName)?.messages ?? [];
    await writeTranscript(agentName, runId, messages, heraldConfig);

    // Update agent registry with last run info
    if (registry) {
      registry.updateLastRun(agentName, {
        runId,
        status,
        startedAt,
        finishedAt,
      });
    }

    return { runId, status, result, startedAt, finishedAt };
  } catch (err) {
    const finishedAt = new Date().toISOString();
    const error = err instanceof Error ? err.message : String(err);

    await writeReport(agentName, runId, startedAt, finishedAt, 'failed', error, heraldConfig);

    // Update agent registry with failed run info
    if (registry) {
      registry.updateLastRun(agentName, {
        runId,
        status: 'failed',
        startedAt,
        finishedAt,
      });
    }

    return { runId, status: 'failed', result: error, startedAt, finishedAt };
  }
}
