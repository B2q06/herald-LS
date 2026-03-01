import { z } from 'zod';

export const HeraldConfigSchema = z.object({
  port: z.number().default(3117),
  data_dir: z.string().default('./data'),
  agents_dir: z.string().default('./agents'),
  personas_dir: z.string().default('./personas'),
  memory_dir: z.string().default('./memory'),
  reports_dir: z.string().default('./reports'),
  newspaper_dir: z.string().default('./newspaper'),
  log_level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ollama_url: z.string().default('http://localhost:11434'),
});

export type HeraldConfig = z.infer<typeof HeraldConfigSchema>;
