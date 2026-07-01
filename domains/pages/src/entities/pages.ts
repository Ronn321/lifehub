export interface Page {
  id: string;
  title: string;
  ownerId: string;
  parentId: string | null;
  icon: string | null;
  coverMediaId: string | null;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface PageBlock {
  id: string;
  pageId: string;
  type: 'heading' | 'text' | 'image' | 'gallery' | 'file-list' | 'divider'
    | 'todo' | 'toggle' | 'callout' | 'quote' | 'code'
    | 'bookmark' | 'table' | 'page-reference';
  content: Record<string, unknown>;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PageWithBlocks extends Page {
  blocks: PageBlock[];
  children?: PageWithBlocks[];
}
