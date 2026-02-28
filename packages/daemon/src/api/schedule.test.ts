import { describe, expect, it } from 'vitest';
import type { ScheduleRegistry } from '../scheduler/schedule-registry.ts';
import { createApp } from './index.ts';

describe('schedule routes', () => {
  const makeScheduleRegistry = (
    schedules: Array<{ agentName: string; cronExpression: string }> = [],
  ): ScheduleRegistry =>
    ({
      getAll: () => schedules,
      register: () => {},
      update: () => {},
      remove: () => {},
      stop: () => {},
    }) as unknown as ScheduleRegistry;

  describe('GET /api/schedule', () => {
    it('returns empty schedules when none registered', async () => {
      const app = createApp({ scheduleRegistry: makeScheduleRegistry() });
      const res = await app.request('/api/schedule');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.schedules).toEqual([]);
    });

    it('returns all registered schedules', async () => {
      const schedules = [
        { agentName: 'agent-a', cronExpression: '0 5 * * *' },
        { agentName: 'agent-b', cronExpression: '0 10 * * *' },
      ];
      const app = createApp({ scheduleRegistry: makeScheduleRegistry(schedules) });
      const res = await app.request('/api/schedule');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.schedules).toHaveLength(2);
      expect(body.schedules).toEqual(schedules);
    });

    it('returns 404 when schedule registry not provided', async () => {
      const app = createApp();
      const res = await app.request('/api/schedule');
      expect(res.status).toBe(404);
    });
  });
});
