# Story 2.4: Full Research Agent Roster

Status: ready-for-dev

## Story

As an operator,
I want all Stage 1 research agents deployed with domain-specific personas,
So that I have comprehensive research coverage across ML, compute, and AI tooling.

## Acceptance Criteria

1. **Given** the ML Researcher is already operational from Story 2.1 **When** Compute Researcher and AI Tooling Researcher agents are deployed **Then** each has a complete BMAD persona MD with domain-specific expertise, research methodology, and patrol workflow **And** each has an agent YAML with appropriate schedule, output_dir, memory paths, and trigger rules
2. **Given** all 3 research agents are registered **When** the shared patrol schedule fires **Then** all 3 agents patrol in parallel, each producing independent reports in their respective output directories **And** `GET /api/agents` shows all 3 agents with current status and last run information **And** each agent maintains its own knowledge.md with domain-specific opinions and predictions

## What Already Exists

All persona design and config work is complete from the design session:
- `personas/ml-researcher.md` — The Scholar (236 lines)
- `personas/compute-researcher.md` — The Market Analyst (249 lines)
- `personas/ai-tooling-researcher.md` — The Practitioner (296 lines)
- `agents/ml-researcher.yaml` — config with schedule, memory_paths, discovery_mode
- `agents/compute-researcher.yaml` — config with schedule, memory_paths, discovery_mode
- `agents/ai-tooling-researcher.yaml` — config with schedule, memory_paths, discovery_mode
- `config/discovery-modes.md` — shared serendipity behavioral specs

All three share the schedule: `30 5,11,17,23 * * *` (every 6 hours at :30)

## What Needs to Change

This is primarily a validation and integration story. The code changes from Stories 2.1-2.3 should already support all three agents. This story validates that everything works together.

### Task 1: Verify all 3 agents auto-discover and register

- Start the daemon with all 3 agent YAMLs in `agents/`
- Confirm `GET /api/agents` returns all 3 with correct metadata
- Confirm each agent's memory directories are scaffolded:
  - `memory/agents/ml-researcher/knowledge.md`
  - `memory/agents/compute-researcher/knowledge.md`
  - `memory/agents/ai-tooling-researcher/knowledge.md`
  - (plus preferences.md, last-jobs.md, rag/ for each)

### Task 2: Verify parallel patrol execution

- Trigger a patrol cycle (either via cron or manual API call)
- Confirm all 3 agents run concurrently (PatrolCycleManager from Story 2.3)
- Confirm each produces a report in its respective output directory:
  - `reports/ml-researcher/{timestamp}.md`
  - `reports/compute-researcher/{timestamp}.md`
  - `reports/ai-tooling-researcher/{timestamp}.md`
- Confirm reports follow the format defined in each persona

### Task 3: Verify knowledge.md persistence per agent

- After patrol runs, verify each agent's knowledge.md has been updated
- Confirm opinions and predictions are present (per Story 2.2)
- Confirm each agent's knowledge is domain-specific (not cross-contaminated)

### Task 4: Verify API responses

- `GET /api/agents` — all 3 agents listed with status
- `GET /api/agents/ml-researcher` — shows lastRun info
- `GET /api/agents/compute-researcher` — shows lastRun info
- `GET /api/agents/ai-tooling-researcher` — shows lastRun info
- `GET /api/agents/:name/runs` — returns run history per agent

### Task 5: Write integration test

**File:** `packages/daemon/src/__tests__/patrol-integration.test.ts`

Integration test that:
1. Sets up agent registry with all 3 research agents
2. Runs a patrol cycle (with mock/null SDK adapter)
3. Verifies all 3 produce output
4. Verifies failure isolation (mock one to fail, others succeed)
5. Verifies API endpoints reflect correct state

### Task 6: Validate

- `bun test` — all tests pass (including new integration test)
- `bun lint` — clean
- Verify `GET /api/agents` shows all 3 research agents
- Verify `GET /api/schedule` shows the shared cron schedule

## Dev Notes

### This Story is Mostly Done

Because we designed all personas and configs upfront, most of Story 2.4 is already complete:
- All 3 persona MDs: written
- All 3 agent YAMLs: written
- Parallel execution: handled by Story 2.3
- Knowledge persistence: handled by Story 2.2
- Agent discovery: handled by Story 1.3

The remaining work is validation, integration testing, and fixing any issues discovered during end-to-end testing.

### End-to-End Validation Checklist

- [ ] Daemon starts cleanly with all 3 agents
- [ ] Hot-reload works (modify one agent YAML, daemon picks it up)
- [ ] All 3 register and show in API
- [ ] Manual trigger works for each: `POST /api/agents/{name}/run`
- [ ] Patrol cycle fires all 3 concurrently
- [ ] Each produces a report with correct frontmatter
- [ ] Each updates its knowledge.md
- [ ] Failure of one doesn't affect others
- [ ] Reports contain domain-specific content (not generic)
- [ ] Discovery mode is reflected in agent behavior

### Key Files
```
packages/daemon/src/__tests__/patrol-integration.test.ts  — new integration test
```

### Dependencies
- Depends on Stories 2.1, 2.2, and 2.3 being complete
- This is the final validation story for Epic 2
