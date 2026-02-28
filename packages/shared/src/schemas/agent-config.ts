import { z } from 'zod';

export const AgentConfigSchema = z.object({
  name: z.string(),
  persona: z.string(),
  schedule: z.string().optional(),
  output_dir: z.string(),
  session_limit: z.number().default(10),
  notify_policy: z.enum(['all', 'failures', 'urgent', 'none']).default('failures'),
  memory_paths: z
    .object({
      knowledge: z.string(),
      preferences: z.string(),
      last_jobs: z.string(),
      rag: z.string(),
    })
    .optional(),
  trigger_rules: z
    .array(
      z.object({
        watch: z.string(),
        condition: z.string().optional(),
        message: z.string().optional(),
      }),
    )
    .optional(),
  team_eligible: z.boolean().default(false),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;
