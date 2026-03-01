import { mkdir, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AgentConfig, HeraldConfig } from '@herald/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentRegistry } from '../agent-loader/agent-registry.ts';
import { scaffoldAgentDirs } from '../agent-loader/scaffolder.ts';
import { PatrolCycleManager } from '../scheduler/patrol-cycle.ts';
import type { SdkAdapter, SendMessageParams, SendMessageResult } from '../session/sdk-adapter.ts';
import { SessionManager } from '../session/session-manager.ts';

class MockResearchAdapter implements SdkAdapter {
  public failForAgents: Set<string> = new Set();

  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    for (const name of this.failForAgents) {
      if (params.systemPrompt.includes(name)) {
        throw new Error(`Simulated failure for ${name}`);
      }
    }

    // Return a realistic-looking patrol report based on the agent's persona
    let agentName = 'unknown';
    if (params.systemPrompt.includes('ML Researcher')) agentName = 'ml-researcher';
    else if (params.systemPrompt.includes('Compute Researcher')) agentName = 'compute-researcher';
    else if (params.systemPrompt.includes('AI Tooling Researcher'))
      agentName = 'ai-tooling-researcher';

    return {
      text: `# ${agentName} Patrol — Mock\n\n## Headlines\nMock patrol output for ${agentName}.\n\n## Key Findings\nNo real findings — this is a test.\n`,
      inputTokens: 500,
      outputTokens: 200,
    };
  }
}

