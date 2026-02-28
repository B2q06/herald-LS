---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-herald-2026-02-27.md
  - _bmad-output/planning-artifacts/research/technical-herald-tech-stack-research-2026-02-27.md
  - _bmad-output/brainstorming/brainstorming-session-2026-02-27.md
documentCounts:
  briefs: 1
  research: 1
  brainstorming: 1
  projectDocs: 0
classification:
  projectType: 'multi-surface-platform'
  domain: 'ai-productivity'
  complexity: 'medium-high'
  projectContext: 'greenfield'
workflowType: 'prd'
---

# Product Requirements Document - Herald

**Author:** B
**Date:** 2026-02-28

## Executive Summary

Herald is an autonomous personal intelligence and execution platform that enables a solo technical operator to function at organizational scale. A deliberately simple TypeScript daemon handles scheduling, file watching, WebSocket delivery, and notification dispatch while Claude Agent SDK V2 sessions — each wearing a BMAD persona with persistent memory — do all the thinking. Twelve specialized agents patrol domains on schedule, synthesize findings into a Typst-compiled morning newspaper, generate context-aware daily task lists, monitor communications, and make any BMAD project queryable and actionable through a universal orchestrator.

The core problem is cognitive overhead. A solo operator managing multiple active projects, a deep technology backlog, and rapidly evolving domains faces organizational-scale information processing demands — but all that load falls on one person. Tasks leak from memory. Agent prompting is manual and forgettable. Developments go undetected for days. The gap between what could be acted on and what actually gets caught widens every week. The emotional cost is the persistent anxiety of not knowing what you're forgetting.

Herald replaces that anxiety with a system that runs without being asked. Research agents patrol. The newspaper delivers before breakfast. Smart todos appear based on calendar, inbox, and project state — not manual entry. Push notifications are gated by agent-judged urgency. The system compounds intelligence over time: agents develop opinions with confidence calibration, knowledge depreciates naturally through hot memory while cold RAG recall preserves everything searchable, and cross-agent discovery surfaces connections the operator would never find manually.

### What Makes This Special

Nothing on the market combines a production-grade agent SDK, BMAD-structured workflow orchestration, autonomous scheduling, persistent agent memory, and a designed daily delivery ritual into one system meant to be lived in. Existing solutions are toy wrappers without real SDK foundations, fragile automation chains that break constantly, or feature-gated platforms waiting on someone else's roadmap. Herald's architectural insight is the two-body model: the daemon is 95% stupid (cron, file watch, WebSocket, notifications) while all intelligence lives in declarative BMAD personas — making agents droppable YAML + markdown files that the daemon auto-discovers with zero code changes.

The morning newspaper is the wedge. It's the ritual that earns daily engagement and proves the system's value before the operator lifts a finger. Come for the paper, stay for the full operator stack. The emotional contract: Herald is holding everything for you.

Claude SDK V2 persistent sessions make this possible now — agents accumulate context across runs, sessions resume instantly, and 30+ hours of sustained operation is proven. This wasn't feasible a year ago.

### Project Classification

- **Project Type:** Multi-surface platform — TypeScript daemon (core), CLI tool (`herald`), Progressive Web App (PWA)
- **Domain:** AI/Productivity — autonomous personal intelligence platform
- **Complexity:** Medium-High — no regulatory burden, but significant technical complexity across persistent agent sessions, multi-agent orchestration, depreciating memory + RAG, real-time WebSocket delivery, Typst compilation pipeline, and autonomous inter-agent communication
- **Project Context:** Greenfield

## Success Criteria

### User Success

**The Ritual Test — Daily Engagement:**
- Morning newspaper read habitually, not occasionally — Herald is the first screen of the day
- Smart todo list checked and acted on as the first productivity action
- Herald is the default entry point for project work, not an afterthought

**The Discovery Test — Intelligence Value:**
- Newspaper regularly surfaces information the operator didn't already know
- At least one actionable insight per week that changes a decision, updates a tool, flags an opportunity, or adjusts a project priority
- Proactive agent suggestions maintain >80% relevance — signal earns trust over time, noise erodes it

