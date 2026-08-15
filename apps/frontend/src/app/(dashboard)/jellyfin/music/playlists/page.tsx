'use client';
export const dynamic = 'force-dynamic';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ListMusic } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import {
  useJellyfinServer,
  usePlaylists,
  getPlaylistCoverUrl,
} from '@/lib/music-api';
import { MusicPageShell } from '@/components/music/layout/MusicPageShell';
import { MusicEmptyState } from '@/components/music/shared/SongRow';
import { MusicCard, MusicCardGrid, MusicLoader } from '@/components/music/shared/MusicCard';
import { MusicPlayerWrapper } from '@/components/music/player/MusicPlayerWrapper';

/* ------------------------------------------------------------------ */
/*  Playlists Page — all playlists as a card grid                      */
/* ------------------------------------------------------------------ */

export default function MusicPlaylistsPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const server = useJellyfinServer();
  const { data: playlists, isLoading } = usePlaylists(server?.id);

  return (
    <div className="flex flex-col -m-6 lg:-m-8" style={{ height: 'calc(100% + 48px)' }}>
      <div className="flex-1 overflow-y-auto overscroll-contain music-scroll">
        <MusicPageShell sidebarProps={{ activeTab: 'playlists' }}>
          <div className="flex h-full flex-col gap-4 pt-4">
            <div className="flex items-center gap-2 border-b border-[var(--music-border)] px-1 pb-3">
              <ListMusic className="h-4 w-4 text-[var(--music-accent)]" />
              <span className="text-sm font-medium text-[var(--music-text-primary)]">
                Playlists
              </span>
              {playlists && playlists.length > 0 && (
                <span className="text-xs text-[var(--music-text-tertiary)]">
                  {playlists.length} Playlists
                </span>
              )}
            </div>

            {isLoading && playlists === undefined ? (
              <MusicLoader />
            ) : !playlists || playlists.length === 0 ? (
              <MusicEmptyState
                title="Keine Playlists"
                description="Erstelle mit „Playlist erstellen“ unten in der Seitenleiste deine erste Wiedergabeliste."
              />
            ) : (
              <MusicCardGrid>
                {playlists.map((playlist) => {
                  const coverUrl =
                    accessToken && server?.id
                      ? getPlaylistCoverUrl(accessToken, server.id, playlist.Id, 300, 300)
                      : undefined;
                  const subtitle = `${playlist.ChildCount ?? 0} Songs`;
                  return (
                    <MusicCard
                      key={playlist.Id}
                      title={playlist.Name}
                      subtitle={subtitle}
                      coverUrl={coverUrl}
                      onClick={() => router.push(`/jellyfin/music/playlist/${playlist.Id}`)}
                    />
                  );
                })}
              </MusicCardGrid>
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
