export interface EmbeddingResult {
  embeddings: number[][];
}

export class OllamaEmbedder {
  private readonly baseUrl: string;
  private readonly model: string;
  private available: boolean | null = null;
  private lastCheck: number | null = null;

  constructor(baseUrl = 'http://localhost:11434', model = 'qwen3-embedding:8b') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.model = model;
  }

  async isAvailable(): Promise<boolean> {
    if (this.available === true) return true;
    if (this.available === false && this.lastCheck && Date.now() - this.lastCheck < 60_000) return false;
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
      this.available = res.ok;
    } catch {
      this.available = false;
    }
    this.lastCheck = Date.now();
    return this.available;
  }

  /**
   * Reset cached availability check (e.g., for retry after connectivity restored).
   */
  resetAvailability(): void {
    this.available = null;
    this.lastCheck = null;
  }

  async embed(input: string | string[]): Promise<number[][] | null> {
    if (!(await this.isAvailable())) return null;

    try {
      const res = await fetch(`${this.baseUrl}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, input }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        console.warn(`[herald] Ollama embed failed: ${res.status} ${res.statusText}`);
        return null;
      }

      const data = (await res.json()) as EmbeddingResult;
      return data.embeddings;
    } catch (err) {
      console.warn('[herald] Ollama embed error:', (err as Error).message);
      return null;
    }
  }
}
