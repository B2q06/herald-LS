# Story 4.4: Breaking Updates & Featured Stories

Status: ready-for-dev

## Story

As an operator,
I want the newspaper to update immediately on breaking events and trigger deep-dive research on featured stories,
So that urgent intelligence reaches me without waiting for the next scheduled synthesis.

## Dependencies

This story depends on:
- **Story 4.1** (Newspaper Agent Persona & Team Synthesis Session) -- newspaper agent must exist with team synthesis workflow producing editions at `newspaper/editions/{date}/sources/`
- **Story 4.2** (Typst Compilation Pipeline) -- `pipeline.ts` must exist at `packages/daemon/src/newspaper/pipeline.ts` exposing `runNewspaperPipeline(editionDate, heraldConfig)` as a standalone function
- **Story 4.3** (Git Versioning & Edition Management) -- `git-versioner.ts` must exist at `packages/daemon/src/newspaper/git-versioner.ts` exposing `commitEdition(editionDir, commitMessage)` as a standalone function, plus the REST API endpoints for browsing editions

## Acceptance Criteria

1. **Given** a research agent detects an urgent or breaking event during a patrol **When** the event is flagged as breaking **Then** the newspaper agent is triggered immediately outside its normal schedule (FR25) **And** the newspaper updates with the breaking content -- appended as an update to the current edition, not a full re-synthesis **And** the updated edition is recompiled through Typst and re-committed to the git branch

2. **Given** the newspaper agent identifies a story worthy of deep coverage during synthesis **When** the story is marked as a featured story **Then** the featured story triggers a full dedicated research report from the relevant research agent (FR22) **And** the dedicated report is written to the researcher's output directory **And** the dedicated report is linked from the newspaper's featured story section

3. **Given** multiple breaking updates occur throughout the day **When** each update is processed **Then** updates are appended chronologically to the current edition **And** the edition maintains a clear distinction between the morning synthesis and intraday updates

## What Already Exists (from prior stories and current codebase)

- `packages/daemon/src/session/run-executor.ts` -- `executeRun()` orchestrates agent runs, writes reports, fires post-run hooks
- `packages/daemon/src/session/session-manager.ts` -- `SessionManager.runAgent()` sends prompts to Claude via `SdkAdapter`
- `packages/daemon/src/scheduler/index.ts` -- `initScheduler()` groups agents by cron schedule, registers patrol cycles
- `packages/daemon/src/scheduler/patrol-cycle.ts` -- `PatrolCycleManager.executeCycle()` runs agents concurrently
- `packages/daemon/src/scheduler/schedule-registry.ts` -- `ScheduleRegistry` manages cron tasks (register, update, remove)
- `packages/daemon/src/api/runs.ts` -- `POST /api/agents/:name/run` triggers manual agent runs with optional prompt
- `packages/daemon/src/api/index.ts` -- Hono app with `AppDeps` dependency injection pattern
- `packages/shared/src/schemas/agent-config.ts` -- `AgentConfigSchema` with `trigger_rules`, `notify_policy`, `team_eligible` fields
- `packages/shared/src/schemas/agent-output.ts` -- `AgentOutputFrontmatterSchema` with `status` field
- `packages/shared/src/schemas/herald-config.ts` -- `HeraldConfigSchema` with `newspaper_dir`, `reports_dir`
- `packages/daemon/src/agent-loader/agent-registry.ts` -- `AgentRegistry` with `has()`, `get()`, `getAll()`, `updateLastRun()`
- Agent YAML configs with `trigger_rules` field (e.g., `agents/ml-researcher.yaml`)
- Architecture specifies: `packages/daemon/src/newspaper/` directory for newspaper pipeline (Story 4.1-4.3 create `index.ts`, `pipeline.ts`, `typst-compiler.ts`, `git-versioner.ts`)

## What This Story Adds (assumed NOT to exist yet)

### New Files

1. `packages/daemon/src/newspaper/breaking-update.ts` -- Breaking update handler: receives breaking events, triggers newspaper update, appends to edition
2. `packages/daemon/src/newspaper/breaking-update.test.ts` -- Tests for breaking update handler
3. `packages/daemon/src/newspaper/featured-story.ts` -- Featured story detector and research trigger
4. `packages/daemon/src/newspaper/featured-story.test.ts` -- Tests for featured story handler
5. `packages/shared/src/schemas/breaking-event.ts` -- Zod schema for breaking event payloads
6. `packages/shared/src/schemas/featured-story.ts` -- Zod schema for featured story payloads

### Modified Files

7. `packages/daemon/src/newspaper/index.ts` -- Extend with re-exports from `breaking-update.ts` and `featured-story.ts` (created by Story 4.1, extended by Stories 4.2, 4.3, and now 4.4)
8. `packages/daemon/src/api/newspaper.ts` -- Modify to add breaking update routes to the existing `createNewspaperRoutes()` function (created by Story 4.1, extended by Stories 4.2 and 4.3)
9. `packages/daemon/src/api/index.ts` -- Mount newspaper routes
10. `packages/daemon/src/index.ts` -- Wire breaking update handler into daemon boot
11. `packages/shared/src/index.ts` -- Export new schemas
12. `packages/shared/src/schemas/agent-output.ts` -- Add `featured_stories` field to frontmatter schema

## Tasks / Subtasks

### Task 1: Define Breaking Event and Featured Story Schemas (AC: #1, #2, #3)

**Files:** `packages/shared/src/schemas/breaking-event.ts`, `packages/shared/src/schemas/featured-story.ts`, `packages/shared/src/schemas/agent-output.ts`, `packages/shared/src/index.ts`

Create Zod schemas that define the contract for how agents signal breaking events and featured stories.

**Breaking Event Schema** (`packages/shared/src/schemas/breaking-event.ts`):

