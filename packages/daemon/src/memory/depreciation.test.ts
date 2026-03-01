import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HeraldDatabase } from '../db/database.ts';
import { runDepreciation } from './depreciation.ts';

const MIGRATION_SQL = `
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
);
`;

function insertItem(hdb: HeraldDatabase, title: string, importance = 1.0, archived = false) {
  hdb.db.run(
    `INSERT INTO knowledge_items (agent_name, section, title, content, content_hash, importance${archived ? ', archived_at' : ''})
     VALUES ('test-agent', 'Domain', ?, 'content', 'hash-${title}', ?${archived ? ", datetime('now')" : ''})`,
    [title, importance],
  );
}

describe('runDepreciation', () => {
  let tempDir: string;
  let hdb: HeraldDatabase;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `herald-dep-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tempDir, { recursive: true });

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    hdb = new HeraldDatabase(join(tempDir, 'test.sqlite'));
    hdb.db.run(MIGRATION_SQL);
  });

  afterEach(async () => {
    hdb.close();
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('applies default 5% decay to all non-archived items', () => {
    insertItem(hdb, 'Item A', 1.0);
    insertItem(hdb, 'Item B', 0.5);

    const affected = runDepreciation(hdb);
    expect(affected).toBe(2);

    const rows = hdb.db
      .query<{ title: string; importance: number }, []>('SELECT title, importance FROM knowledge_items ORDER BY title')
      .all();
    expect(rows[0].importance).toBeCloseTo(0.95, 5); // 1.0 * 0.95
    expect(rows[1].importance).toBeCloseTo(0.475, 5); // 0.5 * 0.95
  });

  it('applies custom decay rate', () => {
    insertItem(hdb, 'Item A', 1.0);

    runDepreciation(hdb, 0.1); // 10% decay

    const row = hdb.db.query<{ importance: number }, []>('SELECT importance FROM knowledge_items').get();
    expect(row!.importance).toBeCloseTo(0.9, 5);
  });

  it('does not affect archived items', () => {
    insertItem(hdb, 'Active', 1.0);
    insertItem(hdb, 'Archived', 0.8, true);

    const affected = runDepreciation(hdb);
    expect(affected).toBe(1); // Only the active item

    const rows = hdb.db
      .query<{ title: string; importance: number }, []>('SELECT title, importance FROM knowledge_items ORDER BY title')
      .all();
    expect(rows[0].importance).toBeCloseTo(0.95, 5); // Active: decayed
    expect(rows[1].importance).toBe(0.8); // Archived: unchanged
  });

  it('compounds correctly over multiple runs', () => {
    insertItem(hdb, 'Item', 1.0);

    // Run 5 times (simulating 5 days at default 5%)
    for (let i = 0; i < 5; i++) {
      runDepreciation(hdb);
    }

    const row = hdb.db.query<{ importance: number }, []>('SELECT importance FROM knowledge_items').get();
    // 1.0 * 0.95^5 = 0.7737809375
    expect(row!.importance).toBeCloseTo(Math.pow(0.95, 5), 5);
  });

  it('returns 0 when no non-archived items exist', () => {
    insertItem(hdb, 'Archived Only', 0.8, true);

    const affected = runDepreciation(hdb);
    expect(affected).toBe(0);
  });

  it('returns 0 on empty table', () => {
    const affected = runDepreciation(hdb);
    expect(affected).toBe(0);
  });

  it('handles very small importance values without going negative', () => {
    insertItem(hdb, 'Tiny', 0.001);

    runDepreciation(hdb);

    const row = hdb.db.query<{ importance: number }, []>('SELECT importance FROM knowledge_items').get();
    expect(row!.importance).toBeGreaterThan(0);
    expect(row!.importance).toBeCloseTo(0.00095, 5);
  });
});
