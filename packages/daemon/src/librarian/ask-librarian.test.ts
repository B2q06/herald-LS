import { Database } from 'bun:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HeraldDatabase } from '../db/database.ts';
import type { OllamaEmbedder } from '../embedding/ollama-client.ts';
import { MemoryLibrarian } from './ask-librarian.ts';

function createMockEmbedder(available = false): OllamaEmbedder {
  return {
    isAvailable: vi.fn().mockResolvedValue(available),
    embed: vi.fn().mockResolvedValue(null),
    resetAvailability: vi.fn(),
  } as unknown as OllamaEmbedder;
}

describe('MemoryLibrarian', () => {
  let hdb: HeraldDatabase;
  let embedder: OllamaEmbedder;

  beforeEach(() => {
    // Use in-memory SQLite with FTS5 table
    hdb = { db: new Database(':memory:'), hasVec: false, createVecTable: () => false, vecTableName: (n: string) => `vec_embeddings_${n.replace(/-/g, '_')}`, close: () => {} } as unknown as HeraldDatabase;

    hdb.db.run(`
      CREATE VIRTUAL TABLE fts_content USING fts5(
        agent_name, source_type, source_id, title, content, tokenize = 'porter'
      )
    `);
    hdb.db.run(`
      CREATE TABLE embedding_sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_name TEXT, source_type TEXT, source_id TEXT,
        chunk_index INTEGER DEFAULT 0, content_preview TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(agent_name, source_type, source_id, chunk_index)
      )
    `);

    embedder = createMockEmbedder(false);

    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    hdb.db.close();
    vi.restoreAllMocks();
  });

  describe('query', () => {
    it('returns FTS results for a matching query', async () => {
      hdb.db.run(
        `INSERT INTO fts_content (agent_name, source_type, source_id, title, content)
         VALUES (?, ?, ?, ?, ?)`,
        ['ml-researcher', 'run-report', 'run-1:0', 'Run run-1', 'Diffusion models are getting faster and more efficient'],
      );

      const librarian = new MemoryLibrarian(hdb, embedder);
      const result = await librarian.query('diffusion models');

      expect(result.ftsResults).toHaveLength(1);
      expect(result.ftsResults[0].agent_name).toBe('ml-researcher');
      expect(result.markdown).toContain('diffusion models');
      expect(result.markdown).toContain('ml-researcher');
    });

    it('returns empty results for non-matching query', async () => {
      const librarian = new MemoryLibrarian(hdb, embedder);
      const result = await librarian.query('quantum computing');

      expect(result.ftsResults).toHaveLength(0);
      expect(result.vectorResults).toHaveLength(0);
      expect(result.markdown).toContain('No relevant results found');
    });

    it('filters by agent when specified', async () => {
      hdb.db.run(
        `INSERT INTO fts_content VALUES (?, ?, ?, ?, ?)`,
        ['ml-researcher', 'run-report', 'run-1:0', 'Run 1', 'MoE architecture dominance'],
      );
      hdb.db.run(
        `INSERT INTO fts_content VALUES (?, ?, ?, ?, ?)`,
        ['ai-tooling', 'run-report', 'run-2:0', 'Run 2', 'MoE in production systems'],
      );

      const librarian = new MemoryLibrarian(hdb, embedder);
      const result = await librarian.query('MoE', { agent: 'ml-researcher' });

      expect(result.ftsResults).toHaveLength(1);
      expect(result.ftsResults[0].agent_name).toBe('ml-researcher');
    });

    it('handles empty query', async () => {
      const librarian = new MemoryLibrarian(hdb, embedder);
      const result = await librarian.query('');

      expect(result.ftsResults).toHaveLength(0);
    });
  });

  describe('queryForAgent', () => {
    it('excludes the querying agent own results', async () => {
      hdb.db.run(
        `INSERT INTO fts_content VALUES (?, ?, ?, ?, ?)`,
        ['ml-researcher', 'run-report', 'run-1:0', 'Run 1', 'Transformers and attention mechanisms'],
      );
      hdb.db.run(
        `INSERT INTO fts_content VALUES (?, ?, ?, ?, ?)`,
        ['ai-tooling', 'run-report', 'run-2:0', 'Run 2', 'Transformers in production inference'],
      );

      const librarian = new MemoryLibrarian(hdb, embedder);
      const result = await librarian.queryForAgent('ml-researcher', ['transformers']);

      expect(result).toContain('ai-tooling');
      expect(result).not.toContain('ml-researcher');
    });

    it('returns empty string when no cross-agent results', async () => {
      hdb.db.run(
        `INSERT INTO fts_content VALUES (?, ?, ?, ?, ?)`,
        ['ml-researcher', 'run-report', 'run-1:0', 'Run 1', 'Diffusion models'],
      );

      const librarian = new MemoryLibrarian(hdb, embedder);
      const result = await librarian.queryForAgent('ml-researcher', ['diffusion']);

      expect(result).toBe('');
    });

    it('returns empty string for empty topics', async () => {
      const librarian = new MemoryLibrarian(hdb, embedder);
      const result = await librarian.queryForAgent('ml-researcher', []);

      expect(result).toBe('');
    });

    it('deduplicates results across topics', async () => {
      hdb.db.run(
        `INSERT INTO fts_content VALUES (?, ?, ?, ?, ?)`,
        ['ai-tooling', 'run-report', 'run-1:0', 'Run 1', 'MoE and transformers in production'],
      );

      const librarian = new MemoryLibrarian(hdb, embedder);
      const result = await librarian.queryForAgent('ml-researcher', ['MoE', 'transformers']);

      // Should only appear once despite matching both topics
      const matches = result.match(/ai-tooling/g);
      expect(matches).toHaveLength(1);
    });

    it('formats cross-agent section with agent grouping', async () => {
      hdb.db.run(
        `INSERT INTO fts_content VALUES (?, ?, ?, ?, ?)`,
        ['ai-tooling', 'run-report', 'run-1:0', 'Run 1', 'NVIDIA Blackwell GPU performance'],
      );
      hdb.db.run(
        `INSERT INTO fts_content VALUES (?, ?, ?, ?, ?)`,
        ['compute-researcher', 'run-report', 'run-2:0', 'Run 2', 'NVIDIA GPU compute benchmarks'],
      );

      const librarian = new MemoryLibrarian(hdb, embedder);
      const result = await librarian.queryForAgent('ml-researcher', ['NVIDIA']);

      expect(result).toContain('## Cross-Agent Intelligence');
      expect(result).toContain('### From ai-tooling');
      expect(result).toContain('### From compute-researcher');
    });
  });

  describe('markdown formatting', () => {
    it('includes Full-Text Search Results section', async () => {
      hdb.db.run(
        `INSERT INTO fts_content VALUES (?, ?, ?, ?, ?)`,
        ['ml-researcher', 'run-report', 'run-1:0', 'Run 1', 'Inference optimization techniques'],
      );

      const librarian = new MemoryLibrarian(hdb, embedder);
      const result = await librarian.query('inference');

      expect(result.markdown).toContain('### Full-Text Search Results');
      expect(result.markdown).toContain('[ml-researcher]');
    });
  });
});
