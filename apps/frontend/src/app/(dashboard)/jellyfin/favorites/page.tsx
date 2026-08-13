'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { MediaGrid } from '@/components/jellyfin/media/MediaCard';
import { ArrowLeft, Heart, Loader2 } from 'lucide-react';
import { JellyfinPageWrapper } from '@/components/jellyfin/media/JellyfinPageWrapper';
import { fetchFavoriteMedia } from '@/lib/jellyfin-media-api';

export default function FavoritesPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [hydrated, setHydrated] = useState(false);

  const serverId = 'default';

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (hydrated && !accessToken) router.push('/login');
  }, [hydrated, accessToken, router]);

  const { data: favorites, isLoading } = useQuery<any[]>({
    queryKey: ['jellyfin-favorites-media', serverId],
    queryFn: () => fetchFavoriteMedia(serverId),
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
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-fg-muted hover:text-fg transition-colors"
            aria-label="Zurück"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-400 fill-red-400/20" />
            <h1 className="text-xl font-bold tracking-tight">Favoriten</h1>
            {favorites && (
              <span className="text-sm text-fg-muted">({favorites.length})</span>
            )}
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-fg-muted" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && favorites && favorites.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-border p-16 text-center">
            <Heart className="h-12 w-12 mx-auto mb-3 text-fg-muted opacity-30" />
            <p className="text-lg font-medium">Keine Favoriten</p>
            <p className="text-sm text-fg-muted mt-1">
              Markiere Filme und Serien mit dem Herz-Symbol, um sie hier zu sehen.
            </p>
          </div>
        )}

        {/* Grid */}
        {!isLoading && favorites && favorites.length > 0 && (
          <MediaGrid
            items={favorites.map((f: any) => ({
              Id: f.Id,
              Name: f.Name,
              Type: f.Type,
              ProductionYear: f.ProductionYear,
              Genres: f.Genres,
            }))}
            serverId={serverId}
          />
        )}
      </div>
    </JellyfinPageWrapper>
  );
}
