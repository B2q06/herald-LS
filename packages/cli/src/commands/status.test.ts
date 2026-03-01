import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the api-client module before importing the command
vi.mock('../utils/api-client.ts', () => ({
  get: vi.fn(),
  post: vi.fn(),
  agentPath: (name: string) => encodeURIComponent(name),
}));

import { get } from '../utils/api-client.ts';
import { createStatusCommand } from './status.ts';

describe('status command', () => {
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

  it('displays daemon status summary', async () => {
    vi.mocked(get)
      .mockResolvedValueOnce({ status: 'ok', uptime: 3661 }) // /health
      .mockResolvedValueOnce({ daemon: { uptime: 3661, version: '0.0.1' } }) // /api/status
      .mockResolvedValueOnce({ agents: [{ name: 'scout', status: 'idle' }] }) // /api/agents
      .mockResolvedValueOnce({ schedules: [] }); // /api/schedule

    const cmd = createStatusCommand();
    await cmd.parseAsync(['status'], { from: 'user' });

    const output = consoleLogs.join('\n');
    expect(output).toContain('Herald Daemon Status');
    expect(output).toContain('ok');
    expect(output).toContain('0.0.1');
    expect(output).toContain('1h 1m 1s');
    expect(output).toContain('1 registered');
  });

  it('shows running agent count', async () => {
    vi.mocked(get)
      .mockResolvedValueOnce({ status: 'ok', uptime: 100 })
      .mockResolvedValueOnce({ daemon: { uptime: 100, version: '0.0.1' } })
      .mockResolvedValueOnce({
        agents: [
          { name: 'scout', status: 'running' },
          { name: 'analyst', status: 'idle' },
        ],
      })
      .mockResolvedValueOnce({ schedules: [] });

    const cmd = createStatusCommand();
    await cmd.parseAsync(['status'], { from: 'user' });

    const output = consoleLogs.join('\n');
    expect(output).toContain('2 registered');
    expect(output).toContain('1 running');
  });

  it('outputs JSON when --json flag is set', async () => {
    vi.mocked(get)
      .mockResolvedValueOnce({ status: 'ok', uptime: 60 })
      .mockResolvedValueOnce({ daemon: { uptime: 60, version: '0.0.1' } })
      .mockResolvedValueOnce({ agents: [] })
      .mockResolvedValueOnce({ schedules: [] });

    const cmd = createStatusCommand();
    await cmd.parseAsync(['status', '--json'], { from: 'user' });

    const output = consoleLogs.join('\n');
    const parsed = JSON.parse(output);
    expect(parsed.health.status).toBe('ok');
    expect(parsed.status.daemon.version).toBe('0.0.1');
  });

  it('displays error when daemon is unreachable', async () => {
    vi.mocked(get).mockRejectedValue(new Error('Herald daemon unreachable at http://localhost:3117. Is it running?'));

    const cmd = createStatusCommand();
    await cmd.parseAsync(['status'], { from: 'user' });

    expect(consoleErrors[0]).toContain('unreachable');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('shows next scheduled run when available', async () => {
    vi.mocked(get)
      .mockResolvedValueOnce({ status: 'ok', uptime: 100 })
      .mockResolvedValueOnce({ daemon: { uptime: 100, version: '0.0.1' } })
      .mockResolvedValueOnce({ agents: [] })
      .mockResolvedValueOnce({
        schedules: [
          { agentName: 'scout', nextRun: '2026-03-01T12:00:00Z' },
        ],
      });

    const cmd = createStatusCommand();
    await cmd.parseAsync(['status'], { from: 'user' });

    const output = consoleLogs.join('\n');
    expect(output).toContain('Next run:');
    expect(output).toContain('scout');
  });
});
