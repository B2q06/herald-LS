import { readFile } from 'node:fs/promises';
import type { HeraldDatabase } from '../db/database.ts';
import type { KnowledgeItem } from '@herald/shared/types/memory.ts';
import { parseKnowledgeMd } from './knowledge-parser.ts';

function contentHash(content: string): string {
  return new Bun.CryptoHasher('sha256').update(content).digest('hex');
}

export class KnowledgeManager {
  constructor(private readonly db: HeraldDatabase) {}

  /**
   * Sync a knowledge.md file into the knowledge_items table for a given agent.
   *
   * - New items are inserted with importance 1.0
   * - Changed items (content hash differs) are reinforced: importance reset to 1.0,
   *   last_reinforced_at updated, content & hash updated
   * - Unchanged items are left as-is
   * - Items in DB but NOT in the file are NOT deleted (may have been intentionally
   *   removed by the agent and should remain for archival consideration)
   *
   * Returns the number of items upserted (inserted or updated).
   */
  async syncKnowledge(agentName: string, knowledgePath: string): Promise<number> {
    let raw: string;
    try {
      raw = await readFile(knowledgePath, 'utf-8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return 0;
      throw err;
    }
    const parsed = parseKnowledgeMd(raw);

    const upsert = this.db.db.prepare(`
      INSERT INTO knowledge_items (agent_name, section, title, content, content_hash, importance, last_reinforced_at)
      VALUES (?1, ?2, ?3, ?4, ?5, 1.0, datetime('now'))
      ON CONFLICT(agent_name, section, title) DO UPDATE SET
        content = ?4,
        content_hash = ?5,
        importance = 1.0,
        last_reinforced_at = datetime('now'),
        updated_at = datetime('now')
      WHERE content_hash != ?5
    `);

    const insertOnly = this.db.db.prepare(`
      INSERT OR IGNORE INTO knowledge_items (agent_name, section, title, content, content_hash, importance, last_reinforced_at)
      VALUES (?1, ?2, ?3, ?4, ?5, 1.0, datetime('now'))
    `);

    let count = 0;

    const txn = this.db.db.transaction(() => {
      for (const item of parsed) {
        const hash = contentHash(item.content);

        // Try the upsert first (handles both insert and update-on-change)
        const result = upsert.run(agentName, item.section, item.title, item.content, hash);
        if (result.changes > 0) {
          count++;
        } else {
          // If no changes from the upsert (content_hash matched), try insert-or-ignore
          // for the case where the row doesn't exist yet but somehow the upsert didn't fire
          const insertResult = insertOnly.run(agentName, item.section, item.title, item.content, hash);
          if (insertResult.changes > 0) {
            count++;
          }
        }
      }
    });

    txn();

    return count;
  }

  /**
   * Get items whose importance has decayed below the given threshold and are not already archived.
   */
  getArchivalCandidates(threshold = 0.2): KnowledgeItem[] {
    return this.db.db
      .query<KnowledgeItem, [number]>(
        'SELECT * FROM knowledge_items WHERE importance < ?1 AND archived_at IS NULL',
      )
      .all(threshold);
  }

  /**
   * Archive the given items by setting their archived_at timestamp.
   */
  archiveItems(ids: number[]): void {
    if (ids.length === 0) return;

    const placeholders = ids.map(() => '?').join(', ');
    this.db.db.run(
      `UPDATE knowledge_items SET archived_at = datetime('now'), updated_at = datetime('now') WHERE id IN (${placeholders})`,
      ids,
    );
  }
}
