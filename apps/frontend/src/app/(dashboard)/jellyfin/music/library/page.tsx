'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Play,
  ListMusic,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/lib/auth-store';
import {
  useJellyfinServer,
  useAllSongs,
  useRecentAlbums,
  useArtists,
  useGenres,
  usePlayTracks,
  useFavoriteSongs,
  jellyfinItemToTrack,
  getCoverUrl,
} from '@/lib/music-api';
import { useMusicPlayerStore } from '@/lib/music-player-store';
import type { MusicTrack } from '@/lib/music-player-store';
import type { JellyfinApiItem } from '@/lib/music-api';
import { MusicPageShell } from '@/components/music/layout/MusicPageShell';
import { MusicEmptyState } from '@/components/music/shared/SongRow';
import { MusicCard, MusicCardGrid } from '@/components/music/shared/MusicCard';
import { SongRowSkeleton } from '@/components/music/shared/SongRowSkeleton';
import { MusicPlayerWrapper } from '@/components/music/player/MusicPlayerWrapper';
import { TrackTable } from '@/components/music/shared/TrackTable';
import { useSelection } from '@/components/music/shared/useSelection';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type TabKey = 'songs' | 'albums' | 'artists' | 'genres' | 'favorites';
type SortField = 'Name' | 'Album' | 'DateCreated' | 'RunTimeTicks';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'songs', label: 'Lieder' },
  { key: 'albums', label: 'Alben' },
  { key: 'artists', label: 'Künstler' },
  { key: 'genres', label: 'Genres' },
  { key: 'favorites', label: 'Lieblingssongs' },
];

/* ------------------------------------------------------------------ */
/*  TabContent — reusable loading/empty/content wrapper                */
/* ------------------------------------------------------------------ */

