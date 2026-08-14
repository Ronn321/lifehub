'use client';

import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import {
  ArrowLeft,
  Bookmark,
  Loader2,
  Pencil,
  Plus,
  Trash,
  X,
} from 'lucide-react';
import { JellyfinPageWrapper } from '@/components/jellyfin/media/JellyfinPageWrapper';
import {
  createWatchlist,
  deleteWatchlist,
  fetchWatchlistItems,
  fetchWatchlists,
  getImageUrl,
  removeFromWatchlist,
  renameWatchlist,
} from '@/lib/jellyfin-media-api';
import { cn } from '@/lib/cn';

const SERVER_ID = 'default';

/* Type badge mapping — Film for Movie, Serie for Series. */
function typeBadge(itemType: string): { label: string; className: string } | null {
  if (itemType === 'Movie') {
    return { label: 'Film', className: 'bg-blue-500/10 text-blue-400' };
  }
  if (itemType === 'Series') {
    return { label: 'Serie', className: 'bg-purple-500/10 text-purple-400' };
  }
  if (itemType === 'Episode') {
    return { label: 'Folge', className: 'bg-brand-500/10 text-brand-400' };
  }
  return null;
}

export default function WatchlistPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [hydrated, setHydrated] = useState(false);

  // Inline create form state.
  const [showCreate, setShowCreate] = useState(false);
  const [nameInput, setNameInput] = useState('');

  // Active watchlist selection state.
  const [activeListId, setActiveListId] = useState<string | null>(null);

  // Inline rename state.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (hydrated && !accessToken) router.push('/login');
  }, [hydrated, accessToken, router]);

  const listsQuery = useQuery({
    queryKey: ['jellyfin-watchlists', SERVER_ID],
    queryFn: () => fetchWatchlists(SERVER_ID),
    enabled: hydrated && !!accessToken,
  });

  const itemsQuery = useQuery({
    queryKey: ['jellyfin-watchlist-items', SERVER_ID, activeListId],
    queryFn: () => (activeListId ? fetchWatchlistItems(SERVER_ID, activeListId) : Promise.resolve([])),
    enabled: !!activeListId,
  });

  // Auto-select first list; fall back to first when the active list is gone.
  useEffect(() => {
    const lists = listsQuery.data ?? [];
    if (lists.length === 0) {
      setActiveListId(null);
      return;
    }
    const stillPresent = activeListId && lists.some((l) => l.id === activeListId);
    const first = lists[0];
    if (!stillPresent && first) setActiveListId(first.id);
  }, [listsQuery.data, activeListId]);

  const createMut = useMutation({
    mutationFn: (name: string) => createWatchlist(SERVER_ID, name),
    onSuccess: (data) => {
      setActiveListId(data.id);
      setNameInput('');
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['jellyfin-watchlists', SERVER_ID] });
      queryClient.invalidateQueries({ queryKey: ['jellyfin-watchlist-items'] });
    },
  });

  const renameMut = useMutation({
    mutationFn: ({ listId, name }: { listId: string; name: string }) =>
      renameWatchlist(SERVER_ID, listId, name),
    onSuccess: () => {
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['jellyfin-watchlists', SERVER_ID] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (listId: string) => deleteWatchlist(SERVER_ID, listId),
    onSuccess: (_, listId) => {
      if (activeListId === listId) setActiveListId(null);
      queryClient.invalidateQueries({ queryKey: ['jellyfin-watchlists', SERVER_ID] });
      queryClient.invalidateQueries({ queryKey: ['jellyfin-watchlist-items'] });
    },
  });

  const removeItemMut = useMutation({
    mutationFn: (externalItemId: string) =>
      removeFromWatchlist(SERVER_ID, activeListId!, externalItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jellyfin-watchlist-items', SERVER_ID, activeListId] });
      queryClient.invalidateQueries({ queryKey: ['jellyfin-watchlists', SERVER_ID] });
    },
  });

  // Hydration guard — must come after all hooks (Rules of Hooks).
  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-20 text-fg-muted">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />Authentifizierung läuft …
      </div>
    );
  }

  const lists = listsQuery.data ?? [];

  return (
    <JellyfinPageWrapper>
      <div className="space-y-6 py-4">
        {/* Header row */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-fg-muted hover:text-fg transition-colors"
            aria-label="Zurück"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-brand-400" />
            <h1 className="text-xl font-bold tracking-tight">Watchlists</h1>
            <span className="text-sm text-fg-muted">({lists.length})</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => { setShowCreate((v) => !v); setNameInput(''); }}
              className="flex h-9 items-center gap-2 rounded-lg bg-brand-500 px-3 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Neue Watchlist
            </button>
          </div>
        </div>

        {/* Inline create input */}
        {showCreate && (
          <input
            autoFocus
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const name = nameInput.trim();
                if (name) createMut.mutate(name);
              }
              if (e.key === 'Escape') { setShowCreate(false); setNameInput(''); }
            }}
            placeholder="Name der neuen Watchlist …"
            className="w-full max-w-sm rounded-lg border border-brand-500/40 bg-bg-surface px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        )}

        {/* Watchlist tabs */}
        {lists.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {lists.map((list) => {
              const isActive = list.id === activeListId;
              const isEditing = editingId === list.id;
              return (
                <div
                  key={list.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveListId(list.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setActiveListId(list.id);
                  }}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors',
                    isActive
                      ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                      : 'border-border text-fg-muted hover:text-fg',
                  )}
                >
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editName}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') {
                          const name = editName.trim();
                          if (name) renameMut.mutate({ listId: list.id, name });
                          else setEditingId(null);
                        }
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="w-28 bg-transparent text-sm outline-none placeholder:text-fg-muted"
                      placeholder={list.name}
                    />
                  ) : (
                    <span className="font-medium">
                      {list.name} <span className="text-fg-muted">({list.itemCount})</span>
                    </span>
                  )}

                  {isActive && !isEditing && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(list.id);
                        setEditName(list.name);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-fg-muted hover:text-brand-400 transition-colors"
                      aria-label="Watchlist umbenennen"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {isActive && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Watchlist „${list.name}“ löschen?`)) {
                          deleteMut.mutate(list.id);
                        }
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-fg-muted hover:text-red-400 transition-colors"
                      aria-label="Watchlist löschen"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state: no lists at all */}
        {listsQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-fg-muted" />
          </div>
        ) : lists.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border p-16 text-center">
            <Bookmark className="h-12 w-12 mx-auto mb-3 text-fg-muted opacity-30" />
            <p className="text-lg font-medium">Noch keine Watchlists</p>
            <p className="text-sm text-fg-muted mt-1">
              Lege deine erste Watchlist an und füge Filme &amp; Serien über die Detailseite hinzu.
            </p>
          </div>
        ) : null}

        {/* Items of the active list */}
        {activeListId && (
          <div className="space-y-3">
            {itemsQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-fg-muted" />
              </div>
            ) : (itemsQuery.data ?? []).length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-border p-12 text-center text-fg-muted">
                Diese Watchlist ist leer.
              </div>
            ) : (
              (itemsQuery.data ?? []).map((item) => {
                const badge = typeBadge(item.itemType);
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-bg-surface p-3"
                  >
                    <img
                      src={getImageUrl(SERVER_ID, item.externalItemId, 240, 135)}
                      alt=""
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                      className="w-[120px] aspect-video rounded-lg object-cover bg-bg"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      {badge && (
                        <span className={cn('mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium', badge.className)}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeItemMut.mutate(item.externalItemId)}
                      disabled={removeItemMut.isPending}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-muted hover:text-red-400 disabled:opacity-50 transition-colors"
                      aria-label="Aus Watchlist entfernen"
                    >
                      {removeItemMut.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </JellyfinPageWrapper>
  );
}
