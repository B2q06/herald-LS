# Story 4.3: Git Versioning & Edition Management

Status: ready-for-dev

## Story

As an operator,
I want every newspaper edition versioned in git with browsable history,
So that I can track how coverage evolves over time and never lose an edition.

## Acceptance Criteria

1. **Given** a newspaper edition is compiled **When** the edition is finalized **Then** the edition is committed to a dedicated orphan git branch named `newspaper` (FR21) **And** the commit message is agent-authored, summarizing the edition's key stories **And** the orphan branch never merges to main --- it is a standalone archive
2. **Given** git operations encounter merge conflicts or dirty state **When** the conflict is detected **Then** the git versioner handles it automatically without manual intervention (NFR19) **And** no edition data is lost --- worst case, the edition is saved to filesystem even if git commit fails (NFR3)
3. **Given** the operator wants to browse past editions **When** `GET /api/newspaper/editions` is called **Then** the API returns a list of all editions with dates and headline summaries **And** `GET /api/newspaper/editions/:date` returns the specific edition's PDF, HTML, or source markdown
4. **Given** a weekly synthesis is scheduled (Friday EOD) **When** the weekly synthesis runs **Then** a weekly strategic paper is produced and stored at `newspaper/weekly/{date}-weekly.pdf` (FR24) **And** the weekly paper is also committed to the newspaper git branch

## Tasks / Subtasks

### Task 1: Create Git Versioner Module (AC: #1, #2)

- [ ] 1.1 Create `packages/daemon/src/newspaper/git-versioner.ts` --- the core module for all git operations on the `newspaper` orphan branch. Exports standalone functions only (no class or interface wrapping the functions). The exported contract is:

  ```typescript
  // git-versioner.ts exports:
  export interface GitCommitResult {
    success: boolean;
    commitHash?: string;
    error?: string;
    fallbackPath?: string;
  }

  export async function ensureNewspaperBranch(repoPath: string): Promise<void>
  export async function commitEdition(editionDir: string, commitMessage: string): Promise<GitCommitResult>
  export async function commitWeekly(weeklyPath: string, commitMessage: string): Promise<GitCommitResult>
  ```

  > **Cross-Story Contract:** Story 4.4 (Breaking Updates) imports `commitEdition()` from this module to re-commit editions after breaking updates. Do not change the function signature without updating Story 4.4.
- [ ] 1.2 Implement `ensureNewspaperBranch()` --- checks if the orphan branch `newspaper` exists; if not, creates it via `git switch --orphan newspaper` followed by an initial empty commit. Must handle the case where the repo has no commits on that branch. Uses `Bun.spawn()` for subprocess execution
- [ ] 1.3 Implement `commitEdition(editionDir: string, commitMessage: string)` --- the primary function that:
  - Extracts the date from the `editionDir` path (e.g., `newspaper/editions/2026-02-28/` yields `2026-02-28`)
  - Stashes any uncommitted work on the current branch (safety)
  - Switches to the `newspaper` branch
  - Copies the edition files from `editionDir` into the branch working tree
  - Stages all files with `git add .`
  - Commits with the agent-authored commit message
  - Switches back to the original branch
  - Pops stash if one was created
- [ ] 1.4 Implement `commitWeekly(weeklyPath: string, commitMessage: string)` --- commits a weekly synthesis paper to the newspaper branch at `weekly/{date}-weekly.pdf`
- [ ] 1.5 Implement conflict resolution and error recovery:
  - On merge conflict or dirty state: `git checkout --force newspaper`, then `git clean -fd`, then retry
  - On any git failure: log error, return `{ success: false, error: string }`, never throw
  - Filesystem fallback: if git commit fails, the edition is ALREADY on disk at `newspaper/editions/{date}/` --- log warning that git versioning failed but data is safe
