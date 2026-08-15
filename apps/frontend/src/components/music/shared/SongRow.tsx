'use client';

import React, { memo, useState, useRef, useCallback } from 'react';
import { Play, Pause, Heart, MoreHorizontal, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MusicImage } from './MusicCard';
import { formatTime, useJellyfinServer, useToggleFavoriteSong } from '@/lib/music-api';
import { useAuthStore } from '@/lib/auth-store';
import { useMusicPlayerStore } from '@/lib/music-player-store';
import { useSongContextMenu } from './ContextMenu';
import { PlayingIndicator } from './PlayingIndicator';
import type { MusicTrack } from '@/lib/music-player-store';

/* ------------------------------------------------------------------ */
/*  SongRow — single song row in a tracklist                          */
/* ------------------------------------------------------------------ */

interface SongRowProps {
  index: number;
  track: MusicTrack;
  isPlaying: boolean;
  onPlay: () => void;
  isSelected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  coverUrl?: string;
  showAlbum?: boolean;
  showCover?: boolean;
}

function SongRowImpl({
  index,
  track,
  isPlaying,
  onPlay,
  isSelected = false,
  onClick,
  coverUrl,
  showAlbum = true,
  showCover = true,
}: SongRowProps) {
  const [hovered, setHovered] = useState(false);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const router = useRouter();
  const server = useJellyfinServer();
  const toggleFav = useToggleFavoriteSong();
  const addToQueue = useMusicPlayerStore((s) => s.addToQueue);
  const addToQueueNext = useMusicPlayerStore((s) => s.addToQueueNext);
  const isFav = useMusicPlayerStore((s) => s.favoriteIds);
  const isFavTrack = isFav.includes(track.id) || track.isFavorite === true;
  const playbackStatus = useMusicPlayerStore((s) => s.status);
  const onSongContextMenu = useSongContextMenu({ serverId: server?.id });

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // Delay single-click action to distinguish from double-click
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
      clickTimerRef.current = setTimeout(() => {
        onClick?.(e);
        clickTimerRef.current = null;
      }, 200);
    },
    [onClick],
  );

  const handleDoubleClick = useCallback(() => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    onPlay();
  }, [onPlay]);

  return (
    <div
      role="row"
      data-testid={`song-row-${track.id}`}
      className={
        'group flex items-center gap-3 rounded-md px-4 transition-colors hover:bg-[var(--music-bg-hover)] ' +
        (isSelected ? 'bg-[var(--music-bg-hover)]' : '')
      }
      style={{
        height: '56px',
        borderLeft: isSelected ? '3px solid var(--music-accent)' : '3px solid transparent',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(e) =>
        onSongContextMenu(e, {
          onPlay,
          onAddToQueue: () => addToQueue(track),
          onAddToQueueNext: () => addToQueueNext(track),
          onToggleFavorite: () => {
            if (server) toggleFav.mutate(track.id);
          },
          onGoToArtist: track.artistId
            ? () => router.push(`/jellyfin/music/artist/${track.artistId}`)
            : undefined,
          onGoToAlbum: track.albumId
            ? () => router.push(`/jellyfin/music/album/${track.albumId}`)
            : undefined,
          isFavorite: isFavTrack,
          songId: track.id,
        })
      }
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
        ) : isPlaying && playbackStatus === 'playing' ? (
          <PlayingIndicator />
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
        onClick={(e) => {
          e.stopPropagation();
          if (server) toggleFav.mutate(track.id);
        }}
      >
        <Heart
          className={
            'h-4 w-4 ' +
            (isFavTrack
              ? 'fill-[var(--music-accent)] text-[var(--music-accent)]'
              : 'text-[var(--music-text-secondary)] hover:text-[var(--music-accent)]')
          }
        />
      </button>

      {/* Duration */}
      <div className="flex w-12 shrink-0 items-center justify-end gap-2">
        <span className="text-xs tabular-nums text-[var(--music-text-secondary)]">
          {formatTime(track.duration)}
        </span>
        <button
          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Mehr"
          onClick={(e) => {
            e.stopPropagation();
            onSongContextMenu(e, {
              onPlay,
              onAddToQueue: () => addToQueue(track),
              onAddToQueueNext: () => addToQueueNext(track),
              onToggleFavorite: () => {
                if (server) toggleFav.mutate(track.id);
              },
              onGoToArtist: track.artistId
                ? () => router.push(`/jellyfin/music/artist/${track.artistId}`)
                : undefined,
              onGoToAlbum: track.albumId
                ? () => router.push(`/jellyfin/music/album/${track.albumId}`)
                : undefined,
              isFavorite: isFavTrack,
              songId: track.id,
            });
          }}
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
      className="flex items-center gap-3 border-b border-[var(--music-border)] px-4 pb-2"
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
