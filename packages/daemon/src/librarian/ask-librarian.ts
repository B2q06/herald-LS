import type { HeraldDatabase } from '../db/database.ts';
import type { OllamaEmbedder } from '../embedding/ollama-client.ts';
import { FtsIndex } from './fts-index.ts';
import type { FtsSearchResult } from './fts-index.ts';
import { VectorStore } from './vector-store.ts';
import type { VectorSearchResult } from './vector-store.ts';

// Short/common words that add noise to FTS5 OR queries
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'is', 'are',
  'was', 'were', 'be', 'been', 'by', 'with', 'from', 'as', 'it', 'its', 'this', 'that',
]);

/**
 * Convert a multi-word topic into an FTS5 OR query.
 * "MoE Architecture Dominance" → "MoE OR Architecture OR Dominance"
 * Filters out stop words and short tokens.
 */
function toOrQuery(topic: string): string {
  const words = topic
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w.toLowerCase()));
  if (words.length <= 1) return topic;
  return words.join(' OR ');
}

export interface LibrarianResult {
  ftsResults: FtsSearchResult[];
  vectorResults: VectorSearchResult[];
  markdown: string;
}

export class MemoryLibrarian {
  private readonly fts: FtsIndex;
  private readonly vectorStore: VectorStore;

  constructor(
    private readonly db: HeraldDatabase,
    private readonly embedder: OllamaEmbedder,
  ) {
    this.fts = new FtsIndex(db);
    this.vectorStore = new VectorStore(db, embedder);
  }

  /**
   * Query across agent knowledge using both FTS5 and vector search.
   * Returns merged results as structured data and a markdown summary.
   */
  async query(
    question: string,
    opts?: { agent?: string; limit?: number },
  ): Promise<LibrarianResult> {
    const limit = opts?.limit ?? 10;

    // FTS5 search
    const ftsResults = this.fts.search(question, { agent: opts?.agent, limit });

    // Vector search (if agent specified and embeddings available)
    let vectorResults: VectorSearchResult[] = [];
    if (opts?.agent) {
      try {
        const embedding = await this.embedder.embed(question);
        if (embedding && embedding.length > 0) {
          vectorResults = await this.vectorStore.search(opts.agent, embedding[0], limit);
        }
      } catch {
        // Vector search is optional; degrade gracefully
      }
    }

    const markdown = this.formatMarkdown(question, ftsResults, vectorResults);

    return { ftsResults, vectorResults, markdown };
  }

  /**
   * Query for cross-agent intelligence relevant to a specific agent's domain.
   * Excludes the agent's own results and returns findings from other agents.
   */
  async queryForAgent(
    agentName: string,
    topics: string[],
    limit = 5,
  ): Promise<string> {
    if (topics.length === 0) return '';

    const allResults: FtsSearchResult[] = [];
    const seen = new Set<string>();

    for (const topic of topics) {
      // Convert multi-word topics to OR queries so any matching word is sufficient.
      // "MoE Architecture Dominance" → "MoE OR Architecture OR Dominance"
      const orQuery = toOrQuery(topic);
      const ftsResults = this.fts.search(orQuery, { limit });
      for (const r of ftsResults) {
        // Exclude the querying agent's own results
        if (r.agent_name === agentName) continue;
        const key = `${r.agent_name}:${r.source_id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        allResults.push(r);
      }
    }

    if (allResults.length === 0) return '';

    // Take top results across all topics
    const topResults = allResults.slice(0, limit);
    return this.formatCrossAgentSection(topResults);
  }

  private formatMarkdown(
    question: string,
    ftsResults: FtsSearchResult[],
    vectorResults: VectorSearchResult[],
  ): string {
    const lines: string[] = [];
    lines.push(`## Librarian Query: "${question}"`);
    lines.push('');

    if (ftsResults.length === 0 && vectorResults.length === 0) {
      lines.push('No relevant results found.');
      return lines.join('\n');
    }

    if (ftsResults.length > 0) {
      lines.push('### Full-Text Search Results');
      for (const r of ftsResults) {
        lines.push(`- **[${r.agent_name}]** ${r.title} — ${r.snippet}`);
      }
      lines.push('');
    }

    if (vectorResults.length > 0) {
      lines.push('### Semantic Search Results');
      for (const r of vectorResults) {
        lines.push(`- (distance: ${r.distance.toFixed(3)}) ${r.contentPreview}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private formatCrossAgentSection(results: FtsSearchResult[]): string {
    const lines: string[] = [];
    lines.push('## Cross-Agent Intelligence');
    lines.push('Recent findings from other agents that may be relevant to your patrol:');
    lines.push('');

    // Group by agent
    const byAgent = new Map<string, FtsSearchResult[]>();
    for (const r of results) {
      const group = byAgent.get(r.agent_name) ?? [];
      group.push(r);
      byAgent.set(r.agent_name, group);
    }

    for (const [agent, agentResults] of byAgent) {
      lines.push(`### From ${agent}`);
      for (const r of agentResults) {
        lines.push(`- ${r.snippet}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}
