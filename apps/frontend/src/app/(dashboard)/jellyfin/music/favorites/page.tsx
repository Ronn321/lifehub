'use client';
export const dynamic = 'force-dynamic';

import React, { useMemo } from 'react';
import { Heart } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import {
  useJellyfinServer,
  useFavoriteSongs,
  usePlayTracks,
  jellyfinItemToTrack,
} from '@/lib/music-api';
import { useMusicPlayerStore } from '@/lib/music-player-store';
import type { MusicTrack } from '@/lib/music-player-store';
import { MusicPageShell } from '@/components/music/layout/MusicPageShell';
import { MusicPlayerWrapper } from '@/components/music/player/MusicPlayerWrapper';
import { TrackTable } from '@/components/music/shared/TrackTable';

/* ------------------------------------------------------------------ */
/*  Favorites Page — all favorited songs from Jellyfin                 */
/* ------------------------------------------------------------------ */

export default function MusicFavoritesPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const server = useJellyfinServer();
  const currentTrack = useMusicPlayerStore((s) => s.currentTrack);
  const playTracks = usePlayTracks();

  const { data: favorites, isLoading } = useFavoriteSongs(server?.id);

  const tracks = useMemo((): MusicTrack[] => {
    if (!favorites || !accessToken || !server?.id) return [];
    return favorites.map((item) => jellyfinItemToTrack(item, accessToken, server.id));
  }, [favorites, accessToken, server?.id]);

  const handlePlay = (index: number) => {
    if (!favorites || !server?.id || !favorites[index]) return;
    playTracks(favorites, index, server.id);
  };

  return (
    <div className="flex flex-col -m-6 lg:-m-8" style={{ height: 'calc(100% + 48px)' }}>
      <div className="flex-1 overflow-y-auto overscroll-contain music-scroll">
        <MusicPageShell sidebarProps={{}}>
          <div className="flex h-full flex-col gap-4 pt-4">
            {/* ── Page Title ── */}
            <div className="flex items-center gap-2 border-b border-[var(--music-border)] px-1 pb-3">
              <Heart className="h-4 w-4 text-[var(--music-accent)]" />
              <span className="text-sm font-medium text-[var(--music-text-primary)]">
                Lieblingssongs
              </span>
              {tracks.length > 0 && (
                <span className="text-xs text-[var(--music-text-tertiary)]">
                  {tracks.length} Titel
                </span>
              )}
            </div>

            {/* ── TrackTable / Empty state ── */}
            {!isLoading && tracks.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 py-20">
                <Heart className="h-10 w-10 text-[var(--music-text-tertiary)]" />
                <p className="text-sm font-medium text-[var(--music-text-primary)]">
                  Noch keine Lieblingssongs
                </p>
                <p className="text-xs text-[var(--music-text-tertiary)]">
                  Tippe in der Liedliste auf das Herz, um Songs zu favorisieren.
                </p>
              </div>
            ) : (
              <TrackTable
                tracks={tracks}
                isLoading={isLoading}
                currentTrackId={currentTrack?.id ?? undefined}
                onPlay={handlePlay}
                serverId={server?.id ?? undefined}
                accessToken={accessToken ?? undefined}
                totalCount={tracks.length}
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
