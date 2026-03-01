import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HeraldDatabase } from '../db/database.ts';
import { VectorStore } from './vector-store.ts';
import type { OllamaEmbedder } from '../embedding/ollama-client.ts';
import type { ChunkedContent } from '@herald/shared/types/memory.ts';

describe('VectorStore', () => {
  let tempDir: string;
  let db: HeraldDatabase;
  let mockEmbedder: OllamaEmbedder;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `herald-vecstore-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const dbPath = join(tempDir, 'test.sqlite');

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    db = new HeraldDatabase(dbPath);

    // Create the embedding_sources table (normally done by migrations)
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

  describe('indexChunks', () => {
    it('inserts embedding source records', () => {
      const store = new VectorStore(db, mockEmbedder);
      const chunks: ChunkedContent[] = [
        { text: 'First chunk of content about AI research.', index: 0 },
        { text: 'Second chunk about machine learning.', index: 1 },
      ];
      const embeddings = [
        new Array(1024).fill(0.1),
        new Array(1024).fill(0.2),
      ];

      store.indexChunks('ml-researcher', 'run-report', 'run-001', chunks, embeddings);

      const rows = db.db
        .query<{ agent_name: string; source_id: string; chunk_index: number }, []>(
          'SELECT agent_name, source_id, chunk_index FROM embedding_sources ORDER BY chunk_index',
        )
        .all();

      expect(rows).toHaveLength(2);
      expect(rows[0].agent_name).toBe('ml-researcher');
      expect(rows[0].source_id).toBe('run-001');
      expect(rows[0].chunk_index).toBe(0);
      expect(rows[1].chunk_index).toBe(1);
    });

    it('stores content preview truncated to 200 chars', () => {
      const store = new VectorStore(db, mockEmbedder);
      const longText = 'A'.repeat(500);
      const chunks: ChunkedContent[] = [{ text: longText, index: 0 }];
      const embeddings = [new Array(1024).fill(0.1)];

      store.indexChunks('test-agent', 'run-report', 'run-002', chunks, embeddings);

      const row = db.db
        .query<{ content_preview: string }, []>(
          'SELECT content_preview FROM embedding_sources',
        )
        .get();

      expect(row!.content_preview.length).toBe(200);
    });

    it('handles empty chunks array', () => {
      const store = new VectorStore(db, mockEmbedder);
      store.indexChunks('test-agent', 'run-report', 'run-003', [], []);

      const rows = db.db
        .query<{ id: number }, []>('SELECT id FROM embedding_sources')
        .all();
      expect(rows).toHaveLength(0);
    });

    it('logs error on chunk/embedding count mismatch', () => {
      const store = new VectorStore(db, mockEmbedder);
      const chunks: ChunkedContent[] = [{ text: 'chunk', index: 0 }];

      store.indexChunks('test-agent', 'run-report', 'run-004', chunks, []);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('mismatch'),
      );
    });

    it('handles duplicate inserts gracefully (INSERT OR IGNORE)', () => {
      const store = new VectorStore(db, mockEmbedder);
      const chunks: ChunkedContent[] = [{ text: 'chunk content', index: 0 }];
      const embeddings = [new Array(1024).fill(0.1)];

      // Insert twice — should not throw
      store.indexChunks('test-agent', 'run-report', 'run-005', chunks, embeddings);
      store.indexChunks('test-agent', 'run-report', 'run-005', chunks, embeddings);

      const rows = db.db
        .query<{ id: number }, []>('SELECT id FROM embedding_sources')
        .all();
      expect(rows).toHaveLength(1);
    });
  });

  describe('search', () => {
    it('returns empty array when vec is not available', async () => {
      const store = new VectorStore(db, mockEmbedder);
      const results = await store.search('test-agent', new Array(1024).fill(0.1));

      // If hasVec is false, should return empty
      if (!db.hasVec) {
        expect(results).toEqual([]);
      }
    });

    it('returns empty array when vec table does not exist', async () => {
      const store = new VectorStore(db, mockEmbedder);

      if (db.hasVec) {
        // Don't create the vec table — search should return empty
        const results = await store.search('nonexistent-agent', new Array(1024).fill(0.1));
        expect(results).toEqual([]);
      }
    });

    it('returns results when vec is available and data exists', async () => {
      if (!db.hasVec) return; // Skip if sqlite-vec not available

      const store = new VectorStore(db, mockEmbedder);
      const chunks: ChunkedContent[] = [
        { text: 'Content about neural networks and deep learning.', index: 0 },
      ];
      const embeddings = [new Array(1024).fill(0.5)];

      store.indexChunks('ml-researcher', 'run-report', 'run-001', chunks, embeddings);

      const results = await store.search('ml-researcher', new Array(1024).fill(0.5), 5);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('sourceId');
      expect(results[0]).toHaveProperty('distance');
      expect(results[0]).toHaveProperty('contentPreview');
    });
  });
});
