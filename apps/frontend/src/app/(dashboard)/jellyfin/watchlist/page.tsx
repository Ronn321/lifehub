'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { MediaGrid } from '@/components/jellyfin/media/MediaCard';
import { ArrowLeft, Bookmark, Loader2 } from 'lucide-react';
import { JellyfinPageWrapper } from '@/components/jellyfin/media/JellyfinPageWrapper';
import { fetchWatchlist } from '@/lib/jellyfin-media-api';

export default function WatchlistPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [hydrated, setHydrated] = useState(false);

  const serverId = 'default';

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (hydrated && !accessToken) router.push('/login');
  }, [hydrated, accessToken, router]);

  const { data: watchlist, isLoading } = useQuery<any[]>({
    queryKey: ['jellyfin-watchlist', serverId],
    queryFn: () => fetchWatchlist(serverId),
    enabled: hydrated && !!accessToken,
    staleTime: 60_000,
  });

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
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-fg-muted hover:text-fg transition-colors"
            aria-label="Zurück"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-brand-400" />
            <h1 className="text-xl font-bold tracking-tight">Watchlist</h1>
            {watchlist && (
              <span className="text-sm text-fg-muted">({watchlist.length})</span>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-fg-muted" />
          </div>
        )}

        {!isLoading && watchlist && watchlist.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-border p-16 text-center">
            <Bookmark className="h-12 w-12 mx-auto mb-3 text-fg-muted opacity-30" />
            <p className="text-lg font-medium">Watchlist ist leer</p>
            <p className="text-sm text-fg-muted mt-1">
              Alle ungesehenen Filme und Serien erscheinen hier.
            </p>
          </div>
        )}

        {!isLoading && watchlist && watchlist.length > 0 && (
          <MediaGrid
            items={watchlist.map((w: any) => ({
              Id: w.Id, Name: w.Name, Type: w.Type,
              ProductionYear: w.ProductionYear, Genres: w.Genres,
            }))}
            serverId={serverId}
          />
        )}
      </div>
    </JellyfinPageWrapper>
  );
}
