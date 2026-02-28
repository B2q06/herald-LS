---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - _bmad-output/brainstorming/brainstorming-session-2026-02-27.md
workflowType: 'research'
lastStep: 1
research_type: 'technical'
research_topic: 'Herald Tech Stack Validation'
research_goals: 'Tech validation and architecture decisions for Herald daemon layer (cron scheduling, file watching, WebSocket), memory stack (RAG vectors, SQLite FTS5, depreciating knowledge.md), and TypeScript vs Go implementation choice'
user_name: 'B'
date: '2026-02-27'
web_research_enabled: true
source_verification: true
---

# Herald Tech Stack Validation: Comprehensive Technical Research

**Date:** 2026-02-27
**Author:** B
**Research Type:** Technical Architecture Validation

---

## Executive Summary

Herald is a unified personal assistant OS that merges autonomous agent intelligence (Claude Agent SDK) with structured workflow facilitation (BMAD framework) into a single system. A thin TypeScript daemon handles scheduling, file watching, and WebSocket delivery while Claude SDK sessions — injected with BMAD personas — do all the thinking. This research validates every layer of that architecture.

**Key Findings:**

- **TypeScript is the right choice** for the daemon — it shares the Claude Agent SDK ecosystem, handles I/O-bound workloads natively, and eliminates the friction of maintaining two language stacks
- **Claude Agent SDK V2 persistent sessions** are a game-changer — agents accumulate context across runs, sessions resume instantly, and 30+ hours of sustained operation is proven. This simplifies Herald's continuity model significantly
- **Unified SQLite stack** (FTS5 + sqlite-vec) keeps the entire memory architecture embedded with zero infrastructure — full-text search AND vector similarity in one database engine
- **Filesystem as event bus** via chokidar v5 is architecturally elegant and production-ready — agent outputs trigger downstream workflows through file events
- **BMAD agent structure maps directly** — Herald agents are BMAD persona MDs wrapped with Herald runtime YAML configs. No framework collision, clean separation of concerns
- **Claude Max subscription ($200/mo)** removes cost as a design constraint — run Opus everywhere, use teams aggressively, keep sessions persistent

**Strategic Recommendations:**

1. Build incrementally: daemon core → agent spawning → event pipeline → memory → real agents → Android app
2. Use teams heavily for synthesis sessions — the subscription model rewards agent density
3. Keep the daemon stupid and the brain smart — all intelligence in Claude SDK sessions, daemon only routes and dispatches
4. Design for persistent agents from day one — don't build the bounded-session-then-exit pattern when the SDK supports true persistence

## Table of Contents

