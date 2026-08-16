'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Play, Shuffle, Clock, ArrowLeft, ListPlus, Heart } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/lib/auth-store';
import {
  useJellyfinServer,
  useAlbumSongs,
  useItemDetail,
  useToggleItemFavorite,
  getCoverUrl,
  jellyfinItemToTrack,
  usePlayTracks,
} from '@/lib/music-api';
import { useMusicPlayerStore } from '@/lib/music-player-store';
import { extractDominantColor, rgbToCss } from '@/lib/color-extraction';
import { MusicPageShell } from '@/components/music/layout/MusicPageShell';
import { SongRow, TracklistHeader } from '@/components/music/shared/SongRow';
import { MusicImage, MusicLoader } from '@/components/music/shared/MusicCard';
import { useAddToPlaylistMenu } from '@/components/music/shared/ContextMenu';
import { songIdsFromItems } from '@/lib/music-playlist-utils';
import { MusicPlayerWrapper } from '@/components/music/player/MusicPlayerWrapper';

/* ------------------------------------------------------------------ */
/*  Album Detail Page                                                  */
/* ------------------------------------------------------------------ */

export default function AlbumDetailPage() {
  const params = useParams();
  const albumId = params.id as string;

  const accessToken = useAuthStore((s) => s.accessToken);
  const server = useJellyfinServer();

  const { data: albumSongs, isLoading } = useAlbumSongs(server?.id, albumId);
  const playTracks = usePlayTracks();

  const [gradientColor, setGradientColor] = useState('#1e1e1e');
  const imgRef = useRef<HTMLDivElement>(null);

  const currentTrack = useMusicPlayerStore((s) => s.currentTrack);
  const showPlaylistMenu = useAddToPlaylistMenu({ serverId: server?.id });

  // Album favorite state — fetched via the item detail endpoint, toggled via the
  // generic favorite endpoint; kept in local state for immediate feedback.
  const { data: albumDetail } = useItemDetail(server?.id, albumId);
  const toggleItemFav = useToggleItemFavorite();
  const [isAlbumFav, setIsAlbumFav] = useState(false);
  useEffect(() => {
    setIsAlbumFav(albumDetail?.UserData?.IsFavorite === true);
  }, [albumDetail?.UserData?.IsFavorite, albumDetail?.Id]);

  const handleToggleAlbumFavorite = () => {
    const next = !isAlbumFav;
    setIsAlbumFav(next);
    toggleItemFav.mutate(albumId, { onError: () => setIsAlbumFav(!next) });
  };

  const coverUrl = server && accessToken ? (getCoverUrl(accessToken, server.id, albumId, 400, 400) ?? null) : null;

  // Extract dominant color from cover image for gradient background
  useEffect(() => {
    if (!coverUrl) return;
    extractDominantColor(coverUrl)
      .then((rgb) => setGradientColor(rgbToCss(rgb)))
      .catch(() => setGradientColor('#1e1e1e'));
  }, [coverUrl]);

  if (!accessToken || !server) {
    return (
      <div className="flex flex-col -m-6 lg:-m-8" style={{ height: 'calc(100% + 48px)' }}>
        <div className="flex-1 overflow-y-auto overscroll-contain music-scroll">
          <MusicPageShell sidebarProps={{ activeTab: 'albums' }}>
            <MusicLoader />
          </MusicPageShell>
        </div>
        <div className="flex-shrink-0" style={{ height: 'var(--music-player-bar-height)' }}>
          <MusicPlayerWrapper />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col -m-6 lg:-m-8" style={{ height: 'calc(100% + 48px)' }}>
        <div className="flex-1 overflow-y-auto overscroll-contain music-scroll">
          <MusicPageShell sidebarProps={{ activeTab: 'albums' }}>
            <MusicLoader />
          </MusicPageShell>
        </div>
        <div className="flex-shrink-0" style={{ height: 'var(--music-player-bar-height)' }}>
          <MusicPlayerWrapper />
        </div>
      </div>
    );
  }

  const songs = albumSongs ?? [];
  const albumInfo = songs[0];
  const albumName = albumInfo?.Album ?? albumInfo?.Name ?? 'Unbekanntes Album';
  const artistName = albumInfo?.AlbumArtist ?? albumInfo?.Artist ?? 'Unbekannter Künstler';
  const year = albumInfo?.ProductionYear;
  const genre = albumInfo?.Genres?.[0];

  const handlePlayAll = () => {
    if (songs.length > 0) {
      playTracks(songs, 0, server.id);
    }
  };

  const handleShuffle = () => {
    if (songs.length > 0) {
      const randomIndex = Math.floor(Math.random() * songs.length);
      playTracks(songs, randomIndex, server.id);
    }
  };

  const handlePlayTrack = (index: number) => {
    playTracks(songs, index, server.id);
  };

  const handleAddToPlaylist = (e: React.MouseEvent) => {
    const songIds = songIdsFromItems(albumSongs ?? []);
    if (songIds.length === 0) return;
    showPlaylistMenu(
      e,
      songIds,
      `Zur Playlist hinzufügen (${songIds.length} Songs)`,
    );
  };

  if (!accessToken || !server) {
    return (
      <div className="flex flex-col -m-6 lg:-m-8" style={{ height: 'calc(100% + 48px)' }}>
        <div className="flex-1 overflow-y-auto overscroll-contain music-scroll">
          <MusicPageShell
            sidebarProps={{ activeTab: 'albums' }}
            topBar={
              <Link
                href="/jellyfin/music"
                className="flex items-center gap-2 text-sm text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)] transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Zurück zur Musik
              </Link>
            }
          >
            <MusicLoader />
          </MusicPageShell>
        </div>
        <div className="flex-shrink-0" style={{ height: 'var(--music-player-bar-height)' }}>
          <MusicPlayerWrapper />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col -m-6 lg:-m-8" style={{ height: 'calc(100% + 48px)' }}>
      <div className="flex-1 overflow-y-auto overscroll-contain music-scroll">
        <MusicPageShell
          sidebarProps={{ activeTab: 'albums' }}
          topBar={
            <Link
              href="/jellyfin/music"
              className="flex items-center gap-2 text-sm text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück zur Musik
            </Link>
          }
        >
          <div className="music-fade-in">
        {/* ── Header with Gradient ── */}
        <div
          className="relative -mx-[var(--music-space-lg)] -mt-[var(--music-space-lg)] px-[var(--music-space-lg)] pt-[var(--music-space-lg)] pb-6"
          style={{
            background: `linear-gradient(to bottom, ${gradientColor} 0%, transparent 40%, var(--music-bg-base) 100%)`,
          }}
        >
          <div className="flex items-end gap-6">
            {/* Cover */}
            <div ref={imgRef} className="h-[232px] w-[232px] shrink-0 overflow-hidden rounded-md shadow-xl">
              <MusicImage
                src={coverUrl}
                alt={albumName}
                className="h-full w-full object-cover"
              />
            </div>

            {/* Info */}
            <div className="flex flex-col gap-3 pb-2 min-w-0">
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--music-text-secondary)]">
                Album
              </span>
              <h1 className="text-[28px] font-bold leading-tight text-[var(--music-text-primary)] truncate">
                {albumName}
              </h1>
              <div className="flex items-center gap-2 text-sm text-[var(--music-text-secondary)]">
                <span className="font-medium text-[var(--music-text-primary)]">
                  {artistName}
                </span>
                {year && (
                  <>
                    <span>·</span>
                    <span>{year}</span>
                  </>
                )}
                {genre && (
                  <>
                    <span>·</span>
                    <span>{genre}</span>
                  </>
                )}
                <span>·</span>
                <span>{songs.length} Songs</span>
              </div>

              {/* Play + Shuffle Buttons */}
              {songs.length > 0 && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePlayAll}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--music-accent)] text-black shadow-lg transition-all hover:scale-105 hover:bg-[var(--music-accent-hover)]"
                    aria-label="Alle abspielen"
                  >
                    <Play className="h-5 w-5 fill-black" />
                  </button>
                  <button
                    onClick={handleShuffle}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--music-text-secondary)] transition-all hover:scale-105 hover:text-[var(--music-text-primary)]"
                    aria-label="Zufallswiedergabe"
                  >
                    <Shuffle className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleAddToPlaylist}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--music-text-secondary)] transition-all hover:scale-105 hover:text-[var(--music-text-primary)]"
                    aria-label="Zur Playlist hinzufügen"
                    title="Zur Playlist hinzufügen"
                  >
                    <ListPlus className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleToggleAlbumFavorite}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-105',
                      isAlbumFav
                        ? 'text-[var(--music-accent)]'
                        : 'text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)]',
                    )}
                    aria-label={isAlbumFav ? 'Aus Favoriten entfernen' : 'Album favorisieren'}
                    title={isAlbumFav ? 'Aus Favoriten entfernen' : 'Album favorisieren'}
                  >
                    <Heart className={cn('h-5 w-5', isAlbumFav && 'fill-[var(--music-accent)]')} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Tracklist ── */}
        <div className="mt-6">
          <TracklistHeader showAlbum={false} />

          {songs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-base font-medium text-[var(--music-text-secondary)]">
                Keine Songs gefunden
              </p>
              <p className="mt-1 text-sm text-[var(--music-text-tertiary)]">
                Dieses Album enthält noch keine Titel.
              </p>
            </div>
          )}

          <div>
            {songs.map((item, index) => {
              const track = jellyfinItemToTrack(item, accessToken, server.id);
              return (
                <SongRow
                  key={item.Id}
                  index={index}
                  track={track}
                  isPlaying={currentTrack?.id === item.Id}
                  onPlay={() => handlePlayTrack(index)}
                  showAlbum={false}
                  showCover={false}
                />
              );
            })}
          </div>

          {/* Tracklist footer with total duration */}
          {songs.length > 0 && (
            <div className="mt-4 border-t border-[rgba(255,255,255,0.1)] px-4 pt-3 text-xs text-[var(--music-text-secondary)]">
              <span>{songs.length} Songs</span>
              <span className="mx-2">·</span>
              <span>
                {formatTotalDuration(songs)}
              </span>
            </div>
          )}
        </div>
          </div>
        </MusicPageShell>
      </div>
      <div className="flex-shrink-0" style={{ height: 'var(--music-player-bar-height)' }}>
        <MusicPlayerWrapper />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helper                                                             */
/* ------------------------------------------------------------------ */

function formatTotalDuration(items: { RunTimeTicks?: number }[]): string {
  const totalSeconds = items.reduce((sum, item) => {
    if (!item.RunTimeTicks) return sum;
    return sum + Math.round(item.RunTimeTicks / 10_000_000);
  }, 0);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours} Std. ${minutes} Min.`;
  }
  return `${minutes} Min.`;
}
