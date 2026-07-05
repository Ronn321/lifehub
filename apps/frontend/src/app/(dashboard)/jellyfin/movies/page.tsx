'use client';
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Film, Loader2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/cn';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface JellyfinLibrary {
  id: string;
  serverId: string;
  externalId: string | null;
  name: string;
  type: string | null;
  ownerId: string;
  createdAt: string;
}

interface JellyfinItem {
  id: string;
  libraryId: string;
  externalId: string | null;
  name: string;
  type: string;
  path: string | null;
  watched: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function MoviesPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  /* -------- Libraries -------- */

  const { data: libraries, isLoading: libsLoading } = useQuery<JellyfinLibrary[]>({
    queryKey: ['jellyfin-libraries'],
    queryFn: () => api.get<JellyfinLibrary[]>('/jellyfin/libraries'),
    enabled: !!accessToken,
    staleTime: 60_000,
  });

  const movieLibrary = useMemo(() => {
    if (!libraries) return null;
    return (
      libraries.find((lib) => lib.type === 'movies') ??
      libraries.find((lib) => lib.name.toLowerCase().includes('film')) ??
      null
    );
  }, [libraries]);

  /* -------- Items -------- */

  const {
    data: items,
    isLoading: itemsLoading,
    error,
  } = useQuery<JellyfinItem[]>({
    queryKey: ['jellyfin-items', movieLibrary?.id],
    queryFn: () => api.get<JellyfinItem[]>(`/jellyfin/items?libraryId=${movieLibrary!.id}`),
    enabled: !!movieLibrary?.id && !!accessToken,
    staleTime: 60_000,
  });

  const isLoading = libsLoading || itemsLoading;

  /* -------- Render -------- */

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-4">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/jellyfin')}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-fg-muted hover:text-fg transition-colors"
          aria-label="Zurück zur Übersicht"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <Film className="h-5 w-5 text-blue-400" />
            <h1 className="text-xl font-bold tracking-tight">Filme</h1>
          </div>
          <p className="text-sm text-fg-muted mt-0.5">
            {movieLibrary?.name ?? 'Filmbibliothek'}
            {items ? ` • ${items.length} Filme` : ''}
          </p>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20 text-fg-muted">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Lade Filme …
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="rounded-xl border border-danger/20 bg-danger/5 p-8 text-center">
          <p className="text-danger font-medium">Fehler beim Laden der Filme</p>
          <p className="text-sm text-fg-muted mt-1">Bitte versuche es später erneut.</p>
        </div>
      )}

      {/* No library found */}
      {!isLoading && !error && !movieLibrary && (
        <div className="rounded-xl border-2 border-dashed border-border p-16 text-center">
          <Film className="h-12 w-12 mx-auto mb-3 text-fg-muted opacity-30" />
          <p className="text-lg font-medium">Keine Filmbibliothek gefunden</p>
          <p className="text-sm text-fg-muted mt-1">
            Synchronisiere deinen Jellyfin-Server, um eine Filmbibliothek zu verbinden.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && movieLibrary && items && items.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-border p-16 text-center">
          <Film className="h-12 w-12 mx-auto mb-3 text-fg-muted opacity-30" />
          <p className="text-lg font-medium">Noch keine Filme</p>
          <p className="text-sm text-fg-muted mt-1">
            Die Bibliothek &bdquo;{movieLibrary.name}&ldquo; enthält noch keine Filme.
          </p>
        </div>
      )}

      {/* Item grid */}
      {!isLoading && !error && items && items.length > 0 && (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => (
            <div
              key={item.id}
              className="group rounded-xl border border-border bg-bg-surface p-3 transition-all hover:-translate-y-0.5 hover:border-blue-500/30 hover:shadow-lg"
            >
              {/* Thumbnail placeholder */}
              <div className="aspect-[2/3] rounded-lg bg-blue-500/5 mb-2 flex items-center justify-center overflow-hidden">
                <Film className="h-8 w-8 text-blue-400/30" />
              </div>

              {/* Name */}
              <p className="text-sm font-medium truncate" title={item.name}>
                {item.name}
              </p>

              {/* Status */}
              <p className="text-xs text-fg-muted truncate mt-0.5">
                {item.watched ? (
                  <span className="text-green-400">Gesehen</span>
                ) : (
                  <span>Ungesehen</span>
                )}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
