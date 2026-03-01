import { Command } from 'commander';
import { get } from '../utils/api-client.ts';
import { agentTableHeader, formatAgent, type AgentInfo } from '../utils/format.ts';

interface AgentsResponse {
  agents: Array<{
    name: string;
    status: string;
    lastRun?: { runId: string; status: string; startedAt: string; finishedAt?: string };
    config?: { schedule?: string };
    registeredAt?: string;
    lastError?: string;
  }>;
}

export function createAgentsCommand(): Command {
  return new Command('agents')
    .description('List registered agents')
    .option('--json', 'Output raw JSON')
    .action(async (opts: { json?: boolean }) => {
      try {
        const data = await get<AgentsResponse>('/api/agents');

        if (opts.json) {
          console.log(JSON.stringify(data, null, 2));
          return;
        }

        if (data.agents.length === 0) {
          console.log('No agents registered.');
          return;
        }

        console.log(agentTableHeader());
        console.log('-'.repeat(70));

        for (const agent of data.agents) {
          const info: AgentInfo = {
            name: agent.name,
            status: agent.lastRun?.status ?? agent.status,
            lastRun: agent.lastRun?.startedAt,
            config: agent.config,
          };
          console.log(formatAgent(info));
        }

        console.log('');
        console.log(`${data.agents.length} agent(s) total`);
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
