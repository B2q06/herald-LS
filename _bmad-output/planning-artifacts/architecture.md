---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/product-brief-herald-2026-02-27.md
  - _bmad-output/planning-artifacts/research/technical-herald-tech-stack-research-2026-02-27.md
  - _bmad-output/brainstorming/brainstorming-session-2026-02-27.md
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-02-28'
project_name: 'herald'
user_name: 'B'
date: '2026-02-28'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

64 FRs organized across 8 domains:

| Domain | FRs | Architectural Weight |
|---|---|---|
| Agent Management | FR1-FR11 | High — defines the declarative agent lifecycle, hot reload, team orchestration, subagent spawning |
| Research & Intelligence | FR12-FR17 | Medium — mostly agent behavior defined in personas, but parallel patrol execution (FR17) shapes scheduling |
| Newspaper & Publishing | FR18-FR25 | High — multi-stage pipeline: team synthesis -> Typst compilation -> git versioning -> real-time push |
| Task Management | FR26-FR32 | Medium — smart todo engine integrating calendar, inbox, project state; dynamic intraday adjustment |
| Memory & Knowledge | FR33-FR41 | Very High — three-tier memory (hot/cold/shared), depreciation mechanics, session continuity, cross-agent discovery |
| Communication & Notifications | FR42-FR48 | Medium — inbox monitoring, urgency gating, multi-adapter notification dispatch |
| Project Management | FR49-FR53 | Low — mostly agent-driven via orchestrator; structured idea capture and promotion |
| System Operations | FR54-FR64 | High — daemon reliability, event pipeline, REST/WebSocket APIs, conversation logging, failure modes |

**Non-Functional Requirements:**

27 NFRs across 5 domains that directly shape architecture:

| Domain | NFRs | Key Constraints |
|---|---|---|
| Reliability | NFR1-NFR7 | Continuous uptime (systemd), 100% patrol completion, zero data loss, 6:30 AM newspaper deadline, agent failure isolation, SQLite WAL mode |
| Performance | NFR8-NFR14 | Session resume <3s, Typst subprocess compilation <15s, WebSocket <500ms, CLI <1s, 6 parallel patrols <20min, FTS5 <100ms, daemon <200MB |
| Integration | NFR15-NFR19 | Calendar/email API resilience, Claude SDK error handling, Typst subprocess isolation, git conflict resolution |
| Security | NFR20-NFR23 | Credentials in env/secrets file, localhost-only API, agent sandboxing (designated dirs only), restricted log permissions |
| Maintainability | NFR24-NFR27 | Daemon <2000 LOC, zero-code agent addition, declarative config only, self-contained personas |

**Scale & Complexity:**

- Primary domain: Full-stack multi-surface platform (daemon + CLI + PWA)
- Complexity level: Medium-High
- Estimated architectural components: ~12-15 (daemon core, scheduler, file watcher, event pipeline, session manager, memory stack, notification system, REST API, WebSocket server, conversation logger, Typst pipeline, CLI client, PWA client, agent definition system)

### Technical Constraints & Dependencies

- **Claude Agent SDK V2** — entire intelligence layer depends on persistent sessions, team orchestration, and subagent spawning. SDK stability is the single biggest external dependency
- **TypeScript/Bun** — validated by tech research. Shares SDK ecosystem, handles I/O-bound workloads natively. Bun v1.3 as runtime and package manager
- **SQLite (bun:sqlite + sqlite-vec)** — built-in SQLite via Bun runtime, 3-6x faster than better-sqlite3. WAL mode required for concurrent agent writes
- **Typst** — newspaper compilation. Subprocess execution, must not crash daemon (NFR18)
- **Bun fs.watch()** — native filesystem watching for agent auto-discovery and file trigger engine (chokidar as fallback if edge cases appear)
- **node-cron** — schedule management for agent patrols
- **Bun native WebSocket** — via Bun.serve() websocket handler, alongside Hono HTTP routing
- **Ollama** — local embedding service for RAG vectorization (nomic-embed-text model, GPU-accelerated via RTX 5090)
- **Daemon LOC budget: 2000 lines** — hard architectural constraint that enforces the two-body model
- **Single operator, single machine** — no multi-tenancy, no distributed systems, no auth for v1
- **4-stage incremental build** — each stage must be independently useful; architecture must support incremental delivery

### Cross-Cutting Concerns Identified

1. **Session Lifecycle Management** — Every agent interaction flows through session create/resume/bound/save/recover. This is the central coordination point between daemon and SDK.

2. **Event Pipeline Unification** — Cron triggers, filesystem events, user commands, and agent-initiated triggers must all flow through a single dispatch mechanism with loop prevention.

3. **Memory Consistency** — Hot memory depreciation, RAG vector indexing, and shared FTS5 index updates must maintain consistency. SQLite WAL mode + proper transaction boundaries (NFR7) are the mechanism.

4. **Agent Failure Isolation** — One agent's crash must never affect another agent or daemon stability (NFR5). This implies process/session-level isolation boundaries.

5. **Observability & Logging** — Conversation transcripts, agent status, failure mode distinction (FR61), and browsable logs span every component.

6. **Hot Reload** — Agent YAML/persona changes must be detected and applied without daemon restart. File watcher on agents directory is the mechanism.

7. **Content Format Consistency** — Markdown is the universal content format. Agents produce markdown, surfaces render it. This simplifies the API contract but requires consistent markdown structure conventions.

## Starter Template Evaluation

### Primary Technology Domain

Multi-surface TypeScript platform — daemon (Bun service), CLI tool, and PWA (Preact) — organized as a Bun workspaces monorepo. No single existing starter template matches this architecture.

