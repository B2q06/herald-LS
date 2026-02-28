---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - _bmad-output/brainstorming/brainstorming-session-2026-02-27.md
  - _bmad-output/planning-artifacts/research/technical-herald-tech-stack-research-2026-02-27.md
date: 2026-02-27
author: B
---

# Product Brief: Herald

<!-- Content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

Herald is a unified personal assistant OS that enables a solo operator to function at the scale of a small-to-mid-size business. Built on the Claude Agent SDK with BMAD workflow orchestration, Herald replaces the cognitive overhead of manual agent prompting, fragmented task management, and scattered information gathering with an always-running autonomous system that researches, synthesizes, and delivers — without being asked.

A thin TypeScript daemon handles scheduling, file watching, and delivery while Claude SDK sessions — each wearing a BMAD persona — do all the thinking. Twelve specialized agents patrol domains on schedule, synthesize findings into a designed morning newspaper, generate smart daily task lists, monitor communications, and make any BMAD project queryable and actionable through a universal orchestrator. Delivery surfaces include an Android app and CLI, with push notifications gated by agent-judged urgency.

Herald exists because nothing on the market combines a real agent SDK foundation with a system designed to be *lived in* — not just demonstrated. Existing solutions are either toy wrappers, feature-gated platforms waiting on roadmaps, or fragile automation chains. Herald is built by its user, for its user, with the Claude SDK as a first-class citizen rather than an afterthought.

---

## Core Vision

### Problem Statement

Staying competitive as a solo operator across multiple active projects, a deep technology backlog, and rapidly evolving domains (ML, compute, geopolitics, competition, AI tooling) demands organizational-scale information processing and task management — but all that cognitive load falls on one person. Tasks leak out of memory. Agent prompting is manual and forgettable. Cutting-edge developments go unnoticed for days. The gap between what one person *could* act on and what they *actually* catch grows wider every week.

### Problem Impact

- **Missed intelligence:** Competition moves, breakthrough papers, new tools, and market shifts go undetected when manual agent runs are skipped or forgotten
- **Cognitive drain:** Mental task tracking across 3+ active projects and a growing backlog consumes bandwidth that should go toward building and creating
- **Execution gap:** Operating at individual scale while competing against teams means every missed signal and every forgotten task compounds into lost ground
- **Reactive posture:** Without proactive intelligence delivery, the operator is always catching up rather than staying ahead — discovering things late instead of acting early

### Why Existing Solutions Fall Short

- **Lindy, MultiOn, custom GPT workflows:** Toy-level agent wrappers without a real SDK foundation. Designed for demos, not daily use. No persistent memory, no inter-agent communication, no team synthesis
- **AutoGPT-style setups:** Fragile automation chains that break constantly. No structured workflow framework. No opinionated design about how agents should collaborate
- **Feature-gated platforms:** Waiting on someone else's roadmap for capabilities you need now. No ability to build what's missing
- **Manual Claude Code sessions:** Powerful but requires the user to remember to start them, prompt them correctly, and synthesize across sessions. The cognitive cost *is* the problem

The common gap: nothing combines a production-grade agent SDK, structured BMAD workflow orchestration, persistent agent memory, autonomous scheduling, and a designed daily delivery ritual into a system that's *meant to be lived in*.

### Proposed Solution

Herald is an always-running autonomous intelligence and execution platform. A deliberately simple daemon (cron scheduler, file watcher, WebSocket server, notification dispatcher) nudges Claude SDK sessions on schedule. Each session wears a BMAD persona — ML researcher, compute analyst, geopolitical monitor, newspaper editor, smart todo manager, project portal — and operates autonomously with persistent memory across runs.

The system produces a designed morning newspaper (Typst-compiled, git-versioned) where featured stories trigger full dedicated reports — the paper shows the summary paragraph, the full story is a click away. Research agents don't just report findings — they proactively advocate for changes to the user's setup, tooling, and workflow when they spot relevant advancements. A smart todo agent generates daily task lists from project state, backlog items, and procrastination accountability — tasks appear automatically instead of leaking from memory. Any BMAD project becomes queryable and actionable through the orchestrator, integrating project management as a natural extension.

