# Story 1.3: Agent Definition Loader & Auto-Discovery

Status: ready-for-dev

## Story

As an operator,
I want the daemon to automatically discover and register agents when I drop YAML + persona files into the agents directory,
So that adding a new agent requires zero code changes.

## Acceptance Criteria

1. **Given** the daemon is running **When** an agent YAML file is placed in `agents/` **Then** the daemon detects the new file via `fs.watch()` and validates the YAML against AgentConfigSchema
2. **Given** a valid agent YAML is detected **When** validation passes **Then** the agent is registered in the in-memory agent registry
3. **Given** a new agent is registered **When** scaffolding runs **Then** missing directories are created: `memory/agents/{name}/`, `memory/agents/{name}/rag/`, `reports/{name}/`, and `memory/agents/{name}/knowledge.md` is created with BMAD skeleton sections
4. **Given** directories already exist for an agent **When** scaffolding runs **Then** existing files are left untouched — only missing items are created
5. **Given** an invalid YAML is placed in `agents/` **When** validation fails **Then** a `console.warn` is logged and the agent is skipped (daemon never crashes)
6. **Given** the daemon is running **When** `GET /api/agents` is called **Then** it returns the list of all registered agents with their config
7. **Given** the daemon is running **When** `GET /api/agents/:name` is called **Then** it returns a single agent's full configuration and status
8. **Given** a registered agent's YAML is modified **When** the watcher detects the change **Then** the config is re-validated and the registry is updated (FR2)
9. **Given** a modified YAML is invalid **When** hot-reload validation fails **Then** the previous valid config is retained and a warning is logged
10. **Given** a registered agent's YAML is deleted **When** the watcher detects the deletion **Then** the agent is removed from the registry
11. **Given** the daemon starts **When** the agents/ directory contains existing YAML files **Then** all valid agents are loaded on startup (initial scan)

## Tasks / Subtasks