### Starter Options Considered

| Option | Verdict |
|---|---|
| **T3 Stack / create-t3-app** | Web-app focused. Brings Next.js, tRPC, Prisma — wrong paradigm entirely. Herald's daemon is a service, not a web framework |
| **Turborepo starter** | Adds build orchestration overhead for 3 small packages. Daemon is <2000 LOC. Overkill |
| **Nx monorepo** | Enterprise-grade tooling for enterprise-scale repos. Massive config surface for a solo developer project |
| **create-vite preact-ts** | Good for the PWA package alone, but doesn't address daemon or CLI |
| **Custom Bun workspaces scaffold** | Minimal, explicit, no hidden magic. Each package gets exactly what it needs. Matches the project's "deliberately simple" philosophy |

### Selected Starter: Custom Bun Workspaces Scaffold

**Rationale:** Herald's architectural philosophy is "the daemon is 95% stupid" — the starter should match that discipline. A clean workspace setup gives each package its own tooling with zero framework assumptions. Shared types flow through a `shared` package. No build orchestration layer needed — Bun workspaces handles dependency linking, individual package scripts handle the rest. Bun's built-in SQLite eliminates the `better-sqlite3` native module dependency entirely, and sqlite-vec is compatible with `bun:sqlite`.

**Initialization:**

```bash
bun init
mkdir -p packages/{daemon,cli,pwa,shared}
```

**Monorepo Structure:**

```
herald/
├── package.json              # Root: workspaces config, shared scripts
├── tsconfig.base.json        # Shared TypeScript config
├── biome.json                # Shared linting/formatting
├── packages/
│   ├── daemon/               # Bun service (<2000 LOC)
│   │   ├── package.json
│   │   ├── tsconfig.json     # Extends base
│   │   └── src/
│   ├── cli/                  # herald CLI tool
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   ├── pwa/                  # Preact PWA
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── src/
│   └── shared/               # Shared types, API contracts
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
├── agents/                   # YAML configs + BMAD persona MDs (not a package)
├── memory/                   # Agent memory directories (not a package)
└── newspaper/                # Typst templates + output (not a package)
```

**Architectural Decisions Provided by Scaffold:**

**Language & Runtime:**
- TypeScript (strict mode) across all packages
- Bun v1.3 as runtime for daemon and CLI (runs .ts files directly)
- Browser target for PWA via Vite

**SQLite:**
- `bun:sqlite` — built-in, zero dependencies, 3-6x faster than better-sqlite3
- `sqlite-vec` — compatible with bun:sqlite for per-agent vector stores
- SQLite FTS5 — cross-agent full-text search via shared index

**Build Tooling:**
- Bun — daemon and CLI run TypeScript directly, no build step needed for dev
- `bun build` — production bundling for daemon and CLI
- Vite + @preact/preset-vite v2.10 — PWA dev server and production builds

**Testing Framework:**
- Vitest v4.0 — shared across all packages, TypeScript-native

**Linting & Formatting:**
- Biome v2.3 — single config at root, covers all packages

**Package Management:**
- Bun v1.3 with workspaces (package.json `workspaces` field)
- `workspace:*` protocol for inter-package dependencies

**Development Experience:**
- `bun --cwd packages/daemon dev` — run daemon in dev mode
- `bun --cwd packages/pwa dev` — Vite dev server with HMR
- `bun --cwd packages/cli dev` — run CLI commands during development
- `bun test` — run Vitest across all packages
- `bun lint` — Biome check across all packages

**Risk Mitigation:**
- Claude Agent SDK compatibility with Bun runtime must be validated in first day of Stage 1
- Fallback: run daemon on Node.js while still using Bun as package manager (zero scaffold changes needed)

**Note:** Project initialization using this scaffold should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Bun v1.3 as runtime + package manager
- bun:sqlite + sqlite-vec + FTS5 for data layer
- Hono for REST API framework
- JSON WebSocket protocol for real-time push
- Claude Agent SDK file I/O scoped by daemon config

**Important Decisions (Shape Architecture):**
- Zod for validation (agent configs, API contracts, agent outputs)
- @preact/signals for PWA state + WebSocket as server state source
- preact-iso for routing
- Tailscale for remote access (no auth layer needed)
- systemd + journalctl for process management and logging

**Deferred Decisions (Post-MVP):**
- API versioning (single consumer for v1)
- Rate limiting (single user)
- Log aggregation / monitoring dashboards
- Offline mutations in PWA

### Data Architecture

| Decision | Choice | Rationale |
|---|---|---|
| Database | bun:sqlite (built-in) | Zero dependencies, 3-6x faster than better-sqlite3, WAL mode for concurrent writes |
| Vector search | sqlite-vec | Compatible with bun:sqlite, per-agent vector stores for RAG semantic search |
| Full-text search | SQLite FTS5 | Shared cross-agent keyword index, <100ms query target |
| ORM | None — raw bun:sqlite queries | Daemon is <2000 LOC, queries are simple, ORM adds abstraction without value |
| Validation | Zod | Runtime validation + TypeScript type inference from single schema definition. Validates agent YAML, API contracts, structured agent outputs |
| Migrations | Numbered SQL files | Small stable schema, no migration framework needed |
| Caching | None for v1 | Single user, SQLite is fast enough |
| Memory librarian | Sole interface to search layer | Agents never query databases directly — ask librarian in natural language, librarian translates to vector similarity + keyword queries |

### Authentication & Security

