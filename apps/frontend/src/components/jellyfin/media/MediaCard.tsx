'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { Film, Monitor, Play, Clock, Star, Info } from 'lucide-react';
import type { JellyfinMediaItem } from '@/lib/jellyfin-media-api';
import { getImageUrl, formatRuntime, formatYear } from '@/lib/jellyfin-media-api';

/* ------------------------------------------------------------------ */
/*  MediaCard — Netflix-style poster card with hover preview          */
/* ------------------------------------------------------------------ */

interface MediaCardProps {
  item: JellyfinMediaItem;
  serverId: string;
  href?: string;
  showYear?: boolean;
  showRuntime?: boolean;
  showRating?: boolean;
  watched?: boolean;
  progressPercent?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: { aspect: 'aspect-[2/3]', width: 'min-w-[160px] w-[160px]' },
  md: { aspect: 'aspect-[2/3]' },
  lg: { aspect: 'aspect-[2/3]' },
};

export function MediaCard({
  item, serverId, href, showYear = true, showRuntime = false, showRating = false,
  watched, progressPercent, size = 'md', className,
}: MediaCardProps) {
  const router = useRouter();
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMovie = item.Type === 'Movie';
  const Icon = isMovie ? Film : Monitor;

  const cardHref = href ?? (isMovie
    ? `/jellyfin/movies/${item.Id}`
    : item.Type === 'Series'
      ? `/jellyfin/series/${item.Id}`
      : item.Type === 'Episode'
        ? `/jellyfin/watch/${item.Id}`
        : '#'
  );

  function handleClick() {
    if (cardHref !== '#') router.push(cardHref);
  }

  function handleMouseEnter() {
    // Short delay to avoid flicker when quickly passing over cards
    hoverTimer.current = setTimeout(() => setIsHovered(true), 200);
  }

  function handleMouseLeave() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setIsHovered(false);
  }

  return (
    <button
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border border-border bg-bg-surface text-left w-full',
        'transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:border-brand-500/30',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        className,
      )}
    >
      {/* Poster container */}
      <div className={cn('relative overflow-hidden bg-black/40', SIZES[size].aspect)}>
        {/* Loading shimmer */}
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 bg-gradient-to-br from-bg-muted/30 via-bg-muted/10 to-bg-muted/30 animate-pulse" />
        )}

        {/* Actual image */}
        {!imgError ? (
          <img
            src={getImageUrl(serverId, item.Id)}
            alt={item.Name}
            className={cn(
              'h-full w-full object-cover transition-all duration-500',
              'group-hover:scale-110',
              imgLoaded ? 'opacity-100' : 'opacity-0',
            )}
            loading="lazy"
            crossOrigin="anonymous"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-bg-muted/50">
            <Icon className="h-10 w-10 text-fg-muted/30" />
          </div>
        )}

        {/* Top badges */}
        <div className="absolute left-2 top-2 flex gap-1 max-w-[calc(100%-16px)] flex-wrap">
          {watched && (
            <span className="rounded bg-green-500/80 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
              Gesehen
            </span>
          )}
          {showRating && item.CommunityRating && (
            <span className="flex items-center gap-0.5 rounded bg-yellow-500/80 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
              <Star className="h-2.5 w-2.5 fill-current" />
              {item.CommunityRating.toFixed(1)}
            </span>
          )}
          {item.Type === 'Episode' && item.IndexNumber && (
            <span className="rounded bg-brand-500/80 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
              S{item.ParentIndexNumber ?? '?'} E{item.IndexNumber}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {progressPercent !== undefined && progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
            <div
              className="h-full bg-brand-500 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Hover overlay — Play button */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-200 group-hover:bg-black/40">
          <div className="scale-0 rounded-full bg-white/20 p-3 backdrop-blur-sm transition-transform duration-200 group-hover:scale-100">
            <Play className="h-6 w-6 text-white fill-white" />
          </div>
        </div>

        {/* Hover info panel — overview on extended hover */}
        {isHovered && item.Overview && (
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 mb-1">
              {item.CommunityRating && (
                <span className="flex items-center gap-0.5 text-[11px] text-yellow-400">
                  <Star className="h-3 w-3 fill-current" />
                  {item.CommunityRating.toFixed(1)}
                </span>
              )}
              {formatYear(item) && (
                <span className="text-[11px] text-white/70">{formatYear(item)}</span>
              )}
              {item.RunTimeTicks && (
                <span className="text-[11px] text-white/70">{formatRuntime(item.RunTimeTicks)}</span>
              )}
            </div>
            <p className="text-[11px] text-white/80 leading-relaxed line-clamp-3">
              {item.Overview}
            </p>
          </div>
        )}
      </div>

      {/* Info footer — consistent height */}
      <div className="flex flex-col gap-0.5 px-2.5 py-2 min-h-[44px] justify-center">
        <p className="text-sm font-medium leading-tight truncate" title={item.Name}>
          {item.Name}
        </p>
        <div className="flex items-center gap-2 text-[11px] text-fg-muted">
          {showYear && formatYear(item) && (
            <span>{formatYear(item)}</span>
          )}
          {item.Type === 'Series' && (
            <span className="rounded bg-purple-500/10 px-1 py-0.5 text-[10px] text-purple-400 font-medium">Serie</span>
          )}
          {item.Type === 'Movie' && (
            <span className="rounded bg-blue-500/10 px-1 py-0.5 text-[10px] text-blue-400 font-medium">Film</span>
          )}
          {showRuntime && item.RunTimeTicks && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {formatRuntime(item.RunTimeTicks)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  MediaGrid — responsive grid for cards                             */
/* ------------------------------------------------------------------ */

interface MediaGridProps {
  items: JellyfinMediaItem[];
  serverId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  emptyMessage?: string;
  loading?: boolean;
  hrefFn?: (item: JellyfinMediaItem) => string | undefined;
}

export function MediaGrid({
  items, serverId, size = 'md', className, emptyMessage,
  loading, hrefFn,
}: MediaGridProps) {
  if (loading) {
    return (
      <div className={cn('grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6', className)}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-bg-surface overflow-hidden animate-pulse">
            <div className="aspect-[2/3] bg-bg-muted" />
            <div className="p-2.5 space-y-1.5">
              <div className="h-3 w-3/4 rounded bg-bg-muted" />
              <div className="h-2.5 w-1/2 rounded bg-bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border p-12 text-center">
        <p className="text-fg-muted">{emptyMessage ?? 'Keine Medien gefunden'}</p>
      </div>
    );
  }

  return (
    <div className={cn('grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5', className)}>
      {items.map((item) => (
        <MediaCard
          key={item.Id}
          item={item}
          serverId={serverId}
          size={size}
          href={hrefFn ? hrefFn(item) : undefined}
        />
      ))}
    </div>
  );
}
