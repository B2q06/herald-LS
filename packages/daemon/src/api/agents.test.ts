import type { AgentConfig } from '@herald/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { AgentRegistry } from '../agent-loader/agent-registry.ts';
import { createApp } from './index.ts';

describe('agent routes', () => {
  let registry: AgentRegistry;

  const makeConfig = (name: string): AgentConfig => ({
    name,
    persona: `personas/${name}.md`,
    output_dir: `reports/${name}`,
    session_limit: 10,
    notify_policy: 'failures',
    team_eligible: false,
  });

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  describe('GET /api/agents', () => {
    it('returns empty list when no agents registered', async () => {
      const app = createApp(registry);
      const res = await app.request('/api/agents');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.agents).toEqual([]);
    });

    it('returns all registered agents', async () => {
      registry.register('agent-a', makeConfig('agent-a'));
      registry.register('agent-b', makeConfig('agent-b'));

      const app = createApp(registry);
      const res = await app.request('/api/agents');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.agents).toHaveLength(2);

      const names = body.agents.map((a: { name: string }) => a.name);
      expect(names).toContain('agent-a');
      expect(names).toContain('agent-b');
    });

    it('includes config, status, and registeredAt for each agent', async () => {
      registry.register('test-agent', makeConfig('test-agent'));

      const app = createApp(registry);
      const res = await app.request('/api/agents');
      const body = await res.json();

      const agent = body.agents[0];
      expect(agent.name).toBe('test-agent');
      expect(agent.config).toBeDefined();
      expect(agent.config.name).toBe('test-agent');
      expect(agent.status).toBe('active');
      expect(agent.registeredAt).toBeTruthy();
    });
  });

  describe('GET /api/agents/:name', () => {
    it('returns agent details for existing agent', async () => {
      registry.register('test-agent', makeConfig('test-agent'));

      const app = createApp(registry);
      const res = await app.request('/api/agents/test-agent');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.name).toBe('test-agent');
      expect(body.config.name).toBe('test-agent');
      expect(body.status).toBe('active');
      expect(body.registeredAt).toBeTruthy();
    });

    it('returns 404 for unknown agent', async () => {
      const app = createApp(registry);
      const res = await app.request('/api/agents/nonexistent');
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error).toBe('Agent not found');
    });
  });

  describe('without registry', () => {
    it('agent routes are not mounted when no registry provided', async () => {
      const app = createApp();
      const res = await app.request('/api/agents');
      expect(res.status).toBe(404);
    });
  });
});
