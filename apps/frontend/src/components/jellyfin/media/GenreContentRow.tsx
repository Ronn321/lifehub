'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/cn';
import { Loader2 } from 'lucide-react';
import type { JellyfinMediaItem } from '@/lib/jellyfin-media-api';
import { fetchMediaByGenre } from '@/lib/jellyfin-media-api';
import { ContentRow } from './ContentRow';

/* ------------------------------------------------------------------ */
/*  GenreContentRow — Lazy-loaded ContentRow for a specific genre      */
/* ------------------------------------------------------------------ */

interface GenreContentRowProps {
  genre: string;
  serverId: string;
}

export function GenreContentRow({ genre, serverId }: GenreContentRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  // IntersectionObserver — load data only when row scrolls into view
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }, // Pre-load 200px before entering viewport
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Fetch genre items only when in view
  const { data: items, isLoading } = useQuery<JellyfinMediaItem[]>({
    queryKey: ['jellyfin-genre-media', serverId, genre],
    queryFn: () => fetchMediaByGenre(serverId, genre, 20),
    enabled: isInView,
    staleTime: 300_000, // 5 min cache
  });

  // Don't render anything if we haven't loaded yet and have no items
  if (!isInView) {
    return <div ref={containerRef} className="h-[260px]" />;
  }

  // Loading state
  if (isLoading) {
    return (
      <div ref={containerRef} className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight">{genre}</h2>
        <div className="flex items-center gap-2 text-sm text-fg-muted py-8">
          <Loader2 className="h-4 w-4 animate-spin" />
          Lade {genre} …
        </div>
      </div>
    );
  }

  // Hide empty rows
  if (!items || items.length === 0) return null;

  return (
    <div ref={containerRef}>
      <ContentRow
        title={genre}
        items={items}
        serverId={serverId}
      />
    </div>
  );
}