**The Anxiety Test — Cognitive Relief:**
- Tasks stop leaking from memory — the todo list captures what would have been forgotten
- No manual agent prompting required — the system runs without being reminded
- The feeling of "Herald is holding everything for me" replaces "what am I forgetting?"

**The Continuity Test — Mobile-to-CLI:**
- Projects and agents accessible and usable from the phone during the day
- Work started on mobile continues seamlessly on CLI at home
- Push notifications are timely, relevant, and lead to meaningful interactions

### Business Success

**v1 — Personal Validation (0-3 months):**
- Herald runs autonomously for 30 consecutive days — full system: all 12 agents, newspaper, smart todos, comms monitoring — without manual intervention beyond normal use
- Operator reads the newspaper every morning and acts on findings weekly
- At least 3 active projects managed through Herald's project portal
- Idea backlog captures and structures new ideas without loss

**v1.1 — Packaging Readiness (3-6 months):**
- Prompt-style signup flow generates functional agent rosters for test users
- Newspaper product works standalone for users who only care about curated intelligence
- At least one external user runs Herald for 2+ weeks and finds value

**Future — Commercial Viability:**
- Newspaper subscription retention: users who start reading keep reading
- Expansion metric: newspaper-only users who discover and adopt the full operator stack

### Technical Success

Reliability and performance targets are specified in Non-Functional Requirements (NFR1-NFR14). Key thresholds:
- 100% agent patrol completion rate (NFR2)
- Newspaper ready before 6:30 AM daily (NFR4)
- Zero data loss (NFR3)
- Agent session resume <3s P95 (NFR8)

### Measurable Outcomes

| KPI | Target | Measurement |
|---|---|---|
| Agent patrol completion rate | 100% | Scheduled runs producing output / total scheduled |
| Newspaper delivery | Daily before 6:30 AM | Timestamp of paper-ready notification |
| Morning engagement | Daily | Days newspaper + todo opened / total days |
| Discovery rate | 1+/week | Insights acted on that operator didn't previously know |
| Todo capture rate | >90% | Tasks from Herald list / total tasks completed |
| Proactive suggestion relevance | >80% | Suggestions acknowledged or acted on / total |
| Mobile-to-CLI continuity | Seamless | Projects started on mobile continued on CLI |
| Zero missed runs | 0/month | Daemon failures or skipped schedules |
| Session resume latency | <3s | P95 agent session startup time |

## User Journeys

### Journey 1: A Day with Herald — The Daily Ritual (Success Path)

**B — Solo Technical Operator, Day 45 of Herald Running**

**6:00 AM — Wake up.** Phone buzzes once: "Your daily brief is ready." Open the Herald PWA to a smart todo list — not overwhelming, actionable. It knows today's class schedule, flagged two important emails from overnight, and pulled three project tasks aligned with today's available time windows. A short encouraging note from Herald at the top. The anxiety of "what am I forgetting?" is gone — Herald is holding everything.

**6:30 AM — Breakfast.** Tap into the morning newspaper. Headlines across ML, compute, geopolitics, competition, AI tooling — all researched and synthesized overnight by 6 agents working in parallel. One featured story: a new framework that could replace a dependency in one of B's projects. Tap the headline — the full dedicated report is right there, not a summary-of-a-summary. Herald already added "evaluate X framework" to the backlog.

**7:30 AM — School.** Actionable items for the day visible in the app. Class prep surfaced. Between classes, knock off a quick task and ping Herald: "done." Herald updates the list.

**12:30 PM — Midday check-in.** Push notification: "You've got 3 items left today — knocked anything off yet?" Tap to open, mark two complete. Herald adjusts: "Nice. Here's what's still open."

**2:00 PM — Intraday alert.** Push notification: geopolitical event affecting semiconductor supply chain. Herald's geopolitical monitor flagged it and the compute researcher drew a cross-domain connection to GPU pricing trends B tracks. Information absorbed in 30 seconds — no searching, no prompting, no forgetting.

**3:00 PM — New feature idea.** Open Herald PWA, go to Projects. See project status cards for all active projects. Pick one, open a chat with the orchestrator, flesh out a new feature. The orchestrator routes to the PM persona, helps scope it, creates a story. Ready for implementation.

