import { Command } from 'commander';
import * as readline from 'node:readline';
import { get, post, ApiError, agentPath } from '../utils/api-client.ts';

interface AgentDetail {
  name: string;
  status: string;
  lastRun?: string;
  config?: { schedule?: string };
}

interface RunResponse {
  runId: string;
  result: string;
  status: string;
  startedAt: string;
  finishedAt: string;
}

const CHAT_HELP = `Available commands:
  /help       Show this help message
  /exit       Exit the chat session
  /quit       Exit the chat session
  /run        Trigger the agent's default patrol run
`;

/**
 * Verify that an agent exists by name. Returns the agent detail or null.
 */
export async function verifyAgent(agentName: string): Promise<AgentDetail | null> {
  try {
    return await get<AgentDetail>(`/api/agents/${agentPath(agentName)}`);
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 404) {
      return null;
    }
    throw err;
  }
}

/**
 * Send a chat message to an agent and return the response text.
 */
export async function sendMessage(agentName: string, message: string): Promise<string> {
  const result = await post<RunResponse>(`/api/agents/${agentPath(agentName)}/run`, {
    prompt: message,
  });
  return result.result || `Run ${result.runId} completed with status: ${result.status}`;
}

/**
 * Get the help text for chat commands.
 */
export function getChatHelp(): string {
  return CHAT_HELP;
}

/**
 * Process a single line of chat input. Returns:
 * - { action: 'exit' } to quit
 * - { action: 'help', text: string } to display help
 * - { action: 'send', message: string } to send a message
 * - { action: 'run' } to trigger default patrol
 * - { action: 'skip' } to skip empty input
 */
export function processInput(line: string): {
  action: 'exit' | 'help' | 'send' | 'run' | 'skip';
  message?: string;
  text?: string;
} {
  const trimmed = line.trim();

  if (!trimmed) {
    return { action: 'skip' };
  }

  if (trimmed === '/exit' || trimmed === '/quit') {
    return { action: 'exit' };
  }

  if (trimmed === '/help') {
    return { action: 'help', text: CHAT_HELP };
  }

  if (trimmed === '/run') {
    return { action: 'run' };
  }

  return { action: 'send', message: trimmed };
}

/**
 * Start the interactive chat loop.
 */
async function startChat(agentName: string): Promise<void> {
  // Verify agent exists
  const agent = await verifyAgent(agentName);
  if (!agent) {
    console.error(`Error: Agent "${agentName}" not found.`);
    process.exit(1);
    return;
  }

  console.log(`Chat with ${agent.name}. Type /help for commands, /exit to quit.`);
  console.log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ',
  });

  // Handle Ctrl+C gracefully
  rl.on('SIGINT', () => {
    console.log('\nGoodbye!');
    rl.close();
    process.exit(0);
  });

  rl.prompt();

  rl.on('line', async (line: string) => {
    const result = processInput(line);

    switch (result.action) {
      case 'exit':
        console.log('Goodbye!');
        rl.close();
        process.exit(0);
        return;

      case 'help':
        console.log(result.text);
        break;

      case 'skip':
        break;

      case 'run':
        try {
          console.log(`Running ${agentName} default patrol...`);
          const runResult = await post<RunResponse>(`/api/agents/${agentPath(agentName)}/run`);
          console.log(`\n${runResult.result ?? `Run ${runResult.runId}: ${runResult.status}`}\n`);
        } catch (err) {
          console.error(`Error: ${(err as Error).message}`);
        }
        break;

      case 'send':
        try {
          const response = await sendMessage(agentName, result.message!);
          console.log(`\n${response}\n`);
        } catch (err) {
          console.error(`Error: ${(err as Error).message}`);
        }
        break;
    }

    rl.prompt();
  });

  rl.on('close', () => {
    // already handled by exit/SIGINT
  });
}

export function createChatCommand(): Command {
  return new Command('chat')
    .description('Open an interactive chat session with an agent')
    .argument('<agent-name>', 'Name of the agent to chat with')
    .action(async (agentName: string) => {
      try {
        await startChat(agentName);
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
