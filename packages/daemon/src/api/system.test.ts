import { describe, expect, it } from 'vitest';
import { createApp } from './index.ts';

describe('system routes', () => {
  const app = createApp();

  describe('GET /health', () => {
    it('returns 200 with status ok', async () => {
      const res = await app.request('/health');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.status).toBe('ok');
    });

    it('returns uptime as a number', async () => {
      const res = await app.request('/health');
      const body = await res.json();
      expect(typeof body.uptime).toBe('number');
      expect(body.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /api/status', () => {
    it('returns 200 with agents and daemon info', async () => {
      const res = await app.request('/api/status');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.agents).toEqual([]);
      expect(body.daemon).toBeDefined();
      expect(body.daemon.version).toBe('0.0.1');
    });

    it('returns daemon uptime as a number', async () => {
      const res = await app.request('/api/status');
      const body = await res.json();
      expect(typeof body.daemon.uptime).toBe('number');
      expect(body.daemon.uptime).toBeGreaterThanOrEqual(0);
    });
  });
});
