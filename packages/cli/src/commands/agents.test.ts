import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../utils/api-client.ts', () => ({
  get: vi.fn(),
  post: vi.fn(),
  agentPath: (name: string) => encodeURIComponent(name),
}));

import { get } from '../utils/api-client.ts';
import { createAgentsCommand } from './agents.ts';

describe('agents command', () => {
  let consoleLogs: string[];
  let consoleErrors: string[];
  const originalLog = console.log;
  const originalError = console.error;
  const originalExit = process.exit;

  beforeEach(() => {
    consoleLogs = [];
    consoleErrors = [];
    console.log = (...args: unknown[]) => consoleLogs.push(args.join(' '));
    console.error = (...args: unknown[]) => consoleErrors.push(args.join(' '));
    process.exit = vi.fn() as never;
    vi.mocked(get).mockReset();
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    process.exit = originalExit;
  });

  it('lists agents in table format', async () => {
    vi.mocked(get).mockResolvedValue({
      agents: [
        { name: 'scout', status: 'idle', config: { schedule: '0 */6 * * *' } },
        { name: 'analyst', status: 'running', lastRun: { runId: 'run-001', status: 'running', startedAt: new Date().toISOString() } },
      ],
    });

    const cmd = createAgentsCommand();
    await cmd.parseAsync(['agents'], { from: 'user' });

    const output = consoleLogs.join('\n');
    expect(output).toContain('scout');
    expect(output).toContain('analyst');
    expect(output).toContain('2 agent(s) total');
  });

  it('shows no agents message when empty', async () => {
    vi.mocked(get).mockResolvedValue({ agents: [] });

    const cmd = createAgentsCommand();
    await cmd.parseAsync(['agents'], { from: 'user' });

    const output = consoleLogs.join('\n');
    expect(output).toContain('No agents registered');
  });

  it('outputs JSON when --json flag is set', async () => {
    vi.mocked(get).mockResolvedValue({
      agents: [{ name: 'scout', status: 'idle' }],
    });

    const cmd = createAgentsCommand();
    await cmd.parseAsync(['agents', '--json'], { from: 'user' });

    const output = consoleLogs.join('\n');
    const parsed = JSON.parse(output);
    expect(parsed.agents).toHaveLength(1);
    expect(parsed.agents[0].name).toBe('scout');
  });

  it('displays error when daemon is unreachable', async () => {
    vi.mocked(get).mockRejectedValue(new Error('Herald daemon unreachable'));

    const cmd = createAgentsCommand();
    await cmd.parseAsync(['agents'], { from: 'user' });

    expect(consoleErrors[0]).toContain('unreachable');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('shows table header with column names', async () => {
    vi.mocked(get).mockResolvedValue({
      agents: [{ name: 'scout', status: 'idle' }],
    });

    const cmd = createAgentsCommand();
    await cmd.parseAsync(['agents'], { from: 'user' });

    const output = consoleLogs.join('\n');
    expect(output).toContain('Name');
    expect(output).toContain('Status');
    expect(output).toContain('Last Run');
    expect(output).toContain('Schedule');
  });
});
