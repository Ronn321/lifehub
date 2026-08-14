'use client';
export const dynamic = 'force-dynamic';

import React, { useMemo } from 'react';
import { Clock } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import {
  useJellyfinServer,
  useRecentlyPlayed,
  usePlayTracks,
  jellyfinItemToTrack,
} from '@/lib/music-api';
import { useMusicPlayerStore } from '@/lib/music-player-store';
import type { MusicTrack } from '@/lib/music-player-store';
import { MusicPageShell } from '@/components/music/layout/MusicPageShell';
import { MusicPlayerWrapper } from '@/components/music/player/MusicPlayerWrapper';
import { TrackTable } from '@/components/music/shared/TrackTable';

/* ------------------------------------------------------------------ */
/*  Recently Played Page — songs you listened to                       */
/* ------------------------------------------------------------------ */

export default function MusicRecentPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const server = useJellyfinServer();
  const currentTrack = useMusicPlayerStore((s) => s.currentTrack);
  const playTracks = usePlayTracks();

  const { data: recent, isLoading } = useRecentlyPlayed(server?.id, 100);

  const tracks = useMemo((): MusicTrack[] => {
    if (!recent || !accessToken || !server?.id) return [];
    return recent.map((item) => jellyfinItemToTrack(item, accessToken, server.id));
  }, [recent, accessToken, server?.id]);

  const handlePlay = (index: number) => {
    if (!recent || !server?.id || !recent[index]) return;
    playTracks(recent, index, server.id);
  };

  return (
    <div className="flex flex-col -m-6 lg:-m-8" style={{ height: 'calc(100% + 48px)' }}>
      <div className="flex-1 overflow-y-auto overscroll-contain music-scroll">
        <MusicPageShell sidebarProps={{}}>
          <div className="flex h-full flex-col gap-4 pt-4">
            {/* ── Page Title ── */}
            <div className="flex items-center gap-2 border-b border-[var(--music-border)] px-1 pb-3">
              <Clock className="h-4 w-4 text-[var(--music-accent)]" />
              <span className="text-sm font-medium text-[var(--music-text-primary)]">
                Zuletzt gehört
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
                <Clock className="h-10 w-10 text-[var(--music-text-tertiary)]" />
                <p className="text-sm font-medium text-[var(--music-text-primary)]">
                  Noch nichts gehört
                </p>
                <p className="text-xs text-[var(--music-text-tertiary)]">
                  Beginne Musik zu hören, um deine Geschichte aufzubauen.
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