- [ ] 1.6 Implement `getEditionLog()` --- runs `git log --oneline newspaper` to return commit history
- [ ] 1.7 Implement `getEditionContent(date: string, filename: string)` --- runs `git show newspaper:{path}` to retrieve content from a specific edition without checkout
- [ ] 1.8 Create `packages/daemon/src/newspaper/git-versioner.test.ts`

### Task 2: Extend Newspaper API Routes (AC: #3)

- [ ] 2.1 Modify `packages/daemon/src/api/newspaper.ts` (created by Story 4.1, extended by Story 4.2) --- add edition browsing routes to the existing `createNewspaperRoutes()` function. Use the `NewspaperRouteDeps` interface defined by Story 4.1 (do NOT redefine it). Story 4.1 provides `POST /api/newspaper/run` and `GET /api/newspaper/current`. Story 4.2 adds `POST /api/newspaper/compile`, `GET /api/newspaper/current/pdf`, and `/current/html`.
- [ ] 2.2 Implement `GET /api/newspaper/editions` --- REPLACES any basic edition listing from Story 4.1 with an enriched version that returns a JSON list of all editions with dates, headline summaries, and git commit info. Sources data from:
  - Primary: `git log` on the `newspaper` branch (commit messages contain summaries)
  - Fallback: scan `newspaper/editions/` directory on filesystem
- [ ] 2.3 Implement `GET /api/newspaper/editions/:date` --- returns the specific edition. Accepts `?format=pdf|html|md` query parameter (default: `md`). Sources data from:
  - Primary: `git show newspaper:editions/{date}/newspaper.{ext}`
  - Fallback: read from `newspaper/editions/{date}/` on filesystem
- [ ] 2.4 Implement `GET /api/newspaper/editions/:date/source` --- returns the raw markdown source files used to compile the edition
- [ ] 2.5 Implement `GET /api/newspaper/weekly` --- returns a list of weekly synthesis papers with dates
- [ ] 2.6 Implement `GET /api/newspaper/weekly/:date` --- returns a specific weekly paper
- [ ] 2.7 Create `packages/daemon/src/api/newspaper.test.ts` --- tests for the new edition browsing routes added in this story

### Task 3: Create Edition Manager Module (AC: #1, #2, #3)

- [ ] 3.1 Create `packages/daemon/src/newspaper/edition-manager.ts` --- orchestrates the lifecycle of an edition from compiled output to versioned archive
- [ ] 3.2 Implement `finalizeEdition(editionDir: string, headlineSummary: string)`:
  - Validates that compiled output exists at `editionDir`
  - Calls `commitEdition(editionDir, headlineSummary)` from git-versioner with the agent-authored summary as commit message
  - Returns `{ success: boolean, commitHash?: string, error?: string }`
- [ ] 3.3 Implement `listEditions()` --- aggregates edition metadata from git log and filesystem, returns sorted list
- [ ] 3.4 Implement `getEdition(date: string, format: 'pdf' | 'html' | 'md')` --- retrieves an edition's content, trying git first, filesystem fallback
- [ ] 3.5 Create `packages/daemon/src/newspaper/edition-manager.test.ts`

### Task 4: Extend Newspaper Module Index (AC: #1)

- [ ] 4.1 Extend `packages/daemon/src/newspaper/index.ts` (created by Story 4.1, extended by Story 4.2) --- add re-exports of public API from `git-versioner.ts` and `edition-manager.ts` alongside existing exports

### Task 5: Weekly Synthesis Scheduling (AC: #4)

- [ ] 5.1 Register a weekly cron job in the scheduler for Friday EOD: `0 17 * * 5` (5 PM every Friday)
- [ ] 5.2 The weekly synthesis cron callback should call `executeNewspaperRun()` from `../newspaper/newspaper-executor.ts` (Story 4.1) with `mode: 'weekly'`. Story 4.1's executor supports this parameter. After the run completes, commit the weekly paper to the newspaper git branch via `commitWeekly()`
- [ ] 5.3 Wire the weekly schedule registration into `packages/daemon/src/index.ts` alongside existing schedule registrations (knowledge-depreciation pattern)