```typescript
import { z } from 'zod';

export const BreakingEventSchema = z.object({
  /** The research agent that detected the event */
  source_agent: z.string(),
  /** Short headline for the breaking event */
  headline: z.string(),
  /** Full markdown content of the breaking update */
  content: z.string(),
  /** Urgency level as judged by the source agent */
  urgency: z.enum(['critical', 'high', 'medium']),
  /** ISO timestamp when the event was detected */
  detected_at: z.string().datetime(),
  /** Optional: domains this event affects (for cross-domain flagging) */
  affected_domains: z.array(z.string()).optional(),
});

export type BreakingEvent = z.infer<typeof BreakingEventSchema>;
```

**Featured Story Schema** (`packages/shared/src/schemas/featured-story.ts`):

```typescript
import { z } from 'zod';

export const FeaturedStorySchema = z.object({
  /** Headline of the featured story */
  headline: z.string(),
  /** Brief summary of why this story warrants deep coverage */
  summary: z.string(),
  /** The research agent best suited to produce the dedicated report */
  assigned_agent: z.string(),
  /** Research prompt for the dedicated deep-dive report */
  research_prompt: z.string(),
  /** The edition date this featured story appeared in */
  edition_date: z.string(),
});

export type FeaturedStory = z.infer<typeof FeaturedStorySchema>;

export const FeaturedStoryReportLinkSchema = z.object({
  headline: z.string(),
  assigned_agent: z.string(),
  report_path: z.string(),
  report_run_id: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
});

export type FeaturedStoryReportLink = z.infer<typeof FeaturedStoryReportLinkSchema>;
```

**Extend Agent Output Frontmatter** (`packages/shared/src/schemas/agent-output.ts`):

Add optional fields to the existing `AgentOutputFrontmatterSchema`:

```typescript
export const AgentOutputFrontmatterSchema = z.object({
  agent: z.string(),
  run_id: z.string(),
  started_at: z.string().datetime(),
  finished_at: z.string().datetime().optional(),
  status: z.enum(['running', 'success', 'failed', 'cancelled']),
  /** Featured stories identified during synthesis (newspaper agent output only) */
  featured_stories: z.array(z.object({
    headline: z.string(),
    assigned_agent: z.string(),
    research_prompt: z.string(),
  })).optional(),
});
```

**Update shared exports** (`packages/shared/src/index.ts`):

Add exports for `BreakingEventSchema`, `BreakingEvent`, `FeaturedStorySchema`, `FeaturedStory`, `FeaturedStoryReportLink`, `FeaturedStoryReportLinkSchema`.

**Tests:** Schema validation tests are implicitly covered by Zod -- no separate test file needed for schemas. Validation is tested through the consumer code tests.

---

### Task 1b: Update Agent Personas for Breaking & Featured Detection (AC: #1, #2)

**Files:** `personas/ml-researcher.md`, `personas/compute-researcher.md`, `personas/ai-tooling-researcher.md`, `personas/newspaper.md`

Without persona updates, breaking/featured detection will never trigger. The daemon code scans for specific text patterns that agents must be instructed to produce. This task adds those instructions.

**Research agent personas** (`personas/ml-researcher.md`, `personas/compute-researcher.md`, `personas/ai-tooling-researcher.md`) -- Add a "Breaking Events" section:

```markdown
## Breaking Events

If during your patrol you discover information that is:
- A major product launch, acquisition, or shutdown
- A security vulnerability with active exploitation
- A significant policy/regulation announcement with immediate impact
- A breakthrough result that fundamentally changes the field

Then add `BREAKING:` at the start of your report's first line, followed by a one-sentence summary. The daemon will detect this and trigger an immediate newspaper update.
```

**Newspaper agent persona** (`personas/newspaper.md`) -- Add to the output format:

```markdown
## Featured Stories

At the end of your newspaper, include a `## Featured Stories` section listing stories that warrant a dedicated deep-dive research report:

- **Story title**: {headline}
- **Assigned researcher**: {agent-name}
- **Rationale**: {why this deserves expanded coverage}