### Key Differentiators

- **Claude SDK as first-class citizen:** Not a wrapper or integration — Herald is built *on* the SDK. Persistent sessions, team orchestration, subagent spawning, and MCP extensibility are architectural foundations, not bolted-on features
- **Built to be lived in:** Opinionated daily rhythm (morning paper, smart todos, scheduled patrols) designed for habitual use — not a tool you open when you remember, but a system that delivers to you
- **One person, organizational scale:** Force multiplier architecture — 12 specialized agents operating autonomously means research, synthesis, task management, and project oversight happen in parallel without human initiation
- **Proactive intelligence, not passive reporting:** Agents don't just summarize what happened — they advocate for improvements, flag opportunities, and generate actionable tasks from their findings
- **BMAD-native agent structure:** Every agent is a structured BMAD persona with workflows, memory, and accountability. Not prompt-and-pray — disciplined agent architecture with opinions, predictions, and confidence calibration
- **User-built, user-owned:** No waiting on someone else's feature roadmap. Herald is built by its operator, extended through declarative YAML + persona MDs, and runs on infrastructure the user controls

---

## Target Users

### Primary Users

**B — Solo Technical Operator**

**Profile:** A technically skilled individual managing multiple active software projects, a deep technology backlog, and ongoing education — all simultaneously. Operates as developer, product manager, researcher, and strategist in one person. Competes at the scale of a small-to-mid-size business without a team.

**Context & Environment:**
- Splits time between school, home office (CLI/desktop), and mobile (Android app)
- Runs 3+ active BMAD projects with many more ideas in the backlog
- Needs to stay current across ML, compute, AI tooling, geopolitics, and competitive landscape
- Currently prompts agents manually, forgets frequently, and loses tasks from mental tracking

**Motivations:**
- Operate at organizational scale without organizational overhead
- Never miss a competitive move, breakthrough paper, or relevant tool release
- Stop losing tasks and ideas to memory — have them captured and surfaced automatically
- Get smarter faster — absorb more industry knowledge through curated, persistent delivery
- Turn ideas into projects with structured workflows, not scattered notes

**Pain Points:**
- Cognitive drain from tracking tasks across projects mentally
- Forgetting to run agents means missed intelligence
- No system connects calendar, inbox, project state, and research into a unified daily flow
- Ideas get lost because there's no structured capture-to-project pipeline
- The anxiety of not knowing what you're forgetting

**Success Vision:** Herald runs autonomously. B wakes up to a smart, encouraging todo list that already knows his schedule, classes, emails, and project state. Breakfast comes with a designed newspaper. Midday, a push notification checks in on progress. New research triggers proactive suggestions for his own codebase. Ideas flow into a structured backlog. Projects flow from ideas through BMAD workflows to shipped features — started on the phone during the day, continued on the CLI at home. Every agent gets smarter over time, and so does B. The core emotional contract: Herald reduces the anxiety of forgetting by holding everything for you.

### Secondary Users

N/A for v1. Herald is built for its creator. Packaging for other operators is a future consideration once the system is proven through daily use.

### User Journey

**A Day with Herald:**

**6:00 AM — Wake up.** Phone notification: your daily brief is ready. Open the app to a smart todo list — not overwhelming, actionable. It knows today's class schedule, flagged two important emails from overnight, and pulled three project tasks that align with today's available time windows. A short encouraging note from Herald at the top.

**6:30 AM — Breakfast.** Tap into the morning newspaper. Headlines across ML, compute, geopolitics, competition, AI tooling — all researched and synthesized overnight by 6 agents working in parallel. One featured story: a new framework that could replace a dependency in one of B's projects. Tap the headline to read the full dedicated report. Herald already added "evaluate X framework" to the backlog.

**7:30 AM — School.** Actionable items for the day visible in the app. Class prep surfaced. Between classes, knock off a quick task and ping Herald: "done." Herald updates the list.

