'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSimilarItems, type JellyfinMediaItem } from '@/lib/jellyfin-media-api';
import { cn } from '@/lib/cn';
import { Loader2 } from 'lucide-react';
import { MediaCard } from './MediaCard';

/* ------------------------------------------------------------------ */
/*  SimilarSection                                                     */
/* ------------------------------------------------------------------ */

interface SimilarSectionProps {
  serverId: string;
  externalId: string;
  className?: string;
}

export function SimilarSection({ serverId, externalId, className }: SimilarSectionProps) {
  const { data: items, isLoading } = useQuery<JellyfinMediaItem[]>({
    queryKey: ['jellyfin-similar', serverId, externalId],
    queryFn: () => fetchSimilarItems(serverId, externalId),
    staleTime: 300_000,
  });

  if (isLoading) {
    return (
      <section className={cn('space-y-3', className)}>
        <h2 className="text-lg font-bold tracking-tight"> Ähnliche Inhalte</h2>
        <div className="flex items-center gap-2 text-sm text-fg-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Empfehlungen werden geladen …
        </div>
      </section>
    );
  }

  if (!items || items.length === 0) return null;

  return (
    <section className={cn('space-y-3', className)}>
      <h2 className="text-lg font-bold tracking-tight">Ähnliche Inhalte</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {items.slice(0, 12).map((item) => (
          <MediaCard key={item.Id} item={item} serverId={serverId} size="sm" />
        ))}
      </div>
    </section>
  );
}
