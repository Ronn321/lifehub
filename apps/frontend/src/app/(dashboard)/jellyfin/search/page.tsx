'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import {
  searchMedia, type SearchResults, type JellyfinMediaItem,
} from '@/lib/jellyfin-media-api';
import { MediaCard } from '@/components/jellyfin/media/MediaCard';
import { ArrowLeft, Search as SearchIcon, Loader2, X, Film, Monitor, Tv } from 'lucide-react';
import { cn } from '@/lib/cn';

export default function SearchPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const serverId = 'default';

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (hydrated && !accessToken) router.push('/login');
  }, [hydrated, accessToken, router]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results, isLoading } = useQuery<SearchResults>({
    queryKey: ['jellyfin-search', debouncedQuery],
    queryFn: () => searchMedia(serverId, debouncedQuery),
    enabled: hydrated && !!accessToken && debouncedQuery.length >= 2,
    staleTime: 30_000,
  });

  const totalResults = useMemo(() => {
    if (!results) return 0;
    return results.Movies.length + results.Series.length + results.Episodes.length + results.Collections.length;
  }, [results]);

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-20 text-fg-muted">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />Authentifizierung läuft …
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 py-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-fg-muted hover:text-fg transition-colors"
          aria-label="Zurück"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-xl font-bold tracking-tight">Suche</h1>
      </div>

      {/* Search input */}
      <div className="relative max-w-2xl">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-fg-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filme, Serien, Schauspieler …"
          autoFocus
          className="w-full rounded-xl border border-border bg-bg-surface py-3.5 pl-12 pr-10 text-base placeholder:text-fg-muted/40 focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/20 transition-all"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-fg-muted hover:text-fg" />
          </button>
        )}
      </div>

      {/* Results */}
      {debouncedQuery.length >= 2 && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-fg-muted" />
            </div>
          ) : totalResults === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border p-12 text-center">
              <SearchIcon className="h-12 w-12 mx-auto mb-3 text-fg-muted opacity-30" />
              <p className="text-lg font-medium">Keine Ergebnisse</p>
              <p className="text-sm text-fg-muted mt-1">
                Für &bdquo;{debouncedQuery}&rdquo; wurden keine Inhalte gefunden.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Movies */}
              {results!.Movies.length > 0 && (
                <Section title="Filme" icon={<Film className="h-4 w-4 text-blue-400" />}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {results!.Movies.map(m => (
                      <MediaCard key={m.Id} item={m} serverId={serverId} size="sm" />
                    ))}
                  </div>
                </Section>
              )}

              {/* Series */}
              {results!.Series.length > 0 && (
                <Section title="Serien" icon={<Monitor className="h-4 w-4 text-purple-400" />}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {results!.Series.map(s => (
                      <MediaCard key={s.Id} item={s} serverId={serverId} size="sm" />
                    ))}
                  </div>
                </Section>
              )}

              {/* Episodes */}
              {results!.Episodes.length > 0 && (
                <Section title="Episoden" icon={<Tv className="h-4 w-4 text-green-400" />}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {results!.Episodes.map(e => (
                      <MediaCard key={e.Id} item={e} serverId={serverId} size="sm" />
                    ))}
                  </div>
                </Section>
              )}

              {/* Collections */}
              {results!.Collections.length > 0 && (
                <Section title="Sammlungen" icon={<Film className="h-4 w-4 text-amber-400" />}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {results!.Collections.map(c => (
                      <MediaCard key={c.Id} item={c} serverId={serverId} size="sm" />
                    ))}
                  </div>
                </Section>
              )}
            </div>
          )}
        </>
      )}

      {debouncedQuery.length < 2 && (
        <div className="flex items-center justify-center py-12 text-fg-muted">
          <p className="text-sm">Gib mindestens 2 Zeichen ein, um zu suchen.</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section wrapper                                                   */
/* ------------------------------------------------------------------ */

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}