| Decision | Choice | Rationale |
|---|---|---|
| Authentication | None for v1 | Single operator, localhost-only API |
| Remote access | Tailscale (already in use) | VPN mesh network, phone reaches daemon as if local. Zero code changes to Herald |
| API binding | localhost only (NFR21) | External access via Tailscale, not exposed publicly |
| Credentials | .env file, gitignored (NFR20) | Claude SDK key, calendar tokens, email credentials. Never in agent YAML or persona MD |
| Agent sandboxing | SDK session scoped to designated directories (NFR22) | Daemon configures allowed paths from agent YAML — output_dir, memory paths only |

### API & Communication Patterns

| Decision | Choice | Rationale |
|---|---|---|
| REST framework | Hono | Ultrafast, ~14KB, built for Bun. Fits "daemon is 95% stupid" philosophy |
| WebSocket | Bun native WebSocket + JSON envelope | Bun.serve() websocket handler alongside Hono fetch. Simple typed messages: `{ type, agentId?, payload, timestamp }`. No ws dependency needed |
| Error handling | HTTP status codes + `{ error, detail? }` | No custom error code framework (PRD-specified). 400/404/500 covers v1 |
| Agent file I/O | Claude SDK tools, scoped by daemon | Agents read/write through SDK tool system. Daemon enforces directory boundaries from YAML config |
| Client file access | Hono REST endpoints | Serves PDFs, markdown, logs. Bun.file() for reads, multipart for uploads |
| API documentation | None for v1 | Internal API consumed only by Herald's own surfaces. Zod schemas serve as living documentation |

### Frontend Architecture

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Preact + Vite | Lightweight, React-compatible API, @preact/preset-vite for dev experience |
| State management | @preact/signals | Built-in reactive primitives, zero boilerplate. WebSocket is the "server state" source |
| Routing | preact-iso | Official Preact router, lazy-loaded routes for bundle splitting |
| Markdown rendering | marked (PWA) / marked-terminal (CLI) | Common parsing config in shared package, different renderers per surface |
| Styling | Tailwind CSS | Utility-first, fast to build, Vite plugin support |
| Offline strategy | Service worker caches last newspaper + todos | Read-only offline. "Last synced" indicator. No offline mutations |
| Data fetching | REST on load, WebSocket for updates | No React Query/SWR. Daemon is single source of truth, pushes updates |

### Infrastructure & Deployment

| Decision | Choice | Rationale |
|---|---|---|
| Process management | systemd service | Restart=always, RestartSec=5. Bun runs .ts directly — no build step for production |
| Daemon logging | systemd journal (journalctl) | console.log/error/warn, systemd captures stdout/stderr. No logging framework |
| Conversation logging | Markdown files on filesystem (FR59) | Full transcripts, browsable via CLI and PWA |
| Configuration | .env (secrets) + herald.config.yaml (daemon) + agent YAMLs (per-agent) | Secrets gitignored, everything else version controlled |
| Newspaper versioning | Orphan git branch | Dedicated `newspaper` branch, agent-authored commit messages, never merges to main |

### Decision Impact Analysis

**Implementation Sequence:**
1. Bun workspace scaffold + shared package with Zod schemas
2. Daemon core: Hono server + WebSocket + systemd unit
3. bun:sqlite + sqlite-vec + FTS5 setup
4. Claude SDK integration + session manager
5. Agent auto-discovery (chokidar) + YAML validation (Zod)
6. CLI basic commands
7. PWA scaffold (Preact + Vite + preact-iso)

**Cross-Component Dependencies:**
- Zod schemas in `shared` package → consumed by daemon (validation), CLI (display), PWA (type safety)
- WebSocket message types in `shared` → daemon sends, PWA/CLI consume
- Agent YAML schema (Zod) → daemon validates on discovery, orchestrator validates on creation
- Markdown format conventions → agents produce, marked parses, all surfaces render

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Code (TypeScript):**
- Variables / functions: `camelCase` — `getAgentStatus`, `runPatrol`, `sessionLimit`
- Types / interfaces / classes: `PascalCase` — `AgentConfig`, `PatrolReport`, `SessionManager`
- Constants: `SCREAMING_SNAKE_CASE` only for true constants — `MAX_SESSION_INTERACTIONS`, `DEFAULT_PORT`
- Enums: `PascalCase` name, `PascalCase` members — `enum RunStatus { Success, Failed, Running }`

**Files & Directories:**
- All files: `kebab-case` — `agent-manager.ts`, `session-handler.ts`, `patrol-report.ts`
- Test files: co-located, same name with `.test.ts` suffix — `agent-manager.test.ts`
- Index files: `index.ts` per directory, re-exports public API only

**SQLite:**
- Tables: `snake_case`, plural — `agent_runs`, `fts_entries`, `vector_embeddings`
- Columns: `snake_case` — `agent_id`, `created_at`, `run_status`
- Indexes: `idx_{table}_{column}` — `idx_agent_runs_agent_id`

**REST API:**
- Endpoints: kebab-case, plural nouns — `/agents`, `/agents/:name/runs`, `/newspaper/editions`
- Query params: `camelCase` — `?agentName=`, `?startDate=`
- No trailing slashes

**JSON (API responses, WebSocket payloads):**
- All fields: `camelCase` — `{ agentId, runStatus, createdAt }`
- Matches TypeScript conventions, no translation layer needed

**WebSocket Event Types:**
- `snake_case` — `agent_status`, `newspaper_update`, `todo_change`
- Distinguishes event types from code identifiers visually

**Agent YAML Config Keys:**
- `snake_case` — `session_limit`, `notify_policy`, `output_dir`
- Standard YAML convention

**Environment Variables:**
- `SCREAMING_SNAKE_CASE` — `CLAUDE_API_KEY`, `HERALD_PORT`, `HERALD_DATA_DIR`
- Prefixed with `HERALD_` for daemon config, unprefixed for third-party keys

