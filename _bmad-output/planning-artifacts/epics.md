---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/brainstorming/brainstorming-session-2026-02-27.md
  - _bmad-output/planning-artifacts/research/technical-herald-tech-stack-research-2026-02-27.md
---

# Herald - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Herald, decomposing the requirements from the PRD, Architecture, brainstorming, and technical research into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: The daemon can auto-discover agent definitions (YAML + persona MD) from the agents directory without restart
FR2: The daemon can hot-reload agent configurations when files are modified
FR3: The operator can create a new agent by describing it in natural language to the orchestrator
FR4: The orchestrator can generate a complete agent definition (YAML config + BMAD persona MD) and write it to the agents directory
FR5: The operator can trigger an immediate manual run of any agent
FR6: The operator can view the status of all agents (last run, next scheduled, success/failure)
FR7: The operator can view and modify agent schedules
FR8: The operator can chat interactively with any specific agent
FR9: Agents can spawn subagents for parallel subtasks within their session
FR10: Agents can initiate team sessions, summoning other agents for collaborative work
FR11: Agents can autonomously initiate inter-agent communication when they detect domain overlap
FR12: Research agents can patrol their assigned domains on a configurable cron schedule
FR13: Research agents can produce structured research reports as markdown output
FR14: Research agents can develop and maintain opinions with confidence calibration
FR15: Research agents can record explicit predictions with supporting evidence and timestamps
FR16: Research agents can proactively advocate for changes to the operator's setup, tooling, or workflow when they spot relevant advancements
FR17: The system can run multiple research patrols in parallel
FR18: The newspaper agent can summon research agents as a team for collaborative synthesis
FR19: The newspaper agent can produce a designed publication from synthesized research
FR20: The system can compile newspaper markdown through Typst into PDF/HTML output
FR21: The system can version newspaper editions via git on a dedicated branch
FR22: Featured stories in the newspaper can trigger full dedicated research reports
FR23: The operator can view the current newspaper edition
FR24: The operator can browse past newspaper editions and weekly synthesis papers
FR25: The newspaper can update immediately when breaking/urgent events are detected
FR26: The smart todo agent can generate a daily task list from project state and backlog
FR27: The smart todo agent can incorporate calendar schedule and time windows into task scoping
FR28: The smart todo agent can incorporate inbox state and flagged emails into task prioritization
FR29: The smart todo agent can consult project PM agents for context-aware next actions when no explicit backlog exists
FR30: The operator can view, complete, and update tasks
FR31: The system can deliver midday check-in notifications on task progress
FR32: The todo list can dynamically adjust throughout the day as tasks complete or schedule changes
FR33: Each agent can maintain a persistent knowledge.md with domain knowledge, opinions, predictions, and accountability sections
FR34: Agent hot memory can depreciate in importance over time unless reinforced
FR35: Agents can explicitly reinforce knowledge items to prevent decay
FR36: Each agent can store and retrieve long-term knowledge via per-agent RAG vector stores
FR37: The memory librarian can index all agent knowledge into a shared SQLite FTS5 index after every agent run
FR38: The memory librarian can extract entities and vectorize content for cross-agent discovery
FR39: Agents can query the shared index for cross-domain knowledge discovery
FR40: Agent sessions can save state and conversation summaries for continuity across runs
FR41: New agent sessions can load previous state to resume work naturally
FR42: The comms agent can monitor an email inbox for new messages
FR43: The comms agent can evaluate email urgency and flag important messages
FR44: The comms agent can draft responses for operator review
FR45: The system can deliver push notifications gated by agent-judged urgency
FR46: The operator can configure notification preferences and urgency thresholds
FR47: The system can deliver notifications through multiple adapters (browser push, terminal bell, WebSocket)
FR48: The system can notify the operator when an agent run fails
FR49: The project portal agent can onboard into any BMAD project by interrogating its existing context
FR50: The operator can view status cards for all registered projects
FR51: The operator can query and interact with any registered project through the orchestrator
FR52: The operator can capture ideas through brainstorming sessions and save them as structured files
FR53: The operator can promote a structured idea to a full BMAD project
FR54: The daemon can run continuously as a systemd service with auto-restart on failure
FR55: The daemon can execute scheduled agent runs via configurable cron expressions
FR56: The daemon can watch filesystem paths with conditions and trigger agent activations
FR57: The daemon can serve a REST API for CLI and PWA consumption
FR58: The daemon can maintain WebSocket connections for real-time push to connected clients
FR59: The system can persist all agent-to-agent conversation transcripts for browsing
FR60: The operator can browse conversation logs via CLI and PWA
FR61: The system can distinguish between "agent failed to start" and "agent started but didn't finish" for different recovery paths
FR62: The PWA can cache the last newspaper edition and current todo list for offline viewing
FR63: The CLI can output structured JSON for scripting via --json flag
FR64: The CLI can provide zsh shell completion for all commands

### NonFunctional Requirements

NFR1: The daemon must maintain continuous uptime via systemd auto-restart — crashes are exceptional events, recovery is automatic
NFR2: Agent patrol completion rate must be 100% — every scheduled run fires and produces output
NFR3: Zero data loss — agent memory, conversation logs, project state, and newspaper editions must always be persisted to disk before acknowledgment
NFR4: The newspaper must be ready before 6:30 AM every day — the daily ritual depends on this deadline
NFR5: Failed agent sessions must not affect other agents or daemon stability — failure isolation between agents
NFR6: The daemon must recover gracefully from Claude SDK session failures without manual intervention
NFR7: SQLite database operations must use WAL mode and proper transaction boundaries to prevent corruption under concurrent agent writes
NFR8: Agent session startup (resuming existing session): <3 seconds P95
NFR9: Newspaper Typst compilation: <15 seconds
NFR10: WebSocket message delivery to connected clients: <500ms
NFR11: CLI command response (non-agent commands): <1 second
NFR12: Research patrol cycle (6 agents in parallel): <20 minutes total
NFR13: SQLite FTS5 full-text search queries: <100ms for cross-agent knowledge lookups
NFR14: Daemon memory footprint: <200MB baseline (excluding active Claude SDK sessions)
NFR15: Calendar API integration must handle API rate limits and authentication token refresh without agent awareness
NFR16: Email inbox polling must handle connection failures gracefully with exponential backoff — missed polls are retried, not dropped
NFR17: Claude SDK session management must handle API errors, rate limits, and service interruptions with automatic retry and session recovery
NFR18: Typst compilation must be invoked as a subprocess — compilation failures must not crash the daemon
NFR19: Git operations for newspaper versioning must handle merge conflicts and dirty state without manual intervention
NFR20: API keys and credentials (Claude SDK, email, calendar) must be stored in environment variables or a secrets file excluded from version control — never in agent YAML or persona MD
NFR21: The REST API must bind to localhost only by default — external access requires explicit configuration
NFR22: Agent-generated content must not be able to modify daemon configuration or execute system commands — agents operate within their sandbox (file writes to designated directories only)
NFR23: Conversation logs containing potentially sensitive email content must be stored with filesystem permissions restricted to the daemon user
NFR24: Daemon codebase must stay under 2000 lines of code — complexity beyond this threshold indicates intelligence leaking out of personas into infrastructure
NFR25: Adding a new agent must require zero code changes — YAML config + persona MD only
NFR26: All daemon configuration must be declarative (YAML/environment variables) — no hardcoded values for schedules, paths, or thresholds
NFR27: Agent persona MDs must be self-contained — an agent's behavior must be fully understandable by reading its YAML + persona without referencing daemon source code

### Additional Requirements

**From Architecture — Starter Template:**
- Custom Bun workspaces scaffold as project foundation (not a third-party starter)
- Monorepo with 4 packages: daemon, cli, pwa, shared
- Bun v1.3 as runtime and package manager
- TypeScript strict mode across all packages
- Project initialization using scaffold must be the first implementation story

**From Architecture — Technology Stack:**
- Hono as REST API framework for daemon
- Bun native WebSocket (not ws library) alongside Hono for real-time push
- bun:sqlite (built-in) for database — WAL mode, numbered SQL migrations
- sqlite-vec for per-agent RAG vector stores
- SQLite FTS5 for cross-agent full-text search
- Ollama (local service, nomic-embed-text model) for RAG vectorization/embeddings
- Zod for runtime validation of agent YAML configs, API contracts, and agent outputs
- node-cron for schedule management
- Bun fs.watch() for filesystem watching (chokidar as fallback)
- Typst for newspaper compilation (subprocess)
- Git orphan branch for newspaper versioning
- Commander.js for CLI framework
- marked (PWA) / marked-terminal (CLI) for markdown rendering
- Preact + Vite + @preact/preset-vite for PWA
- @preact/signals for PWA state management
- preact-iso for PWA routing
- Tailwind CSS for PWA styling
- Vitest v4.0 for testing across all packages
- Biome v2.3 for linting/formatting
- systemd for daemon process management

**From Architecture — Implementation Patterns:**
- Feature-based code organization (not type-based)
- Co-located test files (same-name .test.ts suffix)
- Agent output format: markdown with YAML frontmatter
- Agent YAML validated with Zod on discovery AND hot reload — invalid YAML = skip, never crash
- Session continuity via per-agent last-jobs.md
- Error handling at session boundary — never let agent errors propagate to daemon
- EventEmitter pattern for daemon internal events — all trigger types flow through single dispatcher
- Loop prevention via chain depth tracking
- No authentication for v1 — single operator, localhost only
- Remote access via Tailscale (infrastructure, no code)

**From Architecture — Infrastructure Prerequisites:**
- Bun v1.3+ installed
- Ollama installed and running as systemd service with nomic-embed-text model
- Typst installed
- Tailscale configured

