# Story 1.2: Daemon Skeleton with Hono REST API

Status: ready-for-dev

## Story

As an operator,
I want to start the Herald daemon and confirm it's running via a health endpoint,
So that I have a reliable foundation for all agent operations.

## Acceptance Criteria

1. **Given** the daemon package with Hono installed **When** the daemon starts via `bun run packages/daemon/src/index.ts` **Then** a Bun.serve() HTTP server starts on the port specified in herald.config.yaml
2. **Given** the server is running **When** `GET /health` is called **Then** it returns `200` with `{ status: "ok", uptime: <seconds> }`
3. **Given** the server is running **When** `GET /api/status` is called **Then** it returns `200` with `{ agents: [], daemon: { uptime: <seconds>, version: "<version>" } }`
4. **Given** the server starts **When** binding is checked **Then** the server binds to localhost only (NFR21)
5. **Given** herald.config.yaml exists **When** the daemon starts **Then** config is loaded and validated with HeraldConfigSchema, with env var overrides (HERALD_PORT, HERALD_DATA_DIR, etc.)
6. **Given** the daemon package **When** systemd files are checked **Then** `systemd/herald.service` exists with Restart=always, RestartSec=5
7. **Given** the server starts **When** startup completes **Then** console.log outputs startup confirmation with port and config path
8. **Given** an unhandled error occurs in a route **When** the error propagates **Then** Hono error middleware catches it and returns `{ error: "Internal server error" }` with 500 status
9. **Given** the process receives SIGINT or SIGTERM **When** shutdown begins **Then** the server closes gracefully and logs shutdown message

## Tasks / Subtasks