The daemon will parse this section and trigger the assigned research agent.
```

**Tests:** No automated tests -- persona files are markdown. Verify manually that the new sections are present and correctly formatted.

---

### Task 2: Create the Breaking Update Handler (AC: #1, #3)

**File:** `packages/daemon/src/newspaper/breaking-update.ts`

This module is the core of the breaking update system. It:
1. Receives a `BreakingEvent` from any source (API, post-run hook, or file trigger)
2. Resolves today's edition directory
3. Writes the breaking content as a new update file in the edition's `updates/` subdirectory
4. Triggers Typst recompilation
5. Triggers git re-commit

```typescript
import { mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { HeraldConfig } from '@herald/shared';
import { BreakingEventSchema, type BreakingEvent } from '@herald/shared';

// Import standalone functions from Story 4.2 and 4.3 modules
import { runNewspaperPipeline } from './pipeline.ts';
import type { PipelineResult } from './pipeline.ts';
import { commitEdition } from './git-versioner.ts';
import type { GitCommitResult } from './git-versioner.ts';

export interface BreakingUpdateDeps {
  heraldConfig: HeraldConfig;
}

export interface BreakingUpdateResult {
  updateId: string;
  updatePath: string;
  editionDate: string;
  recompiled: boolean;
  committed: boolean;
}

/**
 * Get the current edition date string (YYYY-MM-DD).
 * The "current edition" is always today's date. If the morning synthesis
 * hasn't run yet, the breaking update creates the edition directory.
 */
function getCurrentEditionDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Generate a unique update ID based on timestamp.
 * Format: update-HHMMSS to allow chronological sorting.
 */
function generateUpdateId(): string {
  const now = new Date();
  const h = String(now.getUTCHours()).padStart(2, '0');
  const m = String(now.getUTCMinutes()).padStart(2, '0');
  const s = String(now.getUTCSeconds()).padStart(2, '0');
  return `update-${h}${m}${s}`;
}

/**
 * Process a breaking event and append it to the current edition.
 *
 * Breaking updates are written to:
 *   newspaper/editions/{date}/updates/{update-HHMMSS}.md
 *
 * Each update file has YAML frontmatter and the full content.
 * The Typst template (from Story 4.2) must be aware of the updates/ directory
 * and render them as an "Intraday Updates" section distinct from the morning synthesis.
 */
export async function processBreakingUpdate(
  event: BreakingEvent,
  deps: BreakingUpdateDeps,
): Promise<BreakingUpdateResult> {
  // Validate the event
  BreakingEventSchema.parse(event);

  const editionDate = getCurrentEditionDate();
  const editionDir = join(deps.heraldConfig.newspaper_dir, 'editions', editionDate);
  const updatesDir = join(editionDir, 'updates');
  await mkdir(updatesDir, { recursive: true });

  const updateId = generateUpdateId();
  const updatePath = join(updatesDir, `${updateId}.md`);

  // Write the breaking update file
  const frontmatter = [
    '---',
    `source_agent: ${event.source_agent}`,
    `headline: "${event.headline}"`,
    `urgency: ${event.urgency}`,
    `detected_at: "${event.detected_at}"`,
    `update_id: "${updateId}"`,
    event.affected_domains?.length
      ? `affected_domains: [${event.affected_domains.join(', ')}]`
      : null,
    '---',
  ].filter(Boolean).join('\n');

  const updateContent = `${frontmatter}\n\n## ${event.headline}\n\n${event.content}\n`;
  await Bun.write(updatePath, updateContent);

  console.log(`[herald:newspaper] Breaking update written: ${updateId} from ${event.source_agent}`);

  // Recompile through Typst pipeline (from Story 4.2)
  // runNewspaperPipeline is imported directly as a standalone function
  let recompiled = false;
  try {
    await runNewspaperPipeline(editionDate, deps.heraldConfig);
    recompiled = true;
    console.log(`[herald:newspaper] Edition recompiled for breaking update`);
  } catch (err) {
    console.error(`[herald:newspaper] Typst recompilation failed:`, (err as Error).message);
    // Edition still available as raw markdown -- NFR18 compliance
  }

  // Re-commit to git branch (from Story 4.3)
  // commitEdition is imported directly as a standalone function
  let committed = false;
  try {
    await commitEdition(
      editionDir,
      `BREAKING: ${event.headline} (via ${event.source_agent})`,
    );
    committed = true;
    console.log(`[herald:newspaper] Breaking update committed to newspaper branch`);
  } catch (err) {
    console.error(`[herald:newspaper] Git commit failed:`, (err as Error).message);
    // File is saved to disk -- NFR3 compliance (zero data loss)
  }

  return { updateId, updatePath, editionDate, recompiled, committed };
}

/**
 * List all breaking updates for a given edition date, sorted chronologically.
 */
export async function listBreakingUpdates(
  editionDate: string,
  heraldConfig: HeraldConfig,
): Promise<Array<{ updateId: string; path: string }>> {
  const updatesDir = join(heraldConfig.newspaper_dir, 'editions', editionDate, 'updates');

  let files: string[];
  try {
    files = await readdir(updatesDir);
  } catch {
    return []; // No updates directory -- no breaking updates for this edition
  }

  return files
    .filter((f) => f.endsWith('.md'))
    .sort() // Chronological by update-HHMMSS naming
    .map((f) => ({
      updateId: f.replace('.md', ''),
      path: join(updatesDir, f),
    }));
}
```

**Test File:** `packages/daemon/src/newspaper/breaking-update.test.ts`

```
Tests to write:
- processBreakingUpdate writes update file with correct frontmatter to updates/ directory
- processBreakingUpdate creates updates/ directory if it doesn't exist
- processBreakingUpdate creates edition directory if morning synthesis hasn't run yet
- Multiple breaking updates are named chronologically (update-HHMMSS)
- processBreakingUpdate calls runNewspaperPipeline with editionDate and heraldConfig
- processBreakingUpdate calls commitEdition with editionDir and BREAKING: prefix in message
- processBreakingUpdate returns recompiled:false if runNewspaperPipeline fails (does not throw)
- processBreakingUpdate returns committed:false if commitEdition fails (does not throw)
- listBreakingUpdates returns empty array for edition with no updates
- listBreakingUpdates returns sorted list of updates
- Invalid BreakingEvent is rejected by Zod validation
```

---

### Task 3: Create the Featured Story Handler (AC: #2)

**File:** `packages/daemon/src/newspaper/featured-story.ts`

This module handles the featured story -> dedicated report pipeline:
1. Parses featured story markers from the newspaper agent's synthesis output
2. Triggers dedicated research runs for each featured story
3. Writes link records connecting the featured story to the dedicated report
4. Updates the edition's featured story section with report links

```typescript
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { AgentConfig, HeraldConfig } from '@herald/shared';
import type { FeaturedStory, FeaturedStoryReportLink } from '@herald/shared';
import type { AgentRegistry } from '../agent-loader/agent-registry.ts';
import { executeRun, type PostRunContext, type RunResult } from '../session/run-executor.ts';
import type { SessionManager } from '../session/session-manager.ts';

export interface FeaturedStoryDeps {
  heraldConfig: HeraldConfig;
  registry: AgentRegistry;
  sessionManager: SessionManager;
  postRunContext?: PostRunContext;
}

export interface FeaturedStoryResult {
  headline: string;
  assignedAgent: string;
  runResult: RunResult | null;
  reportLink: FeaturedStoryReportLink;
}

/**
 * Parse featured stories from the newspaper agent's output frontmatter.
 *
 * The newspaper agent's persona instructs it to include featured_stories
 * in its report frontmatter when it identifies stories worthy of deep coverage.
 * The run-executor writes this frontmatter, and the post-run hook reads it.
 *
 * Expected frontmatter format (written by run-executor based on agent output):
 * ---
 * agent: newspaper
 * featured_stories:
 *   - headline: "New framework threatens React dominance"
 *     assigned_agent: ai-tooling-researcher
 *     research_prompt: "Deep dive into framework X: architecture, benchmarks..."
 * ---
 */
export function parseFeaturedStoriesFromFrontmatter(
  content: string,
): FeaturedStory[] | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  // Look for featured_stories in the frontmatter
  // Simple YAML parsing for the structured array
  const frontmatterBlock = match[1];
  if (!frontmatterBlock.includes('featured_stories:')) return null;

  // Extract the featured_stories section
  const stories: FeaturedStory[] = [];
  const lines = frontmatterBlock.split('\n');
  let inFeaturedStories = false;
  let currentStory: Partial<FeaturedStory> = {};

  for (const line of lines) {
    if (line.trim() === 'featured_stories:') {
      inFeaturedStories = true;
      continue;
    }
    if (inFeaturedStories) {
      if (line.startsWith('  - headline:')) {
        if (currentStory.headline) {
          stories.push(currentStory as FeaturedStory);
        }
        currentStory = {
          headline: line.replace('  - headline:', '').trim().replace(/^"|"$/g, ''),
          edition_date: new Date().toISOString().split('T')[0],
        };
      } else if (line.startsWith('    assigned_agent:')) {
        currentStory.assigned_agent = line.replace('    assigned_agent:', '').trim();
      } else if (line.startsWith('    research_prompt:')) {
        currentStory.research_prompt = line.replace('    research_prompt:', '').trim().replace(/^"|"$/g, '');
      } else if (line.startsWith('    summary:')) {
        currentStory.summary = line.replace('    summary:', '').trim().replace(/^"|"$/g, '');
      } else if (!line.startsWith('  ') && !line.startsWith('    ')) {
        // End of featured_stories section
        inFeaturedStories = false;
      }
    }
  }
  if (currentStory.headline) {
    stories.push(currentStory as FeaturedStory);
  }

  return stories.length > 0 ? stories : null;
}

