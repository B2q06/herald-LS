import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { FeaturedStory, FeaturedStoryReportLink, HeraldConfig } from '@herald/shared';
import type { AgentRegistry } from '../agent-loader/agent-registry.ts';
import { executeRun, type PostRunContext, type RunResult } from '../session/run-executor.ts';
import type { SessionManager } from '../session/session-manager.ts';

export interface FeaturedStoryDeps {
  heraldConfig: HeraldConfig;
  registry: AgentRegistry;
  sessionManager: SessionManager;
  postRunContext?: PostRunContext;
}

export interface FeaturedStoryResult {
  headline: string;
  assignedAgent: string;
  runResult: RunResult | null;
  reportLink: FeaturedStoryReportLink;
}

/**
 * Parse featured stories from the newspaper agent's output frontmatter.
 *
 * The newspaper agent's persona instructs it to include featured_stories
 * in its report frontmatter when it identifies stories worthy of deep coverage.
 * The run-executor writes this frontmatter, and the post-run hook reads it.
 *
 * Expected frontmatter format (written by run-executor based on agent output):
 * ---
 * agent: newspaper
 * featured_stories:
 *   - headline: "New framework threatens React dominance"
 *     assigned_agent: ai-tooling-researcher
 *     research_prompt: "Deep dive into framework X: architecture, benchmarks..."
 * ---
 */
export function parseFeaturedStoriesFromFrontmatter(
  content: string,
): FeaturedStory[] | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  // Look for featured_stories in the frontmatter
  const frontmatterBlock = match[1];
  if (!frontmatterBlock.includes('featured_stories:')) return null;

  // Extract the featured_stories section
  const stories: FeaturedStory[] = [];
  const lines = frontmatterBlock.split('\n');
  let inFeaturedStories = false;
  let currentStory: Partial<FeaturedStory> = {};

  for (const line of lines) {
    if (line.trim() === 'featured_stories:') {
      inFeaturedStories = true;
      continue;
    }
    if (inFeaturedStories) {
      if (line.startsWith('  - headline:')) {
        if (currentStory.headline) {
          stories.push(currentStory as FeaturedStory);
        }
        currentStory = {
          headline: line.replace('  - headline:', '').trim().replace(/^"|"$/g, ''),
          edition_date: new Date().toISOString().split('T')[0],
        };
      } else if (line.startsWith('    assigned_agent:')) {
        currentStory.assigned_agent = line
          .replace('    assigned_agent:', '')
          .trim();
      } else if (line.startsWith('    research_prompt:')) {
        currentStory.research_prompt = line
          .replace('    research_prompt:', '')
          .trim()
          .replace(/^"|"$/g, '');
      } else if (line.startsWith('    summary:')) {
        currentStory.summary = line
          .replace('    summary:', '')
          .trim()
          .replace(/^"|"$/g, '');
      } else if (!line.startsWith('  ') && !line.startsWith('    ')) {
        // End of featured_stories section
        inFeaturedStories = false;
      }
    }
  }
  if (currentStory.headline) {
    stories.push(currentStory as FeaturedStory);
  }

  return stories.length > 0 ? stories : null;
}

/**
 * Trigger a dedicated research report for a featured story.
 *
 * This runs the assigned research agent with a specific deep-dive prompt
 * instead of its standard patrol prompt. The report is written to the
 * researcher's normal output directory (reports/{agent-name}/).
 */
