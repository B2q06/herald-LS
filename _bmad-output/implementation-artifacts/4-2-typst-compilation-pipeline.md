# Story 4.2: Typst Compilation Pipeline

Status: ready-for-dev

## Story

As an operator,
I want the newspaper compiled into a designed PDF and HTML publication,
so that I read a polished, formatted document -- not raw markdown.

## Acceptance Criteria

1. **Given** newspaper synthesis markdown exists in `newspaper/editions/{date}/sources/` **When** the compilation pipeline runs **Then** the markdown is processed through a Typst template at `newspaper/templates/newspaper.typ` **And** Typst compiles the output into both PDF and HTML at `newspaper/editions/{date}/newspaper.pdf` and `newspaper.html` (FR20) **And** compilation executes as a subprocess -- Typst runs in a child process, not in the daemon's event loop (NFR18)

2. **Given** the Typst compilation runs **When** compilation completes **Then** total compilation time is <15 seconds (NFR9) **And** the compiled output is served via the daemon's REST API

3. **Given** the Typst compilation fails (template error, missing content, Typst not installed) **When** the error is caught **Then** the daemon logs the error with `console.error` **And** the raw markdown newspaper is still available via API as a fallback **And** the daemon continues running -- compilation failure never crashes the daemon (NFR18)

## Tasks / Subtasks

