import { Command } from 'commander';
import { get, agentPath } from '../utils/api-client.ts';

interface AgentDetailResponse {
  name: string;
  status: string;
  lastRun?: {
    runId: string;
    startedAt?: string;
    finishedAt?: string;
    status?: string;
  };
  runs?: Array<{
    runId: string;
    startedAt?: string;
    finishedAt?: string;
    status?: string;
  }>;
}

interface ReportListResponse {
  reports: Array<{
    filename: string;
    date: string;
    wordCount: number;
    path: string;
  }>;
}

interface ReportContentResponse {
  filename: string;
  content: string;
  date: string;
  wordCount: number;
}

export function createReportCommand(): Command {
  return new Command('report')
    .description('View agent reports')
    .argument('<agent-name>', 'Name of the agent')
    .option('--json', 'Output raw JSON')
    .option('--latest', 'Display the most recent report')
    .action(async (agentName: string, opts: { json?: boolean; latest?: boolean }) => {
      try {
        // --latest: display the most recent report content
        if (opts.latest) {
          const data = await get<ReportContentResponse>(`/api/agents/${agentPath(agentName)}/reports/latest`);

          if (opts.json) {
            console.log(JSON.stringify(data, null, 2));
            return;
          }

          console.log(`Report: ${data.filename}`);
          console.log(`Date:   ${data.date}`);
          console.log(`Words:  ${data.wordCount}`);
          console.log('');
          console.log(data.content);
          return;
        }

        // Default: list reports for this agent
        const data = await get<ReportListResponse>(`/api/agents/${agentPath(agentName)}/reports`);

        if (opts.json) {
          console.log(JSON.stringify(data, null, 2));
          return;
        }

        if (data.reports.length === 0) {
          console.log(`No reports found for agent "${agentName}".`);
          return;
        }

        console.log(`Reports for ${agentName}`);
        console.log('='.repeat(`Reports for ${agentName}`.length));
        console.log('');
        console.log(`${'Date'.padEnd(14)} ${'Filename'.padEnd(40)} Words`);
        console.log('-'.repeat(62));

        for (const report of data.reports) {
          console.log(`${report.date.padEnd(14)} ${report.filename.padEnd(40)} ${report.wordCount}`);
        }

        console.log('');
        console.log(`${data.reports.length} report(s)`);
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
