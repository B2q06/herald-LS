import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { AgentConfig, HeraldConfig } from '@herald/shared';
import type { AgentRegistry } from '../agent-loader/agent-registry.ts';
import type { HeraldDatabase } from '../db/database.ts';
import type { OllamaEmbedder } from '../embedding/ollama-client.ts';
import { writeTranscript } from '../logger/transcript-writer.ts';
import type { FeaturedStoryDeps } from '../newspaper/featured-story.ts';
import type { SessionManager } from './session-manager.ts';

export interface PostRunContext {
  db: HeraldDatabase;
  embedder: OllamaEmbedder;
  heraldConfig?: HeraldConfig;
  featuredStoryDeps?: FeaturedStoryDeps;
}

export interface RunResult {
  runId: string;
  status: 'success' | 'failed';
  result: string;
  startedAt: string;
  finishedAt: string;
}

export function generateRunId(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const mo = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const h = String(now.getUTCHours()).padStart(2, '0');
  const mi = String(now.getUTCMinutes()).padStart(2, '0');
  const s = String(now.getUTCSeconds()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 6);
  return `${y}${mo}${d}-${h}${mi}${s}-${rand}`;
}

async function writeReport(
  agentName: string,
  runId: string,
  startedAt: string,
  finishedAt: string,
  status: 'success' | 'failed',
  content: string,
  heraldConfig: HeraldConfig,
  config?: AgentConfig,
): Promise<void> {
  const reportDir = join(heraldConfig.reports_dir, agentName);
  await mkdir(reportDir, { recursive: true });

  const frontmatterLines = [
    '---',
    `agent: ${agentName}`,
    `run_id: "${runId}"`,
    `started_at: "${startedAt}"`,
    `finished_at: "${finishedAt}"`,
    `status: ${status}`,
  ];
  if (config?.discovery_mode) {
    frontmatterLines.push(`discovery_mode: ${config.discovery_mode}`);
  }
  frontmatterLines.push('---');

  const frontmatter = frontmatterLines.join('\n');

  // Agent output includes its own headers per persona report format — don't add a duplicate
  const report = `${frontmatter}\n\n${content}\n`;
  const filepath = join(reportDir, `${runId}.md`);
  await Bun.write(filepath, report);
}

export async function executeRun(
  agentName: string,
  config: AgentConfig,
  heraldConfig: HeraldConfig,
  sessionManager: SessionManager,
  registry?: AgentRegistry,
  prompt?: string,
  postRunContext?: PostRunContext,
): Promise<RunResult> {
  const runId = generateRunId();
  const startedAt = new Date().toISOString();

  try {
    const result = await sessionManager.runAgent(agentName, config, heraldConfig, prompt);
    const finishedAt = new Date().toISOString();

    // SessionManager swallows errors and returns "Error: ..." strings,
    // so check session status to detect failures
    const sessionStatus = sessionManager.getStatus(agentName);
    const isFailed = sessionStatus === 'failed';
    const status: 'success' | 'failed' = isFailed ? 'failed' : 'success';

    // Write report to reports/{agent-name}/{runId}.md
    await writeReport(
      agentName,
      runId,
      startedAt,
      finishedAt,
      status,
      result,
      heraldConfig,
      config,
    );

    // Write transcript
    const messages = sessionManager.getSession(agentName)?.messages ?? [];
    await writeTranscript(agentName, runId, messages, heraldConfig);

    // Update agent registry with last run info
    if (registry) {
      registry.updateLastRun(agentName, {
        runId,
        status,
        startedAt,
        finishedAt,
      });
    }

    // Fire-and-forget post-run hooks (indexing + knowledge sync)
    if (postRunContext && status === 'success') {
      const reportPath = join(heraldConfig.reports_dir, agentName, `${runId}.md`);
      firePostRunHooks(agentName, runId, reportPath, config, heraldConfig, postRunContext);
    }

    return { runId, status, result, startedAt, finishedAt };
  } catch (err) {
    const finishedAt = new Date().toISOString();
    const error = err instanceof Error ? err.message : String(err);

    await writeReport(
      agentName,
      runId,
      startedAt,
      finishedAt,
      'failed',
      error,
      heraldConfig,
      config,
    );

    // Update agent registry with failed run info
    if (registry) {
      registry.updateLastRun(agentName, {
        runId,
        status: 'failed',
        startedAt,
        finishedAt,
      });
    }

    return { runId, status: 'failed', result: error, startedAt, finishedAt };
  }
}

