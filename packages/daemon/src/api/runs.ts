import { Hono } from 'hono';
import type { AgentRegistry } from '../agent-loader/agent-registry.ts';
import type { SessionManager } from '../session/session-manager.ts';

export interface RunRouteDeps {
  registry: AgentRegistry;
  sessionManager: SessionManager;
  heraldConfig: { memory_dir: string; personas_dir: string } & Record<string, unknown>;
  sdkConfigured: boolean;
}

export function createRunRoutes(deps: RunRouteDeps) {
  const routes = new Hono();

  routes.post('/api/agents/:name/run', async (c) => {
    const name = c.req.param('name');

    // Check agent exists
    if (!deps.registry.has(name)) {
      return c.json({ error: 'Agent not found' }, 404);
    }

    // Check SDK configured
    if (!deps.sdkConfigured) {
      return c.json({ error: 'SDK not configured' }, 503);
    }

    const agent = deps.registry.get(name);
    if (!agent) {
      return c.json({ error: 'Agent not found' }, 404);
    }

    const body = await c.req.json().catch(() => ({}));
    const prompt = (body as { prompt?: string }).prompt;

    const result = await deps.sessionManager.runAgent(
      name,
      agent.config,
      deps.heraldConfig as Parameters<typeof deps.sessionManager.runAgent>[2],
      prompt,
    );

    const session = deps.sessionManager.getSession(name);

    return c.json({
      result,
      interactionCount: session?.interactionCount ?? 0,
      status: deps.sessionManager.getStatus(name),
    });
  });

  routes.get('/api/agents/:name/status', (c) => {
    const name = c.req.param('name');

    // Check agent exists
    if (!deps.registry.has(name)) {
      return c.json({ error: 'Agent not found' }, 404);
    }

    const session = deps.sessionManager.getSession(name);
    const status = deps.sessionManager.getStatus(name);

    return c.json({
      status,
      interactionCount: session?.interactionCount ?? 0,
      ...(session?.lastError ? { lastError: session.lastError } : {}),
    });
  });

  return routes;
}
