# Story 1.5: Agent Run Execution & Output

Status: ready-for-dev

## Story

As an operator,
I want to trigger an agent run and see structured output,
So that I can verify agents produce useful results.

## Acceptance Criteria

1. **Given** a registered agent **When** `POST /api/agents/:name/run` is called **Then** the agent executes and produces a markdown report with YAML frontmatter at `reports/{agent-name}/{timestamp}.md`
2. **Given** an agent run completes **When** the output is checked **Then** the frontmatter includes: agent name, run_id, started_at, finished_at, status
3. **Given** an agent run completes **When** the agent entry is queried **Then** `GET /api/agents/:name` reflects updated lastRun timestamp and run status (FR6)
4. **Given** an agent produces conversation output **When** the run completes **Then** the full transcript is persisted to `memory/conversations/{date}-{agent-name}.md` (FR59)
5. **Given** an agent run fails mid-execution **When** the error is caught **Then** status is set to `failed` with error details, other agents/daemon unaffected (NFR5)
6. **Given** the daemon is running **When** `GET /api/agents/:name/runs` is called **Then** it returns a list of recent runs with timestamps and status

## Tasks / Subtasks

- [ ] Task 1: Create run executor (AC: #1, #2, #5)
  - [ ] 1.1 Create `packages/daemon/src/session/run-executor.ts` — orchestrates a single agent run
  - [ ] 1.2 Generates run_id (timestamp-based), tracks started_at/finished_at
  - [ ] 1.3 Calls session manager's runAgent(), captures response
  - [ ] 1.4 Writes output report to `reports/{agent-name}/{run_id}.md` with YAML frontmatter
  - [ ] 1.5 Updates agent registry with last run info
  - [ ] 1.6 Create `packages/daemon/src/session/run-executor.test.ts`
- [ ] Task 2: Create transcript writer (AC: #4)
  - [ ] 2.1 Create `packages/daemon/src/logger/transcript-writer.ts` — writes conversation to markdown
  - [ ] 2.2 Format: `memory/conversations/{YYYY-MM-DD}-{agent-name}.md`
  - [ ] 2.3 Includes all messages from the session (user prompts + assistant responses)
  - [ ] 2.4 Create `packages/daemon/src/logger/index.ts` — re-exports
  - [ ] 2.5 Create `packages/daemon/src/logger/transcript-writer.test.ts`
- [ ] Task 3: Update agent registry for run tracking (AC: #3)
  - [ ] 3.1 Add `lastRun` field to `RegisteredAgent`: `{ runId, status, startedAt, finishedAt }`
  - [ ] 3.2 Update `GET /api/agents` and `GET /api/agents/:name` to include lastRun in response
- [ ] Task 4: Create runs list API (AC: #6)
  - [ ] 4.1 Add `GET /api/agents/:name/runs` — scans `reports/{agent-name}/` directory for run files
  - [ ] 4.2 Returns `{ runs: [{ runId, status, startedAt, finishedAt }] }` parsed from frontmatter
  - [ ] 4.3 Add test for runs endpoint
- [ ] Task 5: Wire run executor into POST /api/agents/:name/run (AC: #1)
  - [ ] 5.1 Update `packages/daemon/src/api/runs.ts` — use run executor instead of direct session manager call
  - [ ] 5.2 Return `{ runId, result, status }`
- [ ] Task 6: Validate
  - [ ] 6.1 `bun test` — all tests pass
  - [ ] 6.2 `bun lint` — clean

## Dev Notes

### Technical Requirements

- **Output format:** Markdown with YAML frontmatter (validated by AgentOutputFrontmatterSchema)
- **Report location:** `reports/{agent-name}/{run_id}.md`
- **Transcript location:** `memory/conversations/{YYYY-MM-DD}-{agent-name}.md`
- **Run ID format:** ISO timestamp slug: `2026-02-28T053000Z` (colons removed for filesystem safety)

### Architecture Compliance

**File structure:**
```
packages/daemon/src/
├── session/
│   ├── run-executor.ts       # Orchestrates single agent run
│   └── run-executor.test.ts
├── logger/
│   ├── index.ts              # Re-exports
│   ├── transcript-writer.ts  # Conversation → markdown file
│   └── transcript-writer.test.ts
```

**Agent output report format:**
```markdown
---
agent: ml-researcher
run_id: "2026-02-28T053000Z"
started_at: "2026-02-28T05:30:00.000Z"
finished_at: "2026-02-28T05:31:45.000Z"
status: success
---

# ml-researcher Patrol Report

{agent response content}
```

**Transcript format:**
```markdown
# Conversation: ml-researcher — 2026-02-28

## Run: 2026-02-28T053000Z

### User
{prompt}

### Assistant
{response}
```

### Run Executor Pattern

```typescript
export interface RunResult {
  runId: string;
  status: 'success' | 'failed';
  result: string;
  startedAt: string;
  finishedAt: string;
}

export async function executeRun(
  agentName: string,
  config: AgentConfig,
  heraldConfig: HeraldConfig,
  sessionManager: SessionManager,
  prompt?: string,
): Promise<RunResult> {
  const runId = generateRunId(); // timestamp-based
  const startedAt = new Date().toISOString();

  try {
    const result = await sessionManager.runAgent(agentName, config, heraldConfig, prompt);
    const finishedAt = new Date().toISOString();

    // Write report to reports/{agent-name}/{runId}.md
    await writeReport(agentName, runId, startedAt, finishedAt, 'success', result, heraldConfig);

    // Write transcript
    const messages = sessionManager.getSession(agentName)?.messages ?? [];
    await writeTranscript(agentName, runId, messages, heraldConfig);

    return { runId, status: 'success', result, startedAt, finishedAt };
  } catch (err) {
    const finishedAt = new Date().toISOString();
    const error = err instanceof Error ? err.message : String(err);
    await writeReport(agentName, runId, startedAt, finishedAt, 'failed', error, heraldConfig);
    return { runId, status: 'failed', result: error, startedAt, finishedAt };
  }
}
```

### Existing Code to Build On

- `packages/daemon/src/session/session-manager.ts` — `runAgent()` returns response text, `getSession()` returns message history
- `packages/daemon/src/agent-loader/agent-registry.ts` — extend `RegisteredAgent` with `lastRun` field
- `packages/daemon/src/api/runs.ts` — existing POST endpoint, extend with run executor
- `packages/shared/src/schemas/agent-output.ts` — `AgentOutputFrontmatterSchema` exists (agent, run_id, started_at, finished_at, status)
- Use `Bun.write()` for file output, `mkdir` for creating directories

### Testing Strategy

- **Run executor:** Mock session manager, verify report file written with correct frontmatter, verify transcript written
- **Transcript writer:** Create temp dirs, write transcript, verify format
- **Registry update:** Verify lastRun field populated after run
- **Runs API:** Mock filesystem scan of reports directory, verify response format
- Use temp directories for all file write tests

### References

- [Source: architecture.md — Agent Output] Markdown with YAML frontmatter, reports directory
- [Source: architecture.md — Logger] daemon/src/logger/ for conversation transcripts
- [Source: architecture.md — FR13] Structured research reports
- [Source: architecture.md — FR59] Conversation transcript persistence
- [Source: architecture.md — FR6] Agent status visibility
- [Source: epics.md — Story 1.5] All acceptance criteria

## Change Log

- 2026-02-28: Story 1.5 created — agent run execution with output reports and conversation logging
