import { Hono } from 'hono';
import type { AgentRegistry } from '../agent-loader/agent-registry.ts';
import { createAgentRoutes } from './agents.ts';
import { systemRoutes } from './system.ts';

export function createApp(registry?: AgentRegistry) {
  const app = new Hono();

  app.onError((_err, c) => {
    console.error('Unhandled error in request handler');
    return c.json({ error: 'Internal server error' }, 500);
  });

  app.route('/', systemRoutes);

  if (registry) {
    app.route('/', createAgentRoutes(registry));
  }

  return app;
}
