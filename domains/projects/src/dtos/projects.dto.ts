import { z } from 'zod';

const youtubeUrlSchema = z.string().refine(
  (val) => {
    if (!val) return true;
    try {
      const url = new URL(val);
      return (
        (url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com' || url.hostname === 'www.youtube-nocookie.com' || url.hostname === 'youtube-nocookie.com') &&
        url.pathname.startsWith('/embed/')
      );
    } catch {
      return false;
    }
  },
  { message: 'Nur youtube.com/embed/... oder youtube-nocookie.com/embed/... erlaubt' },
);

export const projectTypeEnum = z.enum(['planning', 'building', 'done', 'archived']);
export const projectStatusEnum = z.enum(['3d_print', 'arduino', 'raspi', 'code', 'electronics', 'diy']);

export const createProjectSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  type: projectTypeEnum.optional().default('planning'),
  status: projectStatusEnum.optional().default('3d_print'),
  coverMediaId: z.string().uuid().nullable().optional(),
  githubUrl: z.string().url().nullable().optional(),
  youtubeUrl: youtubeUrlSchema.nullable().optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  type: projectTypeEnum.optional(),
  status: projectStatusEnum.optional(),
  coverMediaId: z.string().uuid().nullable().optional(),
  githubUrl: z.string().url().nullable().optional(),
  youtubeUrl: youtubeUrlSchema.nullable().optional(),
});
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const createNoteSchema = z.object({
  content: z.string().min(1),
});
export type CreateNoteInput = z.infer<typeof createNoteSchema>;

export const updateNoteSchema = z.object({
  content: z.string().min(1),
});
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;

export const linkTypeEnum = z.enum(['github', 'youtube', 'other']);

export const createLinkSchema = z.object({
  url: z.string().url(),
  label: z.string().optional(),
  type: linkTypeEnum.optional().default('other'),
});
export type CreateLinkInput = z.infer<typeof createLinkSchema>;
