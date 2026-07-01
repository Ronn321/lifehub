'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
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
import {
  Plus, Notebook, Loader2, Trash2,
  Heading, Type, Image, Grid3X3, File, Minus, Bold, Italic,
  List, ListOrdered, Check,
  ChevronRight, MessageSquare, Quote, Code, Bookmark, Table2, Link2,
} from 'lucide-react';

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
  | 'bookmark' | 'table' | 'page-reference';

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
};

/* ─── TipTap Editor ─── */
function TipTapEditor({ content, onUpdate, debounceMs = 1000 }: {
  content: Record<string, unknown>; onUpdate: (json: Record<string, unknown>) => void; debounceMs?: number;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: 'Text eingeben...' }),
    ],
    content: (content?.json as Record<string, unknown>) ?? { type: 'doc', content: [] },
    onUpdate: ({ editor: ed }) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onUpdate({ json: ed.getJSON() });
      }, debounceMs);
    },
    editorProps: {
      attributes: { class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[80px]' },
    },
  });

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  if (!editor) return <div className="h-20 animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded" />;

  return (
    <div className="border border-zinc-300 dark:border-zinc-700 rounded-lg overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1 rounded ${editor.isActive('bold') ? 'bg-zinc-300 dark:bg-zinc-700' : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1 rounded ${editor.isActive('italic') ? 'bg-zinc-300 dark:bg-zinc-700' : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <span className="w-px h-4 bg-zinc-300 dark:bg-zinc-700 mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-1 rounded text-xs font-bold ${editor.isActive('heading', { level: 1 }) ? 'bg-zinc-300 dark:bg-zinc-700' : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1 rounded text-xs font-bold ${editor.isActive('heading', { level: 2 }) ? 'bg-zinc-300 dark:bg-zinc-700' : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-1 rounded text-xs font-bold ${editor.isActive('heading', { level: 3 }) ? 'bg-zinc-300 dark:bg-zinc-700' : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
        >
          H3
        </button>
        <span className="w-px h-4 bg-zinc-300 dark:bg-zinc-700 mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1 rounded ${editor.isActive('bulletList') ? 'bg-zinc-300 dark:bg-zinc-700' : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1 rounded ${editor.isActive('orderedList') ? 'bg-zinc-300 dark:bg-zinc-700' : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="p-3">
        <EditorContent editor={editor} />
      </div>
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
  return (
    <div>
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer hover:bg-bg-surface transition-colors group"
        style={{ paddingLeft: `${12 + depth * 20}px` }}
        onClick={() => onSelect(node.id)}
      >
        <Notebook className="h-4 w-4 text-fg-muted shrink-0" />
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
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post<Page>('/pages', {
      title,
      description: description || undefined,
      parentId: parentId || undefined,
    }),
    onSuccess: () => {
      setTitle(''); setDescription(''); setParentId(''); setError('');
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

/* ─── Block Editor (inline) ─── */
function BlockEditor({ block, onUpdate, pageId, allPages, onNavigate }: {
  block: PageBlock; onUpdate: (data: Partial<PageBlock>) => void; pageId: string;
  allPages: Page[]; onNavigate: (id: string) => void;
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
      <div className="group/heading">
        <div
          contentEditable
          suppressContentEditableWarning
          className={`outline-none min-h-[1em] ${levelClasses} placeholder:text-fg-muted`}
          data-placeholder={level === 1 ? 'Überschrift 1' : level === 3 ? 'Überschrift 3' : 'Überschrift 2'}
          onBlur={(e) => onUpdate({ content: { ...block.content, text: e.currentTarget.textContent ?? '' } })}
          dangerouslySetInnerHTML={{ __html: text }}
        />
      </div>
    );
  }

  if (block.type === 'text') {
    return (
      <div className="group">
        <TipTapEditor
          content={block.content}
          onUpdate={(json) => onUpdate({ content: json })}
        />
      </div>
    );
  }

  if (block.type === 'image') {
    const mediaId = block.content?.mediaId as string | undefined;
    return (
      <div className="group">
        <div className="text-xs text-fg-muted mb-1 flex items-center gap-2">
          {blockLabel.image}
          <button
            onClick={() => setShowMediaPicker(true)}
            className="text-amber-600 hover:underline text-[10px]"
          >
            {mediaId ? 'Ändern' : 'Auswählen'}
          </button>
        </div>
        {mediaId ? (
          <div className="rounded-lg border border-zinc-300 dark:border-zinc-700 p-3 text-sm text-fg-muted">
            <Image className="h-5 w-5 inline mr-2" />
            Medien-ID: {mediaId}
          </div>
        ) : (
          <button
            onClick={() => setShowMediaPicker(true)}
            className="w-full py-8 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-700 text-sm text-fg-muted hover:text-fg transition-colors flex items-center justify-center gap-2"
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
      <div className="group">
        <div className="text-xs text-fg-muted mb-1 flex items-center gap-2">
          {blockLabel.gallery}
          <button
            onClick={() => setShowMediaPicker(true)}
            className="text-amber-600 hover:underline text-[10px]"
          >
            {mediaIds.length > 0 ? `${mediaIds.length} Bilder` : 'Auswählen'}
          </button>
        </div>
        <button
          onClick={() => setShowMediaPicker(true)}
          className="w-full py-4 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-sm text-fg-muted hover:text-fg transition-colors flex items-center justify-center gap-2"
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
      <div className="group">
        <div className="text-sm text-fg-muted">
          {blockIcon['file-list']} {blockLabel['file-list']} Block
        </div>
      </div>
    );
  }

  if (block.type === 'divider') {
    return (
      <div className="group py-2">
        <hr className="border-border" />
      </div>
    );
  }

  if (block.type === 'todo') {
    return (
      <div className="group">
        <TodoBlock
          checked={(block.content?.checked as boolean) ?? false}
          text={(block.content?.text as string) ?? ''}
          onChange={(data) => onUpdate({ content: { ...block.content, ...data } })}
        />
      </div>
    );
  }

  if (block.type === 'toggle') {
    return (
      <div className="group">
        <ToggleBlock
          label={(block.content?.label as string) ?? ''}
          content={(block.content?.content as string) ?? ''}
          isOpen={(block.content?.isOpen as boolean) ?? false}
          onChange={(data) => onUpdate({ content: { ...block.content, ...data } })}
        />
      </div>
    );
  }

  if (block.type === 'callout') {
    return (
      <div className="group">
        <CalloutBlock
          icon={(block.content?.icon as string) ?? '💡'}
          variant={(block.content?.variant as 'info' | 'warning' | 'error' | 'success') ?? 'info'}
          text={(block.content?.text as string) ?? ''}
          onChange={(data) => onUpdate({ content: { ...block.content, ...data } })}
        />
      </div>
    );
  }

  if (block.type === 'quote') {
    return (
      <div className="group">
        <QuoteBlock
          text={(block.content?.text as string) ?? ''}
          onChange={(data) => onUpdate({ content: { ...block.content, ...data } })}
        />
      </div>
    );
  }

  if (block.type === 'code') {
    return (
      <div className="group">
        <CodeBlock
          language={(block.content?.language as string) ?? 'javascript'}
          code={(block.content?.code as string) ?? ''}
          onChange={(data) => onUpdate({ content: { ...block.content, ...data } })}
        />
      </div>
    );
  }

  if (block.type === 'bookmark') {
    return (
      <div className="group">
        <BookmarkBlock
          url={(block.content?.url as string) ?? ''}
          title={block.content?.title as string}
          description={block.content?.description as string}
          image={block.content?.image as string}
          onChange={(data) => onUpdate({ content: { ...block.content, ...data } })}
        />
      </div>
    );
  }

  if (block.type === 'table') {
    return (
      <div className="group">
        <TableBlock
          columns={(block.content?.columns as Array<{ id: string; name: string; type: 'text' | 'number' | 'date' }>) ?? []}
          rows={(block.content?.rows as Array<{ id: string; cells: Record<string, string> }>) ?? []}
          functions={(block.content?.functions as Record<string, 'sum' | 'avg' | 'min' | 'max' | 'count'>) ?? {}}
          onChange={(data) => onUpdate({ content: { ...block.content, ...data } })}
        />
      </div>
    );
  }

  if (block.type === 'page-reference') {
    return (
      <div className="group">
        <PageReferenceBlock
          pageId={(block.content?.pageId as string) ?? ''}
          pages={allPages}
          onChange={(data) => onUpdate({ content: { ...block.content, ...data } })}
        />
      </div>
    );
  }

  return (
    <div className="group">
      <div className="text-sm text-fg-muted">
        {blockIcon[block.type]} {blockLabel[block.type]} Block
      </div>
    </div>
  );
}

/* ─── Detail View ─── */
function PageDetailView({ pageId, onBack, allPages }: { pageId: string; onBack: () => void; allPages: Page[] }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [addingBlock, setAddingBlock] = useState<string | null>(null);
  const [error, setError] = useState('');

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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['page', pageId] }); },
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
    if (!page) return;
    const sorted = [...page.blocks].sort((a, b) => a.sortOrder - b.sortOrder);
    const newBlocks = [...sorted];
    const [moved] = newBlocks.splice(oldIndex, 1);
    if (!moved) return;
    newBlocks.splice(newIndex, 0, moved);
    reorderBlockMutation.mutate(
      newBlocks.map((b, i) => ({ id: b.id, sortOrder: i }))
    );
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
    updateBlockMutation.mutate({
      blockId,
      data: { type: newType as PageBlock['type'], content: BLOCK_DEFAULTS[newType] ?? {} },
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
    <div className="space-y-6 max-w-3xl">
      <PageHeader page={page} allPages={allPages} onNavigate={(id) => id ? router.push(`/pages?open=${id}`) : onBack()} />

      <div className="flex items-center justify-between">
        <div />
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
            {(block, dragHandleProps) => {
              const pageBlock = block as unknown as PageBlock;
              return (
                <div className="group relative">
                  <BlockHandle
                    blockId={block.id}
                    currentType={(block.type ?? 'text') as BlockType}
                    onTypeChange={(newType) => handleBlockTypeChange(block.id, newType)}
                    onDelete={() => { if (window.confirm('Diesen Block loschen?')) deleteBlockMutation.mutate(block.id); }}
                    onDuplicate={() => duplicateBlockMutation.mutate(pageBlock)}
                    onMoveUp={() => handleMoveBlock(block.id, 'up')}
                    onMoveDown={() => handleMoveBlock(block.id, 'down')}
                    dragHandleProps={dragHandleProps}
                  />
                  <BlockEditor
                    block={pageBlock}
                    pageId={pageId}
                    allPages={allPages}
                    onNavigate={(id) => router.push(`/pages?open=${id}`)}
                    onUpdate={(data) => updateBlockMutation.mutate({ blockId: block.id, data })}
                  />
                </div>
              );
            }}
          </DragDropContainer>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        {addingBlock ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {(['heading', 'text', 'todo', 'toggle', 'image', 'gallery', 'file-list', 'divider', 'callout', 'quote', 'code', 'bookmark', 'table', 'page-reference'] as const).map((type) => (
              <button
                key={type}
                onClick={() => addBlockMutation.mutate(type)}
                disabled={addBlockMutation.isPending}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-bg-surface text-sm transition-colors disabled:opacity-50"
              >
                {blockIcon[type]} {blockLabel[type]}
              </button>
            ))}
            <button onClick={() => setAddingBlock(null)} className="px-3 py-2 rounded-lg text-sm text-fg-muted hover:text-fg transition-colors">
              Abbrechen
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingBlock('menu')}
            className="w-full py-3 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-700 text-sm text-fg-muted hover:text-fg hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" /> Block hinzufügen
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function PagesPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(searchParams.get('open'));

  useEffect(() => { if (!accessToken) router.push('/login'); }, [accessToken, router]);

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
