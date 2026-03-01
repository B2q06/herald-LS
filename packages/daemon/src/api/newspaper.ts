import { BreakingEventSchema, type HeraldConfig } from '@herald/shared';
import { Hono } from 'hono';
import type { AgentRegistry } from '../agent-loader/agent-registry.ts';
import type { SessionManager } from '../session/session-manager.ts';

export interface NewspaperRouteDeps {
  registry: AgentRegistry;
  sessionManager: SessionManager;
  heraldConfig: HeraldConfig;
  sdkConfigured: boolean;
}

export function createNewspaperRoutes(deps: NewspaperRouteDeps) {
  const routes = new Hono();

  // Trigger a newspaper synthesis run
  routes.post('/api/newspaper/run', async (c) => {
    if (!deps.sdkConfigured) {
      return c.json({ error: 'SDK not configured' }, 503);
    }

    if (!deps.registry.has('newspaper')) {
      return c.json({ error: 'Newspaper agent not registered' }, 404);
    }

    const { executeNewspaperRun } = await import('../newspaper/newspaper-executor.ts');
    const result = await executeNewspaperRun(deps.registry, deps.sessionManager, deps.heraldConfig);

    return c.json({
      runId: result.runId,
      status: result.status,
      editionDate: result.editionDate,
      sourcesUsed: result.sourcesUsed,
      sourcesMissing: result.sourcesMissing,
    });
  });

  // Get the latest newspaper edition
  routes.get('/api/newspaper/current', async (c) => {
    const { readdir } = await import('node:fs/promises');
    const { join } = await import('node:path');

    const editionsDir = join(deps.heraldConfig.newspaper_dir, 'editions');
    try {
      const editions = await readdir(editionsDir);
      const sorted = editions.sort().reverse();

      if (sorted.length === 0) {
        return c.json({ error: 'No editions available' }, 404);
      }

      const latestDate = sorted[0];
      const editorialPath = join(editionsDir, latestDate, 'sources', 'editorial.md');
      const file = Bun.file(editorialPath);

      if (!(await file.exists())) {
        return c.json({ error: 'No editorial available for latest edition' }, 404);
      }

      const content = await file.text();
      return c.json({
        editionDate: latestDate,
        content,
      });
    } catch {
      return c.json({ error: 'No editions available' }, 404);
    }
  });

  // List all editions (enriched with headline summaries and git commit info)
  routes.get('/api/newspaper/editions', async (c) => {
    const { listEditions } = await import('../newspaper/edition-manager.ts');
    const editions = await listEditions(deps.heraldConfig.newspaper_dir);
    return c.json({ editions });
  });

  // Get specific edition content
  routes.get('/api/newspaper/editions/:date', async (c) => {
    const { getEdition } = await import('../newspaper/edition-manager.ts');
    const date = c.req.param('date');
    const format = (c.req.query('format') ?? 'md') as 'pdf' | 'html' | 'md';

    if (format === 'pdf') {
      // For PDF, serve binary from filesystem directly
      const { join } = await import('node:path');
      const pdfPath = join(deps.heraldConfig.newspaper_dir, 'editions', date, 'newspaper.pdf');
      const file = Bun.file(pdfPath);
      if (await file.exists()) {
        return new Response(file.stream(), {
          headers: { 'Content-Type': 'application/pdf' },
        });
      }
      return c.json({ error: `PDF not available for ${date}` }, 404);
    }

    const result = await getEdition(deps.heraldConfig.newspaper_dir, date, format);
    if ('error' in result) {
      return c.json({ error: result.error }, 404);
    }
    return c.json(result);
  });

  // Get raw source markdown files for an edition
  routes.get('/api/newspaper/editions/:date/source', async (c) => {
    const { getEditionSources } = await import('../newspaper/edition-manager.ts');
    const date = c.req.param('date');
    const result = await getEditionSources(deps.heraldConfig.newspaper_dir, date);
    if ('error' in result) {
      return c.json({ error: result.error }, 404);
    }
    return c.json(result);
  });

  // List weekly synthesis papers
  routes.get('/api/newspaper/weekly', async (c) => {
    const { listWeeklies } = await import('../newspaper/edition-manager.ts');
    const weeklies = await listWeeklies(deps.heraldConfig.newspaper_dir);
    return c.json({ weekly: weeklies });
  });

  // Get a specific weekly paper
  routes.get('/api/newspaper/weekly/:date', async (c) => {
    const { getWeekly } = await import('../newspaper/edition-manager.ts');
    const date = c.req.param('date');
    const result = await getWeekly(deps.heraldConfig.newspaper_dir, date);
    if ('error' in result) {
      return c.json({ error: result.error }, 404);
    }
    return c.json(result);
  });

  // --- Story 4.2: Compilation routes ---

  // Trigger compilation for a given date
  routes.post('/api/newspaper/compile', async (c) => {
    const { runNewspaperPipeline } = await import('../newspaper/pipeline.ts');

    let date: string;
    try {
      const body = await c.req.json();
      date = body.date ?? new Date().toISOString().split('T')[0];
    } catch {
      date = new Date().toISOString().split('T')[0];
    }

    const result = await runNewspaperPipeline(date, deps.heraldConfig);
    return c.json(result);
  });

  // Serve current edition PDF
  routes.get('/api/newspaper/current/pdf', async (c) => {
    const { readdir } = await import('node:fs/promises');
    const { join } = await import('node:path');

    const editionsDir = join(deps.heraldConfig.newspaper_dir, 'editions');
    try {
      const editions = await readdir(editionsDir);
      const sorted = editions.sort().reverse();
      if (sorted.length === 0) {
        return c.json({ error: 'No editions available' }, 404);
      }
      const today = sorted[0];
      const pdfPath = join(editionsDir, today, 'newspaper.pdf');
      const file = Bun.file(pdfPath);
      if (!(await file.exists())) {
        return c.json(
          { error: 'PDF not available — try /api/newspaper/current/markdown for raw content' },
          404,
        );
      }
      return new Response(file.stream(), {
        headers: { 'Content-Type': 'application/pdf' },
      });
    } catch {
      return c.json({ error: 'No editions available' }, 404);
    }
  });

  // Serve current edition HTML
  routes.get('/api/newspaper/current/html', async (c) => {
    const { readdir } = await import('node:fs/promises');
    const { join } = await import('node:path');

    const editionsDir = join(deps.heraldConfig.newspaper_dir, 'editions');
    try {
      const editions = await readdir(editionsDir);
      const sorted = editions.sort().reverse();
      if (sorted.length === 0) {
        return c.json({ error: 'No editions available' }, 404);
      }
      const today = sorted[0];
      const htmlPath = join(editionsDir, today, 'newspaper.html');
      const file = Bun.file(htmlPath);
      if (!(await file.exists())) {
        return c.json(
          { error: 'HTML not available — try /api/newspaper/current/markdown for raw content' },
          404,
        );
      }
      return new Response(file.stream(), {
        headers: { 'Content-Type': 'text/html' },
      });
    } catch {
      return c.json({ error: 'No editions available' }, 404);
    }
  });

  // Serve current edition markdown
  routes.get('/api/newspaper/current/markdown', async (c) => {
    const { readdir } = await import('node:fs/promises');
    const { join } = await import('node:path');

    const editionsDir = join(deps.heraldConfig.newspaper_dir, 'editions');
    try {
      const editions = await readdir(editionsDir);
      const sorted = editions.sort().reverse();
      if (sorted.length === 0) {
        return c.json({ error: 'No editions available' }, 404);
      }
      const today = sorted[0];
      const mdPath = join(editionsDir, today, 'combined.typ');
      const file = Bun.file(mdPath);
      if (!(await file.exists())) {
        return c.json({ error: 'Markdown not available' }, 404);
      }
      return new Response(file.stream(), {
        headers: { 'Content-Type': 'text/markdown' },
      });
    } catch {
      return c.json({ error: 'No editions available' }, 404);
    }
  });

  // Serve specific edition PDF
  routes.get('/api/newspaper/editions/:date/pdf', async (c) => {
    const { join } = await import('node:path');

    const date = c.req.param('date');
    const pdfPath = join(deps.heraldConfig.newspaper_dir, 'editions', date, 'newspaper.pdf');
    const file = Bun.file(pdfPath);
    if (!(await file.exists())) {
      return c.json(
        {
          error: `PDF not available for ${date} — try /api/newspaper/editions/${date}/markdown for raw content`,
        },
        404,
      );
    }
    return new Response(file.stream(), {
      headers: { 'Content-Type': 'application/pdf' },
    });
  });

  // Serve specific edition HTML
  routes.get('/api/newspaper/editions/:date/html', async (c) => {
    const { join } = await import('node:path');

    const date = c.req.param('date');
    const htmlPath = join(deps.heraldConfig.newspaper_dir, 'editions', date, 'newspaper.html');
    const file = Bun.file(htmlPath);
    if (!(await file.exists())) {
      return c.json(
        {
          error: `HTML not available for ${date} — try /api/newspaper/editions/${date}/markdown for raw content`,
        },
        404,
      );
    }
    return new Response(file.stream(), {
      headers: { 'Content-Type': 'text/html' },
    });
  });

  // Serve specific edition markdown
  routes.get('/api/newspaper/editions/:date/markdown', async (c) => {
    const { join } = await import('node:path');

    const date = c.req.param('date');
    const mdPath = join(deps.heraldConfig.newspaper_dir, 'editions', date, 'combined.typ');
    const file = Bun.file(mdPath);
    if (!(await file.exists())) {
      return c.json({ error: `Markdown not available for ${date}` }, 404);
    }
    return new Response(file.stream(), {
      headers: { 'Content-Type': 'text/markdown' },
    });
  });

  // --- Story 4.4: Breaking update routes ---

  // Submit a breaking event for immediate newspaper update
  routes.post('/api/newspaper/breaking', async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body) {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const parsed = BreakingEventSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: 'Validation error', detail: parsed.error.format() },
        400,
      );
    }

    try {
      const { processBreakingUpdate } = await import(
        '../newspaper/breaking-update.ts'
      );
      const result = await processBreakingUpdate(parsed.data, {
        heraldConfig: deps.heraldConfig,
      });
      return c.json(result, 201);
    } catch (err) {
      console.error(
        '[herald:api] Breaking update processing failed:',
        (err as Error).message,
      );
      return c.json({ error: 'Failed to process breaking update' }, 500);
    }
  });

  // List all breaking updates for a given edition date
  routes.get('/api/newspaper/updates/:date', async (c) => {
    const date = c.req.param('date');

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return c.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, 400);
    }

    const { listBreakingUpdates } = await import(
      '../newspaper/breaking-update.ts'
    );
    const updates = await listBreakingUpdates(date, deps.heraldConfig);
    return c.json({ updates, editionDate: date });
  });

  return routes;
}