- [ ] Task 1: Create agent YAML parser (AC: #1, #5)
  - [ ] 1.1 Create `packages/daemon/src/agent-loader/yaml-parser.ts` — reads YAML file, validates with AgentConfigSchema
  - [ ] 1.2 Return `{ success: true, config }` or `{ success: false, error }` — never throw
  - [ ] 1.3 Create `packages/daemon/src/agent-loader/yaml-parser.test.ts`
- [ ] Task 2: Create agent registry (AC: #2, #6, #7, #8, #9, #10)
  - [ ] 2.1 Create `packages/daemon/src/agent-loader/agent-registry.ts` — Map-based in-memory registry
  - [ ] 2.2 Methods: `register(name, config)`, `update(name, config)`, `remove(name)`, `get(name)`, `getAll()`
  - [ ] 2.3 Create `packages/daemon/src/agent-loader/agent-registry.test.ts`
- [ ] Task 3: Create agent scaffolder (AC: #3, #4)
  - [ ] 3.1 Create `packages/daemon/src/agent-loader/scaffolder.ts` — creates missing agent directories and knowledge.md
  - [ ] 3.2 knowledge.md BMAD skeleton: `# {Agent Name} Knowledge`, sections: `## Domain Knowledge`, `## Developing Opinions`, `## Predictions Log`, `## Accountability`
  - [ ] 3.3 Only create files/dirs that don't already exist
  - [ ] 3.4 Create `packages/daemon/src/agent-loader/scaffolder.test.ts`
- [ ] Task 4: Create file watcher for agents directory (AC: #1, #8, #10, #11)
  - [ ] 4.1 Create `packages/daemon/src/watcher/agent-discovery.ts` — watches `agents/` with `fs.watch()`
  - [ ] 4.2 On file create/modify: parse YAML, validate, register/update
  - [ ] 4.3 On file delete: remove from registry
  - [ ] 4.4 Initial scan on startup: glob all `agents/*.yaml` and load
  - [ ] 4.5 Create `packages/daemon/src/watcher/agent-discovery.test.ts`
- [ ] Task 5: Create agent API routes (AC: #6, #7)
  - [ ] 5.1 Create `packages/daemon/src/api/agents.ts` — `GET /api/agents` and `GET /api/agents/:name`
  - [ ] 5.2 Wire into Hono app in `api/index.ts`
  - [ ] 5.3 404 for unknown agent name
  - [ ] 5.4 Create `packages/daemon/src/api/agents.test.ts`
- [ ] Task 6: Wire into daemon startup (AC: #11)
  - [ ] 6.1 Create `packages/daemon/src/agent-loader/index.ts` — re-exports, provides `initAgentLoader(config)` that does initial scan + starts watcher
  - [ ] 6.2 Update `packages/daemon/src/index.ts` — call `initAgentLoader()` after server starts
  - [ ] 6.3 Pass registry to `createApp()` so API routes can access it
- [ ] Task 7: Validate
  - [ ] 7.1 Drop a test YAML in agents/, verify daemon picks it up
  - [ ] 7.2 `bun test` — all tests pass
  - [ ] 7.3 `bun lint` — clean

## Dev Notes

### Technical Requirements

- **Runtime:** Bun v1.3+ — use native `fs.watch()` (not chokidar)
- **YAML Parsing:** `js-yaml` (already installed in daemon from Story 1.2)
- **Validation:** `AgentConfigSchema` from `@herald/shared` (already exists)
- **File I/O:** Use `Bun.file()` for reading, `Bun.write()` for scaffolding

### Architecture Compliance

**Feature-based organization:**
```
packages/daemon/src/
├── agent-loader/
│   ├── index.ts              # initAgentLoader(), re-exports
│   ├── yaml-parser.ts        # parseAgentYaml(filePath): Result
│   ├── agent-registry.ts     # AgentRegistry class (Map-based)
│   ├── scaffolder.ts         # scaffoldAgentDirs(name, config)
│   ├── yaml-parser.test.ts
│   ├── agent-registry.test.ts
│   └── scaffolder.test.ts
├── watcher/
│   ├── agent-discovery.ts    # watchAgentsDir(), initialScan()
│   └── agent-discovery.test.ts
├── api/
│   ├── agents.ts             # GET /api/agents, /api/agents/:name
│   └── agents.test.ts
```

**Registry data structure:**
```typescript
interface RegisteredAgent {
  config: AgentConfig;
  registeredAt: string; // ISO8601
  status: 'active' | 'error';
  lastError?: string;
}

// Map<agentName, RegisteredAgent>
```

**API response patterns (from architecture):**
- `GET /api/agents` → `{ agents: [{ name, config, status, registeredAt }] }`
- `GET /api/agents/:name` → `{ name, config, status, registeredAt }` or 404 `{ error: "Agent not found" }`
- JSON fields: camelCase

**Error handling:**
- Invalid YAML → `console.warn`, skip, continue
- Missing persona file → `console.warn`, skip (persona validation is just checking file exists)
- File I/O errors → `console.error`, continue
- Never crash the daemon on any agent-related error

### Watcher Implementation

```typescript
// Bun fs.watch() pattern
import { watch } from 'fs';

const watcher = watch('agents/', { recursive: false }, (event, filename) => {
  if (!filename?.endsWith('.yaml')) return;
  // handle create/modify/delete
});
```

**Debouncing:** File watchers can fire multiple events for a single save. Add a simple debounce (100ms) per filename to avoid duplicate processing.

**Initial scan pattern:**
```typescript
import { Glob } from 'bun';
const glob = new Glob('*.yaml');
for await (const file of glob.scan('agents/')) {
  // parse and register
}
```

### Testing Strategy

- **yaml-parser tests:** Valid YAML, invalid YAML (bad schema), malformed YAML, missing file
- **registry tests:** Register, update, remove, get, getAll, duplicate registration
- **scaffolder tests:** Creates dirs when missing, skips when existing, creates knowledge.md with sections
- **agent-discovery tests:** Mock fs.watch, test initial scan with temp files
- **agents API tests:** Use `app.request()` — list agents, get by name, 404 for unknown

### Previous Story Intelligence

From Story 1.2:
- Config loader uses `Bun.file()` for reading — follow same pattern
- Hono app uses `createApp()` factory — extend it to accept registry dependency
- `app.route()` for mounting route groups
- Tests use `app.request()` from Hono — no real server
- `import type` for type-only imports (verbatimModuleSyntax)
- tsconfig now has `"types": ["bun"]` for Bun type support

**Existing code to build on:**
- `packages/daemon/src/api/index.ts` — `createApp()` function, mount new agent routes here
- `packages/daemon/src/index.ts` — server entry point, call `initAgentLoader()` after boot
- `packages/shared/src/schemas/agent-config.ts` — AgentConfigSchema with all fields
- `js-yaml` already installed in daemon package
- `agents/` directory exists with `.gitkeep`

### YAML Agent Config Example

```yaml
# agents/ml-researcher.yaml
name: ml-researcher
persona: personas/ml-researcher.md
schedule: "0 5 * * *"
output_dir: reports/ml-researcher
session_limit: 15
notify_policy: failures
memory_paths:
  knowledge: memory/agents/ml-researcher/knowledge.md
  preferences: memory/agents/ml-researcher/preferences.md
  last_jobs: memory/agents/ml-researcher/last-jobs.md
  rag: memory/agents/ml-researcher/rag
team_eligible: true
```

### References

- [Source: architecture.md — Agent Loader] daemon/src/agent-loader/ directory
- [Source: architecture.md — Watcher] daemon/src/watcher/agent-discovery.ts
- [Source: architecture.md — FR1-FR2] Agent auto-discovery and hot-reload
- [Source: architecture.md — Error Handling] Invalid YAML = skip, never crash
- [Source: architecture.md — API Patterns] REST endpoint conventions, response format
- [Source: epics.md — Story 1.3 ACs] All acceptance criteria
- [Source: architecture.md — NFR5] Agent failure isolation
- [Source: architecture.md — NFR25] Zero-code agent addition

## Change Log

- 2026-02-28: Story 1.3 created — comprehensive developer guide for agent loader implementation
