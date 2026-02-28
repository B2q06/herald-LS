import { z } from 'zod';

export const WsEnvelopeSchema = z.object({
  event: z.string(),
  payload: z.unknown(),
  timestamp: z.string().datetime(),
});

export type WsEnvelope = z.infer<typeof WsEnvelopeSchema>;
