import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../utils/api-client.ts', () => ({
  get: vi.fn(),
  post: vi.fn(),
  agentPath: (name: string) => encodeURIComponent(name),
}));

import { get } from '../utils/api-client.ts';
import { createLogsCommand, formatDuration, formatLogRow, logTableHeader } from './logs.ts';

describe('logs command', () => {
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

  describe('formatDuration', () => {
    it('returns "-" for undefined', () => {
      expect(formatDuration(undefined)).toBe('-');
    });

    it('formats milliseconds', () => {
      expect(formatDuration(500)).toBe('500ms');
    });

    it('formats seconds', () => {
      expect(formatDuration(5000)).toBe('5s');
    });

    it('formats minutes and seconds', () => {
      expect(formatDuration(90000)).toBe('1m 30s');
    });
  });

  describe('formatLogRow', () => {
    it('formats a row with all fields', () => {
      const row = formatLogRow({
        name: 'scout',
        status: 'idle',
        lastRun: new Date().toISOString(),
        lastRunId: 'run-001',
        lastRunStatus: 'success',
        lastRunDuration: 5000,
      });
      expect(row).toContain('scout');
      expect(row).toContain('run-001');
      expect(row).toContain('success');
      expect(row).toContain('5s');
    });

    it('handles missing optional fields', () => {
      const row = formatLogRow({
        name: 'analyst',
        status: 'idle',
      });
      expect(row).toContain('analyst');
      expect(row).toContain('-');
    });
  });

  describe('logTableHeader', () => {
    it('contains expected column names', () => {
      const header = logTableHeader();
      expect(header).toContain('Agent');
      expect(header).toContain('Run ID');
      expect(header).toContain('Status');
      expect(header).toContain('Started');
      expect(header).toContain('Duration');
    });
  });

  describe('command: herald logs', () => {
    it('lists all agent logs sorted by most recent', async () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 3600000); // 1 hour ago

      vi.mocked(get).mockResolvedValue({
        agents: [
          {
            name: 'analyst',
            status: 'idle',
            lastRun: { runId: 'run-001', status: 'success', startedAt: earlier.toISOString(), finishedAt: new Date(earlier.getTime() + 5000).toISOString() },
          },
          {
            name: 'scout',
            status: 'idle',
            lastRun: { runId: 'run-002', status: 'success', startedAt: now.toISOString(), finishedAt: new Date(now.getTime() + 3000).toISOString() },
          },
        ],
      });

      const cmd = createLogsCommand();
      await cmd.parseAsync([], { from: 'user' });

      const output = consoleLogs.join('\n');
      expect(output).toContain('scout');
      expect(output).toContain('analyst');
      expect(output).toContain('2 agent(s) total');

      // scout should appear before analyst (more recent)
      const scoutIdx = output.indexOf('scout');
      const analystIdx = output.indexOf('analyst');
      expect(scoutIdx).toBeLessThan(analystIdx);
    });

    it('shows empty state message', async () => {
      vi.mocked(get).mockResolvedValue({ agents: [] });

      const cmd = createLogsCommand();
      await cmd.parseAsync([], { from: 'user' });

      const output = consoleLogs.join('\n');
      expect(output).toContain('No agent logs found');
    });

    it('outputs JSON when --json flag is set', async () => {
      vi.mocked(get).mockResolvedValue({
        agents: [
          { name: 'scout', status: 'idle', lastRun: { runId: 'run-001', status: 'success', startedAt: '2026-03-01T10:00:00Z' } },
        ],
      });

      const cmd = createLogsCommand();
      await cmd.parseAsync(['--json'], { from: 'user' });

      const output = consoleLogs.join('\n');
      const parsed = JSON.parse(output);
      expect(parsed.agents).toHaveLength(1);
      expect(parsed.agents[0].name).toBe('scout');
    });

    it('handles agents with no lastRun', async () => {
      vi.mocked(get).mockResolvedValue({
        agents: [
          { name: 'scout', status: 'idle' },
          { name: 'analyst', status: 'idle', lastRun: { runId: 'run-001', status: 'success', startedAt: new Date().toISOString() } },
        ],
      });

      const cmd = createLogsCommand();
      await cmd.parseAsync([], { from: 'user' });

      const output = consoleLogs.join('\n');
      // Agent without lastRun should be sorted last
      const scoutIdx = output.indexOf('scout');
      const analystIdx = output.indexOf('analyst');
      expect(analystIdx).toBeLessThan(scoutIdx);
    });
  });

  describe('command: herald logs <agent-name>', () => {
    it('shows detail for a specific agent', async () => {
      vi.mocked(get).mockResolvedValue({
        name: 'scout',
        status: 'idle',
        lastRun: { runId: 'run-001', status: 'success', startedAt: '2026-03-01T10:00:00Z', finishedAt: '2026-03-01T10:00:05Z' },
        config: { schedule: '0 */6 * * *' },
      });

      const cmd = createLogsCommand();
      await cmd.parseAsync(['scout'], { from: 'user' });

      expect(get).toHaveBeenCalledWith('/api/agents/scout');

      const output = consoleLogs.join('\n');
      expect(output).toContain('Logs for agent: scout');
      expect(output).toContain('run-001');
      expect(output).toContain('success');
      expect(output).toContain('5s');
      expect(output).toContain('0 */6 * * *');
    });

    it('shows agent detail with --json flag', async () => {
      vi.mocked(get).mockResolvedValue({
        name: 'scout',
        status: 'idle',
        lastRun: { runId: 'run-001', status: 'success', startedAt: '2026-03-01T10:00:00Z' },
      });

      const cmd = createLogsCommand();
      await cmd.parseAsync(['scout', '--json'], { from: 'user' });

      const output = consoleLogs.join('\n');
      const parsed = JSON.parse(output);
      expect(parsed.name).toBe('scout');
      expect(parsed.lastRun.runId).toBe('run-001');
    });

    it('shows last error when present', async () => {
      vi.mocked(get).mockResolvedValue({
        name: 'scout',
        status: 'error',
        lastError: 'Agent process crashed',
      });

      const cmd = createLogsCommand();
      await cmd.parseAsync(['scout'], { from: 'user' });

      const output = consoleLogs.join('\n');
      expect(output).toContain('Agent process crashed');
    });
  });

  describe('error handling', () => {
    it('displays error when daemon is unreachable', async () => {
      vi.mocked(get).mockRejectedValue(new Error('Herald daemon unreachable'));

      const cmd = createLogsCommand();
      await cmd.parseAsync([], { from: 'user' });

      expect(consoleErrors[0]).toContain('unreachable');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('displays error when agent not found', async () => {
      vi.mocked(get).mockRejectedValue(new Error('Agent not found'));

      const cmd = createLogsCommand();
      await cmd.parseAsync(['nonexistent'], { from: 'user' });

      expect(consoleErrors[0]).toContain('Agent not found');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});