/**
 * Trigger a dedicated research report for a featured story.
 *
 * This runs the assigned research agent with a specific deep-dive prompt
 * instead of its standard patrol prompt. The report is written to the
 * researcher's normal output directory (reports/{agent-name}/).
 */
export async function triggerFeaturedStoryResearch(
  story: FeaturedStory,
  deps: FeaturedStoryDeps,
): Promise<FeaturedStoryResult> {
  const { registry, sessionManager, heraldConfig, postRunContext } = deps;

  const reportLink: FeaturedStoryReportLink = {
    headline: story.headline,
    assigned_agent: story.assigned_agent,
    report_path: '',
    report_run_id: '',
    status: 'pending',
  };

  // Check if the assigned agent exists
  if (!registry.has(story.assigned_agent)) {
    console.warn(
      `[herald:newspaper] Featured story assigned to unknown agent "${story.assigned_agent}" -- skipping`,
    );
    reportLink.status = 'failed';
    return { headline: story.headline, assignedAgent: story.assigned_agent, runResult: null, reportLink };
  }

  const agent = registry.get(story.assigned_agent);
  if (!agent) {
    reportLink.status = 'failed';
    return { headline: story.headline, assignedAgent: story.assigned_agent, runResult: null, reportLink };
  }

  // Build a deep-dive prompt that references the featured story
  const deepDivePrompt = `FEATURED STORY DEEP-DIVE REQUEST

The Herald newspaper has identified a story in your domain that warrants a full dedicated research report.

Headline: ${story.headline}
${story.summary ? `Summary: ${story.summary}` : ''}

Research directive: ${story.research_prompt}

Produce a comprehensive dedicated report on this topic. This is NOT a standard patrol -- focus entirely on this specific story. Go deep: background context, technical analysis, competitive landscape, implications, and actionable recommendations.

Your report should be thorough enough to stand alone as a referenced resource linked from the newspaper's featured story section.

Do not include YAML frontmatter -- that is added automatically.`;

  reportLink.status = 'in_progress';

  try {
    const runResult = await executeRun(
      story.assigned_agent,
      agent.config,
      heraldConfig,
      sessionManager,
      registry,
      deepDivePrompt,
      postRunContext,
    );

    reportLink.report_run_id = runResult.runId;
    reportLink.report_path = `reports/${story.assigned_agent}/${runResult.runId}.md`;
    reportLink.status = runResult.status === 'success' ? 'completed' : 'failed';

    console.log(
      `[herald:newspaper] Featured story report ${runResult.status}: "${story.headline}" by ${story.assigned_agent} (${runResult.runId})`,
    );

    return { headline: story.headline, assignedAgent: story.assigned_agent, runResult, reportLink };
  } catch (err) {
    console.error(
      `[herald:newspaper] Featured story research failed for "${story.headline}":`,
      (err as Error).message,
    );
    reportLink.status = 'failed';
    return { headline: story.headline, assignedAgent: story.assigned_agent, runResult: null, reportLink };
  }
}

/**
 * Write the featured story links file for a given edition.
 * This file is read by the Typst template to render links to dedicated reports.
 *
 * Written to: newspaper/editions/{date}/featured-links.md
 */
export async function writeFeaturedStoryLinks(
  editionDate: string,
  links: FeaturedStoryReportLink[],
  heraldConfig: HeraldConfig,
): Promise<void> {
  const editionDir = join(heraldConfig.newspaper_dir, 'editions', editionDate);
  await mkdir(editionDir, { recursive: true });

  const linksPath = join(editionDir, 'featured-links.md');

  const linksContent = [
    '---',
    `edition_date: "${editionDate}"`,
    `generated_at: "${new Date().toISOString()}"`,
    '---',
    '',
    '# Featured Story Reports',
    '',
    ...links.map((link) =>
      [
        `## ${link.headline}`,
        `- **Researcher:** ${link.assigned_agent}`,
        `- **Status:** ${link.status}`,
        link.report_path ? `- **Report:** [${link.report_run_id}](${link.report_path})` : '- **Report:** pending',
        '',
      ].join('\n'),
    ),
  ].join('\n');

  await Bun.write(linksPath, linksContent);
}

