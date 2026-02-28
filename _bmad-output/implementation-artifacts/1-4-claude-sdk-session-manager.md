# Story 1.4: Claude SDK Session Manager

Status: ready-for-dev

## Story

As an operator,
I want agent sessions to persist across runs with automatic state save and continuity,
So that agents pick up where they left off naturally.

## Acceptance Criteria

1. **Given** the daemon has a registered agent **When** a session is created **Then** the Claude SDK is initialized with the agent's BMAD persona MD and knowledge context
2. **Given** a session is created **When** configuration is checked **Then** the session is scoped to the agent's designated directories only (NFR22)
3. **Given** a session exists **When** its status is queried **Then** the session manager reports status: `idle`, `active`, or `failed`
4. **Given** an active session reaches its configured `session_limit` (N interactions) **When** the limit is reached **Then** state is saved to `memory/agents/{name}/last-jobs.md`, a summary is generated, and the session exits cleanly
5. **Given** a new session is created for an agent with a previous `last-jobs.md` **When** the session starts **Then** previous state is loaded into the session context for natural continuity (FR41)
6. **Given** a Claude SDK session fails (API error, rate limit) **When** the failure is detected **Then** the session manager handles the error without crashing the daemon (NFR5, NFR6) and the agent status is updated to `failed`
7. **Given** the daemon is running **When** `POST /api/agents/:name/run` is called **Then** a session is created and the agent executes with a provided prompt or default patrol prompt
8. **Given** the daemon is running **When** `GET /api/agents/:name/status` is called **Then** the current session status is returned

## Tasks / Subtasks

