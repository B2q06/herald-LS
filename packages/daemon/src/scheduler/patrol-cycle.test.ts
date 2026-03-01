import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AgentConfig, HeraldConfig } from '@herald/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentRegistry } from '../agent-loader/agent-registry.ts';
import type { SdkAdapter, SendMessageParams, SendMessageResult } from '../session/sdk-adapter.ts';
import { SessionManager } from '../session/session-manager.ts';
import { PatrolCycleManager } from './patrol-cycle.ts';

class MockSdkAdapter implements SdkAdapter {
  public delay = 0;
  public failForAgents: Set<string> = new Set();

  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    if (this.delay > 0) {
      await new Promise((r) => setTimeout(r, this.delay));
    }
    // Check if this agent should fail (agent name is in the system prompt)
    for (const name of this.failForAgents) {
      if (params.systemPrompt.includes(name)) {
        throw new Error(`Simulated failure for ${name}`);
      }
    }
    return {
      text: `Mock patrol output for agent`,
      inputTokens: 100,
      outputTokens: 50,
    };
  }
}

describe('PatrolCycleManager', () => {
  let tempDir: string;
  let heraldConfig: HeraldConfig;
  let registry: AgentRegistry;
  let sessionManager: SessionManager;
  let mockAdapter: MockSdkAdapter;
  let cycleManager: PatrolCycleManager;

  const makeConfig = (name: string): AgentConfig => ({
    name,
    persona: `${name}.md`,
    output_dir: `reports/${name}`,
    session_limit: 10,
    notify_policy: 'failures',
    team_eligible: true,
    schedule: '30 5,11,17,23 * * *',
    discovery_mode: 'aggressive',
  });

  beforeEach(async () => {
    tempDir = join(tmpdir(), `herald-cycle-test-${Date.now()}`);
    const personasDir = join(tempDir, 'personas');
    const memoryDir = join(tempDir, 'memory');

    // Create directories for all test agents
    for (const name of ['agent-a', 'agent-b', 'agent-c']) {
      await mkdir(join(personasDir), { recursive: true });
      await mkdir(join(memoryDir, 'agents', name), { recursive: true });
      await mkdir(join(tempDir, 'agents'), { recursive: true });
      await Bun.write(join(personasDir, `${name}.md`), `# ${name} Persona`);
      await Bun.write(join(memoryDir, 'agents', name, 'knowledge.md'), '');
      await Bun.write(join(memoryDir, 'agents', name, 'last-jobs.md'), '');
    }

    heraldConfig = {
      port: 3117,
      data_dir: join(tempDir, 'data'),
      agents_dir: join(tempDir, 'agents'),
      personas_dir: personasDir,
      memory_dir: memoryDir,
      reports_dir: join(tempDir, 'reports'),
      newspaper_dir: join(tempDir, 'newspaper'),
      log_level: 'info',
    };

    registry = new AgentRegistry();
    mockAdapter = new MockSdkAdapter();
    sessionManager = new SessionManager(mockAdapter);
    cycleManager = new PatrolCycleManager();

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('executes multiple agents concurrently', async () => {
    const agents = [
      { name: 'agent-a', config: makeConfig('agent-a') },
      { name: 'agent-b', config: makeConfig('agent-b') },
    ];
    for (const a of agents) registry.register(a.name, a.config);

    const result = await cycleManager.executeCycle(agents, heraldConfig, sessionManager, registry);

    expect(result.agents).toHaveLength(2);
    expect(result.agents[0].status).toBe('success');
    expect(result.agents[1].status).toBe('success');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('maintains failure isolation — one failure does not affect others', async () => {
    mockAdapter.failForAgents.add('agent-b');

    const agents = [
      { name: 'agent-a', config: makeConfig('agent-a') },
      { name: 'agent-b', config: makeConfig('agent-b') },
      { name: 'agent-c', config: makeConfig('agent-c') },
    ];
    for (const a of agents) registry.register(a.name, a.config);

    const result = await cycleManager.executeCycle(agents, heraldConfig, sessionManager, registry);

    expect(result.agents).toHaveLength(3);
    expect(result.agents[0].status).toBe('success');
    expect(result.agents[1].status).toBe('failed');
    expect(result.agents[2].status).toBe('success');
  });

  it('records cycle-level metrics', async () => {
    const agents = [{ name: 'agent-a', config: makeConfig('agent-a') }];
    registry.register('agent-a', makeConfig('agent-a'));

    const result = await cycleManager.executeCycle(agents, heraldConfig, sessionManager, registry);

    expect(result.cycleId).toMatch(/^\d{8}-\d{6}-[a-z0-9]{4}$/);
    expect(result.startedAt).toBeTruthy();
    expect(result.finishedAt).toBeTruthy();
    expect(result.schedule).toBe('30 5,11,17,23 * * *');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('stores last cycle result', async () => {
    expect(cycleManager.getLastCycleResult()).toBeNull();

    const agents = [{ name: 'agent-a', config: makeConfig('agent-a') }];
    registry.register('agent-a', makeConfig('agent-a'));

    await cycleManager.executeCycle(agents, heraldConfig, sessionManager, registry);

    const last = cycleManager.getLastCycleResult();
    expect(last).not.toBeNull();
    expect(last?.agents).toHaveLength(1);
  });

  it('handles all agents failing gracefully', async () => {
    mockAdapter.failForAgents.add('agent-a');
    mockAdapter.failForAgents.add('agent-b');

    const agents = [
      { name: 'agent-a', config: makeConfig('agent-a') },
      { name: 'agent-b', config: makeConfig('agent-b') },
    ];
    for (const a of agents) registry.register(a.name, a.config);

    const result = await cycleManager.executeCycle(agents, heraldConfig, sessionManager, registry);

    expect(result.agents[0].status).toBe('failed');
    expect(result.agents[1].status).toBe('failed');
  });

  it('writes reports for each agent in the cycle', async () => {
    const agents = [
      { name: 'agent-a', config: makeConfig('agent-a') },
      { name: 'agent-b', config: makeConfig('agent-b') },
    ];
    for (const a of agents) registry.register(a.name, a.config);

    const result = await cycleManager.executeCycle(agents, heraldConfig, sessionManager, registry);

    // Check reports were written
    for (const agentResult of result.agents) {
      const reportPath = join(tempDir, 'reports', agentResult.name, `${agentResult.runId}.md`);
      const file = Bun.file(reportPath);
      expect(await file.exists()).toBe(true);
    }
  });
});
