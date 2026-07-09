'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Play,
  Pause,
  Heart,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Music,
  Star,
  Plus,
  ListMusic,
  Info,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { MusicImage } from '@/components/music/shared/MusicCard';
import type { JellyfinApiItem } from '@/lib/music-api';
import {
  ticksToSeconds,
  formatTime,
  getCoverUrl,
  jellyfinItemToTrack,
} from '@/lib/music-api';
import { useMusicPlayerStore } from '@/lib/music-player-store';
import type { MusicTrack } from '@/lib/music-player-store';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type SortField = 'index' | 'title' | 'artist' | 'album' | 'genre' | 'duration' | 'added';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

interface PlaylistSongTableProps {
  items: JellyfinApiItem[];
  accessToken: string;
  serverId: string;
  playlistId: string;
  isLoading: boolean;
  onPlayTrack: (index: number) => void;
  onPlayAll: () => void;
}

/* ------------------------------------------------------------------ */
/*  Context Menu Types                                                 */
/* ------------------------------------------------------------------ */

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  track: MusicTrack | null;
  apiItem: JellyfinApiItem | null;
  index: number;
}

/* ------------------------------------------------------------------ */
/*  PlaylistSongTable Component                                        */
/* ------------------------------------------------------------------ */

export function PlaylistSongTable({
  items,
  accessToken,
  serverId,
  playlistId,
  isLoading,
  onPlayTrack,
  onPlayAll,
}: PlaylistSongTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [sort, setSort] = useState<SortConfig>({ field: 'index', direction: 'asc' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    track: null,
    apiItem: null,
    index: -1,
  });

  const currentTrack = useMusicPlayerStore((s) => s.currentTrack);
  const playTrack = useMusicPlayerStore((s) => s.playTrack);
  const addToQueue = useMusicPlayerStore((s) => s.addToQueue);
  const addToQueueNext = useMusicPlayerStore((s) => s.addToQueueNext);

  // Convert items to tracks once
  const tracks = useMemo(
    () => items.map((item) => jellyfinItemToTrack(item, accessToken, serverId)),
    [items, accessToken, serverId],
  );

  // Sort items
  const sortedItems = useMemo(() => {
    const indexed = items.map((item, i) => ({ item, originalIndex: i }));
    const sorted = [...indexed].sort((a, b) => {
      const dir = sort.direction === 'asc' ? 1 : -1;
      switch (sort.field) {
        case 'index':
          return (a.originalIndex - b.originalIndex) * dir;
        case 'title':
          return (a.item.Name ?? '').localeCompare(b.item.Name ?? '') * dir;
        case 'artist':
          return ((a.item.Artist ?? a.item.AlbumArtist ?? '') as string).localeCompare(
            (b.item.Artist ?? b.item.AlbumArtist ?? '') as string,
          ) * dir;
        case 'album':
          return ((a.item.Album ?? '') as string).localeCompare((b.item.Album ?? '') as string) * dir;
        case 'genre':
          return 0; // Genres not in basic items
        case 'duration':
          return ((a.item.RunTimeTicks ?? 0) - (b.item.RunTimeTicks ?? 0)) * dir;
        case 'added':
          return 0; // DateAdded not available in basic items
        default:
          return 0;
      }
    });
    return sorted;
  }, [items, sort]);

  // Map sorted indices back to track references
  const displayedTracks = useMemo(
    () => sortedItems.map((si) => tracks[si.originalIndex]!),
    [sortedItems, tracks],
  );

  // Virtualizer
  const virtualizer = useVirtualizer({
    count: displayedTracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 15,
  });

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu.visible) return;
    const handler = () => setContextMenu((prev) => ({ ...prev, visible: false }));
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenu.visible]);

  // Handle sort toggle
  const handleSort = useCallback(
    (field: SortField) => {
      setSort((prev) => ({
        field,
        direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
      }));
    },
    [],
  );

  // Handle row click for selection
  const handleRowClick = useCallback(
    (index: number, e: React.MouseEvent) => {
      const itemId = sortedItems[index]?.item.Id;
      if (!itemId) return;

      if (e.ctrlKey || e.metaKey) {
        // Toggle single item
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(itemId)) next.delete(itemId);
          else next.add(itemId);
          return next;
        });
        setLastClickedIndex(index);
      } else if (e.shiftKey && lastClickedIndex !== null) {
        // Range select
        const start = Math.min(lastClickedIndex, index);
        const end = Math.max(lastClickedIndex, index);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          for (let i = start; i <= end; i++) {
            const id = sortedItems[i]?.item.Id;
            if (id) next.add(id);
          }
          return next;
        });
      } else if (!selectedIds.has(itemId)) {
        // Single select (only if clicking an unselected item)
        setSelectedIds(new Set([itemId]));
        setLastClickedIndex(index);
      } else {
        // Click on selected item — keep selection but update lastClicked
        setLastClickedIndex(index);
      }
    },
    [lastClickedIndex, sortedItems, selectedIds],
  );

  // Handle double-click to play
  const handleDoubleClick = useCallback(
    (index: number) => {
      const sortedIdx = sortedItems[index]?.originalIndex;
      if (sortedIdx !== undefined) {
        onPlayTrack(sortedIdx);
      }
    },
    [sortedItems, onPlayTrack],
  );

  // Handle context menu
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, sortedIndex: number) => {
      e.preventDefault();
      const originalIdx = sortedItems[sortedIndex]?.originalIndex;
      if (originalIdx === undefined) return;
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        track: tracks[originalIdx] ?? null,
        apiItem: items[originalIdx] ?? null,
        index: originalIdx,
      });
    },
    [sortedItems, tracks, items],
  );

  const handlePlaySelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    const selectedTracks = tracks.filter((t) => selectedIds.has(t.id));
    if (selectedTracks.length > 0) {
      playTrack(selectedTracks[0]!, selectedTracks);
    }
    setSelectedIds(new Set());
  }, [selectedIds, tracks, playTrack]);

  const handleAddSelectedToQueue = useCallback(() => {
    tracks.forEach((t) => {
      if (selectedIds.has(t.id)) addToQueue(t);
    });
    setSelectedIds(new Set());
  }, [selectedIds, tracks, addToQueue]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastClickedIndex(null);
  }, []);

  const isPlaying = (track: MusicTrack) => currentTrack?.id === track.id;

  // Auto-collapse selection bar when clicking outside rows
  useEffect(() => {
    if (selectedIds.size === 0) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-song-table]') && !target.closest('[data-selection-bar]')) {
        // Don't clear on context menu
        if (target.closest('[data-context-menu]')) return;
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [selectedIds.size]);

  if (isLoading) {
    return (
      <div className="mt-6 space-y-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 animate-pulse"
            style={{ height: '56px' }}
          >
            <div className="h-4 w-6 rounded bg-[var(--music-bg-card)]" />
            <div className="h-10 w-10 rounded bg-[var(--music-bg-card)]" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 rounded bg-[var(--music-bg-card)]" />
              <div className="h-2 w-1/3 rounded bg-[var(--music-bg-card)]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (displayedTracks.length === 0) {
    return (
      <div className="mt-12 flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--music-bg-card)]">
          <ListMusic className="h-8 w-8 text-[var(--music-text-disabled)]" />
        </div>
        <h3 className="text-lg font-bold text-[var(--music-text-primary)]">
          Diese Playlist ist leer
        </h3>
        <p className="mt-1 text-sm text-[var(--music-text-secondary)]">
          Suche nach Songs, um sie hinzuzufügen.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6" data-song-table>
      {/* ── Selection bar ── */}
      {selectedIds.size > 0 && (
        <div
          data-selection-bar
          className="sticky top-0 z-20 -mx-4 mb-2 flex items-center gap-3 rounded-lg bg-[var(--music-accent)]/10 px-4 py-2 backdrop-blur-sm"
        >
          <span className="text-sm font-medium text-[var(--music-text-primary)]">
            {selectedIds.size} ausgewählt
          </span>
          <div className="ml-auto flex items-center gap-2">
            <SelectionActionButton
              icon={<Play className="h-3.5 w-3.5" />}
              label="Abspielen"
              onClick={handlePlaySelected}
            />
            <SelectionActionButton
              icon={<Plus className="h-3.5 w-3.5" />}
              label="Zur Queue"
              onClick={handleAddSelectedToQueue}
            />
          </div>
          <button
            onClick={clearSelection}
            className="ml-2 text-xs text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)]"
          >
            Auswahl aufheben
          </button>
        </div>
      )}

      {/* ── Column headers ── */}
      <SortableHeader sort={sort} onSort={handleSort} />

      {/* ── Virtual list ── */}
      <div
        ref={parentRef}
        className="overflow-y-auto"
        style={{ maxHeight: 'calc(100vh - 480px)' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const track = displayedTracks[virtualItem.index]!;
            const sortedIdx = virtualItem.index;
            const isSelected = selectedIds.has(track.id);
            const isHovered = hoveredIndex === sortedIdx;
            const isTrackPlaying = isPlaying(track);

            return (
              <div
                key={track.id}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                className={cn(
                  'group absolute left-0 right-0 flex items-center gap-3 rounded-md px-4 transition-colors cursor-pointer',
                  isSelected && 'bg-[var(--music-accent)]/10',
                  isHovered && !isSelected && 'bg-[var(--music-bg-hover)]',
                )}
                style={{
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                onMouseEnter={() => setHoveredIndex(sortedIdx)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={(e) => handleRowClick(sortedIdx, e)}
                onDoubleClick={() => handleDoubleClick(sortedIdx)}
                onContextMenu={(e) => handleContextMenu(e, sortedIdx)}
              >
                {/* # / Play icon */}
                <div className="flex w-8 shrink-0 items-center justify-center">
                  {isTrackPlaying || isHovered ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDoubleClick(sortedIdx);
                      }}
                      aria-label={isTrackPlaying ? 'Pause' : 'Abspielen'}
                    >
                      {isTrackPlaying ? (
                        <Pause className="h-4 w-4 fill-[var(--music-accent)] text-[var(--music-accent)]" />
                      ) : (
                        <Play className="h-4 w-4 fill-white text-white" />
                      )}
                    </button>
                  ) : (
                    <span
                      className={cn(
                        'text-sm tabular-nums',
                        isTrackPlaying
                          ? 'text-[var(--music-accent)]'
                          : 'text-[var(--music-text-secondary)]',
                      )}
                    >
                      {sortedIdx + 1}
                    </span>
                  )}
                </div>

                {/* Cover */}
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded">
                  <MusicImage
                    src={getCoverUrl(accessToken, serverId, track.albumId ?? track.id, 40, 40)}
                    alt={track.album}
                    className="h-full w-full object-cover"
                    fallback={
                      <div className="flex h-full w-full items-center justify-center bg-[var(--music-bg-card)]">
                        <Music className="h-5 w-5 text-[var(--music-text-disabled)] opacity-40" />
                      </div>
                    }
                  />
                </div>

                {/* Title + Artist */}
                <div className="flex min-w-0 flex-1 flex-col">
                  <p
                    className={cn(
                      'truncate text-sm font-medium',
                      isTrackPlaying
                        ? 'text-[var(--music-accent)]'
                        : 'text-[var(--music-text-primary)]',
                    )}
                  >
                    {track.title}
                  </p>
                  <p className="truncate text-xs text-[var(--music-text-secondary)]">
                    {track.artist}
                  </p>
                </div>

                {/* Album */}
                <div className="hidden min-w-0 flex-1 md:block">
                  <p className="truncate text-sm text-[var(--music-text-secondary)]">
                    {track.album || '—'}
                  </p>
                </div>

                {/* Genre */}
                <div className="hidden min-w-0 flex-1 lg:block">
                  <p className="truncate text-xs text-[var(--music-text-secondary)]">
                    {'—'}
                  </p>
                </div>

                {/* Duration */}
                <div className="w-14 shrink-0 text-right">
                  <span className="text-xs tabular-nums text-[var(--music-text-secondary)]">
                    {formatTime(track.duration)}
                  </span>
                </div>

                {/* Favorite */}
                <button
                  className="shrink-0 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Favorit"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Heart className="h-4 w-4 text-[var(--music-text-secondary)] hover:text-[var(--music-accent)]" />
                </button>

                {/* More */}
                <button
                  className={cn(
                    'shrink-0 p-1 transition-opacity',
                    isHovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                  )}
                  aria-label="Mehr"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleContextMenu(e as unknown as React.MouseEvent, sortedIdx);
                  }}
                >
                  <MoreHorizontal className="h-4 w-4 text-[var(--music-text-secondary)]" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="mt-3 border-t border-[rgba(255,255,255,0.08)] px-4 pt-3 text-xs text-[var(--music-text-secondary)]">
        <span>{displayedTracks.length} Songs</span>
      </div>

      {/* ── Context Menu ── */}
      {contextMenu.visible && contextMenu.track && (
        <div
          data-context-menu
          className="fixed z-[100] min-w-[200px] rounded-lg border border-[rgba(255,255,255,0.1)] bg-[var(--music-bg-elevated)] py-1 shadow-2xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={() => setContextMenu((prev) => ({ ...prev, visible: false }))}
        >
          <SongContextItem
            icon={<Play className="h-4 w-4" />}
            label="Abspielen"
            onClick={() => {
              if (contextMenu.index >= 0) onPlayTrack(contextMenu.index);
            }}
          />
          <SongContextItem
            icon={<Plus className="h-4 w-4" />}
            label="Als nächstes abspielen"
            onClick={() => {
              if (contextMenu.track) addToQueueNext(contextMenu.track);
            }}
          />
          <SongContextItem
            icon={<ListMusic className="h-4 w-4" />}
            label="Zur Queue hinzufügen"
            onClick={() => {
              if (contextMenu.track) addToQueue(contextMenu.track);
            }}
          />
          <div className="my-1 border-t border-[rgba(255,255,255,0.08)]" />
          <SongContextItem
            icon={<Heart className="h-4 w-4" />}
            label="Favorit"
            onClick={() => {}}
          />
          <SongContextItem
            icon={<Info className="h-4 w-4" />}
            label="Informationen"
            onClick={() => {}}
          />
          {contextMenu.track?.albumId && (
            <SongContextItem
              icon={<ExternalLink className="h-4 w-4" />}
              label="Zur Albumseite"
              onClick={() => {
                window.location.href = `/jellyfin/music/album/${contextMenu.track?.albumId}`;
              }}
            />
          )}
          {contextMenu.track?.artistId && (
            <SongContextItem
              icon={<ExternalLink className="h-4 w-4" />}
              label="Zur Künstlerseite"
              onClick={() => {
                window.location.href = `/jellyfin/music/artist/${contextMenu.track?.artistId}`;
              }}
            />
          )}
          <div className="my-1 border-t border-[rgba(255,255,255,0.08)]" />
          <SongContextItem
            icon={<Trash2 className="h-4 w-4 text-red-400" />}
            label="Aus Playlist entfernen"
            danger
            onClick={() => {}}
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SortableHeader                                                     */
/* ------------------------------------------------------------------ */

function SortableHeader({
  sort,
  onSort,
}: {
  sort: SortConfig;
  onSort: (field: SortField) => void;
}) {
  const columns: { field: SortField; label: string; className?: string; show: string }[] = [
    { field: 'index', label: '#', className: 'w-8 shrink-0 text-center', show: '' },
    { field: 'title', label: 'Titel', className: 'flex-1', show: '' },
    { field: 'artist', label: 'Interpret', className: 'flex-1', show: '' },
    { field: 'album', label: 'Album', className: 'hidden min-w-0 flex-1 md:block', show: 'md:' },
    { field: 'genre', label: 'Genre', className: 'hidden min-w-0 flex-1 lg:block', show: 'lg:' },
    { field: 'duration', label: 'Dauer', className: 'w-14 shrink-0 text-right', show: '' },
  ];

  return (
    <div
      className="flex items-center gap-3 border-b border-[rgba(255,255,255,0.1)] px-4 pb-2"
      style={{ height: '40px' }}
    >
      {columns.map((col) => (
        <button
          key={col.field}
          onClick={() => onSort(col.field)}
          className={`flex items-center gap-1 text-xs uppercase tracking-wide text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)] transition-colors ${col.className}`}
        >
          <span>{col.label}</span>
          {sort.field === col.field ? (
            sort.direction === 'asc' ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50" />
          )}
        </button>
      ))}
      {/* Heart spacer */}
      <div className="w-8 shrink-0" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SelectionActionButton                                              */
/* ------------------------------------------------------------------ */

function SelectionActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-[var(--music-text-primary)] transition-colors hover:bg-[var(--music-bg-hover)]"
    >
      {icon}
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  SongContextItem                                                    */
/* ------------------------------------------------------------------ */

function SongContextItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors ${
        danger
          ? 'text-red-400 hover:bg-red-500/10'
          : 'text-[var(--music-text-primary)] hover:bg-[var(--music-bg-hover)]'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
