import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../utils/api-client.ts', () => ({
  get: vi.fn(),
  post: vi.fn(),
  agentPath: (name: string) => encodeURIComponent(name),
}));

import { post } from '../utils/api-client.ts';
import { createRunCommand } from './run.ts';

describe('run command', () => {
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
    vi.mocked(post).mockReset();
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    process.exit = originalExit;
  });

  it('triggers agent run and displays result', async () => {
    vi.mocked(post).mockResolvedValue({
      runId: 'run-001',
      result: 'Agent completed successfully',
      status: 'success',
      startedAt: '2026-03-01T10:00:00Z',
      finishedAt: '2026-03-01T10:01:00Z',
    });

    const cmd = createRunCommand();
    await cmd.parseAsync(['scout'], { from: 'user' });

    expect(post).toHaveBeenCalledWith('/api/agents/scout/run', undefined);

    const output = consoleLogs.join('\n');
    expect(output).toContain('Running scout...');
    expect(output).toContain('Run completed: success');
    expect(output).toContain('run-001');
    expect(output).toContain('Agent completed successfully');
  });

  it('sends custom prompt when provided', async () => {
    vi.mocked(post).mockResolvedValue({
      runId: 'run-002',
      result: 'done',
      status: 'success',
      startedAt: '2026-03-01T10:00:00Z',
      finishedAt: '2026-03-01T10:01:00Z',
    });

    const cmd = createRunCommand();
    await cmd.parseAsync(['scout', '-p', 'check the news'], { from: 'user' });

    expect(post).toHaveBeenCalledWith('/api/agents/scout/run', { prompt: 'check the news' });
  });

  it('displays error when agent not found', async () => {
    vi.mocked(post).mockRejectedValue(new Error('Agent not found'));

    const cmd = createRunCommand();
    await cmd.parseAsync(['nonexistent'], { from: 'user' });

    expect(consoleErrors[0]).toContain('Agent not found');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('displays error when daemon is unreachable', async () => {
    vi.mocked(post).mockRejectedValue(new Error('Herald daemon unreachable'));

    const cmd = createRunCommand();
    await cmd.parseAsync(['scout'], { from: 'user' });

    expect(consoleErrors[0]).toContain('unreachable');
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
