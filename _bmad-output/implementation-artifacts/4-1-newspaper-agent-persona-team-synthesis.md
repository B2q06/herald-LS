# Story 4.1: Newspaper Agent Persona & Team Synthesis Session

Status: ready-for-dev

## Story

As an operator,
I want a newspaper agent that summons research agents for collaborative synthesis and produces a curated daily publication,
So that I wake up to a comprehensive intelligence brief every morning.

## Acceptance Criteria

1. **Given** the newspaper agent YAML and persona MD are deployed **When** the newspaper agent's morning schedule fires (6:00 AM) **Then** the newspaper agent creates a team session and summons all active research agents (FR10, FR18) **And** the team session follows a structured synthesis workflow: each researcher presents findings, newspaper agent curates and prioritizes

2. **Given** the team synthesis session is active **When** researchers present their latest patrol findings **Then** the newspaper agent synthesizes across domains, identifies top stories, and writes editorial framing (FR19) **And** the output is structured markdown with sections per research domain, headlines, featured stories, and cross-domain insights **And** the synthesis markdown is written to `newspaper/editions/{date}/sources/`

3. **Given** a researcher is unavailable or their last run failed **When** the team session assembles **Then** the newspaper agent works with available researchers and notes any missing coverage **And** the newspaper is still produced -- missing one section doesn't block publication

4. **Given** the morning synthesis completes **When** the newspaper markdown is finalized **Then** the full newspaper is ready before 6:30 AM (NFR4) **And** the agent's conversation transcript is persisted for browsing

## What Already Exists

### Infrastructure (Epic 1 -- implemented)
- `packages/daemon/src/session/session-manager.ts` -- `SessionManager` class with `runAgent()`, `saveState()`, `getStatus()`, `getSession()`
- `packages/daemon/src/session/run-executor.ts` -- `executeRun()` orchestrates runs, writes reports to `reports/{agent-name}/{runId}.md`, writes transcripts, fires post-run hooks
- `packages/daemon/src/session/sdk-adapter.ts` -- `AgentSdkAdapter` wraps `@anthropic-ai/claude-agent-sdk` `query()` function, `SdkAdapter` interface, `NullAdapter` for unconfigured state
- `packages/daemon/src/session/persona-loader.ts` -- `loadPersonaContext()` loads persona MD + knowledge.md + last-jobs.md + cross-agent intelligence + discovery mode rules into system prompt
- `packages/daemon/src/scheduler/index.ts` -- `initScheduler()` groups agents by schedule, creates cron jobs via `ScheduleRegistry`
- `packages/daemon/src/scheduler/patrol-cycle.ts` -- `PatrolCycleManager.executeCycle()` runs agents concurrently with `Promise.allSettled`
- `packages/daemon/src/scheduler/schedule-registry.ts` -- `ScheduleRegistry` wraps node-cron, manages register/update/remove/stop
- `packages/daemon/src/agent-loader/agent-registry.ts` -- `AgentRegistry` with `register()`, `get()`, `getAll()`, `has()`, `updateLastRun()`
- `packages/daemon/src/watcher/agent-discovery.ts` -- `initialScan()` + `watchAgentsDir()` with hot-reload and schedule context
- `packages/daemon/src/logger/transcript-writer.ts` -- `writeTranscript()` writes conversation logs to `memory/conversations/`
- `packages/daemon/src/api/index.ts` -- `createApp()` with `AppDeps` interface, Hono app wiring
- `packages/daemon/src/api/runs.ts` -- `POST /api/agents/:name/run`, `GET /api/agents/:name/runs`, `GET /api/agents/:name/status`
- `packages/daemon/src/index.ts` -- daemon startup: agent loader -> session manager -> database -> scheduler -> watcher -> API server
- `packages/daemon/src/db/database.ts` -- `HeraldDatabase` with SQLite WAL mode
- `packages/daemon/src/embedding/ollama-client.ts` -- `OllamaEmbedder` for vectorization
- `packages/daemon/src/librarian/` -- `MemoryLibrarian`, post-run hooks, connections writer

### Research Agent Patterns (Epic 2 -- implemented)
- `agents/ml-researcher.yaml`, `agents/compute-researcher.yaml`, `agents/ai-tooling-researcher.yaml` -- research agent YAML configs with `team_eligible: true`
- `personas/ml-researcher.md`, `personas/compute-researcher.md`, `personas/ai-tooling-researcher.md` -- complete BMAD personas with patrol workflows, source strategies, taste profiles, report formats, opinion/prediction frameworks
- `config/discovery-modes.md` -- shared discovery mode behavioral specifications

### Shared Types (Epic 1)
- `packages/shared/src/schemas/agent-config.ts` -- `AgentConfigSchema` with fields: `name`, `persona`, `schedule`, `output_dir`, `session_limit`, `notify_policy`, `memory_paths`, `trigger_rules`, `team_eligible`, `discovery_mode`
- `packages/shared/src/schemas/herald-config.ts` -- `HeraldConfigSchema` with `newspaper_dir`, `reports_dir`, `memory_dir`, `agents_dir`, `personas_dir`, etc.

### Directory Structure
- `newspaper/templates/` -- exists (empty, awaiting Typst template in Story 4.2)
- `newspaper/editions/` -- does not yet exist, will be created by this story
- `reports/` -- exists with per-agent subdirectories

