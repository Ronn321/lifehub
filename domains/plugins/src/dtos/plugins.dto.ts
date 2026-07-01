import { z } from 'zod';

export const installPluginSchema = z.object({
  name: z.string().min(1).max(100),
  version: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  author: z.string().max(200).optional(),
  homepage: z.string().url().optional().or(z.literal('')),
});

export type InstallPluginInput = z.infer<typeof installPluginSchema>;

export const updatePluginSchema = z.object({
  enabled: z.boolean().optional(),
  settings: z.record(z.unknown()).optional(),
});

export type UpdatePluginInput = z.infer<typeof updatePluginSchema>;
