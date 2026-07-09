'use client';
export const dynamic = 'force-dynamic';

import React from 'react';
import { useAuthStore } from '@/lib/auth-store';
import {
  useJellyfinServer,
  useArtists,
  getCoverUrl,
} from '@/lib/music-api';
import { MusicPageShell } from '@/components/music/layout/MusicPageShell';
import { MusicCard, MusicCardGrid, MusicLoader } from '@/components/music/shared/MusicCard';
import { MusicEmptyState } from '@/components/music/shared/SongRow';
import { MusicPlayerWrapper } from '@/components/music/player/MusicPlayerWrapper';

/* ------------------------------------------------------------------ */
/*  Artists Page                                                      */
/* ------------------------------------------------------------------ */

export default function MusicArtistsPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const server = useJellyfinServer();

  const artistsQuery = useArtists(server?.id);

  const items = artistsQuery.data ?? [];

  return (
    <div className="flex flex-col -m-6 lg:-m-8" style={{ height: 'calc(100% + 48px)' }}>
      <div className="flex-1 overflow-y-auto music-scroll">
        <MusicPageShell sidebarProps={{}}>
          <div className="flex h-full flex-col gap-4 pt-4">
            {/* ── Page Title ── */}
            <div className="flex items-center gap-6 border-b border-[rgba(255,255,255,0.1)] px-1 pb-3">
              <span className="text-sm font-medium text-[var(--music-text-primary)]">
                Künstler
              </span>
            </div>

            {artistsQuery.isLoading && items.length === 0 ? (
              <MusicLoader />
            ) : items.length === 0 ? (
              <MusicEmptyState
                title="Keine Künstler gefunden"
                description="Füge Musik zu deiner Jellyfin-Bibliothek hinzu."
              />
            ) : (
              <div className="flex-1 overflow-y-auto music-scroll">
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