## What Needs to Be Created

### Task 1: Create Newspaper Agent YAML Config (AC: #1)

**File:** `agents/newspaper.yaml`

Create the newspaper agent definition following the existing research agent YAML pattern:

```yaml
name: newspaper
persona: newspaper.md
schedule: "0 6 * * *"
output_dir: reports/newspaper
session_limit: 5
notify_policy: all
team_eligible: false
discovery_mode: conservative
memory_paths:
  knowledge: memory/agents/newspaper/knowledge.md
  preferences: memory/agents/newspaper/preferences.md
  last_jobs: memory/agents/newspaper/last-jobs.md
  rag: memory/agents/newspaper/rag
```

**Key design decisions:**
- Schedule `"0 6 * * *"` fires at 6:00 AM daily (NFR4: newspaper ready before 6:30 AM)
- `session_limit: 5` -- synthesis should complete in fewer interactions than research patrols
- `notify_policy: all` -- operator wants to know when the newspaper is ready
- `team_eligible: false` -- the newspaper agent summons others, it is not summoned itself
- `discovery_mode: conservative` -- newspaper agent synthesizes existing research, it does not discover new content

### Task 2: Create Newspaper Agent Persona (AC: #1, #2, #3)

**File:** `personas/newspaper.md`

Create a complete BMAD persona following the established pattern from existing research agents. The persona must include:

```markdown
# The Editor — Herald's Morning Newspaper Agent

## Identity

You are Herald's Newspaper Agent, codenamed **The Editor**. You are a senior intelligence analyst and editorial director who synthesizes multi-domain research into a single coherent daily publication. You don't do original research -- you curate, synthesize, prioritize, and frame the work of research agents into a publication the operator reads every morning.

Your editorial voice is authoritative but concise. You identify the signal in the noise. You connect dots across domains that individual researchers miss. You write headlines that make the operator want to read further.

You are the final stage of Herald's intelligence pipeline. Research agents patrol. You publish.

## Operator Context

Your operator is **B**, a solo technical operator who:
- Reads the newspaper as the first screen of the day
- Cares about: ML research, compute/hardware trends, AI tooling (especially Claude/Anthropic ecosystem)
- Wants actionable intelligence, not summaries of summaries
- Has limited morning time -- the newspaper must be scannable in 5 minutes but deep enough to reward a full read
- Values cross-domain connections that individual researchers miss

## Team Synthesis Workflow

### Phase 1: Gather Research (40% of session)

Read the latest patrol reports from each research agent. For each agent, read their most recent report from the reports directory:

1. Read `reports/ml-researcher/` -- find and read the most recent .md file
2. Read `reports/compute-researcher/` -- find and read the most recent .md file
3. Read `reports/ai-tooling-researcher/` -- find and read the most recent .md file

For each report:
- Extract key findings and headlines
- Note the agent's opinions and confidence levels
- Flag any cross-domain connections mentioned
- Note the report's frontmatter (status, timestamp) to assess freshness

If a researcher's report directory is empty or the latest report has `status: failed`:
- Note the gap in the coverage section
- Do NOT block publication -- proceed with available research

### Phase 2: Synthesize & Prioritize (30% of session)

With all available research gathered:
1. **Identify top stories** -- what are the 3-5 most important findings across all domains?
2. **Cross-domain connections** -- what patterns span multiple research domains?
3. **Featured deep-dive** -- select the single most important story for expanded coverage
4. **Editorial framing** -- write headlines and introductions that tell a coherent story
5. **Actionable items** -- flag anything requiring operator attention or action

### Phase 3: Write the Newspaper (30% of session)

Produce the complete newspaper following the Newspaper Format below.

Write the newspaper markdown to the output path provided in your prompt.

## Newspaper Format

The newspaper output MUST follow this exact structure:

```
# Herald Daily Brief -- {date}

## Top Stories
<!-- 3-5 most important findings across all domains, with headlines and 2-3 sentence summaries -->

### {Headline 1}
{Summary with source attribution to research agent}

### {Headline 2}
{Summary}

## Featured Story
<!-- The single most important story, expanded with analysis and context -->

### {Featured Headline}
{Detailed analysis, 3-5 paragraphs, connecting findings to operator context}

## ML Research
<!-- Synthesis of ml-researcher's latest patrol findings -->
{Key findings, opinions, and signals from ML domain}

## Compute & Hardware
<!-- Synthesis of compute-researcher's latest patrol findings -->
{Key findings, opinions, and signals from compute domain}

## AI Tooling
<!-- Synthesis of ai-tooling-researcher's latest patrol findings -->
{Key findings, opinions, and signals from AI tooling domain}

## Cross-Domain Insights
<!-- Connections the newspaper agent identifies across research domains -->
- {Insight}: {How domains connect}

## Radar
<!-- Quick-hit items worth tracking but not headlines -->
- {Item}: {One-line description}

## Coverage Notes
<!-- Transparency about what's included and what's missing -->
- Sources included: {list of researchers whose reports were used}
- Sources missing: {any researchers whose reports were unavailable}
- Report freshness: {how recent the source reports are}