### Task 6: Wire Newspaper Routes into App (AC: #3)

- [ ] 6.1 Verify `packages/daemon/src/api/index.ts` already mounts newspaper routes (done by Story 4.1). No new route mounting needed --- the edition browsing routes are added to the existing `createNewspaperRoutes()` function.
- [ ] 6.2 If Story 4.1's route mounting does not yet include newspaper route dependencies needed for edition browsing (e.g., git-versioner access), extend the existing wiring as needed

### Task 7: Shared Types (AC: #3)

- [ ] 7.1 Add edition-related types to `packages/shared/src/types/index.ts` or create `packages/shared/src/types/newspaper.ts`:
  - `EditionSummary { date: string; headline: string; commitHash?: string; format: string[] }`
  - `EditionContent { date: string; format: string; content: string | Buffer }`
  - `WeeklySummary { date: string; weekStart: string; weekEnd: string; commitHash?: string }`
- [ ] 7.2 Add Zod schemas for API response validation if needed

### Task 8: Validate (all ACs)

- [ ] 8.1 `bun test` --- all new and existing tests pass
- [ ] 8.2 `bun lint` --- clean
- [ ] 8.3 Manual verification: create a test edition directory, call `finalizeEdition()`, verify git branch contains the commit

## Dev Notes

### Technical Requirements

#### Git Orphan Branch Strategy

The `newspaper` branch is an orphan branch --- it shares no history with `main`. This is essential because newspaper content is an archive, not source code. It never merges to main.

**Creating the orphan branch (first time only):**

```bash
# git switch --orphan creates a branch with no history
git switch --orphan newspaper
# Need at least one commit
git commit --allow-empty -m "Initialize newspaper archive branch"
# Switch back
git switch main
```

**In code with Bun.spawn:**

```typescript
async function runGit(args: string[], cwd: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
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
```

#### Bun.spawn for Git Subprocess Execution

All git commands MUST be run as subprocesses via `Bun.spawn()`. Never use a git library --- the architecture specifies subprocess CLI for git operations (see architecture.md External Integration Points table).

Key patterns:

```typescript
// Check if branch exists
const { exitCode } = await runGit(['rev-parse', '--verify', 'newspaper'], repoRoot);
const branchExists = exitCode === 0;

// Create orphan branch
await runGit(['switch', '--orphan', 'newspaper'], repoRoot);

// Get current branch name (to switch back later)
const { stdout: currentBranch } = await runGit(['branch', '--show-current'], repoRoot);

// Switch to newspaper branch
await runGit(['switch', 'newspaper'], repoRoot);

// Stage all files in newspaper directory
await runGit(['add', '-A'], repoRoot);

// Commit with agent-authored message
await runGit(['commit', '-m', commitMessage], repoRoot);

// Switch back
await runGit(['switch', currentBranch], repoRoot);

// Get commit log
const { stdout } = await runGit(['log', '--oneline', '--format=%H %s', 'newspaper'], repoRoot);

// Get file content from a specific branch without checkout
const { stdout: content } = await runGit(['show', `newspaper:editions/${date}/newspaper.md`], repoRoot);
```

#### Conflict Resolution Strategy (NFR19)

The git versioner must handle every conceivable dirty state automatically. The strategy is defense-in-depth:

1. **Pre-flight check:** Before switching branches, check `git status --porcelain`. If dirty, stash with `git stash push -m "herald-auto-stash"`.
2. **Branch switch failure:** If `git switch newspaper` fails, try `git checkout -f newspaper` (force checkout discards local changes on the newspaper branch only --- safe because we are about to overwrite anyway).
3. **Commit failure:** If commit fails (e.g., nothing to commit), check if files are actually staged. If truly empty, skip commit and log info.
4. **Return-to-original failure:** If switching back to original branch fails, try `git switch main` as a safe fallback.
5. **Stash pop failure:** If stash pop conflicts, log warning but do not fail --- the stash is still available for manual recovery.
6. **Total failure mode:** If any step in the pipeline throws unexpectedly, catch everything, log the error, and return `{ success: false, error }`. The edition files are ALREADY saved to `newspaper/editions/{date}/` on the filesystem (NFR3 --- zero data loss). Git versioning is a best-effort overlay on top of guaranteed filesystem persistence.

