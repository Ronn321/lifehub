'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { ArrowLeft, Layers, Loader2, Film, Monitor } from 'lucide-react';
import { cn } from '@/lib/cn';
import { MediaGrid } from '@/components/jellyfin/media/MediaCard';

interface JellyfinLibrary {
  id: string;
  name: string;
  type: string | null;
}

interface JellyfinItem {
  id: string;
  externalId: string | null;
  name: string;
  type: string;
}

export default function CollectionsPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [hydrated, setHydrated] = useState(false);

  const serverId = 'default';

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (hydrated && !accessToken) router.push('/login');
  }, [hydrated, accessToken, router]);

  /* -------- All items of type BoxSet or collections -------- */
  const { data: libraries } = useQuery<JellyfinLibrary[]>({
    queryKey: ['jellyfin-libraries'],
    queryFn: () => api.get<JellyfinLibrary[]>('/jellyfin/libraries'),
    enabled: hydrated && !!accessToken,
    staleTime: 60_000,
  });

  // BoxSets are returned as items with type 'boxset' — query by library type
  const { data: items, isLoading } = useQuery<JellyfinItem[]>({
    queryKey: ['jellyfin-collections'],
    queryFn: () => api.get<JellyfinItem[]>('/jellyfin/items?libraryType=boxset'),
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
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-amber-400" />
          <h1 className="text-xl font-bold tracking-tight">Sammlungen</h1>
        </div>
      </div>

      {items && items.length === 0 && !isLoading && (
        <div className="rounded-xl border-2 border-dashed border-border p-16 text-center">
          <Layers className="h-12 w-12 mx-auto mb-3 text-fg-muted opacity-30" />
          <p className="text-lg font-medium">Keine Sammlungen gefunden</p>
          <p className="text-sm text-fg-muted mt-1">
            Erstelle Sammlungen in Jellyfin, um sie hier anzuzeigen.
          </p>
        </div>
      )}

      <MediaGrid
        items={(items ?? []).map(i => ({ Id: i.externalId ?? i.id, Name: i.name, Type: 'Movie' as const }))}
        serverId={serverId}
        loading={isLoading}
        emptyMessage="Keine Sammlungen vorhanden."
        hrefFn={(item) => `/jellyfin/collections/${item.Id}`}
      />
    </div>
  );
}
