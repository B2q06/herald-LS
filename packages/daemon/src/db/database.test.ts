import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HeraldDatabase } from './database.ts';

describe('HeraldDatabase', () => {
  let tempDir: string;
  let dbPath: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `herald-db-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    dbPath = join(tempDir, 'test.sqlite');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('creates database with WAL mode', () => {
    const hdb = new HeraldDatabase(dbPath);
    try {
      const result = hdb.db.query<{ journal_mode: string }, []>('PRAGMA journal_mode').get();
      expect(result?.journal_mode).toBe('wal');
    } finally {
      hdb.close();
    }
  });

  it('enables foreign keys', () => {
    const hdb = new HeraldDatabase(dbPath);
    try {
      const result = hdb.db.query<{ foreign_keys: number }, []>('PRAGMA foreign_keys').get();
      expect(result?.foreign_keys).toBe(1);
    } finally {
      hdb.close();
    }
  });

  it('reports whether sqlite-vec is loaded', () => {
    const hdb = new HeraldDatabase(dbPath);
    try {
      // sqlite-vec may or may not be available in test environment
      expect(typeof hdb.hasVec).toBe('boolean');
    } finally {
      hdb.close();
    }
  });

  it('applies migrations via applyMigrations()', async () => {
    const migrationsDir = join(tempDir, 'migrations');
    await mkdir(migrationsDir, { recursive: true });
    await writeFile(
      join(migrationsDir, '001_test.sql'),
      'CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT);',
    );

    const hdb = new HeraldDatabase(dbPath);
    try {
      const count = await hdb.applyMigrations(migrationsDir);
      expect(count).toBe(1);

      // Verify table exists
      const tables = hdb.db
        .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type='table' AND name='test_table'")
        .all();
      expect(tables).toHaveLength(1);
    } finally {
      hdb.close();
    }
  });

  it('generates correct vec table name', () => {
    const hdb = new HeraldDatabase(dbPath);
    try {
      expect(hdb.vecTableName('ml-researcher')).toBe('vec_embeddings_ml_researcher');
      expect(hdb.vecTableName('test_agent')).toBe('vec_embeddings_test_agent');
    } finally {
      hdb.close();
    }
  });

  describe('createVecTable', () => {
    it('returns false when sqlite-vec is not loaded', () => {
      const hdb = new HeraldDatabase(dbPath);
      try {
        if (!hdb.hasVec) {
          expect(hdb.createVecTable('test-agent')).toBe(false);
        }
      } finally {
        hdb.close();
      }
    });

    it('creates vec table when sqlite-vec is available', () => {
      const hdb = new HeraldDatabase(dbPath);
      try {
        if (hdb.hasVec) {
          const result = hdb.createVecTable('test-agent');
          expect(result).toBe(true);

          // Table should exist
          const tables = hdb.db
            .query<{ name: string }, []>(
              "SELECT name FROM sqlite_master WHERE type='table' AND name='vec_embeddings_test_agent'",
            )
            .all();
          expect(tables).toHaveLength(1);
        }
      } finally {
        hdb.close();
      }
    });
  });

  it('closes cleanly', () => {
    const hdb = new HeraldDatabase(dbPath);
    hdb.close();
    // Should not throw when closing again (idempotent)
    expect(() => hdb.close()).not.toThrow();
  });
});
