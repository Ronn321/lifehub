'use client';
export const dynamic = 'force-dynamic';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import {
  useJellyfinServer,
  useGenres,
  getCoverUrl,
} from '@/lib/music-api';
import { MusicAppShell } from '@/components/music/layout/MusicAppShell';
import { MusicCard, MusicCardGrid, MusicLoader } from '@/components/music/shared/MusicCard';
import { MusicEmptyState } from '@/components/music/shared/SongRow';
import { MusicPlayerWrapper } from '@/components/music/player/MusicPlayerWrapper';

export default function MusicGenresPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const server = useJellyfinServer();
  const genresQuery = useGenres(server?.id);
  const items = genresQuery.data ?? [];

  return (
    <div className="flex flex-col -m-6 lg:-m-8" style={{ height: 'calc(100% + 48px)' }}>
      <div className="flex-1 overflow-y-auto music-scroll">
        <MusicAppShell sidebarProps={{}}>
          <div className="flex h-full flex-col gap-4 pt-4">
            <div className="flex items-center gap-6 border-b border-[rgba(255,255,255,0.1)] px-1 pb-3">
              <span className="text-sm font-medium text-[var(--music-text-primary)]">
                Genres
              </span>
            </div>

            {genresQuery.isLoading && items.length === 0 ? (
              <MusicLoader />
            ) : items.length === 0 ? (
              <MusicEmptyState
                title="Keine Genres gefunden"
                description="Füge Musik zu deiner Jellyfin-Bibliothek hinzu."
              />
            ) : (
              <div className="flex-1 overflow-y-auto music-scroll">
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
                      onClick={() => router.push(`/jellyfin/music/genre/${item.Id}`)}
                    />
                  ))}
                </MusicCardGrid>
              </div>
            )}
          </div>
        </MusicAppShell>
      </div>
      <div className="flex-shrink-0" style={{ height: 'var(--music-player-bar-height)' }}>
        <MusicPlayerWrapper />
      </div>
    </div>
  );
}
