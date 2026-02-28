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
    const result = initScheduler(agentRegistry, sessionManager, heraldConfig);
    expect(result).toBeDefined();
    expect(result.getAll).toBeDefined();
    expect(result.stop).toBeDefined();
    result.stop();
  });

  it('creates cron jobs for agents with schedule field', () => {
    agentRegistry.register('scheduled-agent', makeConfig('scheduled-agent', '0 5 * * *'));
    agentRegistry.register('no-schedule-agent', makeConfig('no-schedule-agent'));

    const result = initScheduler(agentRegistry, sessionManager, heraldConfig);

    const schedules = result.getAll();
    expect(schedules).toHaveLength(1);
    expect(schedules[0]).toEqual({
      agentName: 'scheduled-agent',
      cronExpression: '0 5 * * *',
    });
    result.stop();
  });

  it('skips agents without schedule field', () => {
    agentRegistry.register('agent-no-schedule', makeConfig('agent-no-schedule'));

    const result = initScheduler(agentRegistry, sessionManager, heraldConfig);

    expect(result.getAll()).toHaveLength(0);
    result.stop();
  });

  it('creates jobs for multiple scheduled agents', () => {
    agentRegistry.register('agent-a', makeConfig('agent-a', '0 5 * * *'));
    agentRegistry.register('agent-b', makeConfig('agent-b', '0 10 * * *'));
    agentRegistry.register('agent-c', makeConfig('agent-c'));

    const result = initScheduler(agentRegistry, sessionManager, heraldConfig);

    const schedules = result.getAll();
    expect(schedules).toHaveLength(2);
    expect(schedules).toEqual(
      expect.arrayContaining([
        { agentName: 'agent-a', cronExpression: '0 5 * * *' },
        { agentName: 'agent-b', cronExpression: '0 10 * * *' },
      ]),
    );
    result.stop();
  });

  it('handles empty agent registry', () => {
    const result = initScheduler(agentRegistry, sessionManager, heraldConfig);
    expect(result.getAll()).toHaveLength(0);
    result.stop();
  });
});