/**
 * Fire-and-forget post-run hooks: index report for search + sync knowledge,
 * detect breaking events, and detect featured stories.
 * Never throws — all errors are caught and logged.
 */
function firePostRunHooks(
  agentName: string,
  runId: string,
  reportPath: string,
  config: AgentConfig,
  heraldConfig: HeraldConfig,
  ctx: PostRunContext,
): void {
  // Dynamic imports to avoid circular deps and keep the module lightweight
  Promise.all([
    import('../librarian/post-run-hook.ts').then(({ processRunOutput }) =>
      processRunOutput({
        agentName,
        runId,
        reportPath,
        db: ctx.db,
        embedder: ctx.embedder,
      }),
    ),
    import('../librarian/connections-writer.ts').then(({ writeConnections }) =>
      writeConnections(ctx.db, heraldConfig.memory_dir),
    ),
    import('../memory/knowledge-manager.ts').then(({ KnowledgeManager }) => {
      const km = new KnowledgeManager(ctx.db);
      const knowledgePath = join(heraldConfig.memory_dir, 'agents', agentName, 'knowledge.md');
      return km.syncKnowledge(agentName, knowledgePath);
    }),
    // Check for breaking event in report text content
    import('../newspaper/breaking-update.ts').then(async ({ processBreakingUpdate }) => {
      const reportContent = await Bun.file(reportPath).text();

      // Strip frontmatter to get the text body
      const bodyContent = reportContent.replace(/^---\n[\s\S]*?\n---\n*/, '').trimStart();

      // Check if first line starts with BREAKING:
      const firstLine = bodyContent.split('\n')[0];
      if (!firstLine || !firstLine.startsWith('BREAKING:')) return;

      // Extract headline from the BREAKING: prefix line
      const headline = firstLine.replace(/^BREAKING:\s*/, '').trim();
      if (!headline) return;

      // Extract the breaking section content (everything up to the next ## heading or end)
      const nextHeading = bodyContent.indexOf('\n## ', 1);
      const breakingContent =
        nextHeading > -1 ? bodyContent.slice(0, nextHeading).trim() : bodyContent.trim();

      await processBreakingUpdate(
        {
          source_agent: agentName,
          headline,
          content: breakingContent,
          urgency: 'high',
          detected_at: new Date().toISOString(),
        },
        { heraldConfig },
      );
    }).catch((err) => {
      console.error('[herald] Breaking event detection error:', (err as Error).message);
    }),
  ]).catch((err) => {
    console.error('[herald] Post-run hook error:', (err as Error).message);
  });

  // Check for featured stories (newspaper agent only)
  if (agentName === 'newspaper') {
    import('../newspaper/featured-story.ts')
      .then(async ({ parseFeaturedStoriesFromFrontmatter, processAllFeaturedStories }) => {
        const reportContent = await Bun.file(reportPath).text();
        const stories = parseFeaturedStoriesFromFrontmatter(reportContent);

        if (stories && stories.length > 0) {
          console.log(
            `[herald:newspaper] Found ${stories.length} featured story(ies) -- triggering dedicated research`,
          );

          // Need registry and sessionManager from a wider context
          // These are passed via an expanded PostRunContext
          if (!ctx.featuredStoryDeps) return;

          await processAllFeaturedStories(stories, ctx.featuredStoryDeps);
        }
      })
      .catch((err) => {
        console.error('[herald] Featured story processing error:', (err as Error).message);
      });
  }
}
