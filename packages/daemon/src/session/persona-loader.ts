import { join } from 'node:path';
import type { AgentConfig, HeraldConfig } from '@herald/shared';

export interface PersonaContext {
  systemPrompt: string;
  previousState: string | null;
}

export async function loadPersonaContext(
  agentConfig: AgentConfig,
  heraldConfig: HeraldConfig,
): Promise<PersonaContext> {
  // 1. Read persona MD from config.persona path
  const personaPath = join(heraldConfig.personas_dir, agentConfig.persona);
  let personaContent = '';
  const personaFile = Bun.file(personaPath);
  if (await personaFile.exists()) {
    personaContent = await personaFile.text();
  }

  // 2. Read knowledge.md from memory/agents/{name}/knowledge.md
  const knowledgePath = join(heraldConfig.memory_dir, 'agents', agentConfig.name, 'knowledge.md');
  let knowledgeContent = '';
  const knowledgeFile = Bun.file(knowledgePath);
  if (await knowledgeFile.exists()) {
    knowledgeContent = await knowledgeFile.text();
  }

  // 3. Read last-jobs.md (may be empty)
  const lastJobsPath = join(heraldConfig.memory_dir, 'agents', agentConfig.name, 'last-jobs.md');
  let previousState: string | null = null;
  const lastJobsFile = Bun.file(lastJobsPath);
  if (await lastJobsFile.exists()) {
    const content = await lastJobsFile.text();
    if (content.trim().length > 0) {
      previousState = content;
    }
  }

  // 4. Combine: persona + knowledge into systemPrompt
  let systemPrompt = personaContent;
  if (knowledgeContent.trim().length > 0) {
    systemPrompt += `\n\n## Current Knowledge\n${knowledgeContent}`;
  }

  return { systemPrompt, previousState };
}