**12:30 PM — Midday check-in.** Push notification: "You've got 3 items left today — knocked anything off yet?" Tap to open the app, mark two items complete. Herald adjusts: "Nice. Here's what's still open."

**2:00 PM — Intraday notification.** Push alert: geopolitical event affecting semiconductor supply chain. Herald's geopolitical monitor flagged it and the compute researcher drew a connection to GPU pricing trends B tracks. Information absorbed in 30 seconds.

**3:00 PM — New feature idea.** Open Herald app → Projects. See project status cards for all active projects. Pick one, open a chat with the PM agent, flesh out a new feature. The agent helps scope it, creates a story, and it's ready for implementation. Start building on a feature branch right from the app.

**6:00 PM — Home, CLI.** `herald status` — see where everything stands. Open the BMAD project interface in Claude Code. Continue building and debugging the feature started on the phone. Run tests. Mark off todos as tasks complete. Done early — Herald suggests: "You've got bandwidth. Want to brainstorm that idea you captured last week?"

**8:00 PM — Idea backlog.** Open the brainstorming interface. Talk through a new project idea with the brainstorming agent. It gets fleshed out, saved as a structured idea file, indexed into RAG memory. When it's ready, promote it to a full BMAD project with one command.

**Ongoing — Compounding intelligence.** Every agent run makes Herald smarter. Research agents develop opinions with confidence calibration. Industry factoids accumulate in memory. Connections between domains surface automatically. B absorbs more information per day than would be humanly possible to gather manually — and it's curated, structured, and actionable.

### Future Packaging Vision

**Brand:** Yggdrasil Technology — the world tree. Everything connects, everything grows from one root.

**Positioning:** The anti-algorithm. "Tired of letting your bad habits control your feed? Take back your productivity today with information YOU want to see." Every other feed is optimized for someone else's engagement metrics. Herald is optimized for the operator's goals.

**Universal Hook — The Newspaper:** The morning newspaper is the packaging product. A personalized, agent-researched, designed publication delivered before you wake up — replacing the morning doomscroll with curated intelligence. Come for the paper, stay for the full OS.

**Onboarding as Product Configuration:** Prompt-style signup — "What topics do you care about? What do you want to stay informed on?" — generates a personalized agent roster. No configuration UI, no settings panels. A conversation that builds your Herald. Every instance is genuinely unique because the operator's interests literally define the system's behavior.

**Expansion Funnel:** Users arrive for the autonomous newspaper. Power users discover the smart todo integration, project portal, brainstorming backlog, and full operator stack as they grow into it. Natural depth, not a feature dump.

**Future User Profile:** Anyone who wants to replace their passive morning scroll with autonomous curated intelligence. Indie hackers, solo founders, researchers, agency owners, technical professionals — anyone competing above their weight class who needs a force multiplier.

---

## Success Metrics

### User Success Metrics

**Daily Engagement — The Ritual Test:**
- Morning newspaper read every day — not occasionally, habitually
- Smart todo list checked and acted on as the first productivity action of the day
- Herald is the default entry point for project work, not an afterthought

**Intelligence Value — The Discovery Test:**
- Newspaper regularly surfaces information the operator didn't already know
- At least one actionable insight per week that changes a decision, updates a tool, or flags an opportunity
- Proactive agent suggestions are relevant and not noise — signal-to-noise ratio that earns trust over time

**Cognitive Relief — The Anxiety Test:**
- Tasks stop leaking from memory — the todo list captures what the operator would have forgotten
- No manual agent prompting required — the system runs without being reminded
- The feeling of "Herald is holding everything for me" replaces the anxiety of "what am I forgetting?"

**Mobile Convenience — The Continuity Test:**
- Projects and agents are accessible and usable from the phone during the day
- Work started on mobile continues seamlessly on CLI at home
- Push notifications are timely, relevant, and lead to meaningful interactions

### System Reliability Metrics

**Non-Negotiable — 100% Reliability:**
- Every scheduled agent patrol fires and produces output. Zero tolerance for missed runs
- Daemon uptime is continuous — systemd auto-restart handles crashes, but crashes should be exceptional
- Newspaper is ready before wake-up time every single day
- Push notifications deliver without delay
- No data loss — agent memory, conversation logs, and project state are always persisted

