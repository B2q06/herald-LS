import { join, resolve } from 'node:path';
import type { AgentConfig, HeraldConfig } from '@herald/shared';
import type { MemoryLibrarian } from '../librarian/ask-librarian.ts';

export interface PersonaContext {
  systemPrompt: string;
  previousState: string | null;
  knowledgePath: string;
}

async function readFileIfExists(path: string): Promise<string> {
  const file = Bun.file(path);
  if (await file.exists()) {
    return file.text();
  }
  return '';
}

async function loadDiscoveryModeRules(heraldConfig: HeraldConfig, mode: string): Promise<string> {
  // discovery-modes.md lives alongside agents_dir in the project root
  const projectRoot = resolve(heraldConfig.agents_dir, '..');
  const modesPath = join(projectRoot, 'config', 'discovery-modes.md');
  const content = await readFileIfExists(modesPath);
  if (!content) return '';

  // Extract the section for the active mode
  const modeHeader = `## ${mode.charAt(0).toUpperCase() + mode.slice(1)}`;
  const idx = content.indexOf(modeHeader);
  if (idx === -1) return '';

  // Find the next ## header or end of file
  const nextHeader = content.indexOf('\n## ', idx + modeHeader.length);
  const section = nextHeader === -1 ? content.slice(idx) : content.slice(idx, nextHeader);

  return section.trim();
}

/**
 * Extract key topics from knowledge.md content for cross-agent querying.
 * Pulls from ### headers in the Domain Knowledge section.
 */
function extractTopics(knowledgeContent: string): string[] {
  if (!knowledgeContent.trim()) return [];

  const topics: string[] = [];
  const lines = knowledgeContent.split('\n');
  let inDomainKnowledge = false;

  for (const line of lines) {
    if (line.startsWith('## Domain Knowledge')) {
      inDomainKnowledge = true;
      continue;
    }
    if (line.startsWith('## ') && inDomainKnowledge) {
      break; // Next section
    }
    if (inDomainKnowledge && line.startsWith('### ')) {
      // Extract topic title, removing any parenthetical dates
      const title = line.slice(4).replace(/\s*\(.*?\)\s*$/, '').trim();
      if (title) topics.push(title);
    }
  }

  // Limit to top 5 topics to keep prompt injection manageable
  return topics.slice(0, 5);
}

export async function loadPersonaContext(
  agentConfig: AgentConfig,
  heraldConfig: HeraldConfig,
  librarian?: MemoryLibrarian,
): Promise<PersonaContext> {
  // 1. Read persona MD from config.persona path
  const personaPath = join(heraldConfig.personas_dir, agentConfig.persona);
  const personaContent = await readFileIfExists(personaPath);

  // 2. Read knowledge.md from memory/agents/{name}/knowledge.md
  const knowledgePath = join(heraldConfig.memory_dir, 'agents', agentConfig.name, 'knowledge.md');
  const knowledgeContent = await readFileIfExists(knowledgePath);

  // 3. Read last-jobs.md (may be empty)
  const lastJobsPath = join(heraldConfig.memory_dir, 'agents', agentConfig.name, 'last-jobs.md');
  const lastJobsContent = await readFileIfExists(lastJobsPath);
  const previousState = lastJobsContent.trim().length > 0 ? lastJobsContent : null;

  // 4. Build system prompt
  let systemPrompt = personaContent;

  // 5. Inject agent configuration context
  const discoveryMode = agentConfig.discovery_mode ?? 'moderate';
  systemPrompt += `\n\n## Active Configuration
- Agent: ${agentConfig.name}
- Discovery Mode: ${discoveryMode}
- Schedule: ${agentConfig.schedule ?? 'manual'}
- Output Directory: ${agentConfig.output_dir}`;

  // 6. Inject knowledge with write instructions
  const absKnowledgePath = resolve(knowledgePath);
  if (knowledgeContent.trim().length > 0) {
    systemPrompt += `\n\n## Your Knowledge Base
The following is your persistent knowledge. After your patrol, update the relevant sections if you formed new opinions, made predictions, or gained domain knowledge.

Knowledge file location: ${absKnowledgePath}

${knowledgeContent}`;
  } else {
    systemPrompt += `\n\n## Your Knowledge Base
Your knowledge base is empty — this may be your first patrol. After your patrol, write your initial domain knowledge, opinions, and predictions.

Knowledge file location: ${absKnowledgePath}`;
  }

  // 7. Inject discovery mode behavioral rules
  const modeRules = await loadDiscoveryModeRules(heraldConfig, discoveryMode);
  if (modeRules) {
    systemPrompt += `\n\n## Active Discovery Mode Rules\n${modeRules}`;
  }

  // 8. Inject cross-agent intelligence (if librarian available)
  if (librarian) {
    try {
      // Extract key topics from agent's knowledge for cross-referencing
      const topics = extractTopics(knowledgeContent);
      if (topics.length > 0) {
        const crossAgentSection = await librarian.queryForAgent(agentConfig.name, topics);
        if (crossAgentSection) {
          systemPrompt += `\n\n${crossAgentSection}`;
        }
      }
    } catch {
      // Cross-agent intelligence is optional — degrade gracefully
    }
  }

  return { systemPrompt, previousState, knowledgePath: absKnowledgePath };
}
