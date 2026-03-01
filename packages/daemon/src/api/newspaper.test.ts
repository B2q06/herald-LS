import { mkdir, rm, writeFile } from 'node:fs/promises';
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
    text: '# Herald Daily Brief -- 2026-02-28\n\n## Top Stories\n\nSome content',
    inputTokens: 100,
    outputTokens: 50,
  };

  async sendMessage(_params: SendMessageParams): Promise<SendMessageResult> {
    return this.response;
  }
}

describe('newspaper routes', () => {
  let registry: AgentRegistry;
  let sessionManager: SessionManager;
  let mockAdapter: MockSdkAdapter;
  let tempDir: string;
  let heraldConfig: HeraldConfig;

  const makeConfig = (name: string, teamEligible = false): AgentConfig => ({
    name,
    persona: `${name}.md`,
    output_dir: `reports/${name}`,
    session_limit: 5,
    notify_policy: 'all',
    team_eligible: teamEligible,
  });

  beforeEach(async () => {
    tempDir = join(tmpdir(), `herald-newspaper-api-test-${Date.now()}`);
    const personasDir = join(tempDir, 'personas');
    const memoryDir = join(tempDir, 'memory');

    await mkdir(personasDir, { recursive: true });
    await mkdir(join(memoryDir, 'agents', 'newspaper'), { recursive: true });
    await Bun.write(join(personasDir, 'newspaper.md'), '# Newspaper Persona');
    await Bun.write(join(memoryDir, 'agents', 'newspaper', 'knowledge.md'), '');
    await Bun.write(join(memoryDir, 'agents', 'newspaper', 'last-jobs.md'), '');

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

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('POST /api/newspaper/run', () => {
    it('returns 503 when SDK not configured', async () => {
      registry.register('newspaper', makeConfig('newspaper'));

      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: false,
      });

      const res = await app.request('/api/newspaper/run', { method: 'POST' });
      expect(res.status).toBe(503);

      const body = await res.json();
      expect(body.error).toBe('SDK not configured');
    });

    it('returns 404 when newspaper agent not registered', async () => {
      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/run', { method: 'POST' });
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error).toBe('Newspaper agent not registered');
    });

    it('triggers newspaper synthesis and returns result', async () => {
      registry.register('newspaper', makeConfig('newspaper'));

      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/run', { method: 'POST' });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.runId).toBeDefined();
      expect(body.status).toBe('success');
      expect(body.editionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(body.sourcesUsed).toBeDefined();
      expect(body.sourcesMissing).toBeDefined();
    });
  });

  describe('GET /api/newspaper/current', () => {
    it('returns 404 when no editions exist', async () => {
      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/current');
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error).toContain('No editions available');
    });

    it('returns latest edition when available', async () => {
      // Create an edition directory with editorial
      const editionsDir = join(heraldConfig.newspaper_dir, 'editions', '2026-02-28');
      const sourcesDir = join(editionsDir, 'sources');
      await mkdir(sourcesDir, { recursive: true });
      await writeFile(
        join(sourcesDir, 'editorial.md'),
        '# Herald Daily Brief -- 2026-02-28\n\nContent here',
      );

      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/current');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.editionDate).toBe('2026-02-28');
      expect(body.content).toContain('Herald Daily Brief');
    });

    it('returns the most recent edition date', async () => {
      // Create multiple editions
      for (const date of ['2026-02-26', '2026-02-27', '2026-02-28']) {
        const sourcesDir = join(heraldConfig.newspaper_dir, 'editions', date, 'sources');
        await mkdir(sourcesDir, { recursive: true });
        await writeFile(join(sourcesDir, 'editorial.md'), `# Herald Daily Brief -- ${date}`);
      }

      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/current');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.editionDate).toBe('2026-02-28');
    });
  });

  describe('GET /api/newspaper/editions', () => {
    it('returns empty list when no editions exist', async () => {
      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/editions');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.editions).toEqual([]);
    });

    it('returns sorted list of editions with enriched data', async () => {
      for (const date of ['2026-02-26', '2026-02-28', '2026-02-27']) {
        const editionDir = join(heraldConfig.newspaper_dir, 'editions', date);
        await mkdir(join(editionDir, 'sources'), { recursive: true });
        await writeFile(join(editionDir, 'sources', 'editorial.md'), `# Herald -- ${date}`);
      }

      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/editions');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.editions).toHaveLength(3);
      expect(body.editions[0].date).toBe('2026-02-28');
      expect(body.editions[1].date).toBe('2026-02-27');
      expect(body.editions[2].date).toBe('2026-02-26');
      // Each edition should have a headline from filesystem
      expect(body.editions[0].headline).toContain('Herald');
    });
  });

  // --- Story 4.2: Compilation route tests ---

  describe('POST /api/newspaper/compile', () => {
    it('triggers compilation and returns pipeline result', async () => {
      // Create source files for the pipeline to find
      const sourcesDir = join(heraldConfig.newspaper_dir, 'editions', '2026-02-28', 'sources');
      const templatesDir = join(heraldConfig.newspaper_dir, 'templates');
      await mkdir(sourcesDir, { recursive: true });
      await mkdir(templatesDir, { recursive: true });
      await writeFile(join(sourcesDir, 'editorial.md'), '# Test Editorial');
      await writeFile(join(templatesDir, 'newspaper.typ'), 'template');

      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: '2026-02-28' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBeDefined();
      expect(body.errors).toBeDefined();
    });

    it('defaults to today when no date provided', async () => {
      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/compile', {
        method: 'POST',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      // No sources for today, should return no-sources
      expect(body.status).toBe('no-sources');
    });
  });

  describe('GET /api/newspaper/current/pdf', () => {
    it('returns 404 when no editions exist', async () => {
      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/current/pdf');
      expect(res.status).toBe(404);
    });

    it('returns 404 when PDF does not exist', async () => {
      const editionDir = join(heraldConfig.newspaper_dir, 'editions', '2026-02-28');
      await mkdir(editionDir, { recursive: true });

      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/current/pdf');
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error).toContain('PDF not available');
    });

    it('serves PDF with correct content type', async () => {
      const editionDir = join(heraldConfig.newspaper_dir, 'editions', '2026-02-28');
      await mkdir(editionDir, { recursive: true });
      await writeFile(join(editionDir, 'newspaper.pdf'), 'fake pdf content');

      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/current/pdf');
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/pdf');
    });
  });

  describe('GET /api/newspaper/current/html', () => {
    it('returns 404 when HTML does not exist', async () => {
      const editionDir = join(heraldConfig.newspaper_dir, 'editions', '2026-02-28');
      await mkdir(editionDir, { recursive: true });

      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/current/html');
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error).toContain('HTML not available');
    });

    it('serves HTML with correct content type', async () => {
      const editionDir = join(heraldConfig.newspaper_dir, 'editions', '2026-02-28');
      await mkdir(editionDir, { recursive: true });
      await writeFile(join(editionDir, 'newspaper.html'), '<html><body>Test</body></html>');

      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/current/html');
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('text/html');
    });
  });

  describe('GET /api/newspaper/current/markdown', () => {
    it('returns 404 when markdown does not exist', async () => {
      const editionDir = join(heraldConfig.newspaper_dir, 'editions', '2026-02-28');
      await mkdir(editionDir, { recursive: true });

      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/current/markdown');
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error).toContain('Markdown not available');
    });

    it('serves markdown with correct content type', async () => {
      const editionDir = join(heraldConfig.newspaper_dir, 'editions', '2026-02-28');
      await mkdir(editionDir, { recursive: true });
      await writeFile(join(editionDir, 'combined.typ'), '= Test Content');

      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/current/markdown');
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('text/markdown');
    });
  });

  describe('GET /api/newspaper/editions/:date/pdf', () => {
    it('returns 404 when PDF does not exist for date', async () => {
      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/editions/2026-02-28/pdf');
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error).toContain('PDF not available for 2026-02-28');
    });

    it('serves edition PDF with correct content type', async () => {
      const editionDir = join(heraldConfig.newspaper_dir, 'editions', '2026-02-28');
      await mkdir(editionDir, { recursive: true });
      await writeFile(join(editionDir, 'newspaper.pdf'), 'fake pdf');

      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/editions/2026-02-28/pdf');
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/pdf');
    });
  });

  describe('GET /api/newspaper/editions/:date/html', () => {
    it('returns 404 when HTML does not exist for date', async () => {
      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/editions/2026-02-28/html');
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error).toContain('HTML not available for 2026-02-28');
    });

    it('serves edition HTML with correct content type', async () => {
      const editionDir = join(heraldConfig.newspaper_dir, 'editions', '2026-02-28');
      await mkdir(editionDir, { recursive: true });
      await writeFile(join(editionDir, 'newspaper.html'), '<html>content</html>');

      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/editions/2026-02-28/html');
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('text/html');
    });
  });

  describe('GET /api/newspaper/editions/:date/markdown', () => {
    it('returns 404 when markdown does not exist for date', async () => {
      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/editions/2026-02-28/markdown');
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error).toContain('Markdown not available for 2026-02-28');
    });

    it('serves edition markdown with correct content type', async () => {
      const editionDir = join(heraldConfig.newspaper_dir, 'editions', '2026-02-28');
      await mkdir(editionDir, { recursive: true });
      await writeFile(join(editionDir, 'combined.typ'), '= Content');

      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/editions/2026-02-28/markdown');
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('text/markdown');
    });
  });

  // --- Story 4.3: Edition browsing & management routes ---

  describe('GET /api/newspaper/editions/:date', () => {
    it('returns edition content in md format by default', async () => {
      const editionDir = join(heraldConfig.newspaper_dir, 'editions', '2026-02-28');
      await mkdir(join(editionDir, 'sources'), { recursive: true });
      await writeFile(
        join(editionDir, 'sources', 'editorial.md'),
        '# Herald Daily Edition\n\nTop stories...',
      );

      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/editions/2026-02-28');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.date).toBe('2026-02-28');
      expect(body.format).toBe('md');
      expect(body.content).toContain('Herald Daily Edition');
    });

    it('returns 404 for non-existent edition', async () => {
      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/editions/2099-01-01');
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error).toContain('not found');
    });

    it('returns html format when requested', async () => {
      const editionDir = join(heraldConfig.newspaper_dir, 'editions', '2026-02-28');
      await mkdir(editionDir, { recursive: true });
      await writeFile(join(editionDir, 'newspaper.html'), '<h1>Herald</h1>');

      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/editions/2026-02-28?format=html');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.format).toBe('html');
      expect(body.content).toContain('<h1>Herald</h1>');
    });

    it('serves PDF with binary content type', async () => {
      const editionDir = join(heraldConfig.newspaper_dir, 'editions', '2026-02-28');
      await mkdir(editionDir, { recursive: true });
      await writeFile(join(editionDir, 'newspaper.pdf'), 'fake pdf');

      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/editions/2026-02-28?format=pdf');
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/pdf');
    });
  });

  describe('GET /api/newspaper/editions/:date/source', () => {
    it('returns source markdown files', async () => {
      const sourcesDir = join(heraldConfig.newspaper_dir, 'editions', '2026-02-28', 'sources');
      await mkdir(sourcesDir, { recursive: true });
      await writeFile(join(sourcesDir, 'editorial.md'), '# Editorial');
      await writeFile(join(sourcesDir, 'ml-researcher.md'), '# ML Report');

      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/editions/2026-02-28/source');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.sources['editorial.md']).toContain('Editorial');
      expect(body.sources['ml-researcher.md']).toContain('ML Report');
    });

    it('returns 404 when sources do not exist', async () => {
      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/editions/2099-01-01/source');
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error).toContain('not found');
    });
  });

  describe('GET /api/newspaper/weekly', () => {
    it('returns empty list when no weekly papers exist', async () => {
      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/weekly');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.weekly).toEqual([]);
    });

    it('returns list of weekly papers', async () => {
      const weeklyDir = join(heraldConfig.newspaper_dir, 'weekly');
      await mkdir(weeklyDir, { recursive: true });
      await writeFile(join(weeklyDir, '2026-02-28-weekly.md'), '# Weekly Synthesis');

      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/weekly');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.weekly).toHaveLength(1);
      expect(body.weekly[0].date).toBe('2026-02-28');
      expect(body.weekly[0].weekEnd).toBe('2026-02-28');
    });
  });

  // --- Story 4.4: Breaking update route tests ---

  describe('POST /api/newspaper/breaking', () => {
    it('returns 201 with valid BreakingEvent', async () => {
      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const event = {
        source_agent: 'ml-researcher',
        headline: 'Major GPU Architecture Shift',
        content: 'NVIDIA announces a new architecture...',
        urgency: 'high',
        detected_at: new Date().toISOString(),
      };

      const res = await app.request('/api/newspaper/breaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.updateId).toMatch(/^update-\d{6}$/);
      expect(body.editionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(body.updatePath).toBeTruthy();
    });

    it('returns 400 with invalid JSON body', async () => {
      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/breaking', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'not json',
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('Invalid JSON body');
    });

    it('returns 400 with missing required fields', async () => {
      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/breaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_agent: 'test' }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Validation error');
    });
  });

  describe('GET /api/newspaper/updates/:date', () => {
    it('returns updates for existing edition', async () => {
      const updatesDir = join(
        heraldConfig.newspaper_dir,
        'editions',
        '2026-02-28',
        'updates',
      );
      await mkdir(updatesDir, { recursive: true });
      await writeFile(join(updatesDir, 'update-143045.md'), '# Breaking Update');

      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/updates/2026-02-28');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.editionDate).toBe('2026-02-28');
      expect(body.updates).toHaveLength(1);
      expect(body.updates[0].updateId).toBe('update-143045');
    });

    it('returns empty array for edition without updates', async () => {
      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/updates/2026-02-28');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.updates).toEqual([]);
    });

    it('returns 400 with invalid date format', async () => {
      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/updates/not-a-date');
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error).toContain('Invalid date format');
    });
  });

  describe('GET /api/newspaper/weekly/:date', () => {
    it('returns weekly paper content', async () => {
      const weeklyDir = join(heraldConfig.newspaper_dir, 'weekly');
      await mkdir(weeklyDir, { recursive: true });
      await writeFile(
        join(weeklyDir, '2026-02-28-weekly.md'),
        '# Weekly Strategic Synthesis\n\nTrends...',
      );

      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/weekly/2026-02-28');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.date).toBe('2026-02-28');
      expect(body.content).toContain('Weekly Strategic Synthesis');
    });

    it('returns 404 for non-existent weekly', async () => {
      const app = createApp({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured: true,
      });

      const res = await app.request('/api/newspaper/weekly/2099-01-01');
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error).toContain('not found');
    });
  });
});
