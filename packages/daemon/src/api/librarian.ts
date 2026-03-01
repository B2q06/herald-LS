import { Hono } from 'hono';
import type { MemoryLibrarian } from '../librarian/ask-librarian.ts';

export function createLibrarianRoutes(librarian: MemoryLibrarian) {
  const routes = new Hono();

  routes.post('/api/librarian/query', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const { question, agent } = body as { question?: string; agent?: string };

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return c.json({ error: 'Missing or empty "question" field' }, 400);
    }

    const result = await librarian.query(question.trim(), { agent });

    return c.json({
      question: question.trim(),
      agent: agent ?? null,
      ftsResults: result.ftsResults,
      vectorResults: result.vectorResults,
      markdown: result.markdown,
    });
  });

  return routes;
}
