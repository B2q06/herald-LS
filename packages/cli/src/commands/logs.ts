import { Command } from 'commander';
import { get, agentPath } from '../utils/api-client.ts';
import { formatRelativeTime, statusIcon } from '../utils/format.ts';

interface AgentRunRaw {
  name: string;
  status: string;
  lastRun?: { runId: string; status: string; startedAt: string; finishedAt?: string };
  config?: { schedule?: string };
  registeredAt?: string;
  lastError?: string;
}

interface AgentRunInfo {
  name: string;
  status: string;
  lastRun?: string;
  lastRunId?: string;
  lastRunStatus?: string;
  lastRunDuration?: number;
  config?: { schedule?: string };
}

interface AgentsResponse {
  agents: AgentRunRaw[];
}

type AgentDetail = AgentRunRaw;

/** Normalize raw daemon agent response to flat AgentRunInfo. */
function normalizeAgent(raw: AgentRunRaw): AgentRunInfo {
  const startedAt = raw.lastRun?.startedAt;
  const finishedAt = raw.lastRun?.finishedAt;
  let duration: number | undefined;
  if (startedAt && finishedAt) {
    const start = new Date(startedAt).getTime();
    const end = new Date(finishedAt).getTime();
    if (Number.isFinite(start) && Number.isFinite(end)) {
      duration = end - start;
    }
  }
  return {
    name: raw.name,
    status: raw.status,
    lastRun: startedAt,
    lastRunId: raw.lastRun?.runId,
    lastRunStatus: raw.lastRun?.status,
    lastRunDuration: duration,
    config: raw.config,
  };
}

/**
 * Format a duration in milliseconds to a human-readable string.
 */
export function formatDuration(ms?: number): string {
  if (ms === undefined || ms === null) return '-';

  const seconds = Math.floor(ms / 1000);
  if (seconds < 1) return `${ms}ms`;
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;
  return `${minutes}m ${remainingSecs}s`;
}

/**
 * Build a log table row for display.
 */
export function formatLogRow(agent: AgentRunInfo): string {
  const icon = statusIcon(agent.lastRunStatus ?? agent.status);
  const name = agent.name.padEnd(18);
  const runId = (agent.lastRunId ?? '-').padEnd(14);
  const status = (agent.lastRunStatus ?? agent.status).padEnd(10);
  const started = agent.lastRun ? formatRelativeTime(agent.lastRun).padEnd(14) : '-'.padEnd(14);
  const duration = formatDuration(agent.lastRunDuration);

  return `${icon} ${name} ${runId} ${status} ${started} ${duration}`;
}

/**
 * Build the table header for log display.
 */
export function logTableHeader(): string {
  return `${''.padEnd(6)} ${'Agent'.padEnd(18)} ${'Run ID'.padEnd(14)} ${'Status'.padEnd(10)} ${'Started'.padEnd(14)} Duration`;
}

export function createLogsCommand(): Command {
  return new Command('logs')
    .description('View agent run logs')
    .argument('[agent-name]', 'Show logs for a specific agent')
    .option('--json', 'Output raw JSON')
    .action(async (agentName?: string, opts?: { json?: boolean }) => {
      try {
        if (agentName) {
          // Show logs for a specific agent
          const raw = await get<AgentDetail>(`/api/agents/${agentPath(agentName)}`);

          if (opts?.json) {
            console.log(JSON.stringify(raw, null, 2));
            return;
          }

          const agent = normalizeAgent(raw);

          console.log(`Logs for agent: ${agent.name}`);
          console.log('-'.repeat(50));
          console.log(`  Status:       ${agent.status}`);
          console.log(`  Last Run:     ${agent.lastRun ? formatRelativeTime(agent.lastRun) : 'never'}`);
          console.log(`  Last Run ID:  ${agent.lastRunId ?? '-'}`);
          console.log(`  Run Status:   ${agent.lastRunStatus ?? '-'}`);
          console.log(`  Duration:     ${formatDuration(agent.lastRunDuration)}`);

          if (raw.lastError) {
            console.log(`  Last Error:   ${raw.lastError}`);
          }

          console.log(`  Schedule:     ${agent.config?.schedule ?? 'manual'}`);
        } else {
          // List all agent logs
          const data = await get<AgentsResponse>('/api/agents');

          if (opts?.json) {
            console.log(JSON.stringify(data, null, 2));
            return;
          }

          if (data.agents.length === 0) {
            console.log('No agent logs found.');
            return;
          }

          // Normalize and sort by most recent first
          const agents = data.agents.map(normalizeAgent);
          const sorted = agents.sort((a, b) => {
            if (!a.lastRun && !b.lastRun) return 0;
            if (!a.lastRun) return 1;
            if (!b.lastRun) return -1;
            return new Date(b.lastRun).getTime() - new Date(a.lastRun).getTime();
          });

          console.log(logTableHeader());
          console.log('-'.repeat(80));

          for (const agent of sorted) {
            console.log(formatLogRow(agent));
          }

          console.log('');
          console.log(`${sorted.length} agent(s) total`);
        }
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
