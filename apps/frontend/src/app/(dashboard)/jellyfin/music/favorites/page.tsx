'use client';
export const dynamic = 'force-dynamic';

import React, { useMemo, useState } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import {
  useJellyfinServer,
  useFavorites,
  usePlayTracks,
  jellyfinItemToTrack,
  getCoverUrl,
} from '@/lib/music-api';
import { useMusicPlayerStore } from '@/lib/music-player-store';
import type { MusicTrack } from '@/lib/music-player-store';
import {
  FAVORITE_TABS,
  normalizeFavoriteTab,
  type MusicFavoriteTab,
} from '@/lib/music-favorites';
import { MusicPageShell } from '@/components/music/layout/MusicPageShell';
import { MusicPlayerWrapper } from '@/components/music/player/MusicPlayerWrapper';
import { TrackTable } from '@/components/music/shared/TrackTable';
import { MusicCard, MusicCardGrid, MusicLoader } from '@/components/music/shared/MusicCard';

/* ------------------------------------------------------------------ */
/*  Favorites Page — Songs | Alben | Künstler tabs                     */
/* ------------------------------------------------------------------ */

export default function MusicFavoritesPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const server = useJellyfinServer();
  const currentTrack = useMusicPlayerStore((s) => s.currentTrack);
  const playTracks = usePlayTracks();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<MusicFavoriteTab>('songs');
  const tab = normalizeFavoriteTab(activeTab);

  const { data: favorites, isLoading } = useFavorites(server?.id, tab);

  const tracks = useMemo((): MusicTrack[] => {
    if (!favorites || !accessToken || !server?.id) return [];
    return favorites.map((item) => jellyfinItemToTrack(item, accessToken, server.id));
  }, [favorites, accessToken, server?.id]);

  const handlePlay = (index: number) => {
    if (!favorites || !server?.id || !favorites[index]) return;
    playTracks(favorites, index, server.id);
  };

  const sectionTitle =
    tab === 'songs' ? 'Lieblingssongs' : tab === 'albums' ? 'Lieblingsalben' : 'Lieblingskünstler';

  const emptyHint =
    tab === 'songs'
      ? 'Tippe in der Liedliste auf das Herz, um Songs zu favorisieren.'
      : tab === 'albums'
        ? 'Favorisiere Alben mit dem Herz-Symbol auf der Album-Seite.'
        : 'Favorisiere Künstler mit dem Herz-Symbol auf der Künstler-Seite.';

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
              {favorites && favorites.length > 0 && (
                <span className="text-xs text-[var(--music-text-tertiary)]">
                  {favorites.length} Titel
                </span>
              )}
            </div>

            {/* ── Tabs ── */}
            <div className="flex items-center gap-2 px-1">
              {FAVORITE_TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={cn(
                    'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
                    tab === t.key
                      ? 'bg-[var(--music-text-primary)] text-[var(--music-bg-base)]'
                      : 'bg-[var(--music-bg-card)] text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)]',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Content ── */}
            {isLoading && favorites === undefined ? (
              <MusicLoader />
            ) : !favorites || favorites.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 py-20">
                <Heart className="h-10 w-10 text-[var(--music-text-tertiary)]" />
                <p className="text-sm font-medium text-[var(--music-text-primary)]">
                  {sectionTitle}
                </p>
                <p className="text-xs text-[var(--music-text-tertiary)]">{emptyHint}</p>
              </div>
            ) : tab === 'songs' ? (
              <TrackTable
                tracks={tracks}
                isLoading={isLoading}
                currentTrackId={currentTrack?.id ?? undefined}
                onPlay={handlePlay}
                serverId={server?.id ?? undefined}
                accessToken={accessToken ?? undefined}
                totalCount={tracks.length}
              />
            ) : (
              <MusicCardGrid>
                {favorites.map((item) => {
                  const coverUrl =
                    accessToken && server?.id
                      ? getCoverUrl(accessToken, server.id, item.Id, 300, 300)
                      : undefined;
                  const subtitle =
                    tab === 'albums'
                      ? (item.AlbumArtist ?? item.Artist ?? 'Album')
                      : 'Künstler';
                  const href =
                    tab === 'albums'
                      ? `/jellyfin/music/album/${item.Id}`
                      : `/jellyfin/music/artist/${item.Id}`;
                  return (
                    <MusicCard
                      key={item.Id}
                      title={item.Name}
                      subtitle={subtitle}
                      coverUrl={coverUrl}
                      rounded={tab === 'artists'}
                      onClick={() => router.push(href)}
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
