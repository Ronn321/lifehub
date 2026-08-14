'use client';

import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Plus } from 'lucide-react';
import type { JellyfinMediaItem } from '@/lib/jellyfin-media-api';
import {
  fetchWatchlists,
  fetchWatchlistStatus,
  createWatchlist,
  addToWatchlist,
  removeFromWatchlist,
} from '@/lib/jellyfin-media-api';

/* ------------------------------------------------------------------ */
/*  WatchlistPicker — panel to manage watchlist membership for an item */
/*  Note: this is only the panel; click-outside handling stays in the  */
/*  caller (button / context menu).                                    */
/* ------------------------------------------------------------------ */

interface WatchlistPickerProps {
  serverId: string;
  item: JellyfinMediaItem;
}

export function WatchlistPicker({ serverId, item }: WatchlistPickerProps) {
  const qc = useQueryClient();
  const [newName, setNewName] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data: lists } = useQuery({
    queryKey: ['jellyfin-watchlists', serverId],
    queryFn: () => fetchWatchlists(serverId),
  });
  const { data: status } = useQuery({
    queryKey: ['jellyfin-watchlist-status', serverId, item.Id],
    queryFn: () => fetchWatchlistStatus(serverId, item.Id),
  });

  const isInList = (listId: string) => status?.lists.some((l) => l.id === listId) ?? false;

  const invalidateWatchlist = () => {
    qc.invalidateQueries({ queryKey: ['jellyfin-watchlist-status', serverId, item.Id] });
    qc.invalidateQueries({ queryKey: ['jellyfin-watchlists', serverId] });
  };

  const addMut = useMutation({
    mutationFn: (listId: string) => addToWatchlist(serverId, listId, item.Id, item.Type, item.Name),
    onSuccess: () => {
      invalidateWatchlist();
      setFeedback('Zur Watchlist hinzugefügt');
    },
  });

  const removeMut = useMutation({
    mutationFn: (listId: string) => removeFromWatchlist(serverId, listId, item.Id),
    onSuccess: () => {
      invalidateWatchlist();
      setFeedback('Aus Watchlist entfernt');
    },
  });

  const createMut = useMutation({
    mutationFn: (name: string) => createWatchlist(serverId, name),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['jellyfin-watchlists', serverId] });
      addMut.mutate(data.id);
    },
  });

  // Auto-hide feedback label after 2s
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 2000);
    return () => clearTimeout(t);
  }, [feedback]);

  return (
    <div className="rounded-xl border border-border bg-bg-surface p-2 shadow-xl">
      <p className="px-2 py-1 text-xs font-semibold text-fg-muted">Zu Watchlist hinzufügen</p>
      {lists && lists.length > 0 ? (
        <div className="max-h-48 overflow-y-auto overscroll-contain">
          {lists.map((list) => (
            <button
              key={list.id}
              type="button"
              disabled={addMut.isPending || removeMut.isPending}
              onClick={() => (isInList(list.id) ? removeMut.mutate(list.id) : addMut.mutate(list.id))}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-bg-muted/60 transition-colors"
            >
              {isInList(list.id) ? <Check className="h-4 w-4 text-brand-400" /> : <Plus className="h-4 w-4 text-fg-muted" />}
              <span className="flex-1 truncate text-left">{list.name}</span>
              <span className="text-xs text-fg-muted">{list.itemCount ?? 0}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="px-2 py-2 text-xs text-fg-muted">Noch keine Watchlists vorhanden.</p>
      )}
      <div className="mt-1 border-t border-border pt-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newName.trim()) {
              createMut.mutate(newName.trim());
              setNewName('');
            }
          }}
          placeholder="Neue Watchlist…"
          className="w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-sm outline-none focus:border-brand-500/50"
        />
      </div>
      {feedback && (
        <p className="px-2 pt-2 text-xs font-medium text-brand-400">{feedback}</p>
      )}
    </div>
  );
}
