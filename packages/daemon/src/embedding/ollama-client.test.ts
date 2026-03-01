import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OllamaEmbedder } from './ollama-client.ts';

describe('OllamaEmbedder', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('isAvailable', () => {
    it('returns true when Ollama responds OK', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
      const embedder = new OllamaEmbedder('http://localhost:11434');

      expect(await embedder.isAvailable()).toBe(true);
    });

    it('returns false when Ollama is unreachable', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));
      const embedder = new OllamaEmbedder('http://localhost:11434');

      expect(await embedder.isAvailable()).toBe(false);
    });

    it('caches availability result', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
      const embedder = new OllamaEmbedder('http://localhost:11434');

      await embedder.isAvailable();
      await embedder.isAvailable();

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('resetAvailability clears cached state', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
      const embedder = new OllamaEmbedder('http://localhost:11434');

      await embedder.isAvailable();
      embedder.resetAvailability();
      await embedder.isAvailable();

      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('embed', () => {
    it('returns embeddings on success', async () => {
      const mockEmbeddings = [[0.1, 0.2, 0.3]];
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true }) // isAvailable
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ embeddings: mockEmbeddings }),
        });

      const embedder = new OllamaEmbedder('http://localhost:11434');
      const result = await embedder.embed('test input');

      expect(result).toEqual(mockEmbeddings);
    });

    it('returns null when Ollama is unavailable', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));
      const embedder = new OllamaEmbedder('http://localhost:11434');

      const result = await embedder.embed('test input');
      expect(result).toBeNull();
    });

    it('returns null on non-OK response', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true }) // isAvailable
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' });

      const embedder = new OllamaEmbedder('http://localhost:11434');
      const result = await embedder.embed('test input');

      expect(result).toBeNull();
    });

    it('sends correct request body', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true }) // isAvailable
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ embeddings: [[0.1]] }),
        });

      const embedder = new OllamaEmbedder('http://localhost:11434', 'qwen3-embedding:8b');
      await embedder.embed('hello world');

      const embedCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
      expect(embedCall[0]).toBe('http://localhost:11434/api/embed');
      const body = JSON.parse(embedCall[1].body);
      expect(body.model).toBe('qwen3-embedding:8b');
      expect(body.input).toBe('hello world');
    });

    it('handles array input', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ embeddings: [[0.1], [0.2]] }),
        });

      const embedder = new OllamaEmbedder('http://localhost:11434');
      const result = await embedder.embed(['chunk 1', 'chunk 2']);

      expect(result).toHaveLength(2);
    });

    it('strips trailing slash from base URL', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ embeddings: [[0.1]] }),
        });

      const embedder = new OllamaEmbedder('http://localhost:11434/');
      await embedder.embed('test');

      const embedCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
      expect(embedCall[0]).toBe('http://localhost:11434/api/embed');
    });
  });
});