### Smart Todo Quality Metrics

**Todo Intelligence:**
- When the operator has backlog items, the todo list prioritizes correctly against calendar, inbox, and project state
- When no explicit backlog exists, the todo agent consults project PM agents for context-aware next actions — pulling from project status, sprint state, and what probably needs attention
- Todos are actionable and scoped to available time windows — never overwhelming, never trivial
- Dynamic adjustment throughout the day as tasks complete or schedule changes

### Business Objectives

**v1 — Personal Validation (0-3 months):**
- Herald runs autonomously for 30 consecutive days without manual intervention beyond normal use
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
- The metric that proves it's worth paying for: "I cancelled three newsletters and stopped doomscrolling because Herald replaced all of it"

### Key Performance Indicators

| KPI | Target | Measurement |
|---|---|---|
| **Agent patrol completion rate** | 100% | Scheduled runs that produce output / total scheduled runs |
| **Newspaper delivery** | Daily before 6:30 AM | Timestamp of paper-ready notification |
| **Morning engagement** | Daily | Days newspaper + todo opened / total days |
| **Discovery rate** | 1+/week | Insights acted on that operator didn't previously know |
| **Todo capture rate** | >90% | Tasks completed from Herald list / total tasks completed (vs. ad-hoc) |
| **Proactive suggestion relevance** | >80% | Suggestions acknowledged or acted on / total suggestions |
| **Mobile-to-CLI continuity** | Seamless | Projects started on mobile successfully continued on CLI |
| **Zero missed runs** | 0 | Daemon failures or skipped schedules per month |

---

## MVP Scope

### Core Features

**The Framework (The Real Build):**

| Component | Description |
|---|---|
| **TypeScript Daemon** | Always-running process — node-cron scheduler, chokidar file watcher, ws WebSocket server, notification dispatcher, REST API |
| **Claude Agent SDK Integration** | V2 persistent sessions — create, resume, track. BMAD persona + knowledge injection per session |
| **Session Manager** | Persistent sessions with auto-compaction. Session ID tracking per agent. Health monitoring and recovery |
| **Event Pipeline** | Trigger-agnostic execution — cron, file event, user command, agent-initiated all flow through same pipeline. Loop detection with meta-agent evaluation |
| **Memory Stack** | SQLite FTS5 shared index (better-sqlite3) + sqlite-vec per-agent vector stores. Per-agent knowledge.md with opinions, predictions, accountability sections. Depreciating hot memory + cold RAG recall |
| **Memory Librarian** | Post-run indexing — extracts entities, vectorizes, categorizes into shared SQLite. Cross-agent discovery |
| **Notification System** | Abstract `notify(urgency, message)` primitive. Adapters: browser push (PWA), terminal bell, WebSocket event. Urgency-gated by agent judgment + user preferences |
| **Conversation Logger** | All agent-to-agent transcripts persisted to memory/conversations/. Browsable via CLI and PWA |
| **Declarative Agent System** | Agent = YAML config + BMAD persona MD. Drop in agents/, daemon auto-discovers. Hot reload on file changes |
| **Team Orchestration** | Claude SDK native team sessions — one agent spawns teammates for collaborative work. Used for newspaper synthesis, weekly review |
| **File Trigger Engine** | Watch paths with conditions, map to agent activations. Filesystem as event bus |
| **Calendar Integration** | Calendar API connection — agent sees schedule, time windows, classes, commitments |
| **Inbox Integration** | Email inbox monitoring — urgency evaluation, flagging important messages, draft responses |
| **Typst Newspaper Pipeline** | Agent-authored markdown → Typst template → compiled PDF/HTML. Git-versioned on dedicated branch. Featured stories trigger full dedicated reports |
| **Smart Todo Engine** | Dynamic daily task generation from calendar + inbox + project state + backlog. Midday check-ins. Consults project PM agents when no explicit backlog exists. Encouraging, actionable, scoped to available time |

**Delivery Surfaces:**

