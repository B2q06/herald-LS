---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'Unified personal assistant OS - v1 feature set design merging Fang + Herald into Claude SDK-powered system with Android app + CLI interfaces'
session_goals: 'Complete v1 feature list ready to turn into implementation specs'
selected_approach: 'ai-recommended'
techniques_used: ['first-principles-thinking', 'morphological-analysis', 'six-thinking-hats']
ideas_generated: [26]
context_file: ''
technique_execution_complete: true
---

# Herald v1 — Brainstorming Session Results

**Facilitator:** B
**Date:** 2026-02-27

## Session Overview

**Topic:** Unified personal assistant OS — v1 feature set design merging Fang (autonomous agent engine) + Herald (BMAD workflow/facilitation framework) into a Claude SDK-powered system with Android app + CLI interfaces

**Goals:** Complete v1 feature list ready to turn into implementation specs

**Sources:** Fang (TypeScript/Claude Agent SDK runtime with 13 agents, Telegram, cron, memory/knowledge) and Herald (BMAD framework with 20+ agent personas, 30+ workflows, creative intelligence system)

---

## Irreducible Architecture

```
TRIGGER  →  BRAIN  →  OUTPUT
(cron/user/event)   (Claude SDK + BMAD + Memory)   (reports, newspaper, todos, etc.)
     ↑                                                    │
     └──────────── event-driven triggers ←─────────────────┘
```

```
DAEMON (always running, 95% stupid)
├── Cron scheduler → nudges agent sessions with prompt strings
├── File watcher → detects new/changed files → triggers workflows
├── Notification dispatcher → routes to push/bell/desktop
├── WebSocket server → pushes updates to app/CLI
└── API endpoint → receives commands from app/CLI

BRAIN (spawned on demand via BMAD / skills)
├── Claude SDK session with BMAD persona + workflow MDs
├── Does actual work → produces output files
├── Bounded persistence: alive for N interactions, then graceful save + exit
└── Next session loads persona + last-jobs.md → continues naturally
```

```
USER (phone/cli)
  │
  ▼
ORCHESTRATOR (default agent, always listening)
  │
  ├─ "show my paper" → fetches newspaper, renders to surface
  ├─ "make a new agent" → activates /new-agent workflow MD
  ├─ "talk to ml-researcher" → spawns researcher session, hands off chat
  ├─ "status of project X" → spins up project portal
  ├─ "schedule compute research every 2h" → updates agent YAML → daemon reloads
  └─ "what did agents talk about today" → pulls conversation logs, summarizes

DAEMON (background)
  │
  ├─ 5:30am: spawn(ml-researcher, "activate research-patrol") ─┐
  ├─ 5:30am: spawn(compute-researcher, "activate research-patrol") ─┤ parallel
  ├─ 5:30am: spawn(geo-monitor, "activate research-patrol") ─┘
  ├─ 6:00am: spawn(newspaper-agent, "activate morning-synthesis")
  ├─ watches filesystem for trigger rules
  └─ dispatches notifications when agents call notify()
```

---

## 26 Core Design Principles

### Architecture

1. **Single Brain, Many Personas** — One Claude SDK engine, many agents via BMAD persona injection. Not isolated processes — same brain, different hats, different memory contexts.

2. **Trigger-Agnostic Execution** — Cron, user input, or file event → same pipeline, same output format, same workflow. The trigger is just "who knocked on the door."

3. **Output-as-Event Pipeline** — Agent outputs are events, not endpoints. New report in `reports/ml-papers/` triggers newspaper update. Filesystem IS the event bus.

4. **Daemon as Dumb Nudger (95% Stupid)** — Daemon sends prompt strings to Claude sessions. All intelligence lives in BMAD persona + workflow MDs. Daemon vocabulary = prompt strings mapped to schedules. Tiny, stable, runs 24/7.

5. **/ Skills as Agent Activation** — BMAD `/` skills load full persona + skills + knowledge. This is the unified method for both interactive and daemon-triggered agent activation.

6. **Declarative Agent Definition** — Agent = YAML config + BMAD persona MD file. Drop files in `agents/`, daemon auto-discovers and starts scheduling. No code changes to add an agent.

### Memory & Knowledge

7. **BMAD-Native Memory, Extended** — BMAD's memory system is the foundation. Opinions, predictions, accountability tracking are new sections within the agent's standard `knowledge.md`, not separate systems.

