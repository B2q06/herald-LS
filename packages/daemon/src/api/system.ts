import { Hono } from 'hono';

import pkg from '../../package.json';

export function createSystemRoutes() {
  const routes = new Hono();

  routes.get('/health', (c) => {
    return c.json({
      status: 'ok',
      uptime: Math.floor(process.uptime()),
    });
  });

  routes.get('/api/status', (c) => {
    return c.json({
      daemon: {
        uptime: Math.floor(process.uptime()),
        version: pkg.version,
      },
    });
  });

  return routes;
}