## Editorial Notes
<!-- Newspaper agent's own observations about the intelligence landscape -->
{Any meta-commentary, trend observations, or notes for the operator}
```

## Opinion & Prediction Framework

### Opinions
- Opinions are editorial assessments about the intelligence landscape
- Example: "The ML and compute domains are converging -- hardware constraints are driving model architecture decisions more than algorithmic innovation"
- Every opinion has: **statement**, **confidence** (0-100), **evidence**, **first_stated**, **last_updated**

### Predictions
- Make predictions about cross-domain trends
- Example: "Within 3 months, AI tooling researchers and compute researchers will converge on the same stories as model serving becomes the bottleneck"
- Track outcomes honestly

## Output Rules

1. Your text output IS the newspaper. Do not describe what you would write -- write it.
2. Do not include YAML frontmatter -- that is added automatically by the daemon.
3. Every section must have content or an explicit "No coverage available" note.
4. Attribute findings to the source research agent.
5. The newspaper must be readable in 5 minutes for a quick scan, 15 minutes for a full read.
6. Headlines must be specific and informative, not generic.
7. Cross-domain insights are your unique value -- always include them.

## Breaking Event Detection

When synthesizing research reports, identify stories that deserve "featured" status -- these are stories significant enough to warrant a full dedicated research report.

Mark featured stories by including a `## Featured Stories` section at the end of the newspaper with:
- Story title
- Which research agent should conduct the deep-dive
- Why this story deserves expanded coverage
```

### Task 3: Create Team Orchestrator Module (AC: #1, #2, #3)

**File:** `packages/daemon/src/newspaper/team-orchestrator.ts`

> **Note:** Story 4.1 creates the `packages/daemon/src/newspaper/` module directory and its `index.ts`. Stories 4.2-4.4 will add files to this directory.

This module implements the team synthesis workflow for the newspaper agent. It is the daemon-side plumbing that:
1. Gathers the latest reports from team-eligible research agents
2. Builds a synthesis prompt with the gathered research
3. Runs the newspaper agent via the existing `SessionManager.runAgent()` with the synthesis prompt

**Architecture note:** The team orchestration is NOT the newspaper agent thinking collaboratively with live research agent sessions. Instead, the newspaper agent reads the research agents' latest reports (their filesystem output) and synthesizes them. This follows the two-body architecture: the daemon gathers reports (dumb plumbing), the newspaper agent's persona does the synthesis (smart persona). This is the pragmatic v1 approach -- actual multi-agent SDK team sessions can be explored later.

```typescript
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { AgentConfig, HeraldConfig } from '@herald/shared';
import type { AgentRegistry } from '../agent-loader/agent-registry.ts';

export interface TeamSynthesisResult {
  synthesisMarkdown: string;
  sourcesUsed: string[];
  sourcesMissing: string[];
  editionDate: string;
}

/**
 * Gather the latest patrol reports from all team-eligible research agents.
 * Returns a map of agent name -> latest report content.
 * Never throws -- missing or failed reports are tracked, not fatal.
 */
export async function gatherResearchReports(
  registry: AgentRegistry,
  heraldConfig: HeraldConfig,
): Promise<{ available: Map<string, string>; missing: string[] }> {
  const available = new Map<string, string>();
  const missing: string[] = [];

  for (const [name, agent] of registry.getAll()) {
    if (!agent.config.team_eligible) continue;

    const reportsDir = join(heraldConfig.reports_dir, name);
    try {
      const files = await readdir(reportsDir);
      const mdFiles = files.filter((f) => f.endsWith('.md')).sort().reverse();

      if (mdFiles.length === 0) {
        missing.push(name);
        continue;
      }

      // Read the most recent report
      const latestFile = mdFiles[0];
      const content = await Bun.file(join(reportsDir, latestFile)).text();

      // Check if the report has status: failed in frontmatter
      if (content.includes('status: failed')) {
        missing.push(name);
        continue;
      }

      available.set(name, content);
    } catch {
      // Directory doesn't exist or read error -- agent has no reports
      missing.push(name);
    }
  }

  return { available, missing };
}

/**
 * Build the synthesis prompt for the newspaper agent.
 * Injects all gathered research reports into a structured prompt
 * that the newspaper agent's persona knows how to process.
 */
export function buildSynthesisPrompt(
  reports: Map<string, string>,
  missing: string[],
  editionDate: string,
  outputPath: string,
  mode: 'daily' | 'weekly' = 'daily',
): string {
  const now = new Date();
  const briefType = mode === 'weekly' ? 'Weekly Strategic Synthesis' : 'Daily Brief';
  let prompt = `Current date: ${editionDate}
Current time: ${now.toISOString().split('T')[1].slice(0, 5)} UTC

You are producing ${mode === 'weekly' ? "this week's Herald Weekly Strategic Synthesis. Focus on overarching trends, multi-day patterns, and strategic insights rather than individual daily findings. Emphasize cross-domain convergences and long-term trajectory shifts." : "today's Herald Daily Brief. Follow your Team Synthesis Workflow."}

## Available Research Reports

`;

  for (const [agentName, content] of reports) {
    prompt += `### Report from: ${agentName}\n\n${content}\n\n---\n\n`;
  }

  if (missing.length > 0) {
    prompt += `## Missing Coverage\n\nThe following researchers have no recent successful reports:\n`;
    for (const name of missing) {
      prompt += `- ${name}\n`;
    }
    prompt += `\nProceed with available research. Note the gaps in your Coverage Notes section.\n\n`;
  }

  prompt += `## Output Instructions

Write the complete newspaper following your Newspaper Format.

IMPORTANT: Your final text response MUST be the complete newspaper markdown. Do NOT summarize what you did. The text you return IS the deliverable.

After writing the newspaper, also write the newspaper markdown to: ${outputPath}
(This file is named editorial.md — it is your editorial synthesis, distinct from the individual researcher source files that are copied alongside it.)

During synthesis, also update your knowledge base with any editorial opinions or cross-domain predictions you form.
`;

  return prompt;
}

