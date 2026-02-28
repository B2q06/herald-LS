# Story 1.1: Bun Workspaces Monorepo Scaffold

Status: done

## Story

As a developer,
I want a fully configured Bun workspaces monorepo with shared TypeScript config, linting, and testing infrastructure,
So that all Herald packages share consistent tooling and I can begin building on a solid foundation.

## Acceptance Criteria

1. **Given** a fresh project directory **When** the scaffold is initialized **Then** a root package.json exists with `workspaces` pointing to `packages/*`
2. **Given** the scaffold is initialized **When** package directories are created **Then** four package directories exist: `packages/daemon`, `packages/cli`, `packages/pwa`, `packages/shared`
3. **Given** each package exists **When** its config is checked **Then** each package has its own package.json and tsconfig.json extending tsconfig.base.json
4. **Given** the scaffold is initialized **When** linting config is checked **Then** a root biome.json configures linting and formatting for all packages
5. **Given** the scaffold is initialized **When** testing config is checked **Then** a root vitest config enables testing across all packages using the `projects` option
6. **Given** the shared package exists **When** its source is checked **Then** `packages/shared/src/index.ts` exists with initial Zod schemas for agent config and herald config
7. **Given** the scaffold is initialized **When** env config is checked **Then** `.env.example` documents all required environment variables (CLAUDE_API_KEY, HERALD_PORT, HERALD_DATA_DIR)
8. **Given** the scaffold is initialized **When** .gitignore is checked **Then** `.gitignore` excludes node_modules, .env, data/, memory/, reports/
9. **Given** the scaffold is initialized **When** herald config is checked **Then** `herald.config.yaml` skeleton exists with port, paths, and default values
10. **Given** the scaffold is initialized **When** non-package directories are checked **Then** directories exist: `agents/`, `personas/`, `reports/`, `memory/`, `newspaper/`, `data/`, `systemd/`
11. **Given** the scaffold is complete **When** `bun install` is run **Then** it succeeds and inter-package `workspace:*` references resolve
12. **Given** the scaffold is complete **When** `bun test` is run **Then** Vitest executes across all packages (even if no tests exist yet, it should not error)

## Tasks / Subtasks

