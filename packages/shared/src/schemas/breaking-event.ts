import { z } from "zod";

export const BreakingEventSchema = z.object({
  /** The research agent that detected the event */
  source_agent: z.string(),
  /** Short headline for the breaking event */
  headline: z.string(),
  /** Full markdown content of the breaking update */
  content: z.string(),
  /** Urgency level as judged by the source agent */
  urgency: z.enum(["critical", "high", "medium"]),
  /** ISO timestamp when the event was detected */
  detected_at: z.string().datetime(),
  /** Optional: domains this event affects (for cross-domain flagging) */
  affected_domains: z.array(z.string()).optional(),
});

export type BreakingEvent = z.infer<typeof BreakingEventSchema>;