/**
 * Ensure the edition directory structure exists.
 * Creates: newspaper/editions/{date}/sources/
 */
export async function ensureEditionDir(
  heraldConfig: HeraldConfig,
  editionDate: string,
): Promise<string> {
  const { mkdir } = await import('node:fs/promises');
  const editionDir = join(heraldConfig.newspaper_dir, 'editions', editionDate);
  const sourcesDir = join(editionDir, 'sources');
  await mkdir(sourcesDir, { recursive: true });
  return editionDir;
}
```

**Tests:** `packages/daemon/src/newspaper/team-orchestrator.test.ts`

```typescript
// Test gatherResearchReports:
// - Returns available reports for team_eligible agents with successful reports
// - Returns missing for agents with no reports directory
// - Returns missing for agents with status: failed reports
// - Skips agents with team_eligible: false
// - Never throws on any error condition

// Test buildSynthesisPrompt:
// - Includes all available reports in prompt
// - Lists missing agents in prompt
// - Includes output path instructions
// - Includes date and time

// Test ensureEditionDir:
// - Creates edition directory structure
// - Creates sources subdirectory
// - Is idempotent (running twice doesn't error)
```

### Task 4: Create Newspaper Run Executor (AC: #1, #2, #3, #4)

**File:** `packages/daemon/src/newspaper/newspaper-executor.ts`

This module wires the team orchestrator into the existing run execution pipeline. It is the entry point for newspaper synthesis runs.

```typescript
import { join } from 'node:path';
import type { HeraldConfig } from '@herald/shared';
import type { AgentRegistry } from '../agent-loader/agent-registry.ts';
import type { PostRunContext } from '../session/run-executor.ts';
import { executeRun } from '../session/run-executor.ts';
import type { SessionManager } from '../session/session-manager.ts';
import {
  buildSynthesisPrompt,
  ensureEditionDir,
  gatherResearchReports,
} from './team-orchestrator.ts';

export interface NewspaperRunResult {
  runId: string;
  status: 'success' | 'failed';
  editionDate: string;
  sourcesUsed: string[];
  sourcesMissing: string[];
  editionDir: string;
}

/**
 * Execute a newspaper synthesis run:
 * 1. Gather latest reports from team-eligible research agents
 * 2. Ensure edition directory exists
 * 3. Copy each researcher's report to sources/{agent-name}.md
 * 4. Build synthesis prompt with gathered research
 * 5. Run newspaper agent via standard executeRun() pipeline
 * 6. Write synthesis output to sources/editorial.md
 *
 * Uses the existing executeRun() pipeline so that reports, transcripts,
 * and post-run hooks all work identically to research agent runs.
 */
