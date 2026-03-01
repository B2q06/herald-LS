import { readFile } from 'node:fs/promises';
import type { HeraldDatabase } from '../db/database.ts';
import type { OllamaEmbedder } from '../embedding/ollama-client.ts';
import type { ChunkedContent } from '@herald/shared/types/memory.ts';
import { extractEntities } from './entity-extractor.ts';
import { VectorStore } from './vector-store.ts';
import { FtsIndex } from './fts-index.ts';

export interface PostRunHookOptions {
  agentName: string;
  runId: string;
  reportPath: string;
  db: HeraldDatabase;
  embedder: OllamaEmbedder;
}

/**
 * Strip YAML frontmatter from markdown content.
 * Frontmatter is everything between the first pair of `---` delimiters.
 */
export function stripFrontmatter(text: string): string {
  const match = text.match(/^---\s*\n([\s\S]*?\n)?---\s*\n?/);
  if (match) {
    return text.slice(match[0].length);
  }
  return text;
}

/**
 * Chunk text into ~500-token segments (~2000 chars) with ~100-token overlap (~400 chars).
 */
export function chunkText(text: string): ChunkedContent[] {
  const CHUNK_SIZE = 2000;
  const OVERLAP = 400;

  if (text.length <= CHUNK_SIZE) {
    return [{ text, index: 0 }];
  }

  const chunks: ChunkedContent[] = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push({ text: text.slice(start, end), index });
    index++;

    // Move start forward by chunk size minus overlap
    start += CHUNK_SIZE - OVERLAP;

    // If the remaining text would be smaller than the overlap, just stop
    if (start >= text.length) break;
  }

  return chunks;
}

/**
 * Process the output from an agent run: index into FTS5, extract entities,
 * and optionally embed chunks for vector search.
 *
 * All errors are caught and logged — this function never throws.
 * Indexing must not block agent operations.
 */
export async function processRunOutput(opts: PostRunHookOptions): Promise<void> {
  const { agentName, runId, reportPath, db, embedder } = opts;

  try {
    // 1. Read report
    let rawContent: string;
    try {
      rawContent = await readFile(reportPath, 'utf-8');
    } catch (err) {
      console.error(`[herald] Failed to read report at ${reportPath}:`, (err as Error).message);
      return;
    }

    // 2. Strip YAML frontmatter
    const content = stripFrontmatter(rawContent);
    if (content.trim().length === 0) {
      console.error(`[herald] Report at ${reportPath} is empty after stripping frontmatter`);
      return;
    }

    // 3. Chunk the content
    const chunks = chunkText(content);

    // 4. Extract entities
    const entities = extractEntities(content);

    // 5. If Ollama available, embed chunks and store via VectorStore
    try {
      const available = await embedder.isAvailable();
      if (available) {
        const texts = chunks.map((c) => c.text);
        const embeddings = await embedder.embed(texts);
        if (embeddings && embeddings.length === chunks.length) {
          const vectorStore = new VectorStore(db, embedder);
          vectorStore.indexChunks(agentName, 'run-report', runId, chunks, embeddings);
        }
      }
    } catch (err) {
      console.error(`[herald] Embedding/vector indexing error:`, (err as Error).message);
    }

    // 6. Insert into FTS5 index
    try {
      const ftsIndex = new FtsIndex(db);
      const title = `Run ${runId}`;
      // Insert each chunk as a separate FTS document for better search granularity
      for (const chunk of chunks) {
        ftsIndex.insert(agentName, 'run-report', `${runId}:${chunk.index}`, title, chunk.text);
      }
    } catch (err) {
      console.error(`[herald] FTS indexing error:`, (err as Error).message);
    }

    // 7. Upsert entities and create entity mentions
    try {
      const upsertEntity = db.db.prepare(
        `INSERT INTO entities (name, entity_type, first_seen_by, mention_count)
         VALUES (?, ?, ?, 1)
         ON CONFLICT(name, entity_type) DO UPDATE SET
           mention_count = mention_count + 1,
           updated_at = datetime('now')`,
      );

      const getEntity = db.db.prepare(
        `SELECT id FROM entities WHERE name = ? AND entity_type = ?`,
      );

      const insertMention = db.db.prepare(
        `INSERT INTO entity_mentions (entity_id, agent_name, source_type, source_id, context)
         VALUES (?, ?, ?, ?, ?)`,
      );

      db.db.transaction(() => {
        for (const entity of entities) {
          upsertEntity.run(entity.name, entity.type, agentName);

          const row = getEntity.get(entity.name, entity.type) as { id: number } | null;
          if (row) {
            // Extract a short context snippet around the entity mention
            const contextMatch = content.match(
              new RegExp(
                `.{0,60}${entity.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.{0,60}`,
              ),
            );
            const context = contextMatch ? contextMatch[0].trim() : null;

            insertMention.run(row.id, agentName, 'run-report', runId, context);
          }
        }
      })();
    } catch (err) {
      console.error(`[herald] Entity extraction/storage error:`, (err as Error).message);
    }
  } catch (err) {
    console.error(`[herald] Post-run hook error:`, (err as Error).message);
  }
}
