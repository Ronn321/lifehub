'use client';

/**
 * Page-Detail (Notion-Stil): editierbarer Titel, Cover, BlockNote-Editor,
 * Unterseiten, Versionen, Export, Pin. Der Pfad-Parameter ist UUID oder Slug —
 * das Backend (GET /pages/:id) löst beide auf.
 */

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Loader2, FileX2, History, Pin, PinOff, Plus, FileJson, FileText } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { PageVersionHistory } from '../components/PageVersionHistory';
import { LifehubEditor, type LifehubDoc } from '../components/editor/LifehubEditor';
import type { EditorPageRef } from '../components/editor/lifehubBlocks';

interface PageDetail {
  id: string;
  title: string;
  ownerId: string;
  icon: string | null;
  coverMediaId: string | null;
  description: string | null;
  parentId: string | null;
  status: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  doc?: LifehubDoc;
  children?: PageDetail[];
}

interface TreePage {
  id: string;
  title: string;
  icon: string | null;
  description: string | null;
  children?: TreePage[];
}

/** Tree (aus GET /pages) zu flacher Liste abflachen (für Seitenverweise/Breadcrumbs). */
function flattenPages(pages: TreePage[] | undefined): EditorPageRef[] {
  const out: EditorPageRef[] = [];
  const walk = (nodes: TreePage[] | undefined) => {
    for (const node of nodes ?? []) {
      out.push({ id: node.id, title: node.title, icon: node.icon, description: node.description });
      walk(node.children);
    }
  };
  walk(pages);
  return out;
}

export default function PageDetailRoute({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pageRef = decodeURIComponent(params.slug);
  const [wide, setWide] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  // Browser-Block meldet Layout-Modus (medium/fullscreen) → Seite verbreitern
  useEffect(() => {
    const handler = (event: Event) => {
      const mode = (event as CustomEvent<{ mode: string }>).detail?.mode;
      setWide(mode === 'medium' || mode === 'fullscreen');
    };
    window.addEventListener('lifehub:browser-layout', handler);
    return () => window.removeEventListener('lifehub:browser-layout', handler);
  }, []);

  const { data: page, isLoading, error } = useQuery({
    queryKey: ['page', pageRef],
    queryFn: () => api.get<PageDetail>(`/pages/${encodeURIComponent(pageRef)}`),
  });

  const { data: allPages } = useQuery({
    queryKey: ['pages'],
    queryFn: () => api.get<TreePage[]>('/pages'),
  });

  const { data: children } = useQuery({
    queryKey: ['page-children', pageRef],
    queryFn: () => api.get<TreePage[]>(`/pages/${encodeURIComponent(pageRef)}/children`),
    enabled: !!page,
  });

  const { data: isPinned } = useQuery({
    queryKey: ['page-pinned', pageRef],
    queryFn: () => api.get<boolean>(`/pages/pin/check/${page!.id}`),
    enabled: !!page,
  });

  const docSaveMutation = useMutation({
    mutationFn: (doc: LifehubDoc) => api.put(`/pages/${page!.id}/doc`, { doc }),
  });

  const pinMutation = useMutation({
    mutationFn: () => (isPinned ? api.delete(`/pages/pin/remove/${page!.id}`) : api.post(`/pages/pin/add/${page!.id}`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['page-pinned', pageRef] }),
  });

  const createSubpageMutation = useMutation({
    mutationFn: () => api.post<PageDetail>('/pages', { title: 'Unterseite', parentId: page!.id }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      queryClient.invalidateQueries({ queryKey: ['page-children', pageRef] });
      router.push(`/pages/${created.id}`);
    },
  });

  const flatPages = useMemo(() => flattenPages(allPages), [allPages]);

  const exportPage = async (format: 'json' | 'markdown') => {
    if (!page) return;
    if (format === 'markdown') {
      const result = await api.get<{ format: string; content: string }>(`/pages/${page.id}/export?format=markdown`);
      const blob = new Blob([result.content], { type: 'text/markdown;charset=utf-8' });
      triggerDownload(blob, `${page.title || 'seite'}.md`);
    } else {
      const data = await api.get<Record<string, unknown>>(`/pages/${page.id}/export?format=json`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      triggerDownload(blob, `${page.title || 'seite'}.json`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-fg-muted">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">Seite wird geladen…</span>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <FileX2 className="h-14 w-14 text-fg-subtle" />
        <h2 className="text-lg font-semibold">Seite nicht gefunden</h2>
        <button
          onClick={() => router.push('/pages')}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          Zurück zu den Seiten
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        page={page}
        allPages={flatPages as never}
        wide={wide}
        onNavigate={(id) => (id ? router.push(`/pages/${id}`) : router.push('/pages'))}
      />

      {/* Toolbar: Unterseite, Versionen, Export, Pin */}
      <div className="mb-3 flex flex-wrap items-center gap-1 border-b border-border pb-2 text-xs text-fg-muted">
        <button
          onClick={() => createSubpageMutation.mutate()}
          disabled={createSubpageMutation.isPending}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors hover:bg-bg-surface hover:text-fg"
        >
          <Plus className="h-3.5 w-3.5" /> Unterseite
        </button>
        <button
          onClick={() => setShowVersions(true)}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors hover:bg-bg-surface hover:text-fg"
        >
          <History className="h-3.5 w-3.5" /> Versionen
        </button>
        <button
          onClick={() => void exportPage('markdown')}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors hover:bg-bg-surface hover:text-fg"
        >
          <FileText className="h-3.5 w-3.5" /> Markdown
        </button>
        <button
          onClick={() => void exportPage('json')}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors hover:bg-bg-surface hover:text-fg"
        >
          <FileJson className="h-3.5 w-3.5" /> JSON
        </button>
        <button
          onClick={() => pinMutation.mutate()}
          disabled={isPinned === undefined}
          className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors hover:bg-bg-surface hover:text-fg disabled:opacity-40"
          title={isPinned ? 'Von Startseite lösen' : 'An Startseite anheften'}
        >
          {isPinned ? <PinOff className="h-3.5 w-3.5 text-brand-500" /> : <Pin className="h-3.5 w-3.5" />}
          {isPinned ? 'Angeheftet' : 'Anheften'}
        </button>
      </div>

      {/* BlockNote-Editor (key = id + updatedAt: Remount nach Version-
          Restore, damit das frische doc übernommen wird. Trade-off: Remount
          verwirft auch die Undo-Historie bei Titel-/Icon-Saves — akzeptiert,
          der Inhalt bleibt intakt.) */}
      <LifehubEditor
        key={`${page.id}:${page.updatedAt ?? ''}`}
        doc={page.doc ?? []}
        onDocChange={(doc) => docSaveMutation.mutate(doc)}
        readOnly={false}
        editorContext={{
          pageId: page.id,
          pages: flatPages,
          onNavigate: (id) => router.push(`/pages/${id}`),
        }}
      />

      {/* Unterseiten */}
      {(children?.length ?? 0) > 0 && (
        <div className="mt-8">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">Unterseiten</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {children!.map((child) => (
              <button
                key={child.id}
                onClick={() => router.push(`/pages/${child.id}`)}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-left text-sm transition-colors hover:bg-bg-surface"
              >
                <span>{child.icon || '📄'}</span>
                <span className="truncate">{child.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {showVersions && (
        <PageVersionHistory pageId={page.id} onClose={() => setShowVersions(false)} />
      )}
    </div>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