### Structure Patterns

**Package Organization (within each package):**
- Organize by feature/domain, not by type
- Daemon: `src/scheduler/`, `src/watcher/`, `src/session/`, `src/memory/`, `src/api/`, `src/events/`
- NOT: `src/controllers/`, `src/services/`, `src/models/`
- Each domain directory contains its own types, handlers, and tests

**Test Placement:**
- Co-located with source: `agent-manager.ts` + `agent-manager.test.ts` in same directory
- No separate `__tests__/` or `test/` directories
- Integration tests in `packages/{package}/src/__integration__/` (rare, only for cross-module flows)

**Shared Package:**
- All cross-package types in `packages/shared/src/`
- Never duplicate types between packages
- Organized by domain: `shared/src/agents/`, `shared/src/api/`, `shared/src/ws/`, `shared/src/memory/`

**Index Files:**
- Every directory gets `index.ts` that re-exports public API
- Internal modules not re-exported stay private to that directory
- Package entry point is `packages/{package}/src/index.ts`

### Format Patterns

**API Responses:**
- Success: direct JSON data, no wrapper — `{ agents: [...] }` not `{ data: { agents: [...] } }`
- Error: `{ error: string, detail?: string }` with appropriate HTTP status code
- Empty success: 204 No Content (for DELETE, complete actions)
- Created: 201 with created resource in body

**Dates:**
- ISO 8601 strings everywhere — `2026-02-28T06:30:00Z`
- No Unix timestamps, no custom formats
- Always UTC in storage and API, local timezone rendering in UI only

**Null Handling:**
- Use `null` in JSON, never `undefined` in API responses
- Omit optional fields entirely rather than sending `null` when not applicable
- In TypeScript: `field?: string` for optional, `field: string | null` for nullable

**IDs:**
- Agent names are the ID: string, kebab-case — `ml-researcher`, `compute-researcher`
- No UUIDs for agents
- Database rows: auto-increment integers for internal references
- Newspaper editions: date-based — `2026-02-28`

### Communication Patterns

**WebSocket Protocol:**
- Every message follows typed envelope: `{ type: string, agentId?: string, payload: unknown, timestamp: string }`
- Each `type` has a corresponding Zod schema in shared package
- Clients receive all events (single user), filter client-side if needed

**Daemon Internal Events:**
- EventEmitter pattern — typed events
- All trigger sources (cron tick, file change, API request, agent-initiated) emit into single event pipeline
- One dispatcher handles routing to appropriate handler
- Loop prevention: track event chain depth, reject beyond threshold

**PWA State:**
- `@preact/signals` for all UI state
- WebSocket pushes are the "server state" source — never fetch what WebSocket already pushed
- REST calls only for: initial page load, explicit user actions (trigger run, complete todo)
- No client-side data cache layer (no React Query, no SWR)

### Process Patterns

**Error Handling — Daemon:**
- try/catch at agent session boundary — never let agent errors propagate to daemon crash
- On agent failure: log error, update agent status to `failed`, emit failure event, notify if configured
- Never retry automatically — no infinite loops (PRD-specified)
- Distinguish "failed to start" vs "started but didn't finish" (FR61)

**Error Handling — API:**
- Hono error middleware catches unhandled errors → 500 + `{ error: "Internal server error" }`
- Never leak stack traces in API responses
- Zod validation errors → 400 + `{ error: "Validation error", detail: formatted_zod_error }`

**Error Handling — PWA:**
- Component-level error boundaries
- Show user-friendly message + retry button
- Log to console for debugging

**Loading States — PWA:**
- Per-component, not global — signal-based: `const loading = signal(false)`
- Skeleton UI for initial page load
- Inline spinner for user-initiated actions
- Never block the entire UI

**Logging Levels:**
- `console.error` — failures requiring attention (agent crash, DB error, SDK failure)
- `console.warn` — recoverable issues (invalid agent YAML skipped, reconnection)
- `console.log` — operational events (agent started, schedule fired, newspaper compiled)
- No debug-level logging in production

### Herald-Specific Patterns

**Agent Output Format:**
All agent-produced content is markdown with YAML frontmatter:
```markdown
---
agent: ml-researcher
type: patrol-report
timestamp: 2026-02-28T05:30:00Z
---
# Report content here
```

**Agent YAML Validation:**
- Every agent YAML is Zod-validated on discovery AND on hot reload
- Invalid YAML = log warning + skip agent registration
- Never crash daemon on bad agent config

**Session Continuity:**
- `last-jobs.md` per agent, consistent format
- Contains: what agent was working on, timestamp, conversation summary pointer
- Loaded into next session's system prompt for natural continuity

**Markdown Conventions:**
- `##` for major sections, `###` for subsections
- Tables for structured/comparative data
- Code blocks with language tags for technical content
- No raw HTML in markdown — agents produce clean, parseable markdown only
- Frontmatter required on all agent-produced files

### Enforcement Guidelines

**All AI Agents Implementing Herald MUST:**
- Follow naming conventions exactly — no exceptions for "personal preference"
- Co-locate tests with source files
- Use Zod schemas from shared package — never inline type validation
- Handle errors at session boundaries — never let exceptions propagate
- Produce markdown with YAML frontmatter for all agent output files
- Use the EventEmitter pipeline for all internal daemon events — no direct function calls between subsystems

**Pattern Verification:**
- Biome enforces code formatting and naming lint rules
- Zod schemas enforce data shape at runtime
- TypeScript strict mode catches type violations at compile time
- Code review (manual) catches structural violations

## Project Structure & Boundaries