- [ ] Task 1: Create the Typst template (AC: #1)
  - [ ] 1.1 Create `newspaper/templates/newspaper.typ` -- the Typst template that reads source markdown files and produces the newspaper layout
  - [ ] 1.2 Template must use `read()` to load source markdown content from a path passed via `--input` CLI flag
  - [ ] 1.3 Template includes newspaper-appropriate typography: masthead/title, date line, section headers, body text, columns for content density
  - [ ] 1.4 Template handles missing sections gracefully -- partial content still compiles

- [ ] Task 2: Create the Typst compiler module (AC: #1, #2, #3)
  - [ ] 2.1 Create `packages/daemon/src/newspaper/typst-compiler.ts` -- invokes Typst CLI as a subprocess
  - [ ] 2.2 Export `compileTypst(templatePath: string, outputPath: string, format: 'pdf' | 'html', inputs: Record<string, string>, timeoutMs?: number): Promise<CompilationResult>` -- standalone function, no class or interface wrapper
  - [ ] 2.3 Compile to PDF: spawn `typst compile` with `--input` flags pointing to source directory and date, output to `newspaper/editions/{date}/newspaper.pdf`
  - [ ] 2.4 Compile to HTML: spawn `typst compile` with `--format html`, output to `newspaper/editions/{date}/newspaper.html`
  - [ ] 2.5 Use `Bun.spawn()` for subprocess execution -- captures stdout/stderr, enforces 15-second timeout (NFR9)
  - [ ] 2.6 Return `CompilationResult` with status, paths to outputs, duration, and error details if failed
  - [ ] 2.7 All errors caught and returned as result -- never throws, never crashes daemon (NFR18)
  - [ ] 2.8 Log compilation events: `console.log` on success, `console.error` on failure
  - [ ] 2.9 Create `packages/daemon/src/newspaper/typst-compiler.test.ts`

- [ ] Task 3: Create the newspaper pipeline orchestrator (AC: #1, #3)
  - [ ] 3.1 Create `packages/daemon/src/newspaper/pipeline.ts` -- pipeline orchestration
  - [ ] 3.2 Export `runNewspaperPipeline(editionDate: string, heraldConfig: HeraldConfig): Promise<PipelineResult>`
  - [ ] 3.3 Pipeline steps: (1) validate sources exist in `newspaper/editions/{date}/sources/`, (2) combine all `.md` files (editorial.md first, then remaining files alphabetically by agent name), (3) convert combined markdown to Typst markup, (4) compile PDF, (5) compile HTML
  - [ ] 3.4 If compilation fails, set `compiledPdf: null, compiledHtml: null` but keep `sourceMarkdown` path populated for fallback
  - [ ] 3.5 Export `getEditionStatus(editionDate: string, heraldConfig: HeraldConfig): Promise<EditionStatus>` -- checks what outputs exist for a given date
  - [ ] 3.6 Create `packages/daemon/src/newspaper/pipeline.test.ts`

- [ ] Task 4: Add compilation routes to newspaper API (AC: #2, #3)
  - [ ] 4.1 Modify `packages/daemon/src/api/newspaper.ts` (created by Story 4.1) -- add compilation and format-serving routes to the existing `createNewspaperRoutes()` function
  - [ ] 4.2 Extend the `NewspaperRouteDeps` interface (defined by Story 4.1) if additional dependencies are needed for compilation (e.g., `heraldConfig`)
  - [ ] 4.3 `POST /api/newspaper/compile` -- triggers compilation for a given date (body: `{ date?: string }`, defaults to today)
  - [ ] 4.4 `GET /api/newspaper/current/pdf` -- serves the compiled PDF file (Content-Type: application/pdf)
  - [ ] 4.5 `GET /api/newspaper/current/html` -- serves the compiled HTML file (Content-Type: text/html)
  - [ ] 4.6 `GET /api/newspaper/current/markdown` -- serves the raw source markdown as fallback (Content-Type: text/markdown)
  - [ ] 4.7 `GET /api/newspaper/editions/:date/pdf` -- serves a specific edition's PDF
  - [ ] 4.8 `GET /api/newspaper/editions/:date/html` -- serves a specific edition's HTML
  - [ ] 4.9 `GET /api/newspaper/editions/:date/markdown` -- serves a specific edition's markdown
  - [ ] 4.10 All file-serving endpoints return 404 if the requested format is not available, with `{ error: "..." }` message indicating fallback
  - [ ] 4.11 Do NOT redefine `GET /api/newspaper/current` or `GET /api/newspaper/editions` -- those are Story 4.1's routes
  - [ ] 4.12 Create `packages/daemon/src/api/newspaper.test.ts` for the new compilation routes

- [ ] Task 5: Verify newspaper route wiring (AC: #2)
  - [ ] 5.1 Story 4.1 already wires `createNewspaperRoutes` into `packages/daemon/src/api/index.ts` -- verify the new compilation routes are accessible through the existing mount
  - [ ] 5.2 If `heraldConfig` is not already in `NewspaperRouteDeps` (from Story 4.1), add it to the interface and update the call site in `api/index.ts`

- [ ] Task 6: Validate
  - [ ] 6.1 `bun test` -- all new and existing tests pass
  - [ ] 6.2 `bun lint` -- clean (Biome)

## Dev Notes

### Technical Requirements

**Typst CLI Invocation Pattern:**

Typst is a command-line tool installed system-wide (`pacman -S typst` on Arch). It compiles `.typ` source files into PDF (default) or HTML. The daemon invokes it as a subprocess -- never as an in-process library.

```bash
# Compile to PDF (default format)
typst compile newspaper.typ newspaper.pdf

# Compile to HTML
typst compile newspaper.typ newspaper.html --format html

# Pass input variables accessible in template via sys.inputs
typst compile newspaper.typ newspaper.pdf --input date="2026-02-28" --input sources-dir="/path/to/sources"
```

**Subprocess Execution with Bun.spawn():**

The existing codebase uses `Bun.spawnSync` for simple checks (e.g., `which claude` in `index.ts`). For Typst compilation, use `Bun.spawn()` (async) to avoid blocking the event loop, with a timeout enforced via `AbortController` or manual timer.

```typescript
export interface CompilationResult {
  success: boolean;
  format: 'pdf' | 'html';
  outputPath?: string;
  error?: string;
  durationMs: number;
}

export async function compileTypst(
  templatePath: string,
  outputPath: string,
  format: 'pdf' | 'html',
  inputs: Record<string, string>,
  timeoutMs: number = 15_000,
): Promise<CompilationResult> {
  const startMs = Date.now();

  const args = ['typst', 'compile', templatePath, outputPath];
  if (format === 'html') {
    args.push('--format', 'html');
  }
  for (const [key, value] of Object.entries(inputs)) {
    args.push('--input', `${key}=${value}`);
  }

  try {
    const proc = Bun.spawn(args, {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    // Enforce timeout
    const timeout = setTimeout(() => {
      proc.kill();
    }, timeoutMs);

    const exitCode = await proc.exited;
    clearTimeout(timeout);

    const durationMs = Date.now() - startMs;
    const stderr = await new Response(proc.stderr).text();

    if (exitCode !== 0) {
      console.error(`[herald] Typst compilation failed (${format}): ${stderr}`);
      return {
        success: false,
        format,
        durationMs,
        error: `Typst exited with code ${exitCode}: ${stderr}`,
      };
    }

    console.log(`[herald] Typst compiled ${format} in ${durationMs}ms`);
    return { success: true, format, outputPath, durationMs };
  } catch (err) {
    const durationMs = Date.now() - startMs;
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[herald] Typst subprocess error (${format}): ${error}`);
    return {
      success: false,
      format,
      durationMs,
      error,
    };
  }
}
```

**Typst Template Design (`newspaper/templates/newspaper.typ`):**

The template reads source markdown via `sys.inputs` to find the source files. Typst can read external files with `read()` and include `.typ` files with `include`. The template receives the edition date and the path to the sources directory as inputs.

```typst
// newspaper/templates/newspaper.typ
// Inputs: date (string), sources-dir (string), newspaper-md (string)

#let edition-date = sys.inputs.at("date", default: "Unknown Date")
#let newspaper-content = read(sys.inputs.at("newspaper-md"))

#set document(title: "Herald Daily Brief — " + edition-date)
#set page(
  paper: "a4",
  margin: (top: 2cm, bottom: 2cm, left: 1.8cm, right: 1.8cm),
  header: align(right)[_Herald Daily Brief_ — #edition-date],
  numbering: "1",
)
#set text(font: "Libertinus Serif", size: 10.5pt)
#set par(justify: true, leading: 0.65em)

// Masthead
#align(center)[
  #text(size: 28pt, weight: "bold")[Herald]
  #v(2pt)
  #text(size: 11pt)[Daily Intelligence Brief — #edition-date]
  #line(length: 100%, stroke: 0.5pt)
]

#v(8pt)

// Render the markdown content
// Typst parses the content directly as markup
#eval(newspaper-content, mode: "markup")
```

**Important Template Considerations:**
- The template receives a single combined markdown file path via `--input newspaper-md=path`. The pipeline module (Task 3) is responsible for combining the individual source files from `sources/` into one markdown file before compilation.
- `eval(content, mode: "markup")` interprets the content as Typst markup. Since Typst's markup syntax differs from Markdown, the pipeline should produce a combined file that is valid Typst markup or the template should handle raw text with appropriate formatting.
- **Pragmatic approach:** Since agent-authored content is markdown and Typst markup differs from markdown, the safest strategy is to convert the combined markdown to Typst-compatible markup during the pipeline step. Basic conversions: `# Heading` stays (Typst uses `= Heading`), `**bold**` becomes `*bold*`, `_italic_` becomes `_italic_` (same), lists and paragraphs are similar. Create a lightweight `markdownToTypst()` converter in the pipeline module.
- Alternatively, use Typst's `raw()` block to include content verbatim, but this loses formatting. The converter approach is better.

**Markdown-to-Typst Conversion:**

A lightweight converter function handles the most common markdown patterns that differ from Typst markup:

```typescript
export function markdownToTypst(md: string): string {
  let typ = md;

  // Headers: # Foo -> = Foo, ## Foo -> == Foo, etc.
  typ = typ.replace(/^(#{1,6})\s+(.+)$/gm, (_, hashes, text) => {
    const level = '='.repeat(hashes.length);
    return `${level} ${text}`;
  });

  // Bold: **text** -> *text*
  typ = typ.replace(/\*\*(.+?)\*\*/g, '*$1*');

  // Inline code: `code` -> `code` (same in Typst, but raw block syntax differs)
  // Links: [text](url) -> #link("url")[text]
  typ = typ.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '#link("$2")[$1]');

  // Unordered lists: - item -> - item (compatible)
  // Ordered lists: 1. item -> + item (Typst uses + for numbered)
  typ = typ.replace(/^\d+\.\s+/gm, '+ ');

  // Horizontal rules: --- -> #line(length: 100%)
  typ = typ.replace(/^---+$/gm, '#line(length: 100%, stroke: 0.5pt)');

  return typ;
}
```

**Export Contract (for cross-story use):**

```typescript
// typst-compiler.ts exports:
export interface CompilationResult {
  success: boolean;
  format: 'pdf' | 'html';
  outputPath?: string;
  error?: string;
  durationMs: number;
}
export async function compileTypst(templatePath: string, outputPath: string, format: 'pdf' | 'html', inputs: Record<string, string>, timeoutMs?: number): Promise<CompilationResult>

// pipeline.ts exports:
export interface PipelineResult {
  status: 'compiled' | 'partial' | 'source-only' | 'no-sources';
  pdf?: string;
  html?: string;
  errors: string[];
}
export async function runNewspaperPipeline(editionDate: string, heraldConfig: HeraldConfig): Promise<PipelineResult>
```

> **Cross-Story Contract:** Story 4.4 (Breaking Updates) imports `runNewspaperPipeline()` from this module to recompile editions after breaking updates. Do not change the function signature without updating Story 4.4.

The exports are standalone functions -- do NOT export a `TypstCompiler` class or interface. Story 4.4 will import `runNewspaperPipeline` from `../newspaper/pipeline.ts`.

**Additional Pipeline Types (internal use):**

```typescript
export interface EditionStatus {
  editionDate: string;
  hasSources: boolean;
  hasPdf: boolean;
  hasHtml: boolean;
  hasMarkdown: boolean;
  pdfPath?: string;
  htmlPath?: string;
  markdownPath?: string;
}
```

**API File Serving Pattern:**

The compilation routes added to the existing `packages/daemon/src/api/newspaper.ts` serve static files (PDF, HTML, markdown). Use Bun.file() to read and serve, following the pattern from the existing codebase (e.g., how report files are read in `runs.ts`).

```typescript
// Example: serving a PDF file
routes.get('/api/newspaper/current/pdf', async (c) => {
  const today = new Date().toISOString().slice(0, 10);
  const pdfPath = join(heraldConfig.newspaper_dir, 'editions', today, 'newspaper.pdf');
  const file = Bun.file(pdfPath);

  if (!(await file.exists())) {
    return c.json({ error: 'PDF not available — try /markdown for raw content' }, 404);
  }

  return new Response(file, {
    headers: { 'Content-Type': 'application/pdf' },
  });
});
```

### Architecture Compliance

**File structure (new files created by this story):**

```
packages/daemon/src/
├── newspaper/
│   ├── pipeline.ts               # Pipeline orchestration — runNewspaperPipeline(), getEditionStatus()
│   ├── pipeline.test.ts          # Pipeline tests
│   ├── typst-compiler.ts         # Subprocess Typst invocation — compileTypst()
│   ├── typst-compiler.test.ts    # Compiler tests
│   └── markdown-to-typst.ts      # Lightweight MD->Typst markup converter

newspaper/
├── templates/
│   └── newspaper.typ             # Typst template (design + layout)
├── editions/
│   └── {date}/
│       ├── sources/              # Input: agent-authored markdown (from Story 4.1)
│       ├── combined.typ          # Intermediate: combined + converted Typst markup
│       ├── newspaper.pdf         # Output: compiled PDF
│       └── newspaper.html        # Output: compiled HTML
```

**Files modified (created by Story 4.1, extended by this story):**

```
packages/daemon/src/newspaper/index.ts  # EXTEND: add re-exports from typst-compiler.ts and pipeline.ts (Story 4.1 creates this with re-exports from team-orchestrator.ts and newspaper-executor.ts)
packages/daemon/src/api/newspaper.ts    # EXTEND: add compilation routes (POST /compile, GET /current/pdf, GET /current/html) to existing createNewspaperRoutes()
packages/daemon/src/api/index.ts        # May need update if heraldConfig is not already wired into newspaper route deps
```

**Error Handling Pattern (matches existing codebase):**

The existing codebase follows a consistent error pattern:
- `run-executor.ts`: try/catch at the top level, errors caught and returned as result objects, never thrown
- `api/runs.ts`: Hono route handlers return appropriate HTTP status codes with `{ error: string }` bodies
- `api/index.ts`: Global `onError` handler catches unhandled errors and returns 500
- `scheduler/patrol-cycle.ts`: `Promise.allSettled()` ensures one failure does not abort others

The Typst compiler follows the same pattern:
- `compileTypst()` never throws -- all errors are caught and returned in `CompilationResult`
- `runNewspaperPipeline()` never throws -- returns `PipelineResult` with appropriate status
- API routes return 404 for missing files with helpful error messages pointing to fallback endpoints

**Logging Pattern (matches existing codebase):**

- `console.log('[herald] Typst compiled PDF in 1234ms')` -- operational success
- `console.error('[herald] Typst compilation failed (pdf): <stderr>')` -- failure requiring attention
- `console.log('[herald] Newspaper pipeline: source-only (compilation failed, markdown available)')` -- degraded state

**Subprocess Isolation (NFR18):**

Typst runs in a child process via `Bun.spawn()`. The daemon's event loop is never blocked. If Typst crashes, hangs, or is not installed:
- The subprocess either exits with a non-zero code (caught) or times out (killed)
- `compileTypst()` returns a failed `CompilationResult`
- The pipeline reports `source-only` status
- Raw markdown remains available via API
- The daemon continues running normally

**Performance Budget (NFR9):**

Total compilation time must be <15 seconds. This includes both PDF and HTML compilations. The timeout is enforced per-compilation (not total), so each format gets up to 15 seconds. In practice, Typst compilation is extremely fast (typically <2 seconds for documents of this size).

### Project Structure Notes

**Naming conventions:**
- File names: `kebab-case` -- `typst-compiler.ts`, `markdown-to-typst.ts`
- Functions: `camelCase` -- `compileTypst()`, `runNewspaperPipeline()`, `markdownToTypst()`
- Types/interfaces: `PascalCase` -- `CompilationResult`, `PipelineResult`, `EditionStatus`
- API endpoints: kebab-case plural nouns -- `/api/newspaper/editions`, `/api/newspaper/current`
- Edition dates: ISO date format `YYYY-MM-DD` -- `2026-02-28`

**Module organization:**
- `newspaper/` directory in daemon src is the feature module (same pattern as `scheduler/`, `session/`, `api/`)
- `index.ts` is the barrel file (created by Story 4.1, extended by this story to re-export from `typst-compiler.ts` and `pipeline.ts`)
- `pipeline.ts` contains pipeline orchestration (`runNewspaperPipeline`, `getEditionStatus`)
- `typst-compiler.ts` contains subprocess Typst invocation (`compileTypst`)
- Co-located tests in same directory
- The `newspaper/` directory at project root is the data directory (templates + output), distinct from the daemon code module

**Dependency on Story 4.1:**
- Story 4.1 produces structured markdown in `newspaper/editions/{date}/sources/`
- Story 4.1 creates `packages/daemon/src/api/newspaper.ts` with `POST /api/newspaper/run`, `GET /api/newspaper/current`, and `GET /api/newspaper/editions` routes
- Story 4.1 creates `packages/daemon/src/newspaper/index.ts` with re-exports from `team-orchestrator.ts` and `newspaper-executor.ts`
- This story consumes the source files as input and extends the API and barrel files
- If no source files exist, the pipeline returns `no-sources` status and does nothing

**Source File Ordering:**
- The `sources/` directory contains per-agent markdown files: `ml-researcher.md`, `compute-researcher.md`, `ai-tooling-researcher.md` (research report copies), and `editorial.md` (newspaper agent's synthesis)
- The pipeline combines ALL `.md` files from `sources/` in a defined order: `editorial.md` first (the newspaper agent's synthesis), then remaining files alphabetically by filename (agent name)
- If `editorial.md` is missing, the remaining files are still combined alphabetically

### Testing Strategy

**typst-compiler.test.ts:**
- Mock `Bun.spawn()` to simulate Typst execution
- Test successful compilation returns correct `CompilationResult`
- Test failed compilation (non-zero exit code) returns failed result with stderr
- Test timeout handling -- verify process is killed after timeout
- Test missing Typst binary -- spawn throws ENOENT, caught and returned as error
- No actual Typst invocation in unit tests -- integration test would require Typst installed

**pipeline.test.ts:**
- Use temp directories for all file I/O
- Create mock source files in `sources/` directory (including `editorial.md` and agent-named files)
- Mock `compileTypst()` to avoid subprocess dependency
- Test full pipeline: sources exist -> combined file created (editorial first, then alphabetical) -> compilation called for PDF and HTML
- Test no sources: pipeline returns `no-sources`
- Test compilation failure: pipeline returns `source-only` with markdown path
- Test source ordering: verify `editorial.md` content appears before other agent files
- Test `getEditionStatus()` with various file combinations

**newspaper.test.ts (API routes -- tests for compilation routes added by this story):**
- Use Hono test client (same pattern as existing `api/*.test.ts`)
- Create temp directories with mock PDF/HTML/MD files
- Test `POST /api/newspaper/compile` triggers pipeline and returns result
- Test `GET /api/newspaper/current/pdf` returns correct Content-Type (application/pdf) and status code
- Test `GET /api/newspaper/current/html` returns correct Content-Type (text/html) and status code
- Test `GET /api/newspaper/current/markdown` returns correct Content-Type (text/markdown) and status code
- Test 404 when requested format file does not exist
- Do NOT test `GET /api/newspaper/current` or `GET /api/newspaper/editions` -- those are Story 4.1's routes and tests

**markdown-to-typst.ts:**
- Pure function tests -- input markdown string, verify output Typst markup
- Test heading conversion (`# -> =`, `## -> ==`, etc.)
- Test bold conversion (`**text** -> *text*`)
- Test link conversion (`[text](url) -> #link("url")[text]`)
- Test ordered list conversion (`1. -> +`)
- Test horizontal rule conversion (`--- -> #line(...)`)
- Test pass-through of content that is already compatible

### References

- [Source: architecture.md -- Project Structure] `daemon/src/newspaper/` for Typst pipeline code, `newspaper/` for templates and output
- [Source: architecture.md -- External Integration Points] Typst compiler as subprocess CLI at `daemon/src/newspaper/typst-compiler.ts`, Stage 1
- [Source: architecture.md -- Naming Patterns] kebab-case files, camelCase functions, PascalCase types, kebab-case API endpoints
- [Source: architecture.md -- Error Handling] try/catch at agent session boundary, never let errors propagate to daemon crash
- [Source: architecture.md -- Logging Levels] console.log for operational events, console.error for failures
- [Source: architecture.md -- API Responses] Direct JSON data (no wrapper), `{ error: string }` for errors
- [Source: architecture.md -- Infrastructure] Typst installed via pacman, subprocess execution
- [Source: prd.md -- FR20] Compile newspaper markdown through Typst into PDF/HTML output
- [Source: prd.md -- FR23] Operator can view the current newspaper edition
- [Source: prd.md -- NFR9] Newspaper Typst compilation <15 seconds
- [Source: prd.md -- NFR18] Typst compilation must be invoked as a subprocess -- compilation failures must not crash the daemon
- [Source: prd.md -- NFR3] Zero data loss -- raw markdown always preserved as fallback
- [Source: epics.md -- Story 4.1] Newspaper agent writes synthesis markdown to `newspaper/editions/{date}/sources/`
- [Source: epics.md -- Story 4.2] Full acceptance criteria for Typst compilation pipeline
- [Source: epics.md -- Story 4.3] Git versioning consumes compiled output from this story
- [Source: Typst docs] `typst compile source.typ output.pdf`, `--format html`, `--input key=value`, `read()` for loading external files
- [Source: Typst docs] Template pattern using `sys.inputs` for dynamic data, `eval(content, mode: "markup")` for rendering dynamic content

## Change Log

- 2026-02-28: Story 4.2 created -- Typst compilation pipeline with subprocess execution, markdown-to-Typst conversion, newspaper API endpoints, and PDF/HTML output serving
- 2026-02-28: Unified contract spec applied -- (1) API routes: modify existing newspaper.ts from Story 4.1 instead of creating new file; only add compilation sub-routes, not redefine Story 4.1 routes; (2) Module location: pipeline orchestration in pipeline.ts not index.ts; (3) Export contract: standalone functions (compileTypst, runNewspaperPipeline) with cross-story contract for Story 4.4; no TypstCompiler interface; (4) Source file ordering: editorial.md first, then alphabetical; (5) newspaper/index.ts: extend Story 4.1's barrel file, not create new; (6) CompilationResult/PipelineResult interfaces aligned to cross-story contract
