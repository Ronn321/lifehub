'use client';

import React, { useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/cn';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { JellyfinMediaItem } from '@/lib/jellyfin-media-api';
import { MediaCard } from './MediaCard';

/* ------------------------------------------------------------------ */
/*  ContentRow — Netflix-style horizontal scrolling row               */
/* ------------------------------------------------------------------ */

interface ContentRowProps {
  title: string;
  items: JellyfinMediaItem[];
  serverId: string;
  loading?: boolean;
  className?: string;
  onItemClick?: (item: JellyfinMediaItem) => void;
}

export function ContentRow({ title, items, serverId, loading, className }: ContentRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  function scroll(direction: 'left' | 'right') {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
    setTimeout(updateScrollButtons, 400);
  }

  if (loading) {
    return (
      <div className={cn('space-y-3', className)}>
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="min-w-[160px] w-[160px] shrink-0 rounded-xl border border-border bg-bg-surface overflow-hidden animate-pulse">
              <div className="aspect-[2/3] bg-bg-muted" />
              <div className="p-2 space-y-1.5">
                <div className="h-3 w-3/4 rounded bg-bg-muted" />
                <div className="h-2.5 w-1/2 rounded bg-bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) return null;

  return (
    <div className={cn('group/content-row relative', className)}>
      {/* Title */}
      <h2 className="text-lg font-bold tracking-tight mb-3">{title}</h2>

      {/* Scroll container */}
      <div className="relative">
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute -left-3 top-0 bottom-0 z-10 flex items-center justify-center w-10 opacity-0 group-hover/content-row:opacity-100 transition-opacity"
            aria-label="Nach links scrollen"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </div>
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={updateScrollButtons}
          className="flex gap-4 overflow-x-auto overflow-y-hidden scrollbar-hide scroll-smooth pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item) => (
            <div key={item.Id} className="min-w-[160px] w-[160px] shrink-0 snap-start">
              <div className="h-full w-full">
                <MediaCard
                  item={item}
                  serverId={serverId}
                  size="sm"
                  showYear
                />
              </div>
            </div>
          ))}
        </div>

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute -right-3 top-0 bottom-0 z-10 flex items-center justify-center w-10 opacity-0 group-hover/content-row:opacity-100 transition-opacity"
            aria-label="Nach rechts scrollen"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-colors">
              <ChevronRight className="h-5 w-5" />
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