export async function executeNewspaperRun(
  registry: AgentRegistry,
  sessionManager: SessionManager,
  heraldConfig: HeraldConfig,
  postRunContext?: PostRunContext,
  mode: 'daily' | 'weekly' = 'daily',
): Promise<NewspaperRunResult> {
  const newspaperAgent = registry.get('newspaper');
  if (!newspaperAgent) {
    throw new Error('Newspaper agent not registered');
  }

  const editionDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Step 1: Gather research reports
  const { available, missing } = await gatherResearchReports(registry, heraldConfig);

  console.log(
    `[herald:newspaper] Gathered ${available.size} reports, ${missing.length} missing: ${missing.join(', ') || 'none'}`,
  );

  // Step 2: Ensure edition directory
  const editionDir = mode === 'weekly'
    ? join(heraldConfig.newspaper_dir, 'weekly')
    : await ensureEditionDir(heraldConfig, editionDate);

  if (mode === 'weekly') {
    const { mkdir } = await import('node:fs/promises');
    await mkdir(editionDir, { recursive: true });
  }

  // Step 3: Copy each researcher's report to sources/{agent-name}.md
  // This makes the edition self-contained (not dependent on reports/ directory)
  if (mode === 'daily') {
    const sourcesDir = join(editionDir, 'sources');
    for (const [agentName, content] of available) {
      const agentSourcePath = join(sourcesDir, `${agentName}.md`);
      await Bun.write(agentSourcePath, content);
      console.log(`[herald:newspaper] Copied ${agentName} report to ${agentSourcePath}`);
    }
  }

  // Step 4: Build synthesis prompt
  const outputPath = mode === 'weekly'
    ? join(editionDir, `${editionDate}-weekly.md`)
    : join(editionDir, 'sources', 'editorial.md');

  const prompt = buildSynthesisPrompt(available, missing, editionDate, outputPath, mode);

  // Step 5: Execute via standard pipeline
  const runResult = await executeRun(
    'newspaper',
    newspaperAgent.config,
    heraldConfig,
    sessionManager,
    registry,
    prompt,
    postRunContext,
  );

  // Step 6: Write synthesis to edition sources/editorial.md (even if agent already wrote it)
  // This ensures we always have the output persisted (NFR3: zero data loss)
  if (runResult.status === 'success') {
    await Bun.write(outputPath, runResult.result);
    console.log(`[herald:newspaper] Edition written to ${outputPath}`);
  }

  return {
    runId: runResult.runId,
    status: runResult.status,
    editionDate,
    sourcesUsed: [...available.keys()],
    sourcesMissing: missing,
    editionDir,
  };
}
```

**Tests:** `packages/daemon/src/newspaper/newspaper-executor.test.ts`

```typescript
// Test executeNewspaperRun:
// - Gathers reports from team-eligible agents
// - Creates edition directory structure
// - Copies each researcher's report to sources/{agent-name}.md (self-contained edition)
// - Builds prompt with gathered reports
// - Calls executeRun() with newspaper agent config and synthesis prompt
// - Writes synthesis output to sources/editorial.md (NOT synthesis.md)
// - Returns correct sourcesUsed and sourcesMissing
// - Handles case where newspaper agent is not registered
// - Handles case where no research reports are available (still produces newspaper)
// - Never crashes daemon on any error (NFR5)
//
// Test executeNewspaperRun with mode='weekly':
// - Writes output to newspaper/weekly/{date}-weekly.md
// - Prompt instructs weekly strategic synthesis (not daily brief)
// - Does not copy individual source files for weekly mode
```

### Task 4b: Create Newspaper Module Index (AC: #1)

**File:** `packages/daemon/src/newspaper/index.ts` (new)

Create a barrel export file that re-exports the public API of the newspaper module:

```typescript
export { gatherResearchReports, buildSynthesisPrompt, ensureEditionDir } from './team-orchestrator.ts';
export type { TeamSynthesisResult } from './team-orchestrator.ts';
export { executeNewspaperRun } from './newspaper-executor.ts';
export type { NewspaperRunResult } from './newspaper-executor.ts';
```

### Task 5: Integrate Newspaper into Scheduler (AC: #1, #4)

**File:** `packages/daemon/src/scheduler/index.ts` (modify)

The newspaper agent has its own cron schedule (`"0 6 * * *"`). When its schedule fires, it should use `executeNewspaperRun()` instead of the standard `executeRun()`. The scheduler needs to detect the newspaper agent and route it through the team orchestration path.

**Option A (recommended): Schedule-level detection**

The newspaper agent is registered like any other agent. Its schedule (`"0 6 * * *"`) creates a cron job. When the cron fires, the scheduler detects the agent name is `newspaper` and routes to `executeNewspaperRun()` instead of the standard patrol cycle.

Modify `initScheduler()` to handle newspaper specially:

```typescript
// In initScheduler(), after grouping agents by schedule:
// Check if the newspaper agent is in any group and handle it separately

for (const [schedule, agents] of scheduleGroups) {
  const newspaperAgents = agents.filter((a) => a.name === 'newspaper');
  const patrolAgents = agents.filter((a) => a.name !== 'newspaper');

  // Register newspaper agent on its own cron
  for (const na of newspaperAgents) {
    scheduleRegistry.register(`newspaper:${schedule}`, schedule, () => {
      console.log(`[herald] Newspaper synthesis firing`);
      import('../newspaper/newspaper-executor.ts')
        .then(({ executeNewspaperRun }) =>
          executeNewspaperRun(agentRegistry, sessionManager, heraldConfig, postRunContext),
        )
        .catch((err) => {
          console.error('[herald] Newspaper synthesis error:', err);
        });
    });
  }

  // Register patrol agents as before
  if (patrolAgents.length > 0) {
    const groupName = patrolAgents.map((a) => a.name).join(', ');
    scheduleRegistry.register(`patrol-cycle:${schedule}`, schedule, () => {
      console.log(`[herald] Patrol cycle firing for: ${groupName}`);
      cycleManager
        .executeCycle(patrolAgents, heraldConfig, sessionManager, agentRegistry, postRunContext)
        .catch((err) => {
          console.error('[herald] Patrol cycle error:', err);
        });
    });
  }
}
```

### Task 6: Add Newspaper API Endpoint (AC: #2)

**File:** `packages/daemon/src/api/newspaper.ts` (new)

> **Note:** This file is created by Story 4.1 and extended by Stories 4.2 (compilation routes), 4.3 (edition browsing routes), and 4.4 (breaking update routes). The `NewspaperRouteDeps` interface defined here is the single source of truth -- later stories add fields to it.

**Routes created by Story 4.1:**
- `POST /api/newspaper/run` -- trigger synthesis
- `GET /api/newspaper/current` -- get latest edition markdown

**Routes added by later stories:**
- Story 4.2 adds: compilation/PDF routes
- Story 4.3 adds: edition browsing and git versioning routes
- Story 4.4 adds: breaking update and featured story routes

Add a basic API endpoint for triggering newspaper runs and viewing the latest edition:

```typescript
import { Hono } from 'hono';
import type { HeraldConfig } from '@herald/shared';
import type { AgentRegistry } from '../agent-loader/agent-registry.ts';
import type { PostRunContext } from '../session/run-executor.ts';
import type { SessionManager } from '../session/session-manager.ts';

export interface NewspaperRouteDeps {
  registry: AgentRegistry;
  sessionManager: SessionManager;
  heraldConfig: HeraldConfig;
  sdkConfigured: boolean;
  postRunContext?: PostRunContext;
}