/**
 * Process all featured stories from a newspaper synthesis run.
 * Triggers dedicated research for each, writes links, returns results.
 *
 * This is the top-level orchestrator called from the post-run hook.
 */
export async function processAllFeaturedStories(
  stories: FeaturedStory[],
  deps: FeaturedStoryDeps,
): Promise<FeaturedStoryResult[]> {
  const results: FeaturedStoryResult[] = [];

  // Process featured stories sequentially to avoid overloading the SDK
  // (each triggers a full agent run)
  for (const story of stories) {
    const result = await triggerFeaturedStoryResearch(story, deps);
    results.push(result);
  }

  // Write links file for the edition
  const editionDate = stories[0]?.edition_date ?? new Date().toISOString().split('T')[0];
  const links = results.map((r) => r.reportLink);
  await writeFeaturedStoryLinks(editionDate, links, deps.heraldConfig);

  return results;
}
```

**Test File:** `packages/daemon/src/newspaper/featured-story.test.ts`

```
Tests to write:
- parseFeaturedStoriesFromFrontmatter extracts featured stories from valid frontmatter
- parseFeaturedStoriesFromFrontmatter returns null when no featured_stories in frontmatter
- parseFeaturedStoriesFromFrontmatter returns null for content without frontmatter
- triggerFeaturedStoryResearch calls executeRun with deep-dive prompt
- triggerFeaturedStoryResearch returns failed status for unknown agent
- triggerFeaturedStoryResearch handles executeRun failure gracefully
- writeFeaturedStoryLinks writes correct markdown with report links
- writeFeaturedStoryLinks creates edition directory if needed
- processAllFeaturedStories processes stories sequentially
- processAllFeaturedStories writes featured-links.md after all stories complete
```

---

### Task 4: Modify the Newspaper REST API Routes (AC: #1, #3)

**File:** Modify `packages/daemon/src/api/newspaper.ts` (created by Story 4.1, extended by Stories 4.2 and 4.3)

Add breaking update routes to the existing `createNewspaperRoutes()` function. Add a `POST /api/newspaper/breaking` endpoint that allows external callers (research agents via the daemon, CLI, or API) to submit breaking events. Also add `GET /api/newspaper/updates/:date` for listing intraday updates.

Add the following routes to the existing `createNewspaperRoutes()` function (using the `NewspaperRouteDeps` interface defined in Story 4.1 -- do NOT redefine it):

```typescript
// Add these imports to the existing imports at the top of newspaper.ts:
import { BreakingEventSchema } from '@herald/shared';
import { listBreakingUpdates, processBreakingUpdate } from '../newspaper/breaking-update.ts';

// Add these routes inside the existing createNewspaperRoutes() function:

  /**
   * POST /api/newspaper/breaking
   *
   * Submit a breaking event for immediate newspaper update.
   * Body: BreakingEvent JSON
   *
   * Returns the update result with updateId, editionDate, recompiled, committed.
   */
  routes.post('/api/newspaper/breaking', async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body) {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const parsed = BreakingEventSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: 'Validation error', detail: parsed.error.format() },
        400,
      );
    }

    try {
      const result = await processBreakingUpdate(parsed.data, { heraldConfig: deps.heraldConfig });
      return c.json(result, 201);
    } catch (err) {
      console.error('[herald:api] Breaking update processing failed:', (err as Error).message);
      return c.json({ error: 'Failed to process breaking update' }, 500);
    }
  });

  /**
   * GET /api/newspaper/updates/:date
   *
   * List all breaking updates for a given edition date.
   * Returns array of { updateId, path } sorted chronologically.
   */
  routes.get('/api/newspaper/updates/:date', async (c) => {
    const date = c.req.param('date');

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return c.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, 400);
    }

    const updates = await listBreakingUpdates(date, deps.heraldConfig);
    return c.json({ updates, editionDate: date });
  });
```

**Test File:** `packages/daemon/src/api/newspaper.test.ts`

```
Tests to write:
- POST /api/newspaper/breaking with valid BreakingEvent returns 201
- POST /api/newspaper/breaking with invalid body returns 400
- POST /api/newspaper/breaking with missing required fields returns 400
- GET /api/newspaper/updates/:date returns updates for existing edition
- GET /api/newspaper/updates/:date returns empty array for edition without updates
- GET /api/newspaper/updates/:date with invalid date format returns 400
```

---

### Task 5: Integrate Breaking Event Detection into Post-Run Hook (AC: #1)

**File:** `packages/daemon/src/session/run-executor.ts` (modify `firePostRunHooks`)

After a research agent's patrol run completes, scan the report text content for a `BREAKING:` prefix on the first line (after frontmatter). If found, automatically construct a `BreakingEvent` from the report content and submit it to the breaking update handler.

This is the **primary mechanism** for research agents to signal breaking events. The research agent's persona instructs it to start its report with `BREAKING: <one-sentence summary>` when it encounters an urgent event. The daemon's run-executor detects this text pattern and triggers the newspaper update pipeline.

**How agents signal "breaking":**

Research agents signal breaking events through their report text content. The persona instructs agents to start their report's first line with `BREAKING:` when they encounter breaking news. The run-executor's post-run hook scans for this text prefix (not frontmatter -- the agent controls its text output but not the frontmatter, which is added by the daemon).

The agent's report content will look like this when breaking:

```markdown
---
agent: ml-researcher
run_id: "20260228-143000"
started_at: "2026-02-28T14:30:00Z"
finished_at: "2026-02-28T14:35:00Z"
status: success
---

BREAKING: Major GPU Architecture Shift Announced

NVIDIA announces...

