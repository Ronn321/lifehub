import type { ComponentType } from 'react';
import {
  Heading, Type, Image, Grid3X3, File, Minus, Check,
  ChevronRight, MessageSquare, Quote, Code, Bookmark, Table2, Link2,
  Calendar, Notebook, PiggyBank, Server, type LucideIcon,
} from 'lucide-react';

/* ─── Types ─── */

export type BlockTypeUnion =
  | 'heading' | 'text' | 'image' | 'gallery' | 'file-list' | 'divider'
  | 'todo' | 'toggle' | 'callout' | 'quote' | 'code'
  | 'bookmark' | 'table' | 'page-reference'
  | 'checklist' | 'timeline' | 'embed' | 'video' | 'file' | 'link' | 'map'
  | 'research_workspace' | 'calendar_view' | 'finance_widget' | 'it_inventory_widget'
  | 'jellyfin_player' | 'search';

/* ─── Registry Entry ─── */

export interface BlockRegistryEntry {
  type: BlockTypeUnion;
  component: ComponentType<any> | null;
  label: string;
  icon: LucideIcon;
  defaultContent: Record<string, unknown>;
  category: string;
}

/* ─── Registry singleton ─── */

class BlockRegistry {
  private entries = new Map<BlockTypeUnion, BlockRegistryEntry>();

  register(entry: BlockRegistryEntry): void {
    this.entries.set(entry.type, entry);
  }

  get(type: string): BlockRegistryEntry | undefined {
    return this.entries.get(type as BlockTypeUnion);
  }

  getAll(): BlockRegistryEntry[] {
    return Array.from(this.entries.values());
  }

  getByCategory(category: string): BlockRegistryEntry[] {
    return this.getAll().filter((e) => e.category === category);
  }

  getCategories(): string[] {
    const cats = new Set(this.getAll().map((e) => e.category));
    return Array.from(cats);
  }

  getIcon(type: string): LucideIcon {
    return this.entries.get(type as BlockTypeUnion)?.icon ?? Type;
  }

  getLabel(type: string): string {
    return this.entries.get(type as BlockTypeUnion)?.label ?? type;
  }

  getDefaultContent(type: string): Record<string, unknown> {
    return this.entries.get(type as BlockTypeUnion)?.defaultContent ?? {};
  }
}

export const blockRegistry = new BlockRegistry();

/* ─── Registration of all block types ─── */

/**
 * Call once at app startup or in a layout to register all blocks.
 * Dynamic imports are used for block components so they are code-split.
 */
export function registerAllBlocks(): void {
  const entries: BlockRegistryEntry[] = [
    {
      type: 'heading',
      component: null, // inline in BlockEditor
      label: 'Überschrift',
      icon: Heading,
      defaultContent: { level: 2, text: '' },
      category: 'Basis',
    },
    {
      type: 'text',
      component: null, // TipTapEditor inline
      label: 'Text',
      icon: Type,
      defaultContent: { json: { type: 'doc', content: [] } },
      category: 'Basis',
    },
    {
      type: 'todo',
      component: null, // TodoBlock
      label: 'Aufgabe',
      icon: Check,
      defaultContent: { checked: false, text: '' },
      category: 'Basis',
    },
    {
      type: 'toggle',
      component: null,
      label: 'Einklappbar',
      icon: ChevronRight,
      defaultContent: { label: '', content: '', isOpen: false },
      category: 'Basis',
    },
    {
      type: 'callout',
      component: null,
      label: 'Hinweis',
      icon: MessageSquare,
      defaultContent: { icon: '💡', variant: 'info', text: '' },
      category: 'Basis',
    },
    {
      type: 'quote',
      component: null,
      label: 'Zitat',
      icon: Quote,
      defaultContent: { text: '' },
      category: 'Basis',
    },
    {
      type: 'code',
      component: null,
      label: 'Code',
      icon: Code,
      defaultContent: { language: 'javascript', code: '' },
      category: 'Basis',
    },
    {
      type: 'bookmark',
      component: null,
      label: 'Link',
      icon: Bookmark,
      defaultContent: { url: '' },
      category: 'Medien',
    },
    {
      type: 'image',
      component: null,
      label: 'Bild',
      icon: Image,
      defaultContent: {},
      category: 'Medien',
    },
    {
      type: 'gallery',
      component: null,
      label: 'Galerie',
      icon: Grid3X3,
      defaultContent: { mediaIds: [] },
      category: 'Medien',
    },
    {
      type: 'file-list',
      component: null,
      label: 'Dateiliste',
      icon: File,
      defaultContent: {},
      category: 'Medien',
    },
    {
      type: 'divider',
      component: null,
      label: 'Trenner',
      icon: Minus,
      defaultContent: {},
      category: 'Struktur',
    },
    {
      type: 'table',
      component: null,
      label: 'Tabelle',
      icon: Table2,
      defaultContent: { columns: [], rows: [], functions: {} },
      category: 'Struktur',
    },
    {
      type: 'page-reference',
      component: null,
      label: 'Seiten-Verweis',
      icon: Link2,
      defaultContent: { pageId: '' },
      category: 'Struktur',
    },
    {
      type: 'checklist',
      component: null,
      label: 'Checkliste',
      icon: Check,
      defaultContent: { items: [] },
      category: 'Struktur',
    },
    {
      type: 'timeline',
      component: null,
      label: 'Zeitstrahl',
      icon: Calendar,
      defaultContent: { entries: [] },
      category: 'Struktur',
    },
    {
      type: 'embed',
      component: null,
      label: 'Einbettung',
      icon: Code,
      defaultContent: { url: '', html: '' },
      category: 'Medien',
    },
    {
      type: 'video',
      component: null,
      label: 'Video',
      icon: Image,
      defaultContent: { mediaId: '', url: '' },
      category: 'Medien',
    },
    {
      type: 'file',
      component: null,
      label: 'Datei',
      icon: File,
      defaultContent: { mediaId: '', filename: '', url: '' },
      category: 'Medien',
    },
    {
      type: 'link',
      component: null,
      label: 'Verknüpfung',
      icon: Link2,
      defaultContent: { url: '', title: '', description: '' },
      category: 'Medien',
    },
    {
      type: 'map',
      component: null,
      label: 'Karte',
      icon: Image,
      defaultContent: { lat: 0, lng: 0, zoom: 13, markerTitle: '' },
      category: 'Struktur',
    },
    {
      type: 'research_workspace',
      component: null,
      label: 'Recherche',
      icon: Notebook,
      defaultContent: {},
      category: 'Widgets',
    },
    {
      type: 'calendar_view',
      component: null,
      label: 'Kalender-Ansicht',
      icon: Calendar,
      defaultContent: {},
      category: 'Widgets',
    },
    {
      type: 'finance_widget',
      component: null,
      label: 'Finanzen',
      icon: PiggyBank,
      defaultContent: {},
      category: 'Widgets',
    },
    {
      type: 'it_inventory_widget',
      component: null,
      label: 'IT-Inventar',
      icon: Server,
      defaultContent: {},
      category: 'Widgets',
    },
    {
      type: 'jellyfin_player',
      component: null,
      label: 'Jellyfin Player',
      icon: Image,
      defaultContent: {},
      category: 'Widgets',
    },
    {
      type: 'search',
      component: null,
      label: 'Suche',
      icon: Notebook,
      defaultContent: { scope: 'page', query: '' },
      category: 'Widgets',
    },
  ];

  for (const entry of entries) {
    blockRegistry.register(entry);
  }
}