**From Architecture — First Implementation Priority:**
1. Bun workspace scaffold (package.json, tsconfig.base.json, biome.json)
2. Shared package with Zod schemas (agent config, API responses, WebSocket messages)
3. Daemon skeleton: Bun.serve() with Hono HTTP + native WebSocket
4. Validate Claude Agent SDK V2 compatibility with Bun runtime

**From Architecture — 4-Stage Phased Build:**
- Stage 1 (The Loop): Daemon core, agent system, 3 researchers, newspaper agent, memory librarian, basic CLI
- Stage 2 (Intelligence Layer): File trigger engine, remaining 3 researchers, smart todo agent, expanded CLI
- Stage 3 (The Surfaces): PWA, WebSocket push, notifications, calendar/inbox integration, comms agent
- Stage 4 (The Operator): Orchestrator, project portal, agent creation workflow, expanded CLI + PWA

**From Brainstorming — Design Principles:**
- Two-body architecture: dumb daemon (95% stupid), smart personas
- Filesystem as event bus and control plane
- Designed daily ritual as product wedge (not pull-based, push-based)
- Depreciating memory with RAG recall (~5%/day decay unless reinforced)
- BMAD persona injection into SDK sessions
- Living newspaper (continuously updated, not just daily edition)
- Bounded session persistence (N interactions then save + exit)

**From Technical Research — Validation:**
- Claude SDK V2 persistent sessions validated (30+ hours sustained operation)
- TypeScript/Bun validated as correct runtime choice
- bun:sqlite 3-6x faster than better-sqlite3 validated
- Ollama + nomic-embed-text validated for embedding generation

### FR Coverage Map