**6:00 PM — Home, CLI.** `herald status` — dashboard of all agents, last runs, next scheduled, recent findings. Open Claude Code, continue building the feature started on the phone. Run tests. Mark todos complete. Done early — Herald suggests: "You've got bandwidth. Want to brainstorm that idea you captured last week?"

**8:00 PM — Idea backlog.** Talk through a new project idea with the brainstorming agent. It gets fleshed out, saved as a structured idea file, indexed into RAG memory. When it's ready, promote it to a full BMAD project with one command.

**Ongoing — Compounding intelligence.** Every agent run makes Herald smarter. Research agents develop opinions with confidence calibration. Industry knowledge accumulates in memory. Cross-domain connections surface automatically. B absorbs more information per day than would be humanly possible to gather manually — and it's curated, structured, and actionable.

### Journey 2: Creating a New Agent — The Orchestrator as Operator

**B — Wants to Track a New Domain**

**The trigger.** B has been reading Herald's newspaper for three weeks and notices a pattern: AI hardware startups keep appearing in the compute researcher's reports, but only as footnotes. There's a whole domain of AI chip startups, custom silicon, and neuromorphic computing that deserves dedicated coverage.

**The conversation.** B opens Herald chat and says: "I want a new agent that tracks AI hardware startups — custom silicon, neuromorphic chips, startup funding rounds, new chip architectures. Same patrol schedule as the other researchers."

**The orchestrator works.** The orchestrator doesn't ask B to write YAML or fill out a template. It understands the request, generates a complete agent definition:
- **YAML config:** `ai-hardware-researcher.yaml` — name, persona reference, schedule (`"30 5,11,17,23 * * *"`), output directory, notify policy, session limit, memory paths, trigger rules (watches geopolitical and compute reports for silicon/chip mentions)
- **BMAD persona MD:** `ai-hardware-researcher.md` — full persona with domain expertise, research methodology, opinion framework, knowledge structure, patrol workflow instructions

The orchestrator presents the agent definition to B for review. B scans it, says "looks good." The orchestrator writes both files to the `agents/` directory.

**Instant activation.** The daemon's file watcher detects the new files in `agents/`. Hot reload kicks in — the new agent is registered, scheduled, and ready. No daemon restart. No code changes. No configuration UI. The agent simply exists now.

**First patrol.** At the next scheduled research window, the AI hardware researcher activates for the first time. It patrols its domain, produces its first report, and the memory librarian indexes it into the shared SQLite. The newspaper agent picks up the new report in the next synthesis cycle. Tomorrow morning, B's newspaper has a new section.

**The key requirement:** The orchestrator must produce agents that are *complete on delivery* — not stubs that need manual editing. The YAML must have correct scheduling, memory paths, trigger rules, and team eligibility. The persona MD must have genuine domain knowledge, research methodology, and the opinion/prediction/accountability framework. A dropped-in agent should be indistinguishable from a hand-crafted one.

### Journey 3: When Things Go Wrong — Error Recovery

**B — Day 12, Something's Off**

**Morning.** B opens the newspaper and notices the ML researcher's section is missing. The todo list is there, the other research sections are there, but ML is blank. No notification about a failure.

**Diagnosis via CLI.** `herald status` — the ML researcher shows "last run: failed" with a timestamp. `herald logs ml-researcher` — the conversation log shows the agent session hit a context limit mid-patrol and terminated without producing output. The daemon logged the failure but didn't retry (by design — no infinite loops).

**Recovery.** B runs `herald run ml-researcher` to trigger an immediate manual patrol. The agent starts a fresh session, loads its `last-jobs.md` for continuity context, and completes successfully. The newspaper updates within minutes.

**Systemic fix.** B tells the orchestrator: "The ML researcher keeps hitting context limits. Its session limit is too high — drop it from 15 to 10 interactions." The orchestrator updates the YAML, daemon hot-reloads, and the agent now saves and exits earlier, keeping sessions lean.

**What Herald should surface:** Failed agent runs should produce a notification (configurable urgency). The `herald status` dashboard should make failures immediately visible — not buried in logs. The daemon should distinguish between "agent failed to start" and "agent started but didn't finish" for different recovery paths.

### Journey Requirements Summary