8. **Depreciating Memory + RAG** — `knowledge.md` is hot working memory: items lose ~5% importance per day if not reinforced. Everything also embedded into per-agent RAG vector store for cold long-term recall on demand. Hot memory stays lean, cold memory stays searchable.

9. **Dual Memory Architecture** — Markdown for agent identity/knowledge (source of truth, BMAD-style). SQLite + vectors for cross-agent discovery (search layer, not ledger). Librarian agent indexes after every run.

10. **Bounded Session Persistence** — Sessions stay alive for N interactions (configurable per agent), then gracefully save state + conversation summary → exit. Fast conversational flow without context bloat.

11. **Session Continuity via `last-jobs.md`** — On session end, agent saves: what it was working on, conversation summary pointer, timestamp. New sessions check `last-jobs.md` to resume work naturally. "Pick up where we left off on X" just works.

### Agent Behavior

12. **Living Document, Not Daily Edition** — Newspaper is continuously updated. Breaking geopolitical crisis at 3am = immediate headline. Git-tracked on dedicated branch with agent-authored commit messages. Version history via git.

13. **Intelligent Notification Gate** — Agents evaluate urgency. Push notification IF AND ONLY IF the agent judges you need to know NOW. Develops judgment about what's urgent vs. interesting over time.

14. **Frequency = Vigilance, Not Volume** — Higher research frequency = tighter patrol loop scanning for new developments to add to existing report. Not "produce more artifacts."

15. **Opinion System with Confidence Calibration** — Agents develop takes. Each opinion has confidence level, supporting evidence, timestamp. Opinions, predictions, and accountability tracking live as sections within BMAD `knowledge.md`.

16. **Prediction Tracking & Accountability** — Agents record predictions explicitly. Periodic accountability runs check: did the prediction come true? Confidence calibrates. Track records emerge over time.

### Execution Patterns

17. **Three-Tier Parallel Execution** — Solo agents (cron-triggered, independent), team collaboration (agent summons teammates for synthesis), subagent delegation (parallel lookups within a session).

18. **Autonomous Inter-Agent Communication** — Agents can initiate team sessions without user approval. All conversations logged and browsable. Geopolitical monitor can autonomously ping compute researcher about supply chain overlap.

19. **Daily Rhythm** — Research agents patrol 4x/day. 5:30am run → 6:00am newspaper team synthesis → ~6:20am paper ready. Ad-hoc runs on file events and user commands anytime.

20. **Weekly Synthesis** — End-of-week scheduled team meeting: all agents review weekly reports → produce weekly strategic paper. Same pattern as daily, broader scope.

21. **Conversation Logging** — All agent-to-agent communication persisted. Full transcripts browsable like meeting minutes — who initiated, why, what conclusions.

### Interface & Output

22. **Orchestrator as Universal Front Desk** — Default agent for all user interaction. Has BMAD skills (workflow MDs) for routing, scheduling, agent creation, project access. You talk naturally, it figures out what to activate.

23. **Notification as Abstract Primitive** — `notify(urgency, message)`. Delivery surfaces are pluggable adapters — Android push, terminal bell, desktop notification, Discord webhook. Agent doesn't know transport. New surface = new adapter, zero agent changes.

24. **Typed Output System** — Every agent declares output types. Framework routes by type: markdown reports → reports dir (triggering file events), notifications → notification primitive, newspaper updates → synthesis queue.

25. **Markdown-Native Chat** — App chat natively renders markdown. Agent responses = summary first, then full markdown detail. Not raw text.

26. **Project Portal Agent** — Point system at any BMAD project. Onboarding agent interrogates project's existing BMAD agent, absorbs architecture/PRD/sprint status/everything. Project becomes queryable and actionable through the orchestrator.

---

## v1 MVP Scope (Tier 1 + Tier 2)

### Infrastructure

| Component | Description |
|---|---|
| **Thin Daemon** | TypeScript/Go service — cron scheduler, file watcher (inotify), notification dispatch, WebSocket server, REST API |
| **BMAD Memory System** | Per-agent `knowledge.md` with extended sections (opinions, predictions, accountability). BMAD-native patterns |
| **RAG Cold Storage** | Per-agent vector store for long-term memory. Hot memory depreciates, cold memory persists and is queryable |
| **SQLite Shared Index** | Cross-agent knowledge search. Librarian indexes after every agent run. FTS5 full-text search |
| **Conversation Logger** | Persists all agent-to-agent transcripts. Browsable via CLI and app |
| **Session Manager** | Bounded persistence (N interactions), graceful save to `last-jobs.md`, conversation summary generation |
| **Git Newspaper Branch** | Dedicated branch for newspaper versioning. Agent-authored commits. Full diff history |
| **File-Event Trigger Engine** | Watch paths with conditions, map to agent activations or workflow kickoffs |

