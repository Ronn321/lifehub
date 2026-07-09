'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Shuffle,
  Download,
  MoreHorizontal,
  Edit,
  Share2,
  Trash2,
  Copy,
  ListMusic,
  Music,
  Clock,
  User,
  CalendarDays,
  Loader2,
} from 'lucide-react';
import { MusicImage } from '@/components/music/shared/MusicCard';
import type { JellyfinPlaylist } from '@/lib/music-api';
import { ticksToSeconds, formatDuration, getPlaylistCoverUrl } from '@/lib/music-api';
import { useMusicPlayerStore } from '@/lib/music-player-store';

/* ------------------------------------------------------------------ */
/*  PlaylistHeader Props                                               */
/* ------------------------------------------------------------------ */

interface PlaylistHeaderProps {
  playlist: JellyfinPlaylist | undefined;
  songCount: number;
  coverUrl?: string;
  accessToken: string;
  serverId: string;
  isLoading: boolean;
  onPlayAll: () => void;
  onShuffle: () => void;
}

/* ------------------------------------------------------------------ */
/*  PlaylistHeader Component                                           */
/* ------------------------------------------------------------------ */

export function PlaylistHeader({
  playlist,
  songCount,
  coverUrl,
  accessToken,
  serverId,
  isLoading,
  onPlayAll,
  onShuffle,
}: PlaylistHeaderProps) {
  const [contextOpen, setContextOpen] = useState(false);
  const [gradientColor, setGradientColor] = useState('#1e1e1e');
  const contextRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);

  // Extract gradient color from cover via Canvas
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

  // Close context menu on outside click
  useEffect(() => {
    if (!contextOpen) return;
    const handler = (e: MouseEvent) => {
      if (contextRef.current && !contextRef.current.contains(e.target as Node)) {
        setContextOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextOpen]);

  const totalSeconds = playlist?.CumulativeRunTimeTicks
    ? ticksToSeconds(playlist.CumulativeRunTimeTicks)
    : 0;
  const totalDuration = formatDuration(totalSeconds);
  const createdDate = playlist?.ProductionYear
    ? String(playlist.ProductionYear)
    : undefined;

  const playState = useMusicPlayerStore((s) => s.status);
  const currentQueueType = useMusicPlayerStore((s) => s.queueType);
  const isCurrentPlaylist = currentQueueType === 'playlist';

  if (isLoading || !playlist) {
    return (
      <div
        className="relative -mx-[var(--music-space-lg)] -mt-[var(--music-space-lg)] px-[var(--music-space-lg)] pt-[var(--music-space-lg)] pb-6"
        style={{
          background: `linear-gradient(to bottom, ${gradientColor} 0%, transparent 50%, var(--music-bg-base) 100%)`,
        }}
      >
        <div className="flex items-end gap-6 pt-8">
          <div className="h-[232px] w-[232px] shrink-0 animate-pulse rounded-md bg-[var(--music-bg-card)]" />
          <div className="flex flex-col gap-3 pb-2 min-w-0">
            <div className="h-4 w-20 animate-pulse rounded bg-[var(--music-bg-card)]" />
            <div className="h-8 w-48 animate-pulse rounded bg-[var(--music-bg-card)]" />
            <div className="h-4 w-36 animate-pulse rounded bg-[var(--music-bg-card)]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative -mx-[var(--music-space-lg)] -mt-[var(--music-space-lg)] px-[var(--music-space-lg)] pt-[var(--music-space-lg)] pb-6"
      style={{
        background: `linear-gradient(to bottom, ${gradientColor} 0%, transparent 50%, var(--music-bg-base) 100%)`,
      }}
    >
      <div className="flex items-end gap-6 pt-8">
        {/* Cover */}
        <div ref={imgRef} className="h-[232px] w-[232px] shrink-0 overflow-hidden rounded-md shadow-xl">
          <MusicImage
            src={coverUrl}
            alt={playlist.Name}
            className="h-full w-full object-cover"
            fallback={
              <div className="flex h-full w-full items-center justify-center bg-[var(--music-bg-card)]">
                <ListMusic className="h-16 w-16 text-[var(--music-text-disabled)] opacity-40" />
              </div>
            }
          />
        </div>

        {/* Meta */}
        <div className="flex flex-col gap-3 pb-2 min-w-0 flex-1">
          {/* Typ-Label */}
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--music-text-secondary)]">
            Playlist
          </span>

          {/* Title */}
          <h1 className="text-[28px] font-bold leading-tight text-[var(--music-text-primary)] truncate">
            {playlist.Name}
          </h1>

          {/* Description */}
          {playlist.Overview && (
            <p className="text-sm text-[var(--music-text-secondary)] line-clamp-2 max-w-xl">
              {playlist.Overview}
            </p>
          )}

          {/* Meta row: Owner • Songs • Duration */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--music-text-secondary)]">
            {playlist.Owner && (
              <>
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  <span className="font-medium text-[var(--music-text-primary)]">
                    {playlist.Owner}
                  </span>
                </span>
                <span>·</span>
              </>
            )}
            <span className="flex items-center gap-1">
              <Music className="h-3.5 w-3.5" />
              {songCount} {songCount === 1 ? 'Song' : 'Songs'}
            </span>
            {totalDuration && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {totalDuration}
                </span>
              </>
            )}
            {createdDate && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {createdDate}
                </span>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-1">
            {/* Play all button */}
            <button
              onClick={onPlayAll}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--music-accent)] text-black shadow-lg transition-all hover:scale-105 hover:bg-[var(--music-accent-hover)]"
              aria-label={isCurrentPlaylist && playState === 'playing' ? 'Pause' : 'Alle abspielen'}
            >
              {isCurrentPlaylist && playState === 'playing' ? (
                <Pause className="h-5 w-5 fill-black" />
              ) : (
                <Play className="h-5 w-5 fill-black ml-0.5" />
              )}
            </button>

            {/* Shuffle */}
            <button
              onClick={onShuffle}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--music-text-secondary)] transition-all hover:scale-105 hover:text-[var(--music-text-primary)]"
              aria-label="Zufallswiedergabe"
            >
              <Shuffle className="h-5 w-5" />
            </button>

            {/* Download */}
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--music-text-secondary)] transition-all hover:scale-105 hover:text-[var(--music-text-primary)]"
              aria-label="Herunterladen"
            >
              <Download className="h-5 w-5" />
            </button>

            {/* More menu */}
            <div ref={contextRef} className="relative">
              <button
                onClick={() => setContextOpen(!contextOpen)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--music-text-secondary)] transition-all hover:scale-105 hover:text-[var(--music-text-primary)]"
                aria-label="Mehr"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>

              {contextOpen && (
                <div className="absolute left-0 top-full mt-2 z-50 min-w-[200px] rounded-lg border border-[rgba(255,255,255,0.1)] bg-[var(--music-bg-elevated)] py-1 shadow-xl">
                  <ContextMenuItem icon={<Edit className="h-4 w-4" />} label="Bearbeiten" />
                  <ContextMenuItem icon={<Share2 className="h-4 w-4" />} label="Teilen" />
                  <ContextMenuItem icon={<Copy className="h-4 w-4" />} label="Duplizieren" />
                  <div className="my-1 border-t border-[rgba(255,255,255,0.08)]" />
                  <ContextMenuItem
                    icon={<Trash2 className="h-4 w-4 text-red-400" />}
                    label="Löschen"
                    danger
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ContextMenuItem                                                    */
/* ------------------------------------------------------------------ */

function ContextMenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors ${
        danger
          ? 'text-red-400 hover:bg-red-500/10'
          : 'text-[var(--music-text-primary)] hover:bg-[var(--music-bg-hover)]'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
