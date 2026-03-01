import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { HeraldDatabase } from '../db/database.ts';

interface SharedEntity {
  name: string;
  entity_type: string;
  first_seen_by: string;
  mention_count: number;
  agents: string[];
}

/**
 * Query entities that are mentioned by 2+ agents and generate
 * a shared connections markdown file.
 */
export async function writeConnections(
  db: HeraldDatabase,
  memoryDir: string,
): Promise<void> {
  // Find entities referenced by multiple agents
  const rows = db.db
    .query<
      { name: string; entity_type: string; first_seen_by: string; mention_count: number },
      []
    >(
      `SELECT e.name, e.entity_type, e.first_seen_by, e.mention_count
       FROM entities e
       WHERE e.id IN (
         SELECT entity_id
         FROM entity_mentions
         GROUP BY entity_id
         HAVING COUNT(DISTINCT agent_name) >= 2
       )
       ORDER BY e.mention_count DESC, e.name ASC`,
    )
    .all();

  if (rows.length === 0) return;

  // For each entity, get the list of agents that reference it
  const getAgents = db.db.prepare(
    `SELECT DISTINCT agent_name FROM entity_mentions WHERE entity_id = (
       SELECT id FROM entities WHERE name = ? AND entity_type = ?
     )
     ORDER BY agent_name`,
  );

  const sharedEntities: SharedEntity[] = [];
  for (const row of rows) {
    const agentRows = getAgents.all(row.name, row.entity_type) as { agent_name: string }[];
    sharedEntities.push({
      ...row,
      agents: agentRows.map((a) => a.agent_name),
    });
  }

  // Generate markdown
  const lines: string[] = [
    '# Cross-Agent Knowledge Connections',
    '*Auto-generated — do not edit manually*',
    '',
    '## Shared Entities',
  ];

  for (const entity of sharedEntities) {
    const otherAgents = entity.agents.filter((a) => a !== entity.first_seen_by);
    lines.push(`### ${entity.name} (${entity.entity_type})`);
    lines.push(`- First seen by: ${entity.first_seen_by}`);
    if (otherAgents.length > 0) {
      lines.push(`- Also referenced by: ${otherAgents.join(', ')}`);
    }
    lines.push(`- Total mentions: ${entity.mention_count}`);
    lines.push('');
  }

  const outputPath = join(memoryDir, 'shared', 'connections.md');
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, lines.join('\n'), 'utf-8');
}
