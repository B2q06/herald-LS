export type { BreakingUpdateDeps, BreakingUpdateResult } from './breaking-update.ts';
export { listBreakingUpdates, processBreakingUpdate } from './breaking-update.ts';
export type {
  FeaturedStoryDeps,
  FeaturedStoryResult,
} from './featured-story.ts';
export {
  parseFeaturedStoriesFromFrontmatter,
  processAllFeaturedStories,
  triggerFeaturedStoryResearch,
  writeFeaturedStoryLinks,
} from './featured-story.ts';
export {
  finalizeEdition,
  getEdition,
  getEditionSources,
  getWeekly,
  listEditions,
  listWeeklies,
} from './edition-manager.ts';
export type { GitCommitResult, GitLogEntry } from './git-versioner.ts';
export {
  commitEdition,
  commitWeekly,
  ensureNewspaperBranch,
  getEditionContent,
  getEditionLog,
  listEditionsFromGit,
  listWeeklyFromGit,
} from './git-versioner.ts';
export { markdownToTypst } from './markdown-to-typst.ts';
export type { NewspaperRunResult } from './newspaper-executor.ts';
export { executeNewspaperRun } from './newspaper-executor.ts';
export type { EditionStatus, PipelineResult } from './pipeline.ts';
export { getEditionStatus, runNewspaperPipeline } from './pipeline.ts';
export type { TeamSynthesisResult } from './team-orchestrator.ts';
export {
  buildSynthesisPrompt,
  ensureEditionDir,
  gatherResearchReports,
} from './team-orchestrator.ts';
export type { CompilationResult, SpawnResult } from './typst-compiler.ts';
export { compileTypst, spawnCommand } from './typst-compiler.ts';
