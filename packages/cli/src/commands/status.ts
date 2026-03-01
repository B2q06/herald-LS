import { Command } from 'commander';
import { get } from '../utils/api-client.ts';
import { formatUptime } from '../utils/format.ts';

interface HealthResponse {
  status: string;
  uptime: number;
}

interface StatusResponse {
  daemon: {
    uptime: number;
    version: string;
  };
}

interface AgentsResponse {
  agents: Array<{
    name: string;
    status: string;
    lastRun?: string;
  }>;
}

interface ScheduleResponse {
  schedules: Array<{
    agentName: string;
    cronExpression?: string;
    nextRun?: string;
  }>;
}

export function createStatusCommand(): Command {
  return new Command('status')
    .description('Show Herald daemon status')
    .option('--json', 'Output raw JSON')
    .action(async (opts: { json?: boolean }) => {
      try {
        const [health, status, agentsData, scheduleData] = await Promise.all([
          get<HealthResponse>('/health'),
          get<StatusResponse>('/api/status'),
          get<AgentsResponse>('/api/agents'),
          get<ScheduleResponse>('/api/schedule').catch(() => ({ schedules: [] })),
        ]);

        if (opts.json) {
          console.log(JSON.stringify({ health, status, agents: agentsData, schedule: scheduleData }, null, 2));
          return;
        }

        const agentCount = agentsData.agents.length;
        const runningCount = agentsData.agents.filter(a => a.status === 'running').length;

        console.log('Herald Daemon Status');
        console.log('====================');
        console.log(`  Status:    ${health.status}`);
        console.log(`  Version:   ${status.daemon.version}`);
        console.log(`  Uptime:    ${formatUptime(status.daemon.uptime)}`);
        console.log(`  Agents:    ${agentCount} registered${runningCount > 0 ? `, ${runningCount} running` : ''}`);

        if (scheduleData.schedules.length > 0) {
          const nextSchedule = scheduleData.schedules
            .filter(s => s.nextRun)
            .sort((a, b) => new Date(a.nextRun!).getTime() - new Date(b.nextRun!).getTime())[0];

          if (nextSchedule) {
            console.log(`  Next run:  ${nextSchedule.agentName} at ${nextSchedule.nextRun}`);
          }
        }

        console.log('');
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