| Journey | Capabilities Revealed |
|---|---|
| **Daily Ritual** | Newspaper delivery, smart todos, push notifications, project portal, chat interface, CLI dashboard, idea capture, cross-device continuity |
| **Agent Creation** | Orchestrator agent-building workflow, complete YAML + persona generation, daemon hot-reload/auto-discovery, zero-code agent onboarding, file watcher on agents directory |
| **Error Recovery** | Failure visibility in status dashboard, agent run logs, manual trigger capability, session configuration updates, hot-reload config changes, failure notifications |

**Critical architectural requirement from Journey 2:** The daemon must be lightweight and reliable — a thin layer that watches, schedules, and dispatches. Agent definitions are the only moving parts. Adding capability = adding files, never adding code.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Staged platform build — sequence the MVP into four independently useful stages that each validate a core architectural assumption before layering the next. Solo developer, so each stage must deliver tangible daily value to sustain motivation and provide validated learning.

**Resource Requirements:** Single developer (B). Claude SDK subscription for agent sessions. VPS or local server for daemon. No external dependencies on other people's roadmaps.

### Stage 1 — The Loop

**Validates:** Two-body architecture, declarative agent system, newspaper pipeline, agent collaboration, persistent memory

**Infrastructure:**
- TypeScript daemon (core): node-cron scheduler, chokidar file watcher (agent directory auto-discovery), basic REST API
- Claude Agent SDK V2 integration: persistent sessions — create, resume, track. BMAD persona + knowledge injection per session
- Session manager: persistent sessions with auto-compaction, health monitoring, recovery
- Event pipeline: cron-triggered execution
- Declarative agent system: agent = YAML config + BMAD persona MD, daemon auto-discovers, hot reload on file changes
- Team orchestration: Claude SDK native team sessions — newspaper agent summons researchers for collaborative synthesis
- Subagent spawning: agents spawn parallel subtasks within their session for concurrent lookups during patrols
- Memory stack: SQLite FTS5 shared index (better-sqlite3) + sqlite-vec per-agent vector stores. Per-agent knowledge.md with opinions, predictions, accountability sections. Depreciating hot memory + cold RAG recall
- Memory librarian: post-run indexing — entity extraction, vectorization, categorization into shared SQLite. Cross-agent discovery
- Typst newspaper pipeline: agent-authored markdown to Typst template to compiled PDF/HTML, git-versioned on dedicated branch, featured stories trigger full dedicated reports
- Conversation logger: agent output, session transcripts, and agent-to-agent team conversations persisted to filesystem, browsable

**Agents:**
- ML Researcher, Compute Researcher, AI Tooling Researcher (3 research agents)
- Newspaper Agent: summons researchers as team for morning synthesis
- Memory Librarian: indexes all agent knowledge into shared SQLite after every run

**Delivery Surface:**
- CLI (basic): `herald status`, `herald paper`, `herald run <agent>`, `herald agents`, `herald logs`

**Daily Value:** B wakes up to a compiled newspaper synthesized through a real team session between agents. Agents develop persistent memory and opinions from run one. Cross-agent connections surface through shared RAG index. Research agents use subagent spawning for parallel source lookups within patrols.

### Stage 2 — The Intelligence Layer

**Validates:** File trigger engine, full research coverage, smart task management, autonomous inter-agent communication

**Infrastructure:**
- File trigger engine: watch paths with conditions, map to agent activations. Filesystem as event bus
- Event pipeline expanded: cron + file event + agent-initiated triggers
- Smart todo engine (basic): dynamic daily tasks from project state + backlog
- Autonomous inter-agent communication: agents initiate team sessions when they detect domain overlap

**Agents:**
- Geopolitical Monitor, Competition Researcher, News Digest (all 6 patrol agents active)
- Smart Todo Agent (project-aware, not yet calendar/inbox-aware)

**Delivery Surface:**
- CLI expanded: `herald todo`, `herald schedule`, `herald paper --history`, `herald paper --weekly`

**Daily Value:** Full research coverage across all 6 domains. File triggers enable autonomous event-driven workflows. Smart todo list appears daily based on project state. Agents communicate autonomously when their domains overlap.

### Stage 3 — The Surfaces

**Validates:** PWA as primary mobile interface, real-time push, calendar/inbox integration

