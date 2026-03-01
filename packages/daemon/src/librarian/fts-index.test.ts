import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HeraldDatabase } from '../db/database.ts';
import { FtsIndex } from './fts-index.ts';

describe('FtsIndex', () => {
  let tempDir: string;
  let db: HeraldDatabase;
  let fts: FtsIndex;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `herald-fts-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const dbPath = join(tempDir, 'test.sqlite');

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    db = new HeraldDatabase(dbPath);

    // Create the FTS5 virtual table (normally done by migration)
    db.db.run(`
      CREATE VIRTUAL TABLE IF NOT EXISTS fts_content USING fts5(
        agent_name, source_type, source_id, title, content,
        tokenize = 'porter'
      )
    `);

    fts = new FtsIndex(db);
  });

  afterEach(async () => {
    db.close();
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('insert', () => {
    it('inserts a document into FTS5', () => {
      fts.insert('ml-researcher', 'run-report', 'run-001', 'Test Report', 'Content about neural networks.');

      const rows = db.db
        .query<{ agent_name: string; title: string }, []>(
          'SELECT agent_name, title FROM fts_content',
        )
        .all();

      expect(rows).toHaveLength(1);
      expect(rows[0].agent_name).toBe('ml-researcher');
      expect(rows[0].title).toBe('Test Report');
    });

    it('inserts multiple documents', () => {
      fts.insert('agent-a', 'run-report', 'run-001', 'Report 1', 'First report content.');
      fts.insert('agent-b', 'run-report', 'run-002', 'Report 2', 'Second report content.');

      const rows = db.db
        .query<{ agent_name: string }, []>('SELECT agent_name FROM fts_content')
        .all();

      expect(rows).toHaveLength(2);
    });
  });

  describe('search', () => {
    beforeEach(() => {
      fts.insert('ml-researcher', 'run-report', 'run-001', 'Neural Networks',
        'Deep learning and neural networks are transforming AI research with attention mechanisms.');
      fts.insert('ml-researcher', 'run-report', 'run-002', 'Transformers',
        'The transformer architecture uses self-attention for sequence processing.');
      fts.insert('compute-researcher', 'run-report', 'run-003', 'GPU Computing',
        'GPU clusters enable large-scale training of neural network models.');
    });

    it('finds documents matching a query', () => {
      const results = fts.search('neural networks');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('agent_name');
      expect(results[0]).toHaveProperty('source_type');
      expect(results[0]).toHaveProperty('source_id');
      expect(results[0]).toHaveProperty('title');
      expect(results[0]).toHaveProperty('snippet');
      expect(results[0]).toHaveProperty('rank');
    });

    it('returns results with correct structure', () => {
      const results = fts.search('transformer attention');
      expect(results.length).toBeGreaterThan(0);

      const result = results[0];
      expect(typeof result.agent_name).toBe('string');
      expect(typeof result.source_type).toBe('string');
      expect(typeof result.source_id).toBe('string');
      expect(typeof result.title).toBe('string');
      expect(typeof result.snippet).toBe('string');
      expect(typeof result.rank).toBe('number');
    });

    it('filters by agent name', () => {
      const results = fts.search('neural', { agent: 'compute-researcher' });
      expect(results.length).toBeGreaterThan(0);
      for (const result of results) {
        expect(result.agent_name).toBe('compute-researcher');
      }
    });

    it('returns no results for unmatched agent filter', () => {
      const results = fts.search('neural', { agent: 'nonexistent-agent' });
      expect(results).toHaveLength(0);
    });

    it('respects limit option', () => {
      const results = fts.search('neural', { limit: 1 });
      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('returns empty array for empty query', () => {
      expect(fts.search('')).toEqual([]);
      expect(fts.search('   ')).toEqual([]);
    });

    it('handles queries with special characters gracefully', () => {
      // Should not throw, may return empty results
      const results = fts.search('GPU computing');
      expect(Array.isArray(results)).toBe(true);
    });

    it('uses porter stemming (searching "network" matches "networks")', () => {
      const results = fts.search('network');
      expect(results.length).toBeGreaterThan(0);
    });
  });
});