### Agents

| Agent | Role | Schedule |
|---|---|---|
| **Orchestrator** | Universal front desk. Routes commands, activates workflows, manages agents | Always available (bounded sessions) |
| **ML Researcher** | Patrols ML papers, benchmarks, model releases | 4x/day + ad-hoc |
| **Compute Researcher** | Tracks hardware, GPU market, cloud pricing, chip developments | 4x/day + ad-hoc |
| **AI Tooling Researcher** | Monitors frameworks, SDKs, developer tools, new libraries | 4x/day + ad-hoc |
| **Geopolitical Monitor** | Tracks geopolitical events, policy changes, sanctions, conflicts | 4x/day + ad-hoc |
| **Competition Researcher** | Monitors competitor activity, product launches, market moves | 4x/day + ad-hoc |
| **News Digest** | General news monitoring, curated for relevance | 4x/day + ad-hoc |
| **Newspaper Agent** | Synthesizes all research into designed publication. Summons researchers for team synthesis | Daily 6am + on breaking events |
| **Smart Todo Agent** | Dynamic daily tasks, achievable scope, accountability for procrastinated items, psychological design | Daily morning + on-demand |
| **Comms Agent** | Email inbox monitoring, urgency evaluation, draft responses, reply queue | Continuous (webhook/polling) |
| **Project Portal** | On-demand onboarding into any BMAD project. Design/build/test from app | On-demand |
| **Memory Librarian** | Indexes all agent knowledge into shared SQLite. Extracts entities, vectorizes, categorizes | After every agent run |

### Agent Capabilities

| Capability | Description |
|---|---|
| **Team Sessions** | Any agent can summon others for collaborative discussion. All logged |
| **Subagent Spawning** | Agents spawn parallel subtasks within their session for concurrent lookups |
| **`/new-agent` Workflow** | Orchestrator walks user through creating custom agent (BMAD agent-builder adapted) |
| **Declarative Config** | YAML + persona MD. Drop in `agents/`, daemon discovers. No code changes |
| **Cross-Agent Triggers** | File events with conditions route to specific agents or workflows |
| **Autonomous Communication** | Agents initiate inter-agent sessions when they detect domain overlap |

### CLI Interface (`herald`)

| Command | Function |
|---|---|
| `herald status` | Dashboard — all agents, last run, next scheduled, recent findings |
| `herald paper` | Today's newspaper (terminal render or open PDF) |
| `herald paper --history` | Browse past editions |
| `herald paper --weekly` | Latest weekly synthesis |
| `herald agents` | List all agents with status |
| `herald agent <name>` | Chat with specific agent |
| `herald run <agent>` | Trigger agent run now |
| `herald new-agent` | Create custom agent wizard |
| `herald schedule` | View/edit cron schedules |
| `herald projects` | List registered BMAD projects |
| `herald project <name>` | Enter project context |
| `herald todo` | Today's smart todo list |
| `herald logs` | Browse agent conversation logs |
| `herald comms` | Email inbox summary |
| `herald notify` | Configure notification preferences |

### Android App

| Screen | Content |
|---|---|
| **Home** | Today's paper headline + todo summary + notification badges |
| **Newspaper** | Full designed paper (Typst-rendered), edition history, weekly papers |
| **Chat** | Markdown-rendered conversation. Defaults to orchestrator. Switch agents |
| **Agents** | Agent cards — status, last run, tap to interact |
| **Projects** | BMAD project list, tap to enter project context |
| **Todos** | Smart todo list, swipe complete, daily progress visualization |
| **Inbox** | Comms agent — emails, drafts, approvals |
| **Logs** | Agent conversation transcripts, searchable |
| **Settings** | Schedules, notification prefs, agent config |

### Notification Surfaces (v1)

- Android push notifications (Firebase/FCM)
- Terminal bell + desktop notifications (CLI)
- Pluggable adapter architecture for future surfaces

### Daily Rhythm

