import { Hono } from 'hono';
import { systemRoutes } from './system.ts';

export function createApp() {
  const app = new Hono();

  app.onError((_err, c) => {
    console.error('Unhandled error in request handler');
    return c.json({ error: 'Internal server error' }, 500);
  });

  app.route('/', systemRoutes);

  return app;
}