function TabContent({
  query,
  emptyTitle,
  render,
}: {
  query: { data?: JellyfinApiItem[] | null; isLoading: boolean };
  emptyTitle: string;
  render: (items: JellyfinApiItem[]) => React.ReactNode;
}) {
  const items = query.data ?? [];

  if (query.isLoading && items.length === 0) {
    return <SongRowSkeleton />;
  }

  if (items.length === 0) {
    return <MusicEmptyState title={emptyTitle} />;
  }

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain music-scroll">
      {render(items)}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Library Page                                                      */
/* ------------------------------------------------------------------ */

export default function MusicLibraryPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const server = useJellyfinServer();

  const [activeTab, setActiveTab] = useState<TabKey>('songs');

  // Sort
  const [sortBy, setSortBy] = useState<SortField>('Name');
  const [sortOrder, setSortOrder] = useState<'Ascending' | 'Descending'>('Ascending');

  // Pagination
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 100;

  // Player
  const currentTrack = useMusicPlayerStore((s) => s.currentTrack);
  const playTracks = usePlayTracks();

  // ── Queries ──

  const songsQuery = useAllSongs(server?.id, {
    sortBy,
    sortOrder,
    limit: PAGE_SIZE,
    startIndex: page * PAGE_SIZE,
  });

  const albumsQuery = useRecentAlbums(server?.id, 50);
  const artistsQuery = useArtists(server?.id);
  const genresQuery = useGenres(server?.id);
  const favQuery = useFavoriteSongs(server?.id);

  // Convert favorite songs to tracks
  const favTracks = useMemo((): MusicTrack[] => {
    if (!favQuery.data || !accessToken || !server?.id) return [];
    return favQuery.data.map((item) =>
      jellyfinItemToTrack(item, accessToken, server.id),
    );
  }, [favQuery.data, accessToken, server?.id]);

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
      // TrackTable may reorder/filter — look up the original raw item by ID
      const track = tracks[index];
      if (!track) return;
      const rawIndex = songsQuery.data.items.findIndex((i) => i.Id === track.id);
      if (rawIndex === -1) return;
      playTracks(songsQuery.data.items, rawIndex, server.id);
    },
    [tracks, songsQuery.data, server?.id, playTracks],
  );

  // ── Selection (songs tab only) ──

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

  const songsLoading =
    songsQuery.isLoading || (songsQuery.isFetching && tracks.length === 0);

  // ── Render ──

  return (
    <div className="flex flex-col -m-6 lg:-m-8" style={{ height: 'calc(100% + 48px)' }}>
      <div className="flex-1 overflow-y-auto overscroll-contain music-scroll">
        <MusicPageShell
          sidebarProps={{
            playlists: [],
            activePlaylistId: null,
            onPlaylistClick: () => {},
            onCreatePlaylist: () => {},
          }}
        
        >
          <div className="flex h-full flex-col gap-4 pt-4">
        {/* ── Tabs ── */}
        <div className="flex items-center gap-6 border-b border-[rgba(255,255,255,0.1)] px-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'relative pb-3 text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'text-[var(--music-text-primary)]'
                  : 'text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)]',
              )}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--music-accent)]" />
              )}
            </button>
          ))}
        </div>

        {/* ═══════════════════════ Songs ═══════════════════════ */}
        {activeTab === 'songs' && (
          <>
            {/* ── Selection Bulk Action Bar ── */}
            {selection.selectedCount > 0 && (
              <div
                className="flex items-center gap-3 rounded-md px-4 py-2"
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

            <TrackTable
              tracks={tracks}
              isLoading={songsLoading}
              currentTrackId={currentTrack?.id ?? undefined}
              onPlay={handlePlaySong}
              serverId={server?.id ?? undefined}
              accessToken={accessToken ?? undefined}
              totalCount={totalSongs}
              page={page}
              totalPages={totalPages}
              onPrevPage={() => setPage((p) => Math.max(0, p - 1))}
              onNextPage={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              selectedIds={selection.selectedIds}
              onRowClick={handleRowClick}
            />
          </>
        )}

        {/* ═══════════════════════ Favorites ═══════════════════════ */}
        {activeTab === 'favorites' && (
          <>
            {favQuery.isLoading ? (
              <SongRowSkeleton />
            ) : favTracks.length === 0 ? (
              <MusicEmptyState
                title="Keine Lieblingssongs"
                description="Markiere Songs mit dem Herz-Symbol als Favorit."
              />
            ) : (
              <TrackTable
                tracks={favTracks}
                isLoading={favQuery.isLoading}
                currentTrackId={currentTrack?.id ?? undefined}
                onPlay={handlePlaySong}
                serverId={server?.id ?? undefined}
                accessToken={accessToken ?? undefined}
              />
            )}
          </>
        )}

        {/* ═══════════════════════ Albums ═══════════════════════ */}
        {activeTab === 'albums' && (
          <TabContent
            query={albumsQuery}
            emptyTitle="Keine Alben gefunden"
            render={(items) => (
              <MusicCardGrid>
                {items.map((item) => (
                  <MusicCard
                    key={item.Id}
                    title={item.Name}
                    subtitle={item.AlbumArtist ?? item.Artist}
                    coverUrl={
                      accessToken && server?.id
                        ? getCoverUrl(accessToken, server.id, item.Id)
                        : undefined
                    }
                  />
                ))}
              </MusicCardGrid>
            )}
          />
        )}

        {/* ═══════════════════════ Artists ═══════════════════════ */}
        {activeTab === 'artists' && (
          <TabContent
            query={artistsQuery}
            emptyTitle="Keine Künstler gefunden"
            render={(items) => (
              <MusicCardGrid>
                {items.map((item) => (
                  <MusicCard
                    key={item.Id}
                    title={item.Name}
                    subtitle="Künstler"
                    rounded
                    coverUrl={
                      accessToken && server?.id
                        ? getCoverUrl(accessToken, server.id, item.Id, 300, 300)
                        : undefined
                    }
                  />
                ))}
              </MusicCardGrid>
            )}
          />
        )}

        {/* ═══════════════════════ Genres ═══════════════════════ */}
        {activeTab === 'genres' && (
          <TabContent
            query={genresQuery}
            emptyTitle="Keine Genres gefunden"
            render={(items) => (
              <MusicCardGrid>
                {items.map((item) => (
                  <MusicCard
                    key={item.Id}
                    title={item.Name}
                    coverUrl={
                      accessToken && server?.id
                        ? getCoverUrl(accessToken, server.id, item.Id, 300, 300)
                        : undefined
                    }
                  />
                ))}
              </MusicCardGrid>
            )}
          />
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
