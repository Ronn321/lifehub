'use client';

/**
 * Pages-Übersicht (Liste/Baum). Die Detail-Ansicht lebt in /pages/[slug]
 * (BlockNote-Editor). ?new=true öffnet den Anlegen-Dialog, ?manage-pins=true
 * die Pin-Verwaltung (beide von der Sidebar).
 */

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronDown, ChevronRight, FileText, Loader2, Plus, Search,
  Trash2, Pin, PinOff, X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface Page {
  id: string;
  title: string;
  icon: string | null;
  description: string | null;
  parentId: string | null;
  slug: string | null;
  status: string;
  sortOrder: number;
  children?: Page[];
}

interface PinnedPage {
  pageId: string;
  title: string;
  icon: string | null;
  slug: string | null;
}

function pageHref(page: { id?: string; pageId?: string; slug?: string | null }): string {
  return `/pages/${page.slug || page.id || page.pageId}`;
}

/** Baum flach legen (für Parent-Auswahl & Suchtreffer) */
function flattenPages(pages: Page[], depth = 0): Array<{ page: Page; depth: number }> {
  const out: Array<{ page: Page; depth: number }> = [];
  const walk = (nodes: Page[], level: number) => {
    for (const node of nodes ?? []) {
      out.push({ page: node, depth: level });
      walk(node.children ?? [], level + 1);
    }
  };
  walk(pages, depth);
  return out;
}

/* ─── Baum-Knoten ─── */

