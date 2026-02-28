import { z } from 'zod';

export const AgentOutputFrontmatterSchema = z.object({
  agent: z.string(),
  run_id: z.string(),
  started_at: z.string().datetime(),
  finished_at: z.string().datetime().optional(),
  status: z.enum(['running', 'success', 'failed', 'cancelled']),
});

export type AgentOutputFrontmatter = z.infer<typeof AgentOutputFrontmatterSchema>;
