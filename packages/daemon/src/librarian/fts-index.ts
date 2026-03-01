import type { HeraldDatabase } from '../db/database.ts';

export interface FtsSearchResult {
  agent_name: string;
  source_type: string;
  source_id: string;
  title: string;
  snippet: string;
  rank: number;
}

export class FtsIndex {
  constructor(private readonly db: HeraldDatabase) {}

  /**
   * Insert a document into the FTS5 virtual table.
   */
  insert(
    agentName: string,
    sourceType: string,
    sourceId: string,
    title: string,
    content: string,
  ): void {
    this.db.db.run(
      `INSERT INTO fts_content (agent_name, source_type, source_id, title, content)
       VALUES (?, ?, ?, ?, ?)`,
      [agentName, sourceType, sourceId, title, content],
    );
  }

  /**
   * Search the FTS5 index using MATCH syntax.
   * Optionally filter by agent name and limit results.
   */
  search(
    query: string,
    opts?: { agent?: string; limit?: number },
  ): FtsSearchResult[] {
    const limit = opts?.limit ?? 20;
    const agent = opts?.agent;

    if (!query || query.trim().length === 0) return [];

    // Sanitize query for FTS5 — escape double quotes and wrap terms
    const sanitized = query
      .replace(/"/g, '""')
      .trim();

    try {
      if (agent) {
        const rows = this.db.db
          .query<FtsSearchResult, [string, string, number]>(
            `SELECT
               agent_name,
               source_type,
               source_id,
               title,
               snippet(fts_content, 4, '<b>', '</b>', '...', 32) as snippet,
               rank
             FROM fts_content
             WHERE fts_content MATCH ?
               AND agent_name = ?
             ORDER BY rank
             LIMIT ?`,
          )
          .all(sanitized, agent, limit);
        return rows;
      }

      const rows = this.db.db
        .query<FtsSearchResult, [string, number]>(
          `SELECT
             agent_name,
             source_type,
             source_id,
             title,
             snippet(fts_content, 4, '<b>', '</b>', '...', 32) as snippet,
             rank
           FROM fts_content
           WHERE fts_content MATCH ?
           ORDER BY rank
           LIMIT ?`,
        )
        .all(sanitized, limit);
      return rows;
    } catch (err) {
      console.error(`[herald] FTS search error:`, (err as Error).message);
      return [];
    }
  }
}