**Infrastructure:**
- WebSocket server (ws): persistent connections for real-time push to PWA
- PWA: WebSocket-connected SPA — home, newspaper viewer, chat, agent cards, todos, inbox, logs, settings. Service worker for offline caching. Firefox + Chromium support
- Notification system: abstract `notify(urgency, message)` primitive. Adapters: browser push (Web Push API/Firefox), terminal bell, WebSocket event. Urgency-gated by agent judgment
- Calendar integration: Calendar API connection — schedule, time windows, classes, commitments
- Inbox integration: email inbox monitoring — urgency evaluation, flagging
- Smart todo engine expanded: calendar + inbox + project state + backlog, midday check-ins

**Agents:**
- Comms Agent: email inbox monitoring, urgency evaluation, draft responses

**Delivery Surface:**
- PWA: full mobile experience
- CLI expanded: `herald comms`, `herald notify`

**Daily Value:** Herald accessible from the phone. Push notifications by urgency. Smart todos integrate calendar and inbox. Full mobile-to-CLI continuity.

### Stage 4 — The Operator

**Validates:** Orchestrator as universal front desk, agents creating agents, project management integration

**Infrastructure:**
- `/new-agent` workflow: orchestrator produces complete YAML + persona MD, drops into agents directory, activates instantly

**Agents:**
- Orchestrator: universal front desk — routes commands, activates workflows, creates new agents via file write
- Project Portal: on-demand onboarding into any BMAD project, queryable and actionable

**Delivery Surface:**
- CLI expanded: `herald new-agent`, `herald projects`, `herald project <name>`, `herald agent <name>` (interactive chat)
- PWA expanded: project portal, chat with agent switching, agent cards with full interaction

**Daily Value:** Herald is self-managing. Natural language agent creation, project querying, full operator stack.

### Post-MVP Features (v1.1)

- Morning voice briefing (TTS 3-minute summary)
- Agent confidence dashboard and prediction accountability
- Deep dive mode — newspaper item triggers focused research session
- Threshold-based monitoring triggers
- Opinion accountability runs — automated periodic prediction accuracy checks

### Vision (Future)

- Prompt-style signup generates personalized agent rosters (Yggdrasil Technology branding)
- Newspaper as standalone subscription product — the anti-algorithm
- Native Android app wrapping proven PWA patterns
- Multi-user support
- Agent marketplace — shareable YAML + persona configs
- Team/organization deployments with shared agent pools

### Risk Mitigation Strategy

**Technical Risks:**
- Claude SDK session stability — validated by tech research (30+ hours proven), session manager handles recovery
- Memory architecture performance — SQLite FTS5 + sqlite-vec proven at single-user scale
- Stage 1 front-loads the hardest infrastructure — if this works, everything else is layering

**Market Risks:**
- Not applicable for v1 — built for its creator. Market validation begins at v1.1
- The 30-day autonomous run is the validation: does B use it every day?

**Resource Risks:**
- Solo developer — staged build ensures each stage is independently useful
- Each stage builds incrementally without invalidating previous work — no big-bang integration risk

## Innovation & Novel Patterns

### Detected Innovation Areas

**1. Two-Body Architecture — Dumb Daemon, Smart Personas**

The deliberate separation of infrastructure concerns (scheduling, file watching, WebSocket, notifications) from intelligence (BMAD personas, Claude SDK sessions). Most agent platforms conflate orchestration logic with agent logic. Herald makes the daemon a commodity — it could be rewritten in any language without touching agent behavior. All intelligence is declarative markdown and YAML, not code.

**2. Declarative Agent System — Files as the Only Interface**

Agent = YAML config + BMAD persona MD. Drop files in a directory, the daemon auto-discovers and activates. No API calls, no registration endpoints, no configuration UI. The filesystem is the control plane. An orchestrator agent can create other agents by writing files, which the daemon picks up autonomously. Agents creating agents through the filesystem.

**3. Designed Daily Ritual as Product Wedge**

Most productivity tools are pull-based — you open them when you remember. Herald is push-based with an opinionated daily rhythm: newspaper before breakfast, smart todos as first productivity action, midday check-ins, intraday alerts. The innovation isn't any individual feature — it's the designed ritual that earns habitual engagement.

**4. Depreciating Memory with RAG Recall**

