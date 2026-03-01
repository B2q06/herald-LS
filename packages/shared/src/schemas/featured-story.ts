import { z } from "zod";

export const FeaturedStorySchema = z.object({
  /** Headline of the featured story */
  headline: z.string(),
  /** Brief summary of why this story warrants deep coverage */
  summary: z.string(),
  /** The research agent best suited to produce the dedicated report */
  assigned_agent: z.string(),
  /** Research prompt for the dedicated deep-dive report */
  research_prompt: z.string(),
  /** The edition date this featured story appeared in */
  edition_date: z.string(),
});

export type FeaturedStory = z.infer<typeof FeaturedStorySchema>;

export const FeaturedStoryReportLinkSchema = z.object({
  headline: z.string(),
  assigned_agent: z.string(),
  report_path: z.string(),
  report_run_id: z.string(),
  status: z.enum(["pending", "in_progress", "completed", "failed"]),
});

export type FeaturedStoryReportLink = z.infer<typeof FeaturedStoryReportLinkSchema>;
