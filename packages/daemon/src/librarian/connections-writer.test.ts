import { mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HeraldDatabase } from '../db/database.ts';
import { writeConnections } from './connections-writer.ts';

describe('writeConnections', () => {
  let tempDir: string;
  let memoryDir: string;
  let db: HeraldDatabase;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `herald-conn-test-${Date.now()}`);
    memoryDir = join(tempDir, 'memory');
    await mkdir(tempDir, { recursive: true });
    const dbPath = join(tempDir, 'test.sqlite');

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    db = new HeraldDatabase(dbPath);

    // Create required tables
    db.db.run(`
      CREATE TABLE IF NOT EXISTS entities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        first_seen_by TEXT NOT NULL,
        mention_count INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(name, entity_type)
      )
    `);
    db.db.run(`
      CREATE TABLE IF NOT EXISTS entity_mentions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_id INTEGER NOT NULL REFERENCES entities(id),
        agent_name TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_id TEXT NOT NULL,
        context TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  });

  afterEach(async () => {
    db.close();
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('generates connections.md for entities mentioned by 2+ agents', async () => {
    // Insert shared entity
    db.db.run(
      `INSERT INTO entities (name, entity_type, first_seen_by, mention_count) VALUES (?, ?, ?, ?)`,
      ['GPT-4', 'tech', 'ml-researcher', 5],
    );
    const entityId = db.db.query<{ id: number }, []>('SELECT last_insert_rowid() as id').get()!.id;

    // Insert mentions from two different agents
    db.db.run(
      `INSERT INTO entity_mentions (entity_id, agent_name, source_type, source_id) VALUES (?, ?, ?, ?)`,
      [entityId, 'ml-researcher', 'run-report', 'run-001'],
    );
    db.db.run(
      `INSERT INTO entity_mentions (entity_id, agent_name, source_type, source_id) VALUES (?, ?, ?, ?)`,
      [entityId, 'compute-researcher', 'run-report', 'run-002'],
    );

    await writeConnections(db, memoryDir);

    const content = await readFile(join(memoryDir, 'shared', 'connections.md'), 'utf-8');
    expect(content).toContain('# Cross-Agent Knowledge Connections');
    expect(content).toContain('*Auto-generated — do not edit manually*');
    expect(content).toContain('### GPT-4 (tech)');
    expect(content).toContain('First seen by: ml-researcher');
    expect(content).toContain('Also referenced by: compute-researcher');
    expect(content).toContain('Total mentions: 5');
  });

  it('does not generate file when no shared entities exist', async () => {
    // Insert entity mentioned by only one agent
    db.db.run(
      `INSERT INTO entities (name, entity_type, first_seen_by, mention_count) VALUES (?, ?, ?, ?)`,
      ['PyTorch', 'tech', 'ml-researcher', 3],
    );
    const entityId = db.db.query<{ id: number }, []>('SELECT last_insert_rowid() as id').get()!.id;

    db.db.run(
      `INSERT INTO entity_mentions (entity_id, agent_name, source_type, source_id) VALUES (?, ?, ?, ?)`,
      [entityId, 'ml-researcher', 'run-report', 'run-001'],
    );

    await writeConnections(db, memoryDir);

    // File should not be created since no entity is mentioned by 2+ agents
    const { existsSync } = await import('node:fs');
    expect(existsSync(join(memoryDir, 'shared', 'connections.md'))).toBe(false);
  });

  it('includes multiple shared entities sorted by mention count', async () => {
    // Entity 1: mentioned by 2 agents, high count
    db.db.run(
      `INSERT INTO entities (name, entity_type, first_seen_by, mention_count) VALUES (?, ?, ?, ?)`,
      ['Anthropic', 'org', 'ml-researcher', 10],
    );
    const id1 = db.db.query<{ id: number }, []>('SELECT last_insert_rowid() as id').get()!.id;
    db.db.run(
      `INSERT INTO entity_mentions (entity_id, agent_name, source_type, source_id) VALUES (?, ?, ?, ?)`,
      [id1, 'ml-researcher', 'run-report', 'run-001'],
    );
    db.db.run(
      `INSERT INTO entity_mentions (entity_id, agent_name, source_type, source_id) VALUES (?, ?, ?, ?)`,
      [id1, 'ai-tooling-researcher', 'run-report', 'run-002'],
    );

    // Entity 2: mentioned by 2 agents, lower count
    db.db.run(
      `INSERT INTO entities (name, entity_type, first_seen_by, mention_count) VALUES (?, ?, ?, ?)`,
      ['CUDA', 'tech', 'compute-researcher', 3],
    );
    const id2 = db.db.query<{ id: number }, []>('SELECT last_insert_rowid() as id').get()!.id;
    db.db.run(
      `INSERT INTO entity_mentions (entity_id, agent_name, source_type, source_id) VALUES (?, ?, ?, ?)`,
      [id2, 'compute-researcher', 'run-report', 'run-003'],
    );
    db.db.run(
      `INSERT INTO entity_mentions (entity_id, agent_name, source_type, source_id) VALUES (?, ?, ?, ?)`,
      [id2, 'ml-researcher', 'run-report', 'run-004'],
    );

    await writeConnections(db, memoryDir);

    const content = await readFile(join(memoryDir, 'shared', 'connections.md'), 'utf-8');

    // Higher mention count should appear first
    const anthropicPos = content.indexOf('### Anthropic');
    const cudaPos = content.indexOf('### CUDA');
    expect(anthropicPos).toBeLessThan(cudaPos);

    expect(content).toContain('Total mentions: 10');
    expect(content).toContain('Total mentions: 3');
  });

  it('lists all referencing agents', async () => {
    // Entity mentioned by 3 agents
    db.db.run(
      `INSERT INTO entities (name, entity_type, first_seen_by, mention_count) VALUES (?, ?, ?, ?)`,
      ['NeurIPS', 'event', 'ml-researcher', 7],
    );
    const entityId = db.db.query<{ id: number }, []>('SELECT last_insert_rowid() as id').get()!.id;

    db.db.run(
      `INSERT INTO entity_mentions (entity_id, agent_name, source_type, source_id) VALUES (?, ?, ?, ?)`,
      [entityId, 'ml-researcher', 'run-report', 'run-001'],
    );
    db.db.run(
      `INSERT INTO entity_mentions (entity_id, agent_name, source_type, source_id) VALUES (?, ?, ?, ?)`,
      [entityId, 'ai-tooling-researcher', 'run-report', 'run-002'],
    );
    db.db.run(
      `INSERT INTO entity_mentions (entity_id, agent_name, source_type, source_id) VALUES (?, ?, ?, ?)`,
      [entityId, 'compute-researcher', 'run-report', 'run-003'],
    );

    await writeConnections(db, memoryDir);

    const content = await readFile(join(memoryDir, 'shared', 'connections.md'), 'utf-8');
    expect(content).toContain('Also referenced by: ai-tooling-researcher, compute-researcher');
  });

  it('creates directory structure if it does not exist', async () => {
    const nestedMemoryDir = join(tempDir, 'deep', 'nested', 'memory');

    db.db.run(
      `INSERT INTO entities (name, entity_type, first_seen_by, mention_count) VALUES (?, ?, ?, ?)`,
      ['OpenAI', 'org', 'agent-a', 2],
    );
    const entityId = db.db.query<{ id: number }, []>('SELECT last_insert_rowid() as id').get()!.id;
    db.db.run(
      `INSERT INTO entity_mentions (entity_id, agent_name, source_type, source_id) VALUES (?, ?, ?, ?)`,
      [entityId, 'agent-a', 'run-report', 'run-001'],
    );
    db.db.run(
      `INSERT INTO entity_mentions (entity_id, agent_name, source_type, source_id) VALUES (?, ?, ?, ?)`,
      [entityId, 'agent-b', 'run-report', 'run-002'],
    );

    await writeConnections(db, nestedMemoryDir);

    const content = await readFile(join(nestedMemoryDir, 'shared', 'connections.md'), 'utf-8');
    expect(content).toContain('### OpenAI (org)');
  });
});
