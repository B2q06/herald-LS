import { Command } from 'commander';
import { startDashboard } from '../dashboard/index.ts';

export function createDashCommand(): Command {
  return new Command('dash')
    .description('Open the interactive TUI dashboard')
    .option('--poll <ms>', 'Polling interval in milliseconds', '5000')
    .action(async (opts: { poll?: string }) => {
      const pollInterval = parseInt(opts.poll ?? '5000', 10);
      if (Number.isNaN(pollInterval) || pollInterval < 500) {
        console.error('Error: --poll must be a number >= 500');
        process.exit(1);
      }
      await startDashboard(pollInterval);
    });
}