[rest of report]
```

**Modifications to `run-executor.ts`:**

1. In `firePostRunHooks()`: Add a new hook that reads the report, extracts the text content after frontmatter, checks if the first line starts with `BREAKING:`, extracts the headline and content, and calls `processBreakingUpdate()`.

```typescript
// Add to firePostRunHooks (existing function):

// Check for breaking event in report text content
import('../newspaper/breaking-update.ts').then(async ({ processBreakingUpdate }) => {
  const reportContent = await Bun.file(reportPath).text();

  // Strip frontmatter to get the text body
  const bodyContent = reportContent.replace(/^---\n[\s\S]*?\n---\n*/, '').trimStart();

  // Check if first line starts with BREAKING:
  const firstLine = bodyContent.split('\n')[0];
  if (!firstLine || !firstLine.startsWith('BREAKING:')) return;

  // Extract headline from the BREAKING: prefix line
  const headline = firstLine.replace(/^BREAKING:\s*/, '').trim();
  if (!headline) return;

  // Extract the breaking section content (everything up to the next ## heading or end)
  const nextHeading = bodyContent.indexOf('\n## ', 1);
  const breakingContent = nextHeading > -1
    ? bodyContent.slice(0, nextHeading).trim()
    : bodyContent.trim();

  await processBreakingUpdate(
    {
      source_agent: agentName,
      headline,
      content: breakingContent,
      urgency: 'high',
      detected_at: new Date().toISOString(),
    },
    { heraldConfig }, // BreakingUpdateDeps only needs heraldConfig now
  );
}).catch((err) => {
  console.error('[herald] Breaking event detection error:', (err as Error).message);
}),
```

2. **Expand `PostRunContext`** to include `heraldConfig` for breaking update handling:

```typescript
export interface PostRunContext {
  db: HeraldDatabase;
  embedder: OllamaEmbedder;
  heraldConfig?: HeraldConfig;
}
```

**Tests:** Update `packages/daemon/src/session/run-executor.test.ts`:
- Test that firePostRunHooks detects `BREAKING:` prefix in report text content and calls processBreakingUpdate
- Test that reports without `BREAKING:` prefix do not trigger breaking update
- Test that malformed breaking content does not crash the hook

---

### Task 6: Integrate Featured Story Detection into Newspaper Post-Run Hook (AC: #2)

**File:** `packages/daemon/src/session/run-executor.ts` (modify `firePostRunHooks`)

After the *newspaper agent* completes a synthesis run, check its output for featured story markers. If found, trigger dedicated research for each featured story.

This runs only for runs where `agentName === 'newspaper'` (or more robustly, where the agent config identifies it as the newspaper agent).

```typescript
// Add to firePostRunHooks, after existing hooks:

// Check for featured stories (newspaper agent only)
if (agentName === 'newspaper') {
  import('../newspaper/featured-story.ts').then(async ({ parseFeaturedStoriesFromFrontmatter, processAllFeaturedStories }) => {
    const reportContent = await Bun.file(reportPath).text();
    const stories = parseFeaturedStoriesFromFrontmatter(reportContent);

    if (stories && stories.length > 0) {
      console.log(`[herald:newspaper] Found ${stories.length} featured story(ies) -- triggering dedicated research`);

      // Need registry and sessionManager from a wider context
      // These are passed via an expanded PostRunContext
      if (!ctx.featuredStoryDeps) return;

      await processAllFeaturedStories(stories, ctx.featuredStoryDeps);
    }
  }).catch((err) => {
    console.error('[herald] Featured story processing error:', (err as Error).message);
  });
}
```

**Expand `PostRunContext`** to include `featuredStoryDeps`:

```typescript
export interface PostRunContext {
  db: HeraldDatabase;
  embedder: OllamaEmbedder;
  heraldConfig?: HeraldConfig;
  featuredStoryDeps?: FeaturedStoryDeps;
}
```

**Tests:** Update `packages/daemon/src/session/run-executor.test.ts`:
- Test that newspaper agent runs with featured_stories in frontmatter trigger processAllFeaturedStories
- Test that non-newspaper agent runs do not trigger featured story processing
- Test that newspaper runs without featured_stories do not trigger processing

---

### Task 7: Wire Breaking Updates and Featured Stories into Daemon Boot (AC: #1, #2, #3)

**Files:** `packages/daemon/src/newspaper/index.ts`, `packages/daemon/src/index.ts`, `packages/daemon/src/api/index.ts`

Wire everything together in the daemon's startup sequence.

**`packages/daemon/src/newspaper/index.ts`** (extend -- created by Story 4.1, extended by Stories 4.2 and 4.3):

Add the following re-exports to the existing `newspaper/index.ts`:

```typescript
// Add these re-exports to the existing newspaper/index.ts:
export { processBreakingUpdate, listBreakingUpdates, type BreakingUpdateDeps } from './breaking-update.ts';
export {
  parseFeaturedStoriesFromFrontmatter,
  triggerFeaturedStoryResearch,
  processAllFeaturedStories,
  writeFeaturedStoryLinks,
  type FeaturedStoryDeps,
} from './featured-story.ts';
```

**`packages/daemon/src/api/index.ts`:**

The newspaper routes are already mounted by Story 4.1. The breaking update routes added in Task 4 (to the existing `createNewspaperRoutes()` function) will be automatically available since the route group is already wired in. No additional mounting code is needed -- just ensure `heraldConfig` is passed in the existing `NewspaperRouteDeps` (which Story 4.1 already does).

**`packages/daemon/src/index.ts`:**

In the daemon boot sequence, construct the deps. Note that `BreakingUpdateDeps` only needs `heraldConfig` because the handler imports `runNewspaperPipeline` and `commitEdition` as standalone functions directly:

```typescript
// After Story 4.2 and 4.3 modules are initialized:
import type { FeaturedStoryDeps } from './newspaper/featured-story.ts';

const featuredStoryDeps: FeaturedStoryDeps = {
  heraldConfig: config,
  registry,
  sessionManager,
  postRunContext: { db: heraldDb, embedder },
};

