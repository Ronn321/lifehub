'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { MediaGrid } from '@/components/jellyfin/media/MediaCard';
import { ArrowLeft, Film, Loader2, Search, X, Filter, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

interface JellyfinLibrary {
  id: string;
  name: string;
  type: string | null;
}

// Rich item from Jellyfin with genres and year
interface RichItem {
  Id: string;
  Name: string;
  Type: string;
  ProductionYear?: number | null;
  Genres?: string[];
}

export default function MoviesPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [hydrated, setHydrated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (hydrated && !accessToken) router.push('/login');
  }, [hydrated, accessToken, router]);

  const serverId = 'default';

  const { data: libraries } = useQuery<JellyfinLibrary[]>({
    queryKey: ['jellyfin-libraries'],
    queryFn: () => api.get<JellyfinLibrary[]>('/jellyfin/libraries'),
    enabled: hydrated && !!accessToken,
    staleTime: 60_000,
  });

  const movieLibrary = useMemo(() => {
    if (!libraries) return null;
    return libraries.find((lib) => lib.type === 'movies')
      ?? libraries.find((lib) => lib.name.toLowerCase().includes('film'))
      ?? null;
  }, [libraries]);

  const { data: items, isLoading, error } = useQuery<RichItem[]>({
    queryKey: ['jellyfin-items-refresh', movieLibrary?.id],
    queryFn: () => api.get<RichItem[]>(`/jellyfin/items?libraryId=${movieLibrary!.id}&refresh=true`),
    enabled: !!movieLibrary?.id && !!accessToken,
    staleTime: 300_000,
  });

  // Extract unique genres and years from items
  const { genres, years } = useMemo(() => {
    if (!items) return { genres: [] as string[], years: [] as number[] };
    const genreSet = new Set<string>();
    const yearSet = new Set<number>();
    for (const item of items) {
      if (item.Genres) item.Genres.forEach(g => genreSet.add(g));
      if (item.ProductionYear) yearSet.add(item.ProductionYear);
    }
    return {
      genres: Array.from(genreSet).sort(),
      years: Array.from(yearSet).sort((a, b) => b - a),
    };
  }, [items]);

  const filtered = useMemo(() => {
    if (!items) return [];
    let result = items;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i => i.Name.toLowerCase().includes(q));
    }
    if (selectedGenre) {
      result = result.filter(i => i.Genres?.includes(selectedGenre));
    }
    return result;
  }, [items, searchQuery, selectedGenre]);

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
            <h1 className="text-xl font-bold tracking-tight">Filme</h1>
            {items && (
              <span className="text-sm text-fg-muted">({items.length})</span>
            )}
          </div>
          <p className="text-sm text-fg-muted">{movieLibrary?.name ?? 'Filmbibliothek'}</p>
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filme suchen …"
            className="w-full rounded-lg border border-border bg-bg-surface py-2 pl-9 pr-8 text-sm placeholder:text-fg-muted/50 focus:outline-none focus:border-brand-500/50"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-fg-muted" />
            </button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      {genres.length > 0 && (
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
            {genres.slice(0, 15).map((genre) => (
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
            {genres.length > 15 && (
              <span className="text-xs text-fg-muted self-center">+{genres.length - 15} mehr</span>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="rounded-xl border border-danger/20 bg-danger/5 p-8 text-center">
          <p className="text-danger font-medium">Fehler beim Laden der Filme</p>
          <p className="text-sm text-fg-muted mt-1">Bitte versuche es später erneut.</p>
        </div>
      )}

      {/* No library */}
      {!isLoading && !error && !movieLibrary && (
        <div className="rounded-xl border-2 border-dashed border-border p-16 text-center">
          <Film className="h-12 w-12 mx-auto mb-3 text-fg-muted opacity-30" />
          <p className="text-lg font-medium">Keine Filmbibliothek gefunden</p>
          <p className="text-sm text-fg-muted mt-1">
            Synchronisiere deinen Jellyfin-Server, um eine Filmbibliothek zu verbinden.
          </p>
        </div>
      )}

      {/* Content */}
      {movieLibrary && (
        <>
          {searchQuery && (
            <p className="text-sm text-fg-muted">
              Suchergebnisse für &bdquo;{searchQuery}&rdquo;: {filtered.length} Treffer
            </p>
          )}
          <MediaGrid
            items={filtered.map(i => ({ Id: i.Id, Name: i.Name, Type: 'Movie' as const, ProductionYear: i.ProductionYear, Genres: i.Genres }))}
            serverId={serverId}
            loading={isLoading}
            emptyMessage={searchQuery || selectedGenre ? 'Keine Filme gefunden.' : 'Noch keine Filme in der Bibliothek.'}
          />
        </>
      )}
    </div>
  );
}
