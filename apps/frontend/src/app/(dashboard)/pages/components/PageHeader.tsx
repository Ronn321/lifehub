'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { BUILTIN_COVERS, getBuiltinCover, isBuiltinCover } from '@/lib/builtinCovers';
import {
  Image, Home, Loader2, Sparkles,
} from 'lucide-react';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

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
  blocks?: unknown[];
}

interface MediaItem {
  id: string;
  filename: string;
  mimeType: string;
  thumbnailPath: string | null;
  url: string;
}

export function PageHeader({
  page,
  allPages,
  onNavigate,
  wide = false,
}: {
  page: Page;
  allPages: Page[];
  onNavigate: (id: string | null) => void;
  wide?: boolean;
}) {
  const queryClient = useQueryClient();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState(page.description ?? '');
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

  const updateMutation = useMutation({
    mutationFn: (data: { icon?: string; coverMediaId?: string | null; description?: string }) =>
      api.put(`/pages/${page.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page', page.id] });
      queryClient.invalidateQueries({ queryKey: ['pages'] });
    },
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isEditingDescription && descriptionInputRef.current) {
      descriptionInputRef.current.focus();
    }
  }, [isEditingDescription]);

  useEffect(() => {
    if (!isEditingDescription) {
      setDescriptionValue(page.description ?? '');
    }
  }, [page.description, isEditingDescription]);

  const parents = buildBreadcrumb(page.id, allPages);

  const handleDescriptionSave = () => {
    setIsEditingDescription(false);
    if (descriptionValue !== (page.description ?? '')) {
      updateMutation.mutate({ description: descriptionValue || undefined });
    }
  };

  return (
    <div className="mb-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-fg-muted mb-4">
        <button
          onClick={() => onNavigate(null)}
          className="flex items-center gap-1 hover:text-fg transition-colors"
        >
          <Home className="h-3.5 w-3.5" />
          <span>Seiten</span>
        </button>
        {parents.map((p) => (
          <span key={p.id} className="flex items-center gap-1.5">
            <span className="text-fg-subtle">/</span>
            <button
              onClick={() => onNavigate(p.id)}
              className="hover:text-fg transition-colors truncate max-w-[150px]"
            >
              {p.icon && <span className="mr-1">{p.icon}</span>}
              {p.title}
            </button>
          </span>
        ))}
      </nav>

      {/* Cover Image — bei wide: volle Breite des Hauptbereichs (Notion-Stil) */}
      {page.coverMediaId ? (
        <div className={`relative overflow-hidden mb-4 group ${wide ? '-mx-6 lg:-mx-8 h-[220px] rounded-none' : 'w-full h-[200px] rounded-xl'}`}>
          <CoverImage mediaId={page.coverMediaId} />
          <button
            onClick={() => updateMutation.mutate({ coverMediaId: null })}
            className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/50 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
          >
            Cover entfernen
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowCoverPicker(true)}
          className={`w-full h-12 rounded-xl border-2 border-dashed border-border hover:border-fg-subtle text-sm text-fg-muted hover:text-fg transition-colors flex items-center justify-center gap-2 mb-4 ${wide ? '-mx-6 lg:-mx-8 rounded-none w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)]' : ''}`}
        >
          <Image className="h-4 w-4" />
          Cover hinzufügen
        </button>
      )}

      {/* Icon + Title */}
      <div className="flex items-start gap-3">
        <div className="relative" ref={emojiPickerRef}>
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="text-5xl leading-none hover:bg-bg-surface rounded-lg p-1 transition-colors cursor-pointer"
            title="Icon andern"
          >
            {page.icon || <span className="opacity-30 text-4xl">+</span>}
          </button>
          {showEmojiPicker && (
            <div className="absolute top-full left-0 z-50 mt-2">
              <EmojiPicker
                onEmojiClick={(emoji) => {
                  updateMutation.mutate({ icon: emoji.emoji });
                  setShowEmojiPicker(false);
                }}
                width={320}
                height={400}
                theme={undefined}
                lazyLoadEmojis
              />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">{page.title}</h1>

          {/* Description */}
          {isEditingDescription ? (
            <textarea
              ref={descriptionInputRef}
              className="w-full mt-1 text-sm text-fg-muted bg-transparent border-none outline-none resize-none placeholder:text-fg-subtle"
              placeholder="Beschreibung hinzufugen..."
              rows={1}
              value={descriptionValue}
              onChange={(e) => setDescriptionValue(e.target.value)}
              onBlur={handleDescriptionSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleDescriptionSave();
                }
              }}
            />
          ) : (
            <p
              onClick={() => setIsEditingDescription(true)}
              className="mt-1 text-sm text-fg-muted cursor-text hover:text-fg transition-colors"
            >
              {page.description || 'Beschreibung hinzufugen...'}
            </p>
          )}
        </div>
      </div>

      {/* Cover Picker Modal */}
      {showCoverPicker && (
        <MediaPickerModal
          onClose={() => setShowCoverPicker(false)}
          onSelect={(mediaId) => {
            updateMutation.mutate({ coverMediaId: mediaId });
            setShowCoverPicker(false);
          }}
        />
      )}
    </div>
  );
}

function CoverImage({ mediaId }: { mediaId: string }) {
  const [src, setSrc] = useState<string | null>(null);

  // Built-in covers render directly (photo or gradient), no media lookup needed
  if (isBuiltinCover(mediaId)) {
    const cover = getBuiltinCover(mediaId);
    if (cover?.image) {
      return <img src={cover.image} alt={cover.name ?? 'Cover'} className="w-full h-full object-cover" />;
    }
    return (
      <div
        className="w-full h-full"
        style={cover?.background ? { background: cover.background } : undefined}
        aria-label={cover?.name ?? 'Cover'}
      />
    );
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<{ url: string }>(`/media/${mediaId}`);
        setSrc(res.url);
      } catch {
        setSrc(null);
      }
    }
    load();
  }, [mediaId]);

  if (!src) {
    return (
      <div className="w-full h-full bg-bg-surface animate-pulse flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-fg-muted" />
      </div>
    );
  }

  return <img src={src} alt="Cover" className="w-full h-full object-cover" />;
}

function MediaPickerModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (mediaId: string) => void;
}) {
  const [tab, setTab] = useState<'builtin' | 'media'>('builtin');
  const { data: media, isLoading } = useQuery<MediaItem[]>({
    queryKey: ['media-files'],
    queryFn: () => api.get<MediaItem[]>('/media'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-2xl p-6 mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">Cover-Bild auswählen</h2>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab('builtin')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
              tab === 'builtin'
                ? 'bg-white dark:bg-zinc-700 text-fg shadow-sm'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" /> Standard
          </button>
          <button
            onClick={() => setTab('media')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
              tab === 'media'
                ? 'bg-white dark:bg-zinc-700 text-fg shadow-sm'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Image className="h-3.5 w-3.5" /> Eigene Medien
          </button>
        </div>

        {tab === 'builtin' ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {BUILTIN_COVERS.map((cover) => (
              <button
                key={cover.id}
                onClick={() => onSelect(cover.id)}
                title={cover.name}
                className="relative rounded-lg border-2 border-border overflow-hidden aspect-video hover:border-brand-500 transition-colors group"
              >
                {cover.image ? (
                  <img src={cover.image} alt={cover.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full" style={{ background: cover.background }} />
                )}
                <span aria-hidden className="absolute bottom-0 inset-x-0 px-2 py-1 text-[10px] text-white bg-black/40 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                  {cover.name}
                </span>
              </button>
            ))}
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-fg-muted" />
          </div>
        ) : !media || media.length === 0 ? (
          <p className="text-sm text-fg-muted text-center py-8">Keine Medien vorhanden.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {media
              .filter((m) => m.mimeType?.startsWith('image/'))
              .map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className="relative rounded-lg border-2 border-border overflow-hidden aspect-video hover:border-brand-500 transition-colors"
                >
                  {item.thumbnailPath ? (
                    <img src={item.thumbnailPath} alt={item.filename} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-bg-surface text-fg-muted">
                      <Image className="h-6 w-6" />
                    </div>
                  )}
                </button>
              ))}
          </div>
        )}
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-bg-surface transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}

function buildBreadcrumb(
  pageId: string,
  allPages: Page[],
): Array<{ id: string; title: string; icon: string | null }> {
  const map = new Map<string, Page>();
  for (const p of allPages) {
    map.set(p.id, p);
  }

  const chain: Array<{ id: string; title: string; icon: string | null }> = [];
  let current = map.get(pageId);
  while (current?.parentId) {
    const parent = map.get(current.parentId);
    if (parent) {
      chain.unshift({ id: parent.id, title: parent.title, icon: parent.icon });
      current = parent;
    } else {
      break;
    }
  }
  return chain;
}
