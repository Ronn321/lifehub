'use client';

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Play, Shuffle, Clock, ArrowLeft, Disc3 } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import {
  useJellyfinServer,
  useGenreSongs,
  useGenres,
  getCoverUrl,
  jellyfinItemToTrack,
  usePlayTracks,
} from '@/lib/music-api';
import { useMusicPlayerStore } from '@/lib/music-player-store';
import { MusicPageShell } from '@/components/music/layout/MusicPageShell';
import { SongRow, TracklistHeader } from '@/components/music/shared/SongRow';
import { MusicLoader } from '@/components/music/shared/MusicCard';
import { MusicPlayerWrapper } from '@/components/music/player/MusicPlayerWrapper';

/* ------------------------------------------------------------------ */
/*  Genre Detail Page                                                  */
/* ------------------------------------------------------------------ */

/** Generate a deterministic HSL color from a string */
function stringToHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

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

export default function GenreDetailPage() {
  const params = useParams();
  const genreId = params.id as string;

  const accessToken = useAuthStore((s) => s.accessToken);
  const server = useJellyfinServer();

  const { data: genreSongs, isLoading: songsLoading } = useGenreSongs(server?.id, genreId);
  const { data: genres, isLoading: genresLoading } = useGenres(server?.id);
  const playTracks = usePlayTracks();

  const currentTrack = useMusicPlayerStore((s) => s.currentTrack);

  const hue = useMemo(() => stringToHue(genreId), [genreId]);

  // Find genre display name from genres list
  const genreName = useMemo(() => {
    if (!genres) return genreId;
    const match = genres.find(
      (g) => g.Id === genreId || g.Name?.toLowerCase() === genreId.toLowerCase(),
    );
    return match?.Name ?? genreId;
  }, [genres, genreId]);

  const songs = genreSongs ?? [];

  if (!accessToken || !server) {
    return (
      <MusicPageShell sidebarProps={{ activeTab: 'albums' }}>
        <MusicLoader />
      </MusicPageShell>
    );
  }

  const isLoading = songsLoading || genresLoading;

  if (isLoading) {
    return (
      <MusicPageShell sidebarProps={{ activeTab: 'albums' }}>
        <MusicLoader />
      </MusicPageShell>
    );
  }

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

  return (
    <MusicPageShell
      sidebarProps={{ activeTab: 'albums' }}
      stickyTitle={genreName}
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
        {/* ── Genre Header with Colored Gradient ── */}
        <div
          className="relative -mx-[var(--music-space-lg)] -mt-[var(--music-space-lg)] px-[var(--music-space-lg)] pt-[var(--music-space-lg)] pb-6"
          style={{
            background: `linear-gradient(135deg, hsl(${hue}, 70%, 30%) 0%, hsl(${hue}, 50%, 15%) 60%, var(--music-bg-base) 100%)`,
          }}
        >
          <div className="flex items-end gap-6 pt-8">
            {/* Genre Icon (wie Album-Cover, aber rund mit Disc-Icon) */}
            <div
              className="flex h-[232px] w-[232px] shrink-0 items-center justify-center rounded-md shadow-xl"
              style={{
                background: `hsl(${hue}, 60%, 25%)`,
              }}
            >
              <Disc3 className="h-24 w-24 text-white opacity-50" />
            </div>

            {/* Info */}
            <div className="flex flex-col gap-3 pb-2 min-w-0">
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--music-text-secondary)]">
                Genre
              </span>
              <h1 className="text-[28px] font-bold leading-tight text-[var(--music-text-primary)] truncate">
                {genreName}
              </h1>
              <div className="flex items-center gap-2 text-sm text-[var(--music-text-secondary)]">
                <span>{songs.length} Songs</span>
              </div>

              {/* Play All + Shuffle Buttons (wie Album-Detailseite) */}
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
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Tracklist ── */}
        <div className="mt-6">
          <TracklistHeader showAlbum />

          {songs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-base font-medium text-[var(--music-text-secondary)]">
                Keine Songs gefunden
              </p>
              <p className="mt-1 text-sm text-[var(--music-text-tertiary)]">
                Diesem Genre sind noch keine Songs zugeordnet.
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
                  showAlbum
                  showCover
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
  );
}
