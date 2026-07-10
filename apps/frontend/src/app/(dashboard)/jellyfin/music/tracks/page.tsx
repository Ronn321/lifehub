'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Clock,
  Play,
  ListMusic,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import {
  useJellyfinServer,
  useAllSongs,
  usePlayTracks,
  jellyfinItemToTrack,
} from '@/lib/music-api';
import { useMusicPlayerStore } from '@/lib/music-player-store';
import type { MusicTrack } from '@/lib/music-player-store';
import type { JellyfinApiItem } from '@/lib/music-api';
import { MusicPageShell } from '@/components/music/layout/MusicPageShell';
import { SongRow, MusicEmptyState } from '@/components/music/shared/SongRow';
import { MusicLoader } from '@/components/music/shared/MusicCard';
import { MusicPlayerWrapper } from '@/components/music/player/MusicPlayerWrapper';
import { useSelection } from '@/components/music/shared/useSelection';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type SortField = 'Name' | 'Album' | 'DateCreated' | 'RunTimeTicks';

interface SortColDef {
  key: SortField;
  label: string;
  className: string;
  icon?: React.ReactNode;
}

const SORT_COLUMNS: SortColDef[] = [
  {
    key: 'Name',
    label: 'Titel',
    className: 'flex-1 text-left',
  },
  {
    key: 'Album',
    label: 'Album',
    className: 'hidden min-w-0 flex-1 text-left md:block',
  },
  {
    key: 'DateCreated',
    label: 'Hinzugefügt',
    className: 'hidden w-24 shrink-0 text-left sm:block',
  },
  {
    key: 'RunTimeTicks',
    label: '',
    className: 'flex w-12 shrink-0 items-center justify-end',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
];

/* ------------------------------------------------------------------ */
/*  Sort Header                                                       */
/* ------------------------------------------------------------------ */

function SortHeader({
  sortBy,
  sortOrder,
  onSort,
}: {
  sortBy: SortField;
  sortOrder: 'Ascending' | 'Descending';
  onSort: (field: SortField) => void;
}) {
  const renderIcon = (field: SortField) => {
    if (sortBy !== field) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    return sortOrder === 'Ascending' ? (
      <ArrowUp className="h-3 w-3 text-[var(--music-accent)]" />
    ) : (
      <ArrowDown className="h-3 w-3 text-[var(--music-accent)]" />
    );
  };

  return (
    <div
      className="flex items-center gap-3 border-b border-[rgba(255,255,255,0.1)] px-4 pb-2 text-xs uppercase tracking-wide text-[var(--music-text-secondary)]"
      style={{ height: '40px' }}
    >
      <div className="flex w-8 shrink-0 items-center justify-center">
        <span>#</span>
      </div>
      <div className="w-10 shrink-0" />

      {SORT_COLUMNS.map((col) => (
        <button
          key={col.key}
          onClick={() => onSort(col.key)}
          className={`flex items-center gap-1.5 hover:text-[var(--music-text-primary)] transition-colors ${col.className}`}
        >
          {col.icon ?? col.label}
          {renderIcon(col.key)}
        </button>
      ))}

      <div className="w-8 shrink-0" />
      <div className="w-12 shrink-0" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tracks Page                                                       */
/* ------------------------------------------------------------------ */

export default function MusicTracksPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const server = useJellyfinServer();

  // Sort
  const [sortBy, setSortBy] = useState<SortField>('Name');
  const [sortOrder, setSortOrder] = useState<'Ascending' | 'Descending'>('Ascending');

  // Pagination
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 100;

  // Player
  const currentTrack = useMusicPlayerStore((s) => s.currentTrack);
  const playTracks = usePlayTracks();

  // ── Query ──

  const songsQuery = useAllSongs(server?.id, {
    sortBy,
    sortOrder,
    limit: PAGE_SIZE,
    startIndex: page * PAGE_SIZE,
  });

  // Convert songs to tracks
  const tracks = useMemo((): MusicTrack[] => {
    if (!songsQuery.data?.items || !accessToken || !server?.id) return [];
    return songsQuery.data.items.map((item) =>
      jellyfinItemToTrack(item, accessToken, server.id),
    );
  }, [songsQuery.data, accessToken, server?.id]);

  const totalSongs = songsQuery.data?.totalRecordCount ?? 0;
  const totalPages = totalSongs > 0 ? Math.ceil(totalSongs / PAGE_SIZE) : 1;

  // ── Handlers ──

  const handleSort = useCallback((field: SortField) => {
    setSortBy((prev) => {
      if (prev === field) {
        setSortOrder((o) => (o === 'Ascending' ? 'Descending' : 'Ascending'));
        return prev;
      }
      setSortOrder('Ascending');
      return field;
    });
    setPage(0);
  }, []);

  const handlePlaySong = useCallback(
    (index: number) => {
      if (!songsQuery.data?.items || !server?.id) return;
      playTracks(songsQuery.data.items, index, server.id);
    },
    [songsQuery.data, server?.id, playTracks],
  );

  // ── Selection ──

  const selection = useSelection();
  const allTrackIds = useMemo(() => tracks.map((t) => t.id), [tracks]);
  const addToQueue = useMusicPlayerStore((s) => s.addToQueue);

  const handleRowClick = useCallback(
    (e: React.MouseEvent, trackId: string) => {
      e.stopPropagation();
      if (e.shiftKey) {
        selection.selectRange(trackId, allTrackIds);
      } else if (e.ctrlKey || e.metaKey) {
        selection.toggleOne(trackId);
      } else {
        selection.selectOne(trackId);
      }
    },
    [selection, allTrackIds],
  );

  // Ctrl+A to select all visible tracks
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        const active = document.activeElement;
        if (active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) return;
        e.preventDefault();
        selection.selectAll(allTrackIds);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selection, allTrackIds]);

  // Bulk actions
  const handlePlaySelected = useCallback(() => {
    if (!songsQuery.data?.items || !server?.id) return;
    const selectedItems = songsQuery.data.items.filter((item) =>
      selection.selectedIds.has(item.Id),
    );
    if (selectedItems.length > 0) {
      playTracks(selectedItems, 0, server.id);
    }
  }, [songsQuery.data, server?.id, playTracks, selection.selectedIds]);

  const handleQueueSelected = useCallback(() => {
    const selectedTracks = tracks.filter((t) => selection.selectedIds.has(t.id));
    selectedTracks.forEach((t) => addToQueue(t));
    selection.clear();
  }, [tracks, selection, addToQueue]);

  // ── Virtualizer ──

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 5,
  });

  const songsLoading =
    songsQuery.isLoading || (songsQuery.isFetching && tracks.length === 0);

  // ── Render ──

  return (
    <div className="flex flex-col -m-6 lg:-m-8" style={{ height: 'calc(100% + 48px)' }}>
      <div className="flex-1 overflow-y-auto music-scroll">
        <MusicPageShell sidebarProps={{}}>
          <div className="flex h-full flex-col gap-4 pt-4">
            {/* ── Page Title ── */}
            <div className="flex items-center gap-6 border-b border-[rgba(255,255,255,0.1)] px-1 pb-3">
              <span className="text-sm font-medium text-[var(--music-text-primary)]">
                Lieder
              </span>
            </div>

            <SortHeader
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />

            {songsLoading ? (
              <MusicLoader />
            ) : tracks.length === 0 ? (
              <MusicEmptyState
                title="Keine Lieder gefunden"
                description="Füge Musik zu deiner Jellyfin-Bibliothek hinzu."
              />
            ) : (
              <>
                {selection.selectedCount > 0 && (
                  <div
                    className="sticky top-0 z-10 flex items-center gap-3 rounded-md px-4 py-2"
                    style={{
                      background: 'var(--music-bg-elevated)',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <span className="text-sm font-medium text-[var(--music-text-primary)]">
                      {selection.selectedCount} ausgewählt
                    </span>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={handlePlaySelected}
                        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--music-bg-hover)] text-[var(--music-text-primary)]"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Ausgewählte abspielen
                      </button>
                      <button
                        onClick={handleQueueSelected}
                        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--music-bg-hover)] text-[var(--music-text-primary)]"
                      >
                        <ListMusic className="h-3.5 w-3.5" />
                        Zur Queue hinzufügen
                      </button>
                      <button
                        onClick={selection.clear}
                        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--music-bg-hover)] text-[var(--music-text-secondary)] ml-auto"
                      >
                        <X className="h-3.5 w-3.5" />
                        Auswahl aufheben
                      </button>
                    </div>
                  </div>
                )}
                <div
                  ref={parentRef}
                  className="flex-1 overflow-auto music-scroll rounded-md"
                  style={{ background: 'var(--music-bg-elevated)' }}
                  onClick={selection.clear}
                >
                <div
                  style={{
                    height: virtualizer.getTotalSize(),
                    position: 'relative',
                  }}
                >
                  {virtualizer.getVirtualItems().map((vItem) => (
                    <div
                      key={vItem.key}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${vItem.start}px)`,
                      }}
                    >
                      <SongRow
                        index={vItem.index}
                        track={tracks[vItem.index]!}
                        isPlaying={
                          currentTrack?.id === tracks[vItem.index]!.id
                        }
                        isSelected={selection.isSelected(tracks[vItem.index]!.id)}
                        onClick={(e) => handleRowClick(e, tracks[vItem.index]!.id)}
                        onPlay={() => handlePlaySong(vItem.index)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2 text-xs text-[var(--music-text-secondary)]">
                <span>
                  Seite {page + 1} von {totalPages} ({totalSongs} Lieder)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page <= 0}
                    className="rounded-md px-3 py-1.5 transition-colors disabled:opacity-30 hover:bg-[var(--music-bg-hover)]"
                  >
                    Vorherige
                  </button>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={page >= totalPages - 1}
                    className="rounded-md px-3 py-1.5 transition-colors disabled:opacity-30 hover:bg-[var(--music-bg-hover)]"
                  >
                    Nächste
                  </button>
                </div>
              </div>
            )}
          </div>
        </MusicPageShell>
      </div>
      <div className="flex-shrink-0" style={{ height: 'var(--music-player-bar-height)' }}>
        <MusicPlayerWrapper />
      </div>
    </div>
  );
}