### Complete Project Directory Structure

```
herald/
├── package.json                          # Root: workspaces config, shared scripts
├── tsconfig.base.json                    # Shared TypeScript strict config
├── biome.json                            # Shared linting/formatting rules
├── .env                                  # Secrets (gitignored): CLAUDE_API_KEY, etc.
├── .env.example                          # Template with required env vars
├── .gitignore
├── herald.config.yaml                    # Daemon config: port, paths, defaults
│
├── packages/
│   ├── daemon/                           # Bun service (<2000 LOC) — FR54-64
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                  # Entry point: Hono server + WebSocket + boot
│   │       ├── config.ts                 # Load herald.config.yaml + env vars
│   │       │
│   │       ├── api/                      # REST API — FR57
│   │       │   ├── index.ts              # Hono app, middleware, error handler
│   │       │   ├── agents.ts             # GET/POST /agents, /agents/:name/*
│   │       │   ├── newspaper.ts          # GET /newspaper/current, /editions
│   │       │   ├── todos.ts              # GET/PATCH /todos
│   │       │   ├── projects.ts           # GET /projects, /projects/:name
│   │       │   ├── chat.ts              # POST /chat (streamed agent response)
│   │       │   ├── logs.ts               # GET /logs
│   │       │   ├── schedule.ts           # GET/PATCH /schedule
│   │       │   └── system.ts             # GET /health, /status
│   │       │
│   │       ├── ws/                       # WebSocket server — FR58
│   │       │   ├── index.ts              # Bun native WebSocket handler
│   │       │   └── broadcast.ts          # Typed event broadcast to all clients
│   │       │
│   │       ├── events/                   # Event pipeline — unified dispatch
│   │       │   ├── index.ts              # EventEmitter setup, typed events
│   │       │   ├── dispatcher.ts         # Route events to handlers
│   │       │   └── loop-guard.ts         # Chain depth tracking, loop prevention
│   │       │
│   │       ├── scheduler/                # Cron scheduling — FR55
│   │       │   ├── index.ts              # node-cron manager
│   │       │   └── schedule-registry.ts  # Track agent schedules, hot-reload
│   │       │
│   │       ├── watcher/                  # Filesystem watching — FR1-2, FR56
│   │       │   ├── index.ts              # Bun fs.watch() setup
│   │       │   ├── agent-discovery.ts    # Watch agents/, auto-register — FR1-2
│   │       │   └── trigger-engine.ts     # File triggers with conditions — FR56
│   │       │
│   │       ├── session/                  # Claude SDK integration — FR8-11, FR40-41
│   │       │   ├── index.ts              # Session create/resume/track/recover
│   │       │   ├── session-manager.ts    # Lifecycle, bounding, health — NFR6, NFR8
│   │       │   ├── team-orchestration.ts # Team sessions, agent summoning — FR10, FR18
│   │       │   └── persona-loader.ts     # BMAD persona + knowledge injection
│   │       │
│   │       ├── memory/                   # Memory stack — FR33-41
│   │       │   ├── index.ts              # Memory subsystem init
│   │       │   ├── db.ts                 # bun:sqlite setup, WAL mode, migrations
│   │       │   ├── fts.ts                # FTS5 shared index operations — FR37-39
│   │       │   ├── vectors.ts            # sqlite-vec per-agent stores — FR36
│   │       │   └── librarian.ts          # Post-run indexing interface — FR37-38
│   │       │
│   │       ├── notification/             # Notification system — FR45-48
│   │       │   ├── index.ts              # notify(urgency, message) primitive
│   │       │   ├── adapters/
│   │       │   │   ├── browser-push.ts   # Web Push API adapter
│   │       │   │   ├── terminal-bell.ts  # Terminal bell adapter
│   │       │   │   └── websocket.ts      # WebSocket event adapter
│   │       │   └── urgency-gate.ts       # Urgency evaluation + user prefs
│   │       │
│   │       ├── newspaper/                # Newspaper pipeline — FR18-25
│   │       │   ├── index.ts              # Pipeline orchestration
│   │       │   ├── typst-compiler.ts     # Subprocess: markdown → Typst → PDF/HTML
│   │       │   └── git-versioner.ts      # Commit to newspaper orphan branch
│   │       │
│   │       ├── agent-loader/             # Agent definition system — FR1-4
│   │       │   ├── index.ts              # Agent registry
│   │       │   ├── yaml-parser.ts        # Parse + Zod validate agent YAML
│   │       │   └── agent-registry.ts     # In-memory registry of active agents
│   │       │
│   │       └── logger/                   # Conversation logging — FR59-61
│   │           ├── index.ts              # Log writer
│   │           └── transcript-writer.ts  # Agent conversation → markdown file
│   │
│   ├── cli/                              # herald CLI tool
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                  # Entry point: Commander.js setup
│   │       ├── client.ts                 # HTTP + WebSocket client to daemon
│   │       ├── render/
│   │       │   ├── markdown.ts           # Terminal markdown rendering (marked-terminal)
│   │       │   ├── table.ts              # Status tables, agent lists
│   │       │   └── spinner.ts            # Loading indicators
│   │       └── commands/
│   │           ├── status.ts             # herald status
│   │           ├── paper.ts              # herald paper [--history|--weekly]
│   │           ├── agents.ts             # herald agents
│   │           ├── agent.ts              # herald agent <name> (interactive chat)
│   │           ├── run.ts                # herald run <agent>
│   │           ├── todo.ts               # herald todo
│   │           ├── projects.ts           # herald projects
│   │           ├── project.ts            # herald project <name>
│   │           ├── logs.ts               # herald logs
│   │           ├── schedule.ts           # herald schedule
│   │           ├── comms.ts              # herald comms
│   │           ├── new-agent.ts          # herald new-agent
│   │           └── notify.ts             # herald notify
│   │
│   ├── pwa/                              # Preact PWA
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── index.html
│   │   └── src/
│   │       ├── index.tsx                 # Entry point
│   │       ├── app.tsx                   # Root component, preact-iso router
│   │       ├── sw.ts                     # Service worker: offline caching
│   │       ├── ws-client.ts              # WebSocket connection + reconnect
│   │       ├── api-client.ts             # REST client for initial loads
│   │       ├── pages/
│   │       │   ├── home.tsx              # Paper headline + todo summary + notifications
│   │       │   ├── newspaper.tsx         # Full newspaper viewer, edition history
│   │       │   ├── chat.tsx              # Markdown chat, agent switching
│   │       │   ├── agents.tsx            # Agent cards, status, tap to interact
│   │       │   ├── todos.tsx             # Smart todo list, complete actions
│   │       │   ├── projects.tsx          # Project list + status cards
│   │       │   ├── logs.tsx              # Conversation transcript browser
│   │       │   └── settings.tsx          # Schedules, notification prefs
│   │       ├── components/
│   │       │   ├── layout.tsx            # App shell, nav, offline indicator
│   │       │   ├── markdown-view.tsx     # marked renderer component
│   │       │   ├── agent-card.tsx        # Agent status card
│   │       │   ├── todo-item.tsx         # Todo list item with complete action
│   │       │   ├── notification.tsx      # In-app notification display
│   │       │   └── error-boundary.tsx    # Component error boundary
│   │       └── styles/
│   │           └── global.css            # Tailwind base + global styles
│   │
│   └── shared/                           # Shared types & contracts
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts                  # Re-exports everything
│           ├── schemas/
│           │   ├── agent-config.ts       # Zod schema for agent YAML
│           │   ├── api-responses.ts      # Zod schemas for all API responses
│           │   ├── ws-messages.ts        # Zod schemas for WebSocket message types
│           │   ├── agent-output.ts       # Zod schema for agent-produced markdown frontmatter
│           │   └── herald-config.ts      # Zod schema for herald.config.yaml
│           ├── types/
│           │   └── index.ts              # z.infer<> types re-exported
│           └── constants/
│               └── index.ts              # Shared constants (event types, status enums)
│
├── agents/                               # Agent definitions (not a package)
│   ├── ml-researcher.yaml
│   ├── compute-researcher.yaml
│   ├── ai-tooling-researcher.yaml
│   ├── geopolitical-monitor.yaml
│   ├── competition-researcher.yaml
│   ├── news-digest.yaml
│   ├── newspaper.yaml
│   ├── smart-todo.yaml
│   ├── comms.yaml
│   ├── project-portal.yaml
│   ├── memory-librarian.yaml
│   ├── orchestrator.yaml
│   └── brainstorming.yaml
│
├── personas/                             # BMAD persona MDs (not a package)
│   ├── ml-researcher.md
│   ├── compute-researcher.md
│   ├── ai-tooling-researcher.md
│   ├── geopolitical-monitor.md
│   ├── competition-researcher.md
│   ├── news-digest.md
│   ├── newspaper.md
│   ├── smart-todo.md
│   ├── comms.md
│   ├── project-portal.md
│   ├── memory-librarian.md
│   ├── orchestrator.md
│   └── brainstorming.md
│
├── reports/                              # Agent output (per-agent dirs, partially gitignored)
│   ├── ml-researcher/                    # All ML researcher patrol reports
│   │   └── {timestamp}.md
│   ├── compute-researcher/
│   ├── ai-tooling-researcher/
│   ├── geopolitical-monitor/
│   ├── competition-researcher/
│   ├── news-digest/
│   ├── newspaper/                        # Newspaper synthesis session outputs
│   ├── smart-todo/                       # Daily todo lists
│   ├── comms/                            # Email summaries, draft responses
│   ├── memory-librarian/                 # Indexing run logs
│   ├── orchestrator/                     # Orchestrator session outputs
│   ├── project-portal/                   # Project onboarding summaries
│   └── brainstorming/                    # Structured idea files
│       └── idea-{date}-{slug}.md         # Promotable to full BMAD projects
│
├── memory/                               # Agent memory (gitignored)
│   ├── agents/
│   │   ├── ml-researcher/
│   │   │   ├── knowledge.md              # Hot memory (depreciating)
│   │   │   ├── preferences.md            # User steering
│   │   │   ├── last-jobs.md              # Session continuity
│   │   │   └── rag/                      # sqlite-vec vector store
│   │   └── [same structure per agent]/
│   ├── shared/
│   │   ├── index.sqlite                  # Cross-agent FTS5 index
│   │   └── connections.md                # Librarian's cross-domain narrative
│   ├── conversations/                    # Agent-to-agent transcripts
│   │   └── {date}-{description}.md
│   └── user/
│       ├── preferences.md                # Global user preferences
│       └── projects.md                   # Registered BMAD projects
│
├── newspaper/                            # Newspaper output (not a package)
│   ├── templates/
│   │   └── newspaper.typ                 # Typst template
│   ├── editions/
│   │   └── {date}/                       # Per-edition compiled output
│   │       ├── newspaper.pdf
│   │       ├── newspaper.html
│   │       └── sources/                  # Agent-authored markdown sections
│   └── weekly/
│       └── {date}-weekly.pdf
│
├── data/                                 # SQLite databases (gitignored)
│   ├── herald.sqlite                     # Agent runs, schedules, status
│   └── migrations/
│       ├── 001-init.sql
│       └── 002-fts-index.sql
│
└── systemd/
    └── herald.service                    # systemd unit file
```

