'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Film, Monitor, Loader2, Search, X, Filter, Heart } from 'lucide-react';
import { cn } from '@/lib/cn';
import { MediaGrid } from '@/components/jellyfin/media/MediaCard';
import { ContentRow } from '@/components/jellyfin/media/ContentRow';
import { HeroBanner } from '@/components/jellyfin/media/HeroBanner';
import { GenreContentRow } from '@/components/jellyfin/media/GenreContentRow';
import { JellyfinPageWrapper } from '@/components/jellyfin/media/JellyfinPageWrapper';
import {
  fetchContinueWatching, fetchLatestMedia, fetchMediaGenres,
  type ContinueWatchingItem,
} from '@/lib/jellyfin-media-api';

interface JellyfinLibrary { id: string; name: string; type: string | null }
interface RichItem { Id: string; Name: string; Type: string; ProductionYear?: number | null; Genres?: string[] }

export default function BrowsePage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [hydrated, setHydrated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'movies' | 'series'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'year' | 'rating'>('name');
  const [showGrid, setShowGrid] = useState(false);
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

  const movieLibrary = useMemo(() => libraries?.find(l => l.type === 'movies') ?? libraries?.find(l => l.name.toLowerCase().includes('film')) ?? null, [libraries]);
  const seriesLibrary = useMemo(() => libraries?.find(l => l.type === 'tvshows') ?? libraries?.find(l => l.name.toLowerCase().includes('serien')) ?? null, [libraries]);

  /* -------- Load all movies + series -------- */
  const { data: movies, isLoading: moviesLoading } = useQuery<RichItem[]>({
    queryKey: ['jellyfin-browse-movies', movieLibrary?.id],
    queryFn: () => api.get<RichItem[]>(`/jellyfin/items?libraryId=${movieLibrary!.id}&refresh=true`),
    enabled: hydrated && !!accessToken && !!movieLibrary?.id,
    staleTime: 300_000,
  });
  const { data: series, isLoading: seriesLoading } = useQuery<RichItem[]>({
    queryKey: ['jellyfin-browse-series', seriesLibrary?.id],
    queryFn: () => api.get<RichItem[]>(`/jellyfin/items?libraryId=${seriesLibrary!.id}&refresh=true`),
    enabled: hydrated && !!accessToken && !!seriesLibrary?.id,
    staleTime: 300_000,
  });

  /* -------- Netflix Home data -------- */
  const { data: continueWatching } = useQuery<ContinueWatchingItem[]>({
    queryKey: ['jellyfin-continue-watching'],
    queryFn: () => fetchContinueWatching(serverId, 12),
    enabled: hydrated && !!accessToken,
    staleTime: 30_000,
  });
  const { data: latestMedia } = useQuery<any[]>({
    queryKey: ['jellyfin-latest-media', serverId],
    queryFn: () => fetchLatestMedia(serverId, 18),
    enabled: hydrated && !!accessToken,
    staleTime: 300_000,
  });
  const { data: genres } = useQuery<{ Name: string; Id: string }[]>({
    queryKey: ['jellyfin-media-genres', serverId],
    queryFn: () => fetchMediaGenres(serverId),
    enabled: hydrated && !!accessToken,
    staleTime: 600_000,
  });

  const isLoading = moviesLoading || seriesLoading;

  /* -------- Hero items: top 5 from latest -------- */
  const heroItems = useMemo(() => {
    if (latestMedia && latestMedia.length > 0) {
      return latestMedia.slice(0, 5).map((m: any) => ({
        Id: m.Id, Name: m.Name, Type: m.Type,
        Overview: m.Overview, ProductionYear: m.ProductionYear,
        RunTimeTicks: m.RunTimeTicks, CommunityRating: m.CommunityRating,
        OfficialRating: m.OfficialRating,
      } as any));
    }
    // Fallback: use first movies
    return (movies ?? []).slice(0, 5).map(m => ({ ...m, Type: 'Movie' }));
  }, [latestMedia, movies]);

  /* -------- Filtered items for grid view -------- */
  const allGenres = useMemo(() => {
    const s = new Set<string>();
    for (const item of [...(movies ?? []), ...(series ?? [])]) {
      if (item.Genres) item.Genres.forEach(g => s.add(g));
    }
    return Array.from(s).sort();
  }, [movies, series]);

  const filtered = useMemo(() => {
    let result = [...(movies ?? []).map(m => ({ ...m, Type: 'Movie' })), ...(series ?? []).map(s => ({ ...s, Type: 'Series' }))];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i => i.Name.toLowerCase().includes(q));
    }
    if (selectedGenre) result = result.filter(i => i.Genres?.includes(selectedGenre));
    if (activeTab === 'movies') result = result.filter(i => i.Type === 'Movie');
    else if (activeTab === 'series') result = result.filter(i => i.Type === 'Series');
    // Sort
    if (sortBy === 'name') result.sort((a, b) => a.Name.localeCompare(b.Name));
    else if (sortBy === 'year') result.sort((a, b) => (b.ProductionYear ?? 0) - (a.ProductionYear ?? 0));
    else if (sortBy === 'rating') result.sort((a, b) => ((b as any).CommunityRating ?? 0) - ((a as any).CommunityRating ?? 0));
    return result;
  }, [movies, series, searchQuery, selectedGenre, activeTab, sortBy]);

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-20 text-fg-muted">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />Authentifizierung läuft …
      </div>
    );
  }

  return (
    <JellyfinPageWrapper>
      <div className="space-y-6 py-4">
        {/* Hero Banner */}
        {!showGrid && heroItems.length > 0 && (
          <HeroBanner items={heroItems} serverId={serverId} />
        )}

        {/* Quick nav */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-medium transition-colors',
              showGrid ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30' : 'bg-bg-surface text-fg-muted border border-border hover:border-brand-500/30',
            )}
          >
            {showGrid ? '← Zurück zur Übersicht' : 'Alle Titel ansehen'}
          </button>
          <button
            onClick={() => router.push('/jellyfin/favorites')}
            className="flex items-center gap-1.5 rounded-full bg-bg-surface border border-border px-3.5 py-1.5 text-xs font-medium text-fg-muted hover:text-fg hover:border-red-400/30 transition-colors"
          >
            <Heart className="h-3.5 w-3.5" />
            Favoriten
          </button>
          <button
            onClick={() => router.push('/jellyfin/series')}
            className="flex items-center gap-1.5 rounded-full bg-bg-surface border border-border px-3.5 py-1.5 text-xs font-medium text-fg-muted hover:text-fg hover:border-purple-400/30 transition-colors"
          >
            <Monitor className="h-3.5 w-3.5" />
            Nur Serien
          </button>
        </div>

        {/* ===== Netflix Home View (Content Rows) ===== */}
        {!showGrid && (
          <>
            {/* Continue Watching */}
            {continueWatching && continueWatching.length > 0 && (
              <ContentRow
                title="Weiterschauen"
                items={continueWatching.map(cw => ({
                  Id: cw.Id,
                  Name: cw.SeriesName ? `${cw.SeriesName} – ${cw.Name}` : cw.Name,
                  Type: (cw.Type === 'Episode' ? 'Episode' : 'Movie') as 'Movie' | 'Episode' | 'Series',
                  SeriesName: cw.SeriesName, SeriesId: cw.SeriesId,
                  RunTimeTicks: cw.RunTimeTicks, ProductionYear: cw.ProductionYear,
                }))}
                serverId={serverId}
              />
            )}

            {/* Recently Added */}
            {latestMedia && latestMedia.length > 0 && (
              <ContentRow
                title="Zuletzt hinzugefügt"
                items={latestMedia.map((m: any) => ({
                  Id: m.Id, Name: m.Name, Type: m.Type as 'Movie' | 'Series',
                  ProductionYear: m.ProductionYear, Genres: m.Genres,
                  Overview: m.Overview, RunTimeTicks: m.RunTimeTicks,
                }))}
                serverId={serverId}
              />
            )}

            {/* Genre Rows (top 6 genres, lazy-loaded) */}
            {genres && genres.slice(0, 6).map(g => (
              <GenreContentRow key={g.Id} genre={g.Name} serverId={serverId} />
            ))}
          </>
        )}

        {/* ===== Grid View (Alle Titel) ===== */}
        {showGrid && (
          <>
            {/* Search */}
            <div className="flex items-center gap-4">
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
                  type="text" value={searchQuery}
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

            {/* Tab bar + Sort */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex gap-1 rounded-lg border border-border bg-bg-surface p-0.5 w-fit">
                {(['all', 'movies', 'series'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={cn('rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
                      activeTab === tab ? 'bg-brand-500/15 text-brand-400' : 'text-fg-muted hover:text-fg')}>
                    {tab === 'all' && `Alle (${(movies?.length ?? 0) + (series?.length ?? 0)})`}
                    {tab === 'movies' && `Filme (${movies?.length ?? 0})`}
                    {tab === 'series' && `Serien (${series?.length ?? 0})`}
                  </button>
                ))}
              </div>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'year' | 'rating')}
                className="rounded-lg border border-border bg-bg-surface px-3 py-1.5 text-sm text-fg-muted hover:text-fg focus:outline-none focus:border-brand-500/50"
              >
                <option value="name">Sortieren: Name (A-Z)</option>
                <option value="year">Sortieren: Jahr (neu zuerst)</option>
                <option value="rating">Sortieren: Bewertung (hoch zuerst)</option>
              </select>
            </div>

            {/* Genre filter */}
            {allGenres.length > 0 && (
              <div className="flex items-center gap-3">
                <Filter className="h-4 w-4 text-fg-muted shrink-0" />
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setSelectedGenre('')}
                    className={cn('rounded-full px-3 py-1 text-xs font-medium transition-colors',
                      !selectedGenre ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30' : 'bg-bg-surface text-fg-muted border border-border hover:border-brand-500/30')}>
                    Alle
                  </button>
                  {allGenres.slice(0, 20).map(genre => (
                    <button key={genre} onClick={() => setSelectedGenre(selectedGenre === genre ? '' : genre)}
                      className={cn('rounded-full px-3 py-1 text-xs font-medium transition-colors',
                        selectedGenre === genre ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30' : 'bg-bg-surface text-fg-muted border border-border hover:border-brand-500/30')}>
                      {genre}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Grid */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-fg-muted" />
              </div>
            ) : (
              <MediaGrid
                items={filtered.map(i => ({ Id: i.Id, Name: i.Name, Type: i.Type as 'Movie' | 'Series', ProductionYear: i.ProductionYear, Genres: i.Genres }))}
                serverId={serverId}
                emptyMessage={searchQuery || selectedGenre ? 'Keine Inhalte gefunden.' : 'Keine Filme oder Serien.'}
              />
            )}
          </>
        )}
      </div>
    </JellyfinPageWrapper>
  );
}