```typescript
export interface GitCommitResult {
  success: boolean;
  commitHash?: string;
  error?: string;
  fallbackPath?: string;
}
```

#### Filesystem Fallback (NFR3 --- Zero Data Loss)

The critical design constraint: editions are ALWAYS written to the filesystem FIRST by the Typst compilation pipeline (Story 4.2). Git versioning happens AFTER filesystem persistence. This means:

- `newspaper/editions/{date}/newspaper.pdf` --- always exists if compilation succeeded
- `newspaper/editions/{date}/newspaper.html` --- always exists if compilation succeeded
- `newspaper/editions/{date}/sources/` --- always exists (raw markdown sections from agents)

If git versioning fails entirely, the API endpoints fall back to reading directly from the filesystem. The operator never loses access to an edition.

#### API Endpoint Patterns

Add the following routes to the existing `createNewspaperRoutes()` function (defined by Story 4.1, using its `NewspaperRouteDeps` interface --- do NOT redefine the interface):

```typescript
// These routes are ADDED to the existing createNewspaperRoutes() from Story 4.1.
// Story 4.1 already provides: POST /api/newspaper/run, GET /api/newspaper/current
// Story 4.2 already provides: POST /api/newspaper/compile, GET /api/newspaper/current/pdf, /current/html

// List all editions (REPLACES any basic listing from Story 4.1 with enriched version)
routes.get('/api/newspaper/editions', async (c) => {
  // Returns editions with headline summaries and git commit info
  return c.json({ editions: [...] });
});

// Get specific edition
routes.get('/api/newspaper/editions/:date', async (c) => {
  const date = c.req.param('date');
  const format = c.req.query('format') ?? 'md';
  // ...
});

// Get raw source markdown
routes.get('/api/newspaper/editions/:date/source', async (c) => {
  const date = c.req.param('date');
  // ...
});

// Weekly papers
routes.get('/api/newspaper/weekly', async (c) => {
  // ...
  return c.json({ weekly: [...] });
});

routes.get('/api/newspaper/weekly/:date', async (c) => {
  // ...
});
```

**Response formats:**

```typescript
// GET /api/newspaper/editions
{
  editions: [
    {
      date: "2026-02-28",
      headline: "Agent-authored edition summary from commit message",
      commitHash: "abc1234",
      formats: ["pdf", "html", "md"]
    }
  ]
}

// GET /api/newspaper/editions/:date?format=md
{
  date: "2026-02-28",
  format: "md",
  content: "# Herald Daily Edition..."
}

// GET /api/newspaper/editions/:date?format=pdf
// Returns raw binary with Content-Type: application/pdf

// GET /api/newspaper/weekly
{
  weekly: [
    {
      date: "2026-02-28",
      weekStart: "2026-02-24",
      weekEnd: "2026-02-28",
      commitHash: "def5678"
    }
  ]
}
```

#### Weekly Synthesis Scheduling

Register the weekly cron job using the same pattern as knowledge-depreciation in `packages/daemon/src/index.ts`. The weekly cron calls `executeNewspaperRun()` from Story 4.1 with `mode: 'weekly'`:

```typescript
import { executeNewspaperRun } from '../newspaper/newspaper-executor.ts';
import { commitWeekly } from '../newspaper/git-versioner.ts';

// Friday 5 PM cron
scheduleRegistry.register('newspaper-weekly', '0 17 * * 5', () => {
  executeNewspaperRun(registry, sessionManager, heraldConfig, postRunContext, 'weekly')
    .then(result => {
      // After weekly synthesis, commit to git
      return commitWeekly(result.editionDir, `Weekly synthesis: ${result.editionDate}`);
    })
    .catch(err => console.error('[herald] Weekly synthesis error:', err));
});
```

