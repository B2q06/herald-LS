import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  finalizeEdition,
  getEdition,
  getEditionSources,
  getWeekly,
  listEditions,
  listWeeklies,
} from './edition-manager.ts';

// Mock git-versioner to avoid needing a real git repo
vi.mock('./git-versioner.ts', () => ({
  commitEdition: vi
    .fn()
    .mockResolvedValue({ success: true, commitHash: 'abc1234567890123456789012345678901234567' }),
  getRepoRoot: vi.fn().mockRejectedValue(new Error('Not in git repo')),
  getEditionLog: vi.fn().mockResolvedValue([]),
  getEditionContent: vi.fn().mockResolvedValue({ success: false, error: 'not available' }),
  listEditionsFromGit: vi.fn().mockResolvedValue([]),
  listWeeklyFromGit: vi.fn().mockResolvedValue([]),
  runGit: vi.fn().mockResolvedValue({ exitCode: 1, stdout: '', stderr: '' }),
}));

describe('edition-manager', () => {
  let tempDir: string;
  let newspaperDir: string;

  beforeEach(async () => {
    tempDir = join(
      tmpdir(),
      `herald-edition-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    newspaperDir = join(tempDir, 'newspaper');
    await mkdir(join(newspaperDir, 'editions'), { recursive: true });
    await mkdir(join(newspaperDir, 'weekly'), { recursive: true });

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('finalizeEdition', () => {
    it('validates that the edition directory has content', async () => {
      const emptyDir = join(newspaperDir, 'editions', '2026-02-28');
      await mkdir(emptyDir, { recursive: true });

      const result = await finalizeEdition(emptyDir, 'Test headline');

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('returns error when edition directory does not exist', async () => {
      const result = await finalizeEdition(
        join(newspaperDir, 'editions', '2099-01-01'),
        'Test headline',
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('does not exist');
    });

    it('commits edition when directory has content', async () => {
      const editionDir = join(newspaperDir, 'editions', '2026-02-28');
      await mkdir(join(editionDir, 'sources'), { recursive: true });
      await writeFile(join(editionDir, 'sources', 'editorial.md'), '# Test Edition');

      const result = await finalizeEdition(editionDir, 'Daily: AI breakthroughs');

      expect(result.success).toBe(true);
      expect(result.commitHash).toBeDefined();
    });
  });

  describe('listEditions', () => {
    it('returns empty array when no editions exist', async () => {
      const result = await listEditions(newspaperDir);
      expect(result).toEqual([]);
    });

    it('lists editions from filesystem with format detection', async () => {
      // Create editions with different formats
      const edition1 = join(newspaperDir, 'editions', '2026-02-28');
      await mkdir(join(edition1, 'sources'), { recursive: true });
      await writeFile(
        join(edition1, 'sources', 'editorial.md'),
        '# Herald Daily Brief -- 2026-02-28',
      );
      await writeFile(join(edition1, 'newspaper.pdf'), 'fake pdf');
      await writeFile(join(edition1, 'newspaper.html'), '<h1>Test</h1>');

      const edition2 = join(newspaperDir, 'editions', '2026-02-27');
      await mkdir(join(edition2, 'sources'), { recursive: true });
      await writeFile(
        join(edition2, 'sources', 'editorial.md'),
        '# Herald Daily Brief -- 2026-02-27',
      );

      const result = await listEditions(newspaperDir);

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2026-02-28');
      expect(result[0].formats).toContain('pdf');
      expect(result[0].formats).toContain('html');
      expect(result[0].formats).toContain('md');
      expect(result[0].headline).toContain('Herald Daily Brief');

      expect(result[1].date).toBe('2026-02-27');
      expect(result[1].formats).toContain('md');
    });

    it('sorts editions by date descending', async () => {
      for (const date of ['2026-02-26', '2026-02-28', '2026-02-27']) {
        const dir = join(newspaperDir, 'editions', date);
        await mkdir(join(dir, 'sources'), { recursive: true });
        await writeFile(join(dir, 'sources', 'editorial.md'), `# Edition ${date}`);
      }

      const result = await listEditions(newspaperDir);

      expect(result.map((e) => e.date)).toEqual(['2026-02-28', '2026-02-27', '2026-02-26']);
    });
  });

  describe('getEdition', () => {
    it('returns edition content from filesystem (md format)', async () => {
      const editionDir = join(newspaperDir, 'editions', '2026-02-28');
      await mkdir(join(editionDir, 'sources'), { recursive: true });
      await writeFile(
        join(editionDir, 'sources', 'editorial.md'),
        '# Herald Daily Edition\n\nTop stories...',
      );

      const result = await getEdition(newspaperDir, '2026-02-28', 'md');

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.date).toBe('2026-02-28');
        expect(result.format).toBe('md');
        expect(result.content).toContain('Herald Daily Edition');
      }
    });

    it('returns error for non-existent edition', async () => {
      const result = await getEdition(newspaperDir, '2099-01-01', 'md');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('not found');
      }
    });

    it('returns html content when available', async () => {
      const editionDir = join(newspaperDir, 'editions', '2026-02-28');
      await mkdir(editionDir, { recursive: true });
      await writeFile(join(editionDir, 'newspaper.html'), '<h1>Herald</h1>');

      const result = await getEdition(newspaperDir, '2026-02-28', 'html');

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.content).toContain('<h1>Herald</h1>');
      }
    });
  });

  describe('listWeeklies', () => {
    it('returns empty array when no weekly papers exist', async () => {
      const result = await listWeeklies(newspaperDir);
      expect(result).toEqual([]);
    });

    it('lists weekly papers from filesystem', async () => {
      await writeFile(join(newspaperDir, 'weekly', '2026-02-28-weekly.md'), '# Weekly Synthesis');

      const result = await listWeeklies(newspaperDir);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2026-02-28');
      expect(result[0].weekEnd).toBe('2026-02-28');
    });
  });

  describe('getWeekly', () => {
    it('returns weekly content from filesystem', async () => {
      await writeFile(
        join(newspaperDir, 'weekly', '2026-02-28-weekly.md'),
        '# Weekly Strategic Synthesis\n\nTrends...',
      );

      const result = await getWeekly(newspaperDir, '2026-02-28');

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.content).toContain('Weekly Strategic Synthesis');
      }
    });

    it('returns error for non-existent weekly', async () => {
      const result = await getWeekly(newspaperDir, '2099-01-01');

      expect('error' in result).toBe(true);
    });
  });

  describe('getEditionSources', () => {
    it('returns source markdown files', async () => {
      const sourcesDir = join(newspaperDir, 'editions', '2026-02-28', 'sources');
      await mkdir(sourcesDir, { recursive: true });
      await writeFile(join(sourcesDir, 'editorial.md'), '# Editorial');
      await writeFile(join(sourcesDir, 'ml-researcher.md'), '# ML Report');

      const result = await getEditionSources(newspaperDir, '2026-02-28');

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.sources['editorial.md']).toContain('Editorial');
        expect(result.sources['ml-researcher.md']).toContain('ML Report');
      }
    });

    it('returns error when sources directory does not exist', async () => {
      const result = await getEditionSources(newspaperDir, '2099-01-01');

      expect('error' in result).toBe(true);
    });
  });
});