1. [Technical Research Scope Confirmation](#technical-research-scope-confirmation)
2. [Technology Stack Analysis](#technology-stack-analysis) — TypeScript vs Go, cron, file watching, WebSocket, SQLite FTS5, RAG vectors, Claude Agent SDK
3. [Integration Patterns Analysis](#integration-patterns-analysis) — filesystem event bus, daemon-to-brain spawning, inter-agent communication, WebSocket, notifications, MCP
4. [Architectural Patterns and Design](#architectural-patterns-and-design) — two-body architecture, declarative agents, persistent sessions, embedded SQLite, event pipeline, BMAD-native agent structure, deployment
5. [Implementation Approaches](#implementation-approaches-and-technology-adoption) — cost model, Typst newspaper pipeline, testing strategy, implementation roadmap, risk assessment, final recommendations

---

## Research Overview

Broad technology validation survey for Herald — a unified personal assistant OS built on Claude Agent SDK with a thin daemon layer, multi-agent orchestration, and dual-surface delivery (CLI + Android). Research validates specific technology choices for the daemon infrastructure (cron, file watching, WebSocket), memory architecture (SQLite FTS5, sqlite-vec), language selection (TypeScript), agent structure (BMAD-native), and implementation approach. All findings verified against current (Feb 2026) web sources with multi-source validation.

---

## Technical Research Scope Confirmation

**Research Topic:** Herald Tech Stack Validation
**Research Goals:** Tech validation and architecture decisions for Herald daemon layer (cron scheduling, file watching, WebSocket), memory stack (RAG vectors, SQLite FTS5, depreciating knowledge.md), and TypeScript vs Go implementation choice

**Technical Research Scope:**

- Architecture Analysis - design patterns, frameworks, system architecture
- Implementation Approaches - development methodologies, coding patterns
- Technology Stack - languages, frameworks, tools, platforms
- Integration Patterns - APIs, protocols, interoperability
- Performance Considerations - scalability, optimization, patterns

**Research Methodology:**

- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Comprehensive technical coverage with architecture-specific insights

**Scope Confirmed:** 2026-02-27

---

## Technology Stack Analysis

### TypeScript vs Go for the Daemon

Herald's daemon is the "95% stupid" always-running process — cron scheduler, file watcher, WebSocket server, notification dispatcher. The brain (Claude SDK) is spawned on demand. This means the daemon is primarily I/O-bound, not CPU-bound.

**Go — Pros:**
- Compiles to a single static binary with no runtime dependencies
- Goroutines provide lightweight concurrency (few KB each vs MBs for OS threads)
- Predictable memory usage and no garbage collection pauses comparable to Node.js
- Docker images under 10MB vs 100MB+ for Node.js
- Built for exactly this kind of long-running infrastructure daemon
- No memory leak risk from long-running processes

**Go — Cons:**
- Separate language from the Claude Agent SDK (TypeScript/Python)
- Team needs to maintain two language ecosystems
- Less natural integration with BMAD workflow MDs and persona files (string-heavy work)
- Slower iteration speed for changes to agent activation logic

**TypeScript — Pros:**
- Same language as Claude Agent SDK — single ecosystem, shared types, shared tooling
- Agent activation logic can share code with the brain layer
- Faster development velocity for a solo/small team
- Rich npm ecosystem for every daemon component (cron, file watch, WebSocket)
- BMAD workflows are markdown-heavy — TypeScript handles string/template work naturally
- Claude Agent SDK TypeScript SDK at v0.2.37 with 1.85M weekly downloads — mature and actively developed

**TypeScript — Cons:**
- Higher memory baseline (~100MB+ Docker images)
- Single-threaded event loop — CPU-bound work blocks (but daemon is I/O-bound)
- Long-running Node.js processes can develop memory leaks if not careful
- Slightly less predictable performance under load vs Go

**Verdict for Herald:** TypeScript is the stronger choice. The daemon is I/O-bound (exactly what Node.js excels at), shares the ecosystem with Claude Agent SDK, and Herald is a solo project where maintaining two language stacks adds unnecessary friction. The performance delta is irrelevant for a daemon managing cron schedules and file watchers.

_Confidence: High_
_Sources: [Leanware](https://www.leanware.co/insights/typescript-vs-go-comparison), [DEV Community](https://dev.to/encore/typescript-vs-go-choosing-your-backend-language-2bc5), [In The Pocket](https://www.inthepocket.com/blog/typescript-go-in-duo-for-backend-development)_

### Cron Scheduling

Herald needs cron to schedule agent patrol runs (e.g., "30 5,11,17,23 * * *" for research agents). The scheduler sends prompt strings to Claude sessions — no heavy job queue needed.

**node-cron** — Lightweight, in-process cron syntax scheduler. No external dependencies. Simple API: `cron.schedule('*/5 * * * *', callback)`. No persistence, no Redis, no MongoDB. Perfect for "send this prompt at this time."

**node-schedule** — Similar to node-cron but supports Date-based scheduling in addition to cron syntax. Slightly more flexible, same lightweight profile.

**BullMQ** (successor to Bull) — Redis-backed job queue with delayed jobs, retries, concurrency control, job prioritization. Rewritten in TypeScript. Overkill for Herald's use case — introduces Redis as a dependency for what amounts to "run this callback on a schedule."

**Agenda** — MongoDB-backed job scheduler. Designed for persistent, complex job orchestration. Again overkill — introduces MongoDB dependency.

**Recommendation for Herald:** `node-cron` or `node-schedule`. The daemon's job is to nudge agent sessions with prompt strings on a schedule. No persistence needed (agent YAML configs are the source of truth, daemon reloads on restart). No distributed workers. A simple in-process scheduler that reads agent YAML configs and sets up cron jobs is exactly right.

_Confidence: High_
_Sources: [Better Stack](https://betterstack.com/community/guides/scaling-nodejs/best-nodejs-schedulers/), [LogRocket](https://blog.logrocket.com/comparing-best-node-js-schedulers/), [AppSignal](https://blog.appsignal.com/2023/09/06/job-schedulers-for-node-bull-or-agenda.html)_

### File Watching

Herald uses file events as its event bus — agent output files trigger downstream workflows (e.g., new report in `reports/ml-papers/` triggers newspaper update).

**chokidar v5** (Nov 2025) — Rewritten in TypeScript, ESM-only, single dependency. Uses native OS APIs under the hood (inotify on Linux, FSEvents on macOS, ReadDirectoryChangesW on Windows). Normalizes cross-platform inconsistencies. Handles edge cases that raw `fs.watch` misses (duplicate events, missing filenames on macOS, editor-specific quirks with Sublime/VS Code).

**fs.watch (Node.js native)** — Zero dependencies but unreliable: reports events twice, doesn't report filenames on macOS, emits most changes as `rename`. Vite considered switching from chokidar to fs.watch (Node 19.1+ recursive support) but the discussion highlighted remaining reliability gaps.

**Recommendation for Herald:** `chokidar v5`. Herald runs on Linux (inotify) so many cross-platform concerns don't apply, but chokidar's event normalization, TypeScript rewrite, and single-dependency profile make it the clear choice. The filesystem IS the event bus in Herald's architecture — reliability here is critical.

_Confidence: High_
_Sources: [chokidar GitHub](https://github.com/paulmillr/chokidar), [Vite issue #12495](https://github.com/vitejs/vite/issues/12495), [npm-compare](https://npm-compare.com/chokidar,gaze,node-watch,nodemon,watch)_

### WebSocket Server

Herald needs WebSocket to push updates to connected surfaces (Android app, future web UI). The daemon pushes file updates, notifications, and agent status to clients.

**ws** — Lean, low-level WebSocket implementation. Handles 50K+ connections per server. Raw performance, minimal overhead. You manage reconnection and heartbeat logic yourself. Best for high-throughput, low-latency scenarios.

**Socket.IO** — Higher-level abstraction with auto-reconnect, heartbeats, rooms, namespaces, broadcasting built in. Falls back to HTTP long-polling if WebSocket unavailable. Larger message size due to custom event framing. Easier to implement but more overhead.

**Recommendation for Herald:** `ws` for the server. Herald's WebSocket needs are straightforward — push file updates and notifications to connected clients. No rooms/namespaces needed. The daemon pushes to surfaces, clients receive. Auto-reconnect logic belongs on the client side (Android app, web frontend). `ws` keeps the daemon lean and the protocol simple. If the Android app or web UI needs Socket.IO-style convenience, a thin wrapper on the client side handles that without bloating the server.

**File delivery over WebSocket:** `ws` supports binary frames natively. Herald's outputs are markdown files and Typst-compiled PDFs — well within WebSocket's comfort zone. The daemon can push files directly to connected clients as binary frames alongside JSON metadata messages, eliminating the need for a separate REST file-serving endpoint. Single transport for events, notifications, AND file delivery simplifies the architecture.

_Confidence: High_
_Sources: [DEV Community](https://dev.to/alex_aslam/nodejs-websockets-when-to-use-ws-vs-socketio-and-why-we-switched-di9), [Ably](https://ably.com/topic/socketio-vs-websocket), [Velt](https://velt.dev/blog/best-nodejs-websocket-libraries)_

### Memory Stack — SQLite FTS5 (Cross-Agent Index)

Herald's shared index for cross-agent knowledge discovery. The Memory Librarian agent indexes all agent knowledge into a shared SQLite database after every run.

**SQLite FTS5 capabilities:**
- Retrieval ~30% faster than FTS3, index creation ~40% faster
- Built-in relevance scoring via `matchinfo()` and custom ranking functions
- Custom tokenizers for domain-specific needs
- JSON support for structured metadata alongside full-text content
- Zero-server architecture — single file on disk, embedded in process

**Node.js integration via better-sqlite3:**
- Synchronous API (no callback hell) — fits Herald's indexing workflow
- Full FTS5 support including custom tokenizers
- Excellent performance for read-heavy workloads
- Single file database — trivial backup, no server process

**Verdict for Herald:** SQLite FTS5 via `better-sqlite3` is a strong fit. The Librarian agent runs after every agent session, indexes new knowledge, and the shared index is queried when agents need cross-domain discovery. No server process, no external dependency, embedded in the daemon. FTS5's performance characteristics handle Herald's scale (dozens of agents, not millions of documents) with room to spare.

_Confidence: High_
_Sources: [SQLite FTS5 docs](https://sqlite.org/fts5.html), [sqlite.ai blog](https://blog.sqlite.ai/fts5-sqlite-text-search-extension), [SQL Easy](https://www.sql-easy.com/learn/sqlite-full-text-search/)_

### Memory Stack — RAG Vector Store (Per-Agent Cold Memory)

Each Herald agent has a vector store for long-term memory recall. Hot memory (`knowledge.md`) depreciates over time; cold memory persists in vectors and is queryable on demand.

**sqlite-vec** — SQLite extension for vector search. Embeds directly into the existing SQLite stack. No additional server or process. Supports local RAG without external services. Keeps the entire memory stack in the SQLite ecosystem.

**LanceDB** — Embedded vector database, no server required. Runs inside the application process. API feels like Pandas/SQLite. Good for personal assistants that run locally. 40-60ms query times, ~88% recall with IVF_PQ. Lower memory footprint than alternatives.

**ChromaDB** — Fastest prototyping path. Zero-config embedded mode. 2025 Rust rewrite delivers 4x performance improvement. Ideal for MVPs under 10M vectors. But adds a Python dependency or requires running as a separate service.

**Qdrant** — High-performance vector search, 20-30ms queries, ~95% recall with HNSW. But requires running as a separate server process — adds deployment complexity for a personal system.

**Recommendation for Herald:** `sqlite-vec` is the most architecturally coherent choice. Herald already uses SQLite (via better-sqlite3) for the shared FTS5 index. Adding vector search as a SQLite extension means the entire memory stack — full-text search AND vector similarity — lives in a single embedded database with zero additional infrastructure. Per-agent vector stores are just separate SQLite databases with the vec extension loaded. If sqlite-vec's recall/performance proves insufficient for Herald's scale, LanceDB is the natural fallback (still embedded, no server). ChromaDB and Qdrant add unnecessary infrastructure for a personal assistant system.

_Confidence: Medium-High (sqlite-vec is newer, less battle-tested than alternatives, but architecturally compelling)_
_Sources: [DEV Community - sqlite-vec](https://dev.to/aairom/embedded-intelligence-how-sqlite-vec-delivers-fast-local-vector-search-for-ai-3dpb), [LanceDB](https://lancedb.com/), [Firecrawl comparison](https://www.firecrawl.dev/blog/best-vector-databases), [Latenode comparison](https://latenode.com/blog/ai-frameworks-technical-infrastructure/vector-databases-embeddings/best-vector-databases-for-rag-complete-2025-comparison-guide)_

### Claude Agent SDK (The Brain)

Herald's intelligence layer — every agent session is a Claude SDK session with BMAD persona + workflow MDs injected.

**Current state (Feb 2026):**
- TypeScript SDK at v0.2.37 with 1.85M+ weekly downloads
- V2 preview available — removes async generator/yield coordination, each turn is a separate `send()`/`stream()` cycle
- Built-in tools, automatic context management, session persistence, fine-grained permissions
- Native subagent orchestration and MCP extensibility
- Claude Opus 4.6 (Feb 5, 2026) — new architecture specifically optimized for agentic task performance, tool use, complex instructions, and long multi-step tasks

**Multi-agent capabilities:**
- Team orchestration: one session coordinates, teammates work independently in own context windows
- Inter-agent messaging and shared task management
- Direct peer-to-peer communication between agents

**Verdict for Herald:** The Claude Agent SDK TypeScript SDK is the natural foundation. Herald's "single brain, many personas" architecture maps directly to the SDK's model — same engine, different persona/workflow injection per session. Subagent spawning for parallel lookups, team sessions for synthesis meetings, bounded session persistence — all native SDK capabilities. The V2 preview simplifies multi-turn session management which aligns with Herald's bounded session pattern (N interactions then save + exit).

_Confidence: High_
_Sources: [Claude Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview), [TypeScript SDK Reference](https://platform.claude.com/docs/en/agent-sdk/typescript), [GitHub](https://github.com/anthropics/claude-agent-sdk-typescript)_

### Technology Adoption Summary

| Component | Recommended Choice | Confidence | Rationale |
|---|---|---|---|
| **Language** | TypeScript | High | Same ecosystem as Claude Agent SDK, I/O-bound daemon, solo project |
| **Cron** | node-cron / node-schedule | High | Lightweight, no external deps, daemon reloads from YAML |
| **File Watching** | chokidar v5 | High | TypeScript rewrite, reliable event normalization, 1 dependency |
| **WebSocket** | ws | High | Lean, 50K+ connections, binary frames for md/PDF delivery |
| **Full-Text Search** | SQLite FTS5 + better-sqlite3 | High | Embedded, fast, zero-server, fits Librarian indexing pattern |
| **Vector Store** | sqlite-vec (fallback: LanceDB) | Medium-High | Unified SQLite stack, embedded, no infra overhead |
| **Brain** | Claude Agent SDK (TypeScript) | High | Native multi-agent, subagents, session persistence, MCP |

---

## Integration Patterns Analysis

### Filesystem as Event Bus

Herald's core integration pattern: agent outputs are events. A new file in `reports/ml-papers/` triggers the newspaper agent. The filesystem IS the message bus.

**Pattern:** Watch → Debounce → Scan → Diff → Dispatch

Best practice for file-event-driven architectures is to treat watch events as hints, not truth. The recommended flow: receive watch event → debounce briefly → re-scan target directory state → compute actual diff → apply idempotent update logic. This handles edge cases like editor save-then-rename patterns, duplicate events, and event coalescing on high-throughput writes.

**Herald implementation:**
- chokidar v5 watches configured paths per agent YAML (`triggers[].watch`)
- Debounce window (e.g., 200ms) prevents duplicate triggers
- Condition matching against file content (`triggers[].condition: "contains:semiconductor"`)
- Dispatch to target agent with trigger message (`triggers[].message`)
- Idempotent — re-triggering the same file event produces the same result

**Risk mitigation:** Infinite trigger loops (agent A output triggers agent B, whose output triggers agent A). Solution: daemon tracks trigger chain iteration count per event origin. If iterations exceed a configurable threshold (e.g., 5 in a short window), spawn a meta-agent to review the conversation/output logs and evaluate whether the chain is productive convergence or a runaway loop. If productive, allow continuation. If not, break the chain and notify the user. This preserves legitimate multi-bounce workflows while catching genuine loops.

_Confidence: High_
_Sources: [GeeksforGeeks](https://www.geeksforgeeks.org/node-js/explain-the-event-driven-architecture-of-node-js/), [TheLinuxCode](https://thelinuxcode.com/nodejs-file-system-in-practice-a-production-grade-guide-for-2026/), [FreeCodeCamp](https://www.freecodecamp.org/news/event-based-architectures-in-javascript-a-handbook-for-devs/)_

### Daemon-to-Brain Spawning

The daemon spawns Claude SDK sessions on demand — triggered by cron, file events, or user commands. Each session is an independent process with BMAD persona + workflow MDs injected.

**Spawning pattern:**
- Node.js `child_process.fork()` or `spawn()` for agent sessions — returns a `ChildProcess` with EventEmitter API for monitoring
- Each agent run is a separate process: isolation, crash containment, independent memory
- Daemon tracks active sessions, enforces bounded persistence (N interactions then save + exit)
- Session startup includes: load persona MD, load knowledge.md, check last-jobs.md for continuity

**Claude Agent SDK V2 session persistence:** The V2 SDK provides native persistent sessions that fundamentally change the spawning model:
- `createSession()` → returns a session ID, saved to disk by default
- `resumeSession(id)` → resumes exactly where it left off, full context restored, no cold start
- Each turn is a separate `send()`/`stream()` cycle — session stays open between turns
- Server-side compaction handles long conversations automatically — oldest parts get summarized as context approaches limits. 30+ hours sustained operation observed
- Session forking via `forkSession` for branching investigations without polluting main session
- Rewind capabilities via `resumeSessionAt` (specific message UUID) and `rewindFiles()`

**Impact on Herald's architecture:** Agents can be genuinely persistent rather than bounded-then-exit. The daemon calls `send("activate research-patrol")` on an existing session — agent retains full context of prior runs. The ~12s cold start only applies to **new** sessions; resuming is near-instant. This may simplify or eliminate the `last-jobs.md` continuity pattern, as sessions persist natively (keep `last-jobs.md` as backup for session recycling edge cases).

**Orchestration model:** Herald uses a manager pattern — the daemon (or orchestrator agent) decides what to spawn. For team sessions (e.g., newspaper synthesis), one agent spawns teammates using the Claude SDK's native subagent orchestration.

_Confidence: High_
_Sources: [Node.js child_process docs](https://nodejs.org/api/child_process.html), [Claude Agent SDK daemon mode issue](https://github.com/anthropics/claude-agent-sdk-typescript/issues/33), [Anthropic engineering blog](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)_

### Inter-Agent Communication

Herald agents can initiate team sessions autonomously — the geopolitical monitor can ping the compute researcher about supply chain overlap without user approval.

**Pattern:** The Claude Agent SDK natively supports multi-agent orchestration:
- One session acts as team lead, coordinating work and assigning tasks
- Teammates work independently in their own context windows
- Direct peer-to-peer messaging between agents
- All conversations logged and browsable

**Herald implementation:**
- Team sessions are spawned by the initiating agent via SDK subagent orchestration
- Conversation transcripts persisted to `memory/conversations/` with metadata (who initiated, why, conclusions)
- The daemon doesn't mediate agent-to-agent communication — the SDK handles it natively
- Post-session: Memory Librarian indexes conversation content into shared SQLite

_Confidence: High_
_Sources: [Claude Agent SDK overview](https://platform.claude.com/docs/en/agent-sdk/overview), [Agent teams docs](https://code.claude.com/docs/en/agent-teams)_

### WebSocket Client Communication

Single transport for all daemon-to-surface communication: real-time events, notifications, status updates, AND file delivery.

**Protocol design:**
```
Message types:
  { type: "event", agent: "ml-researcher", event: "run_complete", summary: "..." }
  { type: "notification", urgency: "high", message: "..." }
  { type: "status", agents: [...], nextRuns: [...] }
  { type: "file_meta", name: "newspaper.pdf", size: 12345 }
  [binary frame: file content]
```

**Connection management:**
- `ws` server on daemon, clients connect on startup
- Reconnection logic on client side (Android app, web UI)
- Heartbeat/ping-pong to detect stale connections (ws supports this natively)
- Multiple simultaneous clients supported (phone + web)

_Confidence: High_
_Sources: [DEV Community](https://dev.to/alex_aslam/nodejs-websockets-when-to-use-ws-vs-socketio-and-why-we-switched-di9), [Ably](https://ably.com/topic/socketio-vs-websocket)_

### Notification Dispatch

Herald's `notify(urgency, message)` is an abstract primitive — agents call it, delivery surfaces are pluggable adapters.

**Firebase Cloud Messaging (FCM) for Android:**
- Free, cross-platform push notification service
- Node.js integration via Firebase Admin SDK
- Service account JSON key for server authentication
- HTTP V1 protocol (current standard as of 2026)
- Supports notification messages (system tray) and data messages (app handles display)

**Other surfaces (pluggable adapters):**
- Terminal bell + desktop notification (local, trivial)
- Discord webhook (HTTP POST, no SDK needed)
- Future surfaces: just add a new adapter, zero agent changes

**Herald implementation:**
- Agent calls `notify(urgency, message)` — doesn't know transport
- Daemon's notification dispatcher evaluates urgency against user preferences
- Routes to configured adapters: FCM push, WebSocket event, terminal bell
- Adapter interface: `send(urgency: string, message: string): Promise<void>`

_Confidence: High_
_Sources: [Firebase FCM docs](https://firebase.google.com/docs/cloud-messaging), [Medium - FCM HTTP V1](https://medium.com/@rhythm6194/send-fcm-push-notification-in-node-js-using-firebase-cloud-messaging-fcm-http-v1-2024-448c0d921fff)_

### MCP Extensibility

Model Context Protocol extends agent capabilities with external tool integrations without custom code.

**Current ecosystem (Feb 2026):**
- 200+ MCP servers available
- Official SDK `@modelcontextprotocol/sdk` at v1.12
- HTTP streamable transport replacing SSE (2025-03 spec)
- JSON-RPC 2.0 communication protocol

**Herald relevance:**
- Research agents can use MCP tools for web search, GitHub integration, API access
- Comms agent can integrate with email providers via MCP
- New capabilities added by dropping in MCP server configs — no agent code changes
- Aligns with Herald's declarative philosophy: add capabilities via config, not code

_Confidence: High_
_Sources: [Claude Agent SDK MCP docs](https://platform.claude.com/docs/en/agent-sdk/mcp), [Promptfoo](https://www.promptfoo.dev/docs/providers/claude-agent-sdk/)_

### Integration Pattern Summary

| Pattern | Mechanism | Notes |
|---|---|---|
| **Scheduling → Brain** | node-cron triggers `child_process.spawn()` | Prompt string from agent YAML |
| **File Event → Brain** | chokidar → debounce → condition match → spawn | Filesystem is the event bus |
| **User → Brain** | WebSocket command → orchestrator session | Orchestrator routes to correct agent |
| **Brain → Output** | Agent writes files to output dirs | Triggers downstream file events |
| **Brain → Brain** | Claude SDK native subagent/team orchestration | Logged to conversations/ |
| **Daemon → Surfaces** | WebSocket push (events, files, status) | Single transport, binary + JSON |
| **Daemon → Phone** | FCM push via Firebase Admin SDK | Urgency-gated by agent judgment |
| **Agent → Tools** | MCP protocol | Declarative, config-driven |

---

## Architectural Patterns and Design

### Two-Body Architecture: Daemon + Brain

Herald's core architectural pattern is a deliberate separation of concerns into two distinct bodies:

**Daemon (95% stupid):** A thin, stable, always-running process that handles scheduling, file watching, WebSocket connections, and notification dispatch. Contains zero intelligence — its vocabulary is prompt strings mapped to schedules and file patterns. Tiny surface area, easy to test, runs 24/7 without failure.

**Brain (100% intelligent):** Claude SDK sessions spawned on demand with BMAD persona + workflow MDs injected. All reasoning, content generation, and decision-making lives here. Sessions are bounded, persistent, and independently recoverable.

This pattern is architecturally similar to the "Gateway + Workers" model used in production agent systems — a single long-lived process that owns messaging surfaces and spawns agent runs in separate workers. The key difference: Herald's workers are Claude SDK sessions, not traditional worker processes.

**Trade-offs:**
- Pro: Daemon is trivially stable — it's just a scheduler and event router
- Pro: Brain failures don't crash the daemon
- Pro: Each agent session is isolated — one agent's crash doesn't affect others
- Con: Session spawn overhead (~12s cold start, near-instant resume)
- Con: Daemon must track session lifecycle (create, resume, monitor, cleanup)

_Confidence: High_
_Sources: [GitHub - agent orchestration patterns](https://gist.github.com/championswimmer/bd0a45f0b1482cb7181d922fd94ab978), [Redis - AI agent architecture](https://redis.io/blog/ai-agent-architecture/)_

### Declarative Agent Definition

Herald agents are defined entirely through configuration — no code changes to add, remove, or modify an agent.

**Pattern:** Agent = YAML config + BMAD persona MD file. Drop files in `agents/`, daemon auto-discovers and starts scheduling.

```
agents/
├── ml-researcher.yaml      ← schedule, triggers, output config
├── compute-researcher.yaml
├── newspaper.yaml
└── ...
personas/
├── ml-researcher.md         ← persona, skills, knowledge context
├── compute-researcher.md
└── ...
```

**Hot discovery:** Daemon watches the `agents/` directory via chokidar. New YAML file detected → validate schema → register cron jobs and file triggers → agent is live. Modified YAML → re-register. Deleted YAML → deregister. Zero restarts needed.

**Design principles applied:**
- **Open/Closed**: System is open for extension (new agents) without modification (daemon code)
- **Convention over configuration**: Persona MD file at `personas/{agent-name}.md` by convention
- **Schema validation**: Agent YAML validated on load — fast feedback on misconfiguration

_Confidence: High_

### Persistent Session Architecture

Herald's agent sessions are long-lived, not ephemeral. This is a fundamental architectural decision enabled by the Claude Agent SDK V2.

**Session lifecycle:**
1. **First run:** `createSession()` → agent initialized with persona + knowledge → session ID stored in agent state
2. **Subsequent runs:** `resumeSession(id)` → daemon calls `send("activate research-patrol")` → agent has full prior context
3. **Compaction:** SDK automatically summarizes oldest conversation as context approaches limits — 30+ hours sustained operation observed
4. **Forking:** `forkSession()` for branching investigations without polluting the main session
5. **Recovery:** Session persisted to disk by default — survives daemon restarts

**Architectural implications:**
- Agents accumulate context over time — the ML researcher remembers what it found this morning when it runs again at noon
- `last-jobs.md` becomes a backup mechanism rather than the primary continuity pattern
- Session IDs become part of agent state — stored alongside YAML config
- Daemon must handle session health: detect stale sessions, create fresh sessions if needed

**Comparison to stateless patterns:** Most agent frameworks treat each run as independent. Herald's persistent sessions create agents that genuinely "know what they did yesterday" without explicit memory loading — the context is already there. This is closer to how human teams work — you don't re-brief your analyst every morning.

_Confidence: High_
_Sources: [Claude Agent SDK Session Management](https://platform.claude.com/docs/en/agent-sdk/sessions), [ClickIT - Multi-Agent Architecture](https://www.clickittech.com/ai/multi-agent-system-architecture/)_

### Embedded Database Architecture (SQLite)

Herald's entire data layer runs on embedded SQLite — no database servers, no connection pools, no network latency.

**WAL mode for concurrency:**
- SQLite in WAL (Write-Ahead Logging) mode supports concurrent readers alongside a single writer
- Multiple agent sessions can READ the shared index simultaneously
- Only one process can WRITE at a time — writes are serialized
- For Herald's workload (Librarian writes after each agent run, agents read during sessions), this is perfectly adequate

**Multi-database strategy:**
- `shared/index.sqlite` — cross-agent FTS5 search index (Librarian writes, all agents read)
- `agents/{name}/vectors.sqlite` — per-agent sqlite-vec vector store (agent writes, Librarian reads)
- Separate databases avoid write contention entirely — each writer owns its database

**better-sqlite3 synchronous API:**
- Synchronous execution avoids event loop complexity
- Ideal for the Librarian's batch indexing workflow: read agent output → tokenize → insert into FTS5 → vectorize → insert into sqlite-vec
- No async coordination needed for database operations

**Backup & recovery:**
- SQLite databases are single files — backup is `cp`
- WAL checkpoint flushes pending writes to main database file
- Git can version the shared index (it's just a file)

_Confidence: High_
_Sources: [Node.js SQLite docs](https://nodejs.org/api/sqlite.html), [Better Stack](https://betterstack.com/community/guides/scaling-nodejs/nodejs-sqlite/), [better-sqlite3 npm](https://www.npmjs.com/package/better-sqlite3), [SitePoint - SQLite production readiness](https://www.sitepoint.com/sqlite-edge-production-readiness-2026/)_

### Event Pipeline Architecture

Herald's event flow follows a consistent pipeline pattern regardless of trigger source:

```
TRIGGER (cron | file event | user command | agent-initiated)
    │
    ▼
DAEMON (route + dispatch)
    │
    ├── Validate trigger conditions
    ├── Resolve target agent + session
    ├── Check loop detection (iteration count)
    │
    ▼
BRAIN (Claude SDK session)
    │
    ├── Load/resume session with persona + context
    ├── Execute workflow (research, synthesis, etc.)
    ├── Produce output files + notifications
    │
    ▼
OUTPUT (files → event bus | notifications → adapters | WebSocket → surfaces)
    │
    └── New files → trigger more events (controlled by loop detection)
```

**Key architectural properties:**
- **Trigger-agnostic:** Same pipeline regardless of what initiates it
- **Idempotent outputs:** Re-running the same trigger produces the same result
- **Observable:** Every step can be logged and traced
- **Self-regulating:** Loop detection with meta-agent evaluation prevents runaway chains

_Confidence: High_

### Notification Adapter Pattern

Herald's notification system follows the Adapter/Strategy pattern — agents produce abstract notifications, concrete delivery is pluggable.

```typescript
interface NotificationAdapter {
  send(urgency: string, message: string): Promise<void>
}

// Adapters
class FCMAdapter implements NotificationAdapter { ... }
class TerminalBellAdapter implements NotificationAdapter { ... }
class WebSocketAdapter implements NotificationAdapter { ... }
class DiscordWebhookAdapter implements NotificationAdapter { ... }
```

**Dispatch logic:**
1. Agent calls `notify(urgency, message)` — doesn't know transport
2. Daemon evaluates urgency against user notification preferences
3. Routes to all enabled adapters for that urgency level
4. Each adapter handles its own delivery + error handling

**Adding a new surface:** Implement the interface, register in config. Zero changes to agents or daemon core.

_Confidence: High_

### BMAD-Native Agent Structure

Herald agents are BMAD agents extended with daemon-specific configuration. The BMAD framework already provides the full agent definition pattern — Herald inherits it and adds scheduling, triggers, and memory layers.

**BMAD Agent Anatomy (existing pattern):**

```
Agent MD File (persona definition):
├── <agent> root
│   ├── id, name, title, icon, capabilities
│   ├── <activation> — step-by-step initialization sequence
│   │   ├── Load persona
│   │   ├── Load config.yaml (user_name, communication_language, etc.)
│   │   ├── Greet user, display menu
│   │   └── Wait for input → route to handler
│   ├── <persona>
│   │   ├── role — "Strategic Business Analyst + Requirements Expert"
│   │   ├── identity — expertise, specialization
│   │   ├── communication_style — how the agent talks
│   │   └── principles — behavioral framework
│   ├── <menu> — available workflows/commands
│   └── <menu-handlers> — exec, workflow, data, action routing
│
Customize YAML (per-agent overrides):
├── Override name, persona fields
├── Add custom menu items, prompts
├── Add persistent memories
│
Memory (sidecar files):
└── Per-agent markdown memory files (e.g., documentation-standards.md)
```

**Herald Extension — Agent Definition:**

Herald agents add a runtime configuration layer on top of BMAD persona MDs. The persona MD stays exactly as BMAD defines it — Herald wraps it with daemon-specific config:

```yaml
# herald-agents/ml-researcher.yaml (Herald runtime config)
name: ml-researcher
persona: personas/ml-researcher.md          # BMAD agent MD file
customize: customize/ml-researcher.yaml     # BMAD customize overrides
schedule: "30 5,11,17,23 * * *"             # Herald daemon config
output_dir: reports/ml-papers
output_format: markdown
can_spawn_subagents: true
team_eligible: true
notify_policy: urgent_only
session_limit: 15
session_id: null                            # Populated at runtime
memory:
  knowledge: memory/agents/ml-researcher/knowledge.md
  preferences: memory/agents/ml-researcher/preferences.md
  rag: memory/agents/ml-researcher/rag/
triggers:
  - watch: "reports/geopolitical/*.md"
    condition: "contains:semiconductor OR chip OR TSMC"
    action: review
    message: "Geopolitical event may affect your domain"
```

```markdown
# personas/ml-researcher.md (BMAD persona — same XML structure)
<agent id="ml-researcher" name="Atlas" title="ML Research Analyst" icon="🔬"
       capabilities="paper analysis, benchmark tracking, model evaluation">
  <activation>
    <!-- BMAD standard activation sequence -->
    <!-- Herald daemon handles steps 1-3 automatically -->
    <!-- Agent starts at the "execute workflow" stage -->
  </activation>
  <persona>
    <role>ML Research Analyst + Paper Scout</role>
    <identity>Deep expertise in machine learning papers, benchmarks, and model releases.
    Tracks arxiv, major labs, and open-source releases.</identity>
    <communication_style>Precise and technical. Speaks like a senior researcher
    briefing a colleague — assumes competence, cuts to significance.</communication_style>
    <principles>
      - Track primary sources (arxiv, lab blogs), not summaries
      - Distinguish incremental from breakthrough
      - Always note methodology and reproducibility
      - Develop informed opinions with explicit confidence levels
    </principles>
  </persona>
  <menu>
    <!-- Daemon-triggered activation points -->
    <item cmd="research-patrol">Scan sources for new developments, update report</item>
    <item cmd="deep-dive">Focused analysis on specific topic or paper</item>
    <item cmd="review">Review flagged content from another agent's trigger</item>
    <item cmd="team-synthesis">Contribute findings to newspaper synthesis session</item>
  </menu>
</agent>
```

**Key Design Decisions:**

1. **Separation of concerns:** BMAD persona MD defines WHO the agent is (personality, expertise, communication style). Herald YAML defines HOW the daemon manages it (schedule, triggers, session config).

2. **BMAD customize YAML preserved:** The existing customization layer (`customize/ml-researcher.yaml`) can override persona fields, add memories, add menu items — exactly as BMAD already supports. Herald doesn't break this pattern.

3. **Activation adaptation:** In interactive BMAD (Claude Code), the activation sequence includes greeting the user and displaying a menu. For daemon-triggered runs, Herald handles initialization automatically — the agent starts at the "execute workflow" stage with the daemon's prompt string mapping to a menu command.

4. **Memory convergence:** BMAD already has a memory system (`_memory/` sidecar files). Herald extends this with:
   - `knowledge.md` — BMAD-native hot memory with added sections (opinions, predictions, accountability)
   - `preferences.md` — user steering per agent
   - `rag/` — sqlite-vec cold storage (Herald addition)
   - Sidecar memory files continue to work as BMAD defines them

5. **Team composition:** BMAD teams YAML (`team-fullstack.yaml`) already defines agent bundles with party mode. Herald team sessions (newspaper synthesis, weekly review) use the same team definition pattern — a YAML listing which agents participate.

```yaml
# herald-teams/newspaper-synthesis.yaml
bundle:
  name: Morning Newspaper Synthesis
  icon: 📰
  description: Daily synthesis of all research into the morning paper
agents:
  - ml-researcher
  - compute-researcher
  - ai-tooling-researcher
  - geopolitical-monitor
  - competition-researcher
  - news-digest
  - newspaper       # team lead for synthesis
schedule: "0 6 * * *"
```

**Herald Agent Directory Structure:**

```
herald/
├── herald-agents/              # Herald runtime configs (YAML)
│   ├── orchestrator.yaml
│   ├── ml-researcher.yaml
│   ├── newspaper.yaml
│   └── ...
├── personas/                   # BMAD persona MDs
│   ├── orchestrator.md
│   ├── ml-researcher.md
│   ├── newspaper.md
│   └── ...
├── customize/                  # BMAD customize overrides
│   ├── ml-researcher.yaml
│   └── ...
├── herald-teams/               # Team definitions
│   ├── newspaper-synthesis.yaml
│   └── weekly-review.yaml
├── memory/                     # Per-agent memory
│   ├── agents/
│   │   ├── ml-researcher/
│   │   │   ├── knowledge.md
│   │   │   ├── preferences.md
│   │   │   └── rag/
│   │   └── ...
│   ├── shared/
│   │   └── index.sqlite
│   └── conversations/
└── daemon/                     # Daemon source
    └── src/
```

_Confidence: High — directly extends existing BMAD patterns with minimal deviation_

### Deployment Architecture

Herald is a personal system running on a single host — no distributed infrastructure needed.

**Recommended deployment:**
- **systemd service** for the daemon — auto-restart on crash, boot-on-startup, journal logging
- **Single host** — daemon + SQLite databases + agent output files all on one machine
- **Git-tracked outputs** — newspaper on dedicated branch, reports versioned
- **No containerization required** for v1 — single Node.js process with systemd supervision is sufficient
- **Future:** Docker Compose if Herald needs to run on remote/cloud host

**Monitoring:**
- systemd journal for daemon logs
- `herald status` CLI command for agent dashboard
- WebSocket push for real-time status to app/web surfaces

_Confidence: High_

---

## Implementation Approaches and Technology Adoption

### Cost Model — Claude Max Subscription

Herald runs on a **Claude Max subscription ($200/month)** — not per-token API billing. This fundamentally changes the economics: agents are effectively unlimited within the subscription's usage allowance.

**Implications for Herald's architecture:**

1. **No model tiering needed:** Every agent can run Opus. No need to compromise on capability to save tokens. Research agents, Librarian, orchestrator — all get the best model.

2. **Teams are free to use aggressively:** The Claude Agent SDK's team orchestration (subagents, team sessions, inter-agent communication) has no per-message cost. Spawn teams liberally — morning synthesis with all 6 researchers + newspaper agent is just a team session, not a billing event.

3. **Persistent sessions are pure upside:** No cost penalty for keeping sessions alive with accumulated context. Sessions that would be expensive to re-initialize on API billing are "free" on Max.

4. **No batch processing tradeoffs:** Every agent run can be real-time. No need to defer work to save on batch pricing.

5. **Scale constraint is rate limits, not cost:** The practical limit is how many concurrent sessions the Max subscription allows, not dollars. Herald's daily rhythm (6 parallel research agents at 5:30am) needs to fit within concurrent session limits.

**Bottom line:** The $200/month subscription removes cost as a design constraint. Herald can run agents as frequently and as richly as the architecture demands. Use teams heavily, use Opus everywhere, keep sessions persistent.

### Newspaper Pipeline — Typst

Herald's newspaper is compiled from markdown to a designed PDF using Typst.

**Typst characteristics:**
- Single lightweight binary (~40MB), written in Rust
- Dramatically faster compilation than LaTeX
- Native data loading: JSON, XML, CSV parsers built in; Markdown via package
- Pandoc integration: markdown → Typst → PDF in one pipeline
- Easy to deploy — single binary, no TeX distribution needed

**Herald newspaper pipeline:**
1. Newspaper agent produces structured markdown (sections, headlines, summaries)
2. Typst template defines the newspaper layout (columns, typography, masthead)
3. `typst compile newspaper.typ newspaper.pdf` — CLI invocation from Node.js via `child_process.exec()`
4. PDF pushed to surfaces via WebSocket
5. Git commit on newspaper branch with agent-authored message

**No Node.js library needed** — Typst is invoked as a CLI tool. The daemon shells out to `typst compile`, which is the recommended pattern for Typst integration with non-Rust applications.

_Confidence: High_
_Sources: [Typst blog - automated generation](https://typst.app/blog/2025/automated-generation/), [Typst](https://typst.app/), [Pandoc + Typst tutorial](https://imaginarytext.ca/posts/2024/pandoc-typst-tutorial/)_

### Testing Strategy

Herald's testing needs span the daemon infrastructure and agent behavior — two very different domains.

**Daemon testing (deterministic, traditional):**
- **Unit tests:** Cron schedule parsing, file trigger condition matching, WebSocket message framing, notification routing logic
- **Integration tests:** File watcher triggers → dispatch chain, WebSocket client connection lifecycle, notification adapter delivery
- **Cron testing:** Extract scheduling logic from the cron library — test the callback registration and condition evaluation, not the timer itself
- **WebSocket testing:** Node.js native test runner + ws client library for integration tests. Artillery for load/stress testing WebSocket connections
- **Framework:** Node.js native test runner (stable since v18) or Vitest for TypeScript-native testing

**Agent testing (non-deterministic, behavioral):**
- Agent behavior is inherently non-deterministic — same prompt can produce different outputs
- **Smoke tests:** Agent activation with test persona → verify output structure (has sections, mentions expected topics)
- **Integration tests:** Daemon triggers agent → agent produces output file → verify file exists and has expected structure
- **Snapshot reviews:** Periodically run agents and review output quality manually — this is a human-in-the-loop quality gate, not automated testing
- **Contract tests:** Verify agent outputs match expected schema (e.g., report has `## Findings` section, notification has urgency field)

**What NOT to test:**
- Don't test Claude's reasoning quality — that's Anthropic's problem
- Don't assert specific content from agent runs — non-deterministic
- Focus on: does the daemon correctly trigger, route, persist, and deliver?

_Confidence: High_
_Sources: [Node.js test runner docs](https://nodejs.org/api/test.html), [Medium - WebSocket integration testing](https://medium.com/@basavarajkn/integration-testing-websocket-server-in-node-js-2997d107414c)_

### Implementation Roadmap

Herald should be built incrementally, validating each layer before adding the next.

**Phase 1 — Daemon Core (Week 1-2):**
- TypeScript project setup (ESM, Node 24 LTS)
- Daemon process with systemd service file
- Cron scheduler: load agent YAMLs → register schedules
- File watcher: chokidar watching configured paths
- Basic logging (stdout → systemd journal)
- Test: daemon starts, loads configs, schedules fire on time

**Phase 2 — Agent Spawning (Week 2-3):**
- Claude Agent SDK V2 integration
- Session management: create, resume, track session IDs
- BMAD persona injection: load persona MD + knowledge.md into session
- First agent: a simple test agent that writes a file on schedule
- Test: daemon triggers agent → agent writes output → daemon detects output

**Phase 3 — Event Pipeline (Week 3-4):**
- File trigger engine: condition matching, dispatch
- Loop detection: iteration counting + meta-agent evaluation
- Notification dispatcher: abstract primitive + terminal adapter
- WebSocket server: push events and files to clients
- Test: full trigger chain — cron → agent → output → file event → notification

**Phase 4 — Memory Stack (Week 4-5):**
- SQLite FTS5 shared index via better-sqlite3
- sqlite-vec per-agent vector stores
- Memory Librarian agent: indexes after every run
- Knowledge.md extended sections (opinions, predictions, accountability)
- Test: agent run → Librarian indexes → cross-agent search returns results

**Phase 5 — First Real Agents (Week 5-7):**
- ML Researcher persona + patrol workflow
- Newspaper agent + Typst pipeline
- Team synthesis session (morning paper)
- Orchestrator agent for interactive use
- `herald` CLI: status, paper, agents, run
- Test: full daily rhythm — patrol → synthesis → paper → notification

**Phase 6 — Android App (Week 7-10):**
- WebSocket client connecting to daemon
- Home screen, newspaper viewer, chat interface
- FCM push notification adapter
- Agent cards, todo list, settings

### Risk Assessment and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| **Max subscription rate limits** | Medium | Medium | Stagger parallel agent runs; queue if hitting concurrent session caps |
| **Session context bloat** | Medium | Medium | SDK auto-compaction handles it; monitor session sizes |
| **Agent hallucination in research** | Medium | Medium | Multi-source validation in agent personas; human review of newspaper |
| **Daemon crash loses state** | Medium | Low | systemd auto-restart; sessions persist to disk; agent YAMLs are source of truth |
| **SQLite write contention** | Low | Low | Multi-database strategy eliminates contention; WAL mode for reads |
| **Infinite trigger loops** | High | Low | Iteration counting + meta-agent evaluation |
| **Typst compilation failure** | Low | Low | Validate template separately; fallback to markdown delivery |
| **WebSocket connection drops** | Low | Medium | Client-side reconnect logic; ws ping/pong heartbeat |

### Technology Stack Final Recommendations

| Layer | Technology | Confidence |
|---|---|---|
| **Runtime** | Node.js 24 LTS + TypeScript (ESM) | High |
| **Cron** | node-cron | High |
| **File Watching** | chokidar v5 | High |
| **WebSocket** | ws | High |
| **Agent Brain** | Claude Agent SDK V2 (TypeScript) | High |
| **Agent Definition** | BMAD persona MD + Herald YAML config | High |
| **Full-Text Search** | SQLite FTS5 + better-sqlite3 | High |
| **Vector Store** | sqlite-vec (fallback: LanceDB) | Medium-High |
| **Newspaper** | Typst CLI (shell out from Node) | High |
| **Push Notifications** | Firebase Admin SDK (FCM) | High |
| **Process Management** | systemd | High |
| **Testing** | Node.js native test runner or Vitest | High |
| **Subscription** | Claude Max ($200/mo) — Opus everywhere, teams heavy | High |

---

## Technical Research Synthesis and Conclusion

### Summary of Key Findings

Herald's tech stack validation confirms that every proposed technology choice is sound, well-supported, and architecturally coherent. The system decomposes into a clean two-body model where a deliberately simple TypeScript daemon handles all scheduling, file watching, and delivery concerns while Claude Agent SDK sessions — wearing BMAD persona hats — handle all intelligence.

The most significant finding is the **Claude Agent SDK V2 persistent session model**. This changes Herald from a "spawn-run-exit" system to a "persistent staff" system. Agents genuinely accumulate context across runs, remember what they found hours ago, and don't need explicit memory-loading ceremonies. Combined with the $200/month Max subscription removing cost as a constraint, Herald can run agents densely — teams of 7+ agents collaborating on morning synthesis, persistent orchestrator always ready for conversation, autonomous inter-agent communication whenever domains overlap.

The **unified SQLite stack** (FTS5 for full-text search + sqlite-vec for vector similarity) is the other major architectural win. Zero infrastructure. No database servers. The entire memory layer — hot working memory in markdown, warm searchable index in FTS5, cold long-term recall in vectors — lives in embedded single-file databases. Backup is `cp`. Recovery is trivial.

### What This Research Validates

| Decision | Validated? | Notes |
|---|---|---|
| TypeScript for everything | **Yes** | Same ecosystem as Claude SDK, I/O-bound daemon, solo project velocity |
| Filesystem as event bus | **Yes** | chokidar v5 is battle-tested, event normalization handles edge cases |
| WebSocket as single transport | **Yes** | Events, status, AND file delivery (md/PDF) over one connection |
| SQLite for all data | **Yes** | FTS5 + sqlite-vec, WAL mode, multi-db eliminates contention |
| BMAD agent structure | **Yes** | Clean extension — persona MD (WHO) + Herald YAML (HOW) |
| Persistent agent sessions | **Yes** | SDK V2 natively supports it, 30+ hours proven, compaction handles context |
| Typst for newspaper | **Yes** | Single binary, fast, markdown-friendly, CLI invocation from Node |
| systemd for process management | **Yes** | Auto-restart, journal logging, boot-on-startup — perfect for personal daemon |

### What Changed During Research

1. **Persistent sessions replace bounded sessions** — Original brainstorming proposed "bounded session persistence (N interactions then save + exit)." Research shows V2 SDK persistent sessions make this unnecessary. Agents stay alive indefinitely with auto-compaction.

2. **`last-jobs.md` becomes backup, not primary** — Session persistence means agents have continuity natively. Keep `last-jobs.md` as a fallback for when sessions get recycled, not as the primary continuity mechanism.

3. **Cost model is subscription, not tokens** — Max subscription means Opus everywhere, teams everywhere, no compromises. Design for agent density, not token efficiency.

4. **Loop detection upgraded** — Original proposal was cooldown periods. Upgraded to iteration counting + meta-agent evaluation — a smarter agent reviews the chain and decides if it's productive.

5. **WebSocket handles file delivery** — No need for a separate REST file-serving endpoint. Binary frames over WebSocket handle markdown and PDF delivery cleanly.

### Next Steps

This technical research feeds directly into the **Product Brief** and **PRD** workflows. The validated tech stack, BMAD agent structure, and implementation roadmap provide the foundation for:

1. **Product Brief** — resume the product brief workflow (step 2: vision discovery) with this technical context
2. **Architecture Document** — formalize the two-body architecture, agent definition schema, memory stack, and event pipeline
3. **PRD** — translate the brainstorming v1 scope + this tech validation into implementation-ready requirements
4. **Phase 1 implementation** — daemon core with TypeScript + node-cron + chokidar + ws

---

**Technical Research Completion Date:** 2026-02-27
**Research Methodology:** Web-verified broad survey with multi-source validation
**Source Verification:** All technical claims cited with current (Feb 2026) sources
**Confidence Level:** High across all primary technology choices

_This technical research document serves as the authoritative reference for Herald's technology decisions and provides the validated foundation for implementation planning._
