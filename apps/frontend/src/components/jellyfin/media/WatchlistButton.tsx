'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/cn';
import { Check, Plus } from 'lucide-react';
import type { JellyfinMediaItem } from '@/lib/jellyfin-media-api';
import {
  fetchWatchlists,
  fetchWatchlistStatus,
  addToWatchlist,
  removeFromWatchlist,
} from '@/lib/jellyfin-media-api';
import { WatchlistPicker } from './WatchlistPicker';

/* ------------------------------------------------------------------ */
/*  WatchlistButton — click semantics:                                 */
/*   - 0 lists        → open picker (create first list)                */
/*   - 1 list         → toggle membership directly (no popover)        */
/*   - >1 lists       → open picker when not a member, otherwise       */
/*                      remove from every list the item is in          */
/*   - right-click    → always open the picker                         */
/* ------------------------------------------------------------------ */

interface WatchlistButtonProps {
  item: JellyfinMediaItem;
  serverId: string;
}

export function WatchlistButton({ item, serverId }: WatchlistButtonProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const { data: lists } = useQuery({
    queryKey: ['jellyfin-watchlists', serverId],
    queryFn: () => fetchWatchlists(serverId),
  });
  const { data: status } = useQuery({
    queryKey: ['jellyfin-watchlist-status', serverId, item.Id],
    queryFn: () => fetchWatchlistStatus(serverId, item.Id),
  });

  const isInAny = status?.inWatchlist ?? false;
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

  // Close popover on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-hide feedback label after 2s
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 2000);
    return () => clearTimeout(t);
  }, [feedback]);

  // Left-click semantics based on list count and membership
  function handleClick() {
    if (!lists || lists.length === 0) {
      // No lists yet — open the picker to create the first one.
      setOpen(true);
      return;
    }
    if (lists.length === 1) {
      // Single list — toggle membership directly, no popover.
      const onlyList = lists[0];
      if (onlyList) {
        if (isInList(onlyList.id)) {
          removeMut.mutate(onlyList.id);
        } else {
          addMut.mutate(onlyList.id);
        }
      }
      return;
    }
    // Multiple lists — open picker for non-members, bulk-remove for members.
    if (!status?.inWatchlist) {
      setOpen(true);
      return;
    }
    (status?.lists ?? []).forEach((l) => removeMut.mutate(l.id));
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
        aria-label={isInAny ? 'Aus Watchlist entfernen' : 'Zur Watchlist hinzufügen'}
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
          isInAny
            ? 'border-brand-500 bg-brand-500/25 text-brand-300'
            : 'border-white/45 bg-black/25 text-white/90 backdrop-blur-sm hover:border-white/70 hover:text-white',
        )}
      >
        {isInAny ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </button>

      {feedback && (
        <span className="absolute left-1/2 -translate-x-1/2 top-12 whitespace-nowrap rounded bg-black/70 px-2 py-1 text-[11px] text-white">
          {feedback}
        </span>
      )}

      {open && (
        <div className="absolute right-0 top-12 z-30 w-64">
          <WatchlistPicker serverId={serverId} item={item} />
        </div>
      )}
    </div>
  );
}
