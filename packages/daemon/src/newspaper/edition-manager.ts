import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { EditionContent, EditionSummary, WeeklySummary } from '@herald/shared';
import {
  commitEdition,
  type GitCommitResult,
  getEditionContent,
  getEditionLog,
  getRepoRoot,
  listEditionsFromGit,
  listWeeklyFromGit,
} from './git-versioner.ts';

/**
 * Finalize an edition: validate compiled output exists, then commit to git.
 * The edition files are ALREADY on disk (NFR3) — git versioning is a best-effort overlay.
 */
export async function finalizeEdition(
  editionDir: string,
  headlineSummary: string,
): Promise<GitCommitResult> {
  // Validate that the edition directory has content
  try {
    const entries = await readdir(editionDir);
    if (entries.length === 0) {
      return {
        success: false,
        error: `Edition directory is empty: ${editionDir}`,
        fallbackPath: editionDir,
      };
    }
  } catch {
    return {
      success: false,
      error: `Edition directory does not exist: ${editionDir}`,
      fallbackPath: editionDir,
    };
  }

  return commitEdition(editionDir, headlineSummary);
}

/**
 * List all editions, merging data from git log (commit messages as headlines)
 * and filesystem (available formats).
 *
 * Primary source: git log on newspaper branch.
 * Fallback: scan newspaper/editions/ on filesystem.
 */
