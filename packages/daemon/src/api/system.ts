import { Hono } from 'hono';

import pkg from '../../package.json';

export const systemRoutes = new Hono();

systemRoutes.get('/health', (c) => {
  return c.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
  });
});

systemRoutes.get('/api/status', (c) => {
  return c.json({
    agents: [],
    daemon: {
      uptime: Math.floor(process.uptime()),
      version: pkg.version,
    },
  });
});
