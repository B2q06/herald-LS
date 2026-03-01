import { Command } from 'commander';
import { post, agentPath } from '../utils/api-client.ts';

interface RunResponse {
  runId: string;
  result: string;
  status: string;
  startedAt: string;
  finishedAt: string;
}

export function createRunCommand(): Command {
  return new Command('run')
    .description('Trigger an agent run')
    .argument('<agent-name>', 'Name of the agent to run')
    .option('-p, --prompt <prompt>', 'Custom prompt for the agent')
    .action(async (agentName: string, opts: { prompt?: string }) => {
      try {
        console.log(`Running ${agentName}...`);

        const body = opts.prompt ? { prompt: opts.prompt } : undefined;
        const result = await post<RunResponse>(`/api/agents/${agentPath(agentName)}/run`, body);

        console.log('');
        console.log(`Run completed: ${result.status}`);
        console.log(`  Run ID:     ${result.runId}`);
        console.log(`  Started:    ${result.startedAt}`);
        console.log(`  Finished:   ${result.finishedAt}`);

        if (result.result) {
          console.log('');
          console.log('Result:');
          console.log(result.result);
        }
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
