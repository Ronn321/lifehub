'use client';

import { useState, useEffect, useRef } from 'react';
import { Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { getBuiltinCover } from '@/lib/builtinCovers';
import { PageHeader } from './components/PageHeader';
import { BlockHandle, type BlockType } from './components/BlockHandle';
import { DragDropContainer } from './components/DragDropContainer';
import { TodoBlock } from './components/blocks/TodoBlock';
import { ToggleBlock } from './components/blocks/ToggleBlock';
import { CalloutBlock } from './components/blocks/CalloutBlock';
import { QuoteBlock } from './components/blocks/QuoteBlock';
import { CodeBlock } from './components/blocks/CodeBlock';
import { BookmarkBlock } from './components/blocks/BookmarkBlock';
import { TableBlock } from './components/blocks/TableBlock';
import { PageReferenceBlock } from './components/blocks/PageReferenceBlock';
import { ResearchWorkspaceBlock } from './components/blocks/ResearchWorkspaceBlock';
import { BrowserBlock } from './components/blocks/BrowserBlock';
import { ChecklistBlock } from './components/blocks/ChecklistBlock';
import { TimelineBlock } from './components/blocks/TimelineBlock';
import { EmbedBlock } from './components/blocks/EmbedBlock';
import { VideoBlock } from './components/blocks/VideoBlock';
import { FileBlock } from './components/blocks/FileBlock';
import { LinkBlock } from './components/blocks/LinkBlock';
import { MapBlock } from './components/blocks/MapBlock';
import { BlockVersionHistory } from './components/BlockVersionHistory';
import { PageVersionHistory } from './components/PageVersionHistory';
import { Breadcrumbs } from './components/Breadcrumbs';
import { SlashMenu, SlashMenuExtension } from './components/SlashMenu';
import { SearchBlock } from './components/blocks/SearchBlock';
import { registerAllBlocks, blockRegistry } from '@/lib/blockRegistry';
import {
  Plus, Notebook, Loader2, Trash2,
  Heading, Type, Image, Grid3X3, File, Minus, Check,
  ChevronRight, MessageSquare, Quote, Code, Bookmark, Table2, Link2,
  Calendar, PiggyBank, Server, History, Search, Globe,
  Maximize2, Minimize2, FileText, ExternalLink, CheckSquare, Square,
  CalendarClock, FolderUp,
} from 'lucide-react';
import { cn } from '@/lib/cn';

interface Page {
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
  children?: Page[];
}

type BlockTypeUnion = 'heading' | 'text' | 'image' | 'gallery' | 'file-list' | 'divider'
  | 'todo' | 'toggle' | 'callout' | 'quote' | 'code'
  | 'bookmark' | 'table' | 'page-reference'
  | 'checklist' | 'timeline' | 'embed' | 'video' | 'file' | 'link' | 'map'
  | 'research_workspace' | 'browser_embed' | 'search';

interface PageBlock {
  id: string;
  pageId: string;
  type: BlockTypeUnion;
  content: Record<string, unknown>;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface PageDetail extends Page {
  blocks: PageBlock[];
}

interface MediaItem {
  id: string;
  filename: string;
  mimeType: string;
  thumbnailPath: string | null;
  width: number | null;
  height: number | null;
}

const blockIcon: Record<string, React.ReactNode> = {
  heading: <Heading className="h-4 w-4" />,
  text: <Type className="h-4 w-4" />,
  image: <Image className="h-4 w-4" />,
  gallery: <Grid3X3 className="h-4 w-4" />,
  'file-list': <File className="h-4 w-4" />,
  divider: <Minus className="h-4 w-4" />,
  todo: <Check className="h-4 w-4" />,
  toggle: <ChevronRight className="h-4 w-4" />,
  callout: <MessageSquare className="h-4 w-4" />,
  quote: <Quote className="h-4 w-4" />,
  code: <Code className="h-4 w-4" />,
  bookmark: <Bookmark className="h-4 w-4" />,
  table: <Table2 className="h-4 w-4" />,
  'page-reference': <Link2 className="h-4 w-4" />,
  checklist: <Check className="h-4 w-4" />,
  timeline: <Calendar className="h-4 w-4" />,
  embed: <Code className="h-4 w-4" />,
  video: <Image className="h-4 w-4" />,
  file: <File className="h-4 w-4" />,
  link: <Link2 className="h-4 w-4" />,
  map: <Image className="h-4 w-4" />,
  research_workspace: <Notebook className="h-4 w-4" />,
  browser_embed: <Globe className="h-4 w-4" />,
  calendar_view: <Calendar className="h-4 w-4" />,
  finance_widget: <PiggyBank className="h-4 w-4" />,
  it_inventory_widget: <Server className="h-4 w-4" />,
  jellyfin_player: <Image className="h-4 w-4" />,
  search: <Search className="h-4 w-4" />,
};

const blockLabel: Record<string, string> = {
  heading: 'Überschrift',
  text: 'Text',
  image: 'Bild',
  gallery: 'Galerie',
  'file-list': 'Dateiliste',
  divider: 'Trenner',
  todo: 'Aufgabe',
  toggle: 'Einklappbar',
  callout: 'Hinweis',
  quote: 'Zitat',
  code: 'Code',
  bookmark: 'Link',
  table: 'Tabelle',
  'page-reference': 'Seiten-Verweis',
  checklist: 'Checkliste',
  timeline: 'Zeitstrahl',
  embed: 'Einbettung',
  video: 'Video',
  file: 'Datei',
  link: 'Verknüpfung',
  map: 'Karte',
  research_workspace: 'Recherche',
  browser_embed: 'Browser',
  calendar_view: 'Kalender-Ansicht',
  finance_widget: 'Finanzen',
  it_inventory_widget: 'IT-Inventar',
  jellyfin_player: 'Jellyfin Player',
  search: 'Suche',
};

function flattenPages(pages: Page[]): Page[] {
  const result: Page[] = [];
  function walk(list: Page[]) {
    for (const p of list) {
      result.push(p);
      if (p.children) walk(p.children);
    }
  }
  walk(pages);
  return result;
}

const BLOCK_DEFAULTS: Record<string, Record<string, unknown>> = {
  heading: { level: 2, text: '' },
  text: { json: { type: 'doc', content: [] } },
  image: {},
  gallery: { mediaIds: [] },
  'file-list': {},
  divider: {},
  todo: { checked: false, text: '' },
  toggle: { label: '', content: '', isOpen: false },
  callout: { icon: '💡', variant: 'info', text: '' },
  quote: { text: '' },
  code: { language: 'javascript', code: '' },
  bookmark: { url: '' },
  table: { columns: [], rows: [], functions: {} },
  'page-reference': { pageId: '' },
  browser_embed: { startUrl: '', title: '', sessionId: null },
  search: { scope: 'page', query: '' },
};

function extractTextFromContent(content: Record<string, unknown>): string {
  if (!content) return '';
  if (typeof content.text === 'string') return content.text;
  if (typeof content.label === 'string') return content.label;
  if (typeof content.code === 'string') return content.code;
  if (typeof content.url === 'string') return content.url;
  if (content.json && typeof content.json === 'object') {
    const json = content.json as Record<string, unknown>;
    if (json.content && Array.isArray(json.content)) {
      return json.content
        .filter((block: any) => block.type === 'paragraph' || block.type === 'heading')
        .map((block: any) => {
          if (block.content && Array.isArray(block.content)) {
            return block.content
              .filter((inline: any) => inline.type === 'text')
              .map((inline: any) => inline.text || '')
              .join('');
          }
          return '';
        })
        .join('\n');
    }
  }
  return '';
}

function textToTipTapJson(text: string): Record<string, unknown> {
  if (!text) return { type: 'doc', content: [] };
  const paragraphs = text.split('\n').filter(Boolean);
  return {
    type: 'doc',
    content: paragraphs.map(p => ({
      type: 'paragraph',
      content: [{ type: 'text', text: p }],
    })),
  };
}

/* ─── TipTap Editor (inline, Notion-style) ─── */
function TipTapEditor({ content, onUpdate, placeholder, debounceMs = 800, onBlockTypeChange }: {
  content: Record<string, unknown>; onUpdate: (json: Record<string, unknown>) => void; placeholder?: string; debounceMs?: number;
  onBlockTypeChange?: (blockType: string) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slashContainerRef = useRef<HTMLDivElement>(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: placeholder ?? 'Text eingeben...' }),
      SlashMenuExtension,
    ],
    content: (content?.json as Record<string, unknown>) ?? { type: 'doc', content: [] },
    onUpdate: ({ editor: ed }: { editor: Editor }) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onUpdate({ json: ed.getJSON() });
      }, debounceMs);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[1.2em]',
      },
    },
  });

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleSlashSelect = (blockType: string) => {
    onBlockTypeChange?.(blockType);
  };

  if (!editor) return <div className="h-6 animate-pulse bg-zinc-100 dark:bg-zinc-800 rounded" />;

  return (
    <div ref={slashContainerRef} className="relative">
      <EditorContent editor={editor} />
      <SlashMenu
        editor={editor}
        onSelect={handleSlashSelect}
        onClose={() => {}}
      />
    </div>
  );
}

