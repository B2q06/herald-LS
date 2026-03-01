import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../utils/api-client.ts', () => ({
  get: vi.fn(),
  post: vi.fn(),
  agentPath: (name: string) => encodeURIComponent(name),
}));

import { get } from '../utils/api-client.ts';
import { createPaperCommand } from './paper.ts';

describe('paper command', () => {
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

  describe('default (current edition)', () => {
    it('displays current edition with date header and content', async () => {
      vi.mocked(get).mockResolvedValue({
        editionDate: '2026-03-01',
        content: '# Top Stories\n\nBreaking news from the Herald.',
      });

      const cmd = createPaperCommand();
      await cmd.parseAsync(['paper'], { from: 'user' });

      expect(get).toHaveBeenCalledWith('/api/newspaper/current');

      const output = consoleLogs.join('\n');
      expect(output).toContain('Herald - 2026-03-01');
      expect(output).toContain('# Top Stories');
      expect(output).toContain('Breaking news from the Herald.');
    });

    it('outputs raw JSON with --json flag', async () => {
      vi.mocked(get).mockResolvedValue({
        editionDate: '2026-03-01',
        content: 'Some content',
      });

      const cmd = createPaperCommand();
      await cmd.parseAsync(['paper', '--json'], { from: 'user' });

      const output = consoleLogs.join('\n');
      const parsed = JSON.parse(output);
      expect(parsed.editionDate).toBe('2026-03-01');
      expect(parsed.content).toBe('Some content');
    });

    it('displays error when daemon is unreachable', async () => {
      vi.mocked(get).mockRejectedValue(new Error('Herald daemon unreachable'));

      const cmd = createPaperCommand();
      await cmd.parseAsync(['paper'], { from: 'user' });

      expect(consoleErrors[0]).toContain('unreachable');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('--history', () => {
    it('lists past editions', async () => {
      vi.mocked(get).mockResolvedValue({
        editions: [
          { date: '2026-03-01', headline: 'March begins' },
          { date: '2026-02-28', headline: 'February wrap-up' },
          { date: '2026-02-27' },
        ],
      });

      const cmd = createPaperCommand();
      await cmd.parseAsync(['paper', '--history'], { from: 'user' });

      expect(get).toHaveBeenCalledWith('/api/newspaper/editions');

      const output = consoleLogs.join('\n');
      expect(output).toContain('Herald Editions');
      expect(output).toContain('2026-03-01');
      expect(output).toContain('March begins');
      expect(output).toContain('2026-02-28');
      expect(output).toContain('February wrap-up');
      expect(output).toContain('2026-02-27');
      expect(output).toContain('3 edition(s)');
    });

    it('shows message when no editions exist', async () => {
      vi.mocked(get).mockResolvedValue({ editions: [] });

      const cmd = createPaperCommand();
      await cmd.parseAsync(['paper', '--history'], { from: 'user' });

      const output = consoleLogs.join('\n');
      expect(output).toContain('No editions found.');
    });

    it('outputs JSON with --history --json', async () => {
      vi.mocked(get).mockResolvedValue({
        editions: [{ date: '2026-03-01', headline: 'Test' }],
      });

      const cmd = createPaperCommand();
      await cmd.parseAsync(['paper', '--history', '--json'], { from: 'user' });

      const output = consoleLogs.join('\n');
      const parsed = JSON.parse(output);
      expect(parsed.editions).toHaveLength(1);
    });
  });

  describe('--date', () => {
    it('rejects invalid date format', async () => {
      const cmd = createPaperCommand();
      await cmd.parseAsync(['paper', '--date', 'March-1'], { from: 'user' });

      expect(consoleErrors[0]).toContain('Invalid date format');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('rejects date with wrong separators', async () => {
      const cmd = createPaperCommand();
      await cmd.parseAsync(['paper', '--date', '2026/03/01'], { from: 'user' });

      expect(consoleErrors[0]).toContain('Invalid date format');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('displays a specific edition by date', async () => {
      vi.mocked(get).mockResolvedValue({
        editionDate: '2026-02-15',
        content: '# Valentine aftermath\n\nLove is in the air.',
      });

      const cmd = createPaperCommand();
      await cmd.parseAsync(['paper', '--date', '2026-02-15'], { from: 'user' });

      expect(get).toHaveBeenCalledWith('/api/newspaper/editions/2026-02-15');

      const output = consoleLogs.join('\n');
      expect(output).toContain('Herald - 2026-02-15');
      expect(output).toContain('Valentine aftermath');
    });

    it('outputs JSON with --date --json', async () => {
      vi.mocked(get).mockResolvedValue({
        editionDate: '2026-02-15',
        content: 'Edition content',
      });

      const cmd = createPaperCommand();
      await cmd.parseAsync(['paper', '--date', '2026-02-15', '--json'], { from: 'user' });

      const output = consoleLogs.join('\n');
      const parsed = JSON.parse(output);
      expect(parsed.editionDate).toBe('2026-02-15');
    });
  });

  describe('--weekly', () => {
    it('displays the latest weekly synthesis', async () => {
      vi.mocked(get)
        .mockResolvedValueOnce({
          weekly: [
            { date: '2026-02-28', headline: 'Week 9 synthesis' },
            { date: '2026-02-21', headline: 'Week 8 synthesis' },
          ],
        })
        .mockResolvedValueOnce({
          date: '2026-02-28',
          content: '# Weekly Synthesis\n\nThis week in summary.',
        });

      const cmd = createPaperCommand();
      await cmd.parseAsync(['paper', '--weekly'], { from: 'user' });

      expect(get).toHaveBeenCalledWith('/api/newspaper/weekly');
      expect(get).toHaveBeenCalledWith('/api/newspaper/weekly/2026-02-28');

      const output = consoleLogs.join('\n');
      expect(output).toContain('Herald Weekly - 2026-02-28');
      expect(output).toContain('Weekly Synthesis');
      expect(output).toContain('This week in summary.');
    });

    it('shows message when no weekly editions exist', async () => {
      vi.mocked(get).mockResolvedValue({ weekly: [] });

      const cmd = createPaperCommand();
      await cmd.parseAsync(['paper', '--weekly'], { from: 'user' });

      const output = consoleLogs.join('\n');
      expect(output).toContain('No weekly editions found.');
    });

    it('outputs JSON with --weekly --json', async () => {
      vi.mocked(get).mockResolvedValue({
        weekly: [{ date: '2026-02-28', headline: 'Week 9' }],
      });

      const cmd = createPaperCommand();
      await cmd.parseAsync(['paper', '--weekly', '--json'], { from: 'user' });

      const output = consoleLogs.join('\n');
      const parsed = JSON.parse(output);
      expect(parsed.weekly).toHaveLength(1);
    });
  });
});
