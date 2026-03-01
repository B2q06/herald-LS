import { mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { HeraldConfig } from '@herald/shared';
import type { AgentRegistry } from '../agent-loader/agent-registry.ts';

export interface TeamSynthesisResult {
  synthesisMarkdown: string;
  sourcesUsed: string[];
  sourcesMissing: string[];
  editionDate: string;
}

/**
 * Gather the latest patrol reports from all team-eligible research agents.
 * Returns a map of agent name -> latest report content.
 * Never throws -- missing or failed reports are tracked, not fatal.
 */
export async function gatherResearchReports(
  registry: AgentRegistry,
  heraldConfig: HeraldConfig,
): Promise<{ available: Map<string, string>; missing: string[] }> {
  const available = new Map<string, string>();
  const missing: string[] = [];

  for (const [name, agent] of registry.getAll()) {
    if (!agent.config.team_eligible) continue;

    const reportsDir = join(heraldConfig.reports_dir, name);
    try {
      const files = await readdir(reportsDir);
      const mdFiles = files
        .filter((f) => f.endsWith('.md'))
        .sort()
        .reverse();

      if (mdFiles.length === 0) {
        missing.push(name);
        continue;
      }

      // Read the most recent report
      const latestFile = mdFiles[0];
      const content = await Bun.file(join(reportsDir, latestFile)).text();

      // Check if the report has status: failed in frontmatter
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
      if (frontmatter.includes('status: failed')) {
        missing.push(name);
        continue;
      }

      available.set(name, content);
    } catch {
      // Directory doesn't exist or read error -- agent has no reports
      missing.push(name);
    }
  }

  return { available, missing };
}

/**
 * Build the synthesis prompt for the newspaper agent.
 * Injects all gathered research reports into a structured prompt
 * that the newspaper agent's persona knows how to process.
 */
export function buildSynthesisPrompt(
  reports: Map<string, string>,
  missing: string[],
  editionDate: string,
  outputPath: string,
  mode: 'daily' | 'weekly' = 'daily',
): string {
  const now = new Date();
  let prompt = `Current date: ${editionDate}
Current time: ${now.toISOString().split('T')[1].slice(0, 5)} UTC

You are producing ${mode === 'weekly' ? "this week's Herald Weekly Strategic Synthesis. Focus on overarching trends, multi-day patterns, and strategic insights rather than individual daily findings. Emphasize cross-domain convergences and long-term trajectory shifts." : "today's Herald Daily Brief. Follow your Team Synthesis Workflow."}

## Available Research Reports

`;

  for (const [agentName, content] of reports) {
    prompt += `### Report from: ${agentName}\n\n${content}\n\n---\n\n`;
  }

  if (missing.length > 0) {
    prompt += `## Missing Coverage\n\nThe following researchers have no recent successful reports:\n`;
    for (const name of missing) {
      prompt += `- ${name}\n`;
    }
    prompt += `\nProceed with available research. Note the gaps in your Coverage Notes section.\n\n`;
  }

  prompt += `## Output Instructions

Write the complete newspaper following your Newspaper Format.

IMPORTANT: Your final text response MUST be the complete newspaper markdown. Do NOT summarize what you did. The text you return IS the deliverable.

After writing the newspaper, also write the newspaper markdown to: ${outputPath}
(This file is named editorial.md — it is your editorial synthesis, distinct from the individual researcher source files that are copied alongside it.)

During synthesis, also update your knowledge base with any editorial opinions or cross-domain predictions you form.
`;

  return prompt;
}

/**
 * Ensure the edition directory structure exists.
 * Creates: newspaper/editions/{date}/sources/
 */
export async function ensureEditionDir(
  heraldConfig: HeraldConfig,
  editionDate: string,
): Promise<string> {
  const editionDir = join(heraldConfig.newspaper_dir, 'editions', editionDate);
  const sourcesDir = join(editionDir, 'sources');
  await mkdir(sourcesDir, { recursive: true });
  return editionDir;
}