| Surface | Description |
|---|---|
| **CLI (`herald`)** | `herald status`, `herald paper`, `herald agents`, `herald agent <name>`, `herald run <agent>`, `herald todo`, `herald projects`, `herald project <name>`, `herald logs`, `herald schedule`, `herald comms`, `herald new-agent`, `herald notify` |
| **PWA (Web Application)** | WebSocket-connected progressive web app. Home (paper headline + todo + notifications), newspaper viewer, chat (markdown-rendered, agent switching), agent cards, project portal, todos, inbox, logs, settings. Browser push notifications |

**Agents (Trivial — YAML + Persona MD):**

| Agent | Role |
|---|---|
| **Orchestrator** | Universal front desk — routes commands, activates workflows, manages agents |
| **ML Researcher** | Patrols ML papers, benchmarks, model releases |
| **Compute Researcher** | Tracks hardware, GPU market, cloud pricing, chip developments |
| **AI Tooling Researcher** | Monitors frameworks, SDKs, developer tools, new libraries |
| **Geopolitical Monitor** | Tracks geopolitical events, policy changes, sanctions, conflicts |
| **Competition Researcher** | Monitors competitor activity, product launches, market moves |
| **News Digest** | General news monitoring, curated for relevance |
| **Newspaper Agent** | Synthesizes all research into designed publication. Summons researchers for team synthesis |
| **Smart Todo Agent** | Dynamic daily tasks, accountability, psychological design |
| **Comms Agent** | Email inbox monitoring, urgency evaluation, draft responses |
| **Project Portal** | On-demand onboarding into any BMAD project |
| **Memory Librarian** | Indexes all agent knowledge into shared SQLite after every run |

**Agent Capabilities (Built Into Framework):**

- Team sessions — any agent summons others for collaboration
- Subagent spawning — parallel subtasks within a session
- `/new-agent` workflow — orchestrator walks user through creating custom agents
- Cross-agent file triggers with condition matching
- Autonomous inter-agent communication
- Idea capture and structured backlog with RAG indexing
- Idea-to-project promotion via BMAD workflows

### Out of Scope for MVP

- **Native Android/iOS app** — PWA covers mobile. Native app is a future wrap when the PWA interaction patterns are proven
- **Voice briefing** — TTS morning summary is v1.1
- **Agent confidence dashboard** — visual prediction track records, forecaster rankings deferred to v1.1
- **Deep dive mode** — tap newspaper item to spawn focused research session. v1.1
- **Agent marketplace** — shareable agent configs. Future
- **Threshold triggers** — condition-based monitoring ("if sentiment drops below X, alert"). v1.1
- **Opinion accountability runs** — automated periodic checks on prediction accuracy. v1.1
- **Multiple user support** — Herald is single-operator for MVP

### MVP Success Criteria

- Daemon runs continuously with zero missed agent patrols for 30 consecutive days
- Newspaper delivered before 6:30 AM every morning with research from all patrol agents
- Smart todo integrates calendar, inbox, and project state into actionable daily lists
- At least one proactive suggestion per week that the operator acts on
- Projects accessible and usable from both CLI and PWA
- Ideas captured through brainstorming agent, saved structured, and promotable to BMAD projects
- All agent conversations logged and browsable

### Future Vision

**v1.1 — Intelligence Deepening:**
- Morning voice briefing (TTS 3-minute summary)
- Agent confidence dashboard and prediction accountability
- Deep dive mode — newspaper item → focused research session
- Threshold-based monitoring triggers
- Opinion accountability runs

**v2 — Packaging & Distribution:**
- Prompt-style signup generates personalized agent rosters
- Newspaper as standalone subscription product (Yggdrasil Technology)
- Native Android app wrapping the proven PWA patterns
- Multi-user support
- Agent marketplace — shareable YAML + persona configs

**Long-term — Platform:**
- "Tired of letting your bad habits control your feed?" — the anti-algorithm positioning
- Expansion funnel: newspaper → todos → projects → full operator stack
- Team/organization deployments — shared agent pools, collaborative newspapers
