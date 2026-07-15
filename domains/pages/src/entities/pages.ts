export interface Page {
  id: string;
  title: string;
  ownerId: string;
  parentId: string | null;
  icon: string | null;
  coverMediaId: string | null;
  description: string | null;
  templateId: string | null;
  status: 'draft' | 'published' | 'archived';
  tags: string[];
  metadata: Record<string, unknown>;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type BlockType =
  | 'heading' | 'text' | 'image' | 'gallery' | 'file-list' | 'divider'
  | 'todo' | 'toggle' | 'callout' | 'quote' | 'code'
  | 'bookmark' | 'table' | 'page-reference'
  | 'checklist' | 'timeline' | 'embed' | 'video' | 'file' | 'link' | 'map'
  | 'research_workspace' | 'calendar_view' | 'finance_widget'
  | 'it_inventory_widget' | 'jellyfin_player'
  | 'browser_embed' | 'search';

export type BlockStatus = 'active' | 'archived' | 'draft';
export type BlockChangeType = 'created' | 'updated' | 'moved' | 'archived' | 'restored';

export interface PageBlock {
  id: string;
  pageId: string;
  type: BlockType;
  content: Record<string, unknown>;
  layout: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  permissions: Record<string, unknown> | null;
  version: number;
  status: BlockStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface BlockVersion {
  id: string;
  blockId: string;
  version: number;
  content: Record<string, unknown>;
  layout: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  changedBy: string;
  changeType: BlockChangeType;
  createdAt: string;
}

export interface PageVersion {
  id: string;
  pageId: string;
  version: number;
  title: string;
  description: string | null;
  icon: string | null;
  coverMediaId: string | null;
  blocks: PageBlock[];
  changedBy: string;
  changeType: string;
  createdAt: string;
}

export type RelationType = 'reference' | 'related' | 'dependency' | 'embedded' | 'parent-child';

export interface PageRelation {
  id: string;
  sourcePageId: string;
  targetPageId: string;
  relationType: RelationType;
  label: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  createdBy: string;
}

export interface PageTemplate {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  domain: string | null;
  blocks: Array<{ type: BlockType; content: Record<string, unknown>; sortOrder: number }>;
  metadata: Record<string, unknown> | null;
  isSystem: boolean;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ResearchSession {
  id: string;
  pageId: string;
  blockId: string | null;
  name: string;
  mode: 'active' | 'paused' | 'completed';
  searchHistory: string[];
  pinnedSources: string[];
  notes: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type SourceType = 'web' | 'media' | 'document' | 'repository' | 'local';

export interface ResearchSource {
  id: string;
  sessionId: string;
  type: SourceType;
  url: string | null;
  title: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  metadata: Record<string, unknown> | null;
  isPinned: boolean;
  createdAt: string;
}

export interface ResearchCollection {
  id: string;
  sessionId: string;
  name: string;
  description: string | null;
  sourceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PageWithBlocks extends Page {
  blocks: PageBlock[];
  children?: PageWithBlocks[];
  relations?: PageRelation[];
}
