'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { ArrowLeft, Film, Monitor, Loader2, Search, X, Filter } from 'lucide-react';
import { cn } from '@/lib/cn';
import { MediaGrid } from '@/components/jellyfin/media/MediaCard';
import { ContentRow } from '@/components/jellyfin/media/ContentRow';
import {
  fetchContinueWatching, type ContinueWatchingItem,
} from '@/lib/jellyfin-media-api';

interface JellyfinLibrary {
  id: string;
  name: string;
  type: string | null;
}

interface RichItem {
  Id: string;
  Name: string;
  Type: string;
  ProductionYear?: number | null;
  Genres?: string[];
}

export default function BrowsePage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [hydrated, setHydrated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'movies' | 'series'>('all');
  const serverId = 'default';

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (hydrated && !accessToken) router.push('/login');
  }, [hydrated, accessToken, router]);

  /* -------- Libraries -------- */
  const { data: libraries } = useQuery<JellyfinLibrary[]>({
    queryKey: ['jellyfin-libraries'],
    queryFn: () => api.get<JellyfinLibrary[]>('/jellyfin/libraries'),
    enabled: hydrated && !!accessToken,
    staleTime: 60_000,
  });

  /* -------- Continue Watching -------- */
  const { data: continueWatching } = useQuery<ContinueWatchingItem[]>({
    queryKey: ['jellyfin-continue-watching'],
    queryFn: () => fetchContinueWatching(serverId, 12),
    enabled: hydrated && !!accessToken,
    staleTime: 30_000,
  });

  /* ----- Find movie & series libraries ----- */
  const movieLibrary = useMemo(() => {
    if (!libraries) return null;
    return libraries.find((lib) => lib.type === 'movies')
      ?? libraries.find((lib) => lib.name.toLowerCase().includes('film'))
      ?? null;
  }, [libraries]);

  const seriesLibrary = useMemo(() => {
    if (!libraries) return null;
    return libraries.find((lib) => lib.type === 'tvshows')
      ?? libraries.find((lib) => lib.name.toLowerCase().includes('serien'))
      ?? null;
  }, [libraries]);

  /* ----- Load movies ----- */
  const { data: movies, isLoading: moviesLoading } = useQuery<RichItem[]>({
    queryKey: ['jellyfin-browse-movies', movieLibrary?.id],
    queryFn: () => api.get<RichItem[]>(`/jellyfin/items?libraryId=${movieLibrary!.id}&refresh=true`),
    enabled: hydrated && !!accessToken && !!movieLibrary?.id,
    staleTime: 300_000,
  });

  /* ----- Load series ----- */
  const { data: series, isLoading: seriesLoading } = useQuery<RichItem[]>({
    queryKey: ['jellyfin-browse-series', seriesLibrary?.id],
    queryFn: () => api.get<RichItem[]>(`/jellyfin/items?libraryId=${seriesLibrary!.id}&refresh=true`),
    enabled: hydrated && !!accessToken && !!seriesLibrary?.id,
    staleTime: 300_000,
  });

  const isLoading = moviesLoading || seriesLoading;

  /* ----- Genres from both ----- */
  const { allGenres } = useMemo(() => {
    const genreSet = new Set<string>();
    for (const item of [...(movies ?? []), ...(series ?? [])]) {
      if (item.Genres) item.Genres.forEach(g => genreSet.add(g));
    }
    return { allGenres: Array.from(genreSet).sort() };
  }, [movies, series]);

  /* ----- Filtered items ----- */
  const filtered = useMemo(() => {
    const allItems = [...(movies ?? []), ...(series ?? [])];
    let result = allItems;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i => i.Name.toLowerCase().includes(q));
    }
    if (selectedGenre) {
      result = result.filter(i => i.Genres?.includes(selectedGenre));
    }
    if (activeTab === 'movies') {
      result = result.filter(i => i.Type === 'Movie');
    } else if (activeTab === 'series') {
      result = result.filter(i => i.Type === 'Series');
    }
    return result;
  }, [movies, series, searchQuery, selectedGenre, activeTab]);

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
          onClick={() => router.push('/jellyfin')}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-fg-muted hover:text-fg transition-colors"
          aria-label="Zurück"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Film className="h-5 w-5 text-blue-400" />
            <Monitor className="h-5 w-5 text-purple-400" />
            <h1 className="text-xl font-bold tracking-tight">Filme & Serien</h1>
            <span className="text-sm text-fg-muted">
              ({(movies?.length ?? 0) + (series?.length ?? 0)} Titel)
            </span>
          </div>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Suchen …"
            className="w-full rounded-lg border border-border bg-bg-surface py-2 pl-9 pr-8 text-sm placeholder:text-fg-muted/50 focus:outline-none focus:border-brand-500/50"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-fg-muted" />
            </button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border border-border bg-bg-surface p-0.5 w-fit">
        {(['all', 'movies', 'series'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              activeTab === tab
                ? 'bg-brand-500/15 text-brand-400'
                : 'text-fg-muted hover:text-fg',
            )}
          >
            {tab === 'all' && `Alle (${(movies?.length ?? 0) + (series?.length ?? 0)})`}
            {tab === 'movies' && `Filme (${movies?.length ?? 0})`}
            {tab === 'series' && `Serien (${series?.length ?? 0})`}
          </button>
        ))}
      </div>

      {/* Continue Watching */}
      {continueWatching && continueWatching.length > 0 && activeTab === 'all' && (
        <ContentRow
          title="Weiterschauen"
          items={continueWatching.map(cw => ({
            Id: cw.Id,
            Name: cw.SeriesName ? `${cw.SeriesName} – ${cw.Name}` : cw.Name,
            Type: (cw.Type === 'Episode' ? 'Episode' : 'Movie') as 'Movie' | 'Episode' | 'Series',
            SeriesName: cw.SeriesName,
            SeriesId: cw.SeriesId,
            RunTimeTicks: cw.RunTimeTicks,
            ProductionYear: cw.ProductionYear,
          }))}
          serverId={serverId}
        />
      )}

      {/* Filter bar */}
      {allGenres.length > 0 && (
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-fg-muted shrink-0" />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedGenre('')}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                !selectedGenre
                  ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                  : 'bg-bg-surface text-fg-muted border border-border hover:border-brand-500/30',
              )}
            >
              Alle
            </button>
            {allGenres.slice(0, 20).map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(selectedGenre === genre ? '' : genre)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  selectedGenre === genre
                    ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                    : 'bg-bg-surface text-fg-muted border border-border hover:border-brand-500/30',
                )}
              >
                {genre}
              </button>
            ))}
            {allGenres.length > 20 && (
              <span className="text-xs text-fg-muted self-center">+{allGenres.length - 20} mehr</span>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-fg-muted" />
        </div>
      ) : (
        <MediaGrid
          items={filtered.map(i => ({
            Id: i.Id,
            Name: i.Name,
            Type: i.Type as 'Movie' | 'Series',
            ProductionYear: i.ProductionYear,
            Genres: i.Genres,
          }))}
          serverId={serverId}
          emptyMessage={
            searchQuery || selectedGenre
              ? 'Keine Inhalte gefunden.'
              : 'Keine Filme oder Serien in der Bibliothek.'
          }
        />
      )}
    </div>
  );
}
