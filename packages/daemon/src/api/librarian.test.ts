import { Database } from 'bun:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HeraldDatabase } from '../db/database.ts';
import type { OllamaEmbedder } from '../embedding/ollama-client.ts';
import { MemoryLibrarian } from '../librarian/ask-librarian.ts';
import { createLibrarianRoutes } from './librarian.ts';

describe('librarian API routes', () => {
  let hdb: HeraldDatabase;
  let librarian: MemoryLibrarian;
  let routes: ReturnType<typeof createLibrarianRoutes>;

  beforeEach(() => {
    hdb = {
      db: new Database(':memory:'),
      hasVec: false,
      createVecTable: () => false,
      vecTableName: (n: string) => `vec_embeddings_${n.replace(/-/g, '_')}`,
      close: () => {},
    } as unknown as HeraldDatabase;

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

    const embedder = {
      isAvailable: vi.fn().mockResolvedValue(false),
      embed: vi.fn().mockResolvedValue(null),
      resetAvailability: vi.fn(),
    } as unknown as OllamaEmbedder;

    librarian = new MemoryLibrarian(hdb, embedder);
    routes = createLibrarianRoutes(librarian);

    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    hdb.db.close();
    vi.restoreAllMocks();
  });

  it('returns 400 for missing question', async () => {
    const req = new Request('http://localhost/api/librarian/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await routes.fetch(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('question');
  });

  it('returns results for valid query', async () => {
    hdb.db.run(
      `INSERT INTO fts_content VALUES (?, ?, ?, ?, ?)`,
      ['ml-researcher', 'run-report', 'run-1:0', 'Run 1', 'NVIDIA Blackwell inference optimization'],
    );

    const req = new Request('http://localhost/api/librarian/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'NVIDIA inference' }),
    });

    const res = await routes.fetch(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.question).toBe('NVIDIA inference');
    expect(data.ftsResults).toHaveLength(1);
    expect(data.ftsResults[0].agent_name).toBe('ml-researcher');
    expect(data.markdown).toContain('ml-researcher');
  });

  it('supports agent filter', async () => {
    hdb.db.run(
      `INSERT INTO fts_content VALUES (?, ?, ?, ?, ?)`,
      ['ml-researcher', 'run-report', 'run-1:0', 'Run 1', 'MoE architecture'],
    );
    hdb.db.run(
      `INSERT INTO fts_content VALUES (?, ?, ?, ?, ?)`,
      ['ai-tooling', 'run-report', 'run-2:0', 'Run 2', 'MoE in production'],
    );

    const req = new Request('http://localhost/api/librarian/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'MoE', agent: 'ml-researcher' }),
    });

    const res = await routes.fetch(req);
    const data = await res.json();
    expect(data.ftsResults).toHaveLength(1);
    expect(data.agent).toBe('ml-researcher');
  });

  it('returns empty results for no matches', async () => {
    const req = new Request('http://localhost/api/librarian/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'quantum computing' }),
    });

    const res = await routes.fetch(req);
    const data = await res.json();
    expect(data.ftsResults).toHaveLength(0);
    expect(data.markdown).toContain('No relevant results');
  });
});