### Architectural Boundaries

**API Boundary (daemon ↔ clients):**
The Hono REST API + WebSocket server is the single integration boundary. CLI and PWA are thin clients — zero business logic. All state mutations go through the API. All real-time updates flow through WebSocket.

**SDK Boundary (daemon ↔ agents):**
The session manager is the sole interface between daemon infrastructure and Claude SDK. Agent sessions are isolated — each gets its own persona, knowledge, and scoped file access. The daemon never reaches into an active session.

**Memory Boundary (agents ↔ data):**
Agents access knowledge through two paths:
1. Direct: their own `knowledge.md` and `last-jobs.md` (loaded into session context)
2. Librarian-mediated: cross-agent search via FTS5 + sqlite-vec (agent asks librarian, librarian queries DBs)

The daemon's `memory/` module handles DB setup and librarian indexing. Agents never touch SQLite directly.

**Event Boundary (triggers ↔ handlers):**
All trigger types (cron, file, user, agent-initiated) flow through `events/dispatcher.ts`. Handlers are registered by subsystem. Loop guard prevents recursive chains.

**Report Boundary (agents ↔ output):**
Every agent writes full output to `reports/{agent-name}/{timestamp}.md`. The agent also produces a concise summary pushed to clients via WebSocket. The memory librarian reads the full report post-run, vectorizes it into the agent's RAG store, and extracts entities into the shared FTS5 index. Full reports stay on disk for browsing; summaries are the real-time interface.