- [ ] Task 1: Create persona loader (AC: #1, #5)
  - [ ] 1.1 Create `packages/daemon/src/session/persona-loader.ts` — reads persona MD + knowledge.md + last-jobs.md
  - [ ] 1.2 Builds system prompt string from persona content + knowledge context
  - [ ] 1.3 Loads previous state from last-jobs.md if it exists and is non-empty
  - [ ] 1.4 Create `packages/daemon/src/session/persona-loader.test.ts`
- [ ] Task 2: Create session manager (AC: #2, #3, #4, #6)
  - [ ] 2.1 Create `packages/daemon/src/session/session-manager.ts` — manages session lifecycle
  - [ ] 2.2 `createSession(agentName, config, prompt)` — initializes SDK client, sends message with persona context
  - [ ] 2.3 Track interaction count, enforce session_limit bounding
  - [ ] 2.4 `saveState(agentName)` — writes conversation summary to last-jobs.md
  - [ ] 2.5 Error handling: try/catch wrapping all SDK calls, update status on failure
  - [ ] 2.6 Create `packages/daemon/src/session/session-manager.test.ts`
- [ ] Task 3: Create SDK adapter interface (AC: #1, #6)
  - [ ] 3.1 Create `packages/daemon/src/session/sdk-adapter.ts` — interface wrapping Anthropic SDK
  - [ ] 3.2 `sendMessage(systemPrompt, messages)` → response text
  - [ ] 3.3 Error classification: rate limit, auth failure, network error, unknown
  - [ ] 3.4 Install `@anthropic-ai/sdk` dependency
- [ ] Task 4: Create agent run API endpoint (AC: #7, #8)
  - [ ] 4.1 Create `packages/daemon/src/api/runs.ts` — `POST /api/agents/:name/run` and `GET /api/agents/:name/status`
  - [ ] 4.2 Wire into Hono app
  - [ ] 4.3 Create `packages/daemon/src/api/runs.test.ts`
- [ ] Task 5: Wire into daemon (AC: all)
  - [ ] 5.1 Create `packages/daemon/src/session/index.ts` — re-exports, `initSessionManager()`
  - [ ] 5.2 Update `packages/daemon/src/index.ts` — init session manager, pass to app
- [ ] Task 6: Validate
  - [ ] 6.1 `bun test` — all tests pass
  - [ ] 6.2 `bun lint` — clean

## Dev Notes

### Technical Requirements

- **SDK:** `@anthropic-ai/sdk` — official Anthropic TypeScript SDK
- **Model:** `claude-sonnet-4-5-20250929` (default, configurable)
- **API Key:** Read from `ANTHROPIC_API_KEY` env var (or `CLAUDE_API_KEY` — check both)
- **Testing:** All session manager tests use a mock SDK adapter — NO live API calls in tests

### Architecture Compliance

**Feature-based organization:**
```
packages/daemon/src/session/
├── index.ts              # initSessionManager(), re-exports
├── sdk-adapter.ts        # Interface + Anthropic SDK implementation
├── persona-loader.ts     # Load persona MD + knowledge + last-jobs
├── session-manager.ts    # Lifecycle, bounding, state tracking
├── persona-loader.test.ts
└── session-manager.test.ts
```

**Session manager is NOT the SDK itself.** It's the orchestration layer:
- Manages lifecycle: create → active → bounded → save → idle
- Tracks status per agent: `idle` | `active` | `failed`
- Enforces session_limit bounding
- Handles errors at session boundary
- Delegates actual API calls to SDK adapter

### SDK Adapter Design

```typescript
// Interface for testability
export interface SdkAdapter {
  sendMessage(params: {
    systemPrompt: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    maxTokens?: number;
  }): Promise<{ text: string; inputTokens: number; outputTokens: number }>;
}

// Real implementation wraps @anthropic-ai/sdk
export class AnthropicAdapter implements SdkAdapter {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async sendMessage(params) {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: params.maxTokens ?? 4096,
      system: params.systemPrompt,
      messages: params.messages,
    });
    // extract text from response.content[0]
  }
}
```

### Persona Loader Pattern

```typescript
export interface PersonaContext {
  systemPrompt: string;      // Combined persona + knowledge
  previousState: string | null; // Contents of last-jobs.md (null if empty/missing)
}

export async function loadPersonaContext(
  agentConfig: AgentConfig,
  heraldConfig: HeraldConfig,
): Promise<PersonaContext> {
  // 1. Read persona MD from config.persona path
  // 2. Read knowledge.md from memory/agents/{name}/knowledge.md
  // 3. Read last-jobs.md (may be empty)
  // 4. Combine: persona + "\n\n## Current Knowledge\n" + knowledge
  // 5. Return { systemPrompt, previousState }
}
```

### Session Manager Pattern

```typescript
interface SessionState {
  agentName: string;
  status: 'idle' | 'active' | 'failed';
  interactionCount: number;
  sessionLimit: number;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  startedAt: string | null;
  lastError?: string;
}

export class SessionManager {
  private sessions = new Map<string, SessionState>();
  private sdkAdapter: SdkAdapter;

  async runAgent(agentName: string, config: AgentConfig, prompt: string): Promise<string> {
    // 1. Load persona context
    // 2. Set status to 'active'
    // 3. Send message via SDK adapter with system prompt
    // 4. Increment interaction count
    // 5. If count >= session_limit → save state, set to 'idle'
    // 6. Return response text
    // Error: catch, set status 'failed', log, return error message
  }

  async saveState(agentName: string): Promise<void> {
    // Write conversation summary to last-jobs.md
  }

  getStatus(agentName: string): SessionState['status'] { ... }
}
```

### State Persistence

**Save to `memory/agents/{name}/last-jobs.md`:**
```markdown
# Last Session Summary

Date: {ISO8601}
Interactions: {count}

## Conversation Summary
{last few messages or summary}

## Key Outputs
{any important results}
```

**Load on next session:** Previous state is prepended to the first user message as context: "Previous session context: ..."

### API Endpoints

- `POST /api/agents/:name/run` — body: `{ prompt?: string }` → `{ result: string, interactionCount: number, status: string }`
- `GET /api/agents/:name/status` → `{ status: "idle"|"active"|"failed", interactionCount: number, lastError?: string }`
- Agent not found → 404 `{ error: "Agent not found" }`
- SDK not configured (no API key) → 503 `{ error: "SDK not configured" }`

### Error Handling

- **Rate limit (429):** Log warning, set status to 'failed', return error
- **Auth failure (401):** Log error, set status to 'failed'
- **Network error:** Log error, set status to 'failed'
- **All errors:** NEVER crash daemon, NEVER propagate to other agents
- **No automatic retry** — PRD specifies no infinite loops

### Testing Strategy

- **Mock SDK adapter** for all session manager tests
- **Persona loader tests:** Create temp files (persona MD, knowledge.md, last-jobs.md), verify combined output
- **Session manager tests:** Mock adapter, test lifecycle (create → active → bounded → save), error handling, interaction counting
- **API tests:** Use `app.request()` with mock session manager

### Previous Story Intelligence

From Stories 1.2 & 1.3:
- Hono app uses `createApp()` factory pattern — extend for session manager dependency
- Agent registry provides agent configs — session manager queries it
- Config loader provides `HeraldConfig` with paths
- `Bun.file()` for reading, `Bun.write()` for saving
- All tests pass with `bun test`, lint with `bun lint`
- `import type` for type-only imports

### References

- [Source: architecture.md — Session Management] daemon/src/session/ directory
- [Source: architecture.md — Error Handling] try/catch at session boundary
- [Source: architecture.md — NFR5-6] Failure isolation, graceful recovery
- [Source: architecture.md — NFR8] Session resume <3s
- [Source: architecture.md — NFR22] Agent sandboxing
- [Source: epics.md — Story 1.4 ACs] All acceptance criteria

## Change Log

- 2026-02-28: Story 1.4 created — session manager with SDK adapter abstraction for testability
