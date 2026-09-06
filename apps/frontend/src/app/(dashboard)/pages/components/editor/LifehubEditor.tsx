'use client';

/**
 * LifehubEditor: BlockNote-basierter Notion-Editor.
 *
 * - Schema = Standard-BlockNote-Blöcke + LifeHub-Custom-Blocks
 * - Slash-Menü (/) mit deutschen LifeHub-Einträgen
 * - Debounced Autosave über onDocChange (Backend PUT /pages/:id/doc)
 */

import { useEffect, useRef, useState } from 'react';
import { BlockNoteSchema, defaultBlockSpecs, type BlockNoteEditor } from '@blocknote/core';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import {
  Bookmark,
  BrowserEmbed,
  Callout,
  Divider,
  Gallery,
  LifehubEditorContext,
  LifehubEmbed,
  LifehubFile,
  LifehubImage,
  LifehubSlashMenu,
  LifehubTable,
  LifehubVideo,
  Map,
  PageReference,
  ResearchWorkspace,
  Search,
  Timeline,
  Toggle,
  type LifehubEditorContextValue,
} from './lifehubBlocks';

const SAVE_DEBOUNCE_MS = 800;

// BlockNote-Doc = Array von Block-Objekten (identisch zum Backend-Modell)
export type LifehubDoc = Array<Record<string, unknown>>;

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    divider: Divider,
    callout: Callout,
    toggle: Toggle,
    lifehubImage: LifehubImage,
    gallery: Gallery,
    lifehubTable: LifehubTable,
    bookmark: Bookmark,
    lifehubEmbed: LifehubEmbed,
    lifehubVideo: LifehubVideo,
    lifehubFile: LifehubFile,
    map: Map,
    pageReference: PageReference,
    search: Search,
    timeline: Timeline,
    researchWorkspace: ResearchWorkspace,
    browserEmbed: BrowserEmbed,
  },
});

/** Dark-Mode-Erkennung (LifeHub togglet .dark am <html>-Element). */
function useDarkMode(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const apply = () => setDark(el.classList.contains('dark'));
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

interface LifehubEditorProps {
  doc: LifehubDoc;
  onDocChange: (doc: LifehubDoc) => void;
  editorContext: LifehubEditorContextValue;
  readOnly?: boolean;
}

export function LifehubEditor({ doc, onDocChange, editorContext, readOnly = false }: LifehubEditorProps) {
  const dark = useDarkMode();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDocRef = useRef<LifehubDoc>(doc);

  const editor = useCreateBlockNote({
    schema,
    initialContent: doc.length > 0 ? (doc as never) : undefined,
  });

  // Bei Unmount ausstehenden Autosave sofort schreiben, damit bei schneller
  // Navigation keine letzten Tastenschläge verloren gehen.
  useEffect(() => () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      onDocChange(latestDocRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = () => {
    if (readOnly) return;
    latestDocRef.current = editor.document as unknown as LifehubDoc;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      onDocChange(latestDocRef.current);
    }, SAVE_DEBOUNCE_MS);
  };

  return (
    <LifehubEditorContext.Provider value={editorContext}>
      <BlockNoteView
        editor={editor}
        theme={dark ? 'dark' : 'light'}
        onChange={handleChange}
        editable={!readOnly}
        className="lifehub-editor"
      >
        <LifehubSlashMenu editor={editor as unknown as BlockNoteEditor<any, any>} />
      </BlockNoteView>
    </LifehubEditorContext.Provider>
  );
}