function TreeNode({
  node, depth, collapsedIds, onToggle, onSelect, onDelete,
}: {
  node: Page;
  depth: number;
  collapsedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (page: Page) => void;
  onDelete: (page: Page) => void;
}) {
  const hasChildren = (node.children?.length ?? 0) > 0;
  // Kollaps-Status pro Knoten aus der zentralen Menge lesen, sonst würden
  // aufgeklappte Eltern ihren Status an alle Kinder vererben.
  const collapsed = collapsedIds.has(node.id);
  return (
    <div>
      <div
        className="group flex items-center gap-1 rounded-lg px-2 py-1.5 transition-colors hover:bg-bg-surface focus-within:bg-bg-surface"
        style={{ paddingLeft: 8 + depth * 20 }}
      >
        {hasChildren ? (
          <button
            onClick={() => onToggle(node.id)}
            aria-label={collapsed ? 'Unterseiten ausklappen' : 'Unterseiten einklappen'}
            aria-expanded={!collapsed}
            className="shrink-0 rounded p-0.5 text-fg-muted hover:text-fg"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}
        <button
          onClick={() => onSelect(node)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded text-left text-sm"
        >
          <span className="shrink-0">{node.icon || <FileText className="h-4 w-4 text-fg-muted" />}</span>
          <span className="truncate">{node.title}</span>
          {hasChildren && <span className="shrink-0 text-xs text-fg-subtle">{node.children!.length}</span>}
        </button>
        <button
          onClick={() => onDelete(node)}
          aria-label={`Seite ${node.title} löschen`}
          className="shrink-0 rounded p-1 text-fg-muted opacity-0 transition-opacity hover:text-red-500 focus:opacity-100 group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {hasChildren && !collapsed && (
        <div>
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              collapsedIds={collapsedIds}
              onToggle={onToggle}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Anlegen-Dialog ─── */

function CreatePageDialog({
  open, onClose, onCreated, pages,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (page: Page) => void;
  pages: Page[];
}) {
  const [title, setTitle] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const flat = useMemo(() => flattenPages(pages), [pages]);

  const createMutation = useMutation({
    mutationFn: () => api.post<Page>('/pages', {
      title: title.trim() || 'Unbenannt',
      ...(parentId ? { parentId } : {}),
    }),
    onSuccess: (created) => {
      setTitle('');
      setParentId('');
      onCreated(created);
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-md rounded-xl bg-bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold">Neue Seite</h2>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !createMutation.isPending) createMutation.mutate(); }}
          placeholder="Titel der Seite…"
          aria-label="Seitentitel"
          className="input-field w-full"
          autoFocus
        />
        <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-fg-muted">Übergeordnete Seite</label>
        <select
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          aria-label="Übergeordnete Seite"
          className="input-field mt-1 w-full"
        >
          <option value="">— Keine (Hauptseite) —</option>
          {flat.map(({ page, depth }) => (
            <option key={page.id} value={page.id}>
              {'\u00A0'.repeat(depth * 2)}{page.icon ? `${page.icon} ` : ''}{page.title}
            </option>
          ))}
        </select>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-bg">
            Abbrechen
          </button>
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Anlegen
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Pin-Verwaltung ─── */

function PinnedManager({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: pinned, isLoading } = useQuery({
    queryKey: ['pinned-pages'],
    queryFn: () => api.get<PinnedPage[]>('/pages/pin/list'),
  });

  const unpinMutation = useMutation({
    mutationFn: (pageId: string) => api.delete(`/pages/pin/remove/${pageId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pinned-pages'] }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-md rounded-xl bg-bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Angeheftete Seiten</h2>
          <button onClick={onClose} aria-label="Schließen" className="rounded p-1 text-fg-muted hover:text-fg">
            <X className="h-4 w-4" />
          </button>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-fg-muted" /></div>
        ) : !pinned || pinned.length === 0 ? (
          <p className="py-6 text-center text-sm text-fg-muted">Keine Seiten angeheftet. Hefte Seiten über die Detail-Ansicht an.</p>
        ) : (
          <ul className="space-y-1">
            {pinned.map((entry) => (
              <li key={entry.pageId} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-bg">
                <Pin className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                <button
                  onClick={() => router.push(pageHref(entry))}
                  className="min-w-0 flex-1 truncate text-left text-sm"
                >
                  {entry.icon ? `${entry.icon} ` : ''}{entry.title}
                </button>
                <button
                  onClick={() => unpinMutation.mutate(entry.pageId)}
                  aria-label={`${entry.title} lösen`}
                  className="shrink-0 rounded p-1 text-fg-muted hover:text-red-500"
                >
                  <PinOff className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ─── Hauptseite ─── */

function PagesPageInner() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [showCreate, setShowCreate] = useState(false);
  const [showPins, setShowPins] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  // Auf persist-Hydration warten, BEVOR der Auth-Guard routet — sonst
  // bounced ein Reload auf /pages über /login nach /dashboard.
  const [authHydrated, setAuthHydrated] = useState(false);
  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) { setAuthHydrated(true); return; }
    const unsub = useAuthStore.persist.onFinishHydration(() => setAuthHydrated(true));
    return unsub;
  }, []);
  useEffect(() => {
    if (authHydrated && !accessToken) router.push('/login');
  }, [authHydrated, accessToken, router]);

  // Sidebar-Aktionen: ?new=true / ?manage-pins=true
  useEffect(() => {
    if (searchParams.get('new') === 'true') setShowCreate(true);
    if (searchParams.get('manage-pins') === 'true') setShowPins(true);
  }, [searchParams]);

  const { data: pages, isLoading } = useQuery<Page[]>({
    queryKey: ['pages'],
    queryFn: () => api.get<Page[]>('/pages'),
    enabled: !!accessToken,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/pages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      queryClient.invalidateQueries({ queryKey: ['pinned-pages'] });
    },
  });

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const searchMatches = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return null;
    return flattenPages(pages ?? []).filter(({ page }) =>
      page.title.toLowerCase().includes(query)
      || (page.description ?? '').toLowerCase().includes(query),
    );
  }, [pages, searchQuery]);

  if (!accessToken) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-fg-muted" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Seiten</h1>
          <p className="mt-1 text-sm text-fg-muted">{pages?.length ?? 0} Hauptseiten</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Seiten durchsuchen…"
              aria-label="Seiten durchsuchen"
              className="input-field w-56 pl-8"
            />
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" /> Neue Seite
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-border bg-bg-surface p-5">
              <div className="mb-3 h-4 w-24 rounded bg-bg" />
              <div className="mb-2 h-6 w-32 rounded bg-bg" />
              <div className="h-3 w-20 rounded bg-bg" />
            </div>
          ))}
        </div>
      ) : searchMatches ? (
        searchMatches.length === 0 ? (
          <p className="py-12 text-center text-sm text-fg-muted">Keine Seiten für „{searchQuery}“ gefunden.</p>
        ) : (
          <div className="rounded-xl border border-border bg-bg-surface p-2">
            {searchMatches.map(({ page, depth }) => (
              <div
                key={page.id}
                className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-bg"
                style={{ paddingLeft: 8 + depth * 20 }}
              >
                <button onClick={() => router.push(pageHref(page))} className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm">
                  <span className="shrink-0">{page.icon || <FileText className="h-4 w-4 text-fg-muted" />}</span>
                  <span className="truncate">{page.title}</span>
                </button>
                <button
                  onClick={() => deleteMutation.mutate(page.id)}
                  aria-label={`Seite ${page.title} löschen`}
                  className="shrink-0 rounded p-1 text-fg-muted opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )
      ) : (pages?.length ?? 0) === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <FileText className="h-10 w-10 text-fg-subtle" />
          <p className="text-sm text-fg-muted">Noch keine Seiten. Lege die erste Seite an.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" /> Neue Seite
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-bg-surface p-2">
          {pages!.map((page) => (
            <TreeNode
              key={page.id}
              node={page}
              depth={0}
              collapsedIds={collapsedIds}
              onToggle={toggleCollapse}
              onSelect={(selected) => router.push(pageHref(selected))}
              onDelete={(selected) => {
                if (window.confirm(`Seite „${selected.title}“ löschen?`)) deleteMutation.mutate(selected.id);
              }}
            />
          ))}
        </div>
      )}

      <CreatePageDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(created) => {
          queryClient.invalidateQueries({ queryKey: ['pages'] });
          setShowCreate(false);
          router.push(pageHref(created));
        }}
        pages={pages ?? []}
      />

      {showPins && <PinnedManager onClose={() => setShowPins(false)} />}
    </div>
  );
}

export default function PagesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-fg-muted" />
        </div>
      }
    >
      <PagesPageInner />
    </Suspense>
  );
}
