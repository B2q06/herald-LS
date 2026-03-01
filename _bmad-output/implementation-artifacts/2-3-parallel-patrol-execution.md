# Story 2.3: Parallel Patrol Execution & Subagent Spawning

Status: ready-for-dev

## Story

As an operator,
I want multiple research agents to patrol simultaneously and spawn parallel subtasks within their sessions,
So that the full research cycle completes efficiently.

## Acceptance Criteria

1. **Given** multiple research agents have the same cron schedule (e.g., `30 5,11,17,23 * * *`) **When** the schedule fires **Then** all scheduled agents launch their patrols concurrently, not sequentially (FR17) **And** the daemon manages multiple active Claude SDK sessions simultaneously **And** agent failure isolation is maintained — one agent's failure does not affect others (NFR5)
2. **Given** a research agent needs to look up multiple sources during a patrol **When** the agent spawns subagents **Then** parallel subtasks execute concurrently within the agent's session (FR9) **And** subagent results are collected and synthesized by the parent agent **And** the total patrol cycle for all agents completes within 20 minutes (NFR12)

## What Already Exists

### Current Scheduler Behavior (the problem)
```typescript
// scheduler/index.ts — current implementation
for (const [name, agent] of agentRegistry.getAll()) {
  if (agent.config.schedule) {
    scheduleRegistry.register(name, agent.config.schedule, () => {
      executeRun(name, agent.config, heraldConfig, sessionManager).catch(...);
    });
  }
}
```

Each agent gets its own cron job. If two agents share the same cron expression (e.g., `30 5,11,17,23 * * *`), node-cron fires them independently. **They technically already run concurrently** because `executeRun` is async and returns a Promise that's `.catch()`-ed but not awaited. Each cron callback fires independently.

However, there are problems:
1. No explicit concurrency management — no way to track "how many agents are running right now"
2. No failure isolation guarantee — if the SDK adapter has shared state, concurrent calls could interfere
3. No way to report "patrol cycle complete" when all agents finish
4. No cycle-level metrics (total duration, which agents succeeded/failed)

### Subagent Spawning
Claude Code sessions can natively spawn subagents (via the Agent tool in Claude Code). The persona MDs already instruct agents to use their patrol time budget for parallel lookups. This is handled by the Claude Code runtime, not by Herald daemon code.

**Key insight:** Subagent spawning (FR9) is a Claude Code capability, not a Herald daemon feature. The persona instructions tell the agent to use it. No daemon code needed.

## What Needs to Change

### Task 1: Add patrol cycle manager for concurrent execution (AC: #1)

**File:** `packages/daemon/src/scheduler/patrol-cycle.ts` (new file)

Create a `PatrolCycleManager` that:
1. Groups agents by schedule expression
2. When a schedule fires, launches all agents in that group concurrently via `Promise.allSettled()`
3. Tracks cycle-level metrics: start time, end time, per-agent status
4. Logs cycle summary when all agents complete
5. Ensures failure isolation — `Promise.allSettled` (not `Promise.all`) so one failure doesn't abort others

```typescript
export interface PatrolCycleResult {
  cycleId: string;
  schedule: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  agents: Array<{
    name: string;
    status: 'success' | 'failed';
    runId: string;
    durationMs: number;
    error?: string;
  }>;
}

export class PatrolCycleManager {
  async executeCycle(
    agents: Array<{ name: string; config: AgentConfig }>,
    heraldConfig: HeraldConfig,
    sessionManager: SessionManager,
    registry: AgentRegistry,
  ): Promise<PatrolCycleResult> {
    const cycleId = generateRunId();
    const startedAt = new Date().toISOString();
    const startMs = Date.now();

    // Launch all agents concurrently
    const results = await Promise.allSettled(
      agents.map(({ name, config }) =>
        executeRun(name, config, heraldConfig, sessionManager, registry)
      ),
    );

    const finishedAt = new Date().toISOString();
    const durationMs = Date.now() - startMs;

    // Map results
    const agentResults = results.map((result, i) => {
      const agent = agents[i];
      if (result.status === 'fulfilled') {
        return {
          name: agent.name,
          status: result.value.status,
          runId: result.value.runId,
          durationMs: new Date(result.value.finishedAt).getTime() -
                      new Date(result.value.startedAt).getTime(),
        };
      }
      return {
        name: agent.name,
        status: 'failed' as const,
        runId: 'unknown',
        durationMs: 0,
        error: result.reason?.message ?? 'Unknown error',
      };
    });

    const cycleResult: PatrolCycleResult = {
      cycleId,
      schedule: agents[0]?.config.schedule ?? 'manual',
      startedAt,
      finishedAt,
      durationMs,
      agents: agentResults,
    };

    // Log cycle summary
    const successCount = agentResults.filter(a => a.status === 'success').length;
    console.log(
      `[herald] Patrol cycle complete: ${successCount}/${agents.length} succeeded in ${durationMs}ms`
    );

    return cycleResult;
  }
}
```

