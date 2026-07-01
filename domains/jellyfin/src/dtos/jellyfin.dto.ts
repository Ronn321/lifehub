import { z } from 'zod';

export const createServerSchema = z.object({
  url: z.string().url().max(500),
  apiKey: z.string().min(1).max(500),
});
export type CreateServerInput = z.infer<typeof createServerSchema>;

export const toggleWatchedSchema = z.object({});
export type ToggleWatchedInput = z.infer<typeof toggleWatchedSchema>;
