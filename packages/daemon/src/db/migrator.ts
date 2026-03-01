import { Database } from 'bun:sqlite';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function applyMigrations(db: Database, migrationsDir: string): Promise<number> {
  // Create migrations tracking table
  db.run(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Read migration files sorted by name
  let files: string[];
  try {
    files = await readdir(migrationsDir);
  } catch {
    console.warn(`[herald] Migrations directory not found: ${migrationsDir}`);
    return 0;
  }

  const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort();
  if (sqlFiles.length === 0) return 0;

  // Get already-applied migrations
  const applied = new Set(
    db
      .query<{ filename: string }, []>('SELECT filename FROM _migrations')
      .all()
      .map((r) => r.filename),
  );

  let count = 0;
  for (const file of sqlFiles) {
    if (applied.has(file)) continue;

    const sql = await readFile(join(migrationsDir, file), 'utf-8');

    db.transaction(() => {
      db.run(sql);
      db.run('INSERT INTO _migrations (filename) VALUES (?)', [file]);
    })();

    console.log(`[herald] Migration applied: ${file}`);
    count++;
  }

  return count;
}
