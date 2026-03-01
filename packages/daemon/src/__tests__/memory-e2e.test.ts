/**
 * End-to-end integration test for the memory pipeline:
 *
 * 1. Agent runs and produces a report → knowledge.md is synced to DB
 * 2. Post-run hook indexes the report into FTS5 and extracts entities
 * 3. A second agent's report is also indexed
 * 4. The librarian can query across agents and return relevant results
 * 5. persona-loader injects cross-agent intelligence into the system prompt
 *
 * This tests the full data flow without mocking any memory/librarian internals.
 * Only the SDK adapter and Ollama embedder are mocked (no real LLM or GPU needed).
 */

import { Database } from 'bun:sqlite';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AgentConfig, HeraldConfig } from '@herald/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HeraldDatabase } from '../db/database.ts';
import type { OllamaEmbedder } from '../embedding/ollama-client.ts';
import { MemoryLibrarian } from '../librarian/ask-librarian.ts';
import { FtsIndex } from '../librarian/fts-index.ts';
import { processRunOutput } from '../librarian/post-run-hook.ts';
import { KnowledgeManager } from '../memory/knowledge-manager.ts';
import { loadPersonaContext } from '../session/persona-loader.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal HeraldDatabase stub backed by a real in-memory SQLite instance. */
function createTestDb(): HeraldDatabase {
  const db = new Database(':memory:');
  db.run('PRAGMA foreign_keys = ON');

  // Apply the four migration schemas inline
  db.run(`
    CREATE TABLE IF NOT EXISTS knowledge_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_name TEXT NOT NULL,
      section TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      importance REAL NOT NULL DEFAULT 1.0,
      last_reinforced_at TEXT NOT NULL DEFAULT (datetime('now')),
      archived_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(agent_name, section, title)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS embedding_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_name TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL DEFAULT 0,
      content_preview TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(agent_name, source_type, source_id, chunk_index)
    )
  `);
  db.run(`
    CREATE VIRTUAL TABLE IF NOT EXISTS fts_content USING fts5(
      agent_name, source_type, source_id, title, content,
      tokenize = 'porter'
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS entities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      first_seen_by TEXT NOT NULL,
      mention_count INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(name, entity_type)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS entity_mentions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_id INTEGER NOT NULL REFERENCES entities(id),
      agent_name TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      context TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  return {
    db,
    hasVec: false,
    createVecTable: () => false,
    vecTableName: (n: string) => `vec_embeddings_${n.replace(/-/g, '_')}`,
    close: () => db.close(),
    applyMigrations: async () => 0,
  } as unknown as HeraldDatabase;
}

function createMockEmbedder(): OllamaEmbedder {
  return {
    isAvailable: vi.fn().mockResolvedValue(false),
    embed: vi.fn().mockResolvedValue(null),
    resetAvailability: vi.fn(),
  } as unknown as OllamaEmbedder;
}

// ---------------------------------------------------------------------------
// Test data — realistic agent outputs
// ---------------------------------------------------------------------------

const ML_RESEARCHER_REPORT = `---
agent: ml-researcher
run_id: "20260301-050000"
started_at: "2026-03-01T05:00:00.000Z"
finished_at: "2026-03-01T05:12:00.000Z"
status: success
discovery_mode: aggressive
---

# ML Research Patrol — 2026-03-01

## Headlines
- NVIDIA Blackwell GPUs achieve 5x inference cost reduction with NVFP4 quantization
- Mercury 2 diffusion model reaches 1,009 tokens/sec on Blackwell hardware
- DeepSeek releases MoE architecture with 671B total / 37B active parameters

## Featured Deep-Dive: Diffusion Language Models
Diffusion-based language models have emerged as serious contenders to autoregressive architectures.
Mercury 2 from Inception Labs demonstrates 91.1 on AIME 2025 and 73.6 on GPQA Diamond,
while achieving throughput of over 1,000 tokens per second on NVIDIA Blackwell.
The key advantage is eliminating the KV-cache memory bottleneck entirely.

Google DeepMind's Gemini Diffusion achieves 1,479 tokens/sec average but shows a 16-point gap
on GPQA Diamond compared to Flash-Lite. The reasoning gap remains real for diffusion models,
though Mercury 2's results suggest it is narrowing fast.

## Key Findings
- MoE architectures remain dominant: Qwen 3.5 (397B-A17B) is 19x faster than dense equivalent
- PyTorch 2.7 introduces torch.compile improvements for MoE inference
- Anthropic published alignment faking research showing 12% deceptive behavior rate
`;

const AI_TOOLING_REPORT = `---
agent: ai-tooling-researcher
run_id: "20260301-060000"
started_at: "2026-03-01T06:00:00.000Z"
finished_at: "2026-03-01T06:10:00.000Z"
status: success
discovery_mode: moderate
---

# AI Tooling Patrol — 2026-03-01

## Headlines
- MCP ecosystem reaches 500+ public servers with 340% YoY growth
- NVIDIA TensorRT-LLM achieves 2.8x throughput gains for inference optimization
- Anthropic Claude Code now supports MCP server integration natively

## Featured Deep-Dive: MCP Standardization
The Model Context Protocol has achieved de facto standard status. OpenAI is sunsetting
the Assistants API in mid-2026, forcing ecosystem migration to MCP. LangChain and other
frameworks are integrating MCP support.

Key challenge: Multi-server orchestration remains the differentiator. Basic schema compliance
is solved (>95%) but real-world agentic workflows need coordinating across multiple MCP servers.

## Key Findings
- NVIDIA Blackwell inference costs dropped to $0.05 per million tokens
- vLLM added native MoE support with expert-level parallelism
- PyTorch ecosystem expanding with inference-optimized compilation
`;

const ML_RESEARCHER_KNOWLEDGE = `# ml-researcher — Knowledge Base

## Domain Knowledge

### Diffusion Language Models
Mercury 2 achieves 1,009 tokens/sec on Blackwell with 91.1 AIME 2025 score.

### MoE Architecture Dominance
All frontier labs now use Mixture of Experts. Qwen 3.5 is 19x faster than dense.

### Inference Economics Shift
NVIDIA Blackwell with NVFP4 quantization: 4x cost reduction to $0.05/M tokens.

## Developing Opinions

### Diffusion LLMs will achieve reasoning parity within 18 months
- **Confidence:** 60
- **Evidence:** Mercury 2 closes the gap significantly
`;

const AI_TOOLING_KNOWLEDGE = `# ai-tooling-researcher — Knowledge Base

## Domain Knowledge

### MCP Standardization
MCP has 500+ public servers. OpenAI sunsetting Assistants API forces migration.

### Inference Tooling
NVIDIA TensorRT-LLM and vLLM are the leading inference optimization frameworks.

## Developing Opinions

### MCP will dominate agent framework integration by 2027
- **Confidence:** 80
- **Evidence:** 340% growth, OpenAI migration
`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('memory pipeline end-to-end', () => {
  let tempDir: string;
  let heraldConfig: HeraldConfig;
  let hdb: HeraldDatabase;
  let embedder: OllamaEmbedder;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `herald-memory-e2e-${Date.now()}`);
    const reportsDir = join(tempDir, 'reports');
    const memoryDir = join(tempDir, 'memory');
    const personasDir = join(tempDir, 'personas');

    // Create directory structure
    await mkdir(join(reportsDir, 'ml-researcher'), { recursive: true });
    await mkdir(join(reportsDir, 'ai-tooling-researcher'), { recursive: true });
    await mkdir(join(memoryDir, 'agents', 'ml-researcher'), { recursive: true });
    await mkdir(join(memoryDir, 'agents', 'ai-tooling-researcher'), { recursive: true });
    await mkdir(personasDir, { recursive: true });

    // Write persona files
    await writeFile(join(personasDir, 'ml-researcher.md'), '# ML Research Agent');
    await writeFile(join(personasDir, 'ai-tooling-researcher.md'), '# AI Tooling Agent');

    // Write knowledge files
    await writeFile(
      join(memoryDir, 'agents', 'ml-researcher', 'knowledge.md'),
      ML_RESEARCHER_KNOWLEDGE,
    );
    await writeFile(
      join(memoryDir, 'agents', 'ai-tooling-researcher', 'knowledge.md'),
      AI_TOOLING_KNOWLEDGE,
    );

    // Write report files
    await writeFile(
      join(reportsDir, 'ml-researcher', '20260301-050000.md'),
      ML_RESEARCHER_REPORT,
    );
    await writeFile(
      join(reportsDir, 'ai-tooling-researcher', '20260301-060000.md'),
      AI_TOOLING_REPORT,
    );

    heraldConfig = {
      port: 3117,
      data_dir: join(tempDir, 'data'),
      agents_dir: join(tempDir, 'agents'),
      personas_dir: personasDir,
      memory_dir: memoryDir,
      reports_dir: reportsDir,
      newspaper_dir: join(tempDir, 'newspaper'),
      log_level: 'info',
      ollama_url: 'http://localhost:11434',
    };

    hdb = createTestDb();
    embedder = createMockEmbedder();

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    hdb.close();
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  // -------------------------------------------------------------------------
  // Step 1: knowledge.md → knowledge_items table
  // -------------------------------------------------------------------------

  it('syncs knowledge.md into the database', async () => {
    const km = new KnowledgeManager(hdb);

    const knowledgePath = join(
      heraldConfig.memory_dir,
      'agents',
      'ml-researcher',
      'knowledge.md',
    );
    const count = await km.syncKnowledge('ml-researcher', knowledgePath);

    // ML researcher knowledge has 4 items (3 Domain Knowledge + 1 Developing Opinion)
    expect(count).toBe(4);

    // Verify items are in the DB
    const rows = hdb.db
      .query<{ title: string; section: string; importance: number }, []>(
        "SELECT title, section, importance FROM knowledge_items WHERE agent_name = 'ml-researcher' ORDER BY title",
      )
      .all();

    expect(rows.length).toBe(4);
    expect(rows.map((r) => r.title)).toContain('Diffusion Language Models');
    expect(rows.map((r) => r.title)).toContain('MoE Architecture Dominance');
    expect(rows.map((r) => r.title)).toContain('Inference Economics Shift');
    expect(rows.every((r) => r.importance === 1.0)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Step 2: Post-run hook indexes report into FTS5 + extracts entities
  // -------------------------------------------------------------------------

  it('indexes agent report into FTS5 via post-run hook', async () => {
    const reportPath = join(
      heraldConfig.reports_dir,
      'ml-researcher',
      '20260301-050000.md',
    );

    await processRunOutput({
      agentName: 'ml-researcher',
      runId: '20260301-050000',
      reportPath,
      db: hdb,
      embedder,
    });

    // Check FTS5 content was indexed
    const fts = new FtsIndex(hdb);
    const results = fts.search('diffusion models');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].agent_name).toBe('ml-researcher');
    expect(results[0].source_type).toBe('run-report');
  });

  it('extracts entities from agent reports', async () => {
    const reportPath = join(
      heraldConfig.reports_dir,
      'ml-researcher',
      '20260301-050000.md',
    );

    await processRunOutput({
      agentName: 'ml-researcher',
      runId: '20260301-050000',
      reportPath,
      db: hdb,
      embedder,
    });

    // Check entities were extracted
    const entities = hdb.db
      .query<{ name: string; entity_type: string }, []>(
        'SELECT name, entity_type FROM entities ORDER BY name',
      )
      .all();

    const entityNames = entities.map((e) => e.name);
    expect(entityNames).toContain('NVIDIA');
    expect(entityNames).toContain('Anthropic');

    // Check entity mentions reference the agent
    const mentions = hdb.db
      .query<{ agent_name: string }, []>(
        "SELECT DISTINCT agent_name FROM entity_mentions WHERE agent_name = 'ml-researcher'",
      )
      .all();
    expect(mentions.length).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Step 3: Two agents indexed → cross-agent data exists
  // -------------------------------------------------------------------------

  it('indexes both agents and produces cross-searchable data', async () => {
    // Index ml-researcher
    await processRunOutput({
      agentName: 'ml-researcher',
      runId: '20260301-050000',
      reportPath: join(heraldConfig.reports_dir, 'ml-researcher', '20260301-050000.md'),
      db: hdb,
      embedder,
    });

    // Index ai-tooling-researcher
    await processRunOutput({
      agentName: 'ai-tooling-researcher',
      runId: '20260301-060000',
      reportPath: join(
        heraldConfig.reports_dir,
        'ai-tooling-researcher',
        '20260301-060000.md',
      ),
      db: hdb,
      embedder,
    });

    // FTS5 should have content from both agents
    const fts = new FtsIndex(hdb);

    const nvidiaResults = fts.search('NVIDIA');
    const agents = [...new Set(nvidiaResults.map((r) => r.agent_name))];
    expect(agents).toContain('ml-researcher');
    expect(agents).toContain('ai-tooling-researcher');

    // Both mention NVIDIA → entity mentions from two agents
    const mentions = hdb.db
      .query<{ agent_name: string }, []>(
        `SELECT DISTINCT em.agent_name
         FROM entity_mentions em
         JOIN entities e ON em.entity_id = e.id
         WHERE e.name = 'NVIDIA'`,
      )
      .all();
    expect(mentions.map((m) => m.agent_name).sort()).toEqual([
      'ai-tooling-researcher',
      'ml-researcher',
    ]);
  });

  // -------------------------------------------------------------------------
  // Step 4: Librarian can query across agents and return relevant results
  // -------------------------------------------------------------------------

  it('librarian returns cross-agent results via FTS5', async () => {
    // Index both agents' reports
    await processRunOutput({
      agentName: 'ml-researcher',
      runId: '20260301-050000',
      reportPath: join(heraldConfig.reports_dir, 'ml-researcher', '20260301-050000.md'),
      db: hdb,
      embedder,
    });
    await processRunOutput({
      agentName: 'ai-tooling-researcher',
      runId: '20260301-060000',
      reportPath: join(
        heraldConfig.reports_dir,
        'ai-tooling-researcher',
        '20260301-060000.md',
      ),
      db: hdb,
      embedder,
    });

    const librarian = new MemoryLibrarian(hdb, embedder);

    // General query — should find results from both agents
    const result = await librarian.query('NVIDIA Blackwell inference');
    expect(result.ftsResults.length).toBeGreaterThan(0);
    expect(result.markdown).toContain('NVIDIA');
    expect(result.markdown).not.toContain('No relevant results');

    // Agent-filtered query
    const mlOnly = await librarian.query('diffusion models', { agent: 'ml-researcher' });
    expect(mlOnly.ftsResults.length).toBeGreaterThan(0);
    expect(mlOnly.ftsResults.every((r) => r.agent_name === 'ml-researcher')).toBe(true);
  });

  it('librarian.queryForAgent excludes self and returns other agents findings', async () => {
    // Index both agents
    await processRunOutput({
      agentName: 'ml-researcher',
      runId: '20260301-050000',
      reportPath: join(heraldConfig.reports_dir, 'ml-researcher', '20260301-050000.md'),
      db: hdb,
      embedder,
    });
    await processRunOutput({
      agentName: 'ai-tooling-researcher',
      runId: '20260301-060000',
      reportPath: join(
        heraldConfig.reports_dir,
        'ai-tooling-researcher',
        '20260301-060000.md',
      ),
      db: hdb,
      embedder,
    });

    const librarian = new MemoryLibrarian(hdb, embedder);

    // ml-researcher asks about topics that ai-tooling also covered
    const crossAgentIntel = await librarian.queryForAgent('ml-researcher', [
      'MCP',
      'NVIDIA inference',
    ]);

    // Should contain findings from ai-tooling-researcher, NOT ml-researcher
    expect(crossAgentIntel).toContain('Cross-Agent Intelligence');
    expect(crossAgentIntel).toContain('ai-tooling-researcher');
    expect(crossAgentIntel).not.toContain('### From ml-researcher');
  });

  // -------------------------------------------------------------------------
  // Step 5: Full pipeline — persona-loader injects cross-agent intelligence
  // -------------------------------------------------------------------------

  it('persona-loader injects cross-agent intelligence into system prompt', async () => {
    // Index both agents' reports into FTS5
    await processRunOutput({
      agentName: 'ml-researcher',
      runId: '20260301-050000',
      reportPath: join(heraldConfig.reports_dir, 'ml-researcher', '20260301-050000.md'),
      db: hdb,
      embedder,
    });
    await processRunOutput({
      agentName: 'ai-tooling-researcher',
      runId: '20260301-060000',
      reportPath: join(
        heraldConfig.reports_dir,
        'ai-tooling-researcher',
        '20260301-060000.md',
      ),
      db: hdb,
      embedder,
    });

    const librarian = new MemoryLibrarian(hdb, embedder);

    // Build persona context for ml-researcher — should include cross-agent intel
    // ml-researcher's knowledge.md has Domain Knowledge topics:
    //   "Diffusion Language Models", "MoE Architecture Dominance", "Inference Economics Shift"
    // ai-tooling-researcher's report mentions MoE and inference — should show up
    const mlConfig: AgentConfig = {
      name: 'ml-researcher',
      persona: 'ml-researcher.md',
      output_dir: 'reports/ml-researcher',
      session_limit: 10,
      notify_policy: 'failures',
      team_eligible: false,
      discovery_mode: 'aggressive',
    };

    const ctx = await loadPersonaContext(mlConfig, heraldConfig, librarian);

    // System prompt should contain the persona + knowledge + cross-agent section
    expect(ctx.systemPrompt).toContain('# ML Research Agent');
    expect(ctx.systemPrompt).toContain('## Your Knowledge Base');
    expect(ctx.systemPrompt).toContain('Diffusion Language Models');

    // Cross-agent intelligence from ai-tooling's report
    // The extractTopics function pulls ### headers from Domain Knowledge:
    // "Diffusion Language Models", "MoE Architecture Dominance", "Inference Economics Shift"
    // ai-tooling's report mentions MoE and inference, so it should be found
    expect(ctx.systemPrompt).toContain('## Cross-Agent Intelligence');
    expect(ctx.systemPrompt).toContain('ai-tooling-researcher');
  });

  it('persona-loader works without librarian (graceful degradation)', async () => {
    const mlConfig: AgentConfig = {
      name: 'ml-researcher',
      persona: 'ml-researcher.md',
      output_dir: 'reports/ml-researcher',
      session_limit: 10,
      notify_policy: 'failures',
      team_eligible: false,
    };

    const ctx = await loadPersonaContext(mlConfig, heraldConfig);

    // Still works — just no cross-agent section
    expect(ctx.systemPrompt).toContain('# ML Research Agent');
    expect(ctx.systemPrompt).toContain('## Your Knowledge Base');
    expect(ctx.systemPrompt).not.toContain('Cross-Agent Intelligence');
  });

  // -------------------------------------------------------------------------
  // Full round-trip: knowledge sync + index + query + prompt injection
  // -------------------------------------------------------------------------

  it('full round-trip: sync knowledge, index reports, query librarian, inject into prompt', async () => {
    const km = new KnowledgeManager(hdb);

    // 1. Sync both agents' knowledge.md → DB
    const mlKnowledgePath = join(
      heraldConfig.memory_dir,
      'agents',
      'ml-researcher',
      'knowledge.md',
    );
    const aiKnowledgePath = join(
      heraldConfig.memory_dir,
      'agents',
      'ai-tooling-researcher',
      'knowledge.md',
    );

    const mlSynced = await km.syncKnowledge('ml-researcher', mlKnowledgePath);
    const aiSynced = await km.syncKnowledge('ai-tooling-researcher', aiKnowledgePath);
    expect(mlSynced).toBeGreaterThan(0);
    expect(aiSynced).toBeGreaterThan(0);

    // Verify knowledge_items in DB
    const totalItems = hdb.db
      .query<{ count: number }, []>('SELECT COUNT(*) as count FROM knowledge_items')
      .get();
    expect(totalItems!.count).toBe(mlSynced + aiSynced);

    // 2. Index both agents' reports → FTS5 + entities
    await processRunOutput({
      agentName: 'ml-researcher',
      runId: '20260301-050000',
      reportPath: join(heraldConfig.reports_dir, 'ml-researcher', '20260301-050000.md'),
      db: hdb,
      embedder,
    });
    await processRunOutput({
      agentName: 'ai-tooling-researcher',
      runId: '20260301-060000',
      reportPath: join(
        heraldConfig.reports_dir,
        'ai-tooling-researcher',
        '20260301-060000.md',
      ),
      db: hdb,
      embedder,
    });

    // Verify FTS5 has content from both
    const fts = new FtsIndex(hdb);
    const allResults = fts.search('inference');
    expect(allResults.length).toBeGreaterThan(0);

    // 3. Create librarian and query
    const librarian = new MemoryLibrarian(hdb, embedder);

    const libResult = await librarian.query('MoE architecture');
    expect(libResult.ftsResults.length).toBeGreaterThan(0);

    // 4. Build persona for ai-tooling → should get ml-researcher's MoE findings
    const aiConfig: AgentConfig = {
      name: 'ai-tooling-researcher',
      persona: 'ai-tooling-researcher.md',
      output_dir: 'reports/ai-tooling-researcher',
      session_limit: 10,
      notify_policy: 'failures',
      team_eligible: false,
    };

    const ctx = await loadPersonaContext(aiConfig, heraldConfig, librarian);

    // ai-tooling's knowledge has Domain Knowledge topics:
    //   "MCP Standardization", "Inference Tooling"
    // ml-researcher's report covers inference → should show up as cross-agent intel
    expect(ctx.systemPrompt).toContain('# AI Tooling Agent');
    expect(ctx.systemPrompt).toContain('## Your Knowledge Base');
    expect(ctx.systemPrompt).toContain('## Cross-Agent Intelligence');
    expect(ctx.systemPrompt).toContain('ml-researcher');
  });
});