Agent memory that loses ~5% importance per day unless reinforced — keeping hot working memory lean and relevant — combined with cold RAG vector stores for everything ever learned. This mirrors how human memory works: recent and reinforced information is accessible, older knowledge is retrievable when prompted. No agent platform does memory decay by design.

**5. BMAD Persona Injection into SDK Sessions**

Using a structured workflow framework (BMAD) as the personality and methodology layer for SDK-powered agents. Agents aren't just prompted — they have structured knowledge sections, opinion frameworks, prediction logs, and accountability tracking. The persona isn't flavor text; it's operational architecture.

### Market Context & Competitive Landscape

No existing product combines all five innovation areas. The competitive landscape fragments across:
- **Agent wrappers** (Lindy, MultiOn): No real SDK, no persistent memory, no inter-agent communication
- **Automation chains** (AutoGPT-style): Fragile, no structured personas, no designed daily ritual
- **Platform plays** (feature-gated SaaS): Waiting on someone else's roadmap, no declarative agent system
- **Manual SDK usage** (Claude Code sessions): Powerful but requires human initiation every time

Herald's moat is the combination — not any single feature in isolation.

### Innovation Validation & Risk

| Innovation | Validation | Risk | Mitigation |
|---|---|---|---|
| Two-body architecture | Daemon stays under 2000 LOC, agents are purely declarative | Daemon absorbs logic over time | Strict line budget — refactor intelligence out if exceeded |
| Declarative agents | Orchestrator creates agent via file drop, activates without intervention | YAML + MD insufficient for complex behaviors | BMAD workflows handle complexity; framework extensions, not agent changes |
| Daily ritual | 30-day autonomous run — does B read the newspaper every morning? | Notification fatigue kills engagement | Urgency gating by agent judgment; start conservative |
| Depreciating memory | Knowledge stays relevant 30+ days without manual curation | Important knowledge decays too fast | Reinforcement mechanism; configurable decay rate per agent |
| BMAD personas | Agents develop differentiated opinions with measurable accuracy | Opinions become stale or miscalibrated | Accountability runs (v1.1) check prediction accuracy |

## Multi-Surface Platform Requirements

### Project-Type Overview

Herald is a three-surface platform: a TypeScript daemon exposing a REST API and WebSocket server (backend), a CLI tool (`herald`) for terminal interaction, and a PWA for mobile/browser access. All three surfaces consume the same daemon — the CLI and PWA are thin clients, the daemon is the single source of truth.

### API/Backend Requirements

**REST API:**
- JSON request/response format throughout
- HTTP status codes for error signaling — no custom error code framework for v1
- No rate limiting for v1 (single-user system). Loop prevention handled at the event pipeline level
- No authentication for v1 — single-operator, local network
- No API versioning for v1 — internal API consumed only by Herald's own surfaces

**WebSocket Server:**
- Persistent connections for real-time push to PWA and CLI
- Event types: agent status updates, notification delivery, newspaper updates, todo changes
- Reconnection handling on client side — daemon is the authority, clients reconnect and sync

**Endpoints (Core):**
- Agent management: list, status, trigger run, view logs
- Newspaper: current edition, history, weekly
- Todos: list, complete, update
- Projects: list, status, enter context
- Chat: send message to agent, receive streamed response
- Notifications: preferences, history
- Schedule: view/edit cron schedules
- System: daemon health, uptime

### CLI Requirements

- `herald <command> [subcommand] [flags]` — standard CLI pattern
- Interactive mode for chat (`herald agent <name>`) with markdown rendering in terminal
- Scriptable output: `--json` flag on status/list commands for piping
- Shell completion for zsh (primary shell)
- Config via YAML files
- Output formats: human-readable (default), JSON (with `--json` flag)

### PWA Requirements

**Browser Support:** Firefox (primary) and Chromium-based browsers. No Safari/WebKit for v1.

**Architecture:** Single-page application, WebSocket-connected to daemon. Service worker for offline caching. Browser push notifications via Web Push API.

**Offline Behavior:** Cache last newspaper edition and current todo list for offline reading. No offline mutations. Clear visual indicator when offline: "Last synced: [timestamp]."

**Responsive Design:** Mobile-first (primary use case is phone during the day). Desktop layout for home CLI workstation use.

