import type { HeraldDatabase } from '../db/database.ts';
import type { OllamaEmbedder } from '../embedding/ollama-client.ts';
import type { ChunkedContent } from '@herald/shared/types/memory.ts';

export interface VectorSearchResult {
  sourceId: number;
  distance: number;
  contentPreview: string;
}

export class VectorStore {
  constructor(
    private readonly db: HeraldDatabase,
    private readonly embedder: OllamaEmbedder,
  ) {}

  /**
   * Index chunks with their embeddings into the database.
   * Inserts embedding_sources records and stores vectors in the agent's vec0 table.
   */
  indexChunks(
    agentName: string,
    sourceType: string,
    sourceId: string,
    chunks: ChunkedContent[],
    embeddings: number[][],
  ): void {
    if (chunks.length === 0) return;
    if (chunks.length !== embeddings.length) {
      console.error(
        `[herald] Chunk/embedding count mismatch: ${chunks.length} chunks vs ${embeddings.length} embeddings`,
      );
      return;
    }

    // Create vec table if needed (no-ops if already exists or vec unavailable)
    this.db.createVecTable(agentName);

    const insertSource = this.db.db.prepare(
      `INSERT OR IGNORE INTO embedding_sources (agent_name, source_type, source_id, chunk_index, content_preview)
       VALUES (?, ?, ?, ?, ?)`,
    );

    const getSourceId = this.db.db.prepare(
      `SELECT id FROM embedding_sources WHERE agent_name = ? AND source_type = ? AND source_id = ? AND chunk_index = ?`,
    );

    const tableName = this.db.vecTableName(agentName);
    const hasVec = this.db.hasVec;

    this.db.db.transaction(() => {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = embeddings[i];
        const preview = chunk.text.slice(0, 200);

        // Insert embedding source record
        insertSource.run(agentName, sourceType, sourceId, chunk.index, preview);

        // Get the source ID for vec table insertion
        if (hasVec) {
          const row = getSourceId.get(agentName, sourceType, sourceId, chunk.index) as
            | { id: number }
            | null;
          if (row) {
            try {
              this.db.db.run(
                `INSERT INTO "${tableName}" (rowid, embedding, source_id) VALUES (?, ?, ?)`,
                [row.id, new Float32Array(embedding), row.id],
              );
            } catch (err) {
              // Duplicate rowid is expected on re-index; ignore
              if (!(err as Error).message?.includes('UNIQUE constraint')) {
                console.error(`[herald] Vec insert error:`, (err as Error).message);
              }
            }
          }
        }
      }
    })();
  }

  /**
   * Search the agent's vec0 table for nearest neighbors.
   * Returns empty array if vec table doesn't exist or vec is not available.
   */
  async search(
    agentName: string,
    queryEmbedding: number[],
    limit = 10,
  ): Promise<VectorSearchResult[]> {
    if (!this.db.hasVec) return [];

    const tableName = this.db.vecTableName(agentName);

    // Check if vec table exists
    const tableExists = this.db.db
      .query<{ name: string }, [string]>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      )
      .get(tableName);

    if (!tableExists) return [];

    try {
      const rows = this.db.db
        .query<{ source_id: number; distance: number }, []>(
          `SELECT source_id, distance
           FROM "${tableName}"
           WHERE embedding MATCH ?
           ORDER BY distance
           LIMIT ?`,
        )
        .all(new Float32Array(queryEmbedding) as unknown as never, limit as unknown as never);

      // Enrich with content previews
      const results: VectorSearchResult[] = [];
      for (const row of rows) {
        const source = this.db.db
          .query<{ content_preview: string }, [number]>(
            'SELECT content_preview FROM embedding_sources WHERE id = ?',
          )
          .get(row.source_id);

        results.push({
          sourceId: row.source_id,
          distance: row.distance,
          contentPreview: source?.content_preview ?? '',
        });
      }

      return results;
    } catch (err) {
      console.error(`[herald] Vector search error:`, (err as Error).message);
      return [];
    }
  }
}