export function createNewspaperRoutes(deps: NewspaperRouteDeps) {
  const routes = new Hono();

  // Trigger a newspaper synthesis run
  routes.post('/api/newspaper/run', async (c) => {
    if (!deps.sdkConfigured) {
      return c.json({ error: 'SDK not configured' }, 503);
    }

    if (!deps.registry.has('newspaper')) {
      return c.json({ error: 'Newspaper agent not registered' }, 404);
    }

    const { executeNewspaperRun } = await import('../newspaper/newspaper-executor.ts');
    const result = await executeNewspaperRun(
      deps.registry,
      deps.sessionManager,
      deps.heraldConfig,
      deps.postRunContext,
    );

    return c.json({
      runId: result.runId,
      status: result.status,
      editionDate: result.editionDate,
      sourcesUsed: result.sourcesUsed,
      sourcesMissing: result.sourcesMissing,
    });
  });

  // Get the latest newspaper edition
  routes.get('/api/newspaper/current', async (c) => {
    const { readdir } = await import('node:fs/promises');
    const { join } = await import('node:path');

    const editionsDir = join(deps.heraldConfig.newspaper_dir, 'editions');
    try {
      const editions = await readdir(editionsDir);
      const sorted = editions.sort().reverse();

      if (sorted.length === 0) {
        return c.json({ error: 'No editions available' }, 404);
      }

      const latestDate = sorted[0];
      const editorialPath = join(editionsDir, latestDate, 'sources', 'editorial.md');
      const file = Bun.file(editorialPath);

      if (!(await file.exists())) {
        return c.json({ error: 'No editorial available for latest edition' }, 404);
      }

      const content = await file.text();
      return c.json({
        editionDate: latestDate,
        content,
      });
    } catch {
      return c.json({ error: 'No editions available' }, 404);
    }
  });

  // List all editions
  routes.get('/api/newspaper/editions', async (c) => {
    const { readdir } = await import('node:fs/promises');
    const { join } = await import('node:path');

    const editionsDir = join(deps.heraldConfig.newspaper_dir, 'editions');
    try {
      const editions = await readdir(editionsDir);
      const sorted = editions.sort().reverse();
      return c.json({ editions: sorted });
    } catch {
      return c.json({ editions: [] });
    }
  });

  return routes;
}
```

**Tests:** `packages/daemon/src/api/newspaper.test.ts`

Wire into `packages/daemon/src/api/index.ts`:
```typescript
// Add to AppDeps usage in createApp():
if (registry && sessionManager && heraldConfig) {
  app.route('/', createNewspaperRoutes({
    registry,
    sessionManager,
    heraldConfig,
    sdkConfigured,
    postRunContext,
  }));
}
```

### Task 7: Wire Newspaper Routes into API (AC: #2)

**File:** `packages/daemon/src/api/index.ts` (modify)

Add `createNewspaperRoutes` import and wire into `createApp()`. Note that the import references the API route file, not the newspaper module directory:

```typescript
import { createNewspaperRoutes } from './newspaper.ts';