### Agent Output Flow

```
Agent runs (patrol, chat, task)
    │
    ├── Produces full output → reports/{agent-name}/{timestamp}.md
    │   (markdown with YAML frontmatter)
    │
    ├── Sends concise summary → daemon → WebSocket → PWA/CLI
    │   (real-time notification to operator)
    │
    └── Memory librarian triggers post-run:
        ├── Reads full report from reports/{agent-name}/
        ├── Vectorizes content → memory/agents/{name}/rag/ (sqlite-vec)
        ├── Extracts entities → memory/shared/index.sqlite (FTS5)
        └── Updates memory/agents/{name}/knowledge.md (hot memory)
```

### FR Category → Directory Mapping

| FR Category | Primary Location | Supporting Locations |
|---|---|---|
| Agent Management (FR1-11) | `daemon/src/agent-loader/`, `daemon/src/watcher/agent-discovery.ts` | `daemon/src/session/`, `shared/src/schemas/agent-config.ts` |
| Research & Intelligence (FR12-17) | `agents/*.yaml`, `personas/*.md`, `reports/` | `daemon/src/scheduler/` (parallel patrol execution) |
| Newspaper & Publishing (FR18-25) | `daemon/src/newspaper/`, `newspaper/` | `daemon/src/session/team-orchestration.ts` |
| Task Management (FR26-32) | `agents/smart-todo.yaml`, `personas/smart-todo.md`, `reports/smart-todo/` | `daemon/src/api/todos.ts`, `pwa/src/pages/todos.tsx` |
| Memory & Knowledge (FR33-41) | `daemon/src/memory/`, `memory/` | `shared/src/schemas/agent-output.ts`, `reports/` (source for indexing) |
| Communication & Notifications (FR42-48) | `daemon/src/notification/`, `agents/comms.yaml`, `reports/comms/` | `daemon/src/ws/broadcast.ts` |
| Project Management (FR49-53) | `agents/orchestrator.yaml`, `agents/project-portal.yaml`, `agents/brainstorming.yaml` | `reports/brainstorming/` (idea files), `daemon/src/api/projects.ts` |
| System Operations (FR54-64) | `daemon/src/` (all subsystems) | `systemd/herald.service`, `data/` |

### Data Flow

```
                    ┌─────────────────────────────┐
                    │         PWA / CLI            │
                    │    (thin clients)            │
                    └──────┬──────────┬────────────┘
                      REST │          │ WebSocket
                    ┌──────▼──────────▼────────────┐
                    │      Hono API + ws server     │
                    └──────┬───────────────────────┘
                           │
                    ┌──────▼───────────────────────┐
                    │      Event Dispatcher         │
                    │  (cron/file/api/agent events)  │
                    └──────┬───────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │Scheduler │ │ Watcher  │ │ Session  │
        │(node-cron)│ │(fs.watch)│ │ Manager  │
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │             │            │
             └─────────────┼────────────┘
                           │
                    ┌──────▼───────────────────────┐
                    │    Claude SDK Sessions        │
                    │  (BMAD personas + knowledge)  │
                    └──────┬───────────────────────┘
                           │ produces output
                    ┌──────▼───────────────────────┐
                    │    reports/{agent-name}/      │
                    │  (full markdown + frontmatter) │
                    └──────┬───────────────────────┘
                           │ triggers librarian
                    ┌──────▼───────────────────────┐
                    │    Memory Stack               │
                    │  (FTS5 + sqlite-vec + SQLite) │
                    └──────────────────────────────┘
```

### External Integration Points

