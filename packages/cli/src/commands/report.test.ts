import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../utils/api-client.ts', () => ({
  get: vi.fn(),
  post: vi.fn(),
  agentPath: (name: string) => encodeURIComponent(name),
}));

import { get } from '../utils/api-client.ts';
import { createReportCommand } from './report.ts';

describe('report command', () => {
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

  describe('default (list reports)', () => {
    it('lists reports for an agent in table format', async () => {
      vi.mocked(get).mockResolvedValue({
        reports: [
          { filename: '2026-03-01-run-abc.md', date: '2026-03-01', wordCount: 450, path: 'reports/scout/2026-03-01-run-abc.md' },
          { filename: '2026-02-28-run-def.md', date: '2026-02-28', wordCount: 320, path: 'reports/scout/2026-02-28-run-def.md' },
        ],
      });

      const cmd = createReportCommand();
      await cmd.parseAsync(['scout'], { from: 'user' });

      expect(get).toHaveBeenCalledWith('/api/agents/scout/reports');

      const output = consoleLogs.join('\n');
      expect(output).toContain('Reports for scout');
      expect(output).toContain('2026-03-01');
      expect(output).toContain('2026-02-28');
      expect(output).toContain('450');
      expect(output).toContain('320');
      expect(output).toContain('2 report(s)');
    });

    it('shows message when no reports exist', async () => {
      vi.mocked(get).mockResolvedValue({ reports: [] });

      const cmd = createReportCommand();
      await cmd.parseAsync(['analyst'], { from: 'user' });

      const output = consoleLogs.join('\n');
      expect(output).toContain('No reports found for agent "analyst".');
    });

    it('outputs JSON with --json flag', async () => {
      vi.mocked(get).mockResolvedValue({
        reports: [
          { filename: '2026-03-01-run-abc.md', date: '2026-03-01', wordCount: 450, path: 'reports/scout/2026-03-01-run-abc.md' },
        ],
      });

      const cmd = createReportCommand();
      await cmd.parseAsync(['scout', '--json'], { from: 'user' });

      const output = consoleLogs.join('\n');
      const parsed = JSON.parse(output);
      expect(parsed.reports).toHaveLength(1);
      expect(parsed.reports[0].filename).toBe('2026-03-01-run-abc.md');
    });

    it('displays error when daemon is unreachable', async () => {
      vi.mocked(get).mockRejectedValue(new Error('Herald daemon unreachable'));

      const cmd = createReportCommand();
      await cmd.parseAsync(['scout'], { from: 'user' });

      expect(consoleErrors[0]).toContain('unreachable');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('--latest', () => {
    it('displays the most recent report content', async () => {
      vi.mocked(get).mockResolvedValue({
        filename: '2026-03-01-run-abc.md',
        content: '# Scout Report\n\nFindings from the latest run.',
        date: '2026-03-01',
        wordCount: 450,
      });

      const cmd = createReportCommand();
      await cmd.parseAsync(['scout', '--latest'], { from: 'user' });

      expect(get).toHaveBeenCalledWith('/api/agents/scout/reports/latest');

      const output = consoleLogs.join('\n');
      expect(output).toContain('Report: 2026-03-01-run-abc.md');
      expect(output).toContain('Date:   2026-03-01');
      expect(output).toContain('Words:  450');
      expect(output).toContain('# Scout Report');
      expect(output).toContain('Findings from the latest run.');
    });

    it('outputs JSON with --latest --json', async () => {
      vi.mocked(get).mockResolvedValue({
        filename: '2026-03-01-run-abc.md',
        content: 'Report content here',
        date: '2026-03-01',
        wordCount: 200,
      });

      const cmd = createReportCommand();
      await cmd.parseAsync(['scout', '--latest', '--json'], { from: 'user' });

      const output = consoleLogs.join('\n');
      const parsed = JSON.parse(output);
      expect(parsed.filename).toBe('2026-03-01-run-abc.md');
      expect(parsed.content).toBe('Report content here');
      expect(parsed.wordCount).toBe(200);
    });

    it('displays error when report not found', async () => {
      vi.mocked(get).mockRejectedValue(new Error('API returned 404'));

      const cmd = createReportCommand();
      await cmd.parseAsync(['nonexistent', '--latest'], { from: 'user' });

      expect(consoleErrors[0]).toContain('404');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('table formatting', () => {
    it('shows column headers', async () => {
      vi.mocked(get).mockResolvedValue({
        reports: [
          { filename: 'test.md', date: '2026-03-01', wordCount: 100, path: 'reports/scout/test.md' },
        ],
      });

      const cmd = createReportCommand();
      await cmd.parseAsync(['scout'], { from: 'user' });

      const output = consoleLogs.join('\n');
      expect(output).toContain('Date');
      expect(output).toContain('Filename');
      expect(output).toContain('Words');
    });

    it('shows separator line', async () => {
      vi.mocked(get).mockResolvedValue({
        reports: [
          { filename: 'test.md', date: '2026-03-01', wordCount: 100, path: 'reports/scout/test.md' },
        ],
      });

      const cmd = createReportCommand();
      await cmd.parseAsync(['scout'], { from: 'user' });

      const output = consoleLogs.join('\n');
      expect(output).toContain('-'.repeat(62));
    });
  });
});
