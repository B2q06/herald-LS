import { Hono } from 'hono';
import type { ScheduleRegistry } from '../scheduler/schedule-registry.ts';

export function createScheduleRoutes(scheduleRegistry: ScheduleRegistry) {
  const routes = new Hono();

  routes.get('/api/schedule', (c) => {
    const schedules = scheduleRegistry.getAll();
    return c.json({ schedules });
  });

  return routes;
}
