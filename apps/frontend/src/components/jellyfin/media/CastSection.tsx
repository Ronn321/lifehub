'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchItemPeople, type JellyfinPerson } from '@/lib/jellyfin-media-api';
import { cn } from '@/lib/cn';
import { User, Loader2 } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  CastSection                                                        */
/* ------------------------------------------------------------------ */

interface CastSectionProps {
  serverId: string;
  externalId: string;
  className?: string;
}

export function CastSection({ serverId, externalId, className }: CastSectionProps) {
  const { data: people, isLoading } = useQuery<JellyfinPerson[]>({
    queryKey: ['jellyfin-people', serverId, externalId],
    queryFn: () => fetchItemPeople(serverId, externalId),
    staleTime: 300_000,
  });

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-fg-muted', className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Cast wird geladen …
      </div>
    );
  }

  if (!people || people.length === 0) return null;

  // Group by role
  const actors = people.filter(p => p.Type === 'Actor').slice(0, 15);
  const directors = people.filter(p => p.Type === 'Director');
  const writers = people.filter(p => p.Type === 'Writer');

  if (actors.length === 0 && directors.length === 0) return null;

  return (
    <section className={cn('space-y-4', className)}>
      <h2 className="text-lg font-bold tracking-tight">Besetzung</h2>

      {/* Directors/Writers */}
      {(directors.length > 0 || writers.length > 0) && (
        <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
          {directors.length > 0 && (
            <p><span className="text-fg-muted">Regie: </span>
              {directors.map(d => d.Name).join(', ')}
            </p>
          )}
          {writers.length > 0 && (
            <p><span className="text-fg-muted">Drehbuch: </span>
              {writers.map(d => d.Name).join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Actor cards */}
      {actors.length > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {actors.map((person) => (
            <div
              key={person.Id}
              className="flex w-[110px] shrink-0 flex-col items-center gap-1.5 rounded-xl border border-border bg-bg-surface p-3 text-center transition-colors hover:border-brand-500/30"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bg-muted overflow-hidden">
                <User className="h-6 w-6 text-fg-muted/40" />
              </div>
              <p className="text-xs font-medium leading-tight truncate w-full">{person.Name}</p>
              {person.Role && (
                <p className="text-[10px] text-fg-muted truncate w-full">{person.Role}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
