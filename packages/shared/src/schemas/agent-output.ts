import { z } from 'zod';

export const AgentOutputFrontmatterSchema = z.object({
  agent: z.string(),
  run_id: z.string(),
  started_at: z.string().datetime(),
  finished_at: z.string().datetime().optional(),
  status: z.enum(['running', 'success', 'failed', 'cancelled']),
  /** Featured stories identified during synthesis (newspaper agent output only) */
  featured_stories: z
    .array(
      z.object({
        headline: z.string(),
        assigned_agent: z.string(),
        research_prompt: z.string(),
      }),
    )
    .optional(),
});

export type AgentOutputFrontmatter = z.infer<typeof AgentOutputFrontmatterSchema>;