// Expand postRunContext to include heraldConfig + featured deps
const postRunContext = {
  db: heraldDb,
  embedder,
  heraldConfig: config,
  featuredStoryDeps,
};

// Pass heraldConfig to createApp for the newspaper API routes
const app = createApp({
  registry,
  sessionManager,
  heraldConfig: config,
  sdkConfigured,
  scheduleRegistry,
  librarian,
  postRunContext,
});
```

---

### Task 8: Edition Format -- Morning vs. Intraday Distinction (AC: #3)

**File:** The Typst template and edition directory structure (informed by this story, implemented as part of the Typst template in Story 4.2)

This task defines the **edition directory structure** that supports both morning synthesis and intraday updates. The Typst template from Story 4.2 must be aware of this structure.

**Edition Directory Structure:**

```
newspaper/editions/{date}/
├── sources/
│   ├── ml-researcher.md          # Copy of latest report (from Story 4.1)
│   ├── compute-researcher.md     # Copy of latest report (from Story 4.1)
│   ├── ai-tooling-researcher.md  # Copy of latest report (from Story 4.1)
│   └── editorial.md              # Newspaper agent's synthesis (from Story 4.1)
├── updates/                      # Breaking updates (this story)
│   ├── update-143045.md
│   └── update-171230.md
├── newspaper.pdf                 # Compiled PDF (from Story 4.2)
├── newspaper.html                # Compiled HTML (from Story 4.2)
└── featured-links.md             # Featured story links (this story)
```

**Typst Template Requirements (for Story 4.2 to implement, documented here):**

The Typst template must:
1. Render `sources/` content as the **Morning Brief** section
2. Render `updates/` content (if any) as an **Intraday Updates** section, clearly separated from the morning synthesis
3. Each update should display: timestamp, source agent, urgency badge, headline, and content
4. Updates are sorted chronologically (ascending -- oldest first)
5. Render `featured-links.md` content as a **Featured Stories** section with links to dedicated reports

**Update File Format:**

Each breaking update file in `updates/` has this structure:

```markdown
---
source_agent: ml-researcher
headline: "Major GPU Architecture Shift Announced"
urgency: high
detected_at: "2026-02-28T14:30:00Z"
update_id: "update-143000"
---

## Major GPU Architecture Shift Announced

[Full breaking content from the research agent]
```

This task is primarily documentation and format specification. The actual Typst template rendering is Story 4.2's responsibility, but the directory structure and file formats are created by this story's code.

---

### Task 9: Validate End-to-End (AC: #1, #2, #3)

- `bun test` -- all new and existing tests pass
- `bun lint` -- Biome passes with no errors
- Manual validation flow:

1. **Breaking update via API:**
   - `POST /api/newspaper/breaking` with a valid `BreakingEvent` JSON
   - Verify `newspaper/editions/{today}/updates/update-{time}.md` is created
   - Verify Typst recompilation is attempted (may fail if template not yet done -- that's OK, the file should still be written)
   - Verify git commit is attempted

2. **Breaking update via agent patrol:**
   - Trigger a research agent run with a prompt that produces a report starting with `BREAKING:` on the first line
   - Verify the post-run hook detects the `BREAKING:` prefix in the report text and calls processBreakingUpdate
   - Verify the update file appears in the edition's updates/ directory

3. **Featured story trigger:**
   - Trigger the newspaper agent with output containing `featured_stories` in frontmatter
   - Verify the featured story handler triggers executeRun on the assigned research agent
   - Verify `featured-links.md` is written with report link

4. **Multiple updates:**
   - Submit 2-3 breaking updates via API
   - `GET /api/newspaper/updates/{today}` returns all updates chronologically
   - Each update has unique update-HHMMSS ID

## Dev Notes

### Architecture Compliance

- **Two-body model:** All breaking event *detection* logic lives in agent personas (they decide what's breaking). The daemon merely scans for a `BREAKING:` prefix in the report text and routes the content. No intelligence in daemon code.
- **Event flow:** Research agent run -> report written -> post-run hook scans report text for `BREAKING:` prefix -> if found, triggers newspaper update pipeline. This follows the existing pattern of fire-and-forget post-run hooks in `run-executor.ts`.
- **Featured story flow:** Newspaper agent synthesis -> report written -> post-run hook scans frontmatter -> if featured_stories present, triggers dedicated research runs sequentially.
- **Agent failure isolation (NFR5):** Breaking update failures and featured story failures are caught and logged. They never crash the daemon or affect other agents.
- **Zero data loss (NFR3):** Breaking update content is written to disk first, then recompilation and git commit are attempted. If either fails, the markdown content is preserved.
- **Daemon LOC budget (NFR24):** Each new module is focused and small. `breaking-update.ts` is ~100 LOC, `featured-story.ts` is ~150 LOC, `newspaper.ts` API routes are ~50 LOC. Total addition is ~300 LOC.

### Agent Persona Requirements

This story implements persona updates in Task 1b. Research agent personas (`personas/ml-researcher.md`, etc.) are updated with a "Breaking Events" section instructing them to prefix urgent reports with `BREAKING:` on the first line. The newspaper agent persona (`personas/newspaper.md`) is updated with a "Featured Stories" section instructing it to include a structured featured stories block. See Task 1b for the exact content.

### Key Design Decisions

1. **Append, not replace:** Breaking updates are separate files in an `updates/` subdirectory, not modifications to the morning synthesis sources. This preserves the morning edition and maintains a clear audit trail.

2. **Update naming convention:** `update-HHMMSS` format ensures chronological sorting via simple string comparison and allows multiple updates in the same day without collision (assuming no two updates occur in the same second).

3. **Sequential featured story processing:** Featured stories trigger full agent runs, which are expensive. They are processed sequentially rather than in parallel to avoid overwhelming the Claude SDK with concurrent sessions for a single newspaper edition.

4. **Post-run hook as integration point:** The existing `firePostRunHooks` pattern in `run-executor.ts` is the natural integration point. It already handles fire-and-forget async work after agent runs. Breaking event detection and featured story processing fit this pattern exactly.

5. **API endpoint for breaking updates:** `POST /api/newspaper/breaking` provides an explicit entry point for breaking events from any source -- not just post-run hooks. The CLI can use this endpoint (`herald breaking "headline" --agent ml-researcher`), and future file trigger engine (Epic 6) can also invoke it.

### Project Structure Notes

```
packages/daemon/src/newspaper/
  index.ts                  # Pipeline orchestration (created by Story 4.1, extended by Stories 4.2, 4.3, and here)
  typst-compiler.ts         # Subprocess compilation (Story 4.2)
  git-versioner.ts          # Git operations (Story 4.3)
  breaking-update.ts        # NEW: Breaking update handler
  breaking-update.test.ts   # NEW: Breaking update tests
  featured-story.ts         # NEW: Featured story handler
  featured-story.test.ts    # NEW: Featured story tests