export async function triggerFeaturedStoryResearch(
  story: FeaturedStory,
  deps: FeaturedStoryDeps,
): Promise<FeaturedStoryResult> {
  const { registry, sessionManager, heraldConfig, postRunContext } = deps;

  const reportLink: FeaturedStoryReportLink = {
    headline: story.headline,
    assigned_agent: story.assigned_agent,
    report_path: '',
    report_run_id: '',
    status: 'pending',
  };

  // Check if the assigned agent exists
  if (!registry.has(story.assigned_agent)) {
    console.warn(
      `[herald:newspaper] Featured story assigned to unknown agent "${story.assigned_agent}" -- skipping`,
    );
    reportLink.status = 'failed';
    return {
      headline: story.headline,
      assignedAgent: story.assigned_agent,
      runResult: null,
      reportLink,
    };
  }

  const agent = registry.get(story.assigned_agent);
  if (!agent) {
    reportLink.status = 'failed';
    return {
      headline: story.headline,
      assignedAgent: story.assigned_agent,
      runResult: null,
      reportLink,
    };
  }

  // Build a deep-dive prompt that references the featured story
  const deepDivePrompt = `FEATURED STORY DEEP-DIVE REQUEST

The Herald newspaper has identified a story in your domain that warrants a full dedicated research report.

Headline: ${story.headline}
${story.summary ? `Summary: ${story.summary}` : ''}

Research directive: ${story.research_prompt}

Produce a comprehensive dedicated report on this topic. This is NOT a standard patrol -- focus entirely on this specific story. Go deep: background context, technical analysis, competitive landscape, implications, and actionable recommendations.

Your report should be thorough enough to stand alone as a referenced resource linked from the newspaper's featured story section.

Do not include YAML frontmatter -- that is added automatically.`;

  reportLink.status = 'in_progress';

  try {
    const runResult = await executeRun(
      story.assigned_agent,
      agent.config,
      heraldConfig,
      sessionManager,
      registry,
      deepDivePrompt,
      postRunContext,
    );

    reportLink.report_run_id = runResult.runId;
    reportLink.report_path = `reports/${story.assigned_agent}/${runResult.runId}.md`;
    reportLink.status = runResult.status === 'success' ? 'completed' : 'failed';

    console.log(
      `[herald:newspaper] Featured story report ${runResult.status}: "${story.headline}" by ${story.assigned_agent} (${runResult.runId})`,
    );

    return {
      headline: story.headline,
      assignedAgent: story.assigned_agent,
      runResult,
      reportLink,
    };
  } catch (err) {
    console.error(
      `[herald:newspaper] Featured story research failed for "${story.headline}":`,
      (err as Error).message,
    );
    reportLink.status = 'failed';
    return {
      headline: story.headline,
      assignedAgent: story.assigned_agent,
      runResult: null,
      reportLink,
    };
  }
}

/**
 * Write the featured story links file for a given edition.
 * This file is read by the Typst template to render links to dedicated reports.
 *
 * Written to: newspaper/editions/{date}/featured-links.md
 */
export async function writeFeaturedStoryLinks(
  editionDate: string,
  links: FeaturedStoryReportLink[],
  heraldConfig: HeraldConfig,
): Promise<void> {
  const editionDir = join(heraldConfig.newspaper_dir, 'editions', editionDate);
  await mkdir(editionDir, { recursive: true });

  const linksPath = join(editionDir, 'featured-links.md');

  const linksContent = [
    '---',
    `edition_date: "${editionDate}"`,
    `generated_at: "${new Date().toISOString()}"`,
    '---',
    '',
    '# Featured Story Reports',
    '',
    ...links.map((link) =>
      [
        `## ${link.headline}`,
        `- **Researcher:** ${link.assigned_agent}`,
        `- **Status:** ${link.status}`,
        link.report_path
          ? `- **Report:** [${link.report_run_id}](${link.report_path})`
          : '- **Report:** pending',
        '',
      ].join('\n'),
    ),
  ].join('\n');

  await Bun.write(linksPath, linksContent);
}

/**
 * Process all featured stories from a newspaper synthesis run.
 * Triggers dedicated research for each, writes links, returns results.
 *
 * This is the top-level orchestrator called from the post-run hook.
 */
export async function processAllFeaturedStories(
  stories: FeaturedStory[],
  deps: FeaturedStoryDeps,
): Promise<FeaturedStoryResult[]> {
  const results: FeaturedStoryResult[] = [];

  // Process featured stories sequentially to avoid overloading the SDK
  // (each triggers a full agent run)
  for (const story of stories) {
    const result = await triggerFeaturedStoryResearch(story, deps);
    results.push(result);
  }

  // Write links file for the edition
  const editionDate =
    stories[0]?.edition_date ?? new Date().toISOString().split('T')[0];
  const links = results.map((r) => r.reportLink);
  await writeFeaturedStoryLinks(editionDate, links, deps.heraldConfig);

  return results;
}
