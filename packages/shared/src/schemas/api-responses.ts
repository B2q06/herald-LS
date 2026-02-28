import { z } from 'zod';

export const BaseResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  timestamp: z.string().datetime(),
});

export type BaseResponse = z.infer<typeof BaseResponseSchema>;