| Integration | Protocol | Location | Stage |
|---|---|---|---|
| Claude Agent SDK V2 | TypeScript SDK | `daemon/src/session/` | Stage 1 |
| Typst compiler | Subprocess CLI | `daemon/src/newspaper/typst-compiler.ts` | Stage 1 |
| Git (newspaper) | Subprocess CLI | `daemon/src/newspaper/git-versioner.ts` | Stage 1 |
| Calendar API | REST/OAuth | `daemon/src/api/` (consumed by smart-todo agent) | Stage 3 |
| Email inbox | IMAP/REST | Consumed by comms agent via SDK tools | Stage 3 |
| Web Push API | HTTP | `daemon/src/notification/adapters/browser-push.ts` | Stage 3 |
| Ollama | REST API (localhost:11434) | `daemon/src/memory/vectors.ts` (embedding calls) | Stage 1 |
| Tailscale | Network layer | No code — infrastructure only | Stage 3 |

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:** All technology choices work together without conflicts. Bun runtime + Hono HTTP + Bun native WebSocket + bun:sqlite + sqlite-vec + Ollama embeddings + Preact/Vite/Tailwind form a coherent, minimal-dependency stack. Three simplifications identified and applied during validation:
- `ws` library → Bun native WebSocket (eliminated dependency)
- `chokidar` → Bun `fs.watch()` (eliminated dependency, chokidar as fallback)
- Embedding model → Ollama as external service (keeps ML code out of daemon)

**Pattern Consistency:** All naming conventions (camelCase code, snake_case SQL/YAML/events, kebab-case files/endpoints) are internally consistent. No contradictions found across all pattern categories.

**Structure Alignment:** Project structure supports all architectural decisions. Boundaries are clean — daemon stays under 2000 LOC by design, all intelligence lives in personas, all state flows through defined boundaries.

### Requirements Coverage Validation

**Functional Requirements (FR1-FR64):** All 64 FRs have architectural support. Every FR category maps to specific directories and components in the project structure.

**Non-Functional Requirements (NFR1-NFR27):** All 27 NFRs are addressed:
- Reliability (NFR1-7): systemd auto-restart, WAL mode, failure isolation at session boundary
- Performance (NFR8-14): Bun native runtime, bun:sqlite built-in, Ollama GPU-accelerated embeddings
- Integration (NFR15-19): Subprocess isolation for Typst/git, SDK error handling in session manager
- Security (NFR20-23): .env secrets, localhost binding, SDK session scoping
- Maintainability (NFR24-27): <2000 LOC enforced by architecture, declarative agent system, self-contained personas

### Implementation Readiness Validation

**Decision Completeness:** All critical and important decisions are documented with specific technology choices and versions. No blocking gaps remain.

**Structure Completeness:** Complete directory structure defined with every file and directory mapped to specific functional requirements.

**Pattern Completeness:** All potential AI agent conflict points addressed — naming, structure, format, communication, and process patterns fully specified with examples.

### Gaps Resolved During Validation

| Gap | Resolution |
|---|---|
| Embedding model for RAG | Ollama service + nomic-embed-text (GPU-accelerated, background systemd service) |
| PWA styling approach | Tailwind CSS |
| WebSocket reliability | Bun native WebSocket alongside Hono HTTP (not Hono's WebSocket helper) |
| File watcher dependency | Bun native fs.watch() (chokidar as fallback) |

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed (64 FRs, 27 NFRs)
- [x] Scale and complexity assessed (medium-high)
- [x] Technical constraints identified (2000 LOC, single operator, 4-stage build)
- [x] Cross-cutting concerns mapped (7 concerns)

**Architectural Decisions**
- [x] Critical decisions documented with versions (Bun 1.3, Hono, bun:sqlite, Preact, Vitest 4.0, Biome 2.3)
- [x] Technology stack fully specified across all 5 decision categories
- [x] Integration patterns defined (API boundary, SDK boundary, memory boundary, event boundary, report boundary)
- [x] Performance considerations addressed (all NFR8-14 targets)

**Implementation Patterns**
- [x] Naming conventions established (code, files, SQL, API, JSON, WebSocket, YAML, env vars)
- [x] Structure patterns defined (feature-based organization, co-located tests, shared package)
- [x] Communication patterns specified (WebSocket envelope, EventEmitter pipeline, PWA signals)
- [x] Process patterns documented (error handling per layer, loading states, logging levels)
- [x] Herald-specific patterns defined (agent output format, YAML validation, session continuity, markdown conventions)

**Project Structure**
- [x] Complete directory structure defined (4 packages + 6 non-package directories)
- [x] Component boundaries established (5 architectural boundaries)
- [x] Integration points mapped (7 external integrations with stages)
- [x] Requirements to structure mapping complete (all 8 FR categories mapped)

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High — all requirements covered, all gaps resolved, all patterns defined

**Key Strengths:**
- Two-body architecture enforced by 2000 LOC budget — intelligence stays in personas, not code
- Minimal dependency footprint — Bun native features replace ws, chokidar; Ollama replaces in-process ML
- Clean boundaries — 5 well-defined architectural boundaries prevent subsystem coupling
- Incremental build — 4-stage delivery where each stage is independently useful
- Declarative agent system — adding capability = adding files, never adding code

**Areas for Future Enhancement:**
- API versioning when/if external consumers appear
- Rate limiting if multi-user support is added
- Log aggregation dashboard for operational monitoring
- Offline mutations in PWA if offline-first becomes a priority

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions
- Validate agent YAML configs with Zod schemas from shared package
- Keep daemon under 2000 LOC — if approaching limit, refactor intelligence into personas

**First Implementation Priority:**
1. Bun workspace scaffold (package.json, tsconfig.base.json, biome.json)
2. Shared package with Zod schemas (agent config, API responses, WebSocket messages)
3. Daemon skeleton: Bun.serve() with Hono HTTP + native WebSocket
4. Validate Claude Agent SDK V2 compatibility with Bun runtime

**Infrastructure Prerequisites:**
- Bun v1.3+ installed
- Ollama installed and running as systemd service with `nomic-embed-text` model pulled
- Typst installed (pacman)
- Tailscale configured (already in use)