export async function listEditions(newspaperDir: string): Promise<EditionSummary[]> {
  const editionMap = new Map<string, EditionSummary>();

  // Try git first for commit info
  let repoRoot: string | undefined;
  try {
    repoRoot = await getRepoRoot();
  } catch {
    // Not in a git repo — filesystem only
  }

  if (repoRoot) {
    // Get editions from git
    const gitEditions = await listEditionsFromGit(repoRoot);
    const gitLog = await getEditionLog(repoRoot);

    for (const date of gitEditions) {
      // Find the most recent commit message mentioning this date
      const logEntry = gitLog.find(
        (entry) => entry.message.includes(date) || entry.message.toLowerCase().includes('edition'),
      );

      editionMap.set(date, {
        date,
        headline: logEntry?.message ?? '',
        commitHash: logEntry?.commitHash,
        formats: [],
      });
    }
  }

  // Merge filesystem data (always available, may have more info like formats)
  const editionsDir = join(newspaperDir, 'editions');
  try {
    const fsDates = await readdir(editionsDir);
    for (const date of fsDates) {
      const existing = editionMap.get(date);
      const formats = await detectFormats(join(editionsDir, date));

      if (existing) {
        existing.formats = formats;
        // If no headline from git, try to read from filesystem
        if (!existing.headline) {
          existing.headline = await readHeadlineFromFs(join(editionsDir, date));
        }
      } else {
        editionMap.set(date, {
          date,
          headline: await readHeadlineFromFs(join(editionsDir, date)),
          formats,
        });
      }
    }
  } catch {
    // Editions directory does not exist — use git-only data
  }

  // Sort by date descending
  return Array.from(editionMap.values()).sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Get a specific edition's content.
 * Tries git first (newspaper branch), falls back to filesystem.
 */
export async function getEdition(
  newspaperDir: string,
  date: string,
  format: 'pdf' | 'html' | 'md' = 'md',
): Promise<EditionContent | { error: string }> {
  const filenameMap: Record<string, string> = {
    md: 'sources/editorial.md',
    html: 'newspaper.html',
    pdf: 'newspaper.pdf',
  };

  const filename = filenameMap[format];
  if (!filename) {
    return { error: `Unsupported format: ${format}` };
  }

  // Try git first
  let repoRoot: string | undefined;
  try {
    repoRoot = await getRepoRoot();
  } catch {
    // Fall through to filesystem
  }

  if (repoRoot) {
    const gitResult = await getEditionContent(repoRoot, date, filename);
    if (gitResult.success && gitResult.content) {
      return { date, format, content: gitResult.content };
    }
  }

  // Filesystem fallback
  const filePath = join(newspaperDir, 'editions', date, filename);
  const file = Bun.file(filePath);
  if (await file.exists()) {
    const content = await file.text();
    return { date, format, content };
  }

  return { error: `Edition not found: ${date} (format: ${format})` };
}

/**
 * List weekly synthesis papers from git and filesystem.
 */
export async function listWeeklies(newspaperDir: string): Promise<WeeklySummary[]> {
  const weeklyMap = new Map<string, WeeklySummary>();

  // Git data
  let repoRoot: string | undefined;
  try {
    repoRoot = await getRepoRoot();
  } catch {
    // Not in git repo
  }

  if (repoRoot) {
    const gitWeeklies = await listWeeklyFromGit(repoRoot);
    const gitLog = await getEditionLog(repoRoot);

    for (const filename of gitWeeklies) {
      const date = extractDateFromWeeklyFilename(filename);
      if (!date) continue;

      const logEntry = gitLog.find((e) => e.message.includes(date) || e.message.includes('Weekly'));

      weeklyMap.set(date, {
        date,
        weekStart: getWeekStart(date),
        weekEnd: date,
        commitHash: logEntry?.commitHash,
      });
    }
  }

  // Filesystem fallback
  const weeklyDir = join(newspaperDir, 'weekly');
  try {
    const files = await readdir(weeklyDir);
    for (const filename of files) {
      const date = extractDateFromWeeklyFilename(filename);
      if (!date) continue;

      if (!weeklyMap.has(date)) {
        weeklyMap.set(date, {
          date,
          weekStart: getWeekStart(date),
          weekEnd: date,
        });
      }
    }
  } catch {
    // Weekly directory does not exist
  }

  return Array.from(weeklyMap.values()).sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Get a specific weekly paper's content.
 */
export async function getWeekly(
  newspaperDir: string,
  date: string,
): Promise<{ date: string; content: string } | { error: string }> {
  // Try git first
  let repoRoot: string | undefined;
  try {
    repoRoot = await getRepoRoot();
  } catch {
    // Fall through
  }

  if (repoRoot) {
    const filename = `${date}-weekly.md`;
    const { exitCode, stdout } = await (await import('./git-versioner.ts')).runGit(
      ['show', `newspaper:weekly/${filename}`],
      repoRoot,
    );

    if (exitCode === 0 && stdout) {
      return { date, content: stdout };
    }
  }

  // Filesystem fallback — try .md first, then .pdf
  for (const ext of ['md', 'pdf']) {
    const filePath = join(newspaperDir, 'weekly', `${date}-weekly.${ext}`);
    const file = Bun.file(filePath);
    if (await file.exists()) {
      const content = await file.text();
      return { date, content };
    }
  }

  return { error: `Weekly paper not found: ${date}` };
}

/**
 * Get raw source markdown files for an edition.
 */
export async function getEditionSources(
  newspaperDir: string,
  date: string,
): Promise<{ sources: Record<string, string> } | { error: string }> {
  const sourcesDir = join(newspaperDir, 'editions', date, 'sources');

  try {
    const files = await readdir(sourcesDir);
    const sources: Record<string, string> = {};

    for (const file of files) {
      if (file.endsWith('.md')) {
        const content = await Bun.file(join(sourcesDir, file)).text();
        sources[file] = content;
      }
    }

    if (Object.keys(sources).length === 0) {
      return { error: `No source files found for edition: ${date}` };
    }

    return { sources };
  } catch {
    return { error: `Sources not found for edition: ${date}` };
  }
}

// --- Helpers ---

async function detectFormats(editionDir: string): Promise<string[]> {
  const formats: string[] = [];
  try {
    const entries = await readdir(editionDir);
    if (entries.includes('newspaper.pdf')) formats.push('pdf');
    if (entries.includes('newspaper.html')) formats.push('html');
    // Check for sources/ directory (contains md)
    if (entries.includes('sources')) formats.push('md');
  } catch {
    // Directory read failed
  }
  return formats;
}

async function readHeadlineFromFs(editionDir: string): Promise<string> {
  try {
    const editorialPath = join(editionDir, 'sources', 'editorial.md');
    const file = Bun.file(editorialPath);
    if (await file.exists()) {
      const content = await file.text();
      // Extract first heading
      const match = content.match(/^#\s+(.+)/m);
      return match?.[1] ?? '';
    }
  } catch {
    // Failed to read
  }
  return '';
}

function extractDateFromWeeklyFilename(filename: string): string | null {
  // Expected format: 2026-02-28-weekly.md or 2026-02-28-weekly.pdf
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})-weekly\./);
  return match?.[1] ?? null;
}

function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  // Monday = start of week (ISO)
  const diff = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - diff);
  return date.toISOString().split('T')[0];
}
