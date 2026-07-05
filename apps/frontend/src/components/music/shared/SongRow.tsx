'use client';

import React, { memo, useState } from 'react';
import { Play, Pause, Heart, MoreHorizontal, Clock } from 'lucide-react';
import { MusicImage } from './MusicCard';
import { formatTime } from '@/lib/music-api';
import { useMusicPlayerStore } from '@/lib/music-player-store';
import type { MusicTrack } from '@/lib/music-player-store';

/* ------------------------------------------------------------------ */
/*  SongRow — single song row in a tracklist                          */
/* ------------------------------------------------------------------ */

interface SongRowProps {
  index: number;
  track: MusicTrack;
  isPlaying: boolean;
  onPlay: () => void;
  coverUrl?: string;
  showAlbum?: boolean;
  showCover?: boolean;
}

function SongRowImpl({
  index,
  track,
  isPlaying,
  onPlay,
  coverUrl,
  showAlbum = true,
  showCover = true,
}: SongRowProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      role="row"
      data-testid={`song-row-${track.id}`}
      className="group flex items-center gap-3 rounded-md px-4 transition-colors hover:bg-[var(--music-bg-hover)]"
      style={{ height: '56px' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={onPlay}
    >
      {/* Index / Play button */}
      <div className="flex w-8 shrink-0 items-center justify-center">
        {hovered || isPlaying ? (
          <button onClick={onPlay} aria-label={isPlaying ? 'Pause' : 'Abspielen'}>
            {isPlaying ? (
              <Pause className="h-4 w-4 fill-[var(--music-accent)] text-[var(--music-accent)]" />
            ) : (
              <Play className="h-4 w-4 fill-white text-white" />
            )}
          </button>
        ) : (
          <span
            className={
              'text-sm tabular-nums ' +
              (isPlaying
                ? 'text-[var(--music-accent)]'
                : 'text-[var(--music-text-secondary)]')
            }
          >
            {index + 1}
          </span>
        )}
      </div>

      {/* Cover + Title + Artist */}
      {showCover && (
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded">
          <MusicImage
            src={coverUrl ?? track.coverUrl}
            alt={track.album}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Title + Artist */}
      <div className="min-w-0 flex-1">
        <p
          className={
            'truncate text-sm font-medium ' +
            (isPlaying
              ? 'text-[var(--music-accent)]'
              : 'text-[var(--music-text-primary)]')
          }
        >
          {track.title}
        </p>
        <p className="truncate text-xs text-[var(--music-text-secondary)]">
          {track.artist}
        </p>
      </div>

      {/* Album */}
      {showAlbum && track.album && (
        <div className="hidden min-w-0 flex-1 md:block">
          <p className="truncate text-sm text-[var(--music-text-secondary)]">{track.album}</p>
        </div>
      )}

      {/* Favorite */}
      <button
        className="shrink-0 p-1 opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Favorit"
      >
        <Heart className="h-4 w-4 text-[var(--music-text-secondary)] hover:text-[var(--music-accent)]" />
      </button>

      {/* Duration */}
      <div className="flex w-12 shrink-0 items-center justify-end gap-2">
        <span className="text-xs tabular-nums text-[var(--music-text-secondary)]">
          {formatTime(track.duration)}
        </span>
        <button
          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Mehr"
        >
          <MoreHorizontal className="h-4 w-4 text-[var(--music-text-secondary)]" />
        </button>
      </div>
    </div>
  );
}

export const SongRow = memo(SongRowImpl);

/* ------------------------------------------------------------------ */
/*  TracklistHeader — column headers for song table                   */
/* ------------------------------------------------------------------ */

export function TracklistHeader({ showAlbum = true }: { showAlbum?: boolean }) {
  return (
    <div
      className="flex items-center gap-3 border-b border-[rgba(255,255,255,0.1)] px-4 pb-2"
      style={{ height: '40px' }}
    >
      <div className="w-8 shrink-0 text-center text-xs text-[var(--music-text-secondary)]">#</div>
      <div className="w-10 shrink-0" />
      <div className="flex-1 text-xs uppercase tracking-wide text-[var(--music-text-secondary)]">
        Titel
      </div>
      {showAlbum && (
        <div className="hidden min-w-0 flex-1 text-xs uppercase tracking-wide text-[var(--music-text-secondary)] md:block">
          Album
        </div>
      )}
      <div className="w-8 shrink-0" />
      <div className="w-12 shrink-0 flex justify-end">
        <Clock className="h-4 w-4 text-[var(--music-text-secondary)]" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  EmptyState — no content placeholder                               */
/* ------------------------------------------------------------------ */

export function MusicEmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-lg font-bold text-[var(--music-text-primary)]">{title}</p>
      {description && (
        <p className="mt-2 text-sm text-[var(--music-text-secondary)]">{description}</p>
      )}
    </div>
  );
}