```
05:30  Research agents patrol (all 6 in parallel)
06:00  Newspaper agent wakes → summons researchers as team → synthesis session
06:20  Morning paper ready → push notification
06:30  Smart todo agent generates today's task list → push notification

...throughout the day...
11:30  Research patrol #2 → newspaper updates if noteworthy
17:30  Research patrol #3 → newspaper updates if noteworthy
23:30  Research patrol #4 → newspaper updates if noteworthy

Ad-hoc: file events, user commands, agent-initiated team sessions
       Breaking news → immediate newspaper update + urgent notification

Friday EOD: Weekly team synthesis → weekly strategic paper
```

### Memory Architecture

```
memory/
├── agents/
│   ├── ml-researcher/
│   │   ├── knowledge.md       ← BMAD hot memory (depreciating, curated)
│   │   │   ├── Domain Knowledge section
│   │   │   ├── Developing Opinions section
│   │   │   ├── Predictions Log section
│   │   │   └── Accountability section
│   │   ├── preferences.md     ← user steering ("focus on practical ML")
│   │   ├── rag/               ← vector store (cold long-term memory)
│   │   └── runs/              ← session logs (indexed then prunable)
│   ├── newspaper/
│   │   └── ...
│   └── [other agents]/
├── shared/
│   ├── index.sqlite           ← cross-agent searchable index (FTS5)
│   └── connections.md         ← librarian's cross-domain narrative
├── conversations/
│   ├── 2026-02-27-newspaper-synthesis.md
│   ├── 2026-02-27-geo-compute-overlap.md
│   └── ...
├── last-jobs.md               ← session continuity tracker
└── user/
    ├── preferences.md         ← global user preferences
    └── projects.md            ← registered BMAD projects
```

### Agent Definition Format

```yaml
# agents/ml-researcher.yaml
name: ml-researcher
persona: personas/ml-researcher.md
schedule: "30 5,11,17,23 * * *"
output_dir: reports/ml-papers
output_format: markdown
can_spawn_subagents: true
team_eligible: true
notify_policy: urgent_only
session_limit: 15                    # max interactions before save+exit
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

### Newspaper Pipeline

```
Research agents write reports → file event triggers
                                    │
                          Newspaper agent wakes
                                    │
                    Summons researchers as team (if scheduled synthesis)
                    OR reads new report directly (if ad-hoc update)
                                    │
                         Updates newspaper source
                                    │
                    Typst compiles → PDF + HTML output
                                    │
                    Git commit on newspaper branch (agent-authored message)
                                    │
                    WebSocket push to connected surfaces
                                    │
              If breaking/urgent → push notification to user
```

---

## v1.1 Feature Expansion

| Feature | Description |
|---|---|
| **Morning Voice Briefing** | TTS-generated 3-minute audio summary of the paper |
| **Agent Confidence Dashboard** | Visual prediction track records, forecaster rankings |
| **Deep Dive Mode** | Tap newspaper item → spawn focused research session on that topic |
| **Agent Marketplace** | Shareable agent configs (YAML + persona MD). "Here's my crypto researcher" |
| **Threshold Triggers** | Condition-based monitoring: "if sentiment drops below X, alert" |
| **Opinion Accountability Runs** | Periodic automated checks: were agent predictions correct? |

---

## Technique Execution Summary

### First Principles Thinking
Stripped away existing Fang/Herald assumptions. Established the irreducible architecture: TRIGGER → BRAIN → OUTPUT with filesystem as event bus. Collapsed memory into the brain. Identified two-body model (daemon + brain) as the foundation.

### Morphological Analysis
Decomposed system across 8 dimensions: Agent Types, Knowledge & Memory, Scheduling & Triggers, Output & Publishing, Inter-Agent Communication, User Interfaces, Agent Lifecycle, Intelligence Evolution. Systematically explored each dimension to generate comprehensive feature matrix.

### Six Thinking Hats
- **White (Facts):** Claude SDK subscription model enables liberal agent usage. BMAD workflows work. Typst, SQLite FTS5, inotify are mature tools.
- **Red (Gut):** Morning paper is the magic demo moment. Agent conversations you read later = having a trusted staff. Project portal could change everything.
- **Yellow (Value):** Information asymmetry, cognitive offload, project velocity, compounding intelligence, distributable to coworkers.
- **Black (Risks):** Context window limits (solved by depreciating memory + RAG), research hallucination, daemon reliability, notification fatigue, onboarding complexity.
- **Green (Creative):** Voice briefing, confidence dashboard, deep dive mode, weekly synthesis, agent marketplace.
- **Blue (Process):** Three-tier scoping — MVP (Tier 1+2), Feature Expansion (Tier 3 → v1.1), Future (v2+).

---

**Session Complete. Ready for spec generation.**
