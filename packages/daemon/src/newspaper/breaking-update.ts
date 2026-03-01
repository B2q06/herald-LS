import { mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { type BreakingEvent, BreakingEventSchema, type HeraldConfig } from '@herald/shared';
import { commitEdition } from './git-versioner.ts';
import { runNewspaperPipeline } from './pipeline.ts';

export interface BreakingUpdateDeps {
  heraldConfig: HeraldConfig;
}

export interface BreakingUpdateResult {
  updateId: string;
  updatePath: string;
  editionDate: string;
  recompiled: boolean;
  committed: boolean;
}

/**
 * Get the current edition date string (YYYY-MM-DD).
 * The "current edition" is always today's date. If the morning synthesis
 * hasn't run yet, the breaking update creates the edition directory.
 */
function getCurrentEditionDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Generate a unique update ID based on timestamp.
 * Format: update-HHMMSS to allow chronological sorting.
 */
function generateUpdateId(): string {
  const now = new Date();
  const h = String(now.getUTCHours()).padStart(2, '0');
  const m = String(now.getUTCMinutes()).padStart(2, '0');
  const s = String(now.getUTCSeconds()).padStart(2, '0');
  return `update-${h}${m}${s}`;
}

/**
 * Process a breaking event and append it to the current edition.
 *
 * Breaking updates are written to:
 *   newspaper/editions/{date}/updates/{update-HHMMSS}.md
 *
 * Each update file has YAML frontmatter and the full content.
 * The Typst template (from Story 4.2) must be aware of the updates/ directory
 * and render them as an "Intraday Updates" section distinct from the morning synthesis.
 */
export async function processBreakingUpdate(
  event: BreakingEvent,
  deps: BreakingUpdateDeps,
): Promise<BreakingUpdateResult> {
  // Validate the event
  BreakingEventSchema.parse(event);

  const editionDate = getCurrentEditionDate();
  const editionDir = join(deps.heraldConfig.newspaper_dir, 'editions', editionDate);
  const updatesDir = join(editionDir, 'updates');
  await mkdir(updatesDir, { recursive: true });

  const updateId = generateUpdateId();
  const updatePath = join(updatesDir, `${updateId}.md`);

  // Write the breaking update file
  const frontmatter = [
    '---',
    `source_agent: ${event.source_agent}`,
    `headline: "${event.headline}"`,
    `urgency: ${event.urgency}`,
    `detected_at: "${event.detected_at}"`,
    `update_id: "${updateId}"`,
    event.affected_domains?.length
      ? `affected_domains: [${event.affected_domains.join(', ')}]`
      : null,
    '---',
  ]
    .filter(Boolean)
    .join('\n');

  const updateContent = `${frontmatter}\n\n## ${event.headline}\n\n${event.content}\n`;
  await Bun.write(updatePath, updateContent);

  console.log(
    `[herald:newspaper] Breaking update written: ${updateId} from ${event.source_agent}`,
  );

  // Recompile through Typst pipeline (from Story 4.2)
  let recompiled = false;
  try {
    await runNewspaperPipeline(editionDate, deps.heraldConfig);
    recompiled = true;
    console.log('[herald:newspaper] Edition recompiled for breaking update');
  } catch (err) {
    console.error(
      '[herald:newspaper] Typst recompilation failed:',
      (err as Error).message,
    );
    // Edition still available as raw markdown -- NFR18 compliance
  }

  // Re-commit to git branch (from Story 4.3)
  let committed = false;
  try {
    await commitEdition(
      editionDir,
      `BREAKING: ${event.headline} (via ${event.source_agent})`,
    );
    committed = true;
    console.log('[herald:newspaper] Breaking update committed to newspaper branch');
  } catch (err) {
    console.error('[herald:newspaper] Git commit failed:', (err as Error).message);
    // File is saved to disk -- NFR3 compliance (zero data loss)
  }

  return { updateId, updatePath, editionDate, recompiled, committed };
}

/**
 * List all breaking updates for a given edition date, sorted chronologically.
 */
export async function listBreakingUpdates(
  editionDate: string,
  heraldConfig: HeraldConfig,
): Promise<Array<{ updateId: string; path: string }>> {
  const updatesDir = join(
    heraldConfig.newspaper_dir,
    'editions',
    editionDate,
    'updates',
  );

  let files: string[];
  try {
    files = await readdir(updatesDir);
  } catch {
    return []; // No updates directory -- no breaking updates for this edition
  }

  return files
    .filter((f) => f.endsWith('.md'))
    .sort() // Chronological by update-HHMMSS naming
    .map((f) => ({
      updateId: f.replace('.md', ''),
      path: join(updatesDir, f),
    }));
}