/* ─── Media Picker ─── */
function MediaPicker({ open, onClose, onSelect, multi }: {
  open: boolean; onClose: () => void; onSelect: (ids: string[]) => void; multi: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const accessToken = useAuthStore((s) => s.accessToken);

  const { data: media } = useQuery<MediaItem[]>({
    queryKey: ['media-files'],
    queryFn: () => api.get<MediaItem[]>('/media'),
    enabled: !!accessToken && open,
  });

  if (!open) return null;

  const toggle = (id: string) => {
    setSelected((prev) =>
      multi
        ? prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        : [id],
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-2xl p-6 mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">{multi ? 'Bilder auswählen' : 'Bild auswählen'}</h2>
        {(!media || media.length === 0) ? (
          <p className="text-sm text-zinc-400 text-center py-8">Keine Medien vorhanden.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {media.filter((m) => m.mimeType?.startsWith('image/')).map((item) => (
              <button
                key={item.id}
                onClick={() => toggle(item.id)}
                className={`relative rounded-lg border-2 overflow-hidden aspect-square transition-all ${
                  selected.includes(item.id) ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
                }`}
              >
                {item.thumbnailPath ? (
                  <img src={item.thumbnailPath} alt={item.filename} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
                    <Image className="h-8 w-8" />
                  </div>
                )}
                {selected.includes(item.id) && (
                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            Abbrechen
          </button>
          <button
            onClick={() => { onSelect(selected); setSelected([]); onClose(); }}
            disabled={selected.length === 0}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {multi ? `${selected.length} ausgewählt` : 'Auswählen'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Tree Node Display ─── */
function TreeNode({ node, depth = 0, onSelect, onDelete }: {
  node: Page; depth?: number; onSelect: (id: string) => void; onDelete: (id: string) => void;
}) {
  const builtinCover = getBuiltinCover(node.coverMediaId);
  return (
    <div>
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer hover:bg-bg-surface transition-colors group"
        style={{ paddingLeft: `${12 + depth * 20}px` }}
        onClick={() => onSelect(node.id)}
      >
        {builtinCover ? (
          builtinCover.image ? (
            <img
              src={builtinCover.image}
              alt={builtinCover.name}
              className="h-6 w-9 rounded-md shrink-0 border border-border object-cover"
              title={builtinCover.name}
            />
          ) : (
            <div
              className="h-6 w-9 rounded-md shrink-0 border border-border"
              style={{ background: builtinCover.background }}
              title={builtinCover.name}
            />
          )
        ) : (
          <Notebook className="h-4 w-4 text-fg-muted shrink-0" />
        )}
        <span className="text-sm font-medium flex-1 truncate">{node.title}</span>
        {node.description && (
          <span className="text-xs text-fg-subtle hidden sm:block truncate max-w-[200px]">{node.description}</span>
        )}
        <button
          className="p-1 rounded text-fg-subtle hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {node.children?.map((child) => (
        <TreeNode key={child.id} node={child} depth={depth + 1} onSelect={onSelect} onDelete={onDelete} />
      ))}
    </div>
  );
}

/* ─── Create Page Dialog ─── */
function CreatePageDialog({ open, onClose, onSuccess, pages }: {
  open: boolean; onClose: () => void; onSuccess: () => void; pages: Page[];
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [error, setError] = useState('');

  const { data: templates } = useQuery({
    queryKey: ['page-templates'],
    queryFn: () => api.get<Array<{ id: string; name: string; description: string | null; icon: string | null; domain: string | null }>>('/pages/templates/list'),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () => api.post<Page>('/pages', {
      title,
      description: description || undefined,
      parentId: parentId || undefined,
      templateId: templateId || undefined,
    }),
    onSuccess: () => {
      setTitle(''); setDescription(''); setParentId(''); setTemplateId(''); setError('');
      onSuccess(); onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  if (!open) return null;

  function collectPages(list: Page[]): Page[] {
    const result: Page[] = [];
    for (const p of list) {
      result.push(p);
      if (p.children) result.push(...collectPages(p.children));
    }
    return result;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-lg p-6 mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">Neue Seite</h2>
        <div className="space-y-4">
          {/* Template Selection */}
          {templates && templates.length > 0 && (
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Vorlage (optional)</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTemplateId('')}
                  className={`px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                    !templateId
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
                      : 'border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span className="font-medium">Leer</span>
                  <p className="text-xs text-fg-muted mt-0.5">Ohne Vorlage</p>
                </button>
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplateId(t.id)}
                    className={`px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                      templateId === t.id
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
                        : 'border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span className="font-medium">{t.icon} {t.name}</span>
                    {t.description && <p className="text-xs text-fg-muted mt-0.5 line-clamp-1">{t.description}</p>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-muted-foreground mb-1">Titel</label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="z.B. Urlaubsplanung"
              value={title} onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Beschreibung (optional)</label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              rows={2}
              placeholder="Kurze Beschreibung"
              value={description} onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Übergeordnete Seite (optional)</label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={parentId} onChange={(e) => setParentId(e.target.value)}
            >
              <option value="">— Keine (Root-Seite) —</option>
              {collectPages(pages).map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            onClick={() => mutation.mutate()}
            disabled={!title || mutation.isPending}
            className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium transition-colors flex items-center justify-center gap-2"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Seite anlegen
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Block Editor (inline, Notion-style) ─── */
function BlockEditor({ block, onUpdate, onBlockTypeChange, pageId, allPages, onNavigate }: {
  block: PageBlock; onUpdate: (data: Partial<PageBlock>) => void; onBlockTypeChange?: (blockType: string) => void;
  pageId: string; allPages: Page[]; onNavigate: (id: string) => void;
}) {
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  if (block.type === 'heading') {
    const level = (block.content?.level as number) ?? 2;
    const text = (block.content?.text as string) ?? '';
    const levelClasses = level === 1
      ? 'text-3xl font-bold tracking-tight'
      : level === 3
        ? 'text-xl font-semibold'
        : 'text-2xl font-semibold';
    return (
      <div className="flex items-start gap-1">
        <select
          value={level}
          onChange={(e) => onUpdate({ content: { ...block.content, level: Number(e.target.value) } })}
          className="mt-1 text-xs bg-transparent text-fg-muted border-none outline-none cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <option value={1}>H1</option>
          <option value={2}>H2</option>
          <option value={3}>H3</option>
        </select>
        <div
          contentEditable
          suppressContentEditableWarning
          className={`flex-1 outline-none min-h-[1em] ${levelClasses} placeholder:text-fg-muted`}
          data-placeholder={level === 1 ? 'Überschrift 1' : level === 3 ? 'Überschrift 3' : 'Überschrift 2'}
          onBlur={(e) => onUpdate({ content: { ...block.content, text: e.currentTarget.textContent ?? '' } })}
        >
          {text}
        </div>
      </div>
    );
  }

  if (block.type === 'text') {
    return (
      <TipTapEditor
        content={block.content}
        onUpdate={(json) => onUpdate({ content: json })}
        placeholder="Text eingeben..."
        onBlockTypeChange={onBlockTypeChange}
      />
    );
  }

  if (block.type === 'image') {
    const mediaId = block.content?.mediaId as string | undefined;
    return (
      <div>
        {mediaId ? (
          <div className="relative group/img">
            <img
              src={`http://${window.location.hostname}:3007/api/v1/media/files/${mediaId}/stream?token=${typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('lifehub-auth') || '{}')?.state?.accessToken ?? '') : ''}`}
              alt=""
              className="max-w-full rounded-lg"
            />
            <button
              onClick={() => setShowMediaPicker(true)}
              className="absolute top-2 right-2 px-2 py-1 rounded bg-black/50 text-white text-xs opacity-0 group-hover/img:opacity-100 transition-opacity"
            >
              Ändern
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowMediaPicker(true)}
            className="w-full py-12 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-sm text-fg-muted hover:text-fg hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors flex items-center justify-center gap-2"
          >
            <Image className="h-5 w-5" /> Bild auswählen
          </button>
        )}
        <MediaPicker
          open={showMediaPicker}
          onClose={() => setShowMediaPicker(false)}
          onSelect={(ids) => onUpdate({ content: { ...block.content, mediaId: ids[0] } })}
          multi={false}
        />
      </div>
    );
  }

  if (block.type === 'gallery') {
    const mediaIds = (block.content?.mediaIds as string[]) ?? [];
    return (
      <div>
        <button
          onClick={() => setShowMediaPicker(true)}
          className="w-full py-4 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-sm text-fg-muted hover:text-fg hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors flex items-center justify-center gap-2"
        >
          <Grid3X3 className="h-5 w-5" /> {mediaIds.length > 0 ? `${mediaIds.length} Bilder ausgewählt` : 'Bilder auswählen'}
        </button>
        <MediaPicker
          open={showMediaPicker}
          onClose={() => setShowMediaPicker(false)}
          onSelect={(ids) => onUpdate({ content: { ...block.content, mediaIds: ids } })}
          multi={true}
        />
      </div>
    );
  }

  if (block.type === 'file-list') {
    return (
      <div className="text-sm text-fg-muted py-2">
        <File className="h-4 w-4 inline mr-2" /> Dateiliste (bald verfügbar)
      </div>
    );
  }

  if (block.type === 'divider') {
    return <hr className="border-border my-2" />;
  }

  if (block.type === 'todo') {
    return (
      <TodoBlock
        checked={(block.content?.checked as boolean) ?? false}
        text={(block.content?.text as string) ?? ''}
        onChange={(data) => onUpdate({ content: { ...block.content, ...data } })}
      />
    );
  }

  if (block.type === 'toggle') {
    return (
      <ToggleBlock
        label={(block.content?.label as string) ?? ''}
        content={(block.content?.content as string) ?? ''}
        isOpen={(block.content?.isOpen as boolean) ?? false}
        onChange={(data) => onUpdate({ content: { ...block.content, ...data } })}
      />
    );
  }

  if (block.type === 'callout') {
    return (
      <CalloutBlock
        icon={(block.content?.icon as string) ?? '💡'}
        variant={(block.content?.variant as 'info' | 'warning' | 'error' | 'success') ?? 'info'}
        text={(block.content?.text as string) ?? ''}
        onChange={(data) => onUpdate({ content: { ...block.content, ...data } })}
      />
    );
  }

  if (block.type === 'quote') {
    return (
      <QuoteBlock
        text={(block.content?.text as string) ?? ''}
        onChange={(data) => onUpdate({ content: { ...block.content, ...data } })}
      />
    );
  }

  if (block.type === 'code') {
    return (
      <CodeBlock
        language={(block.content?.language as string) ?? 'javascript'}
        code={(block.content?.code as string) ?? ''}
        onChange={(data) => onUpdate({ content: { ...block.content, ...data } })}
      />
    );
  }

  if (block.type === 'bookmark') {
    return (
      <BookmarkBlock
        url={(block.content?.url as string) ?? ''}
        title={block.content?.title as string}
        description={block.content?.description as string}
        image={block.content?.image as string}
        onChange={(data) => onUpdate({ content: { ...block.content, ...data } })}
      />
    );
  }

  if (block.type === 'table') {
    return (
      <TableBlock
        columns={(block.content?.columns as Array<{ id: string; name: string; type: 'text' | 'number' | 'date' }>) ?? []}
        rows={(block.content?.rows as Array<{ id: string; cells: Record<string, string> }>) ?? []}
        functions={(block.content?.functions as Record<string, 'sum' | 'avg' | 'min' | 'max' | 'count'>) ?? {}}
        onChange={(data) => onUpdate({ content: { ...block.content, ...data } })}
      />
    );
  }

  if (block.type === 'page-reference') {
    return (
      <PageReferenceBlock
        pageId={(block.content?.pageId as string) ?? ''}
        pages={allPages}
        onChange={(data) => onUpdate({ content: { ...block.content, ...data } })}
      />
    );
  }

  if (block.type === 'research_workspace') {
    return (
      <ResearchWorkspaceBlock
        blockId={block.id}
        pageId={pageId}
        content={block.content}
        onChange={(data) => onUpdate({ content: { ...block.content, ...data } })}
      />
    );
  }

  if (block.type === 'browser_embed') {
    return (
      <BrowserBlock
        blockId={block.id}
        pageId={pageId}
        content={block.content}
        onChange={(data) => onUpdate({ content: { ...block.content, ...data } })}
      />
    );
  }

  if (block.type === 'checklist') {
    return (
      <ChecklistBlock
        items={(block.content?.items as Array<{ id: string; text: string; checked: boolean }>) ?? []}
        onChange={(data) => onUpdate({ content: { ...block.content, ...data } })}
      />
    );
  }

  if (block.type === 'timeline') {
    return (
      <TimelineBlock
        entries={(block.content?.entries as Array<{ id: string; date: string; title: string; description: string }>) ?? []}
        onChange={(data) => onUpdate({ content: { ...block.content, ...data } })}
      />
    );
  }

  if (block.type === 'embed') {
    return (
      <EmbedBlock
        url={(block.content?.url as string) ?? ''}
        html={(block.content?.html as string) ?? ''}
        onChange={(data) => onUpdate({ content: { ...block.content, ...data } })}
      />
    );
  }

  if (block.type === 'video') {
    return (
      <VideoBlock
        mediaId={(block.content?.mediaId as string) ?? ''}
        url={(block.content?.url as string) ?? ''}
        onChange={(data) => onUpdate({ content: { ...block.content, ...data } })}
      />
    );
  }

  if (block.type === 'file') {
    return (
      <FileBlock
        mediaId={(block.content?.mediaId as string) ?? ''}
        filename={(block.content?.filename as string) ?? ''}
        url={(block.content?.url as string) ?? ''}
        onChange={(data) => onUpdate({ content: { ...block.content, ...data } })}
      />
    );
  }

  if (block.type === 'link') {
    return (
      <LinkBlock
        url={(block.content?.url as string) ?? ''}
        title={(block.content?.title as string) ?? ''}
        description={(block.content?.description as string) ?? ''}
        onChange={(data) => onUpdate({ content: { ...block.content, ...data } })}
      />
    );
  }

  if (block.type === 'map') {
    return (
      <MapBlock
        lat={(block.content?.lat as number) ?? 0}
        lng={(block.content?.lng as number) ?? 0}
        zoom={(block.content?.zoom as number) ?? 13}
        markerTitle={(block.content?.markerTitle as string) ?? ''}
        onChange={(data) => onUpdate({ content: { ...block.content, ...data } })}
      />
    );
  }

  if (block.type === 'search') {
    return (
      <SearchBlock
        pageId={pageId}
        scope={(block.content?.scope as 'page' | 'domain' | 'global') ?? 'page'}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div className="text-sm text-fg-muted py-1">
      {blockLabel[block.type]} Block
    </div>
  );
}

/* ─── Detail View ─── */
function PageDetailView({ pageId, onBack, allPages }: { pageId: string; onBack: () => void; allPages: Page[] }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [addingBlock, setAddingBlock] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showBlockHistory, setShowBlockHistory] = useState<string | null>(null);
  const [showPageHistory, setShowPageHistory] = useState(false);
  // Seiten-Layout: 'normal' (max-w-3xl), 'wide' (volle Breite, wie Notion),
  // 'fullscreen' (volle Breite + Sidebar eingeklappt, vom BrowserBlock)
  const [pageLayout, setPageLayout] = useState<'normal' | 'wide' | 'fullscreen'>('normal');

  // Vom BrowserBlock gesendete Layout-Modi übernehmen:
  // 'medium' = volle Breite, Sidebar bleibt sichtbar
  // 'fullscreen' = volle Breite + Sidebar eingeklappt
  useEffect(() => {
    const handler = (e: Event) => {
      const mode = (e as CustomEvent<{ mode?: string }>).detail?.mode;
      if (mode === 'medium') {
        setPageLayout('wide');
      } else if (mode === 'fullscreen') {
        setPageLayout('fullscreen');
      } else if (mode === 'normal') {
        setPageLayout((prev) => (prev === 'fullscreen' || prev === 'wide' ? 'normal' : prev));
      }
    };
    window.addEventListener('lifehub:browser-layout', handler);
    return () => window.removeEventListener('lifehub:browser-layout', handler);
  }, []);

  // Volle-Breite-Präferenz pro Seite merken (Notion-Stil)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`lifehub-page-wide:${pageId}`);
      if (saved === '1' && pageLayout === 'normal') setPageLayout('wide');
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  const toggleWide = () => {
    setPageLayout((prev) => {
      const next = prev === 'wide' ? 'normal' : 'wide';
      try { localStorage.setItem(`lifehub-page-wide:${pageId}`, next === 'wide' ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  };

  const { data: page, isLoading } = useQuery<PageDetail>({
    queryKey: ['page', pageId],
    queryFn: () => api.get<PageDetail>(`/pages/${pageId}`),
  });

  const addBlockMutation = useMutation({
    mutationFn: (type: string) => api.post<PageBlock>(`/pages/${pageId}/blocks`, { type }),
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['page', pageId] });
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      setAddingBlock(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const updateBlockMutation = useMutation({
    mutationFn: ({ blockId, data }: { blockId: string; data: Partial<PageBlock> }) =>
      api.put(`/pages/${pageId}/blocks/${blockId}`, data),
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['page', pageId] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteBlockMutation = useMutation({
    mutationFn: (blockId: string) => api.delete(`/pages/${pageId}/blocks/${blockId}`),
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['page', pageId] });
    },
  });

  const duplicateBlockMutation = useMutation({
    mutationFn: (block: PageBlock) => {
      const sorted = [...(page?.blocks ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
      const maxSort = sorted.length > 0 ? Math.max(...sorted.map((b) => b.sortOrder)) : 0;
      return api.post<PageBlock>(`/pages/${pageId}/blocks`, {
        type: block.type,
        content: block.content,
        sortOrder: maxSort + 1,
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['page', pageId] }); },
  });

  const reorderBlockMutation = useMutation({
    mutationFn: (blocks: Array<{ id: string; sortOrder: number }>) =>
      api.put(`/pages/${pageId}/blocks/reorder`, { blocks }),
    onMutate: async (blocks) => {
      await queryClient.cancelQueries({ queryKey: ['page', pageId] });
      const previousPage = queryClient.getQueryData<PageDetail>(['page', pageId]);
      if (previousPage) {
        const updatedBlocks = previousPage.blocks.map(block => {
          const update = blocks.find(b => b.id === block.id);
          return update ? { ...block, sortOrder: update.sortOrder } : block;
        });
        queryClient.setQueryData<PageDetail>(['page', pageId], {
          ...previousPage,
          blocks: updatedBlocks,
        });
      }
      return { previousPage };
    },
    onError: (err, blocks, context) => {
      if (context?.previousPage) {
        queryClient.setQueryData(['page', pageId], context.previousPage);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['page', pageId] });
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: () => api.delete(`/pages/${pageId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      onBack();
    },
    onError: (e: Error) => setError(e.message),
  });

  const handleReorder = (oldIndex: number, newIndex: number) => {
    console.log('[Pages] handleReorder:', { oldIndex, newIndex });
    if (!page) return;
    const sorted = [...page.blocks].sort((a, b) => a.sortOrder - b.sortOrder);
    const newBlocks = [...sorted];
    const [moved] = newBlocks.splice(oldIndex, 1);
    if (!moved) return;
    newBlocks.splice(newIndex, 0, moved);
    const payload = newBlocks.map((b, i) => ({ id: b.id, sortOrder: i }));
    console.log('[Pages] reorder payload:', payload);
    reorderBlockMutation.mutate(payload);
  };

  const handleMoveBlock = (blockId: string, direction: 'up' | 'down') => {
    if (!page) return;
    const sorted = [...page.blocks].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((b) => b.id === blockId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;
    const newBlocks = [...sorted];
    const [moved] = newBlocks.splice(idx, 1);
    if (!moved) return;
    newBlocks.splice(targetIdx, 0, moved);
    reorderBlockMutation.mutate(
      newBlocks.map((b, i) => ({ id: b.id, sortOrder: i }))
    );
  };

  const handleBlockTypeChange = (blockId: string, newType: BlockType) => {
    const block = page?.blocks.find(b => b.id === blockId);
    if (!block) return;
    
    const oldText = extractTextFromContent(block.content ?? {});
    let newContent: Record<string, unknown>;
    
    switch (newType) {
      case 'heading':
        newContent = { level: 2, text: oldText };
        break;
      case 'text':
        newContent = { json: textToTipTapJson(oldText) };
        break;
      case 'todo':
        newContent = { checked: false, text: oldText };
        break;
      case 'toggle':
        newContent = { label: oldText, content: '', isOpen: false };
        break;
      case 'callout':
        newContent = { icon: '💡', variant: 'info', text: oldText };
        break;
      case 'quote':
        newContent = { text: oldText };
        break;
      case 'code':
        newContent = { language: 'javascript', code: oldText };
        break;
      case 'bookmark':
        newContent = { url: oldText.startsWith('http') ? oldText : '' };
        break;
      case 'search':
        newContent = { scope: 'page', query: '' };
        break;
      default:
        newContent = BLOCK_DEFAULTS[newType] ?? {};
    }
    
    updateBlockMutation.mutate({
      blockId,
      data: { type: newType as PageBlock['type'], content: newContent },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-5 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Seite nicht gefunden.</p>
        <button onClick={onBack} className="mt-2 text-sm text-amber-600 hover:underline">Zurück zur Übersicht</button>
      </div>
    );
  }

  const sortedBlocks = [...page.blocks].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className={cn('space-y-6', pageLayout === 'normal' ? 'max-w-3xl' : 'max-w-none')}>
      <Breadcrumbs
        currentPageId={pageId}
        allPages={allPages}
        onNavigate={(id) => id ? router.push(`/pages?open=${id}`) : onBack()}
        className="mb-0"
      />
      <PageHeader page={page} allPages={allPages} wide={pageLayout !== 'normal'} onNavigate={(id) => id ? router.push(`/pages?open=${id}`) : onBack()} />

      {/* Notion-Stil Übersicht: Unterseiten, Übergeordnete Seiten, Dokumente, Aufgaben, Zeitraum */}
      <PageOverview page={page} allPages={allPages} onNavigate={(id) => router.push(`/pages?open=${id}`)} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPageHistory(true)}
            className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm text-fg-muted hover:text-fg hover:bg-bg-surface transition-colors flex items-center gap-1.5"
          >
            <History className="h-3.5 w-3.5" /> Versionen
          </button>
          <button
            onClick={toggleWide}
            className={`px-3 py-1.5 rounded-lg border text-sm transition-colors flex items-center gap-1.5 ${
              pageLayout !== 'normal'
                ? 'border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                : 'border-zinc-300 dark:border-zinc-700 text-fg-muted hover:text-fg hover:bg-bg-surface'
            }`}
            title="Volle Breite ein/aus (wie Notion)"
          >
            {pageLayout !== 'normal' ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
            {pageLayout !== 'normal' ? 'Volle Breite' : 'Volle Breite'}
          </button>
        </div>
        <button
          onClick={() => { if (window.confirm(`"${page.title}" löschen?`)) deletePageMutation.mutate(); }}
          className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors flex items-center gap-1.5"
        >
          <Trash2 className="h-3.5 w-3.5" /> Loschen
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">{error}</div>
      )}

      <div className="space-y-3">
        {sortedBlocks.length === 0 ? (
          <div className="text-center py-12 text-zinc-400">
            <Notebook className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Noch keine Inhaltsblöcke.</p>
            <p className="text-sm mt-1">Füge unten den ersten Block hinzu.</p>
          </div>
        ) : (
          <DragDropContainer blocks={sortedBlocks} onReorder={handleReorder}>
            {(block, dragHandleProps, isDragging) => {
              const pageBlock = block as unknown as PageBlock;
              return (
                <div className={`group relative rounded-md transition-colors ${isDragging ? 'bg-brand-500/5 ring-1 ring-brand-500/20' : 'hover:bg-bg-surface/50'}`}>
                  <BlockHandle
                    blockId={block.id}
                    currentType={(block.type ?? 'text') as BlockType}
                    onTypeChange={(newType) => handleBlockTypeChange(block.id, newType)}
                    onDelete={() => { if (window.confirm('Diesen Block loschen?')) deleteBlockMutation.mutate(block.id); }}
                    onDuplicate={() => duplicateBlockMutation.mutate(pageBlock)}
                    onMoveUp={() => handleMoveBlock(block.id, 'up')}
                    onMoveDown={() => handleMoveBlock(block.id, 'down')}
                    onShowHistory={() => setShowBlockHistory(block.id)}
                    dragHandleProps={dragHandleProps}
                  />
                  <BlockEditor
                    block={pageBlock}
                    pageId={pageId}
                    allPages={allPages}
                    onNavigate={(id) => router.push(`/pages?open=${id}`)}
                    onUpdate={(data) => updateBlockMutation.mutate({ blockId: block.id, data })}
                    onBlockTypeChange={(newType) => handleBlockTypeChange(block.id, newType as BlockType)}
                  />
                </div>
              );
            }}
          </DragDropContainer>
        )}
      </div>

      <div className="py-2">
        {addingBlock ? (
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-border p-3 max-w-md">
            <input
              type="text"
              placeholder="Block suchen..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm outline-none focus:border-brand-500 mb-2"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-1 max-h-[200px] overflow-y-auto">
              {blockRegistry.getAll().filter(e => e.type !== 'calendar_view' && e.type !== 'finance_widget' && e.type !== 'it_inventory_widget' && e.type !== 'jellyfin_player').map((entry) => {
                const Icon = entry.icon;
                return (
                  <button
                    key={entry.type}
                    onClick={() => addBlockMutation.mutate(entry.type)}
                    disabled={addBlockMutation.isPending}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-bg-surface text-sm text-left transition-colors disabled:opacity-50"
                  >
                    <Icon className="h-4 w-4" /> {entry.label}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setAddingBlock(null)} className="w-full mt-2 px-3 py-1.5 rounded-lg text-sm text-fg-muted hover:text-fg hover:bg-bg-surface transition-colors">
              Abbrechen
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingBlock('menu')}
            className="w-full py-2 rounded-lg text-sm text-fg-muted hover:text-fg hover:bg-bg-surface transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" /> Block hinzufügen
          </button>
        )}
      </div>

      {/* Relations Section */}
      <RelationsSection pageId={pageId} allPages={allPages} onNavigate={(id) => router.push(`/pages?open=${id}`)} />

      {/* Version History Modals */}
      {showBlockHistory && (
        <BlockVersionHistory
          pageId={pageId}
          blockId={showBlockHistory}
          onClose={() => setShowBlockHistory(null)}
        />
      )}
      {showPageHistory && (
        <PageVersionHistory
          pageId={pageId}
          onClose={() => setShowPageHistory(false)}
        />
      )}
    </div>
  );
}

/* ─── Seiten-Übersicht (Notion-Stil: Unterseiten, Übergeordnete Seiten, Dokumente, Aufgaben, Zeitraum) ─── */
interface OverviewTask {
  id: string;
  text: string;
  checked: boolean;
}

interface OverviewTimelineEntry {
  id: string;
  date: string;
  title: string;
  description: string;
}

function PageOverview({ page, allPages, onNavigate }: {
  page: PageDetail; allPages: Page[]; onNavigate: (id: string) => void;
}) {
  // Unterseiten: Seiten, deren parentId auf diese Seite zeigt
  const subpages = allPages.filter((p) => p.parentId === page.id);

  // Übergeordnete Seiten: Parent-Kette nach oben
  const parentChain: Page[] = [];
  {
    let current = allPages.find((p) => p.id === page.parentId);
    let guard = 0;
    while (current && guard < 20) {
      parentChain.push(current);
      current = allPages.find((p) => p.id === current!.parentId);
      guard++;
    }
  }

  // Dokumente: file-/link-/bookmark-Blöcke (automatisch aus den Blocks der Seite)
  const docBlocks = page.blocks.filter((b) => {
    if (b.type === 'file') return !!(b.content?.mediaId || b.content?.url);
    if (b.type === 'link' || b.type === 'bookmark') return !!b.content?.url;
    return false;
  });

  // Aufgaben: todo-Blöcke + Checklist-Items
  const tasks: OverviewTask[] = page.blocks.flatMap((b) => {
    if (b.type === 'todo') {
      const text = String(b.content?.text ?? '').trim();
      if (!text) return [];
      return [{ id: b.id, text, checked: !!(b.content?.checked as boolean) }];
    }
    if (b.type === 'checklist') {
      return ((b.content?.items as Array<{ id: string; text: string; checked: boolean }>) ?? [])
        .filter((i) => i.text?.trim())
        .map((i) => ({ id: i.id, text: i.text, checked: !!i.checked }));
    }
    return [];
  });

  // Zeitraum: Timeline-Entries der Seite (aufsteigend nach Datum sortiert)
  const timelineEntries: OverviewTimelineEntry[] = page.blocks
    .flatMap((b) => {
      if (b.type !== 'timeline') return [];
      return ((b.content?.entries as Array<{ id: string; date: string; title: string; description: string }>) ?? [])
        .filter((e) => e.title?.trim() || e.date)
        .map((e) => ({ id: e.id, date: e.date ?? '', title: e.title ?? '', description: e.description ?? '' }));
    })
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const hasContent = subpages.length > 0 || parentChain.length > 0 || docBlocks.length > 0 || tasks.length > 0 || timelineEntries.length > 0;
  if (!hasContent) return null;

  const formatDate = (date: string) => {
    if (!date) return '';
    try {
      return new Date(date).toLocaleDateString('de-DE');
    } catch {
      return date;
    }
  };

  const SectionTitle = ({ children, count }: { children: React.ReactNode; count: number }) => (
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
      {children}
      <span className="ml-1.5 rounded-full bg-bg px-1.5 py-0.5 text-[10px] font-medium text-fg-muted">{count}</span>
    </p>
  );

  const PageChip = ({ target, icon }: { target: Page; icon?: React.ReactNode }) => (
    <button
      onClick={() => onNavigate(target.id)}
      className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-fg-muted hover:text-fg hover:bg-bg transition-colors min-w-0"
    >
      <span className="shrink-0 text-xs leading-none">
        {icon ?? target.icon ?? <Notebook className="h-3.5 w-3.5 text-fg-subtle" />}
      </span>
      <span className="truncate">{target.title || 'Unbenannt'}</span>
      <ChevronRight className="ml-auto h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 text-fg-subtle" />
    </button>
  );

  return (
    <div className="rounded-xl border border-border bg-bg-surface/50 p-4">
      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {/* Unterseiten */}
        {subpages.length > 0 && (
          <div>
            <SectionTitle count={subpages.length}>Unterseiten</SectionTitle>
            <div className="space-y-0.5">
              {subpages.map((p) => <PageChip key={p.id} target={p} />)}
            </div>
          </div>
        )}

        {/* Übergeordnete Seiten */}
        {parentChain.length > 0 && (
          <div>
            <SectionTitle count={parentChain.length}>Übergeordnete Seiten</SectionTitle>
            <div className="space-y-0.5">
              {parentChain.map((p) => <PageChip key={p.id} target={p} icon={<FolderUp className="h-3.5 w-3.5 text-fg-subtle" />} />)}
            </div>
          </div>
        )}

        {/* Dokumente */}
        {docBlocks.length > 0 && (
          <div>
            <SectionTitle count={docBlocks.length}>Dokumente</SectionTitle>
            <div className="space-y-0.5">
              {docBlocks.map((b) => {
                const url = String(b.content?.url ?? '');
                const isFile = b.type === 'file';
                const label = isFile
                  ? String(b.content?.filename ?? '') || 'Datei'
                  : String(b.content?.title ?? '') || url || 'Link';
                const href = isFile && b.content?.mediaId
                  ? `http://${window.location.hostname}:3007/api/v1/media/files/${b.content.mediaId}/stream`
                  : url;
                return (
                  <a
                    key={b.id}
                    href={href}
                    target={isFile && b.content?.mediaId ? undefined : '_blank'}
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-fg-muted hover:text-fg hover:bg-bg transition-colors min-w-0"
                    title={url || label}
                  >
                    {isFile ? (
                      <FileText className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
                    ) : (
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
                    )}
                    <span className="truncate">{label}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Zeitraum */}
        {timelineEntries.length > 0 && (
          <div>
            <SectionTitle count={timelineEntries.length}>Zeitraum</SectionTitle>
            <div className="space-y-0.5">
              {timelineEntries.map((e) => (
                <div key={e.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-fg-muted min-w-0">
                  <CalendarClock className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
                  {e.date && <span className="shrink-0 font-medium tabular-nums">{formatDate(e.date)}</span>}
                  {e.title && <span className="truncate">{e.title}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Aufgaben */}
        {tasks.length > 0 && (
          <div className={cn(subpages.length === 0 && parentChain.length === 0 && docBlocks.length === 0 && timelineEntries.length === 0 ? 'sm:col-span-2' : '')}>
            <SectionTitle count={tasks.length}>Aufgaben</SectionTitle>
            <div className="space-y-0.5">
              {tasks.map((t) => (
                <div key={t.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs min-w-0">
                  {t.checked ? (
                    <CheckSquare className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                  ) : (
                    <Square className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
                  )}
                  <span className={cn('truncate', t.checked && 'line-through text-fg-subtle')}>{t.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Relations Section ─── */
function RelationsSection({ pageId, allPages, onNavigate }: {
  pageId: string; allPages: Page[]; onNavigate: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [targetPageId, setTargetPageId] = useState('');
  const [relationType, setRelationType] = useState<string>('reference');

  const { data: relations } = useQuery({
    queryKey: ['page-relations', pageId],
    queryFn: () => api.get<Array<{ id: string; sourcePageId: string; targetPageId: string; relationType: string; label: string | null }>>(`/pages/${pageId}/relations`),
  });

  const addRelationMutation = useMutation({
    mutationFn: () => api.post(`/pages/${pageId}/relations`, {
      targetPageId,
      relationType,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-relations', pageId] });
      setShowAdd(false);
      setTargetPageId('');
    },
  });

  const deleteRelationMutation = useMutation({
    mutationFn: (relationId: string) => api.delete(`/pages/relations/${relationId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['page-relations', pageId] }),
  });

  const relatedPages = relations?.map(r => {
    const targetId = r.sourcePageId === pageId ? r.targetPageId : r.sourcePageId;
    const page = allPages.find(p => p.id === targetId);
    return { ...r, targetId, pageTitle: page?.title || 'Unbekannt' };
  }) || [];

  return (
    <div className="border-t border-border pt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-fg flex items-center gap-2">
          <Link2 className="h-4 w-4 text-fg-muted" /> Verknüpfte Seiten
        </h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs text-amber-600 hover:text-amber-700"
        >
          {showAdd ? 'Abbrechen' : '+ Hinzufügen'}
        </button>
      </div>

      {showAdd && (
        <div className="flex gap-2 mb-3">
          <select
            value={targetPageId}
            onChange={(e) => setTargetPageId(e.target.value)}
            className="flex-1 px-2 py-1.5 rounded border border-border bg-bg text-sm"
          >
            <option value="">Seite wählen...</option>
            {allPages.filter(p => p.id !== pageId).map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
          <select
            value={relationType}
            onChange={(e) => setRelationType(e.target.value)}
            className="px-2 py-1.5 rounded border border-border bg-bg text-sm"
          >
            <option value="reference">Referenz</option>
            <option value="related">Verwandt</option>
            <option value="dependency">Abhängigkeit</option>
            <option value="embedded">Eingebettet</option>
          </select>
          <button
            onClick={() => addRelationMutation.mutate()}
            disabled={!targetPageId || addRelationMutation.isPending}
            className="px-3 py-1.5 rounded bg-amber-600 text-white text-sm disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {relatedPages.length > 0 ? (
        <div className="space-y-1">
          {relatedPages.map((rel) => (
            <div key={rel.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-bg-surface group">
              <button
                onClick={() => onNavigate(rel.targetId)}
                className="text-sm text-amber-600 hover:underline flex items-center gap-2"
              >
                <Link2 className="h-3.5 w-3.5" />
                {rel.pageTitle}
                <span className="text-xs text-fg-muted">({rel.relationType})</span>
              </button>
              <button
                onClick={() => deleteRelationMutation.mutate(rel.id)}
                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-fg-muted">Keine Verknüpfungen</p>
      )}
    </div>
  );
}

/* ─── Main Page (wrapped in Suspense for useSearchParams) ─── */
function PagesPageInner() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(searchParams.get('open'));

  // Register all block types once on mount
  useEffect(() => { registerAllBlocks(); }, []);

  // Auf persist-Hydration warten, BEVOR der Auth-Guard routet — sonst
  // bounced ein Reload auf /pages?open=... über /login nach /dashboard.
  const [authHydrated, setAuthHydrated] = useState(false);
  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) { setAuthHydrated(true); return; }
    const unsub = useAuthStore.persist.onFinishHydration(() => setAuthHydrated(true));
    return unsub;
  }, []);
  useEffect(() => {
    if (authHydrated && !accessToken) router.push('/login');
  }, [authHydrated, accessToken, router]);

  useEffect(() => {
    const open = searchParams.get('open');
    if (open) setSelectedPageId(open);
  }, [searchParams]);

  const { data: pages, isLoading } = useQuery<Page[]>({
    queryKey: ['pages'],
    queryFn: () => api.get<Page[]>('/pages'),
    enabled: !!accessToken,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/pages/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pages'] }); },
  });

  if (!accessToken) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-zinc-400" /></div>;
  }

  if (selectedPageId) {
    return <PageDetailView pageId={selectedPageId} onBack={() => setSelectedPageId(null)} allPages={flattenPages(pages ?? [])} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Seiten</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{pages?.length ?? 0} Hauptseiten</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" /> Neue Seite
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 animate-pulse">
              <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded mb-3" />
              <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
              <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      ) : !pages || pages.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <Notebook className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Noch keine Seiten</p>
          <p className="text-sm mt-1">Erstelle deine erste Seite.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> Neue Seite
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          {pages.map((page) => (
            <TreeNode
              key={page.id}
              node={page}
              onSelect={(id) => setSelectedPageId(id)}
              onDelete={(id) => { if (window.confirm(`"${page.title}" löschen?`)) deleteMutation.mutate(id); }}
            />
          ))}
        </div>
      )}

      <CreatePageDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['pages'] })}
        pages={pages ?? []}
      />
    </div>
  );
}

export default function PagesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div></div>}>
      <PagesPageInner />
    </Suspense>
  );
}
