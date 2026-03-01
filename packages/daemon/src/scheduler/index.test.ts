import type { AgentConfig, HeraldConfig } from '@herald/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentRegistry } from '../agent-loader/agent-registry.ts';
import type { SessionManager } from '../session/session-manager.ts';
import { initScheduler } from './index.ts';

describe('initScheduler', () => {
  let agentRegistry: AgentRegistry;
  let sessionManager: SessionManager;
  let heraldConfig: HeraldConfig;

  const makeConfig = (name: string, schedule?: string): AgentConfig => ({
    name,
    persona: `personas/${name}.md`,
    output_dir: `reports/${name}`,
    session_limit: 10,
    notify_policy: 'failures',
    team_eligible: false,
    ...(schedule ? { schedule } : {}),
  });

  beforeEach(() => {
    agentRegistry = new AgentRegistry();
    sessionManager = {} as SessionManager;
    heraldConfig = {
      port: 3000,
      agents_dir: '/tmp/agents',
      personas_dir: '/tmp/personas',
      memory_dir: '/tmp/memory',
      reports_dir: '/tmp/reports',
      transcripts_dir: '/tmp/transcripts',
    };
  });

  afterEach(() => {
    // Clean up any active cron tasks
    vi.restoreAllMocks();
  });

  it('returns a ScheduleRegistry instance', () => {
    const { scheduleRegistry } = initScheduler(agentRegistry, sessionManager, heraldConfig);
    expect(scheduleRegistry).toBeDefined();
    expect(scheduleRegistry.getAll).toBeDefined();
    expect(scheduleRegistry.stop).toBeDefined();
    scheduleRegistry.stop();
  });

  it('creates cron jobs for agents with schedule field', () => {
    agentRegistry.register('scheduled-agent', makeConfig('scheduled-agent', '0 5 * * *'));
    agentRegistry.register('no-schedule-agent', makeConfig('no-schedule-agent'));

    const { scheduleRegistry } = initScheduler(agentRegistry, sessionManager, heraldConfig);

    const schedules = scheduleRegistry.getAll();
    // +1 for the always-present newspaper-weekly cron
    const agentSchedules = schedules.filter((s) => s.agentName === 'scheduled-agent');
    expect(agentSchedules).toHaveLength(1);
    expect(agentSchedules[0]).toEqual({
      agentName: 'scheduled-agent',
      cronExpression: '0 5 * * *',
    });
    scheduleRegistry.stop();
  });

  it('skips agents without schedule field', () => {
    agentRegistry.register('agent-no-schedule', makeConfig('agent-no-schedule'));

    const { scheduleRegistry } = initScheduler(agentRegistry, sessionManager, heraldConfig);

    // Only the newspaper-weekly cron should be present
    const agentSchedules = scheduleRegistry.getAll().filter((s) => s.agentName !== 'newspaper-weekly');
    expect(agentSchedules).toHaveLength(0);
    scheduleRegistry.stop();
  });

  it('creates jobs for multiple scheduled agents', () => {
    agentRegistry.register('agent-a', makeConfig('agent-a', '0 5 * * *'));
    agentRegistry.register('agent-b', makeConfig('agent-b', '0 10 * * *'));
    agentRegistry.register('agent-c', makeConfig('agent-c'));

    const { scheduleRegistry } = initScheduler(agentRegistry, sessionManager, heraldConfig);

    const schedules = scheduleRegistry.getAll();
    const agentSchedules = schedules.filter((s) => s.agentName !== 'newspaper-weekly');
    expect(agentSchedules).toHaveLength(2);
    expect(agentSchedules).toEqual(
      expect.arrayContaining([
        { agentName: 'agent-a', cronExpression: '0 5 * * *' },
        { agentName: 'agent-b', cronExpression: '0 10 * * *' },
      ]),
    );
    scheduleRegistry.stop();
  });

  it('handles empty agent registry', () => {
    const { scheduleRegistry } = initScheduler(agentRegistry, sessionManager, heraldConfig);
    // Only the newspaper-weekly cron should be present
    const agentSchedules = scheduleRegistry.getAll().filter((s) => s.agentName !== 'newspaper-weekly');
    expect(agentSchedules).toHaveLength(0);
    scheduleRegistry.stop();
  });

  it('registers newspaper agent separately from patrol agents', () => {
    agentRegistry.register('ml-researcher', makeConfig('ml-researcher', '0 5 * * *'));
    agentRegistry.register('newspaper', {
      ...makeConfig('newspaper', '0 6 * * *'),
      name: 'newspaper',
    });

    const { scheduleRegistry } = initScheduler(agentRegistry, sessionManager, heraldConfig);

    const schedules = scheduleRegistry.getAll();
    // ml-researcher + newspaper daily + newspaper-weekly = 3
    expect(schedules).toHaveLength(3);
    // Newspaper gets a special name prefix
    const newspaperSchedule = schedules.find((s) => s.agentName.startsWith('newspaper:'));
    expect(newspaperSchedule).toBeDefined();
    expect(newspaperSchedule?.cronExpression).toBe('0 6 * * *');
    scheduleRegistry.stop();
  });

  it('newspaper agent uses executeNewspaperRun callback (not executeRun)', () => {
    agentRegistry.register('newspaper', {
      ...makeConfig('newspaper', '0 6 * * *'),
      name: 'newspaper',
    });

    const { scheduleRegistry } = initScheduler(agentRegistry, sessionManager, heraldConfig);

    const schedules = scheduleRegistry.getAll();
    // newspaper daily + newspaper-weekly = 2
    expect(schedules).toHaveLength(2);
    const newspaperSchedules = schedules.filter((s) => s.agentName.includes('newspaper'));
    expect(newspaperSchedules).toHaveLength(2);
    scheduleRegistry.stop();
  });

  it('always registers newspaper-weekly cron for Friday 5 PM', () => {
    const { scheduleRegistry } = initScheduler(agentRegistry, sessionManager, heraldConfig);

    const schedules = scheduleRegistry.getAll();
    const weeklySchedule = schedules.find((s) => s.agentName === 'newspaper-weekly');
    expect(weeklySchedule).toBeDefined();
    expect(weeklySchedule?.cronExpression).toBe('0 17 * * 5');
    scheduleRegistry.stop();
  });
});