packages/daemon/src/api/
  newspaper.ts              # MODIFIED: Add breaking update routes (created by Story 4.1, extended by Stories 4.2, 4.3)

packages/shared/src/schemas/
  breaking-event.ts         # NEW: Breaking event Zod schema
  featured-story.ts         # NEW: Featured story Zod schema
  agent-output.ts           # MODIFIED: Add featured_stories field
```

### Testing Standards

- All tests co-located with source (same directory, `.test.ts` suffix)
- Use Vitest (already configured project-wide)
- Mock `runNewspaperPipeline` and `commitEdition` standalone functions in breaking-update tests
- Mock `executeRun` in featured-story tests (don't actually run agent sessions in unit tests)
- Mock `Bun.write` and `Bun.file` for filesystem operations
- Use temp directories (via `mkdtemp`) for integration-level tests that need real filesystem operations
- Follow existing test patterns from `run-executor.test.ts` and `agent-discovery.test.ts`

### References

| Source | Section | Relevance |
|---|---|---|
| PRD | FR22 | Featured stories trigger full dedicated research reports |
| PRD | FR25 | Newspaper updates immediately on breaking/urgent events |
| PRD | FR10 | Team sessions for collaborative work |
| PRD | NFR3 | Zero data loss -- updates must be persisted before acknowledgment |
| PRD | NFR4 | Newspaper ready before 6:30 AM daily |
| PRD | NFR5 | Failed agent sessions must not affect other agents or daemon stability |
| PRD | NFR18 | Typst compilation as subprocess -- compilation failure must not crash daemon |
| PRD | NFR19 | Git operations handle merge conflicts without manual intervention |
| Architecture | Event Boundary | All triggers flow through events/dispatcher.ts -- but this story uses the simpler post-run hook pattern since the event pipeline (events/ directory) does not yet exist in the codebase |
| Architecture | Report Boundary | Every agent writes to reports/{agent-name}/{timestamp}.md -- featured story reports follow this same pattern |
| Architecture | Agent Output Flow | Post-run hooks trigger librarian indexing -- breaking event detection piggybacks on this same flow |
| Architecture | Newspaper Pipeline | `packages/daemon/src/newspaper/` directory with `index.ts`, `pipeline.ts`, `typst-compiler.ts`, `git-versioner.ts` |
| Epics | Story 4.1 | Newspaper agent persona & team synthesis session -- prerequisite |
| Epics | Story 4.2 | Typst compilation pipeline -- prerequisite (`pipeline.ts` exports `runNewspaperPipeline()`) |
| Epics | Story 4.3 | Git versioning & edition management -- prerequisite (git-versioner.ts) |
| Epics | Story 4.4 | Breaking updates & featured stories -- this story |
| Codebase | `run-executor.ts` | Existing `firePostRunHooks` pattern for post-run async work |
| Codebase | `patrol-cycle.ts` | Concurrent agent execution pattern (for reference) |
| Codebase | `agent-config.ts` | AgentConfigSchema with `trigger_rules` field (future use for file-trigger-based breaking events) |

## Chat Contract (Agent-Daemon Interface)

### How a research agent signals "breaking"

The research agent's persona tells it to start its report with `BREAKING:` followed by a one-sentence summary on the first line when it detects an urgent event. The daemon's post-run hook in `run-executor.ts` scans the report text content (after frontmatter) for this `BREAKING:` prefix on the first line and triggers the breaking update pipeline.

**Detection logic in `firePostRunHooks()`:**

```typescript
// Strip frontmatter to get the text body
const bodyContent = reportContent.replace(/^---\n[\s\S]*?\n---\n*/, '').trimStart();

// Check if first line starts with BREAKING:
const firstLine = bodyContent.split('\n')[0];
if (!firstLine || !firstLine.startsWith('BREAKING:')) return;

const headline = firstLine.replace(/^BREAKING:\s*/, '').trim();
```

This keeps the detection logic minimal (string prefix match, not AI inference) and the intelligence (deciding what's breaking) entirely in the persona. The agent controls its text output but not the frontmatter (which is added by the daemon), so text scanning is the correct approach.

### How the newspaper agent signals featured stories

The newspaper agent's persona tells it to output a YAML-parseable `featured_stories` block at the end of its report when it identifies stories worthy of deep coverage. The `parseFeaturedStoriesFromFrontmatter()` function extracts these from the written report file.

The newspaper agent outputs this at the end of its report:

```
<!-- FEATURED_STORIES
- headline: "New framework threatens React dominance"
  assigned_agent: ai-tooling-researcher
  research_prompt: "Deep dive into framework X..."
  summary: "A new framework is gaining traction..."
-->
```

The `writeReport()` function in `run-executor.ts` detects this structured comment, strips it from the visible report body, and writes it as proper frontmatter fields. The post-run hook then parses the frontmatter and triggers research.

## Dev Agent Record

### Agent Model Used
### Debug Log References
### Completion Notes List
### File List
