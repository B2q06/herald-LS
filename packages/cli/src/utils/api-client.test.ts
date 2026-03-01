import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, DaemonUnreachableError, get, post, agentPath } from './api-client.ts';

const originalFetch = globalThis.fetch;

describe('api-client', () => {
  beforeEach(() => {
    // Reset env
    delete process.env.HERALD_URL;
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('get', () => {
    it('fetches from the default URL', async () => {
      const mockResponse = { status: 'ok' };
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const result = await get('/health');

      expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost:3117/health');
      expect(result).toEqual(mockResponse);
    });

    it('respects HERALD_URL env var', async () => {
      process.env.HERALD_URL = 'http://myhost:9999';
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      );

      await get('/health');

      expect(globalThis.fetch).toHaveBeenCalledWith('http://myhost:9999/health');
    });

    it('strips trailing slash from HERALD_URL', async () => {
      process.env.HERALD_URL = 'http://myhost:9999/';
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      );

      await get('/health');

      expect(globalThis.fetch).toHaveBeenCalledWith('http://myhost:9999/health');
    });

    it('throws DaemonUnreachableError when fetch fails', async () => {
      vi.mocked(globalThis.fetch).mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(get('/health')).rejects.toThrow(DaemonUnreachableError);
    });

    it('throws ApiError on non-ok response', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
      );

      await expect(get('/api/agents/missing')).rejects.toThrow(ApiError);
    });

    it('ApiError contains the error message from body', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: 'Agent not found' }), { status: 404 })
      );

      try {
        await get('/api/agents/missing');
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).message).toBe('Agent not found');
        expect((err as ApiError).statusCode).toBe(404);
      }
    });
  });

  describe('post', () => {
    it('sends POST request with JSON body', async () => {
      const mockResult = { runId: '123', status: 'success', result: 'done', startedAt: '', finishedAt: '' };
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response(JSON.stringify(mockResult), { status: 200 })
      );

      const result = await post('/api/agents/test/run', { prompt: 'hello' });

      expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost:3117/api/agents/test/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'hello' }),
      });
      expect(result).toEqual(mockResult);
    });

    it('sends POST without body when none provided', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      );

      await post('/api/agents/test/run');

      expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost:3117/api/agents/test/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('throws DaemonUnreachableError when fetch fails', async () => {
      vi.mocked(globalThis.fetch).mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(post('/api/agents/test/run')).rejects.toThrow(DaemonUnreachableError);
    });

    it('throws ApiError on non-ok response', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: 'SDK not configured' }), { status: 503 })
      );

      await expect(post('/api/agents/test/run')).rejects.toThrow(ApiError);
    });
  });

  describe('agentPath', () => {
    it('encodes simple agent names unchanged', () => {
      expect(agentPath('scout')).toBe('scout');
    });

    it('encodes agent names with special characters', () => {
      expect(agentPath('my agent')).toBe('my%20agent');
      expect(agentPath('agent/name')).toBe('agent%2Fname');
      expect(agentPath('agent@host')).toBe('agent%40host');
    });

    it('encodes agent names with unicode characters', () => {
      const encoded = agentPath('agent-\u00e9');
      expect(encoded).toBe('agent-%C3%A9');
    });
  });
});
