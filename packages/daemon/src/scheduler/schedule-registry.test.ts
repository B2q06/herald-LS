import { afterEach, describe, expect, it, vi } from 'vitest';
import { ScheduleRegistry } from './schedule-registry.ts';

describe('ScheduleRegistry', () => {
  let registry: ScheduleRegistry;

  afterEach(() => {
    // Ensure all tasks are stopped after each test
    registry?.stop();
  });

  describe('register', () => {
    it('creates a cron task for a valid expression', () => {
      registry = new ScheduleRegistry();
      const callback = vi.fn();

      registry.register('test-agent', '0 5 * * *', callback);

      const all = registry.getAll();
      expect(all).toHaveLength(1);
      expect(all[0]).toEqual({
        agentName: 'test-agent',
        cronExpression: '0 5 * * *',
      });
    });

    it('skips invalid cron expressions without crashing', () => {
      registry = new ScheduleRegistry();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const callback = vi.fn();

      registry.register('bad-agent', 'not-a-cron', callback);

      expect(registry.getAll()).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid cron expression for bad-agent'),
      );
      warnSpy.mockRestore();
    });

    it('registers multiple agents', () => {
      registry = new ScheduleRegistry();

      registry.register('agent-a', '0 5 * * *', vi.fn());
      registry.register('agent-b', '0 10 * * *', vi.fn());

      expect(registry.getAll()).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('replaces the cron expression for an existing agent', () => {
      registry = new ScheduleRegistry();

      registry.register('test-agent', '0 5 * * *', vi.fn());
      registry.update('test-agent', '0 10 * * *', vi.fn());

      const all = registry.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].cronExpression).toBe('0 10 * * *');
    });

    it('works for agents not previously registered', () => {
      registry = new ScheduleRegistry();

      registry.update('new-agent', '0 5 * * *', vi.fn());

      const all = registry.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].agentName).toBe('new-agent');
    });
  });

  describe('remove', () => {
    it('removes agent from registry', () => {
      registry = new ScheduleRegistry();

      registry.register('test-agent', '0 5 * * *', vi.fn());
      expect(registry.getAll()).toHaveLength(1);

      registry.remove('test-agent');
      expect(registry.getAll()).toHaveLength(0);
    });

    it('does nothing if agent not found', () => {
      registry = new ScheduleRegistry();
      // Should not throw
      registry.remove('nonexistent');
      expect(registry.getAll()).toHaveLength(0);
    });
  });

  describe('getAll', () => {
    it('returns empty array when no schedules', () => {
      registry = new ScheduleRegistry();
      expect(registry.getAll()).toEqual([]);
    });

    it('returns all registered schedules with correct shape', () => {
      registry = new ScheduleRegistry();

      registry.register('agent-a', '0 5 * * *', vi.fn());
      registry.register('agent-b', '0 10 * * *', vi.fn());

      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all).toEqual(
        expect.arrayContaining([
          { agentName: 'agent-a', cronExpression: '0 5 * * *' },
          { agentName: 'agent-b', cronExpression: '0 10 * * *' },
        ]),
      );
    });
  });

  describe('stop', () => {
    it('clears all schedules', () => {
      registry = new ScheduleRegistry();

      registry.register('agent-a', '0 5 * * *', vi.fn());
      registry.register('agent-b', '0 10 * * *', vi.fn());
      expect(registry.getAll()).toHaveLength(2);

      registry.stop();
      expect(registry.getAll()).toHaveLength(0);
    });

    it('does nothing when registry is empty', () => {
      registry = new ScheduleRegistry();
      // Should not throw
      registry.stop();
      expect(registry.getAll()).toHaveLength(0);
    });
  });
});
