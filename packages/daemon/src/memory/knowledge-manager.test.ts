import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HeraldDatabase } from '../db/database.ts';
import { KnowledgeManager } from './knowledge-manager.ts';

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
CREATE INDEX IF NOT EXISTS idx_knowledge_agent ON knowledge_items(agent_name);
CREATE INDEX IF NOT EXISTS idx_knowledge_importance ON knowledge_items(importance);
CREATE INDEX IF NOT EXISTS idx_knowledge_archived ON knowledge_items(archived_at);
`;

function makeKnowledgeMd(items: { section: string; title: string; content: string }[]): string {
  const bySection = new Map<string, { title: string; content: string }[]>();
  for (const item of items) {
    if (!bySection.has(item.section)) bySection.set(item.section, []);
    bySection.get(item.section)!.push(item);
  }
  let md = '# Agent Knowledge\n\n';
  for (const [section, entries] of bySection) {
    md += `## ${section}\n\n`;
    for (const entry of entries) {
      md += `### ${entry.title}\n${entry.content}\n\n`;
    }
  }
  return md;
}

describe('KnowledgeManager', () => {
  let tempDir: string;
  let dbPath: string;
  let hdb: HeraldDatabase;
  let manager: KnowledgeManager;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `herald-km-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tempDir, { recursive: true });
    dbPath = join(tempDir, 'test.sqlite');

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    hdb = new HeraldDatabase(dbPath);
    hdb.db.run(MIGRATION_SQL);
    manager = new KnowledgeManager(hdb);
  });

  afterEach(async () => {
    hdb.close();
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('syncKnowledge', () => {
    it('inserts new items from a knowledge file', async () => {
      const mdPath = join(tempDir, 'knowledge.md');
      await writeFile(
        mdPath,
        makeKnowledgeMd([
          { section: 'Domain', title: 'Item A', content: 'Content A.' },
          { section: 'Domain', title: 'Item B', content: 'Content B.' },
          { section: 'Opinions', title: 'Opinion 1', content: 'Opinion content.' },
        ]),
      );

      const count = await manager.syncKnowledge('test-agent', mdPath);
      expect(count).toBe(3);

      const rows = hdb.db
        .query<{ title: string; importance: number }, []>('SELECT title, importance FROM knowledge_items ORDER BY title')
        .all();
      expect(rows).toHaveLength(3);
      expect(rows.map((r) => r.title)).toEqual(['Item A', 'Item B', 'Opinion 1']);
      expect(rows.every((r) => r.importance === 1.0)).toBe(true);
    });

    it('does not re-insert unchanged items on re-sync', async () => {
      const mdPath = join(tempDir, 'knowledge.md');
      const md = makeKnowledgeMd([{ section: 'Domain', title: 'Item A', content: 'Content A.' }]);
      await writeFile(mdPath, md);

      await manager.syncKnowledge('test-agent', mdPath);

      // Manually reduce importance to verify it's NOT reset on unchanged re-sync
      hdb.db.run('UPDATE knowledge_items SET importance = 0.5');

      const count = await manager.syncKnowledge('test-agent', mdPath);
      expect(count).toBe(0);

      const row = hdb.db.query<{ importance: number }, []>('SELECT importance FROM knowledge_items').get();
      expect(row!.importance).toBe(0.5); // Not reset — content unchanged
    });

    it('reinforces (resets importance) when content changes', async () => {
      const mdPath = join(tempDir, 'knowledge.md');
      await writeFile(
        mdPath,
        makeKnowledgeMd([{ section: 'Domain', title: 'Item A', content: 'Original content.' }]),
      );
      await manager.syncKnowledge('test-agent', mdPath);

      // Decay importance
      hdb.db.run('UPDATE knowledge_items SET importance = 0.3');

      // Update the file with changed content
      await writeFile(
        mdPath,
        makeKnowledgeMd([{ section: 'Domain', title: 'Item A', content: 'Updated content!' }]),
      );
      const count = await manager.syncKnowledge('test-agent', mdPath);
      expect(count).toBe(1);

      const row = hdb.db.query<{ importance: number; content: string }, []>(
        'SELECT importance, content FROM knowledge_items',
      ).get();
      expect(row!.importance).toBe(1.0);
      expect(row!.content).toBe('Updated content!');
    });

    it('does not delete items that are removed from the file', async () => {
      const mdPath = join(tempDir, 'knowledge.md');
      await writeFile(
        mdPath,
        makeKnowledgeMd([
          { section: 'Domain', title: 'Item A', content: 'Content A.' },
          { section: 'Domain', title: 'Item B', content: 'Content B.' },
        ]),
      );
      await manager.syncKnowledge('test-agent', mdPath);

      // Re-sync with only Item A (Item B removed from file)
      await writeFile(
        mdPath,
        makeKnowledgeMd([{ section: 'Domain', title: 'Item A', content: 'Content A.' }]),
      );
      await manager.syncKnowledge('test-agent', mdPath);

      const rows = hdb.db.query<{ title: string }, []>('SELECT title FROM knowledge_items ORDER BY title').all();
      expect(rows).toHaveLength(2); // Item B still in DB
      expect(rows.map((r) => r.title)).toEqual(['Item A', 'Item B']);
    });

    it('scopes items by agent_name', async () => {
      const mdPath1 = join(tempDir, 'knowledge1.md');
      const mdPath2 = join(tempDir, 'knowledge2.md');
      await writeFile(
        mdPath1,
        makeKnowledgeMd([{ section: 'Domain', title: 'Shared Title', content: 'Agent 1 content.' }]),
      );
      await writeFile(
        mdPath2,
        makeKnowledgeMd([{ section: 'Domain', title: 'Shared Title', content: 'Agent 2 content.' }]),
      );

      await manager.syncKnowledge('agent-1', mdPath1);
      await manager.syncKnowledge('agent-2', mdPath2);

      const rows = hdb.db
        .query<{ agent_name: string; content: string }, []>(
          'SELECT agent_name, content FROM knowledge_items ORDER BY agent_name',
        )
        .all();
      expect(rows).toHaveLength(2);
      expect(rows[0].agent_name).toBe('agent-1');
      expect(rows[0].content).toBe('Agent 1 content.');
      expect(rows[1].agent_name).toBe('agent-2');
      expect(rows[1].content).toBe('Agent 2 content.');
    });
  });

  describe('getArchivalCandidates', () => {
    it('returns items below the default threshold (0.2)', async () => {
      const mdPath = join(tempDir, 'knowledge.md');
      await writeFile(
        mdPath,
        makeKnowledgeMd([
          { section: 'Domain', title: 'High', content: 'High importance.' },
          { section: 'Domain', title: 'Low', content: 'Low importance.' },
          { section: 'Domain', title: 'Very Low', content: 'Very low importance.' },
        ]),
      );
      await manager.syncKnowledge('test-agent', mdPath);

      hdb.db.run("UPDATE knowledge_items SET importance = 0.5 WHERE title = 'High'");
      hdb.db.run("UPDATE knowledge_items SET importance = 0.15 WHERE title = 'Low'");
      hdb.db.run("UPDATE knowledge_items SET importance = 0.05 WHERE title = 'Very Low'");

      const candidates = manager.getArchivalCandidates();
      expect(candidates).toHaveLength(2);
      expect(candidates.map((c) => c.title).sort()).toEqual(['Low', 'Very Low']);
    });

    it('respects custom threshold', async () => {
      const mdPath = join(tempDir, 'knowledge.md');
      await writeFile(
        mdPath,
        makeKnowledgeMd([{ section: 'Domain', title: 'Item', content: 'Content.' }]),
      );
      await manager.syncKnowledge('test-agent', mdPath);
      hdb.db.run("UPDATE knowledge_items SET importance = 0.3 WHERE title = 'Item'");

      expect(manager.getArchivalCandidates(0.5)).toHaveLength(1);
      expect(manager.getArchivalCandidates(0.2)).toHaveLength(0);
    });

    it('excludes already-archived items', async () => {
      const mdPath = join(tempDir, 'knowledge.md');
      await writeFile(
        mdPath,
        makeKnowledgeMd([
          { section: 'Domain', title: 'Active Low', content: 'Low but active.' },
          { section: 'Domain', title: 'Archived Low', content: 'Low and archived.' },
        ]),
      );
      await manager.syncKnowledge('test-agent', mdPath);

      hdb.db.run('UPDATE knowledge_items SET importance = 0.1');
      hdb.db.run("UPDATE knowledge_items SET archived_at = datetime('now') WHERE title = 'Archived Low'");

      const candidates = manager.getArchivalCandidates();
      expect(candidates).toHaveLength(1);
      expect(candidates[0].title).toBe('Active Low');
    });
  });

  describe('archiveItems', () => {
    it('sets archived_at on specified items', async () => {
      const mdPath = join(tempDir, 'knowledge.md');
      await writeFile(
        mdPath,
        makeKnowledgeMd([
          { section: 'Domain', title: 'Item A', content: 'Content A.' },
          { section: 'Domain', title: 'Item B', content: 'Content B.' },
        ]),
      );
      await manager.syncKnowledge('test-agent', mdPath);

      const allItems = hdb.db.query<{ id: number; title: string }, []>('SELECT id, title FROM knowledge_items').all();
      const itemA = allItems.find((r) => r.title === 'Item A')!;

      manager.archiveItems([itemA.id]);

      const archived = hdb.db
        .query<{ title: string; archived_at: string | null }, []>(
          'SELECT title, archived_at FROM knowledge_items ORDER BY title',
        )
        .all();
      expect(archived[0].title).toBe('Item A');
      expect(archived[0].archived_at).not.toBeNull();
      expect(archived[1].title).toBe('Item B');
      expect(archived[1].archived_at).toBeNull();
    });

    it('handles empty id array gracefully', () => {
      expect(() => manager.archiveItems([])).not.toThrow();
    });
  });
});
