import type { AgentConfig, HeraldConfig } from '@herald/shared';
import { beforeEach, describe, expect, it } from 'vitest';
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

  const makeConfig = (name: string): AgentConfig => ({
    name,
    persona: `${name}.md`,
    output_dir: `reports/${name}`,
    session_limit: 10,
    notify_policy: 'failures',
    team_eligible: false,
  });

  const heraldConfig: HeraldConfig = {
    port: 3117,
    data_dir: '/tmp/herald-test/data',
    agents_dir: '/tmp/herald-test/agents',
    personas_dir: '/tmp/herald-test/personas',
    memory_dir: '/tmp/herald-test/memory',
    reports_dir: '/tmp/herald-test/reports',
    newspaper_dir: '/tmp/herald-test/newspaper',
    log_level: 'info',
  };

  beforeEach(() => {
    registry = new AgentRegistry();
    mockAdapter = new MockSdkAdapter();
    sessionManager = new SessionManager(mockAdapter);
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

    it('runs agent and returns result', async () => {
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
      expect(body.status).toBeDefined();
      expect(typeof body.interactionCount).toBe('number');
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
