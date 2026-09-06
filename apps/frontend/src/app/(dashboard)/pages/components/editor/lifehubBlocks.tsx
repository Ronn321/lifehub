'use client';

/**
 * LifeHub-Custom-Blocks für BlockNote.
 *
 * Konvention: Block-Props sind Primitive (BlockNote-Bedingung); komplexe
 * Daten (Arrays/Objekte) werden als JSON-Strings in einem Prop gehalten
 * (mediaIds, data, entries). Die Specs wrappen die bestehenden Block-
 * Komponenten als NodeViews, sodass altes Verhalten erhalten bleibt.
 */

import { ReactNode, createContext, useContext, useState } from 'react';
import {
  type BlockNoteEditor,
  insertOrUpdateBlock,
  filterSuggestionItems,
} from '@blocknote/core';
import { SuggestionMenuController, getDefaultReactSlashMenuItems, createReactBlockSpec, type DefaultReactSuggestionItem } from '@blocknote/react';
import type { CalloutVariant } from '../blocks/CalloutBlock';
import { CalloutBlock } from '../blocks/CalloutBlock';
import { ToggleBlock } from '../blocks/ToggleBlock';
import { TableBlock } from '../blocks/TableBlock';
import { BookmarkBlock } from '../blocks/BookmarkBlock';
import { EmbedBlock } from '../blocks/EmbedBlock';
import { VideoBlock } from '../blocks/VideoBlock';
import { FileBlock } from '../blocks/FileBlock';
import { MapBlock } from '../blocks/MapBlock';
import { PageReferenceBlock } from '../blocks/PageReferenceBlock';
import { SearchBlock } from '../blocks/SearchBlock';
import { TimelineBlock } from '../blocks/TimelineBlock';
import { ResearchWorkspaceBlock } from '../blocks/ResearchWorkspaceBlock';
import { BrowserBlock } from '../blocks/BrowserBlock';
import { MediaPickerModal } from '../PageHeader';
import { mediaFileUrl } from '@/lib/api';
import { Image as ImageIcon, Plus } from 'lucide-react';

/* ─── Kontext: Seiteninfos für Blocks, die sie brauchen ─── */

export interface EditorPageRef {
  id: string;
  title: string;
  icon: string | null;
  description: string | null;
}

export interface LifehubEditorContextValue {
  pageId: string;
  pages: EditorPageRef[];
  onNavigate: (pageId: string) => void;
}

export const LifehubEditorContext = createContext<LifehubEditorContextValue>({
  pageId: '',
  pages: [],
  onNavigate: () => undefined,
});

export const useLifehubEditor = () => useContext(LifehubEditorContext);

/* ─── JSON-Prop-Helper ─── */

function parseJsonProp<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string' || value.length === 0) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/* ─── Divider ─── */

export const Divider = createReactBlockSpec(
  {
    type: 'divider',
    propSchema: {},
    content: 'none',
  },
  {
    render: () => <hr className="my-3 border-border" />,
  },
);

/* ─── Callout ─── */