**Tests:** `packages/daemon/src/scheduler/patrol-cycle.test.ts`
- Test concurrent execution (mock executeRun with delays)
- Test failure isolation (one agent fails, others succeed)
- Test cycle metrics (duration, per-agent status)
- Test with all agents failing (graceful degradation)

### Task 2: Update scheduler to use PatrolCycleManager (AC: #1)

**File:** `packages/daemon/src/scheduler/index.ts`

Update `initScheduler` to:
1. Group agents by schedule expression
2. For each unique schedule, register ONE cron job that fires the PatrolCycleManager with all agents in that group
3. Solo agents (unique schedule) still work fine — cycle with 1 agent

```typescript
export function initScheduler(
  agentRegistry: AgentRegistry,
  sessionManager: SessionManager,
  heraldConfig: HeraldConfig,
): ScheduleRegistry {
  const scheduleRegistry = new ScheduleRegistry();
  const cycleManager = new PatrolCycleManager();

  // Group agents by schedule
  const scheduleGroups = new Map<string, Array<{ name: string; config: AgentConfig }>>();
  for (const [name, agent] of agentRegistry.getAll()) {
    if (agent.config.schedule) {
      const group = scheduleGroups.get(agent.config.schedule) ?? [];
      group.push({ name, config: agent.config });
      scheduleGroups.set(agent.config.schedule, group);
    }
  }

  // Register one cron job per schedule group
  for (const [schedule, agents] of scheduleGroups) {
    const groupName = agents.map(a => a.name).join(', ');
    scheduleRegistry.register(`patrol-cycle:${schedule}`, schedule, () => {
      console.log(`[herald] Patrol cycle firing for: ${groupName}`);
      cycleManager
        .executeCycle(agents, heraldConfig, sessionManager, agentRegistry)
        .catch(err => console.error(`[herald] Patrol cycle error:`, err));
    });
  }

  return scheduleRegistry;
}
```

**Tests:** Update scheduler tests
- Test that agents with same schedule are grouped
- Test that different schedules create separate cron jobs
- Test that solo agents still work

### Task 3: Add patrol cycle API endpoint (AC: #1)

**File:** `packages/daemon/src/api/system.ts` (or new `patrol.ts`)

Add `GET /api/patrol/status` that returns:
- Whether a patrol cycle is currently running
- Last cycle result (if stored)
- Per-agent status within the current/last cycle

This is optional but useful for monitoring. Keep it simple — store the last PatrolCycleResult in memory.

### Task 4: Verify SDK adapter handles concurrent sessions (AC: #1)

**File:** `packages/daemon/src/session/sdk-adapter.ts`

Verify that `ClaudeCodeAdapter` can handle multiple concurrent `sendMessage()` calls. Since it spawns separate Claude Code CLI processes, this should work naturally. But verify:
- Each call to `this.claude.chat()` is independent
- No shared mutable state between calls
- If there's a connection pool or rate limit, document it

### Task 5: Document subagent spawning (AC: #2)

No daemon code needed for subagent spawning. The Claude Code runtime handles this natively. Document that:
- FR9 (subagent spawning) is satisfied by Claude Code's native Agent tool
- The persona MDs instruct agents to use their time budget for parallel source lookups
- The daemon doesn't need to manage subagent lifecycle

### Task 6: Validate

- `bun test` — all tests pass
- `bun lint` — clean
- Verify concurrent execution: register 2+ agents with same schedule, trigger, confirm both run simultaneously (check timestamps in reports)
- Verify failure isolation: mock one agent to fail, confirm others complete
- Verify cycle completes within 20 minutes (NFR12) — measure with real agents when available

## Dev Notes

### Architecture Compliance
- Daemon stays dumb: it groups agents, fires them concurrently, collects results. No intelligence.
- `Promise.allSettled` is critical — `Promise.all` would abort on first failure
- PatrolCycleManager is pure orchestration — no business logic
- Subagent spawning is Claude Code's responsibility, not ours

### ScheduleRegistry.register Compatibility

The current `ScheduleRegistry.register` takes a name and schedule string. The name will change from agent name to `patrol-cycle:{schedule}` for grouped agents. Verify the ScheduleRegistry can handle this naming scheme (it should — it's just a string key).

### Hot-Reload Consideration

When an agent's schedule changes via hot-reload, the scheduler needs to:
1. Remove the agent from its old schedule group
2. Add it to the new schedule group
3. If the old group is now empty, remove the cron job
4. If the new group didn't exist, create a new cron job

This is a follow-up concern — for now, restarting the daemon on schedule changes is acceptable.

### Key Files Created
```
packages/daemon/src/scheduler/patrol-cycle.ts       — PatrolCycleManager
packages/daemon/src/scheduler/patrol-cycle.test.ts   — tests
```

### Key Files Modified
```
packages/daemon/src/scheduler/index.ts               — group agents, use cycle manager
```

### Dependencies
- Independent of Story 2.2 (opinion/prediction framework)
- Depends on Story 2.1 only for having agents that can actually patrol
- Can be implemented on its own branch