- [x] Task 1: Initialize root project (AC: #1)
  - [x] 1.1 Run `bun init` in project root
  - [x] 1.2 Configure root package.json with `"workspaces": ["packages/*"]` and `"private": true`
  - [x] 1.3 Add root dev scripts: `test`, `lint`, `format`, `dev:daemon`, `dev:pwa`, `dev:cli`
- [x] Task 2: Create tsconfig.base.json (AC: #3)
  - [x] 2.1 Create root tsconfig.base.json with Bun-recommended settings (ESNext, bundler moduleResolution, strict mode)
- [x] Task 3: Create biome.json (AC: #4)
  - [x] 3.1 Install `@biomejs/biome` as root dev dependency
  - [x] 3.2 Create root biome.json with formatting and linting rules for TypeScript
- [x] Task 4: Create all four packages (AC: #2, #3)
  - [x] 4.1 Create `packages/shared/` with package.json, tsconfig.json, src/index.ts
  - [x] 4.2 Create `packages/daemon/` with package.json, tsconfig.json, src/index.ts
  - [x] 4.3 Create `packages/cli/` with package.json, tsconfig.json, src/index.ts
  - [x] 4.4 Create `packages/pwa/` with package.json, tsconfig.json, src/index.ts (empty Preact stub)
  - [x] 4.5 Wire inter-package dependencies: daemon, cli, pwa all depend on `shared` via `workspace:*`
- [x] Task 5: Create shared Zod schemas (AC: #6)
  - [x] 5.1 Install `zod` in shared package
  - [x] 5.2 Create `packages/shared/src/schemas/agent-config.ts` — Zod schema for agent YAML
  - [x] 5.3 Create `packages/shared/src/schemas/herald-config.ts` — Zod schema for herald.config.yaml
  - [x] 5.4 Create `packages/shared/src/schemas/api-responses.ts` — placeholder with base response schema
  - [x] 5.5 Create `packages/shared/src/schemas/ws-messages.ts` — placeholder with base envelope schema
  - [x] 5.6 Create `packages/shared/src/schemas/agent-output.ts` — placeholder for agent output frontmatter
  - [x] 5.7 Create `packages/shared/src/types/index.ts` — re-export z.infer types
  - [x] 5.8 Create `packages/shared/src/constants/index.ts` — shared constants (event types, status enums)
  - [x] 5.9 Re-export all from `packages/shared/src/index.ts`
- [x] Task 6: Create Vitest workspace config (AC: #5, #12)
  - [x] 6.1 Install `vitest` as root dev dependency
  - [x] 6.2 Create root `vitest.config.ts` with `projects: ['packages/*']`
  - [x] 6.3 Add a smoke test in shared package to verify test pipeline works
- [x] Task 7: Create environment and config files (AC: #7, #8, #9)
  - [x] 7.1 Create `.env.example` with CLAUDE_API_KEY, HERALD_PORT, HERALD_DATA_DIR
  - [x] 7.2 Create `.gitignore` with proper exclusions
  - [x] 7.3 Create `herald.config.yaml` skeleton with port, paths, defaults
- [x] Task 8: Create non-package directories (AC: #10)
  - [x] 8.1 Create `agents/`, `personas/`, `reports/`, `memory/`, `newspaper/`, `data/`, `systemd/`
  - [x] 8.2 Add `.gitkeep` files to empty directories that are gitignored
  - [x] 8.3 Create `data/migrations/` directory for future SQL migrations
  - [x] 8.4 Create `newspaper/templates/` directory for future Typst templates
  - [x] 8.5 Create `memory/agents/`, `memory/shared/`, `memory/conversations/`, `memory/user/` subdirectories
- [x] Task 9: Validate scaffold (AC: #11, #12)
  - [x] 9.1 Run `bun install` and verify workspace resolution
  - [x] 9.2 Run `bun test` and verify Vitest executes
  - [x] 9.3 Run `bun lint` and verify Biome runs across all packages
  - [x] 9.4 Verify shared package is importable from daemon package

## Dev Notes

### Technical Requirements

- **Runtime:** Bun v1.3+ — this is the runtime for the entire project, not Node.js
- **Language:** TypeScript with strict mode enabled across all packages
- **Package Manager:** Bun (not npm, yarn, or pnpm) — use `bun add`, `bun install`, `bun run`
- **Module System:** ESNext modules — `"module": "Preserve"`, `"moduleResolution": "bundler"` in tsconfig
- **No Build Step for Dev:** Bun runs .ts files directly — no compilation needed during development

### Architecture Compliance

**CRITICAL — Follow these patterns exactly:**

- **Feature-based code organization** — organize by domain (scheduler/, watcher/, session/), NOT by type (controllers/, services/, models/)
- **Co-located test files** — `agent-manager.ts` + `agent-manager.test.ts` in the same directory. NO separate `__tests__/` or `test/` directories
- **kebab-case for all files** — `agent-manager.ts`, not `agentManager.ts` or `AgentManager.ts`
- **index.ts per directory** — re-exports public API only
- **No authentication for v1** — single operator, localhost only

**Naming Conventions (from Architecture doc):**

| Context | Convention | Example |
|---|---|---|
| Variables/functions | camelCase | `getAgentStatus`, `sessionLimit` |
| Types/interfaces/classes | PascalCase | `AgentConfig`, `SessionManager` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_SESSION_INTERACTIONS`, `DEFAULT_PORT` |
| Enums | PascalCase name + members | `enum RunStatus { Success, Failed }` |
| Files/directories | kebab-case | `agent-manager.ts` |
| SQLite tables | snake_case, plural | `agent_runs`, `fts_entries` |
| SQLite columns | snake_case | `agent_id`, `created_at` |
| REST endpoints | kebab-case, plural nouns | `/agents`, `/newspaper/editions` |
| JSON fields | camelCase | `{ agentId, runStatus }` |
| WebSocket events | snake_case | `agent_status`, `todo_change` |
| Agent YAML keys | snake_case | `session_limit`, `notify_policy` |
| Agent IDs | kebab-case strings | `ml-researcher`, `compute-researcher` |
| Env vars | SCREAMING_SNAKE_CASE | `CLAUDE_API_KEY`, `HERALD_PORT` |

### Library & Framework Requirements

**Install these exact dependencies:**

**Root devDependencies:**
- `@biomejs/biome` (latest v2.x — currently 2.2.4)
- `vitest` (v4.0.x — currently 4.0.7)
- `typescript` (latest v5.x)

**Note on Bun types:** Bun v1.3+ ships built-in TypeScript types. Do NOT install `@types/bun` or `bun-types` — they are unnecessary and may conflict. Bun's types are available automatically when `"types": ["bun-types"]` is in tsconfig or via the default Bun environment.

**packages/shared dependencies:**
- `zod` (latest v3.x)

**packages/daemon dependencies:**
- `hono` (latest v4.x) — REST framework
- `node-cron` (latest) — schedule management
- `@types/node-cron` — types for node-cron

**packages/cli dependencies (placeholder for Story 1.2+):**
- `commander` — CLI framework (install later when needed)

**packages/pwa dependencies (placeholder for Stage 3):**
- `preact` — will be installed when PWA work begins

**DO NOT install these yet (future stories):**
- `sqlite-vec`, `marked`, `marked-terminal`, `preact-iso`, `@preact/signals`, `tailwindcss`
- These are for later stories — only install what this story needs

### File Structure Requirements

**Root directory layout:**

```
herald/
├── package.json                    # Root: workspaces, scripts, devDeps
├── tsconfig.base.json              # Shared TypeScript strict config
├── biome.json                      # Linting/formatting for all packages
├── vitest.config.ts                # Vitest workspace config
├── herald.config.yaml              # Daemon config skeleton
├── .env.example                    # Required env vars template
├── .gitignore                      # Exclusions
├── packages/
│   ├── daemon/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── index.ts            # Placeholder entry point
│   ├── cli/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── index.ts            # Placeholder entry point
│   ├── pwa/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── index.ts            # Placeholder entry point
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts            # Re-exports everything
│           ├── schemas/
│           │   ├── agent-config.ts
│           │   ├── herald-config.ts
│           │   ├── api-responses.ts
│           │   ├── ws-messages.ts
│           │   └── agent-output.ts
│           ├── types/
│           │   └── index.ts
│           └── constants/
│               └── index.ts
├── agents/                         # Agent YAML configs (versioned)
│   └── .gitkeep
├── personas/                       # BMAD persona MDs (versioned)
│   └── .gitkeep
├── reports/                        # Agent output (gitignored)
│   └── .gitkeep
├── memory/                         # Agent memory (gitignored)
│   ├── agents/
│   ├── shared/
│   ├── conversations/
│   └── user/
├── newspaper/                      # Typst templates + output
│   └── templates/
├── data/                           # SQLite databases (gitignored)
│   └── migrations/
└── systemd/                        # systemd unit files
    └── .gitkeep
```

### Zod Schema Specifications

**agent-config.ts — Agent YAML Schema:**
```typescript
import { z } from 'zod';

export const AgentConfigSchema = z.object({
  name: z.string(),
  persona: z.string(), // path to persona MD
  schedule: z.string().optional(), // cron expression
  output_dir: z.string(),
  session_limit: z.number().default(10),
  notify_policy: z.enum(['all', 'failures', 'urgent', 'none']).default('failures'),
  memory_paths: z.object({
    knowledge: z.string(),
    preferences: z.string(),
    last_jobs: z.string(),
    rag: z.string(),
  }).optional(),
  trigger_rules: z.array(z.object({
    watch: z.string(),
    condition: z.string().optional(),
    message: z.string().optional(),
  })).optional(),
  team_eligible: z.boolean().default(false),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;
```

**herald-config.ts — Herald Config Schema:**
```typescript
import { z } from 'zod';

export const HeraldConfigSchema = z.object({
  port: z.number().default(3000),
  data_dir: z.string().default('./data'),
  agents_dir: z.string().default('./agents'),
  personas_dir: z.string().default('./personas'),
  memory_dir: z.string().default('./memory'),
  reports_dir: z.string().default('./reports'),
  newspaper_dir: z.string().default('./newspaper'),
  log_level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type HeraldConfig = z.infer<typeof HeraldConfigSchema>;
```

**tsconfig.base.json — Bun-Recommended Config:**
```jsonc
{
  "compilerOptions": {
    "lib": ["ESNext"],
    "target": "ESNext",
    "module": "Preserve",
    "moduleDetection": "force",
    "jsx": "react-jsx",
    "allowJs": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noPropertyAccessFromIndexSignature": false
  }
}
```

**biome.json — Root Linting/Formatting Config:**
```json
{
  "$schema": "https://biomejs.dev/schemas/2.2.4/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always",
      "trailingCommas": "all"
    }
  },
  "files": {
    "include": ["packages/*/src/**/*.ts", "packages/*/src/**/*.tsx", "*.ts"],
    "ignore": ["node_modules", "dist", "build", ".next"]
  }
}
```

**herald.config.yaml — Daemon Config Skeleton:**
```yaml
# Herald daemon configuration
# Secrets go in .env, not here

port: 3117
data_dir: ./data
agents_dir: ./agents
personas_dir: ./personas
memory_dir: ./memory
reports_dir: ./reports
newspaper_dir: ./newspaper
log_level: info
```

**vitest.config.ts — Workspace Config (Vitest v4.0):**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/*'],
  },
});
```

### Testing Requirements

- Use **Vitest v4.0** — NOT Jest, NOT Bun's built-in test runner
- **Co-locate tests** with source files: `foo.ts` + `foo.test.ts` in same directory
- Create ONE smoke test in `packages/shared/src/schemas/agent-config.test.ts` to validate the test pipeline works:
  - Test that `AgentConfigSchema.parse()` succeeds with valid input
  - Test that `AgentConfigSchema.parse()` throws with invalid input
- All packages should have at least a placeholder so Vitest doesn't error on empty packages

### Project Structure Notes

- This is Story 1.1 — the very first story in a greenfield project. There is NO existing code.
- The scaffold must be clean and minimal — only create what's specified. Don't add features from later stories.
- Do NOT create daemon API routes, agent loader logic, session management, or any other Story 1.2+ code.
- Placeholder `index.ts` files in daemon, cli, and pwa should just export an empty object or a version string — they exist to make TypeScript and Bun workspaces happy.

### References

- [Source: architecture.md — Project Structure] Lines 115-143, 469-706
- [Source: architecture.md — Technology Stack] Lines 60-68, 147-177
- [Source: architecture.md — Naming Conventions] Lines 284-321
- [Source: architecture.md — Code Organization] Lines 326-344
- [Source: architecture.md — Testing] Lines 162-163, 331-334
- [Source: architecture.md — First Implementation Priority] Lines 912-916
- [Source: epics.md — Story 1.1 ACs] Lines 323-343
- [Source: prd.md — Technology Alignment] Lines 419-423

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Biome v2.4.4 config breaking change: `organizeImports` moved to `assist.actions.source.organizeImports`, `include`/`ignore` renamed to `includes` in `files` section. Story spec was based on Biome v1.x config format; adapted for v2.x.
- Zod v4.3.6 was installed by default; downgraded to v3.25.76 to match story spec requirement of "latest v3.x".
- `@types/bun` was auto-installed by `bun init`; removed per story spec (Bun v1.3+ ships built-in types).
- Code review: Fixed 6 issues (3 HIGH, 3 MEDIUM). See Change Log entry for 2026-02-28 review.

### Completion Notes List

- Initialized Bun monorepo with workspaces pointing to `packages/*`
- Created tsconfig.base.json with Bun-recommended strict TypeScript settings (ESNext, bundler moduleResolution)
- Configured Biome v2.4.4 for linting/formatting with single-quote, semicolons, 2-space indent, 100-char line width
- Created 4 packages: shared, daemon, cli, pwa — each with package.json, tsconfig.json extending base, and src/index.ts
- Wired workspace dependencies: daemon, cli, pwa depend on shared via `workspace:*`
- Installed daemon dependencies: hono v4.12.3, node-cron v4.2.1, @types/node-cron
- Created 5 Zod schemas in shared: agent-config, herald-config, api-responses, ws-messages, agent-output
- Created types/index.ts (re-exports inferred types), constants/index.ts (event types, status enums, defaults)
- Configured Vitest v4.0.18 with workspace projects config
- Created smoke test (3 tests: valid parse, defaults, invalid input) — all passing
- Created .env.example, .gitignore, herald.config.yaml
- Created all non-package directories with .gitkeep files and subdirectories
- All validations pass: `bun install` resolves, `bun run test` passes 3/3, `bun run lint` clean, shared importable from daemon

### File List

- package.json (new)
- tsconfig.base.json (new)
- biome.json (new)
- vitest.config.ts (new)
- herald.config.yaml (new)
- .env.example (new)
- .gitignore (modified from bun init)
- bun.lock (new, auto-generated)
- packages/shared/package.json (new)
- packages/shared/tsconfig.json (new)
- packages/shared/src/index.ts (new)
- packages/shared/src/schemas/agent-config.ts (new)
- packages/shared/src/schemas/agent-config.test.ts (new)
- packages/shared/src/schemas/herald-config.ts (new)
- packages/shared/src/schemas/api-responses.ts (new)
- packages/shared/src/schemas/ws-messages.ts (new)
- packages/shared/src/schemas/agent-output.ts (new)
- packages/shared/src/types/index.ts (new)
- packages/shared/src/constants/index.ts (new)
- packages/daemon/package.json (new)
- packages/daemon/tsconfig.json (new)
- packages/daemon/src/index.ts (new)
- packages/cli/package.json (new)
- packages/cli/tsconfig.json (new)
- packages/cli/src/index.ts (new)
- packages/pwa/package.json (new)
- packages/pwa/tsconfig.json (new)
- packages/pwa/src/index.ts (new)
- agents/.gitkeep (new)
- personas/.gitkeep (new)
- reports/.gitkeep (new)
- systemd/.gitkeep (new)
- memory/agents/.gitkeep (new)
- memory/shared/.gitkeep (new)
- memory/conversations/.gitkeep (new)
- memory/user/.gitkeep (new)
- newspaper/templates/.gitkeep (new)
- data/migrations/.gitkeep (new)

## Change Log

- 2026-02-28: Story 1.1 implemented — Full monorepo scaffold with Bun workspaces, TypeScript, Biome, Vitest, Zod schemas, and project directory structure
- 2026-02-28: Code review — Fixed 6 issues: [H1] Deleted bun init CLAUDE.md boilerplate that contradicted architecture, [H2] Fixed HeraldConfigSchema port default 3000→3117, [H3] Fixed .gitignore to preserve directory structure via negation patterns for data/ memory/ reports/, [M1] Removed duplicate vitest devDep from shared package, [M2] Fixed zod version pinning "3"→"^3.25.76", [M3] Removed duplicate type re-exports from shared index.ts. 1 LOW item deferred (optional HeraldConfig smoke test).
