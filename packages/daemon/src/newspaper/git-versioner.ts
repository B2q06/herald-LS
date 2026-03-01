import { cp, mkdir } from 'node:fs/promises';
import { basename, join } from 'node:path';

export interface GitCommitResult {
  success: boolean;
  commitHash?: string;
  error?: string;
  fallbackPath?: string;
}

export interface GitLogEntry {
  commitHash: string;
  message: string;
}

/**
 * Run a git command as a subprocess via Bun.spawn().
 * Never throws — returns exit code, stdout, and stderr.
 */
export async function runGit(
  args: string[],
  cwd: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(['git', ...args], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  return { exitCode, stdout: stdout.trim(), stderr: stderr.trim() };
}

/**
 * Detect the git repository root from a given working directory.
 */
export async function getRepoRoot(cwd?: string): Promise<string> {
  const { exitCode, stdout } = await runGit(['rev-parse', '--show-toplevel'], cwd ?? process.cwd());
  if (exitCode !== 0) {
    throw new Error('Not inside a git repository');
  }
  return stdout;
}

/**
 * Ensure the orphan branch `newspaper` exists.
 * If it does not exist, creates it with an initial empty commit,
 * then switches back to the original branch.
 */
export async function ensureNewspaperBranch(repoPath: string): Promise<void> {
  // Check if the newspaper branch already exists
  const { exitCode } = await runGit(['rev-parse', '--verify', 'newspaper'], repoPath);
  if (exitCode === 0) {
    return; // Branch already exists
  }

  // Save current branch name
  const { stdout: currentBranch } = await runGit(['branch', '--show-current'], repoPath);

  // Create orphan branch
  await runGit(['switch', '--orphan', 'newspaper'], repoPath);
  await runGit(['commit', '--allow-empty', '-m', 'Initialize newspaper archive branch'], repoPath);

  // Switch back to original branch
  if (currentBranch) {
    await runGit(['switch', currentBranch], repoPath);
  } else {
    // Detached HEAD or no branch — try main
    await runGit(['switch', 'main'], repoPath);
  }
}

/**
 * Commit an edition directory to the newspaper orphan branch.
 *
 * Flow:
 * 1. Stash uncommitted work (safety)
 * 2. Switch to newspaper branch
 * 3. Clean the working tree (newspaper branch only has newspaper content)
 * 4. Copy edition files into working tree
 * 5. Stage and commit
 * 6. Switch back to original branch
 * 7. Pop stash if created
 *
 * On failure: catches, logs, returns { success: false, error }, never throws.
 * The edition is ALREADY on disk at editionDir (NFR3 zero data loss).
 */
export async function commitEdition(
  editionDir: string,
  commitMessage: string,
): Promise<GitCommitResult> {
  let repoRoot: string;
  try {
    repoRoot = await getRepoRoot();
  } catch {
    return { success: false, error: 'Not inside a git repository', fallbackPath: editionDir };
  }

  let currentBranch = '';
  let didStash = false;

  try {
    // Save current branch
    const branchResult = await runGit(['branch', '--show-current'], repoRoot);
    currentBranch = branchResult.stdout;

    // Stash uncommitted work BEFORE any branch operations
    const stashResult = await runGit(['stash', 'push', '-m', 'herald-auto-stash'], repoRoot);
    didStash = !stashResult.stdout.includes('No local changes');

    // Ensure newspaper branch exists (safe to do after stash)
    await ensureNewspaperBranch(repoRoot);

    // Switch to newspaper branch
    const switchResult = await runGit(['switch', 'newspaper'], repoRoot);
    if (switchResult.exitCode !== 0) {
      // Force checkout as fallback (safe: we're about to overwrite newspaper content anyway)
      const forceResult = await runGit(['checkout', '-f', 'newspaper'], repoRoot);
      if (forceResult.exitCode !== 0) {
        return {
          success: false,
          error: `Failed to switch to newspaper branch: ${forceResult.stderr}`,
          fallbackPath: editionDir,
        };
      }
    }

    // Extract date from edition directory path (e.g., .../editions/2026-02-28/ -> 2026-02-28)
    const editionDate = basename(editionDir);

    // Create editions directory on newspaper branch
    const targetDir = join(repoRoot, 'editions', editionDate);
    await mkdir(targetDir, { recursive: true });

    // Copy edition files
    await cp(editionDir, targetDir, { recursive: true });

    // Stage all files
    await runGit(['add', '-A'], repoRoot);

    // Check if there are staged changes
    const diffResult = await runGit(['diff', '--cached', '--quiet'], repoRoot);
    if (diffResult.exitCode === 0) {
      // Nothing to commit — files are identical
      console.log('[herald] No changes to commit for edition');
      return await switchBackAndPopStash(repoRoot, currentBranch, didStash, undefined);
    }

    // Commit
    const commitResult = await runGit(['commit', '-m', commitMessage], repoRoot);
    if (commitResult.exitCode !== 0) {
      console.error('[herald] Git commit failed:', commitResult.stderr);
      return await switchBackAndPopStash(repoRoot, currentBranch, didStash, {
        success: false,
        error: `Commit failed: ${commitResult.stderr}`,
        fallbackPath: editionDir,
      });
    }

    // Get commit hash
    const hashResult = await runGit(['rev-parse', 'HEAD'], repoRoot);
    const commitHash = hashResult.stdout;

    console.log(`[herald] Edition committed: ${commitHash.slice(0, 7)} — ${commitMessage}`);

    return await switchBackAndPopStash(repoRoot, currentBranch, didStash, {
      success: true,
      commitHash,
    });
  } catch (err) {
    console.error('[herald] Git versioning error:', err);
    // Best-effort recovery: try to switch back
    try {
      await switchBackAndPopStash(repoRoot, currentBranch, didStash, undefined);
    } catch {
      // Recovery failed — log but don't throw
      console.error('[herald] Failed to recover git state after error');
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      fallbackPath: editionDir,
    };
  }
}

/**
 * Commit a weekly synthesis paper to the newspaper orphan branch.
 */
export async function commitWeekly(
  weeklyPath: string,
  commitMessage: string,
): Promise<GitCommitResult> {
  let repoRoot: string;
  try {
    repoRoot = await getRepoRoot();
  } catch {
    return { success: false, error: 'Not inside a git repository', fallbackPath: weeklyPath };
  }

  let currentBranch = '';
  let didStash = false;

  try {
    const branchResult = await runGit(['branch', '--show-current'], repoRoot);
    currentBranch = branchResult.stdout;

    const stashResult = await runGit(['stash', 'push', '-m', 'herald-auto-stash'], repoRoot);
    didStash = !stashResult.stdout.includes('No local changes');

    await ensureNewspaperBranch(repoRoot);

    const switchResult = await runGit(['switch', 'newspaper'], repoRoot);
    if (switchResult.exitCode !== 0) {
      const forceResult = await runGit(['checkout', '-f', 'newspaper'], repoRoot);
      if (forceResult.exitCode !== 0) {
        return {
          success: false,
          error: `Failed to switch to newspaper branch: ${forceResult.stderr}`,
          fallbackPath: weeklyPath,
        };
      }
    }

    // Create weekly directory on newspaper branch
    const weeklyDir = join(repoRoot, 'weekly');
    await mkdir(weeklyDir, { recursive: true });

    // Copy weekly file(s)
    const weeklyFilename = basename(weeklyPath);
    const targetPath = join(weeklyDir, weeklyFilename);

    // weeklyPath could be a file or directory
    const file = Bun.file(weeklyPath);
    if (await file.exists()) {
      // Single file
      await Bun.write(targetPath, file);
    } else {
      // Directory — copy recursively
      await cp(weeklyPath, join(weeklyDir, basename(weeklyPath)), { recursive: true });
    }

    await runGit(['add', '-A'], repoRoot);

    const diffResult = await runGit(['diff', '--cached', '--quiet'], repoRoot);
    if (diffResult.exitCode === 0) {
      console.log('[herald] No changes to commit for weekly');
      return await switchBackAndPopStash(repoRoot, currentBranch, didStash, undefined);
    }

    const commitResult = await runGit(['commit', '-m', commitMessage], repoRoot);
    if (commitResult.exitCode !== 0) {
      return await switchBackAndPopStash(repoRoot, currentBranch, didStash, {
        success: false,
        error: `Commit failed: ${commitResult.stderr}`,
        fallbackPath: weeklyPath,
      });
    }

    const hashResult = await runGit(['rev-parse', 'HEAD'], repoRoot);
    const commitHash = hashResult.stdout;

    console.log(`[herald] Weekly committed: ${commitHash.slice(0, 7)} — ${commitMessage}`);

    return await switchBackAndPopStash(repoRoot, currentBranch, didStash, {
      success: true,
      commitHash,
    });
  } catch (err) {
    console.error('[herald] Git versioning error (weekly):', err);
    try {
      await switchBackAndPopStash(repoRoot, currentBranch, didStash, undefined);
    } catch {
      console.error('[herald] Failed to recover git state after weekly error');
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      fallbackPath: weeklyPath,
    };
  }
}

/**
 * Get the edition log from the newspaper branch.
 * Returns an array of { commitHash, message } objects.
 */
export async function getEditionLog(repoPath: string): Promise<GitLogEntry[]> {
  const { exitCode, stdout } = await runGit(
    ['log', '--oneline', '--format=%H %s', 'newspaper'],
    repoPath,
  );

  if (exitCode !== 0 || !stdout) {
    return [];
  }

  return stdout.split('\n').map((line) => {
    const spaceIdx = line.indexOf(' ');
    return {
      commitHash: line.slice(0, spaceIdx),
      message: line.slice(spaceIdx + 1),
    };
  });
}

/**
 * Get file content from a specific edition on the newspaper branch
 * without checking out the branch.
 */
export async function getEditionContent(
  repoPath: string,
  date: string,
  filename: string,
): Promise<{ success: boolean; content?: string; error?: string }> {
  const path = `editions/${date}/${filename}`;
  const { exitCode, stdout, stderr } = await runGit(['show', `newspaper:${path}`], repoPath);

  if (exitCode !== 0) {
    return { success: false, error: stderr || 'File not found in git' };
  }

  return { success: true, content: stdout };
}

/**
 * Helper: switch back to original branch and pop stash.
 * Returns the provided result or a default success result.
 */
async function switchBackAndPopStash(
  repoRoot: string,
  originalBranch: string,
  didStash: boolean,
  result: GitCommitResult | undefined,
): Promise<GitCommitResult> {
  // Switch back to original branch
  if (originalBranch) {
    const switchBack = await runGit(['switch', originalBranch], repoRoot);
    if (switchBack.exitCode !== 0) {
      // Fallback to main
      console.warn('[herald] Failed to switch back to original branch, trying main');
      await runGit(['switch', 'main'], repoRoot);
    }
  }

  // Pop stash if we created one
  if (didStash) {
    const popResult = await runGit(['stash', 'pop'], repoRoot);
    if (popResult.exitCode !== 0) {
      console.warn('[herald] Stash pop failed — stash still available for manual recovery');
    }
  }

  return result ?? { success: true };
}

/**
 * List files in the editions directory on the newspaper branch
 * without checking out.
 */
export async function listEditionsFromGit(repoPath: string): Promise<string[]> {
  const { exitCode, stdout } = await runGit(
    ['ls-tree', '--name-only', 'newspaper', 'editions/'],
    repoPath,
  );

  if (exitCode !== 0 || !stdout) {
    return [];
  }

  // ls-tree returns entries like "editions/2026-02-28"
  return stdout
    .split('\n')
    .filter(Boolean)
    .map((entry) => basename(entry));
}

/**
 * List weekly files on the newspaper branch without checking out.
 */
export async function listWeeklyFromGit(repoPath: string): Promise<string[]> {
  const { exitCode, stdout } = await runGit(
    ['ls-tree', '--name-only', 'newspaper', 'weekly/'],
    repoPath,
  );

  if (exitCode !== 0 || !stdout) {
    return [];
  }

  return stdout
    .split('\n')
    .filter(Boolean)
    .map((entry) => basename(entry));
}
