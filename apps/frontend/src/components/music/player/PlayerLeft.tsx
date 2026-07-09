'use client';

import React from 'react';
import {
  Heart,
  ListMusic,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { MusicTrack } from '@/lib/music-player-store';

/* ------------------------------------------------------------------ */
/*  Helpers — split artist string into segments                       */
/* ------------------------------------------------------------------ */

const ARTIST_SEPARATORS = /\s*[,;&/]\s*|\s+(?:feat\.|featuring|with|vs\.?)\s+/i;

interface ArtistSegment {
  text: string;
  artistId?: string;
}

function splitArtistString(artist: string): ArtistSegment[] {
  if (!artist) return [];
  // Split by common separators
  const parts = artist.split(ARTIST_SEPARATORS).filter(Boolean);
  return parts.map((p) => ({ text: p.trim() }));
}

function getArtistSegments(track: MusicTrack | null): ArtistSegment[] {
  if (!track) return [];
  const segments = splitArtistString(track.artist);

  // If track has an artistId, only the first segment gets it (no way to
  // map sub-segments to individual IDs without a proper artist list).
  if (segments.length > 0 && track.artistId) {
    segments[0] = { ...segments[0]!, artistId: track.artistId };
  }
  return segments;
}

/* ------------------------------------------------------------------ */
/*  PlayerLeft — Album Cover, Song Info, Artist Links, Favourite       */
/* ------------------------------------------------------------------ */

interface PlayerLeftProps {
  currentTrack: MusicTrack | null;
  hasTrack: boolean;
  isLiked: boolean;
  onLikeToggle?: (trackId: string) => void;
  onExpandToggle?: () => void;
  isExpanded?: boolean;
  /** Called when album cover is clicked (navigate to album) */
  onAlbumClick?: (albumId: string) => void;
  /** Called when album cover is double-clicked (open now-playing) */
  onNowPlayingDoubleClick?: () => void;
  /** Context menu handlers */
  onCoverContextMenu?: (e: React.MouseEvent) => void;
  onTitleContextMenu?: (e: React.MouseEvent) => void;
  onArtistContextMenu?: (e: React.MouseEvent) => void;
}

export function PlayerLeft({
  currentTrack,
  hasTrack,
  isLiked,
  onLikeToggle,
  onExpandToggle,
  isExpanded = false,
  onAlbumClick,
  onNowPlayingDoubleClick,
  onCoverContextMenu,
  onTitleContextMenu,
  onArtistContextMenu,
}: PlayerLeftProps) {
  const artistSegments = getArtistSegments(currentTrack);

  return (
    <div className="flex items-center gap-3 min-w-0 w-[30%] max-w-[360px] shrink-0">
      {/* ── Album Cover ── */}
      <div
        className="shrink-0 rounded overflow-hidden bg-[var(--music-bg-card)] flex items-center justify-center cursor-pointer group/cover transition-transform duration-200 hover:scale-105"
        style={{ width: 56, height: 56 }}
        onClick={() => {
          if (hasTrack && currentTrack?.albumId && onAlbumClick) {
            onAlbumClick(currentTrack.albumId);
          }
        }}
        onDoubleClick={() => {
          if (hasTrack && onNowPlayingDoubleClick) {
            onNowPlayingDoubleClick();
          }
        }}
        onContextMenu={onCoverContextMenu}
        role="button"
        tabIndex={0}
        aria-label={hasTrack && currentTrack ? `${currentTrack.album} — zum Album` : 'Album-Cover'}
        title={hasTrack && currentTrack ? currentTrack.album : undefined}
      >
        {hasTrack && currentTrack?.coverUrl ? (
          <img
            src={currentTrack.coverUrl}
            alt={currentTrack.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <ListMusic className="h-5 w-5 text-[var(--music-text-tertiary)]" />
        )}
      </div>

      {/* ── Song Info + Artist Links ── */}
      <div className="min-w-0 flex-1">
        {hasTrack && currentTrack ? (
          <>
            {/* Song Title */}
            <p
              className="text-sm font-bold text-[var(--music-text-primary)] truncate leading-tight"
              onContextMenu={onTitleContextMenu}
            >
              {currentTrack.title}
            </p>
            {/* Artist Links (comma-separated) */}
            <p className="text-xs text-[var(--music-text-secondary)] truncate leading-tight mt-0.5">
              {artistSegments.length > 1 ? (
                artistSegments.map((seg, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="mx-0.5">,</span>}
                    {seg.artistId ? (
                      <a
                        href={`#/music/artist/${seg.artistId}`}
                        onClick={(e) => {
                          e.preventDefault();
                          // TODO: navigate to artist page
                        }}
                        onContextMenu={onArtistContextMenu}
                        className="hover:text-[var(--music-accent)] hover:underline transition-colors"
                      >
                        {seg.text}
                      </a>
                    ) : (
                      <span
                        onContextMenu={onArtistContextMenu}
                        className="hover:text-[var(--music-text-primary)] transition-colors cursor-default"
                      >
                        {seg.text}
                      </span>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <span onContextMenu={onArtistContextMenu}>{currentTrack.artist}</span>
              )}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-bold text-[var(--music-text-disabled)] truncate leading-tight">
              Kein Titel
            </p>
            <p className="text-xs text-[var(--music-text-disabled)] truncate leading-tight mt-0.5">
              --
            </p>
          </>
        )}
      </div>

      {/* ── Favorite Button ── */}
      {hasTrack && currentTrack && onLikeToggle && (
        <button
          onClick={() => onLikeToggle(currentTrack.id)}
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-full transition-colors shrink-0',
            isLiked
              ? 'text-[var(--music-accent)]'
              : 'text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)]',
          )}
          aria-label={isLiked ? 'Gefällt mir entfernen' : 'Gefällt mir'}
          title={isLiked ? 'Gefällt mir nicht mehr' : 'Gefällt mir'}
        >
          <Heart
            className={cn('h-4 w-4', isLiked && 'fill-[var(--music-accent)]')}
          />
        </button>
      )}

      {/* ── Expand / Now-Playing Toggle ── */}
      {onExpandToggle && (
        <button
          onClick={onExpandToggle}
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-full transition-colors shrink-0',
            isExpanded
              ? 'text-[var(--music-accent)]'
              : 'text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)]',
          )}
          aria-label="Erweiterte Ansicht"
          title="Now Playing"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
