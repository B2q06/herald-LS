import { Database } from 'bun:sqlite';
import * as sqliteVec from 'sqlite-vec';
import { applyMigrations } from './migrator.ts';

export class HeraldDatabase {
  public readonly db: Database;
  private vecLoaded = false;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.run('PRAGMA journal_mode = WAL');
    this.db.run('PRAGMA foreign_keys = ON');

    // Load sqlite-vec extension
    try {
      sqliteVec.load(this.db);
      this.vecLoaded = true;
    } catch (err) {
      console.warn('[herald] sqlite-vec not available — vector search disabled:', (err as Error).message);
    }
  }

  get hasVec(): boolean {
    return this.vecLoaded;
  }

  async applyMigrations(migrationsDir: string): Promise<number> {
    return applyMigrations(this.db, migrationsDir);
  }

  /**
   * Create a per-agent vec0 virtual table for embeddings (1024-dim float vectors).
   * No-ops if sqlite-vec is unavailable or table already exists.
   */
  createVecTable(agentName: string): boolean {
    if (!this.vecLoaded) return false;
    const tableName = this.vecTableName(agentName);
    try {
      this.db.run(`
        CREATE VIRTUAL TABLE IF NOT EXISTS "${tableName}"
        USING vec0(embedding float[1024], source_id INTEGER)
      `);
      return true;
    } catch (err) {
      console.warn(`[herald] Failed to create vec table for ${agentName}:`, (err as Error).message);
      return false;
    }
  }

  vecTableName(agentName: string): string {
    return `vec_embeddings_${agentName.replace(/-/g, '_')}`;
  }

  close(): void {
    this.db.close();
  }
}
