import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  commitEdition,
  commitWeekly,
  ensureNewspaperBranch,
  getEditionContent,
  getEditionLog,
  listEditionsFromGit,
  listWeeklyFromGit,
  runGit,
} from './git-versioner.ts';

describe('git-versioner', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(
      tmpdir(),
      `herald-git-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(tempDir, { recursive: true });
    // Initialize a real git repo for testing
    await runGit(['init'], tempDir);
    await runGit(['config', 'user.email', 'test@herald.test'], tempDir);
    await runGit(['config', 'user.name', 'Herald Test'], tempDir);
    await runGit(['commit', '--allow-empty', '-m', 'initial commit'], tempDir);

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('runGit', () => {
    it('runs a git command and returns stdout', async () => {
      const result = await runGit(['status'], tempDir);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('nothing to commit');
    });

    it('returns non-zero exit code on failure', async () => {
      const result = await runGit(['log', '--oneline', 'nonexistent-branch'], tempDir);
      expect(result.exitCode).not.toBe(0);
    });
  });

  describe('ensureNewspaperBranch', () => {
    it('creates the newspaper orphan branch if it does not exist', async () => {
      await ensureNewspaperBranch(tempDir);

      // Verify branch exists
      const { exitCode } = await runGit(['rev-parse', '--verify', 'newspaper'], tempDir);
      expect(exitCode).toBe(0);
    });

    it('does not fail if the branch already exists', async () => {
      await ensureNewspaperBranch(tempDir);
      // Call again — should be idempotent
      await ensureNewspaperBranch(tempDir);

      const { exitCode } = await runGit(['rev-parse', '--verify', 'newspaper'], tempDir);
      expect(exitCode).toBe(0);
    });

    it('returns to original branch after creating newspaper branch', async () => {
      const { stdout: originalBranch } = await runGit(['branch', '--show-current'], tempDir);

      await ensureNewspaperBranch(tempDir);

      const { stdout: currentBranch } = await runGit(['branch', '--show-current'], tempDir);
      expect(currentBranch).toBe(originalBranch);
    });
  });

  describe('commitEdition', () => {
    it('commits edition files to the newspaper branch', async () => {
      // Mock getRepoRoot to return our tempDir
      const gitVersioner = await import('./git-versioner.ts');
      vi.spyOn(gitVersioner, 'getRepoRoot').mockResolvedValue(tempDir);

      // Create an edition directory
      const editionDir = join(tempDir, 'newspaper', 'editions', '2026-02-28');
      await mkdir(join(editionDir, 'sources'), { recursive: true });
      await writeFile(
        join(editionDir, 'sources', 'editorial.md'),
        '# Test Edition\n\nContent here',
      );
      await writeFile(join(editionDir, 'sources', 'ml-researcher.md'), '# ML Report');

      const result = await commitEdition(editionDir, 'Daily edition: AI breakthroughs');

      expect(result.success).toBe(true);
      expect(result.commitHash).toBeDefined();
      expect(result.commitHash).toHaveLength(40);

      // Verify commit exists on newspaper branch
      const { stdout: log } = await runGit(['log', '--oneline', 'newspaper'], tempDir);
      expect(log).toContain('AI breakthroughs');
    });

    it('switches back to original branch after commit', async () => {
      const gitVersioner = await import('./git-versioner.ts');
      vi.spyOn(gitVersioner, 'getRepoRoot').mockResolvedValue(tempDir);

      const { stdout: originalBranch } = await runGit(['branch', '--show-current'], tempDir);

      const editionDir = join(tempDir, 'newspaper', 'editions', '2026-02-28');
      await mkdir(join(editionDir, 'sources'), { recursive: true });
      await writeFile(join(editionDir, 'sources', 'editorial.md'), '# Test');

      await commitEdition(editionDir, 'Test commit');

      const { stdout: currentBranch } = await runGit(['branch', '--show-current'], tempDir);
      expect(currentBranch).toBe(originalBranch);
    });

    it('handles stashing and restoring uncommitted work', async () => {
      const gitVersioner = await import('./git-versioner.ts');
      vi.spyOn(gitVersioner, 'getRepoRoot').mockResolvedValue(tempDir);

      // Create uncommitted work
      await writeFile(join(tempDir, 'dirty-file.txt'), 'uncommitted changes');
      await runGit(['add', 'dirty-file.txt'], tempDir);

      const editionDir = join(tempDir, 'newspaper', 'editions', '2026-02-28');
      await mkdir(join(editionDir, 'sources'), { recursive: true });
      await writeFile(join(editionDir, 'sources', 'editorial.md'), '# Test');

      const result = await commitEdition(editionDir, 'Test with dirty state');

      expect(result.success).toBe(true);

      // Verify uncommitted work was restored
      const { stdout: status } = await runGit(['status', '--porcelain'], tempDir);
      expect(status).toContain('dirty-file.txt');
    });

    it('returns fallbackPath on git failure', async () => {
      const gitVersioner = await import('./git-versioner.ts');
      vi.spyOn(gitVersioner, 'getRepoRoot').mockRejectedValue(new Error('Not a git repo'));

      const result = await commitEdition('/fake/edition/2026-02-28', 'Test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not inside a git repository');
      expect(result.fallbackPath).toBe('/fake/edition/2026-02-28');
    });

    it('handles no changes to commit gracefully', async () => {
      const gitVersioner = await import('./git-versioner.ts');
      vi.spyOn(gitVersioner, 'getRepoRoot').mockResolvedValue(tempDir);

      const editionDir = join(tempDir, 'newspaper', 'editions', '2026-02-28');
      await mkdir(join(editionDir, 'sources'), { recursive: true });
      await writeFile(join(editionDir, 'sources', 'editorial.md'), '# Test');

      // First commit
      await commitEdition(editionDir, 'First commit');

      // Second commit with same content — should handle gracefully
      const result = await commitEdition(editionDir, 'Duplicate commit');

      // Should succeed (no error) but may not have a new commitHash
      expect(result.success).toBe(true);
    });
  });

  describe('commitWeekly', () => {
    it('commits a weekly file to the newspaper branch', async () => {
      const gitVersioner = await import('./git-versioner.ts');
      vi.spyOn(gitVersioner, 'getRepoRoot').mockResolvedValue(tempDir);

      // Create a weekly file
      const weeklyDir = join(tempDir, 'newspaper', 'weekly');
      await mkdir(weeklyDir, { recursive: true });
      const weeklyPath = join(weeklyDir, '2026-02-28-weekly.md');
      await writeFile(weeklyPath, '# Weekly Synthesis\n\nStrategic trends...');

      const result = await commitWeekly(weeklyPath, 'Weekly synthesis: 2026-02-28');

      expect(result.success).toBe(true);
      expect(result.commitHash).toBeDefined();

      // Verify commit on newspaper branch
      const { stdout: log } = await runGit(['log', '--oneline', 'newspaper'], tempDir);
      expect(log).toContain('Weekly synthesis');
    });

    it('returns fallbackPath when not in a git repo', async () => {
      const gitVersioner = await import('./git-versioner.ts');
      vi.spyOn(gitVersioner, 'getRepoRoot').mockRejectedValue(new Error('Not a git repo'));

      const result = await commitWeekly('/fake/weekly/2026-02-28-weekly.md', 'Test');

      expect(result.success).toBe(false);
      expect(result.fallbackPath).toBe('/fake/weekly/2026-02-28-weekly.md');
    });
  });

  describe('getEditionLog', () => {
    it('returns empty array when newspaper branch does not exist', async () => {
      const result = await getEditionLog(tempDir);
      expect(result).toEqual([]);
    });

    it('returns commit log entries from newspaper branch', async () => {
      const gitVersioner = await import('./git-versioner.ts');
      vi.spyOn(gitVersioner, 'getRepoRoot').mockResolvedValue(tempDir);

      // Create and commit an edition
      const editionDir = join(tempDir, 'newspaper', 'editions', '2026-02-28');
      await mkdir(join(editionDir, 'sources'), { recursive: true });
      await writeFile(join(editionDir, 'sources', 'editorial.md'), '# Test');
      await commitEdition(editionDir, 'Daily: AI advances in Q1');

      const log = await getEditionLog(tempDir);

      expect(log.length).toBeGreaterThanOrEqual(1);
      // Find the edition commit (not the initial empty commit)
      const editionEntry = log.find((e) => e.message.includes('AI advances'));
      expect(editionEntry).toBeDefined();
      expect(editionEntry?.commitHash).toHaveLength(40);
    });
  });

  describe('getEditionContent', () => {
    it('retrieves file content from the newspaper branch without checkout', async () => {
      const gitVersioner = await import('./git-versioner.ts');
      vi.spyOn(gitVersioner, 'getRepoRoot').mockResolvedValue(tempDir);

      // Commit an edition
      const editionDir = join(tempDir, 'newspaper', 'editions', '2026-02-28');
      await mkdir(join(editionDir, 'sources'), { recursive: true });
      await writeFile(
        join(editionDir, 'sources', 'editorial.md'),
        '# Herald Daily Edition\n\nContent here',
      );
      await commitEdition(editionDir, 'Test edition');

      const result = await getEditionContent(tempDir, '2026-02-28', 'sources/editorial.md');

      expect(result.success).toBe(true);
      expect(result.content).toContain('Herald Daily Edition');
    });

    it('returns error for non-existent file', async () => {
      await ensureNewspaperBranch(tempDir);

      const result = await getEditionContent(tempDir, '2026-12-31', 'sources/editorial.md');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('listEditionsFromGit', () => {
    it('returns empty array when no editions committed', async () => {
      await ensureNewspaperBranch(tempDir);
      const result = await listEditionsFromGit(tempDir);
      expect(result).toEqual([]);
    });

    it('lists edition dates from git', async () => {
      const gitVersioner = await import('./git-versioner.ts');
      vi.spyOn(gitVersioner, 'getRepoRoot').mockResolvedValue(tempDir);

      // Commit two editions
      for (const date of ['2026-02-27', '2026-02-28']) {
        const editionDir = join(tempDir, 'newspaper', 'editions', date);
        await mkdir(join(editionDir, 'sources'), { recursive: true });
        await writeFile(join(editionDir, 'sources', 'editorial.md'), `# Edition ${date}`);
        await commitEdition(editionDir, `Edition ${date}`);
      }

      const editions = await listEditionsFromGit(tempDir);
      expect(editions).toContain('2026-02-27');
      expect(editions).toContain('2026-02-28');
    });
  });

  describe('listWeeklyFromGit', () => {
    it('returns empty array when no weekly papers committed', async () => {
      await ensureNewspaperBranch(tempDir);
      const result = await listWeeklyFromGit(tempDir);
      expect(result).toEqual([]);
    });
  });
});