**Accessibility:** No WCAG compliance target for v1. Standard semantic HTML and keyboard navigation as baseline.

### Implementation Considerations

- All three surfaces are thin clients — zero business logic in CLI or PWA
- Daemon is the single source of truth for all state
- Markdown is the universal content format — agents produce markdown, surfaces render it
- The daemon API contract is the integration boundary

**Technology Alignment:**
- Daemon: Node.js + TypeScript, node-cron, chokidar, ws, better-sqlite3, sqlite-vec
- CLI: Commander.js or similar, with ink for terminal markdown rendering
- PWA: Lightweight framework (Preact/Solid), WebSocket client, service worker for caching

## Functional Requirements

### Agent Management

- FR1: The daemon can auto-discover agent definitions (YAML + persona MD) from the agents directory without restart
- FR2: The daemon can hot-reload agent configurations when files are modified
- FR3: The operator can create a new agent by describing it in natural language to the orchestrator
- FR4: The orchestrator can generate a complete agent definition (YAML config + BMAD persona MD) and write it to the agents directory
- FR5: The operator can trigger an immediate manual run of any agent
- FR6: The operator can view the status of all agents (last run, next scheduled, success/failure)
- FR7: The operator can view and modify agent schedules
- FR8: The operator can chat interactively with any specific agent
- FR9: Agents can spawn subagents for parallel subtasks within their session
- FR10: Agents can initiate team sessions, summoning other agents for collaborative work
- FR11: Agents can autonomously initiate inter-agent communication when they detect domain overlap

### Research & Intelligence

- FR12: Research agents can patrol their assigned domains on a configurable cron schedule
- FR13: Research agents can produce structured research reports as markdown output
- FR14: Research agents can develop and maintain opinions with confidence calibration
- FR15: Research agents can record explicit predictions with supporting evidence and timestamps
- FR16: Research agents can proactively advocate for changes to the operator's setup, tooling, or workflow when they spot relevant advancements
- FR17: The system can run multiple research patrols in parallel

### Newspaper & Publishing

- FR18: The newspaper agent can summon research agents as a team for collaborative synthesis
- FR19: The newspaper agent can produce a designed publication from synthesized research
- FR20: The system can compile newspaper markdown through Typst into PDF/HTML output
- FR21: The system can version newspaper editions via git on a dedicated branch
- FR22: Featured stories in the newspaper can trigger full dedicated research reports
- FR23: The operator can view the current newspaper edition
- FR24: The operator can browse past newspaper editions and weekly synthesis papers
- FR25: The newspaper can update immediately when breaking/urgent events are detected

### Task Management

- FR26: The smart todo agent can generate a daily task list from project state and backlog
- FR27: The smart todo agent can incorporate calendar schedule and time windows into task scoping
- FR28: The smart todo agent can incorporate inbox state and flagged emails into task prioritization
- FR29: The smart todo agent can consult project PM agents for context-aware next actions when no explicit backlog exists
- FR30: The operator can view, complete, and update tasks
- FR31: The system can deliver midday check-in notifications on task progress
- FR32: The todo list can dynamically adjust throughout the day as tasks complete or schedule changes

### Memory & Knowledge

- FR33: Each agent can maintain a persistent knowledge.md with domain knowledge, opinions, predictions, and accountability sections
- FR34: Agent hot memory can depreciate in importance over time unless reinforced
- FR35: Agents can explicitly reinforce knowledge items to prevent decay
- FR36: Each agent can store and retrieve long-term knowledge via per-agent RAG vector stores
- FR37: The memory librarian can index all agent knowledge into a shared SQLite FTS5 index after every agent run
- FR38: The memory librarian can extract entities and vectorize content for cross-agent discovery
- FR39: Agents can query the shared index for cross-domain knowledge discovery
- FR40: Agent sessions can save state and conversation summaries for continuity across runs
- FR41: New agent sessions can load previous state to resume work naturally

### Communication & Notifications

- FR42: The comms agent can monitor an email inbox for new messages
- FR43: The comms agent can evaluate email urgency and flag important messages
- FR44: The comms agent can draft responses for operator review
- FR45: The system can deliver push notifications gated by agent-judged urgency
- FR46: The operator can configure notification preferences and urgency thresholds
- FR47: The system can deliver notifications through multiple adapters (browser push, terminal bell, WebSocket)
- FR48: The system can notify the operator when an agent run fails

