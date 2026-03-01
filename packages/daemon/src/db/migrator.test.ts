import { Database } from 'bun:sqlite';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyMigrations } from './migrator.ts';

describe('migrator', () => {
  let tempDir: string;
  let migrationsDir: string;
  let db: Database;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `herald-migrator-test-${Date.now()}`);
    migrationsDir = join(tempDir, 'migrations');
    await mkdir(migrationsDir, { recursive: true });
    db = new Database(':memory:');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    db.close();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('creates _migrations table', async () => {
    await applyMigrations(db, migrationsDir);

    const tables = db
      .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'")
      .all();
    expect(tables).toHaveLength(1);
  });

  it('applies SQL migration files in order', async () => {
    await writeFile(
      join(migrationsDir, '001_first.sql'),
      'CREATE TABLE test_a (id INTEGER PRIMARY KEY);',
    );
    await writeFile(
      join(migrationsDir, '002_second.sql'),
      'CREATE TABLE test_b (id INTEGER PRIMARY KEY);',
    );

    const count = await applyMigrations(db, migrationsDir);

    expect(count).toBe(2);

    const tables = db
      .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'test_%'")
      .all()
      .map((r) => r.name)
      .sort();
    expect(tables).toEqual(['test_a', 'test_b']);
  });

  it('skips already-applied migrations', async () => {
    await writeFile(
      join(migrationsDir, '001_first.sql'),
      'CREATE TABLE test_a (id INTEGER PRIMARY KEY);',
    );

    await applyMigrations(db, migrationsDir);

    // Add a second migration
    await writeFile(
      join(migrationsDir, '002_second.sql'),
      'CREATE TABLE test_b (id INTEGER PRIMARY KEY);',
    );

    const count = await applyMigrations(db, migrationsDir);
    expect(count).toBe(1);
  });

  it('ignores non-SQL files', async () => {
    await writeFile(join(migrationsDir, 'readme.md'), '# Migrations');
    await writeFile(
      join(migrationsDir, '001_first.sql'),
      'CREATE TABLE test_only (id INTEGER PRIMARY KEY);',
    );

    const count = await applyMigrations(db, migrationsDir);
    expect(count).toBe(1);
  });

  it('returns 0 when migrations dir does not exist', async () => {
    const count = await applyMigrations(db, join(tempDir, 'nonexistent'));
    expect(count).toBe(0);
  });

  it('records applied migrations', async () => {
    await writeFile(
      join(migrationsDir, '001_first.sql'),
      'CREATE TABLE test_a (id INTEGER PRIMARY KEY);',
    );

    await applyMigrations(db, migrationsDir);

    const records = db
      .query<{ filename: string }, []>('SELECT filename FROM _migrations')
      .all();
    expect(records).toHaveLength(1);
    expect(records[0].filename).toBe('001_first.sql');
  });
});
