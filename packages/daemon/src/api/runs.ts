import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { HeraldConfig } from '@herald/shared';
import { Hono } from 'hono';
import type { AgentRegistry } from '../agent-loader/agent-registry.ts';
import type { PostRunContext } from '../session/run-executor.ts';
import { executeRun } from '../session/run-executor.ts';
import type { SessionManager } from '../session/session-manager.ts';

export interface RunRouteDeps {
  registry: AgentRegistry;
  sessionManager: SessionManager;
  heraldConfig: HeraldConfig;
  sdkConfigured: boolean;
  postRunContext?: PostRunContext;
}

function parseFrontmatter(content: string): Record<string, string> | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const result: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();
    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

export function createRunRoutes(deps: RunRouteDeps) {
  const routes = new Hono();

  routes.post('/api/agents/:name/run', async (c) => {
    const name = c.req.param('name');

    // Check agent exists
    if (!deps.registry.has(name)) {
      return c.json({ error: 'Agent not found' }, 404);
    }

    // Check SDK configured
    if (!deps.sdkConfigured) {
      return c.json({ error: 'SDK not configured' }, 503);
    }

    const agent = deps.registry.get(name);
    if (!agent) {
      return c.json({ error: 'Agent not found' }, 404);
    }

    const body = await c.req.json().catch(() => ({}));
    const prompt = (body as { prompt?: string }).prompt;

    const runResult = await executeRun(
      name,
      agent.config,
      deps.heraldConfig,
      deps.sessionManager,
      deps.registry,
      prompt,
      deps.postRunContext,
    );

    return c.json({
      runId: runResult.runId,
      result: runResult.result,
      status: runResult.status,
      startedAt: runResult.startedAt,
      finishedAt: runResult.finishedAt,
    });
  });

  routes.get('/api/agents/:name/runs', async (c) => {
    const name = c.req.param('name');

    // Check agent exists
    if (!deps.registry.has(name)) {
      return c.json({ error: 'Agent not found' }, 404);
    }

    const reportsDir = join(deps.heraldConfig.reports_dir, name);

    let files: string[];
    try {
      files = await readdir(reportsDir);
    } catch {
      // Directory doesn't exist — no runs yet
      return c.json({ runs: [] });
    }

    const mdFiles = files
      .filter((f) => f.endsWith('.md'))
      .sort()
      .reverse();

    const runs: Array<{
      runId: string;
      status: string;
      startedAt: string;
      finishedAt: string;
    }> = [];

    for (const file of mdFiles) {
      const filepath = join(reportsDir, file);
      const content = await Bun.file(filepath).text();
      const frontmatter = parseFrontmatter(content);
      if (frontmatter) {
        runs.push({
          runId: frontmatter.run_id ?? file.replace('.md', ''),
          status: frontmatter.status ?? 'unknown',
          startedAt: frontmatter.started_at ?? '',
          finishedAt: frontmatter.finished_at ?? '',
        });
      }
    }

    return c.json({ runs });
  });

  routes.get('/api/agents/:name/status', (c) => {
    const name = c.req.param('name');

    // Check agent exists
    if (!deps.registry.has(name)) {
      return c.json({ error: 'Agent not found' }, 404);
    }

    const session = deps.sessionManager.getSession(name);
    const status = deps.sessionManager.getStatus(name);

    return c.json({
      status,
      interactionCount: session?.interactionCount ?? 0,
      ...(session?.lastError ? { lastError: session.lastError } : {}),
    });
  });

  return routes;
}
