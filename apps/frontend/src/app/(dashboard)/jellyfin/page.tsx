'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  Film, Music, Monitor, Image as ImageIcon, Server, Loader2,
  RefreshCw, Library,
} from 'lucide-react';
import { cn } from '@/lib/cn';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface JellyfinServer {
  id: string;
  url: string;
  apiKey: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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

interface JellyfinLibrary {
  id: string;
  serverId: string;
  externalId: string | null;
  name: string;
  type: string | null;
  ownerId: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers & Config                                                  */
/* ------------------------------------------------------------------ */

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 0) return 'gerade eben';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'weniger als 1 Minute';
  if (minutes === 1) return '1 Minute';
  if (minutes < 60) return `${minutes} Minuten`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return '1 Stunde';
  return `${hours} Stunden`;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.', ',')}k`;
  return String(n);
}

interface LibraryConfig {
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
  text: string;
  border: string;
  label: string;
}

const LIBRARY_CONFIG: Record<string, LibraryConfig> & { default: LibraryConfig } = {
  movies: {
    icon: Film, bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', label: 'Filme',
  },
  tvshows: {
    icon: Monitor, bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', label: 'Serien',
  },
  music: {
    icon: Music, bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', label: 'Musik',
  },
  photos: {
    icon: ImageIcon, bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', label: 'Fotos',
  },
  default: {
    icon: Film, bg: 'bg-brand-500/10', text: 'text-brand-400', border: 'border-brand-500/20', label: 'Unbekannt',
  },
};

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function JellyfinHubPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (hydrated && !accessToken) router.push('/login');
  }, [hydrated, accessToken, router]);

  /* -------- Servers -------- */

  const { data: servers, isLoading: serversLoading } = useQuery<JellyfinServer[]>({
    queryKey: ['jellyfin-servers'],
    queryFn: () => api.get<JellyfinServer[]>('/jellyfin/servers'),
    enabled: hydrated && !!accessToken,
    retry: false,
    staleTime: 30_000,
  });

  const activeServer = useMemo(() => {
    if (!servers || servers.length === 0) return null;
    return servers[0] ?? null;
  }, [servers]);

  const lastSync = useMemo(() => {
    if (!servers || servers.length === 0) return null;
    return servers.reduce((latest, s) =>
      s.updatedAt > latest ? s.updatedAt : latest, servers[0]!.updatedAt
    );
  }, [servers]);

  /* -------- Libraries -------- */

  const { data: libraries } = useQuery<JellyfinLibrary[]>({
    queryKey: ['jellyfin-libraries'],
    queryFn: () => api.get<JellyfinLibrary[]>('/jellyfin/libraries'),
    enabled: hydrated && !!accessToken,
    staleTime: 60_000,
  });

  const libraryCount = libraries?.length ?? 0;

  /* -------- Items (for per-type counts) -------- */

  const { data: allItems } = useQuery<JellyfinItem[]>({
    queryKey: ['jellyfin-items'],
    queryFn: () => api.get<JellyfinItem[]>('/jellyfin/items'),
    enabled: hydrated && !!accessToken,
    staleTime: 60_000,
  });

  const counts = useMemo(() => {
    if (!allItems) return { movies: 0, music: 0, tvshows: 0, photos: 0 };
    return {
      movies: allItems.filter((i) => i.type === 'movie').length,
      music: allItems.filter((i) => i.type === 'music' || i.type === 'audio').length,
      tvshows: allItems.filter((i) => i.type === 'series' || i.type === 'episode').length,
      photos: allItems.filter((i) => i.type === 'photo').length,
    };
  }, [allItems]);

  /* -------- Sync -------- */

  const syncMut = useMutation({
    mutationFn: (serverId: string) =>
      api.post<{ libraries: number; items: number }>(`/jellyfin/servers/${serverId}/sync`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jellyfin-servers'] });
      qc.invalidateQueries({ queryKey: ['jellyfin-libraries'] });
      qc.invalidateQueries({ queryKey: ['jellyfin-items'] });
    },
  });

  function handleSync() {
    if (activeServer) syncMut.mutate(activeServer.id);
  }

  /* -------- Guard -------- */

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-20 text-fg-muted">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Authentifizierung läuft …
      </div>
    );
  }

  /* -------- Card definitions -------- */

  const cards = [
    {
      key: 'movies' as const,
      title: 'Filme',
      icon: Film,
      href: '/jellyfin/movies',
      count: counts.movies,
      unit: 'Filme',
      config: LIBRARY_CONFIG.movies,
      highlight: false,
      badge: null as string | null,
    },
    {
      key: 'music' as const,
      title: 'Musik',
      icon: Music,
      href: '/jellyfin/music',
      count: counts.music,
      unit: 'Titel',
      config: LIBRARY_CONFIG.music,
      highlight: true,
      badge: 'v0.2 Spotify Player' as string | null,
    },
    {
      key: 'tvshows' as const,
      title: 'Serien',
      icon: Monitor,
      href: '/jellyfin/series',
      count: counts.tvshows,
      unit: 'Serien',
      config: LIBRARY_CONFIG.tvshows,
      highlight: false,
      badge: null as string | null,
    },
    {
      key: 'photos' as const,
      title: 'Bilder',
      icon: ImageIcon,
      href: '/jellyfin/photos',
      count: counts.photos,
      unit: 'Bilder',
      config: LIBRARY_CONFIG.photos,
      highlight: false,
      badge: null as string | null,
    },
  ] as const;

  /* -------- Render -------- */

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Jellyfin Mediathek</h1>
        <p className="text-sm text-fg-muted mt-1">
          Deine Filme, Serien, Musik &amp; Bilder
        </p>
        {libraryCount > 0 && (
          <p className="text-xs text-fg-muted mt-2 flex items-center gap-1.5">
            <Library className="h-3.5 w-3.5" />
            {libraryCount} Bibliothek{libraryCount !== 1 ? 'en' : ''} verbunden
          </p>
        )}
      </div>

      {/* 2×2 Card Grid */}
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2">
        {cards.map((card) => {
          const IconEl = card.icon;
          return (
            <button
              key={card.key}
              onClick={() => router.push(card.href)}
              className={cn(
                'group relative flex flex-col overflow-hidden rounded-2xl border p-6 text-left transition-all duration-200',
                'hover:-translate-y-0.5 hover:shadow-lg',
                card.highlight
                  ? 'border-green-500/30 bg-gradient-to-br from-green-950/40 to-bg-surface hover:border-green-500/50 hover:shadow-green-500/10'
                  : 'border-border bg-bg-surface hover:border-brand-500/30',
              )}
            >
              {/* Glow decoration for highlighted card */}
              {card.highlight && (
                <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-green-500/10 blur-3xl" />
              )}

              {/* Badge */}
              {card.badge && (
                <span className="absolute right-3 top-3 rounded-full bg-green-500/15 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-green-400">
                  {card.badge}
                </span>
              )}

              {/* Type-specific Icon */}
              <div
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-2xl border-2 mb-4',
                  card.highlight
                    ? 'border-green-500/30 bg-green-500/10 text-green-400'
                    : card.config!.bg,
                  card.highlight ? '' : card.config!.border,
                  card.highlight ? '' : card.config!.text,
                )}
              >
                <IconEl className="h-7 w-7" />
              </div>

              {/* Title + Count */}
              <div className="space-y-0.5">
                <h3 className="text-base font-bold">{card.title}</h3>
                <p className="text-3xl font-black tabular-nums tracking-tight">
                  {formatCount(card.count)}
                </p>
                <p className={cn(
                  'text-sm font-medium',
                  card.highlight ? 'text-green-400' : card.config!.text,
                )}>
                  {card.unit}
                </p>
              </div>

              {/* Hint for music */}
              {card.highlight && (
                <p className="mt-3 text-xs text-green-400/60">
                  Musikbibliothek durchsuchen &amp; abspielen
                </p>
              )}

              {/* Arrow hint */}
              <div className={cn(
                'absolute right-5 top-1/2 -translate-y-1/2 text-fg-muted/30 transition-all group-hover:translate-x-0.5 group-hover:text-fg-muted/60',
              )}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>

      {/* Server Status */}
      <ServerStatusCard
        server={activeServer}
        lastSync={lastSync}
        isSyncing={syncMut.isPending}
        onSync={handleSync}
        serversLoading={serversLoading}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ServerStatusCard                                                  */
/* ------------------------------------------------------------------ */

function ServerStatusCard({
  server,
  lastSync,
  isSyncing,
  onSync,
  serversLoading,
}: {
  server: JellyfinServer | null;
  lastSync: string | null;
  isSyncing: boolean;
  onSync: () => void;
  serversLoading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
              server
                ? 'border-brand-500/20 bg-brand-500/10 text-brand-400'
                : 'border-danger/20 bg-danger/5 text-danger',
            )}
          >
            <Server className="h-5 w-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <p className="text-sm font-semibold truncate">
              Jellyfin Server{server ? `: ${server.url.replace(/^https?:\/\//, '')}` : ''}
            </p>
            {serversLoading ? (
              <p className="text-xs text-fg-muted flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Verbinde …
              </p>
            ) : server ? (
              <>
                <p className="text-xs text-fg-muted">
                  {lastSync
                    ? `Zuletzt synchronisiert: vor ${formatTimeAgo(lastSync)}`
                    : 'Noch nicht synchronisiert'}
                </p>
                <p className="text-xs text-green-400 flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
                  Verbunden
                </p>
              </>
            ) : (
              <>
                <p className="text-xs text-danger">Kein Server verbunden</p>
                <p className="text-xs text-fg-muted">
                  Verbinde einen Jellyfin-Server über die Einstellungen.
                </p>
              </>
            )}
          </div>
        </div>

        {server && (
          <button
            onClick={onSync}
            disabled={isSyncing}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              'border border-brand-500/30 text-brand-400 hover:bg-brand-500/10 disabled:opacity-50',
            )}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isSyncing && 'animate-spin')} />
            {isSyncing ? 'Synchronisiere…' : 'Jetzt synchronisieren'}
          </button>
        )}
      </div>
    </div>
  );
}