Story 4.1's `executeNewspaperRun()` supports the `'weekly'` mode parameter, which gathers the week's daily editions and produces a weekly strategic paper. This story provides:
- The scheduling hook (Friday 5 PM cron)
- The git commit path for weekly papers (`commitWeekly()`)
- The API endpoints for browsing weekly papers
- The filesystem structure (`newspaper/weekly/{date}-weekly.pdf`)

#### Edition Date Format

Edition dates use ISO date format: `YYYY-MM-DD` (e.g., `2026-02-28`). This matches the architecture pattern: "Newspaper editions: date-based --- `2026-02-28`".

#### Repo Root Detection

The git versioner needs to know the repository root. Detect it with:

```typescript
const { stdout: repoRoot } = await runGit(['rev-parse', '--show-toplevel'], process.cwd());
```

Cache this value --- it does not change during daemon lifetime.

### Project Structure Notes

```
packages/daemon/src/
  newspaper/
    index.ts                  # EXTENDED (created by Story 4.1): add re-exports from git-versioner and edition-manager
    git-versioner.ts          # NEW: Git operations on newspaper orphan branch
    git-versioner.test.ts     # NEW: Tests for git versioner
    edition-manager.ts        # NEW: Edition lifecycle orchestration
    edition-manager.test.ts   # NEW: Tests for edition manager
  api/
    newspaper.ts              # MODIFIED (created by Story 4.1, extended by Story 4.2): add edition browsing routes
    newspaper.test.ts         # EXTENDED: add tests for edition browsing routes
    index.ts                  # Already mounts newspaper routes (Story 4.1)

packages/shared/src/
  types/
    newspaper.ts              # EditionSummary, EditionContent, WeeklySummary types
    index.ts                  # Updated: re-export newspaper types

newspaper/                    # Already exists at repo root
  templates/                  # Typst templates (Story 4.2)
    newspaper.typ
  editions/                   # Per-date compiled output
    {YYYY-MM-DD}/
      newspaper.pdf
      newspaper.html
      sources/                # Raw agent markdown sections
  weekly/
    {YYYY-MM-DD}-weekly.pdf
```

### Testing Strategy

**Git Versioner Tests:**
- Use temp directories with `git init` to create isolated test repositories
- Test orphan branch creation, committing editions, retrieving content
- Test conflict resolution: create dirty state intentionally, verify recovery
- Test failure modes: ensure filesystem fallback works when git fails
- Mock `Bun.spawn` for unit tests, use real git for integration tests in temp repos