FR1: Epic 1 — Agent auto-discovery from agents directory
FR2: Epic 1 — Hot-reload agent configs on file change
FR3: Epic 10 — Natural language agent creation via orchestrator
FR4: Epic 10 — Orchestrator generates complete agent definition
FR5: Epic 1 — Manual agent run trigger
FR6: Epic 1 — View agent status (last run, next scheduled, success/failure)
FR7: Epic 5 — View and modify agent schedules via CLI
FR8: Epic 5 — Interactive chat with specific agent via CLI
FR9: Epic 2 — Subagent spawning for parallel subtasks
FR10: Epic 4 — Team sessions, summoning agents for collaborative work
FR11: Epic 6 — Autonomous inter-agent communication on domain overlap
FR12: Epic 2 — Research patrol on configurable cron schedule
FR13: Epic 1 — Structured markdown research reports
FR14: Epic 2 — Opinions with confidence calibration
FR15: Epic 2 — Explicit predictions with evidence and timestamps
FR16: Epic 2 — Proactive advocacy for operator setup changes
FR17: Epic 2 — Multiple research patrols in parallel
FR18: Epic 4 — Newspaper agent summons researchers as team
FR19: Epic 4 — Designed publication from synthesized research
FR20: Epic 4 — Typst compilation to PDF/HTML
FR21: Epic 4 — Git versioning of newspaper editions
FR22: Epic 4 — Featured stories trigger dedicated reports
FR23: Epic 5 — View current newspaper edition via CLI
FR24: Epic 5 — Browse past editions and weekly papers via CLI
FR25: Epic 4 — Immediate newspaper update on breaking events
FR26: Epic 7 — Daily task list from project state and backlog
FR27: Epic 7 — Calendar schedule integration into task scoping
FR28: Epic 9 — Inbox state integration into task prioritization
FR29: Epic 7 — Consult project PM agents for context-aware next actions
FR30: Epic 5 — View, complete, and update tasks via CLI
FR31: Epic 7 — Midday check-in notifications on task progress
FR32: Epic 7 — Dynamic intraday task list adjustment
FR33: Epic 3 — Persistent knowledge.md per agent
FR34: Epic 3 — Hot memory depreciation over time
FR35: Epic 3 — Explicit knowledge reinforcement
FR36: Epic 3 — Per-agent RAG vector stores
FR37: Epic 3 — Memory librarian indexes to shared FTS5 index
FR38: Epic 3 — Entity extraction and vectorization for cross-agent discovery
FR39: Epic 3 — Cross-domain knowledge querying via shared index
FR40: Epic 1 — Session state save and conversation summaries
FR41: Epic 1 — Load previous state for session continuity
FR42: Epic 9 — Comms agent monitors email inbox
FR43: Epic 9 — Email urgency evaluation and flagging
FR44: Epic 9 — Draft email responses for operator review
FR45: Epic 8 — Push notifications gated by agent-judged urgency
FR46: Epic 8 — Configure notification preferences and urgency thresholds
FR47: Epic 8 — Multi-adapter notification delivery
FR48: Epic 8 — Notify operator on agent run failure
FR49: Epic 10 — Project portal onboards into any BMAD project
FR50: Epic 10 — View status cards for all registered projects
FR51: Epic 10 — Query and interact with registered projects via orchestrator
FR52: Epic 10 — Capture ideas through brainstorming sessions
FR53: Epic 10 — Promote structured idea to full BMAD project
FR54: Epic 1 — Daemon runs continuously as systemd service
FR55: Epic 1 — Scheduled agent runs via cron expressions
FR56: Epic 6 — Watch filesystem paths with conditions, trigger activations
FR57: Epic 1 — REST API for CLI and PWA consumption
FR58: Epic 8 — WebSocket connections for real-time push
FR59: Epic 1 — Persist agent-to-agent conversation transcripts
FR60: Epic 5 — Browse conversation logs via CLI
FR61: Epic 6 — Distinguish failure modes (failed to start vs. didn't finish)
FR62: Epic 11 — PWA offline caching of newspaper and todos
FR63: Epic 5 — CLI JSON output for scripting
FR64: Epic 5 — CLI zsh shell completion

## Epic List

### Epic 1: Project Foundation & First Agent Run
The operator can scaffold the project, start the daemon, auto-discover agents from YAML + persona files, trigger manual runs, and see structured markdown output. Sessions persist across runs with automatic state save and continuity loading.
**FRs covered:** FR1, FR2, FR5, FR6, FR13, FR40, FR41, FR54, FR55, FR57, FR59
**Stories:** 1.1 Bun Workspaces Monorepo Scaffold, 1.2 Daemon Skeleton with Hono REST API, 1.3 Agent Definition Loader & Auto-Discovery, 1.4 Claude SDK Session Manager, 1.5 Agent Run Execution & Output, 1.6 Cron Scheduler for Automated Runs

### Epic 2: Automated Research Patrols
Research agents autonomously patrol their assigned domains on cron schedules, produce structured reports with opinions and predictions, spawn subagents for parallel lookups within sessions, and run all patrols concurrently.
**FRs covered:** FR9, FR12, FR14, FR15, FR16, FR17
**Stories:** 2.1 Research Agent Persona & Patrol Workflow, 2.2 BMAD Opinion & Prediction Framework Extension, 2.3 Parallel Patrol Execution & Subagent Spawning, 2.4 Full Research Agent Roster

### Epic 3: Agent Memory & Knowledge Discovery
Agents accumulate persistent knowledge that depreciates over time unless reinforced. Per-agent RAG vector stores enable long-term semantic recall. The memory librarian indexes everything into a shared FTS5 index for cross-agent discovery.
**FRs covered:** FR33, FR34, FR35, FR36, FR37, FR38, FR39
**Stories:** 3.1 Persistent Knowledge.md & Hot Memory Depreciation, 3.2 SQLite Data Layer & Per-Agent RAG Vector Stores, 3.3 Memory Librarian & Shared FTS5 Index, 3.4 Cross-Agent Knowledge Querying via Librarian

### Epic 4: The Morning Newspaper
The newspaper agent summons research agents as a team for collaborative synthesis, produces a designed publication compiled through Typst into PDF/HTML, git-versions every edition on a dedicated branch, and can update immediately on breaking events. Featured stories trigger full dedicated research reports.
**FRs covered:** FR10, FR18, FR19, FR20, FR21, FR22, FR25
**Stories:** 4.1 Newspaper Agent Persona & Team Synthesis Session, 4.2 Typst Compilation Pipeline, 4.3 Git Versioning & Edition Management, 4.4 Breaking Updates & Featured Stories

### Epic 5: CLI — The Operator's Dashboard
Full terminal experience: interactive TUI dashboard with newspaper + todos + agent cards, newspaper viewer, agent chat, log browser, schedule management, JSON output for scripting, zsh shell completions. Vim-style keyboard navigation throughout.
**FRs covered:** FR7, FR8, FR23, FR24, FR30, FR60, FR63, FR64
**Stories:** 5.1 CLI Scaffold & Basic Commands, 5.2 TUI Dashboard Scaffold & Main Panels, 5.3 Agent Drill-In View, 5.4 Scheduling Tab, 5.5 Real-Time Dashboard Updates, 5.6 Newspaper & Report CLI Commands, 5.7 Agent Chat & Log Browser, 5.8 Shell Completions & Scripting

### Epic 6: Event-Driven Automation & Inter-Agent Communication
File trigger engine watches filesystem paths with conditions and maps events to agent activations. Agents autonomously initiate team sessions when they detect domain overlap. System distinguishes "failed to start" vs. "started but didn't finish" for proper recovery paths.
**FRs covered:** FR11, FR56, FR61
**Stories:** 6.1 File Trigger Engine, 6.2 Autonomous Inter-Agent Communication, 6.3 Failure Mode Distinction & Recovery

### Epic 7: Smart Task Management
Smart todo agent generates a calendar-aware dynamic daily task list from project state, backlog, and procrastination history. Persistent daily ledger tracks accountability. Midday check-in notifications on progress. Task list adjusts dynamically throughout the day.
**FRs covered:** FR26, FR27, FR29, FR30, FR31, FR32
**Stories:** 7.1 Daily Todo Ledger & Accountability Tracking, 7.2 Smart Todo Agent & Calendar-Aware Task Generation, 7.3 Interactive Task Management, 7.4 Midday Check-ins & Dynamic Adjustment

### Epic 8: Real-Time Push & Notifications
WebSocket server for live updates to connected clients. Notification system with urgency gating by agent judgment. Multi-adapter delivery (terminal bell, WebSocket event, browser push). Agent failure notifications. Pluggable adapter architecture extends naturally to PWA and APK surfaces later.
**FRs covered:** FR45, FR46, FR47, FR48, FR58
**Stories:** 8.1 WebSocket Server & Real-Time Event Push, 8.2 Notification System with Urgency Gating, 8.3 Multi-Adapter Notification Delivery & Failure Alerts

### Epic 9: Communications & Inbox Integration
Comms agent monitors email inbox, evaluates urgency, flags important messages, and drafts responses for operator review. Smart todo expands to incorporate inbox state into task prioritization.
**FRs covered:** FR28, FR42, FR43, FR44
**Stories:** 9.1 Comms Agent Persona & Inbox Monitoring, 9.2 Urgency Evaluation & Draft Responses, 9.3 Inbox-Aware Task Prioritization

### Epic 10: The Orchestrator & Project Portal
Orchestrator as universal front desk — routes commands, creates new agents from natural language descriptions (complete YAML + persona MD). Project portal onboards into any BMAD project. Idea capture through brainstorming sessions, promotable to full projects.
**FRs covered:** FR3, FR4, FR49, FR50, FR51, FR52, FR53
**Stories:** 10.1 Orchestrator Agent Persona & Command Routing, 10.2 Natural Language Agent Creation, 10.3 Project Portal & BMAD Project Onboarding, 10.4 Brainstorming & Idea Promotion, 10.5 Orchestrator Dashboard Pane

### Epic 11: Mobile Experience (PWA)
Progressive Web App as the mobile surface — newspaper viewer, chat, agent cards, todos, inbox, logs, settings. Service worker for offline caching of last newspaper and current todo list. Full mobile-to-CLI continuity.
**FRs covered:** FR62
**Stories:** 11.1 PWA Scaffold & App Shell, 11.2 Newspaper & Todo Mobile Views, 11.3 Agent Cards Chat & Project Views, 11.4 Offline Caching & Push Notifications

## Epic 1: Project Foundation & First Agent Run

The operator can scaffold the project, start the daemon, auto-discover agents from YAML + persona files, trigger manual runs, and see structured markdown output. Sessions persist across runs with automatic state save and continuity loading.

### Story 1.1: Bun Workspaces Monorepo Scaffold

As a developer,
I want a fully configured Bun workspaces monorepo with shared TypeScript config, linting, and testing infrastructure,
So that all Herald packages share consistent tooling and I can begin building on a solid foundation.

**Acceptance Criteria:**

**Given** a fresh project directory
**When** the scaffold is initialized
**Then** a root package.json exists with `workspaces` pointing to `packages/*`
**And** four package directories exist: `packages/daemon`, `packages/cli`, `packages/pwa`, `packages/shared`
**And** each package has its own package.json and tsconfig.json extending tsconfig.base.json
**And** a root biome.json configures linting and formatting for all packages
**And** a root vitest workspace config enables testing across all packages
**And** `packages/shared/src/index.ts` exists with initial Zod schemas for agent config and herald config
**And** `.env.example` documents all required environment variables (CLAUDE_API_KEY, HERALD_PORT, HERALD_DATA_DIR)
**And** `.gitignore` excludes node_modules, .env, data/, memory/
**And** `herald.config.yaml` skeleton exists with port, paths, and default values
**And** non-package directories exist: `agents/`, `personas/`, `reports/`, `memory/`, `newspaper/`, `data/`, `systemd/`
**And** `bun install` succeeds and inter-package `workspace:*` references resolve

### Story 1.2: Daemon Skeleton with Hono REST API

As an operator,
I want to start the Herald daemon and confirm it's running via a health endpoint,
So that I have a reliable foundation for all agent operations.

**Acceptance Criteria:**

**Given** the daemon package with Hono installed
**When** the daemon starts via `bun run packages/daemon/src/index.ts`
**Then** a Bun.serve() HTTP server starts on the port specified in herald.config.yaml
**And** `GET /health` returns `200` with `{ status: "ok", uptime: <seconds> }`
**And** `GET /api/status` returns `200` with `{ agents: [], daemon: { uptime, version } }`
**And** the server binds to localhost only by default (NFR21)
**And** config is loaded from herald.config.yaml with env var overrides
**And** a `systemd/herald.service` unit file exists with Restart=always, RestartSec=5
**And** console.log outputs startup confirmation with port and config path
**And** unhandled errors are caught by Hono error middleware and return `{ error: "Internal server error" }` with 500 status

### Story 1.3: Agent Definition Loader & Auto-Discovery

As an operator,
I want the daemon to automatically discover and register agents when I drop YAML + persona files into the agents directory,
So that adding a new agent requires zero code changes.

**Acceptance Criteria:**

**Given** the daemon is running
**When** an agent YAML file is placed in the `agents/` directory with a corresponding persona MD in `personas/`
**Then** the daemon detects the new file via Bun fs.watch()
**And** the YAML is parsed and validated against the agent config Zod schema from the shared package
**And** if validation passes, the agent is registered in the in-memory agent registry
**And** on first registration, the daemon auto-scaffolds the agent's required directory structure: `memory/agents/{name}/knowledge.md` (BMAD skeleton with Domain Knowledge, Developing Opinions, Predictions Log, Accountability sections), `memory/agents/{name}/preferences.md`, `memory/agents/{name}/last-jobs.md`, `memory/agents/{name}/rag/`, and `reports/{name}/`
**And** if directories already exist, they are left untouched — scaffold only creates what's missing
**And** if validation fails, a console.warn is logged and the agent is skipped (never crashes the daemon)
**And** `GET /api/agents` returns the list of all registered agents with their config
**And** `GET /api/agents/:name` returns a single agent's full configuration and status

**Given** a registered agent's YAML file is modified
**When** the file watcher detects the change
**Then** the agent config is re-validated and the registry is updated with the new config (FR2)
**And** if the updated YAML is invalid, the previous valid config is retained and a warning is logged

**Given** a registered agent's YAML file is deleted
**When** the file watcher detects the deletion
**Then** the agent is removed from the registry

### Story 1.4: Claude SDK Session Manager

As an operator,
I want agent sessions to persist across runs with automatic state save and continuity,
So that agents pick up where they left off naturally.

**Acceptance Criteria:**

**Given** the daemon has a registered agent
**When** a session is created for that agent
**Then** the Claude SDK is initialized with the agent's BMAD persona MD and knowledge context
**And** the session is scoped to the agent's designated directories only (NFR22)
**And** the session is tracked in the session manager with status (active/idle/failed)

**Given** an active session reaches its configured session_limit (N interactions)
**When** the limit is reached
**Then** the agent gracefully saves state to `memory/agents/{name}/last-jobs.md`
**And** a conversation summary is generated and persisted
**And** the session exits cleanly

**Given** a new session is created for an agent that has a previous last-jobs.md
**When** the session starts
**Then** the previous state is loaded into the session context for natural continuity (FR41)
**And** session resume completes in <3 seconds P95 (NFR8)

**Given** a Claude SDK session fails (API error, rate limit, service interruption)
**When** the failure is detected
**Then** the session manager handles the error without crashing the daemon (NFR5, NFR6)
**And** the agent status is updated to reflect the failure
**And** the error is logged with console.error

### Story 1.5: Agent Run Execution & Output

As an operator,
I want to trigger an agent run and see structured output,
So that I can verify agents produce useful results.

**Acceptance Criteria:**

**Given** a registered agent with a valid session manager
**When** `POST /api/agents/:name/run` is called
**Then** a new session is created (or existing one resumed) for the agent
**And** the agent executes its patrol/task workflow
**And** the agent produces a markdown file with YAML frontmatter at `reports/{agent-name}/{timestamp}.md`
**And** the frontmatter includes: agent name, output type, timestamp
**And** the agent's status is updated to "running" during execution, then "success" or "failed" on completion
**And** `GET /api/agents/:name` reflects the updated last_run timestamp and status (FR6)

**Given** an agent run produces conversation output
**When** the run completes
**Then** the full conversation transcript is persisted to `memory/conversations/{date}-{agent-name}.md` (FR59)

**Given** an agent run fails mid-execution
**When** the error is caught at the session boundary
**Then** the agent status is set to "failed" with error details
**And** other agents and the daemon remain unaffected (NFR5)

### Story 1.6: Cron Scheduler for Automated Runs

As an operator,
I want agents to run automatically on their configured schedules,
So that the system operates autonomously without manual triggering.

**Acceptance Criteria:**

**Given** the daemon has registered agents with `schedule` fields in their YAML config
**When** the daemon starts
**Then** node-cron jobs are created for each agent's schedule expression
**And** the schedule registry tracks all active schedules

**Given** a cron schedule fires for an agent
**When** the scheduled time arrives
**Then** the agent run is triggered through the same execution path as manual runs (Story 1.5)
**And** the run is logged with console.log including agent name and trigger type (scheduled)

**Given** an agent's YAML config is hot-reloaded with a changed schedule
**When** the file watcher triggers a config update
**Then** the old cron job is cancelled and a new one is registered with the updated schedule
**And** the schedule registry reflects the change

**Given** `GET /api/schedule` is called
**When** the request is processed
**Then** the response lists all agents with their cron expressions and next scheduled run time

## Epic 2: Automated Research Patrols

Research agents autonomously patrol their assigned domains on cron schedules, produce structured reports with opinions and predictions, spawn subagents for parallel lookups within sessions, and run all patrols concurrently.

### Story 2.1: Research Agent Persona & Patrol Workflow

As an operator,
I want a fully functional research agent with a BMAD persona that patrols its domain and produces structured reports,
So that I receive automated intelligence on topics I care about.

**Acceptance Criteria:**

**Given** the ML Researcher agent YAML and persona MD are in the agents/ and personas/ directories
**When** the daemon discovers and registers the agent
**Then** the persona MD contains a complete BMAD persona: domain expertise, research methodology, knowledge structure, and patrol workflow instructions
**And** the agent YAML specifies schedule, output_dir, session_limit, memory paths, and notify_policy

**Given** the ML Researcher's cron schedule fires
**When** the patrol executes
**Then** the agent follows its patrol workflow: scan sources, evaluate findings, synthesize report
**And** a structured markdown report is written to `reports/ml-researcher/{timestamp}.md` with YAML frontmatter (FR13)
**And** the report contains: key findings, analysis, source references, and relevance assessment
**And** the patrol completes within a single bounded session (FR12)

**Given** the agent's patrol completes
**When** the report is written
**Then** the agent's status shows last_run timestamp and success status
**And** the patrol counts toward the 100% completion rate target (NFR2)

### Story 2.2: BMAD Opinion & Prediction Framework Extension

As an operator,
I want research agents to develop opinions and track predictions as extensions of their BMAD knowledge.md,
So that agents build genuine domain expertise over time with accountability.

**Acceptance Criteria:**

**Given** a research agent's BMAD knowledge.md
**When** the opinion and prediction framework is applied
**Then** knowledge.md contains extended BMAD sections: Developing Opinions, Predictions Log, and Accountability
**And** these sections are native extensions of the existing BMAD knowledge structure, not a separate system

**Given** a research agent completes a patrol and identifies a noteworthy trend
**When** the agent forms an opinion
**Then** the opinion is recorded in the Developing Opinions section with: statement, confidence level (0-100), supporting evidence, and timestamp (FR14)
**And** opinions can be updated with revised confidence as new evidence emerges

**Given** a research agent identifies a forward-looking development
**When** the agent records a prediction
**Then** the prediction is logged in the Predictions Log with: prediction statement, confidence, evidence, timestamp, and expected timeframe (FR15)
**And** predictions are structured for future accountability checking

**Given** a research agent spots a tool, framework, or workflow improvement relevant to the operator
**When** the agent evaluates the advancement
**Then** the agent includes a proactive recommendation in its patrol report with rationale and confidence (FR16)

### Story 2.3: Parallel Patrol Execution & Subagent Spawning

As an operator,
I want multiple research agents to patrol simultaneously and spawn parallel subtasks within their sessions,
So that the full research cycle completes efficiently.

**Acceptance Criteria:**

**Given** multiple research agents have the same cron schedule (e.g., "30 5,11,17,23 * * *")
**When** the schedule fires
**Then** all scheduled agents launch their patrols concurrently, not sequentially (FR17)
**And** the daemon manages multiple active Claude SDK sessions simultaneously
**And** agent failure isolation is maintained — one agent's failure does not affect others (NFR5)

**Given** a research agent needs to look up multiple sources during a patrol
**When** the agent spawns subagents
**Then** parallel subtasks execute concurrently within the agent's session (FR9)
**And** subagent results are collected and synthesized by the parent agent
**And** the total patrol cycle for all agents completes within 20 minutes (NFR12)

### Story 2.4: Full Research Agent Roster

As an operator,
I want all Stage 1 research agents deployed with domain-specific personas,
So that I have comprehensive research coverage across ML, compute, and AI tooling.

**Acceptance Criteria:**

**Given** the ML Researcher is already operational from Story 2.1
**When** Compute Researcher and AI Tooling Researcher agents are deployed
**Then** each has a complete BMAD persona MD with domain-specific expertise, research methodology, and patrol workflow
**And** each has an agent YAML with appropriate schedule, output_dir, memory paths, and trigger rules
**And** each agent's persona reflects its unique domain: compute tracks hardware/GPU/cloud/chips, AI tooling tracks frameworks/SDKs/libraries

**Given** all 3 research agents are registered
**When** the shared patrol schedule fires
**Then** all 3 agents patrol in parallel, each producing independent reports in their respective output directories
**And** `GET /api/agents` shows all 3 agents with current status and last run information
**And** each agent maintains its own knowledge.md with domain-specific opinions and predictions

## Epic 3: Agent Memory & Knowledge Discovery

Agents accumulate persistent knowledge that depreciates over time unless reinforced. Per-agent RAG vector stores enable long-term semantic recall. The memory librarian indexes everything into a shared FTS5 index for cross-agent discovery.

### Story 3.1: Persistent Knowledge.md & Hot Memory Depreciation

As an operator,
I want agents to accumulate domain knowledge that stays lean and relevant through natural depreciation,
So that agent memory mirrors how expertise actually works — recent and reinforced knowledge is sharp, old knowledge fades but isn't lost.

**Acceptance Criteria:**

**Given** a research agent with a knowledge.md in `memory/agents/{name}/knowledge.md`
**When** the agent completes a patrol run
**Then** the agent can update its knowledge.md with new domain knowledge, opinions, predictions, and accountability entries (FR33)
**And** knowledge.md follows the BMAD-extended structure: Domain Knowledge, Developing Opinions, Predictions Log, Accountability

**Given** knowledge items exist in an agent's knowledge.md
**When** time passes without reinforcement
**Then** items depreciate in importance by ~5% per day (FR34)
**And** deprecated items are marked with reduced importance scores but not deleted

**Given** an agent encounters information that confirms or updates existing knowledge
**When** the agent processes the information during a patrol
**Then** the agent can explicitly reinforce knowledge items to reset their importance (FR35)
**And** reinforced items are timestamped with the reinforcement date

**Given** knowledge items depreciate below a configured threshold
**When** the depreciation check runs
**Then** items below threshold are candidates for archival to cold RAG storage
**And** zero data is ever permanently deleted — deprecated items remain searchable via RAG (NFR3)

### Story 3.2: SQLite Data Layer & Per-Agent RAG Vector Stores

As an operator,
I want agents to have long-term semantic memory through vector stores,
So that everything agents have ever learned is retrievable even after hot memory depreciates.

**Acceptance Criteria:**

**Given** the daemon starts
**When** the memory subsystem initializes
**Then** bun:sqlite creates/opens `data/herald.sqlite` with WAL mode enabled (NFR7)
**And** numbered SQL migration files in `data/migrations/` are applied in order
**And** proper transaction boundaries are used for all write operations

**Given** Ollama is running with the nomic-embed-text model
**When** content needs to be vectorized
**Then** the daemon calls Ollama's REST API (localhost:11434) to generate embeddings
**And** embedding generation handles Ollama unavailability gracefully with error logging

**Given** an agent's patrol report or knowledge update is produced
**When** the content is processed for long-term storage
**Then** the content is embedded via Ollama and stored in the agent's sqlite-vec vector store at `memory/agents/{name}/rag/` (FR36)

**Given** an agent needs to recall historical knowledge
**When** the agent queries its RAG store
**Then** semantic similarity search returns relevant past knowledge (FR36)
**And** queries complete within reasonable latency for single-user scale

### Story 3.3: Memory Librarian & Shared FTS5 Index

As an operator,
I want a memory librarian that indexes all agent knowledge for cross-agent discovery,
So that connections between domains are surfaced automatically.

**Acceptance Criteria:**

**Given** any agent completes a run (patrol, task, or session)
**When** the run finishes and output is written
**Then** the memory librarian is triggered automatically as a post-run process (FR37)

**Given** the memory librarian processes an agent's output
**When** indexing runs
**Then** the librarian reads the full report from `reports/{agent-name}/`
**And** extracts entities (people, organizations, technologies, events) from the content (FR38)
**And** vectorizes the content via Ollama and stores in the agent's RAG store
**And** indexes extracted entities and content into `memory/shared/index.sqlite` using FTS5 (FR37)
**And** updates `memory/shared/connections.md` with any cross-domain narratives discovered

**Given** the shared FTS5 index contains entries from multiple agents
**When** a full-text search query is executed
**Then** results return matches across all agents with source attribution
**And** queries complete in <100ms (NFR13)

**Given** the librarian encounters an error during indexing
**When** the error is caught
**Then** the librarian logs the error and continues — indexing failures never block agent operations

### Story 3.4: Cross-Agent Knowledge Querying via Librarian

As an operator,
I want agents to query the memory librarian for cross-domain knowledge during their work,
So that an intelligent curator mediates discovery — not a dumb search engine.

**Acceptance Criteria:**

**Given** an agent needs cross-domain knowledge during a patrol or session
**When** the agent queries the memory librarian
**Then** the daemon provides an SDK tool (`ask_librarian`) that routes the agent's natural language question to the memory librarian agent
**And** the librarian receives the question with context about which agent is asking and what they're working on

**Given** the librarian receives a knowledge query from another agent
**When** the librarian processes the request
**Then** the librarian translates the natural language question into FTS5 keyword searches and sqlite-vec semantic similarity queries
**And** the librarian interprets, contextualizes, and prioritizes the raw results
**And** the librarian may proactively suggest related findings the querying agent didn't think to ask about
**And** the librarian returns a curated, synthesized response — not raw database rows (FR39)

**Given** the librarian has indexed knowledge from multiple agents over time
**When** cross-domain connections exist in the index
**Then** the librarian develops expertise about what's in the knowledge base and where patterns exist
**And** the librarian can surface connections between domains that individual agents would never find independently

**Given** the librarian is unavailable or encounters an error during a query
**When** the query fails
**Then** the querying agent receives an error response and continues its work without blocking
**And** the failure is logged — librarian unavailability never crashes the querying agent

## Epic 4: The Morning Newspaper

The newspaper agent summons research agents as a team for collaborative synthesis, produces a designed publication compiled through Typst into PDF/HTML, git-versions every edition on a dedicated branch, and can update immediately on breaking events. Featured stories trigger full dedicated research reports.

### Story 4.1: Newspaper Agent Persona & Team Synthesis Session

As an operator,
I want a newspaper agent that summons research agents for collaborative synthesis and produces a curated daily publication,
So that I wake up to a comprehensive intelligence brief every morning.

**Acceptance Criteria:**

**Given** the newspaper agent YAML and persona MD are deployed
**When** the newspaper agent's morning schedule fires (6:00 AM)
**Then** the newspaper agent creates a team session and summons all active research agents (FR10, FR18)
**And** the team session follows a structured synthesis workflow: each researcher presents findings, newspaper agent curates and prioritizes

**Given** the team synthesis session is active
**When** researchers present their latest patrol findings
**Then** the newspaper agent synthesizes across domains, identifies top stories, and writes editorial framing (FR19)
**And** the output is structured markdown with sections per research domain, headlines, featured stories, and cross-domain insights
**And** the synthesis markdown is written to `newspaper/editions/{date}/sources/`

**Given** a researcher is unavailable or their last run failed
**When** the team session assembles
**Then** the newspaper agent works with available researchers and notes any missing coverage
**And** the newspaper is still produced — missing one section doesn't block publication

**Given** the morning synthesis completes
**When** the newspaper markdown is finalized
**Then** the full newspaper is ready before 6:30 AM (NFR4)
**And** the agent's conversation transcript is persisted for browsing

### Story 4.2: Typst Compilation Pipeline

As an operator,
I want the newspaper compiled into a designed PDF and HTML publication,
So that I read a polished, formatted document — not raw markdown.

**Acceptance Criteria:**

**Given** newspaper synthesis markdown exists in `newspaper/editions/{date}/sources/`
**When** the compilation pipeline runs
**Then** the markdown is processed through a Typst template at `newspaper/templates/newspaper.typ`
**And** Typst compiles the output into both PDF and HTML at `newspaper/editions/{date}/newspaper.pdf` and `newspaper.html` (FR20)
**And** compilation executes as a subprocess — Typst runs in a child process, not in the daemon's event loop (NFR18)

**Given** the Typst compilation runs
**When** compilation completes
**Then** total compilation time is <15 seconds (NFR9)
**And** the compiled output is served via the daemon's REST API

**Given** the Typst compilation fails (template error, missing content, Typst not installed)
**When** the error is caught
**Then** the daemon logs the error with console.error
**And** the raw markdown newspaper is still available via API as a fallback
**And** the daemon continues running — compilation failure never crashes the daemon (NFR18)

### Story 4.3: Git Versioning & Edition Management

As an operator,
I want every newspaper edition versioned in git with browsable history,
So that I can track how coverage evolves over time and never lose an edition.

**Acceptance Criteria:**

**Given** a newspaper edition is compiled
**When** the edition is finalized
**Then** the edition is committed to a dedicated orphan git branch named `newspaper` (FR21)
**And** the commit message is agent-authored, summarizing the edition's key stories
**And** the orphan branch never merges to main — it's a standalone archive

**Given** git operations encounter merge conflicts or dirty state
**When** the conflict is detected
**Then** the git versioner handles it automatically without manual intervention (NFR19)
**And** no edition data is lost — worst case, the edition is saved to filesystem even if git commit fails (NFR3)

**Given** the operator wants to browse past editions
**When** `GET /api/newspaper/editions` is called
**Then** the API returns a list of all editions with dates and headline summaries
**And** `GET /api/newspaper/editions/{date}` returns the specific edition's PDF, HTML, or source markdown

**Given** a weekly synthesis is scheduled (Friday EOD)
**When** the weekly synthesis runs
**Then** a weekly strategic paper is produced and stored at `newspaper/weekly/{date}-weekly.pdf` (FR24)
**And** the weekly paper is also committed to the newspaper git branch

### Story 4.4: Breaking Updates & Featured Stories

As an operator,
I want the newspaper to update immediately on breaking events and trigger deep-dive research on featured stories,
So that urgent intelligence reaches me without waiting for the next scheduled synthesis.

**Acceptance Criteria:**

**Given** a research agent detects an urgent or breaking event during a patrol
**When** the event is flagged as breaking
**Then** the newspaper agent is triggered immediately outside its normal schedule (FR25)
**And** the newspaper updates with the breaking content — appended as an update to the current edition, not a full re-synthesis
**And** the updated edition is recompiled through Typst and re-committed to the git branch

**Given** the newspaper agent identifies a story worthy of deep coverage during synthesis
**When** the story is marked as a featured story
**Then** the featured story triggers a full dedicated research report from the relevant research agent (FR22)
**And** the dedicated report is written to the researcher's output directory
**And** the dedicated report is linked from the newspaper's featured story section

**Given** multiple breaking updates occur throughout the day
**When** each update is processed
**Then** updates are appended chronologically to the current edition
**And** the edition maintains a clear distinction between the morning synthesis and intraday updates

## Epic 5: CLI — The Operator's Dashboard

Full terminal experience: interactive TUI dashboard with newspaper + todos + agent cards, newspaper viewer, agent chat, log browser, schedule management, JSON output for scripting, zsh shell completions. Vim-style keyboard navigation throughout.

### Story 5.1: CLI Scaffold & Basic Commands

As an operator,
I want a `herald` CLI tool with basic commands for quick status checks and agent management,
So that I can interact with the daemon from the terminal without the full dashboard.

**Acceptance Criteria:**

**Given** the CLI package with Commander.js installed
**When** `herald` is invoked without a subcommand
**Then** a help overview is displayed listing all available commands

**Given** the daemon is running
**When** `herald status` is executed
**Then** a summary is displayed: daemon uptime, number of registered agents, last agent run, next scheduled run
**And** the response completes in <1 second (NFR11)

**Given** the operator wants to trigger a manual agent run
**When** `herald run <agent-name>` is executed
**Then** a POST request is sent to the daemon API to trigger the agent
**And** the CLI displays run status (started, running, completed/failed) with a spinner during execution

**Given** the operator wants machine-readable output
**When** any list/status command is run with `--json` flag
**Then** the output is valid JSON written to stdout, suitable for piping and scripting (FR63)

**Given** the CLI HTTP client cannot connect to the daemon
**When** any command is executed
**Then** a clear error message is shown: "Herald daemon is not running. Start it with: bun run packages/daemon/src/index.ts"

### Story 5.2: TUI Dashboard Scaffold & Main Panels

As an operator,
I want a full-screen TUI dashboard with newspaper, todos, and agent status panels,
So that I have a single command that puts Herald's core intelligence at my fingertips.

**Acceptance Criteria:**

**Given** the daemon is running
**When** `herald dash` is executed
**Then** a full-screen TUI launches with three zones: agent cards bar (top), newspaper panel (main left/center), and todo list panel (main right/side)

**Given** the dashboard is active
**When** the agent cards bar is displayed at the top
**Then** each research agent is shown as a numbered card with: name, status indicator (success/failed/running), last run time
**And** pressing a number key highlights the corresponding agent card

**Given** the dashboard's todo panel is active
**When** the operator navigates to the todo list
**Then** tasks are displayed with checkbox indicators
**And** the operator can check off tasks with Enter or a toggle key
**And** the operator can add new tasks to the backlog via an inline input
**And** changes are sent to the daemon API and persisted (FR30)

**Given** the dashboard's newspaper panel is active
**When** today's newspaper is displayed
**Then** the newspaper renders as formatted markdown in the terminal
**And** the operator can scroll through the newspaper with vim keys (`j`/`k`)

**Given** the dashboard is active
**When** the operator navigates between panels
**Then** all navigation uses vim-style keyboard bindings — no mouse required
**And** tab or keybind switching between panes: newspaper, todos

### Story 5.3: Agent Drill-In View

As an operator,
I want to drill into any agent from the dashboard to see its reports and chat with it,
So that I can inspect agent output and interact directly without leaving the TUI.

**Acceptance Criteria:**

**Given** the dashboard is active with the agent cards bar
**When** the operator presses Enter on a highlighted agent card
**Then** the screen transitions to the agent drill-in view with two panels: agent chat (left) and agent reports list (right)

**Given** the agent drill-in view is active
**When** the reports list is displayed
**Then** the reports list uses vim navigation (`j`/`k` to move, Enter to open a report)
**And** opening a report renders the full markdown report inline

**Given** the agent drill-in view is active
**When** the operator switches to the chat panel
**Then** the operator can communicate with the agent interactively (FR8)
**And** `q` or Esc backs out to the main dashboard

### Story 5.4: Scheduling Tab

As an operator,
I want a scheduling tab in the dashboard to view and edit agent cron schedules,
So that I can manage when agents run without editing YAML files directly.

**Acceptance Criteria:**

**Given** the dashboard is active
**When** the operator opens the scheduling tab
**Then** all agents are listed with their cron expressions, next run time, and last run status
**And** vim navigation to browse and select agents

**Given** the scheduling tab is active
**When** the operator presses Enter on a selected agent
**Then** the operator can inline-edit the cron expression
**And** schedule changes are sent to the daemon API and hot-reloaded immediately (FR7)

### Story 5.5: Real-Time Dashboard Updates

As an operator,
I want the dashboard to update in real-time as agents complete runs and state changes,
So that the dashboard always reflects the current system state without manual refresh.

**Acceptance Criteria:**

**Given** the dashboard is running
**When** the daemon pushes updates via WebSocket (agent completes run, todo changes, newspaper updates)
**Then** the dashboard updates the relevant panels in real-time without manual refresh
**And** agent cards reflect updated status immediately
**And** todo panel reflects completed/added tasks immediately

### Story 5.6: Newspaper & Report CLI Commands

As an operator,
I want quick CLI commands to view the newspaper without launching the full dashboard,
So that I can read my morning brief or check past editions with a single command.

**Acceptance Criteria:**

**Given** the daemon has a current newspaper edition
**When** `herald paper` is executed
**Then** today's newspaper is rendered as formatted markdown in the terminal using marked-terminal (FR23)
**And** the output is paginated or piped through a pager for long content

**Given** the operator wants to browse past editions
**When** `herald paper --history` is executed
**Then** a list of past editions is displayed with dates and headline summaries (FR24)
**And** the operator can select an edition to view

**Given** a weekly synthesis paper exists
**When** `herald paper --weekly` is executed
**Then** the latest weekly strategic paper is rendered in the terminal (FR24)

**Given** the operator wants JSON output
**When** `herald paper --json` is executed
**Then** the newspaper content is returned as structured JSON with sections, headlines, and metadata

### Story 5.7: Agent Chat & Log Browser

As an operator,
I want to chat interactively with any agent and browse conversation logs,
So that I can query agents directly and review past agent-to-agent conversations.

**Acceptance Criteria:**

**Given** the operator wants to chat with a specific agent
**When** `herald agent <name>` is executed
**Then** an interactive chat session opens with the specified agent (FR8)
**And** agent responses are streamed and rendered as formatted markdown in the terminal
**And** the chat supports multi-turn conversation within the agent's bounded session
**And** `Ctrl+C` or `/exit` ends the chat session gracefully

**Given** the operator wants to view conversation logs
**When** `herald logs` is executed
**Then** a list of recent conversation transcripts is displayed from `memory/conversations/` (FR60)
**And** transcripts are sorted by date, most recent first
**And** the operator can select a transcript to view the full content

**Given** the operator wants to manage agent schedules
**When** `herald schedule` is executed
**Then** all agents are listed with their cron expressions and next scheduled run time (FR7)
**And** `herald schedule <agent> <cron-expression>` updates an agent's schedule

### Story 5.8: Shell Completions & Scripting

As an operator,
I want zsh shell completions and consistent JSON output across all commands,
So that I can navigate Herald efficiently and integrate it into scripts.

**Acceptance Criteria:**

**Given** the operator uses zsh as their primary shell
**When** `herald` completions are installed
**Then** tab completion works for all commands, subcommands, and agent names (FR64)
**And** agent names are dynamically completed from the daemon's agent registry

**Given** any list or status command supports `--json`
**When** the flag is provided
**Then** every command that produces tabular or structured output returns valid JSON (FR63)
**And** JSON output follows the shared package's Zod schemas for consistency

**Given** the operator wants to configure notification preferences
**When** `herald notify` is executed
**Then** current notification preferences are displayed
**And** `herald notify --set <key> <value>` updates preferences via the daemon API

## Epic 6: Event-Driven Automation & Inter-Agent Communication

File trigger engine watches filesystem paths with conditions and maps events to agent activations. Agents autonomously initiate team sessions when they detect domain overlap. System distinguishes "failed to start" vs. "started but didn't finish" for proper recovery paths.

### Story 6.1: File Trigger Engine

As an operator,
I want the system to watch filesystem paths and automatically trigger agent activations based on configurable conditions,
So that the intelligence engine reacts to events without manual intervention.

**Acceptance Criteria:**

**Given** an agent YAML defines trigger rules with watch paths and conditions (e.g., `watch: "reports/geopolitical/*.md"`, `condition: "contains:semiconductor OR chip OR TSMC"`)
**When** a file matching the watch path is created or modified
**Then** the daemon evaluates the condition against the file content
**And** if the condition matches, the specified agent is activated with the trigger context message (FR56)

**Given** the event pipeline receives a file trigger event
**When** the event is dispatched
**Then** it flows through the same unified event dispatcher as cron and API triggers
**And** a loop guard tracks event chain depth and rejects events beyond a configurable threshold
**And** loop prevention ensures a trigger cannot recursively re-trigger itself indefinitely

**Given** a file trigger condition does not match
**When** the file is evaluated
**Then** no agent activation occurs and no event is emitted
**And** no log output is produced for non-matching files (avoid log noise)

**Given** multiple agents have trigger rules watching the same path
**When** a matching file event occurs
**Then** all matching agents are activated — triggers are not exclusive

### Story 6.2: Autonomous Inter-Agent Communication

As an operator,
I want agents to initiate conversations with other agents when they detect domain overlap,
So that cross-domain intelligence surfaces without me having to orchestrate every interaction.

**Acceptance Criteria:**

**Given** a research agent detects content during a patrol that overlaps with another agent's domain
**When** the agent decides to initiate cross-domain communication
**Then** the agent can request a team session with the relevant agent(s) via the daemon (FR11)
**And** no user approval is required — agents communicate autonomously
**And** the daemon creates the team session and facilitates the conversation

**Given** an autonomous inter-agent session is initiated
**When** the agents converse
**Then** the full conversation transcript is persisted to `memory/conversations/{date}-{description}.md`
**And** the transcript includes: initiating agent, reason for contact, participating agents, conclusions
**And** the conversation is browsable via `herald logs` and the dashboard

**Given** an autonomous session is initiated
**When** the session runs
**Then** the session is bounded by the same session_limit rules as regular agent sessions
**And** the session follows the same failure isolation rules — a failed autonomous session does not affect other running agents (NFR5)

### Story 6.3: Failure Mode Distinction & Recovery

As an operator,
I want the system to distinguish between different types of agent failures and provide appropriate recovery paths,
So that I can quickly diagnose and fix issues without digging through raw logs.

**Acceptance Criteria:**

**Given** an agent fails during execution
**When** the failure is recorded
**Then** the system classifies the failure as one of two modes (FR61):
- **Failed to start**: SDK initialization error, invalid config, API key issue, Ollama unavailable
- **Started but didn't finish**: context limit exceeded, session timeout, network interruption mid-run, unexpected agent error

**Given** a failure is classified
**When** the failure status is stored
**Then** `GET /api/agents/:name` includes the failure mode, error message, and timestamp
**And** the dashboard and `herald status` display the failure mode distinctly (color/icon differentiation)

**Given** an agent "failed to start"
**When** the operator reviews the failure
**Then** the error message points to the root cause (missing API key, invalid YAML, service unavailable)
**And** the suggested recovery is configuration-level (fix config, restart service)

**Given** an agent "started but didn't finish"
**When** the operator reviews the failure
**Then** the error message includes how far the agent got before failing
**And** the agent's last-jobs.md is preserved for session continuity on next run
**And** the suggested recovery is operational (reduce session_limit, retry manually, check API status)

## Epic 7: Smart Task Management

Smart todo agent generates a calendar-aware dynamic daily task list from project state, backlog, and procrastination history. Persistent daily ledger tracks accountability. Midday check-in notifications on progress. Task list adjusts dynamically throughout the day.

### Story 7.1: Daily Todo Ledger & Accountability Tracking

As an operator,
I want a persistent daily record of all tasks — assigned, completed, and procrastinated,
So that the system tracks accountability patterns and nothing slips through the cracks.

**Acceptance Criteria:**

**Given** a new day begins
**When** the smart todo agent generates the daily task list
**Then** a daily ledger file is created at `reports/smart-todo/{date}.md` with YAML frontmatter
**And** the ledger tracks each task with: title, source (backlog/calendar/carried-forward), status (pending/completed/procrastinated), timestamps

**Given** the operator completes or skips a task during the day
**When** the task status changes
**Then** the daily ledger is updated with the new status and timestamp
**And** tasks not completed by end of day are marked as procrastinated

**Given** the smart todo agent generates a new day's list
**When** previous days' ledgers exist
**Then** the agent reads recent ledgers to identify procrastination patterns
**And** carried-forward items are flagged with how many consecutive days they've been procrastinated
**And** the agent can identify chronic procrastination patterns across days

**Given** the operator wants to review task history
**When** `GET /api/todos/history` is called
**Then** the API returns a summary of recent daily ledgers with completion rates and carry-forward counts

### Story 7.2: Smart Todo Agent & Calendar-Aware Task Generation

As an operator,
I want a smart todo agent that builds my daily task list around my calendar and procrastination history,
So that I get an achievable, time-aware plan that fills gaps — not an overwhelming wish list.

**Acceptance Criteria:**

**Given** the smart todo agent's morning schedule fires
**When** the agent generates today's task list
**Then** the agent reads today's calendar to identify booked time blocks and available windows (FR27)
**And** the agent pulls procrastinated items from previous daily ledgers (highest priority — these are overdue)
**And** the agent fills remaining time windows with project tasks from the backlog (FR26)
**And** tasks are scoped to achievable daily volume based on actual available time

**Given** no explicit backlog exists for a project
**When** the agent needs to find project tasks
**Then** the agent consults project PM agents for context-aware next actions (FR29)
**And** suggested tasks include enough context for the operator to act on them

**Given** the daily task list is generated
**When** the list is finalized
**Then** the list is written to the daily ledger and served via `GET /api/todos`
**And** each task shows: title, estimated effort, source (calendar/carry-forward/backlog/PM-suggested), priority

**Given** calendar integration is configured
**When** the calendar API is queried
**Then** API rate limits and token refresh are handled without agent awareness (NFR15)
**And** calendar unavailability falls back gracefully — tasks are generated without calendar context, with a note that calendar was unavailable

### Story 7.3: Interactive Task Management

As an operator,
I want to view, complete, add, and update tasks through the API,
So that I can manage my day from the dashboard or CLI.

**Acceptance Criteria:**

**Given** the daily task list exists
**When** `GET /api/todos` is called
**Then** the current day's tasks are returned with status, priority, and source

**Given** the operator completes a task
**When** `PATCH /api/todos/:id` is called with status "completed"
**Then** the task is marked complete in the daily ledger with a completion timestamp (FR30)
**And** the dashboard and CLI reflect the change in real-time

**Given** the operator wants to add a task
**When** `POST /api/todos` is called with a task title and optional details
**Then** the task is added to today's ledger and the active task list
**And** the task is marked with source "manual" to distinguish from agent-generated tasks

**Given** the operator wants to defer a task
**When** the task is moved to backlog
**Then** the task is marked as procrastinated in today's ledger
**And** it will appear as a carry-forward item in tomorrow's task generation

### Story 7.4: Midday Check-ins & Dynamic Adjustment

As an operator,
I want midday progress nudges and a task list that adjusts as my day changes,
So that I stay on track without the system being rigid or nagging.

**Acceptance Criteria:**

**Given** it is midday (configurable time, default ~12:30 PM)
**When** the midday check-in triggers
**Then** the smart todo agent evaluates progress: how many tasks completed vs. remaining (FR31)
**And** a check-in summary is generated with encouragement and remaining priorities
**And** the check-in is delivered through the notification system

**Given** tasks are completed or the schedule changes during the day
**When** the task list is re-evaluated
**Then** the todo list dynamically adjusts — completed items are removed, priorities may shift (FR32)
**And** if the operator is ahead of schedule, the agent may suggest bonus tasks from the backlog
**And** if behind schedule, the agent trims lower-priority items and focuses remaining time

**Given** a task has been procrastinated for multiple consecutive days
**When** the midday check-in runs
**Then** the agent includes an accountability nudge with the procrastination streak count
**And** the tone is constructive, not punitive — "This has been waiting 3 days. Want to knock it out or reschedule?"

## Epic 8: Real-Time Push & Notifications

WebSocket server for live updates to connected clients. Notification system with urgency gating by agent judgment. Multi-adapter delivery (terminal bell, WebSocket event, browser push). Agent failure notifications. Pluggable adapter architecture extends naturally to PWA and APK surfaces later.

### Story 8.1: WebSocket Server & Real-Time Event Push

As an operator,
I want real-time updates pushed to my dashboard and CLI without polling,
So that I see agent activity, newspaper updates, and task changes the moment they happen.

**Acceptance Criteria:**

**Given** the daemon is running
**When** a client connects via WebSocket
**Then** the Bun native WebSocket server accepts the connection alongside the Hono HTTP server (FR58)
**And** the connection is tracked for broadcast delivery

**Given** a WebSocket connection is established
**When** daemon events occur (agent status change, newspaper update, todo change, notification)
**Then** events are broadcast to all connected clients as typed JSON envelopes: `{ type, agentId?, payload, timestamp }` (NFR10)
**And** each event type has a corresponding Zod schema in the shared package
**And** message delivery completes in <500ms (NFR10)

**Given** a client disconnects (network drop, tab close, CLI exit)
**When** the connection is lost
**Then** the server cleans up the connection from its tracking list
**And** reconnecting clients receive the current state on reconnect — no event replay needed, daemon is source of truth

**Given** the WebSocket server encounters an error
**When** the error is caught
**Then** the error is logged and the server continues — WebSocket failures never crash the daemon
**And** other connected clients are unaffected

### Story 8.2: Notification System with Urgency Gating

As an operator,
I want notifications gated by agent-judged urgency so only important events interrupt me,
So that Herald earns trust through signal quality — not notification volume.

**Acceptance Criteria:**

**Given** an agent determines something warrants operator attention
**When** the agent calls the `notify(urgency, message)` primitive
**Then** the urgency level is evaluated against the operator's configured thresholds (FR45)
**And** urgency levels are: `low` (log only), `medium` (passive — visible on next dashboard check), `high` (active push notification), `critical` (immediate interrupt)

**Given** the operator configures notification preferences
**When** `PATCH /api/notifications/preferences` is called
**Then** urgency thresholds are updated: e.g., "only push for high and critical" (FR46)
**And** preferences are persisted in `memory/user/preferences.md`
**And** per-agent overrides are supported (e.g., "always push from geopolitical monitor")

**Given** a notification is below the operator's urgency threshold
**When** the notification is evaluated
**Then** it is logged but not actively delivered — visible only in notification history and dashboard
**And** the operator can review suppressed notifications via `GET /api/notifications/history`

### Story 8.3: Multi-Adapter Notification Delivery & Failure Alerts

As an operator,
I want notifications delivered through multiple channels with pluggable adapters,
So that I get alerts wherever I am and new delivery surfaces are easy to add.

**Acceptance Criteria:**

**Given** a notification passes the urgency gate
**When** the notification is dispatched
**Then** it is delivered through all active adapters simultaneously (FR47)
**And** initial adapters include: terminal bell (BEL character to stdout), WebSocket event (pushed to connected clients)
**And** browser push adapter (Web Push API) is available for future PWA/APK integration

**Given** a new notification adapter needs to be added
**When** the adapter is implemented
**Then** the adapter is a single file implementing the `NotificationAdapter` interface
**And** zero changes to agent code or the notification primitive — agents call `notify()`, adapters handle delivery
**And** the architecture supports future adapters: Android FCM push, Discord webhook, email digest

**Given** an agent run fails (FR48)
**When** the failure is detected by the daemon
**Then** a notification is generated with urgency level based on the agent's `notify_policy` from its YAML config
**And** the notification includes: agent name, failure mode (from Epic 6 Story 6.3), timestamp, and error summary
**And** failure notifications are delivered through the same adapter pipeline as all other notifications

## Epic 9: Communications & Inbox Integration

Comms agent monitors email inbox, evaluates urgency, flags important messages, and drafts responses for operator review. Smart todo expands to incorporate inbox state into task prioritization.

### Story 9.1: Comms Agent Persona & Inbox Monitoring

As an operator,
I want an agent that monitors my email inbox and keeps track of what needs attention,
So that important messages don't get buried and I never miss something urgent.

**Acceptance Criteria:**

**Given** the comms agent YAML and persona MD are deployed
**When** the comms agent activates on its schedule
**Then** the agent connects to the email inbox via IMAP or REST API (FR42)
**And** the agent scans for new and unread messages since its last run

**Given** the inbox connection fails
**When** a connection error occurs
**Then** the agent retries with exponential backoff — missed polls are retried, not dropped (NFR16)
**And** the failure is logged but does not affect other agents or daemon stability

**Given** the comms agent processes inbox messages
**When** message content is persisted (summaries, flags, drafts)
**Then** conversation logs containing potentially sensitive email content are stored with filesystem permissions restricted to the daemon user (NFR23)
**And** email credentials are stored in .env, never in agent YAML or persona MD (NFR20)

**Given** the comms agent completes a polling run
**When** the run finishes
**Then** a summary report is written to `reports/comms/{timestamp}.md` with YAML frontmatter
**And** the report includes: new message count, flagged items, urgency assessments

### Story 9.2: Urgency Evaluation & Draft Responses

As an operator,
I want the comms agent to evaluate email urgency and draft responses for my review,
So that I can triage my inbox efficiently and respond faster to important messages.

**Acceptance Criteria:**

**Given** the comms agent processes a new email
**When** the agent evaluates the message
**Then** the agent assigns an urgency level based on: sender, subject, content, context (FR43)
**And** high-urgency messages are flagged for immediate operator attention
**And** flagged messages trigger a notification through the notification system (Epic 8)

**Given** a flagged email warrants a response
**When** the agent drafts a response
**Then** the draft is saved as a suggestion for operator review — never auto-sent (FR44)
**And** the draft is accessible via `GET /api/comms/drafts`
**And** the operator can approve, edit, or discard the draft

**Given** the operator reviews drafts
**When** `GET /api/comms` is called
**Then** the response includes: inbox summary, flagged messages with urgency, pending drafts
**And** the dashboard and CLI comms views reflect the current inbox state

### Story 9.3: Inbox-Aware Task Prioritization

As an operator,
I want flagged emails to surface as action items in my daily task list,
So that important communications are integrated into my workflow — not a separate inbox I forget to check.

**Acceptance Criteria:**

**Given** the comms agent has flagged emails requiring action
**When** the smart todo agent generates the daily task list
**Then** flagged emails are incorporated as task candidates with source "inbox" (FR28)
**And** email-sourced tasks include: sender, subject, urgency, and suggested action (reply/review/follow-up)

**Given** an important email has gone unanswered for multiple days
**When** the smart todo agent reads the comms agent's reports
**Then** the unanswered email surfaces with increasing priority in the task list
**And** the accountability pattern mirrors task procrastination tracking from Epic 7

**Given** the operator completes an inbox-sourced task (sends reply, takes action)
**When** the task is marked complete
**Then** the daily ledger records the completion with source attribution
**And** the comms agent's next run reflects the updated inbox state

## Epic 10: The Orchestrator & Project Portal

Orchestrator as universal front desk — routes commands, creates new agents from natural language descriptions (complete YAML + persona MD). Project portal onboards into any BMAD project. Idea capture through brainstorming sessions, promotable to full projects.

### Story 10.1: Orchestrator Agent Persona & Command Routing

As an operator,
I want a universal front desk agent that understands what I need and routes me to the right place,
So that I interact naturally with Herald without memorizing commands or agent names.

**Acceptance Criteria:**

**Given** the orchestrator agent YAML and persona MD are deployed
**When** the operator opens a chat with the orchestrator (via dashboard, CLI, or API)
**Then** the orchestrator is the default agent for all user interaction
**And** the orchestrator's BMAD persona includes routing knowledge: which agents handle which domains, available workflows, system capabilities

**Given** the operator sends a natural language request
**When** the orchestrator interprets the intent
**Then** the orchestrator routes to the appropriate agent or action:
- "show my paper" → fetches newspaper, returns to operator
- "talk to ml-researcher" → hands off chat to the ML researcher session
- "status of project X" → routes to project portal
- "schedule compute research every 2h" → updates agent YAML, daemon hot-reloads
- "what did agents talk about today" → pulls conversation logs, summarizes

**Given** the orchestrator cannot determine the intent
**When** the request is ambiguous
**Then** the orchestrator asks clarifying questions rather than guessing
**And** the orchestrator maintains conversational context within its bounded session

### Story 10.2: Natural Language Agent Creation

As an operator,
I want to describe a new agent in plain English and have it fully created and operational immediately,
So that adding intelligence to Herald is as easy as having a conversation.

**Acceptance Criteria:**

**Given** the operator tells the orchestrator "I want a new agent that tracks [domain]"
**When** the orchestrator processes the request
**Then** the orchestrator generates a complete agent definition (FR3, FR4):
- YAML config with: name, persona reference, schedule, output_dir, notify_policy, session_limit, memory paths, trigger rules
- BMAD persona MD with: domain expertise, research methodology, opinion framework, knowledge structure, patrol workflow instructions

**Given** the orchestrator generates agent files
**When** the files are written to `agents/` and `personas/`
**Then** the daemon auto-discovers the new agent via file watcher (Epic 1 Story 1.3)
**And** the daemon scaffolds memory directories, knowledge.md skeleton, and reports dir automatically
**And** the scheduler registers the agent's cron schedule
**And** the librarian begins tracking the agent's output on next run
**And** the agent appears in the dashboard, scheduling tab, and agent list — zero manual steps

**Given** the orchestrator presents the agent definition to the operator
**When** the operator reviews it
**Then** the operator can approve, request changes, or reject before files are written
**And** generated agents are complete on delivery — not stubs that need manual editing
**And** a generated agent is indistinguishable from a hand-crafted one

**Given** the generated agent YAML is written
**When** the daemon validates it
**Then** the YAML passes Zod validation — the orchestrator produces valid configs by construction (NFR25)

### Story 10.3: Project Portal & BMAD Project Onboarding

As an operator,
I want to point Herald at any BMAD project and have it become queryable and actionable,
So that all my projects are accessible through one system.

**Acceptance Criteria:**

**Given** a BMAD project exists with existing context (PRD, architecture, sprint plans, etc.)
**When** the operator tells the orchestrator to onboard a project
**Then** the project portal agent interrogates the project's existing BMAD context (FR49)
**And** the portal absorbs: architecture decisions, PRD requirements, sprint status, agent personas, project history
**And** the project is registered in `memory/user/projects.md`

**Given** projects are registered
**When** `GET /api/projects` is called
**Then** status cards are returned for all registered projects with: name, health, last activity, active sprint (FR50)
**And** the dashboard shows project cards in the projects view

**Given** the operator wants to interact with a project
**When** the operator asks the orchestrator about a specific project
**Then** the orchestrator routes to the project portal with the project context loaded (FR51)
**And** the operator can query project status, ask questions about architecture, get next actions
**And** the project portal maintains context about the project across interactions

### Story 10.4: Brainstorming & Idea Promotion

As an operator,
I want to capture ideas through brainstorming sessions and promote the best ones to full projects,
So that no idea is lost and the path from spark to structured project is frictionless.

**Acceptance Criteria:**

**Given** the operator wants to brainstorm
**When** the operator initiates a brainstorming session via the orchestrator
**Then** the orchestrator activates the brainstorming workflow (FR52)
**And** ideas are explored, structured, and saved as files at `reports/brainstorming/idea-{date}-{slug}.md`
**And** each idea file has YAML frontmatter with: title, date, status (raw/structured/promoted), tags

**Given** a structured idea file exists
**When** the operator decides to promote it
**Then** `herald promote <idea-slug>` or an orchestrator command initiates promotion (FR53)
**And** the idea is scaffolded into a full BMAD project with initial context derived from the idea file
**And** the new project is registered in the project portal

**Given** the operator wants to review past ideas
**When** `GET /api/ideas` is called or the dashboard ideas view is opened
**Then** all idea files are listed with: title, date, status, tags
**And** the operator can filter by status (raw/structured/promoted) and tags

### Story 10.5: Orchestrator Dashboard Pane

As an operator,
I want an orchestrator pane in the TUI dashboard where I can create agents through natural conversation,
So that I can build new agents without leaving the dashboard.

**Acceptance Criteria:**

**Given** the TUI dashboard is active (from Epic 5)
**When** the operator opens the orchestrator pane via keybind
**Then** the operator can chat with the orchestrator to describe a new agent in natural language

**Given** the orchestrator receives a new agent request
**When** the orchestrator generates the agent definition
**Then** the orchestrator generates the complete agent scaffold (YAML config + persona MD) and writes it to agents/ and personas/
**And** the daemon auto-discovers the new agent, creates its memory directories and knowledge.md skeleton, registers its schedule, and the librarian begins tracking its output — all automatically via existing file watcher infrastructure
**And** the new agent appears in the agent cards bar and scheduling tab without restart

**Given** the dashboard is active
**When** the operator navigates between panes
**Then** the orchestrator pane is available alongside newspaper, todos, and scheduling panes

## Epic 11: Mobile Experience (PWA)

Progressive Web App as the mobile surface — newspaper viewer, chat, agent cards, todos, inbox, logs, settings. Service worker for offline caching of last newspaper and current todo list. Full mobile-to-CLI continuity.

### Story 11.1: PWA Scaffold & App Shell

As an operator,
I want a lightweight mobile web app that connects to my Herald daemon,
So that I can access my intelligence engine from my phone during the day.

**Acceptance Criteria:**

**Given** the PWA package is scaffolded with Preact + Vite + @preact/preset-vite
**When** `bun --cwd packages/pwa dev` is run
**Then** a Vite dev server starts with HMR and the app loads in Firefox and Chromium browsers

**Given** the PWA app shell loads
**When** the app initializes
**Then** preact-iso routing is configured with lazy-loaded routes for: home, newspaper, chat, agents, todos, projects, logs, settings
**And** a persistent navigation bar provides access to all routes
**And** Tailwind CSS provides mobile-first responsive styling
**And** @preact/signals manages all UI state

**Given** the app is running
**When** the WebSocket connection to the daemon is established
**Then** real-time updates flow to the app — agent status, newspaper updates, todo changes, notifications
**And** if the WebSocket disconnects, the app shows a "Last synced: [timestamp]" indicator
**And** the app attempts reconnection automatically

**Given** the app is served
**When** a service worker is registered
**Then** static assets are cached for fast subsequent loads
**And** the app is installable as a PWA on mobile devices

### Story 11.2: Newspaper & Todo Mobile Views

As an operator,
I want to read my newspaper and manage my todos from my phone,
So that I can start my day with Herald before I'm at my workstation.

**Acceptance Criteria:**

**Given** the home page loads
**When** today's data is available
**Then** the home screen shows: today's newspaper headline, todo summary (X of Y complete), and notification badges

**Given** the operator navigates to the newspaper view
**When** the current edition is available
**Then** the newspaper renders as formatted markdown via the marked library (FR23)
**And** the operator can scroll through the full newspaper with touch gestures
**And** edition history is browsable — tap to select a past edition (FR24)
**And** weekly synthesis papers are accessible from the newspaper view

**Given** the operator navigates to the todos view
**When** today's task list is loaded
**Then** tasks are displayed with status indicators, priority, and source
**And** the operator can tap to complete a task — change is sent to daemon API (FR30)
**And** the operator can add a new task via inline input
**And** the list updates in real-time via WebSocket when tasks change

### Story 11.3: Agent Cards, Chat & Project Views

As an operator,
I want to see my agents' status and chat with them from my phone,
So that I can interact with Herald's intelligence layer on the go.

**Acceptance Criteria:**

**Given** the operator navigates to the agents view
**When** the agent list loads
**Then** agent cards display: name, status indicator (success/failed/running), last run time, next scheduled
**And** tapping an agent card opens the agent detail view

**Given** the operator opens an agent detail view
**When** the detail loads
**Then** the agent's recent reports are listed, tappable to read full content
**And** a chat input is available to start a conversation with the agent (FR8)
**And** agent responses render as formatted markdown
**And** the chat supports multi-turn conversation within the agent's bounded session

**Given** the operator navigates to the projects view
**When** registered projects are loaded
**Then** project status cards display: name, health, last activity (FR50)
**And** tapping a project card opens the project detail with queryable context (FR51)

### Story 11.4: Offline Caching & Push Notifications

As an operator,
I want to read my newspaper and todos offline and receive push notifications,
So that Herald is useful even without a connection and important alerts reach me immediately.

**Acceptance Criteria:**

**Given** the service worker is active
**When** the app goes offline (network unavailable, Tailscale disconnected)
**Then** the last cached newspaper edition is available for reading (FR62)
**And** the current todo list is available for viewing (FR62)
**And** no offline mutations are supported — changes queue until reconnection
**And** a clear "Offline — Last synced: [timestamp]" indicator is visible

**Given** the operator reconnects after being offline
**When** the WebSocket re-establishes
**Then** the app syncs to current state from the daemon — daemon is source of truth
**And** any stale cached data is replaced with fresh data

**Given** push notifications are configured
**When** a notification passes the urgency gate (Epic 8)
**Then** a browser push notification is delivered via the Web Push API adapter
**And** tapping the notification opens the relevant view in the PWA (newspaper for breaking news, todos for check-ins, comms for urgent emails)

**Given** the operator configures notification preferences in settings
**When** preferences are updated
**Then** changes are sent to the daemon API and persisted
**And** the settings view shows current urgency thresholds and per-agent overrides
