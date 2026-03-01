import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import type { HeraldConfig } from '@herald/shared';
import { HeraldDatabase } from './database.ts';

export { HeraldDatabase } from './database.ts';
export { applyMigrations } from './migrator.ts';

export async function initDatabase(heraldConfig: HeraldConfig): Promise<HeraldDatabase> {
  await mkdir(heraldConfig.data_dir, { recursive: true });

  const dbPath = join(heraldConfig.data_dir, 'herald.sqlite');
  const db = new HeraldDatabase(dbPath);

  // Apply migrations from data/migrations/
  const migrationsDir = join(heraldConfig.data_dir, 'migrations');
  const applied = await db.applyMigrations(migrationsDir);
  if (applied > 0) {
    console.log(`[herald] Database initialized — ${applied} migration(s) applied`);
  } else {
    console.log('[herald] Database initialized — up to date');
  }

  return db;
}
