# Story 2.1: Research Agent Persona & Patrol Workflow

Status: ready-for-dev

## Story

As an operator,
I want a fully functional research agent with a BMAD persona that patrols its domain and produces structured reports,
So that I receive automated intelligence on topics I care about.

## Acceptance Criteria

1. **Given** the ML Researcher agent YAML and persona MD are in the agents/ and personas/ directories **When** the daemon discovers and registers the agent **Then** the persona MD is loaded as the system prompt with domain expertise, research methodology, knowledge structure, and patrol workflow instructions
2. **Given** the ML Researcher's cron schedule fires **When** the patrol executes **Then** the agent follows its patrol workflow: scan sources, evaluate findings, synthesize report **And** a structured markdown report is written to `reports/ml-researcher/{timestamp}.md` with YAML frontmatter (FR13) **And** the report contains: key findings, analysis, source references, and relevance assessment
3. **Given** the agent's patrol completes **When** the report is written **Then** the agent's status shows last_run timestamp and success status **And** the patrol counts toward the 100% completion rate target (NFR2)
4. **Given** the agent YAML contains a `discovery_mode` field **When** the persona is loaded **Then** the discovery mode value is injected into the system prompt so the agent knows its active serendipity level
5. **Given** the patrol prompt is sent to the agent **When** the agent session begins **Then** the prompt instructs the agent to execute its patrol workflow as defined in its persona and produce a patrol report

## What Already Exists

- `personas/ml-researcher.md` — complete persona with patrol workflow, source strategy, taste profile, report format, serendipity protocol
- `agents/ml-researcher.yaml` — complete config with schedule, memory_paths, discovery_mode
- `config/discovery-modes.md` — shared behavioral specifications for aggressive/moderate/conservative modes
- `packages/shared/src/schemas/agent-config.ts` — AgentConfigSchema with `discovery_mode` field
- `packages/daemon/src/session/persona-loader.ts` — loads persona MD + knowledge.md + last-jobs.md
- `packages/daemon/src/session/run-executor.ts` — orchestrates runs, writes reports, updates registry
- `packages/daemon/src/session/session-manager.ts` — manages Claude SDK sessions
- `packages/daemon/src/scheduler/` — cron scheduling with hot-reload

## What Needs to Change

### Task 1: Enhance persona-loader to inject discovery_mode and config context (AC: #1, #4)

**File:** `packages/daemon/src/session/persona-loader.ts`

- Read `config/discovery-modes.md` and inject the relevant mode section into the system prompt
- Inject the agent's `discovery_mode` value from YAML config into the system prompt
- Add the agent's config metadata (name, schedule, output_dir) as context
- Load `config/discovery-modes.md` content (the shared behavioral spec)
- Append to system prompt:

```
## Active Configuration
- Agent: {name}
- Discovery Mode: {discovery_mode}
- Schedule: {schedule}
- Output Directory: {output_dir}

## Discovery Mode Behavioral Rules
{content from discovery-modes.md for the active mode}
```

**Tests:** Update `packages/daemon/src/session/persona-loader.test.ts`
- Test that discovery_mode is injected into system prompt
- Test that config metadata appears in system prompt
- Test fallback when config/discovery-modes.md doesn't exist

### Task 2: Enhance patrol prompt to trigger structured patrol (AC: #2, #5)

**File:** `packages/daemon/src/session/session-manager.ts`

The current default prompt is: `Begin your patrol duties as ${agentName}.`

Replace with a structured patrol prompt that:
1. Tells the agent the current date/time
2. References its patrol workflow from the persona
3. Asks for output in the report format defined in its persona
4. Includes any previous session context for continuity

New prompt template:
```
Current date: {ISO date}
Current time: {HH:MM UTC}

Execute your patrol workflow as defined in your persona. Follow your Source Strategy in order, apply your Taste Profile to evaluate findings, and produce your patrol report following your Report Format.

This is a bounded patrol session. Complete your full patrol cycle and produce one comprehensive report.
```

**Tests:** Verify the prompt includes date/time and patrol instructions

### Task 3: Enhance report writing with extended frontmatter (AC: #2, #3)

**File:** `packages/daemon/src/session/run-executor.ts`

The current `writeReport` writes basic frontmatter. Extend it to include:
- `patrol_sources_hit` — extracted from agent output if present, or omitted
- `discovery_mode` — from agent config
- Don't wrap the content in a duplicate `# Patrol Report` header — the agent's output already includes its own headers per the report format

Update `writeReport`:
```typescript
const frontmatter = [
  '---',
  `agent: ${agentName}`,
  `run_id: "${runId}"`,
  `started_at: "${startedAt}"`,
  `finished_at: "${finishedAt}"`,
  `status: ${status}`,
  `discovery_mode: ${config.discovery_mode ?? 'moderate'}`,
  '---',
].join('\n');

// Don't add duplicate header — agent output includes its own structure
const report = `${frontmatter}\n\n${content}\n`;
```

**Tests:** Update run-executor tests to verify new frontmatter fields

### Task 4: Ensure agent scaffolding creates required directories (AC: #1)

**File:** `packages/daemon/src/agent-loader/scaffolder.ts`

Verify that when a new research agent is discovered, the scaffolder creates:
- `memory/agents/{name}/knowledge.md` — with initial template
- `memory/agents/{name}/preferences.md`
- `memory/agents/{name}/last-jobs.md`
- `memory/agents/{name}/rag/` directory
- `reports/{name}/` directory

The scaffolder already exists from Story 1.3, but verify it handles the new agents correctly and creates knowledge.md with the initial BMAD template structure.

### Task 5: Validate end-to-end (AC: #1, #2, #3)

- `bun test` — all tests pass
- `bun lint` — clean
- Manual validation: start daemon with ml-researcher.yaml present, trigger `POST /api/agents/ml-researcher/run`, verify report is written to `reports/ml-researcher/` with correct structure

## Dev Notes

### Architecture Compliance
- All intelligence stays in the persona MD — daemon code is dumb plumbing
- The daemon never interprets agent output structure — it just writes what the agent produces
- Discovery mode injection is a simple string append, not a complex system
- Agent config schema already has `discovery_mode` field (added during persona design session)

### Key Files Modified
```
packages/daemon/src/session/persona-loader.ts    — inject discovery_mode + config context
packages/daemon/src/session/session-manager.ts   — improved patrol prompt
packages/daemon/src/session/run-executor.ts      — extended frontmatter
packages/daemon/src/agent-loader/scaffolder.ts   — verify knowledge.md template
```

### Key Files Created (already exist from design session)
```
personas/ml-researcher.md          — already created
agents/ml-researcher.yaml          — already created
config/discovery-modes.md          — already created
```