export const Callout = createReactBlockSpec(
  {
    type: 'callout',
    propSchema: {
      icon: { default: '💡' },
      variant: { default: 'info' },
      text: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => (
      <CalloutBlock
        icon={block.props.icon}
        variant={(block.props.variant as CalloutVariant) ?? 'info'}
        text={block.props.text}
        onChange={(data) => editor.updateBlock(block, { props: { ...data } })}
      />
    ),
  },
);

/* ─── Toggle (legacy-Layout: label + content) ─── */

export const Toggle = createReactBlockSpec(
  {
    type: 'toggle',
    propSchema: {
      label: { default: '' },
      content: { default: '' },
      isOpen: { default: true },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => (
      <ToggleBlock
        label={block.props.label}
        content={block.props.content}
        isOpen={Boolean(block.props.isOpen)}
        onChange={(data) => editor.updateBlock(block, { props: { ...data } })}
      />
    ),
  },
);

/* ─── LifeHub-Bild (mediaId-basiert, mit Media-Picker) ─── */

export const LifehubImage = createReactBlockSpec(
  {
    type: 'lifehubImage',
    propSchema: {
      mediaId: { default: '' },
      url: { default: '' },
      alt: { default: '' },
      caption: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => (
      <LifehubImageView
        props={block.props}
        onUpdate={(data) => editor.updateBlock(block, { props: { ...block.props, ...data } })}
      />
    ),
  },
);

function LifehubImageView({
  props,
  onUpdate,
}: {
  props: { mediaId: string; url: string; alt: string; caption: string };
  onUpdate: (data: Partial<{ mediaId: string; url: string; alt: string; caption: string }>) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const src = props.mediaId ? mediaFileUrl(props.mediaId) : props.url;

  if (!src) {
    return (
      <>
        <button
          onClick={() => setShowPicker(true)}
          className="w-full py-6 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-sm text-fg-muted hover:text-fg hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors flex items-center justify-center gap-2"
        >
          <ImageIcon className="h-4 w-4" /> Bild auswählen
        </button>
        {showPicker && (
          <MediaPickerModal
            onClose={() => setShowPicker(false)}
            onSelect={(mediaId) => {
              onUpdate({ mediaId, url: '' });
              setShowPicker(false);
            }}
          />
        )}
      </>
    );
  }

  return (
    <figure className="my-1">
      <img src={src} alt={props.alt || props.caption || 'Bild'} className="max-w-full rounded-lg" />
      <input
        type="text"
        value={props.caption}
        onChange={(e) => onUpdate({ caption: e.target.value })}
        placeholder="Bildunterschrift…"
        aria-label="Bildunterschrift"
        className="mt-1 w-full bg-transparent text-xs text-fg-muted outline-none border-none placeholder:text-fg-subtle"
      />
    </figure>
  );
}

/* ─── Gallery (Bilder-Raster) ─── */

export const Gallery = createReactBlockSpec(
  {
    type: 'gallery',
    propSchema: {
      mediaIds: { default: '[]' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => (
      <GalleryView
        mediaIdsJson={block.props.mediaIds}
        onUpdate={(mediaIds) => editor.updateBlock(block, { props: { mediaIds: JSON.stringify(mediaIds) } })}
      />
    ),
  },
);

function GalleryView({ mediaIdsJson, onUpdate }: { mediaIdsJson: string; onUpdate: (ids: string[]) => void }) {
  const [showPicker, setShowPicker] = useState(false);
  const mediaIds = parseJsonProp<string[]>(mediaIdsJson, []);

  return (
    <div className="my-1">
      {mediaIds.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {mediaIds.map((id) => (
            <div key={id} className="group relative aspect-video overflow-hidden rounded-lg border border-border">
              <img src={mediaFileUrl(id, 'thumbnail')} alt="Galeriebild" className="h-full w-full object-cover" loading="lazy" />
              <button
                onClick={() => onUpdate(mediaIds.filter((entry) => entry !== id))}
                className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
                title="Bild entfernen"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-fg-muted">Noch keine Bilder in der Galerie.</p>
      )}
      <button
        onClick={() => setShowPicker(true)}
        className="mt-2 flex items-center gap-1.5 rounded-md border border-dashed border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-xs text-fg-muted hover:text-fg transition-colors"
      >
        <Plus className="h-3.5 w-3.5" /> Bild hinzufügen
      </button>
      {showPicker && (
        <MediaPickerModal
          onClose={() => setShowPicker(false)}
          onSelect={(mediaId) => {
            if (!mediaIds.includes(mediaId)) onUpdate([...mediaIds, mediaId]);
            setShowPicker(false);
          }}
        />
      )}
    </div>
  );
}

/* ─── Tabelle (legacy-Datenmodell via JSON-Prop) ─── */

export const LifehubTable = createReactBlockSpec(
  {
    type: 'lifehubTable',
    propSchema: {
      data: { default: '{"columns":[],"rows":[],"functions":{}}' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      const data = parseJsonProp<{ columns?: unknown; rows?: unknown; functions?: unknown }>(block.props.data, {});
      return (
        <TableBlock
          columns={(data.columns ?? []) as never}
          rows={(data.rows ?? []) as never}
          functions={(data.functions ?? {}) as never}
          onChange={(next) => editor.updateBlock(block, { props: { data: JSON.stringify(next) } })}
        />
      );
    },
  },
);

/* ─── Bookmark ─── */

export const Bookmark = createReactBlockSpec(
  {
    type: 'bookmark',
    propSchema: {
      url: { default: '' },
      title: { default: '' },
      description: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => (
      <BookmarkBlock
        url={block.props.url}
        title={block.props.title || undefined}
        description={block.props.description || undefined}
        onChange={(data) => editor.updateBlock(block, { props: { url: data.url, title: data.title ?? '', description: data.description ?? '' } })}
      />
    ),
  },
);

/* ─── Embed (iframe) ─── */

export const LifehubEmbed = createReactBlockSpec(
  {
    type: 'lifehubEmbed',
    propSchema: {
      url: { default: '' },
      html: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => (
      <EmbedBlock
        url={block.props.url}
        html={block.props.html}
        onChange={(data) => editor.updateBlock(block, { props: { url: data.url, html: data.html } })}
      />
    ),
  },
);

/* ─── Video ─── */

export const LifehubVideo = createReactBlockSpec(
  {
    type: 'lifehubVideo',
    propSchema: {
      mediaId: { default: '' },
      url: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => (
      <VideoBlock
        mediaId={block.props.mediaId}
        url={block.props.url}
        onChange={(data) => editor.updateBlock(block, { props: { mediaId: data.mediaId, url: data.url } })}
      />
    ),
  },
);

/* ─── Datei ─── */

export const LifehubFile = createReactBlockSpec(
  {
    type: 'lifehubFile',
    propSchema: {
      mediaId: { default: '' },
      name: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => (
      <FileBlock
        mediaId={block.props.mediaId}
        filename={block.props.name}
        url={block.props.mediaId ? mediaFileUrl(block.props.mediaId) : ''}
        onChange={(data) => editor.updateBlock(block, { props: { mediaId: data.mediaId, name: data.filename } })}
      />
    ),
  },
);

/* ─── Karte ─── */

export const Map = createReactBlockSpec(
  {
    type: 'map',
    propSchema: {
      lat: { default: 0 },
      lng: { default: 0 },
      zoom: { default: 13 },
      markerTitle: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => (
      <MapBlock
        lat={Number(block.props.lat) || 0}
        lng={Number(block.props.lng) || 0}
        zoom={Number(block.props.zoom) || 13}
        markerTitle={block.props.markerTitle}
        onChange={(data) => editor.updateBlock(block, { props: { ...data } })}
      />
    ),
  },
);

/* ─── Seitenverweis ─── */

// Hooks (useLifehubEditor) gehören in benannte Komponenten — die render-
// Callbacks der Block-Specs sind keine Komponenten (react-hooks/rules-of-hooks).
function PageReferenceView({ block, editor }: { block: any; editor: any }) {
  const { pages } = useLifehubEditor();
  return (
    <PageReferenceBlock
      pageId={block.props.pageId}
      pages={pages}
      onChange={(data) => editor.updateBlock(block, { props: { pageId: data.pageId } })}
    />
  );
}

export const PageReference = createReactBlockSpec(
  {
    type: 'pageReference',
    propSchema: {
      pageId: { default: '' },
    },
    content: 'none',
  },
  {
    render: (props) => <PageReferenceView block={props.block} editor={props.editor} />,
  },
);

/* ─── Suche in Seiten ─── */

function SearchView({ block, editor }: { block: any; editor: any }) {
  const { pageId, onNavigate } = useLifehubEditor();
  return (
    <SearchBlock
      pageId={pageId}
      scope={block.props.scope as 'page' | 'domain' | 'global'}
      onNavigate={(id) => {
        onNavigate(id);
      }}
    />
  );
}

export const Search = createReactBlockSpec(
  {
    type: 'search',
    propSchema: {
      scope: { default: 'page' },
    },
    content: 'none',
  },
  {
    render: (props) => <SearchView block={props.block} editor={props.editor} />,
  },
);

/* ─── Timeline ─── */

export const Timeline = createReactBlockSpec(
  {
    type: 'timeline',
    propSchema: {
      entries: { default: '[]' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => (
      <TimelineBlock
        entries={parseJsonProp(block.props.entries, []) as never}
        onChange={(data) => editor.updateBlock(block, { props: { entries: JSON.stringify(data.entries) } })}
      />
    ),
  },
);

/* ─── Research Workspace ─── */

function ResearchWorkspaceView({ block, editor }: { block: any; editor: any }) {
  const { pageId } = useLifehubEditor();
  const content = parseJsonProp<Record<string, unknown>>(block.props.data, {});
  return (
    <ResearchWorkspaceBlock
      blockId={block.id}
      pageId={pageId}
      content={content}
      onChange={(data) => editor.updateBlock(block, { props: { data: JSON.stringify(data) } })}
    />
  );
}

export const ResearchWorkspace = createReactBlockSpec(
  {
    type: 'researchWorkspace',
    propSchema: {
      data: { default: '{}' },
    },
    content: 'none',
  },
  {
    render: (props) => <ResearchWorkspaceView block={props.block} editor={props.editor} />,
  },
);

/* ─── Eingebetteter Browser ─── */

function BrowserEmbedView({ block, editor }: { block: any; editor: any }) {
  const { pageId } = useLifehubEditor();
  return (
    <BrowserBlock
      blockId={block.id}
      pageId={pageId}
      content={{ sessionId: block.props.sessionId, startUrl: block.props.startUrl }}
      onChange={(data) => editor.updateBlock(block, {
        props: {
          sessionId: typeof data.sessionId === 'string' ? data.sessionId : '',
          startUrl: typeof data.startUrl === 'string' ? data.startUrl : block.props.startUrl,
        },
      })}
    />
  );
}

export const BrowserEmbed = createReactBlockSpec(
  {
    type: 'browserEmbed',
    propSchema: {
      sessionId: { default: '' },
      startUrl: { default: '' },
    },
    content: 'none',
  },
  {
    render: (props) => <BrowserEmbedView block={props.block} editor={props.editor} />,
  },
);

/* ─── Schema + Slash-Menü-Items ─── */

export function createLifehubInsertItems(editor: BlockNoteEditor<any, any>) {
  const insert = (title: string, aliases: string[], icon: ReactNode, block: Record<string, unknown>) => ({
    title,
    onItemClick: () => {
      // void-Kontext: insertOrUpdateBlock gibt einen Block zurück, das
      // Slash-Menü-Item verlangt aber onItemClick: void.
      insertOrUpdateBlock(editor, block as never);
    },
    aliases,
    group: 'LifeHub',
    icon,
  });

  return [
    insert('Callout', ['callout', 'hinweis'], <span>💡</span>, { type: 'callout', props: { variant: 'info' } }),
    insert('Toggle', ['toggle', 'klapp'], <span>▶️</span>, { type: 'toggle' }),
    insert('Trennlinie', ['divider', 'linie'], <span>➖</span>, { type: 'divider' }),
    insert('Bild', ['image', 'bild', 'foto'], <span>🖼️</span>, { type: 'lifehubImage' }),
    insert('Galerie', ['gallery', 'galerie'], <span>🞊</span>, { type: 'gallery' }),
    insert('Tabelle', ['table', 'tabelle'], <span>▦</span>, { type: 'lifehubTable' }),
    insert('Lesezeichen', ['bookmark', 'lesezeichen'], <span>🔖</span>, { type: 'bookmark' }),
    insert('Embed', ['embed', 'iframe'], <span>🧩</span>, { type: 'lifehubEmbed' }),
    insert('Video', ['video'], <span>🎬</span>, { type: 'lifehubVideo' }),
    insert('Datei', ['file', 'datei'], <span>📄</span>, { type: 'lifehubFile' }),
    insert('Karte', ['map', 'karte', 'ort'], <span>📍</span>, { type: 'map' }),
    insert('Seitenverweis', ['page reference', 'verweis', 'link'], <span>🔗</span>, { type: 'pageReference' }),
    insert('Suche', ['search', 'suche'], <span>🔎</span>, { type: 'search' }),
    insert('Timeline', ['timeline', 'verlauf'], <span>📅</span>, { type: 'timeline' }),
    insert('Research', ['research', 'recherche'], <span>🔬</span>, { type: 'researchWorkspace' }),
    insert('Browser', ['browser', 'web'], <span>🌐</span>, { type: 'browserEmbed' }),
  ];
}

export function LifehubSlashMenu({ editor }: { editor: BlockNoteEditor<any, any> }) {
  // Custom-Items fehlt der i18n-'key' von DefaultReactSuggestionItem — der
  // Cast hält den getItems-Rückgabetyp auf dem Default-Typ, damit der
  // SuggestionMenuController die eingebaute Menü-Komponente nutzen kann.
  const items: DefaultReactSuggestionItem[] = [
    ...getDefaultReactSlashMenuItems(editor),
    ...(createLifehubInsertItems(editor) as DefaultReactSuggestionItem[]),
  ];
  return (
    <SuggestionMenuController
      triggerCharacter="/"
      getItems={async (query) => filterSuggestionItems(items, query)}
    />
  );
}