- [ ] Task 1: Create config loader (AC: #5)
  - [ ] 1.1 Create `packages/daemon/src/config.ts` — loads herald.config.yaml via Bun.file(), parses YAML, validates with HeraldConfigSchema
  - [ ] 1.2 Apply env var overrides: HERALD_PORT → port, HERALD_DATA_DIR → data_dir, HERALD_LOG_LEVEL → log_level
  - [ ] 1.3 Export typed `loadConfig()` function returning `HeraldConfig`
  - [ ] 1.4 Install `js-yaml` dependency for YAML parsing (Bun has no built-in YAML parser)
- [ ] Task 2: Create Hono app with error middleware (AC: #8)
  - [ ] 2.1 Create `packages/daemon/src/api/index.ts` — initialize Hono app, attach error handler middleware
  - [ ] 2.2 Error handler: catch all unhandled errors → `{ error: "Internal server error" }` with 500 status
  - [ ] 2.3 Never leak stack traces in responses
- [ ] Task 3: Create system routes (AC: #2, #3)
  - [ ] 3.1 Create `packages/daemon/src/api/system.ts` — Hono route group for /health and /api/status
  - [ ] 3.2 `GET /health` → `{ status: "ok", uptime: <process.uptime() in seconds> }`
  - [ ] 3.3 `GET /api/status` → `{ agents: [], daemon: { uptime: <seconds>, version: "<from package>" } }`
- [ ] Task 4: Create daemon entry point (AC: #1, #4, #7, #9)
  - [ ] 4.1 Rewrite `packages/daemon/src/index.ts` as server entry point
  - [ ] 4.2 Call `loadConfig()`, then `Bun.serve()` with `fetch: app.fetch`, binding to `127.0.0.1` (localhost only)
  - [ ] 4.3 Log startup: `Herald daemon listening on http://127.0.0.1:<port>`
  - [ ] 4.4 Register SIGINT/SIGTERM handlers for graceful shutdown — `server.stop()`, log shutdown, `process.exit(0)`
- [ ] Task 5: Create systemd unit file (AC: #6)
  - [ ] 5.1 Create `systemd/herald.service` with Restart=always, RestartSec=5, ExecStart pointing to bun run
- [ ] Task 6: Write tests (AC: #2, #3, #5, #8)
  - [ ] 6.1 Create `packages/daemon/src/config.test.ts` — test loadConfig() with valid YAML, env overrides, defaults
  - [ ] 6.2 Create `packages/daemon/src/api/system.test.ts` — test /health and /api/status responses
  - [ ] 6.3 Create `packages/daemon/src/api/index.test.ts` — test error middleware returns 500 with correct body
- [ ] Task 7: Validate (AC: #1, #2, #3)
  - [ ] 7.1 Run `bun run packages/daemon/src/index.ts` and confirm server starts
  - [ ] 7.2 `curl http://127.0.0.1:3117/health` returns expected response
  - [ ] 7.3 `curl http://127.0.0.1:3117/api/status` returns expected response
  - [ ] 7.4 Run `bun test` — all tests pass
  - [ ] 7.5 Run `bun lint` — clean

## Dev Notes

### Technical Requirements

- **Runtime:** Bun v1.3+ — runs .ts files directly, no build step
- **REST Framework:** Hono v4.12.3 (already installed in daemon package)
- **Config Parsing:** Need `js-yaml` for YAML parsing — Bun has no built-in YAML parser
- **Validation:** Use HeraldConfigSchema from `@herald/shared` (already exists)

### Architecture Compliance

**CRITICAL — Follow these patterns exactly:**

- **Feature-based code organization** — `src/api/` for REST routes, `src/config.ts` for config loading
- **Co-located test files** — `config.ts` + `config.test.ts`, `api/system.ts` + `api/system.test.ts`
- **kebab-case for all files** — already following this
- **index.ts per directory** — `api/index.ts` re-exports public API
- **No authentication for v1** — single operator, localhost only
- **Daemon entry point pattern:** `index.ts` is the boot file — loads config, creates Hono app, starts Bun.serve()

**Server Architecture (Hono + Bun.serve):**
```typescript
// packages/daemon/src/index.ts
import { loadConfig } from './config.ts';
import { createApp } from './api/index.ts';

const config = loadConfig();
const app = createApp();

const server = Bun.serve({
  fetch: app.fetch,
  port: config.port,
  hostname: '127.0.0.1', // localhost only (NFR21)
});

console.log(`Herald daemon listening on http://127.0.0.1:${server.port}`);
```

**API Response Patterns (from Architecture):**
- Success: direct JSON, no wrapper — `{ status: "ok", uptime: 42 }`
- Error: `{ error: string, detail?: string }` with HTTP status code
- JSON fields: camelCase — `{ agentId, runStatus }`

**Logging (from Architecture):**
- `console.log` — operational events (startup, config loaded)
- `console.error` — failures requiring attention
- `console.warn` — recoverable issues
- No logging framework — systemd journal captures stdout/stderr

### Library & Framework Requirements

**Install these dependencies in packages/daemon:**
- `js-yaml` — YAML parser for herald.config.yaml
- `@types/js-yaml` — TypeScript types (devDependency)

**Already installed (DO NOT reinstall):**
- `hono` v4.12.3
- `node-cron` v4.2.1 (not used in this story)
- `@herald/shared` workspace dependency

### File Structure Requirements

```
packages/daemon/src/
├── index.ts              # Entry point: load config, Bun.serve() + Hono
├── config.ts             # loadConfig(): herald.config.yaml + env overrides
├── config.test.ts        # Config loader tests
└── api/
    ├── index.ts          # createApp(): Hono app + error middleware
    ├── index.test.ts     # Error middleware tests
    ├── system.ts         # GET /health, GET /api/status
    └── system.test.ts    # System route tests

systemd/
└── herald.service        # systemd unit file (replaces .gitkeep)
```

### Config Loading Specification

```typescript
// packages/daemon/src/config.ts
import { readFileSync } from 'fs';
import yaml from 'js-yaml';
import { HeraldConfigSchema } from '@herald/shared';

export function loadConfig(configPath = 'herald.config.yaml'): HeraldConfig {
  // 1. Read and parse YAML file
  // 2. Apply env var overrides:
  //    HERALD_PORT → port (parse as number)
  //    HERALD_DATA_DIR → data_dir
  //    HERALD_LOG_LEVEL → log_level
  // 3. Validate with HeraldConfigSchema.parse()
  // 4. Return typed config
}
```

**Env var override mapping:**

| Env Var | Config Key | Type |
|---------|-----------|------|
| HERALD_PORT | port | number |
| HERALD_DATA_DIR | data_dir | string |
| HERALD_LOG_LEVEL | log_level | enum |

### systemd Unit File Specification

```ini
[Unit]
Description=Herald Daemon
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/env bun run packages/daemon/src/index.ts
WorkingDirectory=/home/b/herald
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### Testing Requirements

- Use **Vitest v4.0** — co-located test files
- Test config loader: valid YAML parsing, env var overrides, schema defaults, missing file error
- Test system routes: use `app.request()` from Hono's test utilities — no need to start a real server
- Test error middleware: route that throws → 500 + `{ error: "Internal server error" }`
- Hono's `app.request()` pattern for testing:
  ```typescript
  const res = await app.request('/health');
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.status).toBe('ok');
  ```

### Previous Story Intelligence (Story 1.1)

**Learnings from Story 1.1 implementation:**
- Biome v2.4.4 config uses `assist.actions.source.organizeImports` (not v1 `organizeImports`)
- Biome uses `includes` not `include` in files section
- Always use `workspace:*` for inter-package dependencies
- Zod v3.25.76 is the installed version (v3.x line)
- `@types/bun` is NOT needed — Bun v1.3+ has built-in types
- Use `import type` for type-only imports (verbatimModuleSyntax is enabled)
- Run `bun lint` as `biome check .` — verify it passes
- Port default is 3117 (was incorrectly 3000 in initial spec, fixed in review)

**Existing code to build on:**
- `packages/daemon/src/index.ts` — currently `export const VERSION = '0.0.1';` — REWRITE as server entry point
- `packages/shared/src/schemas/herald-config.ts` — HeraldConfigSchema already exists with correct defaults
- `packages/shared/src/constants/index.ts` — `DEFAULT_PORT = 3117` exists
- `herald.config.yaml` — already exists at project root with port: 3117

### References

- [Source: architecture.md — API & Communication Patterns] Hono choice, response format, error handling
- [Source: architecture.md — Infrastructure & Deployment] systemd, daemon logging, process management
- [Source: architecture.md — Project Structure] daemon/src/ directory layout, config.ts location
- [Source: architecture.md — Naming Conventions] kebab-case files, camelCase JSON, endpoint patterns
- [Source: architecture.md — Data Flow] Hono API + WebSocket server architecture
- [Source: epics.md — Story 1.2 ACs] All acceptance criteria
- [Source: prd.md — NFR21] localhost-only binding requirement

## Change Log

- 2026-02-28: Story 1.2 created — comprehensive developer guide for daemon skeleton implementation
