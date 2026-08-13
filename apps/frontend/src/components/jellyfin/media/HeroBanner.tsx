'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { Play, Info } from 'lucide-react';
import type { JellyfinMediaItem } from '@/lib/jellyfin-media-api';
import { getBackdropUrl, formatYear, formatRuntime } from '@/lib/jellyfin-media-api';

/* ------------------------------------------------------------------ */
/*  HeroBanner — Netflix-style cinematic hero with rotating items      */
/* ------------------------------------------------------------------ */

interface HeroBannerProps {
  items: JellyfinMediaItem[];
  serverId: string;
  className?: string;
}

export function HeroBanner({ items, serverId, className }: HeroBannerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [backdropError, setBackdropError] = useState(false);

  // Auto-rotate every 8 seconds if multiple items
  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % Math.min(items.length, 5));
      setBackdropError(false);
    }, 8000);
    return () => clearInterval(timer);
  }, [items.length]);

  if (!items || items.length === 0) return null;

  const item = items[currentIndex] ?? items[0]!;
  const isMovie = item.Type === 'Movie';

  function handlePlay() {
    if (isMovie) {
      router.push(`/jellyfin/watch/${item.Id}`);
    } else {
      router.push(`/jellyfin/series/${item.Id}`);
    }
  }

  function handleDetails() {
    if (isMovie) {
      router.push(`/jellyfin/movies/${item.Id}`);
    } else {
      router.push(`/jellyfin/series/${item.Id}`);
    }
  }

  return (
    <div className={cn('relative w-full overflow-hidden rounded-2xl', className)}>
      {/* Backdrop */}
      <div className="relative aspect-[21/9] min-h-[320px] max-h-[55vh] w-full">
        {!backdropError ? (
          <img
            src={getBackdropUrl(serverId, item.Id)}
            alt={item.Name}
            className="h-full w-full object-cover"
            onError={() => setBackdropError(true)}
            crossOrigin="anonymous"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-brand-900/40 to-bg-surface" />
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-surface via-bg-surface/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg-surface/80 via-transparent to-transparent" />
      </div>

      {/* Content overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-10">
        <div className="max-w-2xl space-y-3">
          {/* Title */}
          <h2 className="text-3xl lg:text-5xl font-black tracking-tight text-white drop-shadow-2xl">
            {item.Name}
          </h2>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2 text-sm text-white/80">
            {item.ProductionYear && <span>{item.ProductionYear}</span>}
            {item.RunTimeTicks && (
              <span>{formatRuntime(item.RunTimeTicks)}</span>
            )}
            {item.CommunityRating && (
              <span className="flex items-center gap-1">
                <span className="text-yellow-400">★</span>
                {item.CommunityRating.toFixed(1)}
              </span>
            )}
            {item.OfficialRating && (
              <span className="rounded border border-white/30 px-1.5 py-0.5 text-xs font-semibold">
                {item.OfficialRating}
              </span>
            )}
          </div>

          {/* Overview */}
          {item.Overview && (
            <p className="text-sm lg:text-base text-white/70 leading-relaxed line-clamp-3 max-w-xl">
              {item.Overview}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handlePlay}
              className="flex items-center gap-2 rounded-lg bg-white px-6 py-2.5 text-sm font-bold text-black transition-all hover:bg-white/90 hover:scale-105"
            >
              <Play className="h-4 w-4 fill-black" />
              Abspielen
            </button>
            <button
              onClick={handleDetails}
              className="flex items-center gap-2 rounded-lg bg-white/15 px-6 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/25 hover:scale-105"
            >
              <Info className="h-4 w-4" />
              Details
            </button>
          </div>
        </div>
      </div>

      {/* Rotation indicators */}
      {items.length > 1 && (
        <div className="absolute bottom-4 right-6 flex gap-1.5">
          {items.slice(0, 5).map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrentIndex(i); setBackdropError(false); }}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === currentIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/60',
              )}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
