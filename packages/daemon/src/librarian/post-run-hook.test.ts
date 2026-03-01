import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HeraldDatabase } from '../db/database.ts';
import type { OllamaEmbedder } from '../embedding/ollama-client.ts';
import { processRunOutput, stripFrontmatter, chunkText } from './post-run-hook.ts';

describe('post-run-hook', () => {
  let tempDir: string;
  let db: HeraldDatabase;
  let mockEmbedder: OllamaEmbedder;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `herald-hook-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tempDir, { recursive: true });
    const dbPath = join(tempDir, 'test.sqlite');

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    db = new HeraldDatabase(dbPath);

    // Create required tables (normally done by migrations)
    db.db.run(`
      CREATE VIRTUAL TABLE IF NOT EXISTS fts_content USING fts5(
        agent_name, source_type, source_id, title, content,
        tokenize = 'porter'
      )
    `);
    db.db.run(`
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
    db.db.run(`
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
    db.db.run(`
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

    // Mock embedder as unavailable
    mockEmbedder = {
      isAvailable: vi.fn().mockResolvedValue(false),
      embed: vi.fn().mockResolvedValue(null),
      resetAvailability: vi.fn(),
    } as unknown as OllamaEmbedder;
  });

  afterEach(async () => {
    db.close();
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('stripFrontmatter', () => {
    it('strips YAML frontmatter', () => {
      const input = `---
title: Test Report
date: 2024-01-01
---
# Report Content
This is the actual content.`;

      const result = stripFrontmatter(input);
      expect(result).toBe(`# Report Content
This is the actual content.`);
    });

    it('returns text unchanged if no frontmatter', () => {
      const input = '# Just a heading\nSome content.';
      expect(stripFrontmatter(input)).toBe(input);
    });

    it('handles empty frontmatter', () => {
      const input = `---
---
Content after empty frontmatter.`;
      const result = stripFrontmatter(input);
      expect(result).toBe('Content after empty frontmatter.');
    });

    it('does not strip --- that is not at the start', () => {
      const input = 'Some text\n---\nmore text\n---\neven more';
      expect(stripFrontmatter(input)).toBe(input);
    });
  });

  describe('chunkText', () => {
    it('returns single chunk for short text', () => {
      const text = 'This is a short text.';
      const chunks = chunkText(text);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].text).toBe(text);
      expect(chunks[0].index).toBe(0);
    });

    it('chunks long text with overlap', () => {
      const text = 'A'.repeat(5000);
      const chunks = chunkText(text);

      expect(chunks.length).toBeGreaterThan(1);

      // Verify chunks are indexed sequentially
      for (let i = 0; i < chunks.length; i++) {
        expect(chunks[i].index).toBe(i);
      }

      // Each chunk should be at most 2000 chars
      for (const chunk of chunks) {
        expect(chunk.text.length).toBeLessThanOrEqual(2000);
      }
    });

    it('creates overlapping chunks', () => {
      const text = 'A'.repeat(3000);
      const chunks = chunkText(text);

      // With 2000 char chunks and 400 overlap:
      // chunk 0: chars 0-1999 (2000 chars)
      // chunk 1: chars 1600-2999 (1400 chars)
      expect(chunks.length).toBe(2);
      expect(chunks[0].text.length).toBe(2000);
      expect(chunks[1].text.length).toBe(1400);
    });

    it('handles exactly chunk-sized text', () => {
      const text = 'A'.repeat(2000);
      const chunks = chunkText(text);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].text.length).toBe(2000);
    });
  });

  describe('processRunOutput', () => {
    it('indexes report content into FTS5', async () => {
      const reportPath = join(tempDir, 'report.md');
      await writeFile(
        reportPath,
        `---
title: Test Report
---
# AI Research Report
Anthropic released Claude with improved reasoning capabilities.
OpenAI announced GPT-4 improvements at NeurIPS 2024.
`,
      );

      await processRunOutput({
        agentName: 'ml-researcher',
        runId: 'run-001',
        reportPath,
        db,
        embedder: mockEmbedder,
      });

      // Verify FTS5 content was inserted
      const ftsRows = db.db
        .query<{ agent_name: string; title: string }, []>(
          'SELECT agent_name, title FROM fts_content',
        )
        .all();
      expect(ftsRows.length).toBeGreaterThan(0);
      expect(ftsRows[0].agent_name).toBe('ml-researcher');
    });

    it('extracts and stores entities', async () => {
      const reportPath = join(tempDir, 'report.md');
      await writeFile(
        reportPath,
        'Anthropic released Claude. OpenAI announced GPT-4 at NeurIPS.',
      );

      await processRunOutput({
        agentName: 'ml-researcher',
        runId: 'run-002',
        reportPath,
        db,
        embedder: mockEmbedder,
      });

      const entities = db.db
        .query<{ name: string; entity_type: string }, []>(
          'SELECT name, entity_type FROM entities',
        )
        .all();
      expect(entities.length).toBeGreaterThan(0);

      const entityNames = entities.map((e) => e.name);
      expect(entityNames).toContain('Anthropic');
      expect(entityNames).toContain('OpenAI');
    });

    it('creates entity mentions', async () => {
      const reportPath = join(tempDir, 'report.md');
      await writeFile(reportPath, 'Anthropic released Claude with RLHF training.');

      await processRunOutput({
        agentName: 'ml-researcher',
        runId: 'run-003',
        reportPath,
        db,
        embedder: mockEmbedder,
      });

      const mentions = db.db
        .query<{ agent_name: string; source_id: string }, []>(
          'SELECT agent_name, source_id FROM entity_mentions',
        )
        .all();
      expect(mentions.length).toBeGreaterThan(0);
      expect(mentions[0].agent_name).toBe('ml-researcher');
      expect(mentions[0].source_id).toBe('run-003');
    });

    it('works when embedder is unavailable', async () => {
      const reportPath = join(tempDir, 'report.md');
      await writeFile(reportPath, 'OpenAI released GPT-4 with improved performance.');

      // Embedder is already mocked as unavailable
      await processRunOutput({
        agentName: 'test-agent',
        runId: 'run-004',
        reportPath,
        db,
        embedder: mockEmbedder,
      });

      // FTS and entities should still work
      const ftsRows = db.db
        .query<{ agent_name: string }, []>('SELECT agent_name FROM fts_content')
        .all();
      expect(ftsRows.length).toBeGreaterThan(0);

      const entities = db.db
        .query<{ name: string }, []>('SELECT name FROM entities')
        .all();
      expect(entities.length).toBeGreaterThan(0);
    });

    it('never throws on errors — logs instead', async () => {
      // Non-existent report path
      await expect(
        processRunOutput({
          agentName: 'test-agent',
          runId: 'run-005',
          reportPath: '/nonexistent/path/report.md',
          db,
          embedder: mockEmbedder,
        }),
      ).resolves.toBeUndefined();

      expect(console.error).toHaveBeenCalled();
    });

    it('handles report with only frontmatter', async () => {
      const reportPath = join(tempDir, 'empty-report.md');
      await writeFile(
        reportPath,
        `---
title: Empty Report
---
`,
      );

      await expect(
        processRunOutput({
          agentName: 'test-agent',
          runId: 'run-006',
          reportPath,
          db,
          embedder: mockEmbedder,
        }),
      ).resolves.toBeUndefined();

      // Should log about empty content
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('empty after stripping'),
      );
    });

    it('strips frontmatter before indexing', async () => {
      const reportPath = join(tempDir, 'report.md');
      await writeFile(
        reportPath,
        `---
title: Test
agent: frontmatter-agent
---
The actual content mentions Anthropic.`,
      );

      await processRunOutput({
        agentName: 'ml-researcher',
        runId: 'run-007',
        reportPath,
        db,
        embedder: mockEmbedder,
      });

      // FTS content should not contain the frontmatter
      const ftsRows = db.db
        .query<{ content: string }, []>('SELECT content FROM fts_content')
        .all();
      expect(ftsRows.length).toBeGreaterThan(0);
      expect(ftsRows[0].content).not.toContain('frontmatter-agent');
      expect(ftsRows[0].content).toContain('Anthropic');
    });
  });
});
