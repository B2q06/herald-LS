#!/usr/bin/env bun

import { Command } from 'commander';
import { createAgentsCommand } from './commands/agents.ts';
import { createChatCommand } from './commands/chat.ts';
import { createCompletionsCommand } from './commands/completions.ts';
import { createDashCommand } from './commands/dash.ts';
import { createLogsCommand } from './commands/logs.ts';
import { createPaperCommand } from './commands/paper.ts';
import { createReportCommand } from './commands/report.ts';
import { createRunCommand } from './commands/run.ts';
import { createStatusCommand } from './commands/status.ts';
import { get } from './utils/api-client.ts';

const program = new Command();

program
  .name('herald')
  .description('Herald CLI - manage your Herald daemon and agents')
  .version('0.0.1');

program.addCommand(createStatusCommand());
program.addCommand(createAgentsCommand());
program.addCommand(createRunCommand());
program.addCommand(createChatCommand());
program.addCommand(createLogsCommand());
program.addCommand(createPaperCommand());
program.addCommand(createReportCommand());
program.addCommand(createCompletionsCommand());
program.addCommand(createDashCommand());

// Hidden __complete command for shell completion support
const completeCmd = new Command('__complete')
  .description('Internal command for shell completion')
  .argument('<type>', 'Completion type (e.g. agents)')
  .action(async (type: string) => {
    try {
      if (type === 'agents') {
        const data = await get<{ agents: Array<{ name: string }> }>('/api/agents');
        for (const agent of data.agents) {
          console.log(agent.name);
        }
      }
    } catch {
      // Silently fail - completion should never show errors
    }
  });
completeCmd.helpOption(false);
program.addCommand(completeCmd, { hidden: true });

// Default action: show help
program.action(() => {
  program.help();
});

program.parseAsync();