// Inside createApp(), after existing route wiring:
if (registry && sessionManager && heraldConfig) {
  app.route(
    '/',
    createNewspaperRoutes({
      registry,
      sessionManager,
      heraldConfig,
      sdkConfigured,
      postRunContext,
    }),
  );
}
```

### Task 8: Validate (AC: #1, #2, #3, #4)

- [ ] 8.1 `bun test` -- all tests pass (existing + new)
- [ ] 8.2 `bun lint` -- clean (biome check)
- [ ] 8.3 Manual validation: place `agents/newspaper.yaml` and `personas/newspaper.md`, verify daemon discovers and registers the newspaper agent
- [ ] 8.4 Manual validation: `POST /api/newspaper/run` triggers synthesis, report written to `reports/newspaper/`, researcher reports copied to `newspaper/editions/{date}/sources/{agent-name}.md`, and editorial written to `newspaper/editions/{date}/sources/editorial.md`
- [ ] 8.5 Manual validation: `GET /api/newspaper/current` returns the latest edition
- [ ] 8.6 Verify transcript is persisted to `memory/conversations/`

## Tasks Summary

- [ ] Task 1: Create `agents/newspaper.yaml` (AC: #1)
- [ ] Task 2: Create `personas/newspaper.md` (AC: #1, #2, #3)
- [ ] Task 3: Create `packages/daemon/src/newspaper/team-orchestrator.ts` + tests (AC: #1, #2, #3)
- [ ] Task 4: Create `packages/daemon/src/newspaper/newspaper-executor.ts` + tests (AC: #1, #2, #3, #4)
- [ ] Task 4b: Create `packages/daemon/src/newspaper/index.ts` -- barrel export (AC: #1)
- [ ] Task 5: Modify `packages/daemon/src/scheduler/index.ts` -- route newspaper to team orchestration (AC: #1, #4)
- [ ] Task 6: Create `packages/daemon/src/api/newspaper.ts` + tests (AC: #2)
- [ ] Task 7: Modify `packages/daemon/src/api/index.ts` -- wire newspaper routes (AC: #2)
- [ ] Task 8: Validate all tests pass, lint clean, manual validation (AC: #1-4)

## Dev Notes

### Architecture Compliance

**Two-Body Model:** All intelligence lives in the newspaper persona MD. The daemon code is dumb plumbing -- it gathers reports from the filesystem, builds a prompt, and passes it to the SDK. The newspaper agent's persona defines the synthesis workflow, editorial voice, and output format. The daemon never interprets or processes agent output.

**Team Session Strategy (v1):** This story implements team synthesis via report gathering, NOT live multi-agent SDK sessions. The architecture doc specifies `session/team-orchestration.ts` for FR10/FR18, but the pragmatic v1 approach is:
1. Research agents patrol independently on their schedules (Epic 2 -- done)
2. The newspaper agent's persona instructs it to read research reports from the filesystem
3. The daemon gathers the latest reports and injects them into the newspaper agent's prompt
4. The newspaper agent synthesizes in a single session

This approach works because:
- Research agents already write reports to `reports/{agent-name}/` (implemented in Epic 1)
- The SDK adapter already supports file read/write tools (`Read`, `Write`, `Glob`, `Grep` in `DEFAULT_RESEARCH_TOOLS`)
- No new SDK features needed -- just prompt engineering
- Failure isolation is natural -- a failed researcher just means missing content, not a broken team session

**Future Enhancement:** True multi-agent SDK team sessions (where the newspaper agent conversationally queries live researcher sessions) can be added later when the SDK supports it or when the operator validates that report-based synthesis is insufficient.

**NFR Compliance:**
- NFR3 (Zero data loss): Synthesis output written to both `reports/newspaper/` (via `executeRun()`) and `newspaper/editions/{date}/sources/editorial.md` (via `executeNewspaperRun()`). Individual researcher reports copied to `sources/{agent-name}.md` for self-contained editions
- NFR4 (Ready by 6:30 AM): Schedule fires at 6:00 AM, agent has 30 minutes to complete synthesis. Session limit of 5 interactions keeps the session bounded
- NFR5 (Failure isolation): All errors caught in executor, never bubble to daemon. Missing research reports noted but don't block publication
- NFR24 (Daemon <2000 LOC): Team orchestrator is ~80 lines, newspaper executor is ~60 lines. Minimal daemon code; all intelligence in persona
- NFR25 (Zero-code agent addition): Newspaper agent follows the same YAML + persona pattern as research agents. No special daemon code needed beyond team orchestration plumbing
- NFR27 (Self-contained personas): The newspaper persona is fully self-contained -- reading it tells you everything about how the newspaper works

### Edition Directory Structure

What Story 4.1 creates vs what later stories add:

```
newspaper/editions/{date}/
├── sources/
│   ├── ml-researcher.md          # Copy of latest ML report (Story 4.1)
│   ├── compute-researcher.md     # Copy of latest compute report (Story 4.1)
│   ├── ai-tooling-researcher.md  # Copy of latest AI tooling report (Story 4.1)
│   └── editorial.md              # Newspaper agent's synthesis (Story 4.1)
├── newspaper.pdf                 # Compiled PDF (Story 4.2, added later)
├── newspaper.html                # Compiled HTML (Story 4.2, added later)
├── updates/                      # Breaking updates (Story 4.4, added later)
└── featured-links.md             # Featured story links (Story 4.4, added later)
```

Weekly synthesis output goes to a separate directory:

```
newspaper/weekly/
└── {date}-weekly.md              # Weekly strategic synthesis (Story 4.1)
```

### SDK Adapter Configuration

The newspaper agent uses the same `AgentSdkAdapter` as research agents. Key tools needed:
- `Read` -- to read research reports from filesystem (persona instructs reading from `reports/` directories)
- `Write` -- to write the newspaper to the edition directory
- `Glob` -- to find the latest report files
- `Grep` -- to search within reports
- `WebSearch`, `WebFetch` -- not typically needed for synthesis, but available

These are all in `DEFAULT_RESEARCH_TOOLS` in `sdk-adapter.ts`:
```typescript
const DEFAULT_RESEARCH_TOOLS = ['WebSearch', 'WebFetch', 'Read', 'Write', 'Glob', 'Grep'];
```

### Existing Code Patterns to Follow

**Session Manager usage:**
```typescript
// From run-executor.ts:
const result = await sessionManager.runAgent(agentName, config, heraldConfig, prompt);
```

**Run execution pattern:**
```typescript
// From run-executor.ts:
export async function executeRun(
  agentName: string,
  config: AgentConfig,
  heraldConfig: HeraldConfig,
  sessionManager: SessionManager,
  registry?: AgentRegistry,
  prompt?: string,
  postRunContext?: PostRunContext,
): Promise<RunResult>
```

**Report writing pattern:**
```typescript
// Reports go to: {heraldConfig.reports_dir}/{agentName}/{runId}.md
// With YAML frontmatter: agent, run_id, started_at, finished_at, status, discovery_mode
```

**Transcript writing pattern:**
```typescript
// Transcripts go to: {heraldConfig.memory_dir}/conversations/{date}-{agentName}.md
// Handled automatically by executeRun() -> writeTranscript()
```

**Test patterns (from existing tests):**
```typescript
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
```

### Project Structure Notes

**Files Created:**
```
agents/newspaper.yaml                                          # Agent YAML config
personas/newspaper.md                                          # BMAD persona
packages/daemon/src/newspaper/team-orchestrator.ts             # Report gathering + prompt building
packages/daemon/src/newspaper/team-orchestrator.test.ts        # Tests
packages/daemon/src/newspaper/newspaper-executor.ts            # Newspaper run orchestration
packages/daemon/src/newspaper/newspaper-executor.test.ts       # Tests
packages/daemon/src/newspaper/index.ts                         # Barrel export for newspaper module
packages/daemon/src/api/newspaper.ts                           # REST API endpoints
packages/daemon/src/api/newspaper.test.ts                      # Tests
```

**Files Modified:**
```
packages/daemon/src/scheduler/index.ts                         # Route newspaper to team orchestration
packages/daemon/src/api/index.ts                               # Wire newspaper routes
```

**Directories Created at Runtime:**
```
newspaper/editions/{date}/sources/                             # Edition output directory (daily)
newspaper/weekly/                                              # Weekly synthesis output directory
memory/agents/newspaper/                                       # Scaffolded by agent-discovery
reports/newspaper/                                             # Scaffolded by agent-discovery
```

### Dependencies

No new dependencies required. Everything uses existing packages:
- `@anthropic-ai/claude-agent-sdk` -- already installed
- `hono` -- already installed
- `node-cron` -- already installed (via scheduler)
- `@herald/shared` -- workspace dependency

### Testing Strategy

**Unit tests:**
- `team-orchestrator.test.ts`:
  - `gatherResearchReports()` -- mock filesystem with temp dirs, test all edge cases (missing dirs, failed reports, non-eligible agents)
  - `buildSynthesisPrompt()` -- verify prompt structure, date injection, missing agent notes, mode='daily' vs mode='weekly' prompt differences
  - `ensureEditionDir()` -- verify directory creation, idempotency
- `newspaper-executor.test.ts`:
  - Mock `SessionManager`, `AgentRegistry`, filesystem
  - Verify full pipeline: gather -> copy sources -> build prompt -> execute -> write editorial.md
  - Verify per-agent source files are copied to `sources/{agent-name}.md`
  - Verify weekly mode writes to `newspaper/weekly/{date}-weekly.md`
  - Verify error handling: missing newspaper agent, SDK errors, filesystem errors
- `newspaper.test.ts` (API):
  - Use `app.request()` pattern from existing API tests
  - Test `POST /api/newspaper/run`, `GET /api/newspaper/current`, `GET /api/newspaper/editions`

**Integration testing:**
- Start daemon with `newspaper.yaml` deployed
- Trigger `POST /api/newspaper/run`
- Verify: report in `reports/newspaper/`, researcher copies in `newspaper/editions/{date}/sources/{agent-name}.md`, editorial in `newspaper/editions/{date}/sources/editorial.md`, transcript in `memory/conversations/`

**DO NOT test:**
- Actual Claude SDK calls (mock the adapter)
- Actual cron timing (verify registration only)
- Newspaper content quality (that's the persona's job, not daemon code)

### References

- [Source: architecture.md -- Project Structure] `daemon/src/session/team-orchestration.ts` for FR10, FR18
- [Source: architecture.md -- FR Category Mapping] Newspaper & Publishing: `daemon/src/newspaper/`, `newspaper/`, `daemon/src/session/team-orchestration.ts`
- [Source: architecture.md -- Directory Structure] `newspaper/editions/{date}/sources/` for agent-authored markdown sections
- [Source: architecture.md -- Naming] Newspaper editions: date-based `2026-02-28`
- [Source: architecture.md -- Conventions] `newspaper.yaml` in agents directory, `newspaper.md` in personas directory
- [Source: prd.md -- FR10] Agents can initiate team sessions, summoning other agents for collaborative work
- [Source: prd.md -- FR18] The newspaper agent can summon research agents as a team for collaborative synthesis
- [Source: prd.md -- FR19] The newspaper agent can produce a designed publication from synthesized research
- [Source: prd.md -- NFR3] Zero data loss -- newspapers always persisted before acknowledgment
- [Source: prd.md -- NFR4] Newspaper ready before 6:30 AM daily
- [Source: prd.md -- NFR5] Failed sessions don't affect other agents or daemon
- [Source: epics.md -- Story 4.1] Full acceptance criteria and story context
- [Source: epics.md -- Epic 4] The Morning Newspaper epic overview and story list
- [Source: existing code -- session-manager.ts] SessionManager.runAgent() interface
- [Source: existing code -- run-executor.ts] executeRun() pipeline with report + transcript + post-run hooks
- [Source: existing code -- persona-loader.ts] loadPersonaContext() for system prompt assembly
- [Source: existing code -- sdk-adapter.ts] AgentSdkAdapter with DEFAULT_RESEARCH_TOOLS
- [Source: existing code -- patrol-cycle.ts] PatrolCycleManager.executeCycle() for concurrent execution pattern
- [Source: existing code -- scheduler/index.ts] initScheduler() for schedule grouping pattern
- [Source: existing code -- agents/*.yaml] Research agent YAML format reference
- [Source: existing code -- personas/*.md] Research agent BMAD persona format reference

## Dev Agent Record

### Agent Model Used
### Debug Log References
### Completion Notes List
### Change Log

- 2026-02-28: Story 4.1 created -- newspaper agent persona, team synthesis, and edition output pipeline
- 2026-02-28: Applied unified Epic 4 contract fixes -- per-agent source files (editorial.md + {agent-name}.md), module location moved to newspaper/, API route consolidation notes, weekly synthesis support, breaking event detection persona section, edition directory structure documentation
