'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Play, Shuffle, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import {
  useJellyfinServer,
  useAlbumSongs,
  getCoverUrl,
  jellyfinItemToTrack,
  usePlayTracks,
} from '@/lib/music-api';
import { useMusicPlayerStore } from '@/lib/music-player-store';
import { MusicPageShell } from '@/components/music/layout/MusicPageShell';
import { SongRow, TracklistHeader } from '@/components/music/shared/SongRow';
import { MusicImage, MusicLoader } from '@/components/music/shared/MusicCard';
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

  if (!accessToken || !server) {
    return (
      <div className="flex flex-col -m-6 lg:-m-8" style={{ height: 'calc(100% + 48px)' }}>
        <div className="flex-1 overflow-y-auto music-scroll">
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
        <div className="flex-1 overflow-y-auto music-scroll">
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
  const coverUrl = getCoverUrl(accessToken, server.id, albumId, 400, 400);

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

  // Extract dominant color from cover image for gradient background
  useEffect(() => {
    if (!coverUrl || !imgRef.current) return;
    const img = imgRef.current.querySelector('img');
    if (!img) return;

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tempImg = new Image();
    tempImg.crossOrigin = 'anonymous';
    tempImg.onload = () => {
      ctx.drawImage(tempImg, 0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      setGradientColor(`rgb(${r},${g},${b})`);
    };
    tempImg.onerror = () => setGradientColor('#1e1e1e');
    tempImg.src = coverUrl;
  }, [coverUrl]);

  return (
    <div className="flex flex-col -m-6 lg:-m-8" style={{ height: 'calc(100% + 48px)' }}>
      <div className="flex-1 overflow-y-auto music-scroll">
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
      <div className="flex-1 overflow-y-auto music-scroll">
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
