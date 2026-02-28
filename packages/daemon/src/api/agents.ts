import { Hono } from 'hono';
import type { AgentRegistry } from '../agent-loader/agent-registry.ts';

export function createAgentRoutes(registry: AgentRegistry) {
  const routes = new Hono();

  routes.get('/api/agents', (c) => {
    const all = registry.getAll();
    const agents = Array.from(all.entries()).map(([name, agent]) => ({
      name,
      config: agent.config,
      status: agent.status,
      registeredAt: agent.registeredAt,
      ...(agent.lastError ? { lastError: agent.lastError } : {}),
      ...(agent.lastRun ? { lastRun: agent.lastRun } : {}),
    }));

    return c.json({ agents });
  });

  routes.get('/api/agents/:name', (c) => {
    const name = c.req.param('name');
    const agent = registry.get(name);

    if (!agent) {
      return c.json({ error: 'Agent not found' }, 404);
    }

    return c.json({
      name,
      config: agent.config,
      status: agent.status,
      registeredAt: agent.registeredAt,
      ...(agent.lastError ? { lastError: agent.lastError } : {}),
      ...(agent.lastRun ? { lastRun: agent.lastRun } : {}),
    });
  });

  return routes;
}
