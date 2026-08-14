'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { Play, Heart, ArrowLeft } from 'lucide-react';
import type { JellyfinMediaItem } from '@/lib/jellyfin-media-api';
import { getImageUrl, getBackdropUrl, formatRuntime, formatYear } from '@/lib/jellyfin-media-api';
import { useJellyfinLayout } from '@/lib/jellyfin-layout-store';
import { WatchlistButton } from './WatchlistButton';

/* ------------------------------------------------------------------ */
/*  DetailHeader — Cinematic header with backdrop, poster, metadata   */
/* ------------------------------------------------------------------ */

interface DetailHeaderProps {
  item: JellyfinMediaItem;
  serverId: string;
  onPlay?: () => void;
  onResume?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  resumePositionTicks?: number | null;
}

export function DetailHeader({
  item, serverId, onPlay, onResume, onToggleFavorite,
  isFavorite, resumePositionTicks,
}: DetailHeaderProps) {
  const router = useRouter();
  const fullWidth = useJellyfinLayout((s) => s.fullWidth);
  const [backdropError, setBackdropError] = useState(false);
  const [posterError, setPosterError] = useState(false);
  const isMovie = item.Type === 'Movie';

  const hasResume = resumePositionTicks && resumePositionTicks > 0;
  const year = formatYear(item);
  const runtime = formatRuntime(item.RunTimeTicks);
  const rating = item.OfficialRating ?? '';

  return (
    <div className="relative">
      {/* Backdrop container */}
      <div className={cn('relative overflow-hidden', fullWidth ? 'h-[78vh] min-h-[560px]' : 'h-[60vh] min-h-[440px]')}>
        {/* Backdrop image or gradient fallback */}
        {!backdropError ? (
          <img
            src={getBackdropUrl(serverId, item.Id)}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setBackdropError(true)}
            crossOrigin="anonymous"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-brand-900/60 to-bg-surface" />
        )}

        {/* 1. Content-Scrim: always dark for readability on light AND dark theme */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
        {/* 2. Page-Blend: soft edge transition to the page color (theme-adaptive) — narrow bottom band only, below the content area so the scrim keeps text readable in light theme */}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgb(var(--bg-surface))_0%,rgb(var(--bg-surface)/0.75)_7%,rgb(var(--bg-surface)/0.3)_15%,transparent_24%)]" />
        {/* 3. Top-Fade for back button (replaces the previous one) */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/50 to-transparent" />

        {/* Back button */}
        <div className="absolute top-4 left-4 z-20">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-black/30 text-white/70 hover:text-white hover:bg-white/10 backdrop-blur-sm transition-colors"
            aria-label="Zurück"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Poster + Info at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
          <div className="flex items-end gap-6">
            {/* Poster */}
            <div className="hidden sm:block w-[150px] lg:w-[200px] shrink-0">
              <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                {!posterError ? (
                  <img
                    src={getImageUrl(serverId, item.Id, 400, 600)}
                    alt={item.Name}
                    className="h-full w-full object-cover"
                    onError={() => setPosterError(true)}
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-bg-muted/30">
                    <span className="text-4xl font-bold text-fg-muted/20">
                      {item.Name?.charAt(0) ?? '?'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="flex flex-col gap-3 min-w-0">
              {/* Title */}
              <h1 className="text-2xl lg:text-4xl font-black tracking-tight text-white drop-shadow-lg">
                {item.Name}
              </h1>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-2 text-sm text-white/90">
                {year && <span>{year}</span>}
                {rating && (
                  <span className="rounded border border-white/20 px-1.5 py-0.5 text-xs font-semibold">
                    {rating}
                  </span>
                )}
                {runtime && <span>{runtime}</span>}
                {item.CommunityRating && (
                  <span className="flex items-center gap-1">
                    <span className="text-yellow-400">★</span>
                    {item.CommunityRating.toFixed(1)}
                  </span>
                )}
              </div>

              {/* Genres */}
              {item.Genres && item.Genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {item.Genres.slice(0, 5).map((genre) => (
                    <span
                      key={genre}
                      className="rounded-full bg-black/25 px-3 py-0.5 text-xs font-medium text-white/90 backdrop-blur-sm"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 mt-1">
                {hasResume && onResume ? (
                  <button
                    onClick={onResume}
                    className="flex items-center gap-2 rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-brand-400 hover:scale-105"
                  >
                    <Play className="h-4 w-4 fill-white" />
                    Weiter schauen
                  </button>
                ) : onPlay ? (
                  <button
                    onClick={onPlay}
                    className="flex items-center gap-2 rounded-lg bg-white px-6 py-2.5 text-sm font-bold text-black transition-all hover:bg-white/90 hover:scale-105"
                  >
                    <Play className="h-4 w-4 fill-black" />
                    {isMovie ? 'Abspielen' : 'Jetzt starten'}
                  </button>
                ) : null}

                {onToggleFavorite && (
                  <button
                    onClick={onToggleFavorite}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                      isFavorite
                        ? 'border-red-500 bg-red-500/25 text-red-300'
                        : 'border-white/45 bg-black/25 text-white/90 backdrop-blur-sm hover:border-white/70 hover:text-white',
                    )}
                    aria-label={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
                  >
                    <Heart className={cn('h-4 w-4', isFavorite && 'fill-current')} />
                  </button>
                )}

                <WatchlistButton item={item} serverId={serverId} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