### Project Management

- FR49: The project portal agent can onboard into any BMAD project by interrogating its existing context
- FR50: The operator can view status cards for all registered projects
- FR51: The operator can query and interact with any registered project through the orchestrator
- FR52: The operator can capture ideas through brainstorming sessions and save them as structured files
- FR53: The operator can promote a structured idea to a full BMAD project

### System Operations

- FR54: The daemon can run continuously as a systemd service with auto-restart on failure
- FR55: The daemon can execute scheduled agent runs via configurable cron expressions
- FR56: The daemon can watch filesystem paths with conditions and trigger agent activations
- FR57: The daemon can serve a REST API for CLI and PWA consumption
- FR58: The daemon can maintain WebSocket connections for real-time push to connected clients
- FR59: The system can persist all agent-to-agent conversation transcripts for browsing
- FR60: The operator can browse conversation logs via CLI and PWA
- FR61: The system can distinguish between "agent failed to start" and "agent started but didn't finish" for different recovery paths
- FR62: The PWA can cache the last newspaper edition and current todo list for offline viewing
- FR63: The CLI can output structured JSON for scripting via `--json` flag
- FR64: The CLI can provide zsh shell completion for all commands

## Non-Functional Requirements

### Reliability

- NFR1: The daemon must maintain continuous uptime via systemd auto-restart — crashes are exceptional events, recovery is automatic
- NFR2: Agent patrol completion rate must be 100% — every scheduled run fires and produces output
- NFR3: Zero data loss — agent memory, conversation logs, project state, and newspaper editions must always be persisted to disk before acknowledgment
- NFR4: The newspaper must be ready before 6:30 AM every day — the daily ritual depends on this deadline
- NFR5: Failed agent sessions must not affect other agents or daemon stability — failure isolation between agents
- NFR6: The daemon must recover gracefully from Claude SDK session failures without manual intervention
- NFR7: SQLite database operations must use WAL mode and proper transaction boundaries to prevent corruption under concurrent agent writes

### Performance

- NFR8: Agent session startup (resuming existing session): <3 seconds P95
- NFR9: Newspaper Typst compilation: <15 seconds
- NFR10: WebSocket message delivery to connected clients: <500ms
- NFR11: CLI command response (non-agent commands): <1 second
- NFR12: Research patrol cycle (6 agents in parallel): <20 minutes total
- NFR13: SQLite FTS5 full-text search queries: <100ms for cross-agent knowledge lookups
- NFR14: Daemon memory footprint: <200MB baseline (excluding active Claude SDK sessions)

### Integration

- NFR15: Calendar API integration must handle API rate limits and authentication token refresh without agent awareness
- NFR16: Email inbox polling must handle connection failures gracefully with exponential backoff — missed polls are retried, not dropped
- NFR17: Claude SDK session management must handle API errors, rate limits, and service interruptions with automatic retry and session recovery
- NFR18: Typst compilation must be invoked as a subprocess — compilation failures must not crash the daemon
- NFR19: Git operations for newspaper versioning must handle merge conflicts and dirty state without manual intervention

### Security

- NFR20: API keys and credentials (Claude SDK, email, calendar) must be stored in environment variables or a secrets file excluded from version control — never in agent YAML or persona MD
- NFR21: The REST API must bind to localhost only by default — external access requires explicit configuration
- NFR22: Agent-generated content must not be able to modify daemon configuration or execute system commands — agents operate within their sandbox (file writes to designated directories only)
- NFR23: Conversation logs containing potentially sensitive email content must be stored with filesystem permissions restricted to the daemon user

### Maintainability

- NFR24: Daemon codebase must stay under 2000 lines of code — complexity beyond this threshold indicates intelligence leaking out of personas into infrastructure
- NFR25: Adding a new agent must require zero code changes — YAML config + persona MD only
- NFR26: All daemon configuration must be declarative (YAML/environment variables) — no hardcoded values for schedules, paths, or thresholds
- NFR27: Agent persona MDs must be self-contained — an agent's behavior must be fully understandable by reading its YAML + persona without referencing daemon source code
