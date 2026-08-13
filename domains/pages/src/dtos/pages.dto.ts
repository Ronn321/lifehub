import { z } from 'zod';

export const createPageSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/).optional(),
  parentId: z.string().uuid().optional(),
  icon: z.string().max(50).optional(),
  coverMediaId: z.string().max(120).optional(),
  description: z.string().max(1000).optional(),
  templateId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  sortOrder: z.number().int().optional().default(0),
});
export type CreatePageInput = z.infer<typeof createPageSchema>;

export const updatePageSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/).optional(),
  parentId: z.string().uuid().nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
  coverMediaId: z.string().max(120).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
  sortOrder: z.number().int().optional(),
});
export type UpdatePageInput = z.infer<typeof updatePageSchema>;

export const movePageSchema = z.object({
  newParentId: z.string().uuid().nullable(),
});
export type MovePageInput = z.infer<typeof movePageSchema>;

const blockContentSchema: z.ZodType<Record<string, unknown>> = z.record(z.unknown());

const blockTypes = [
  'heading', 'text', 'image', 'gallery', 'file-list', 'divider',
  'todo', 'toggle', 'callout', 'quote', 'code',
  'bookmark', 'table', 'page-reference',
  'checklist', 'timeline', 'embed', 'video', 'file', 'link', 'map',
  'research_workspace', 'calendar_view', 'finance_widget',
  'it_inventory_widget', 'jellyfin_player',
  'browser_embed', 'search',
] as const;

export const createBlockSchema = z.object({
  type: z.enum(blockTypes),
  content: blockContentSchema.optional().default({}),
  layout: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  sortOrder: z.number().int().optional().default(0),
});
export type CreateBlockInput = z.infer<typeof createBlockSchema>;

export const updateBlockSchema = z.object({
  type: z.enum(blockTypes).optional(),
  content: blockContentSchema.optional(),
  layout: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  permissions: z.record(z.unknown()).optional(),
  status: z.enum(['active', 'archived', 'draft']).optional(),
  sortOrder: z.number().int().optional(),
});
export type UpdateBlockInput = z.infer<typeof updateBlockSchema>;

export const reorderBlocksSchema = z.object({
  blocks: z.array(z.object({
    id: z.string().uuid(),
    sortOrder: z.number().int(),
  })),
});
export type ReorderBlocksInput = z.infer<typeof reorderBlocksSchema>;

// Page Relations
export const createRelationSchema = z.object({
  targetPageId: z.string().uuid(),
  relationType: z.enum(['reference', 'related', 'dependency', 'embedded', 'parent-child']).default('reference'),
  label: z.string().max(255).optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type CreateRelationInput = z.infer<typeof createRelationSchema>;

// Page Templates
export const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  icon: z.string().max(50).optional(),
  domain: z.string().max(100).optional(),
  blocks: z.array(z.object({
    type: z.enum(blockTypes),
    content: blockContentSchema.optional().default({}),
    sortOrder: z.number().int().optional().default(0),
  })).optional().default([]),
  metadata: z.record(z.unknown()).optional(),
});
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  icon: z.string().max(50).optional(),
  domain: z.string().max(100).optional(),
  blocks: z.array(z.object({
    type: z.enum(blockTypes),
    content: blockContentSchema.optional().default({}),
    sortOrder: z.number().int().optional().default(0),
  })).optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

// Research Workspace
export const createResearchSessionSchema = z.object({
  pageId: z.string().uuid(),
  blockId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});
export type CreateResearchSessionInput = z.infer<typeof createResearchSessionSchema>;

export const updateResearchSessionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  mode: z.enum(['active', 'paused', 'completed']).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  searchHistory: z.array(z.string()).optional(),
  pinnedSources: z.array(z.string()).optional(),
});
export type UpdateResearchSessionInput = z.infer<typeof updateResearchSessionSchema>;

export const createResearchSourceSchema = z.object({
  sessionId: z.string().uuid(),
  type: z.enum(['web', 'media', 'document', 'repository', 'local']),
  url: z.string().url().optional(),
  title: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
  thumbnailUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type CreateResearchSourceInput = z.infer<typeof createResearchSourceSchema>;

export const createResearchCollectionSchema = z.object({
  sessionId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  sourceIds: z.array(z.string().uuid()).optional().default([]),
});
export type CreateResearchCollectionInput = z.infer<typeof createResearchCollectionSchema>;

// ========== IMPORT/EXPORT ==========

export const importPageSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/).optional(),
  icon: z.string().max(50).optional(),
  coverMediaId: z.string().max(120).optional(),
  description: z.string().max(1000).optional(),
  parentId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  sortOrder: z.number().int().optional(),
  blocks: z.array(z.object({
    type: z.enum(blockTypes),
    content: blockContentSchema.optional().default({}),
    layout: z.record(z.unknown()).optional(),
    metadata: z.record(z.unknown()).optional(),
    sortOrder: z.number().int().optional().default(0),
  })).optional().default([]),
  relations: z.array(z.object({
    targetPageId: z.string().uuid(),
    relationType: z.enum(['reference', 'related', 'dependency', 'embedded', 'parent-child']).default('reference'),
    label: z.string().max(255).optional(),
    metadata: z.record(z.unknown()).optional(),
  })).optional().default([]),
});
export type ImportPageInput = z.infer<typeof importPageSchema>;

export const pageFormatSchema = z.enum(['json', 'markdown']).default('json');
export type PageFormat = z.infer<typeof pageFormatSchema>;

// ========== PAGE PERMISSION OVERRIDES ==========

export const pagePermissionOverrideSchema = z.object({
  permissions: z.array(z.object({
    subjectType: z.enum(['user', 'role']),
    subjectId: z.string().uuid(),
    permission: z.enum(['read', 'write', 'admin']),
  })),
});
export type PagePermissionOverrideInput = z.infer<typeof pagePermissionOverrideSchema>;

export type PagePermissionOverride = {
  subjectType: 'user' | 'role';
  subjectId: string;
  permission: 'read' | 'write' | 'admin';
};