describe('Patrol Integration — Full Research Agent Roster', () => {
  let tempDir: string;
  let heraldConfig: HeraldConfig;
  let registry: AgentRegistry;
  let sessionManager: SessionManager;
  let mockAdapter: MockResearchAdapter;
  let cycleManager: PatrolCycleManager;

  const researchAgents: AgentConfig[] = [
    {
      name: 'ml-researcher',
      persona: 'ml-researcher.md',
      schedule: '30 5,11,17,23 * * *',
      output_dir: 'reports/ml-researcher',
      session_limit: 15,
      notify_policy: 'failures',
      team_eligible: true,
      discovery_mode: 'aggressive',
      memory_paths: {
        knowledge: 'memory/agents/ml-researcher/knowledge.md',
        preferences: 'memory/agents/ml-researcher/preferences.md',
        last_jobs: 'memory/agents/ml-researcher/last-jobs.md',
        rag: 'memory/agents/ml-researcher/rag',
      },
    },
    {
      name: 'compute-researcher',
      persona: 'compute-researcher.md',
      schedule: '30 5,11,17,23 * * *',
      output_dir: 'reports/compute-researcher',
      session_limit: 15,
      notify_policy: 'failures',
      team_eligible: true,
      discovery_mode: 'aggressive',
      memory_paths: {
        knowledge: 'memory/agents/compute-researcher/knowledge.md',
        preferences: 'memory/agents/compute-researcher/preferences.md',
        last_jobs: 'memory/agents/compute-researcher/last-jobs.md',
        rag: 'memory/agents/compute-researcher/rag',
      },
    },
    {
      name: 'ai-tooling-researcher',
      persona: 'ai-tooling-researcher.md',
      schedule: '30 5,11,17,23 * * *',
      output_dir: 'reports/ai-tooling-researcher',
      session_limit: 15,
      notify_policy: 'failures',
      team_eligible: true,
      discovery_mode: 'aggressive',
      memory_paths: {
        knowledge: 'memory/agents/ai-tooling-researcher/knowledge.md',
        preferences: 'memory/agents/ai-tooling-researcher/preferences.md',
        last_jobs: 'memory/agents/ai-tooling-researcher/last-jobs.md',
        rag: 'memory/agents/ai-tooling-researcher/rag',
      },
    },
  ];

  beforeEach(async () => {
    tempDir = join(tmpdir(), `herald-integration-test-${Date.now()}`);
    const personasDir = join(tempDir, 'personas');
    const memoryDir = join(tempDir, 'memory');
    const agentsDir = join(tempDir, 'agents');

    await mkdir(personasDir, { recursive: true });
    await mkdir(agentsDir, { recursive: true });

    heraldConfig = {
      port: 3117,
      data_dir: join(tempDir, 'data'),
      agents_dir: agentsDir,
      personas_dir: personasDir,
      memory_dir: memoryDir,
      reports_dir: join(tempDir, 'reports'),
      newspaper_dir: join(tempDir, 'newspaper'),
      log_level: 'info',
    };

    // Create persona files for all 3 agents
    await Bun.write(
      join(personasDir, 'ml-researcher.md'),
      '# The Scholar — ML Researcher\nYou are the ML Researcher.',
    );
    await Bun.write(
      join(personasDir, 'compute-researcher.md'),
      '# The Market Analyst — Compute Researcher\nYou are the Compute Researcher.',
    );
    await Bun.write(
      join(personasDir, 'ai-tooling-researcher.md'),
      '# The Practitioner — AI Tooling Researcher\nYou are the AI Tooling Researcher.',
    );

    // Create discovery modes config
    await mkdir(join(tempDir, 'config'), { recursive: true });
    await Bun.write(
      join(tempDir, 'config', 'discovery-modes.md'),
      '# Discovery Modes\n\n## Aggressive\n\nCast a wide net. Follow tangents.\n\n## Moderate\n\nStick to domain.\n\n## Conservative\n\nHard boundaries.\n',
    );

    registry = new AgentRegistry();
    mockAdapter = new MockResearchAdapter();
    sessionManager = new SessionManager(mockAdapter);
    cycleManager = new PatrolCycleManager();

    // Register all agents and scaffold their directories
    for (const config of researchAgents) {
      registry.register(config.name, config);
      await scaffoldAgentDirs(config.name, config, {
        memoryDir: heraldConfig.memory_dir,
        reportsDir: heraldConfig.reports_dir,
      });
    }

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('registers all 3 research agents', () => {
    const all = Array.from(registry.getAll());
    expect(all).toHaveLength(3);

    const names = all.map(([name]) => name).sort();
    expect(names).toEqual(['ai-tooling-researcher', 'compute-researcher', 'ml-researcher']);
  });

  it('scaffolds memory directories for all agents', async () => {
    for (const config of researchAgents) {
      const agentMemDir = join(heraldConfig.memory_dir, 'agents', config.name);
      const contents = await readdir(agentMemDir);
      expect(contents).toContain('knowledge.md');
      expect(contents).toContain('preferences.md');
      expect(contents).toContain('last-jobs.md');
      expect(contents).toContain('rag');
    }
  });

  it('creates knowledge.md with opinion/prediction template', async () => {
    for (const config of researchAgents) {
      const knowledgePath = join(heraldConfig.memory_dir, 'agents', config.name, 'knowledge.md');
      const content = await Bun.file(knowledgePath).text();
      expect(content).toContain('Knowledge Base');
      expect(content).toContain('## Developing Opinions');
      expect(content).toContain('## Predictions Log');
      expect(content).toContain('## Accountability');
      expect(content).toContain('Calibration Record');
    }
  });

  it('runs all 3 agents in parallel patrol cycle', async () => {
    const agents = researchAgents.map((config) => ({ name: config.name, config }));

    const result = await cycleManager.executeCycle(agents, heraldConfig, sessionManager, registry);

    expect(result.agents).toHaveLength(3);
    for (const agentResult of result.agents) {
      expect(agentResult.status).toBe('success');
      expect(agentResult.runId).toMatch(/^\d{8}-\d{6}-[a-z0-9]{4}$/);
    }
  });

  it('produces reports in each agent output directory', async () => {
    const agents = researchAgents.map((config) => ({ name: config.name, config }));

    const result = await cycleManager.executeCycle(agents, heraldConfig, sessionManager, registry);

    for (const agentResult of result.agents) {
      const reportPath = join(
        heraldConfig.reports_dir,
        agentResult.name,
        `${agentResult.runId}.md`,
      );
      const content = await Bun.file(reportPath).text();

      // Check frontmatter
      expect(content).toContain('---');
      expect(content).toContain(`agent: ${agentResult.name}`);
      expect(content).toContain('status: success');
      expect(content).toContain('discovery_mode: aggressive');

      // Check agent output
      expect(content).toContain('Patrol');
    }
  });

  it('maintains failure isolation — one agent failure does not block others', async () => {
    mockAdapter.failForAgents.add('compute-researcher');

    const agents = researchAgents.map((config) => ({ name: config.name, config }));
    const result = await cycleManager.executeCycle(agents, heraldConfig, sessionManager, registry);

    const mlResult = result.agents.find((a) => a.name === 'ml-researcher');
    const computeResult = result.agents.find((a) => a.name === 'compute-researcher');
    const toolingResult = result.agents.find((a) => a.name === 'ai-tooling-researcher');

    expect(mlResult?.status).toBe('success');
    expect(computeResult?.status).toBe('failed');
    expect(toolingResult?.status).toBe('success');
  });

  it('updates agent registry with last run info after patrol', async () => {
    const agents = researchAgents.map((config) => ({ name: config.name, config }));

    await cycleManager.executeCycle(agents, heraldConfig, sessionManager, registry);

    for (const config of researchAgents) {
      const agent = registry.get(config.name);
      expect(agent?.lastRun).toBeDefined();
      expect(agent?.lastRun?.status).toBe('success');
      expect(agent?.lastRun?.runId).toMatch(/^\d{8}-\d{6}-[a-z0-9]{4}$/);
    }
  });

  it('all agents share the same schedule', () => {
    for (const config of researchAgents) {
      expect(config.schedule).toBe('30 5,11,17,23 * * *');
    }
  });

  it('all agents have aggressive discovery mode', () => {
    for (const config of researchAgents) {
      expect(config.discovery_mode).toBe('aggressive');
    }
  });

  it('injects discovery mode into system prompt during patrol', async () => {
    const agents = [{ name: 'ml-researcher', config: researchAgents[0] }];

    // Capture what gets sent to the SDK
    const sentParams: SendMessageParams[] = [];
    const origSend = mockAdapter.sendMessage.bind(mockAdapter);
    mockAdapter.sendMessage = async (params: SendMessageParams) => {
      sentParams.push(params);
      return origSend(params);
    };

    await cycleManager.executeCycle(agents, heraldConfig, sessionManager, registry);

    expect(sentParams).toHaveLength(1);
    expect(sentParams[0].systemPrompt).toContain('Discovery Mode: aggressive');
    expect(sentParams[0].systemPrompt).toContain('## Active Configuration');
    expect(sentParams[0].systemPrompt).toContain('## Active Discovery Mode Rules');
    expect(sentParams[0].systemPrompt).toContain('Cast a wide net');
  });
});