```typescript
// Example test setup
beforeEach(async () => {
  tempDir = join(tmpdir(), `herald-git-test-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });
  // Initialize a real git repo for testing
  await runGit(['init'], tempDir);
  await runGit(['commit', '--allow-empty', '-m', 'initial'], tempDir);
});
```

**Edition Manager Tests:**
- Mock git-versioner functions
- Test edition finalization flow
- Test listing/retrieval with filesystem fallback

**API Tests:**
- Follow the pattern from `packages/daemon/src/api/runs.test.ts`
- Use Hono's test client (`app.request()`)
- Mock edition-manager for unit tests

**Test File Locations (co-located):**
- `packages/daemon/src/newspaper/git-versioner.test.ts`
- `packages/daemon/src/newspaper/edition-manager.test.ts`
- `packages/daemon/src/api/newspaper.test.ts`

### Existing Code to Build On

- `packages/daemon/src/api/index.ts` --- `createApp()` with `AppDeps` interface, route mounting pattern
- `packages/daemon/src/api/runs.ts` --- Hono route pattern with deps injection, `parseFrontmatter()` utility
- `packages/daemon/src/scheduler/index.ts` --- `initScheduler()` shows how to register cron jobs
- `packages/daemon/src/scheduler/schedule-registry.ts` --- `ScheduleRegistry.register()` for cron management
- `packages/daemon/src/index.ts` --- daemon boot sequence, shows where to wire new schedule and routes
- `packages/daemon/src/session/run-executor.ts` --- `generateRunId()` for timestamp-based IDs, `Bun.write()` for file output
- `packages/shared/src/schemas/herald-config.ts` --- `HeraldConfig` with `newspaper_dir` field already defined
- `packages/shared/src/types/index.ts` --- type re-export pattern

### Important Constraints

1. **Never use a git library.** Architecture mandates subprocess CLI for git operations.
2. **Never merge the newspaper branch to main.** It is a standalone archive.
3. **Never throw from git operations.** Always catch and return result objects. The daemon must not crash (NFR5).
4. **Always persist to filesystem first.** Git versioning is secondary to filesystem persistence (NFR3).
5. **All git commands must specify `cwd`.** The daemon's working directory may not be the repo root.
6. **The `newspaper` orphan branch should only contain newspaper content.** Do not copy unrelated files.
7. **Commit messages should be descriptive.** They serve as the edition index when browsing git log.
8. **Keep the daemon under 2000 LOC** (NFR24). The git versioner and edition manager should be concise utility modules.
9. **Use `Bun.spawn()` not `child_process.exec()`.** Bun-native APIs are preferred per architecture.
10. **API endpoints use kebab-case, plural nouns.** Follow `/api/newspaper/editions` not `/api/newspaper/edition`.

### References

- [Source: architecture.md --- Infrastructure & Deployment] "Newspaper versioning: Orphan git branch. Dedicated `newspaper` branch, agent-authored commit messages, never merges to main"
- [Source: architecture.md --- External Integration Points] "Git (newspaper) | Subprocess CLI | daemon/src/newspaper/git-versioner.ts | Stage 1"
- [Source: architecture.md --- Project Structure] `newspaper/` directory with `editions/{date}/`, `weekly/{date}-weekly.pdf`, `templates/newspaper.typ`
- [Source: architecture.md --- File Structure] `daemon/src/newspaper/` with `index.ts`, `typst-compiler.ts`, `git-versioner.ts`
- [Source: architecture.md --- API Routes] `newspaper.ts` with `GET /newspaper/current, /editions`
- [Source: architecture.md --- Format Patterns] "Newspaper editions: date-based --- 2026-02-28"
- [Source: architecture.md --- Naming Patterns] REST API endpoints kebab-case, plural nouns
- [Source: prd.md --- FR21] "The system can version newspaper editions via git on a dedicated branch"
- [Source: prd.md --- FR24] "The operator can browse past newspaper editions and weekly synthesis papers"
- [Source: prd.md --- NFR3] "Zero data loss --- agent memory, conversation logs, project state, and newspaper editions must always be persisted to disk before acknowledgment"
- [Source: prd.md --- NFR19] "Git operations for newspaper versioning must handle merge conflicts and dirty state without manual intervention"
- [Source: epics.md --- Story 4.3] Full acceptance criteria

## Dev Agent Record

### Agent Model Used
### Debug Log References
### Completion Notes List
### Change Log

- 2026-02-28: Story 4.3 created --- git versioning with orphan branch strategy, edition management API, weekly synthesis scheduling, conflict resolution, and filesystem fallback
- 2026-02-28: Unified contract fixes applied --- API routes changed from CREATE to MODIFY (Story 4.1 creates newspaper.ts); commitEdition/commitWeekly reduced to 2 params; cross-story contract for Story 4.4 documented; newspaper/index.ts changed to EXTEND; weekly synthesis updated to use executeNewspaperRun() from Story 4.1; standalone function exports enforced (no GitVersioner class/interface); duplicate NewspaperRouteDeps and /current route removed
