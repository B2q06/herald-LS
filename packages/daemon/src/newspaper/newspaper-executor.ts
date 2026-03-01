import { join } from 'node:path';
import type { HeraldConfig } from '@herald/shared';
import type { AgentRegistry } from '../agent-loader/agent-registry.ts';
import { executeRun } from '../session/run-executor.ts';
import type { SessionManager } from '../session/session-manager.ts';
import {
  buildSynthesisPrompt,
  ensureEditionDir,
  gatherResearchReports,
} from './team-orchestrator.ts';

export interface NewspaperRunResult {
  runId: string;
  status: 'success' | 'failed';
  editionDate: string;
  sourcesUsed: string[];
  sourcesMissing: string[];
  editionDir: string;
}

/**
 * Execute a newspaper synthesis run:
 * 1. Gather latest reports from team-eligible research agents
 * 2. Ensure edition directory exists
 * 3. Copy each researcher's report to sources/{agent-name}.md
 * 4. Build synthesis prompt with gathered research
 * 5. Run newspaper agent via standard executeRun() pipeline
 * 6. Write synthesis output to sources/editorial.md
 *
 * Uses the existing executeRun() pipeline so that reports, transcripts,
 * and post-run hooks all work identically to research agent runs.
 */
export async function executeNewspaperRun(
  registry: AgentRegistry,
  sessionManager: SessionManager,
  heraldConfig: HeraldConfig,
  _postRunContext?: unknown,
  mode: 'daily' | 'weekly' = 'daily',
): Promise<NewspaperRunResult> {
  const newspaperAgent = registry.get('newspaper');
  if (!newspaperAgent) {
    throw new Error('Newspaper agent not registered');
  }

  const editionDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Step 1: Gather research reports
  const { available, missing } = await gatherResearchReports(registry, heraldConfig);

  console.log(
    `[herald:newspaper] Gathered ${available.size} reports, ${missing.length} missing: ${missing.join(', ') || 'none'}`,
  );

  // Step 2: Ensure edition directory
  const editionDir =
    mode === 'weekly'
      ? join(heraldConfig.newspaper_dir, 'weekly')
      : await ensureEditionDir(heraldConfig, editionDate);

  if (mode === 'weekly') {
    const { mkdir } = await import('node:fs/promises');
    await mkdir(editionDir, { recursive: true });
  }

  // Step 3: Copy each researcher's report to sources/{agent-name}.md
  // This makes the edition self-contained (not dependent on reports/ directory)
  if (mode === 'daily') {
    const sourcesDir = join(editionDir, 'sources');
    for (const [agentName, content] of available) {
      const agentSourcePath = join(sourcesDir, `${agentName}.md`);
      await Bun.write(agentSourcePath, content);
      console.log(`[herald:newspaper] Copied ${agentName} report to ${agentSourcePath}`);
    }
  }

  // Step 4: Build synthesis prompt
  const outputPath =
    mode === 'weekly'
      ? join(editionDir, `${editionDate}-weekly.md`)
      : join(editionDir, 'sources', 'editorial.md');

  const prompt = buildSynthesisPrompt(available, missing, editionDate, outputPath, mode);

  // Step 5: Execute via standard pipeline
  const runResult = await executeRun(
    'newspaper',
    newspaperAgent.config,
    heraldConfig,
    sessionManager,
    registry,
    prompt,
  );

  // Step 6: Write synthesis to edition sources/editorial.md (even if agent already wrote it)
  // This ensures we always have the output persisted (NFR3: zero data loss)
  if (runResult.status === 'success') {
    await Bun.write(outputPath, runResult.result);
    console.log(`[herald:newspaper] Edition written to ${outputPath}`);
  }

  return {
    runId: runResult.runId,
    status: runResult.status,
    editionDate,
    sourcesUsed: [...available.keys()],
    sourcesMissing: missing,
    editionDir,
  };
}
