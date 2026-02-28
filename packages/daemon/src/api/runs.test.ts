import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AgentConfig, HeraldConfig } from '@herald/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentRegistry } from '../agent-loader/agent-registry.ts';
import type { SdkAdapter, SendMessageParams, SendMessageResult } from '../session/sdk-adapter.ts';
import { SessionManager } from '../session/session-manager.ts';
import { createApp } from './index.ts';

class MockSdkAdapter implements SdkAdapter {
  public response: SendMessageResult = {
    text: 'Mock agent response',
    inputTokens: 100,
    outputTokens: 50,
  };

  async sendMessage(_params: SendMessageParams): Promise<SendMessageResult> {
    return this.response;
  }
}

describe('run routes', () => {
  let registry: AgentRegistry;
  let sessionManager: SessionManager;
  let mockAdapter: MockSdkAdapter;
  let tempDir: string;
  let heraldConfig: HeraldConfig;

  const makeConfig = (name: string): AgentConfig => ({
    name,
    persona: `${name}.md`,
    output_dir: `reports/${name}`,
    session_limit: 10,
    notify_policy: 'failures',
    team_eligible: false,
  });

  beforeEach(async () => {
    tempDir = join(tmpdir(), `herald-runs-test-${Date.now()}`);
    const personasDir = join(tempDir, 'personas');
    const memoryDir = join(tempDir, 'memory');

    await mkdir(personasDir, { recursive: true });
    await mkdir(join(memoryDir, 'agents', 'test-agent'), { recursive: true });
    await Bun.write(join(personasDir, 'test-agent.md'), '# Test Persona');
    await Bun.write(join(memoryDir, 'agents', 'test-agent', 'knowledge.md'), '');
    await Bun.write(join(memoryDir, 'agents', 'test-agent', 'last-jobs.md'), '');

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

    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('POST /api/agents/:name/run', () => {
    it('returns 404 when agent not found', async () => {
      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/agents/nonexistent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'hello' }),
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('Agent not found');
    });

    it('returns 503 when SDK not configured', async () => {
      registry.register('test-agent', makeConfig('test-agent'));

      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: false,
      });

      const res = await app.request('/api/agents/test-agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'hello' }),
      });

      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.error).toBe('SDK not configured');
    });

    it('runs agent and returns structured result', async () => {
      registry.register('test-agent', makeConfig('test-agent'));

      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/agents/test-agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Do your thing' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.result).toBe('Mock agent response');
      expect(body.runId).toBeDefined();
      expect(body.status).toBe('success');
      expect(body.startedAt).toBeDefined();
      expect(body.finishedAt).toBeDefined();
    });

    it('works without prompt in body', async () => {
      registry.register('test-agent', makeConfig('test-agent'));

      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/agents/test-agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.result).toBeDefined();
      expect(body.runId).toBeDefined();
    });
  });

  describe('GET /api/agents/:name/runs', () => {
    it('returns 404 when agent not found', async () => {
      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/agents/nonexistent/runs');
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('Agent not found');
    });

    it('returns empty list when no runs exist', async () => {
      registry.register('test-agent', makeConfig('test-agent'));

      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/agents/test-agent/runs');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.runs).toEqual([]);
    });

    it('returns runs after executing an agent', async () => {
      registry.register('test-agent', makeConfig('test-agent'));

      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      // Run the agent first
      await app.request('/api/agents/test-agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Do your thing' }),
      });

      const res = await app.request('/api/agents/test-agent/runs');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.runs).toHaveLength(1);
      expect(body.runs[0].runId).toBeDefined();
      expect(body.runs[0].status).toBe('success');
      expect(body.runs[0].startedAt).toBeDefined();
      expect(body.runs[0].finishedAt).toBeDefined();
    });
  });

  describe('GET /api/agents/:name/status', () => {
    it('returns 404 when agent not found', async () => {
      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/agents/nonexistent/status');

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('Agent not found');
    });

    it('returns idle status for agent with no session', async () => {
      registry.register('test-agent', makeConfig('test-agent'));

      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/agents/test-agent/status');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('idle');
      expect(body.interactionCount).toBe(0);
    });

    it('returns status after agent has run', async () => {
      registry.register('test-agent', makeConfig('test-agent'));

      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      // Run the agent first
      await app.request('/api/agents/test-agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'hello' }),
      });

      const res = await app.request('/api/agents/test-agent/status');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.status).toBe('idle');
      expect(body.interactionCount).toBe(1);
    });
  });

  describe('backward compatibility', () => {
    it('existing agent routes still work when run routes are also mounted', async () => {
      registry.register('test-agent', makeConfig('test-agent'));

      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/agents');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.agents).toHaveLength(1);
    });

    it('createApp still works with registry-only (backward compat)', async () => {
      registry.register('test-agent', makeConfig('test-agent'));
      const app = createApp(registry);

      const res = await app.request('/api/agents');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.agents).toHaveLength(1);
    });
  });
});
