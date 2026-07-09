'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import {
  fetchItemDetail, fetchChildren, type JellyfinMediaItem,
} from '@/lib/jellyfin-media-api';
import { MediaGrid } from '@/components/jellyfin/media/MediaCard';
import { ArrowLeft, Layers, Loader2 } from 'lucide-react';

export default function CollectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [hydrated, setHydrated] = useState(false);

  const externalId = params?.id as string;
  const serverId = 'default';

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (hydrated && !accessToken) router.push('/login');
  }, [hydrated, accessToken, router]);

  /* -------- Collection Detail -------- */
  const { data: collection, isLoading: detailLoading } = useQuery<JellyfinMediaItem>({
    queryKey: ['jellyfin-collection-detail', externalId],
    queryFn: () => fetchItemDetail(serverId, externalId),
    enabled: hydrated && !!accessToken && !!externalId,
    staleTime: 300_000,
  });

  /* -------- Collection Items (children) -------- */
  const { data: items, isLoading: itemsLoading } = useQuery<JellyfinMediaItem[]>({
    queryKey: ['jellyfin-collection-items', externalId],
    queryFn: () => fetchChildren(serverId, externalId),
    enabled: hydrated && !!accessToken && !!externalId,
    staleTime: 300_000,
  });

  const isLoading = detailLoading || itemsLoading;

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
          onClick={() => router.push('/jellyfin/collections')}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-fg-muted hover:text-fg transition-colors"
          aria-label="Zurück"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-amber-400" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {collection?.Name ?? 'Sammlung'}
            </h1>
            {items && (
              <p className="text-sm text-fg-muted">{items.length} Elemente</p>
            )}
          </div>
        </div>
      </div>

      {/* Overview */}
      {collection?.Overview && (
        <p className="text-sm text-fg-muted max-w-3xl">{collection.Overview}</p>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-fg-muted" />
        </div>
      )}

      {/* Items grid */}
      {!isLoading && items && items.length > 0 && (
        <MediaGrid
          items={items.map(i => ({
            Id: i.Id,
            Name: i.Name,
            Type: i.Type,
            ProductionYear: i.ProductionYear,
            Genres: i.Genres,
          }))}
          serverId={serverId}
        />
      )}

      {/* Empty */}
      {!isLoading && items && items.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-border p-16 text-center">
          <Layers className="h-12 w-12 mx-auto mb-3 text-fg-muted opacity-30" />
          <p className="text-lg font-medium">Sammlung ist leer</p>
          <p className="text-sm text-fg-muted mt-1">
            Diese Sammlung enthält noch keine Elemente.
          </p>
        </div>
      )}
    </div>
  );
}
