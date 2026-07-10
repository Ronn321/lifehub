'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Play, ChevronLeft, ChevronRight, Music as MusicIcon, Loader2 } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  MusicImage — image with fallback                                   */
/* ------------------------------------------------------------------ */

export function MusicImage({
  src,
  alt,
  className,
  fallback,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div
        className={
          'flex items-center justify-center bg-[var(--music-bg-card)] ' + (className ?? '')
        }
      >
        {fallback ?? <MusicIcon className="h-8 w-8 text-[var(--music-text-disabled)] opacity-40" />}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setErrored(true)}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Card — album, artist, playlist cards                               */
/* ------------------------------------------------------------------ */

export function MusicCard({
  title,
  subtitle,
  coverUrl,
  onClick,
  onPlay,
  rounded = false,
}: {
  title: string;
  subtitle?: string;
  coverUrl?: string;
  onClick?: () => void;
  onPlay?: () => void;
  rounded?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col gap-2 rounded-lg p-3 text-left transition-all duration-200 ease-out hover:scale-[1.02] hover:bg-[var(--music-bg-card)] w-full"
      data-testid="music-card"
    >
      <div className="relative aspect-square w-full overflow-hidden">
        <MusicImage
          src={coverUrl}
          alt={title}
          className={'h-full w-full object-cover ' + (rounded ? 'rounded-full' : 'rounded-md')}
        />
        {onPlay && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
            className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--music-accent)] opacity-0 shadow-lg transition-all hover:scale-105 hover:bg-[var(--music-accent-hover)] group-hover:opacity-100 group-hover:translate-y-0 translate-y-2"
            aria-label="Abspielen"
          >
            <Play className="h-4 w-4 fill-black text-black" />
          </button>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-[var(--music-text-primary)]">{title}</p>
        {subtitle && (
          <p className="truncate text-xs text-[var(--music-text-secondary)]">{subtitle}</p>
        )}
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  CardGrid — responsive grid of cards                                */
/* ------------------------------------------------------------------ */

export function MusicCardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ScrollRow — horizontal scrollable row with arrows                  */
/* ------------------------------------------------------------------ */

export function MusicScrollRow({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = useCallback((direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: direction === 'right' ? amount : -amount, behavior: 'smooth' });
  }, []);

  return (
    <div className="group/row relative">
      {/* Left arrow */}
      <button
        onClick={() => scroll('left')}
        className="absolute left-0 top-0 z-10 flex h-full w-10 items-center justify-center bg-gradient-to-r from-[var(--music-bg-base)] to-transparent opacity-0 transition-opacity group-hover/row:opacity-100"
        aria-label="Nach links scrollen"
      >
        <ChevronLeft className="h-6 w-6 text-white" />
      </button>

      <div
        ref={scrollRef}
        className="music-scroll flex gap-4 overflow-x-auto scroll-smooth"
        style={{ scrollbarWidth: 'none' }}
      >
        {children}
      </div>

      {/* Right arrow */}
      <button
        onClick={() => scroll('right')}
        className="absolute right-0 top-0 z-10 flex h-full w-10 items-center justify-center bg-gradient-to-l from-[var(--music-bg-base)] to-transparent opacity-0 transition-opacity group-hover/row:opacity-100"
        aria-label="Nach rechts scrollen"
      >
        <ChevronRight className="h-6 w-6 text-white" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section — titled section with optional "show all" link             */
/* ------------------------------------------------------------------ */

export function MusicSection({
  title,
  showAllHref,
  children,
}: {
  title: string;
  showAllHref?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[var(--music-text-primary)]">{title}</h2>
        {showAllHref && (
          <a
            href={showAllHref}
            className="text-xs font-bold uppercase tracking-wide text-[var(--music-text-secondary)] hover:underline"
          >
            Alle anzeigen
          </a>
        )}
      </div>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton — loading placeholder                                     */
/* ------------------------------------------------------------------ */

export function MusicSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-3">
          <div className="music-skeleton aspect-square w-full rounded-md" />
          <div className="music-skeleton mt-2 h-4 w-3/4 rounded" />
          <div className="music-skeleton mt-1 h-3 w-1/2 rounded" />
        </div>
      ))}
    </div>
  );
}

export function MusicLoader() {
  return (
    <div className="flex items-center justify-center py-20 text-[var(--music-text-secondary)]">
      <Loader2 className="mr-2 h-6 w-6 animate-spin" />
      <span>Wird geladen …</span>
    </div>
  );
}
