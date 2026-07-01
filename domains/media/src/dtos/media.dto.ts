import { z } from 'zod';

export const createSourceSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['nas_path', 'windows_path', 's3', 'upload_temp']),
  path: z.string().min(1),
  autoIndex: z.boolean().optional().default(false),
});
export type CreateSourceInput = z.infer<typeof createSourceSchema>;

export const updateSourceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  path: z.string().optional(),
  isActive: z.boolean().optional(),
  autoIndex: z.boolean().optional(),
});
export type UpdateSourceInput = z.infer<typeof updateSourceSchema>;

export const createAlbumSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  type: z.enum(['standard', 'travel', 'event', 'timeline']).optional().default('standard'),
});
export type CreateAlbumInput = z.infer<typeof createAlbumSchema>;

export const updateAlbumSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  type: z.enum(['standard', 'travel', 'event', 'timeline']).optional(),
});
export type UpdateAlbumInput = z.infer<typeof updateAlbumSchema>;

export const addToAlbumSchema = z.object({
  mediaIds: z.array(z.string().uuid()).min(1),
});
export type AddToAlbumInput = z.infer<typeof addToAlbumSchema>;

export const createTagSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().max(20).optional(),
});
export type CreateTagInput = z.infer<typeof createTagSchema>;

export const assignTagSchema = z.object({
  tagId: z.string().uuid(),
});
export type AssignTagInput = z.infer<typeof assignTagSchema>;

export const createAndAssignTagSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().max(20).optional(),
});
export type CreateAndAssignTagInput = z.infer<typeof createAndAssignTagSchema>;
