import type { HeraldConfig } from '@herald/shared';
import { HeraldConfigSchema } from '@herald/shared';
import yaml from 'js-yaml';

export async function loadConfig(configPath = 'herald.config.yaml'): Promise<HeraldConfig> {
  const file = Bun.file(configPath);
  if (!(await file.exists())) {
    throw new Error(`Config file not found: ${configPath}`);
  }
  const text = await file.text();

  const raw = yaml.load(text) as Record<string, unknown> | null;
  const config: Record<string, unknown> = raw ?? {};

  // Apply env var overrides
  if (process.env.HERALD_PORT !== undefined) {
    config.port = Number(process.env.HERALD_PORT);
  }
  if (process.env.HERALD_DATA_DIR !== undefined) {
    config.data_dir = process.env.HERALD_DATA_DIR;
  }
  if (process.env.HERALD_LOG_LEVEL !== undefined) {
    config.log_level = process.env.HERALD_LOG_LEVEL;
  }

  return HeraldConfigSchema.parse(config);
}
