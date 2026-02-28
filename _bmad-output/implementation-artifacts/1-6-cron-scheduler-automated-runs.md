# Story 1.6: Cron Scheduler for Automated Runs

Status: ready-for-dev

## Story

As an operator,
I want agents to run automatically on their configured schedules,
So that the system operates autonomously without manual triggering.

## Acceptance Criteria

1. **Given** registered agents with `schedule` fields **When** the daemon starts **Then** node-cron jobs are created for each agent's schedule expression and tracked in the schedule registry
2. **Given** a cron schedule fires **When** the scheduled time arrives **Then** the agent run is triggered through the same execution path as manual runs (executeRun from Story 1.5)
3. **Given** the run is triggered by cron **When** execution begins **Then** the run is logged with `console.log` including agent name and trigger type (`scheduled`)
4. **Given** an agent's YAML is hot-reloaded with a changed schedule **When** the watcher detects the change **Then** the old cron job is cancelled and a new one registered with the updated schedule
5. **Given** `GET /api/schedule` is called **When** the request is processed **Then** the response lists all agents with their cron expressions and next scheduled run time
6. **Given** an agent has no `schedule` field **When** the daemon starts **Then** no cron job is created for that agent

## Tasks / Subtasks

- [ ] Task 1: Create schedule registry (AC: #1, #4, #6)
  - [ ] 1.1 Create `packages/daemon/src/scheduler/schedule-registry.ts` — tracks cron jobs per agent
  - [ ] 1.2 Methods: `register(name, cronExpr, callback)`, `update(name, cronExpr, callback)`, `remove(name)`, `getAll()`, `stop()`
  - [ ] 1.3 Uses node-cron to create/destroy cron tasks
  - [ ] 1.4 Create `packages/daemon/src/scheduler/schedule-registry.test.ts`
- [ ] Task 2: Create scheduler init (AC: #1, #2, #3)
  - [ ] 2.1 Create `packages/daemon/src/scheduler/index.ts` — `initScheduler()` scans registry, creates cron jobs
  - [ ] 2.2 Each cron callback calls `executeRun()` with trigger type `scheduled`
  - [ ] 2.3 Log: `[herald] Scheduled run: {agent-name} (cron: {expression})`
- [ ] Task 3: Create schedule API endpoint (AC: #5)
  - [ ] 3.1 Create `packages/daemon/src/api/schedule.ts` — `GET /api/schedule`
  - [ ] 3.2 Returns `{ schedules: [{ agentName, cronExpression, nextRun }] }`
  - [ ] 3.3 Wire into Hono app
  - [ ] 3.4 Create `packages/daemon/src/api/schedule.test.ts`
- [ ] Task 4: Integrate hot-reload (AC: #4)
  - [ ] 4.1 Hook schedule registry into agent discovery watcher — when agent config updates, reschedule
  - [ ] 4.2 When agent removed, cancel its cron job
- [ ] Task 5: Wire into daemon startup (AC: #1)
  - [ ] 5.1 Update `packages/daemon/src/index.ts` — call `initScheduler()` after agent loader
  - [ ] 5.2 Stop scheduler on shutdown
- [ ] Task 6: Validate
  - [ ] 6.1 `bun test` — all tests pass
  - [ ] 6.2 `bun lint` — clean

## Dev Notes

### Technical Requirements

- **Cron library:** `node-cron` v4.2.1 (already installed in daemon package)
- **Types:** `@types/node-cron` v3.0.11 (already installed as devDependency)
- **Trigger path:** Cron callback → `executeRun()` from Story 1.5 — same execution path as manual runs

### Architecture Compliance

**File structure:**
```
packages/daemon/src/scheduler/
├── index.ts                  # initScheduler(), re-exports
├── schedule-registry.ts      # ScheduleRegistry class (wraps node-cron)
└── schedule-registry.test.ts
```

### Schedule Registry Design

```typescript
import cron from 'node-cron';

interface ScheduledAgent {
  agentName: string;
  cronExpression: string;
  task: cron.ScheduledTask;
}

export class ScheduleRegistry {
  private schedules = new Map<string, ScheduledAgent>();

  register(name: string, cronExpr: string, callback: () => void): void {
    // Validate cron expression with cron.validate()
    // Create task with cron.schedule(cronExpr, callback)
    // Store in map
  }

  update(name: string, cronExpr: string, callback: () => void): void {
    // Stop old task, create new one
    this.remove(name);
    this.register(name, cronExpr, callback);
  }

  remove(name: string): void {
    // Stop task, delete from map
  }

  getAll(): Array<{ agentName: string; cronExpression: string }> {
    // Return all scheduled agents
  }

  stop(): void {
    // Stop all tasks (for shutdown)
  }
}
```

### Scheduler Init Pattern

```typescript
export function initScheduler(
  agentRegistry: AgentRegistry,
  sessionManager: SessionManager,
  heraldConfig: HeraldConfig,
): ScheduleRegistry {
  const scheduleRegistry = new ScheduleRegistry();

  // Scan all agents, create cron jobs for those with schedule field
  for (const [name, agent] of agentRegistry.getAll()) {
    if (agent.config.schedule) {
      scheduleRegistry.register(name, agent.config.schedule, () => {
        console.log(`[herald] Scheduled run: ${name} (cron: ${agent.config.schedule})`);
        executeRun(name, agent.config, heraldConfig, sessionManager).catch((err) => {
          console.error(`[herald] Scheduled run failed for ${name}:`, err);
        });
      });
    }
  }

  return scheduleRegistry;
}
```

### Hot-Reload Integration

When agent discovery detects a config change:
1. Check if schedule field changed
2. If schedule removed → `scheduleRegistry.remove(name)`
3. If schedule changed → `scheduleRegistry.update(name, newExpr, callback)`
4. If schedule added → `scheduleRegistry.register(name, expr, callback)`

The watcher in `agent-discovery.ts` already calls registry.update() — extend to also update schedule registry. The simplest approach: pass scheduleRegistry to the watcher options and handle schedule changes in processAgentFile().

### API Response

```typescript
// GET /api/schedule
{
  schedules: [
    {
      agentName: "ml-researcher",
      cronExpression: "0 5 * * *",
      // nextRun is optional — node-cron doesn't expose it directly
      // Can use cron-parser library or skip for v1
    }
  ]
}
```

Note: `node-cron` doesn't expose next run time directly. For v1, just return agent name and cron expression. The next run can be calculated client-side.

### Testing Strategy

- **Schedule registry:** Test register/update/remove/getAll/stop. Mock `cron.schedule()` to avoid real timers. Verify tasks are created and stopped correctly.
- **Scheduler init:** Mock registry + agents, verify cron jobs created for agents with schedule field, skipped for agents without.
- **Schedule API:** Use `app.request()`, verify response format.
- **DO NOT test actual cron timing** — just verify registration logic.

### Previous Story Intelligence

- `node-cron` and `@types/node-cron` already installed (from Story 1.1)
- `executeRun()` from Story 1.5 is the run execution path
- Agent registry's `getAll()` returns `Map<string, RegisteredAgent>`
- `AgentConfig.schedule` is `z.string().optional()` — cron expression
- Watcher's `processAgentFile()` handles create/update detection
- `createApp()` accepts `AppDeps` — extend with scheduleRegistry

### References

- [Source: architecture.md — Scheduler] daemon/src/scheduler/ directory
- [Source: architecture.md — FR55] Scheduled agent runs via cron
- [Source: architecture.md — Event Pipeline] Cron triggers in unified dispatch
- [Source: epics.md — Story 1.6] All acceptance criteria

## Change Log

- 2026-02-28: Story 1.6 created — cron scheduler with hot-reload support
