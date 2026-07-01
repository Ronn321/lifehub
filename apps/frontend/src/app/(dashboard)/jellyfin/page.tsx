'use client';
import React, { useState, useEffect, useMemo, useRef, useCallback, type ComponentType } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  Settings, Server, Film, Loader2, AlertCircle, Plus, X, Trash2, RefreshCw,
  Eye, EyeOff, Monitor, Play, Pause, Music, Image as ImageIcon,
  BookOpen, Clock, Search, Key, SkipBack, SkipForward, Shuffle, Repeat,
  Volume2, VolumeX, ChevronLeft, ListMusic, Disc3, Mic2,
  ChevronRight, FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { VideoPlayer } from '@/components/jellyfin/VideoPlayer';

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

interface JellyfinLibrary {
  id: string;
  serverId: string;
  externalId: string | null;
  name: string;
  type: string | null;
  createdAt: string;
  server?: JellyfinServer;
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

interface LibraryConfig {
  icon: ComponentType<{ className?: string }>;
  bg: string; text: string; border: string; label: string;
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
  books: {
    icon: BookOpen, bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', label: 'Bücher',
  },
  homevideos: {
    icon: Film, bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20', label: 'Eigene Videos',
  },
  default: {
    icon: Film, bg: 'bg-brand-500/10', text: 'text-brand-400', border: 'border-brand-500/20', label: 'Unbekannt',
  },
};

const ITEM_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  movie: Film,
  series: Monitor,
  episode: Film,
  music: Music,
  audio: Music,
  photo: ImageIcon,
};

const ITEM_TYPE_LABELS: Record<string, string> = {
  movie: 'Film',
  series: 'Serie',
  episode: 'Episode',
  music: 'Musik',
  audio: 'Audio',
  photo: 'Foto',
};

function isPlayable(type: string) {
  return ['movie', 'episode', 'series', 'music', 'audio'].includes(type);
}

/* ------------------------------------------------------------------ */
/*  Jellyfin API Item Types (Live from Jellyfin API, not local DB)    */
/* ------------------------------------------------------------------ */

interface JellyfinApiItem {
  Id: string;
  Name: string;
  Type: string;
  Album?: string;
  AlbumId?: string;
  AlbumArtist?: string;
  Artist?: string;
  Artists?: string[];
  ProductionYear?: number;
  Overview?: string;
  Path?: string;
  IsFolder?: boolean;
  RunTimeTicks?: number;
}

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getJellyfinImageUrl(accessToken: string, serverId: string, itemId: string, width = 300, height = 300): string {
  return `${getStreamBaseUrl()}/api/v1/jellyfin/servers/${serverId}/items/${itemId}/image?w=${width}&h=${height}&token=${encodeURIComponent(accessToken)}`;
}

function getStreamBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:3007`;
  }
  return 'http://localhost:3007';
}

/* ------------------------------------------------------------------ */
/*  SafeImage — Jellyfin item image with svg fallback                 */
/* ------------------------------------------------------------------ */

function JellyfinImage({
  accessToken, serverId, itemId, name, width, height,
  fallback,
  className,
}: {
  accessToken: string | null;
  serverId: string;
  itemId: string;
  name: string;
  width?: number;
  height?: number;
  fallback?: React.ReactNode;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  if (!itemId || errored || !accessToken) {
    return (
      <div className={'flex items-center justify-center ' + (className ?? '')}>
        {fallback ?? <Music className="h-8 w-8 text-fg-muted opacity-40" />}
      </div>
    );
  }

  return (
    <>
      <img
        ref={imgRef}
        src={getJellyfinImageUrl(accessToken, serverId, itemId, width ?? 300, height ?? 300)}
        alt={name}
        className={className}
        loading="lazy"
        onError={() => setErrored(true)}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  ErrorBoundary — catch rendering errors in child components        */
/* ------------------------------------------------------------------ */

class PlayerErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error.message };
  }
  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.warn('[PlayerErrorBoundary] CAUGHT:', error.message, error.stack?.slice(0,200));
    console.warn('[PlayerErrorBoundary] Component Stack:', info.componentStack?.slice(0,200));
  }
  override render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center gap-3 py-16 px-8 text-center">
          <p className="text-danger text-sm">Player-Fehler: {this.state.errorMessage}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                         */
/* ------------------------------------------------------------------ */

export default function JellyfinPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  const [hydrated, setHydrated] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [selectedLibrary, setSelectedLibrary] = useState<JellyfinLibrary | null>(null);

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (hydrated && !accessToken) router.push('/login');
  }, [hydrated, accessToken, router]);

  const { data: servers, isLoading: serversLoading } = useQuery<JellyfinServer[]>({
    queryKey: ['jellyfin-servers'],
    queryFn: () => api.get<JellyfinServer[]>('/jellyfin/servers'),
    enabled: hydrated && !!accessToken,
    retry: false,
    staleTime: 30_000,
  });

  const activeServer = useMemo(() => {
    if (!servers || servers.length === 0) return null;
    return servers[0];
  }, [servers]);

  const lastSync = useMemo(() => {
    if (!servers || servers.length === 0) return null;
    return servers.reduce((latest, s) =>
      s.updatedAt > latest ? s.updatedAt : latest, servers[0]!.updatedAt
    );
  }, [servers]);

  const syncMut = useMutation({
    mutationFn: (serverId: string) =>
      api.post<{ libraries: number; items: number }>(`/jellyfin/servers/${serverId}/sync`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jellyfin-servers'] });
      qc.invalidateQueries({ queryKey: ['jellyfin-libraries'] });
      qc.invalidateQueries({ queryKey: ['jellyfin-items'] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api['delete'](`/jellyfin/servers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jellyfin-servers'] });
      qc.invalidateQueries({ queryKey: ['jellyfin-libraries'] });
      qc.invalidateQueries({ queryKey: ['jellyfin-items'] });
      setSelectedLibrary(null);
    },
  });

  function handleSync() {
    if (activeServer) syncMut.mutate(activeServer.id);
  }

  const renderCount = useRef(0);
  renderCount.current++;
  console.log('[TRACE JellyfinPage] render #' + renderCount.current, 'hydrated:', hydrated, 'showSettings:', showSettings, 'selectedLibrary:', selectedLibrary?.id ?? null, 'servers:', servers?.length, 'accessToken:', !!accessToken);
  useEffect(() => {
    console.log('[TRACE JellyfinPage] MOUNT');
    return () => { console.log('[TRACE JellyfinPage] UNMOUNT'); };
  }, []);

  // Nur bei initialer Hydration warten, nicht bei Token-Refresh
  // (sonst wird das gesamte UI unmounted und lokaler State wie playingItem geht verloren)
  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-20 text-fg-muted">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Authentifizierung läuft …
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Jellyfin</h1>
          <p className="text-sm text-fg-muted mt-1">
            Verwalte deine Jellyfin-Mediathek – Bibliotheken und Medien.
          </p>
          <SyncStatusBadge
            lastSync={lastSync}
            onSync={handleSync}
            isSyncing={syncMut.isPending}
          />
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={cn(
            'rounded-md p-2 transition-colors shrink-0',
            showSettings
              ? 'bg-brand-500/10 text-brand-500'
              : 'text-fg-muted hover:text-fg hover:bg-bg-raised',
          )}
          title="Einstellungen"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel
          servers={servers}
          serversLoading={serversLoading}
          isSyncing={syncMut.isPending}
          onSyncServer={(id) => syncMut.mutate(id)}
          onDeleteServer={(id) => deleteMut.mutate(id)}
          onConnect={() => setShowConnect(true)}
        />
      )}

      {/* Main Content */}
      {!showSettings && (
        <>
          {servers && servers.length > 0 && activeServer ? (
            selectedLibrary ? (
              <LibraryBrowser
                library={selectedLibrary}
                server={activeServer}
                onBack={() => setSelectedLibrary(null)}
              />
            ) : (
              <LibrariesTab serverId={activeServer.id} onSelectLibrary={setSelectedLibrary} />
            )
          ) : null}

          {servers && servers.length === 0 && !serversLoading && (
            <NoServerView onConnect={() => setShowConnect(true)} />
          )}

          {serversLoading && (
            <SkeletonGrid count={6} />
          )}
        </>
      )}

      {/* Connect Dialog */}
      {showConnect && <ConnectDialog onClose={() => setShowConnect(false)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Settings Panel                                                    */
/* ------------------------------------------------------------------ */

function SettingsPanel({
  servers, serversLoading, isSyncing, onSyncServer, onDeleteServer, onConnect,
}: {
  servers: JellyfinServer[] | undefined;
  serversLoading: boolean;
  isSyncing: boolean;
  onSyncServer: (id: string) => void;
  onDeleteServer: (id: string) => void;
  onConnect: () => void;
}) {
  const [showApiKey, setShowApiKey] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-border bg-bg-surface p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-brand-500" />
          <h2 className="text-lg font-semibold">Einstellungen</h2>
        </div>
      </div>

      {serversLoading && (
        <div className="flex items-center justify-center py-8 text-fg-muted">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Lade Server …
        </div>
      )}

      {!serversLoading && (!servers || servers.length === 0) && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-fg-muted">
          <Server className="h-10 w-10 mb-3 opacity-40" />
          <p className="font-medium">Noch keine Server verbunden</p>
          <p className="text-sm mt-1">Verbinde deinen Jellyfin-Server, um deine Mediathek zu durchsuchen.</p>
        </div>
      )}

      {!serversLoading && servers && servers.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-fg-muted">Server verwalten</p>
          {servers.map((server) => (
            <div
              key={server.id}
              className="flex flex-col gap-2 rounded-lg border border-border p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-500/10 text-brand-500">
                    <Monitor className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{server.url}</p>
                    <p className="text-xs text-fg-muted">
                      Verbunden seit {new Date(server.createdAt).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { if (confirm('Server wirklich entfernen?')) onDeleteServer(server.id); }}
                  className="rounded-md p-1.5 text-fg-muted hover:text-danger hover:bg-danger/10 transition-colors shrink-0"
                  title="Server entfernen"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0 rounded-md bg-bg-raised/50 px-3 py-1.5">
                  <Key className="h-3.5 w-3.5 shrink-0 text-fg-muted" />
                  <code className="text-xs font-mono truncate">
                    {showApiKey === server.id ? server.apiKey : '••••••••••••••••'}
                  </code>
                  <button
                    onClick={() => setShowApiKey(showApiKey === server.id ? null : server.id)}
                    className="shrink-0 text-fg-muted hover:text-fg transition-colors"
                  >
                    {showApiKey === server.id ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <button
                  onClick={() => onSyncServer(server.id)}
                  disabled={isSyncing}
                  className="flex items-center gap-1 rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-bg hover:bg-brand-400 disabled:opacity-50 transition-colors shrink-0"
                >
                  {isSyncing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  Sync
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onConnect}
        className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-border py-3 text-sm font-medium text-fg-muted hover:border-brand-500/40 hover:text-brand-500 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Server verbinden
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  No Server View                                                    */
/* ------------------------------------------------------------------ */

function NoServerView({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-fg-muted">
      <Server className="h-14 w-14 mb-4 opacity-30" />
      <p className="font-medium text-lg">Kein Server verbunden</p>
      <p className="text-sm mt-1 max-w-sm text-center">
        Verbinde deinen Jellyfin-Server, um deine Mediathek zu durchsuchen.
      </p>
      <button
        onClick={onConnect}
        className="mt-6 flex items-center gap-2 rounded-md bg-brand-500 px-5 py-2.5 text-sm font-medium text-bg hover:bg-brand-400 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Server verbinden
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Connect Dialog                                                    */
/* ------------------------------------------------------------------ */

function ConnectDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (body: { url: string; apiKey: string }) =>
      api.post('/jellyfin/servers', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jellyfin-servers'] });
      onClose();
    },
    onError: (err) => setError((err as Error).message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!url.trim() || !apiKey.trim()) {
      setError('URL und API-Key dürfen nicht leer sein.');
      return;
    }
    mutation.mutate({ url: url.trim(), apiKey: apiKey.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-lg border border-border bg-bg-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Jellyfin-Server verbinden</h2>
          <button type="button" onClick={onClose} className="text-fg-muted hover:text-fg"><X className="h-5 w-5" /></button>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Server-URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://jellyfin.example.com"
            className="w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">API-Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Jellyfin API-Key"
            className="w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            required
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-bg transition-colors">Abbrechen</button>
          <button type="submit" disabled={mutation.isPending} className="flex-1 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-bg hover:bg-brand-400 disabled:opacity-50 transition-colors">
            {mutation.isPending ? 'Verbinde…' : 'Verbinden'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sync Status Badge                                                 */
/* ------------------------------------------------------------------ */

function SyncStatusBadge({ lastSync, onSync, isSyncing }: {
  lastSync: string | null;
  onSync: () => void;
  isSyncing: boolean;
}) {
  if (!lastSync) return null;

  const diff = Date.now() - new Date(lastSync).getTime();
  const minutes = Math.floor(diff / 60000);

  let color: string;
  if (minutes < 5) color = 'bg-green-500/10 text-green-500 border-green-500/30';
  else if (minutes < 30) color = 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
  else color = 'bg-red-500/10 text-red-500 border-red-500/30';

  return (
    <div className={cn('inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 mt-2 text-xs', color)}>
      <Clock className="h-3.5 w-3.5" />
      <span>Zuletzt synchronisiert: vor {formatTimeAgo(lastSync)}</span>
      <button
        onClick={onSync}
        disabled={isSyncing}
        className="ml-1 underline hover:no-underline disabled:opacity-50"
      >
        {isSyncing ? 'Synchronisiere…' : 'Jetzt synchronisieren'}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Libraries Tab                                                     */
/* ------------------------------------------------------------------ */

function LibrariesTab({ serverId, onSelectLibrary }: {
  serverId: string;
  onSelectLibrary: (lib: JellyfinLibrary) => void;
}) {
  const { data: libraries, isLoading, error } = useQuery<JellyfinLibrary[]>({
    queryKey: ['jellyfin-libraries', serverId],
    queryFn: () => api.get<JellyfinLibrary[]>(`/jellyfin/libraries?serverId=${serverId}`),
    staleTime: 30_000,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">Bibliotheken</h2>
        {libraries && libraries.length > 0 && (
          <span className="rounded-full bg-bg-raised px-2.5 py-0.5 text-xs text-fg-muted">
            {libraries.length}
          </span>
        )}
      </div>

      {isLoading && <SkeletonGrid count={8} />}

      {error && !isLoading && (
        <div className="flex items-start gap-3 rounded-lg border border-danger/20 bg-danger/5 p-4 text-danger">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm">{(error as Error).message}</p>
        </div>
      )}

      {!isLoading && !error && libraries && libraries.length > 0 && (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {libraries.map((lib) => (
            <LibraryCard
              key={lib.id}
              library={lib}
              onClick={() => onSelectLibrary(lib)}
            />
          ))}
        </div>
      )}

      {!isLoading && !error && (!libraries || libraries.length === 0) && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-fg-muted">
          <Film className="h-10 w-10 mb-3 opacity-40" />
          <p className="font-medium">Keine Bibliotheken gefunden</p>
          <p className="text-sm mt-1">Synchronisiere den Server, um Bibliotheken zu laden.</p>
        </div>
      )}
    </div>
  );
}

function LibraryCard({ library, onClick }: {
  library: JellyfinLibrary;
  onClick: () => void;
}) {
  const config = LIBRARY_CONFIG[library.type ?? ''] ?? LIBRARY_CONFIG.default;
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-bg-surface p-5 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-brand-500/30"
    >
      <div className={cn('flex h-14 w-14 items-center justify-center rounded-xl border', config.bg, config.border, config.text)}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{library.name}</p>
        <p className={cn('text-xs mt-0.5', config.text)}>{config.label}</p>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Items Tab                                                         */
/* ------------------------------------------------------------------ */

function ItemsTab({ libraryId, onBack }: {
  libraryId: string;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [filter, setFilter] = useState<'all' | 'watched' | 'unwatched'>('all');
  const [search, setSearch] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [playingItem, setPlayingItem] = useState<JellyfinItem | null>(null);

  const { data: items, isLoading, error } = useQuery<JellyfinItem[]>({
    queryKey: ['jellyfin-items', libraryId],
    queryFn: () => api.get<JellyfinItem[]>(`/jellyfin/items?libraryId=${libraryId}`),
    staleTime: 60_000,
    retry: 2,
  });

  const toggleMut = useMutation({
    mutationFn: (itemId: string) => {
      setTogglingId(itemId);
      return api.post<JellyfinItem>(`/jellyfin/items/${itemId}/toggle-watched`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jellyfin-items', libraryId] });
    },
    onSettled: () => setTogglingId(null),
  });

  const filtered = (items ?? [])
    .filter((item) => {
      if (filter === 'watched') return item.watched;
      if (filter === 'unwatched') return !item.watched;
      return true;
    })
    .filter((item) =>
      search ? item.name.toLowerCase().includes(search.toLowerCase()) : true
    );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-fg hover:bg-bg transition-colors"
        >
          ← Zurück
        </button>
        <h2 className="text-lg font-semibold">Medien</h2>
        {!isLoading && items && (
          <span className="rounded-full bg-bg-raised px-2.5 py-0.5 text-xs text-fg-muted">
            {filtered.length} / {items.length}
          </span>
        )}
      </div>

      {/* Toolbar */}
      <ItemToolbar
        filter={filter}
        setFilter={setFilter}
        search={search}
        setSearch={setSearch}
      />

      {/* Content */}
      {isLoading && <SkeletonGrid count={15} poster />}

      {error && !isLoading && (
        <div className="flex items-start gap-3 rounded-lg border border-danger/20 bg-danger/5 p-4 text-danger">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm">{(error as Error).message}</p>
        </div>
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onPlay={() => setPlayingItem(item)}
              onToggleWatched={() => toggleMut.mutate(item.id)}
              isToggling={togglingId === item.id}
            />
          ))}
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-fg-muted">
          <Film className="h-10 w-10 mb-3 opacity-40" />
          <p className="font-medium">
            {search
              ? 'Keine Medien gefunden'
              : filter === 'all'
              ? 'Keine Medien in dieser Bibliothek'
              : filter === 'watched'
              ? 'Keine gesehenen Medien'
              : 'Keine ungesehenen Medien'}
          </p>
          {!search && filter === 'all' && (
            <p className="text-sm mt-1">
              Synchronisiere den Server, um Medien zu laden.
            </p>
          )}
        </div>
      )}

      {/* Media Player Overlay */}
      {playingItem && (
        <MediaPlayer
          item={playingItem}
          accessToken={accessToken}
          onClose={() => setPlayingItem(null)}
        />
      )}
    </div>
  );
}

function ItemCard({ item, onPlay, onToggleWatched, isToggling }: {
  item: JellyfinItem;
  onPlay: () => void;
  onToggleWatched: () => void;
  isToggling: boolean;
}) {
  const Icon = ITEM_ICONS[item.type] ?? Film;

  return (
    <div className="group relative">
      {/* Poster */}
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-border bg-bg-surface transition-all duration-200 group-hover:scale-[1.03] group-hover:shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-bg-raised flex items-center justify-center">
          <Icon className="h-12 w-12 text-fg-muted/30" />
        </div>

        {/* Watched badge */}
        {item.watched && (
          <div className="absolute top-2 right-2 z-10 rounded-full bg-green-500/80 p-1 shadow">
            <Eye className="h-3 w-3 text-white" />
          </div>
        )}

        {/* Type label overlay for non-playable */}
        {!isPlayable(item.type) && (
          <div className="absolute bottom-2 left-2 z-10 rounded bg-black/60 px-2 py-0.5 text-xs text-white/80">
            {ITEM_TYPE_LABELS[item.type] ?? item.type}
          </div>
        )}

        {/* Play overlay */}
        {isPlayable(item.type) && (
          <button
            onClick={onPlay}
            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 shadow-lg shadow-brand-500/30">
              <Play className="h-5 w-5 text-white ml-0.5" />
            </div>
          </button>
        )}
      </div>

      {/* Info */}
      <div className="mt-2 space-y-0.5">
        <p className="text-sm font-medium truncate">{item.name}</p>
        <div className="flex items-center justify-between">
          {isPlayable(item.type) && (
            <span className="text-xs text-fg-muted">
              {ITEM_TYPE_LABELS[item.type] ?? item.type}
            </span>
          )}
          {!isPlayable(item.type) && <span />}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleWatched(); }}
            disabled={isToggling}
            className={cn(
              'rounded p-0.5 transition-colors',
              item.watched
                ? 'text-green-500 hover:text-green-400'
                : 'text-fg-muted/50 hover:text-fg-muted'
            )}
            title={item.watched ? 'Als ungesehen markieren' : 'Als gesehen markieren'}
          >
            {item.watched ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ItemToolbar({ filter, setFilter, search, setSearch }: {
  filter: 'all' | 'watched' | 'unwatched';
  setFilter: (f: 'all' | 'watched' | 'unwatched') => void;
  search: string;
  setSearch: (s: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-1 rounded-md border border-border bg-bg-surface p-0.5">
        {(['all', 'unwatched', 'watched'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded px-3 py-1 text-xs font-medium transition-colors',
              filter === f ? 'bg-brand-500 text-bg' : 'text-fg-muted hover:text-fg',
            )}
          >
            {f === 'all' ? 'Alle' : f === 'watched' ? 'Gesehen' : 'Ungesehen'}
          </button>
        ))}
      </div>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suchen…"
          className="w-full rounded-md border border-border bg-bg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 sm:w-64"
        />
      </div>
    </div>
  );
}

function SkeletonGrid({ count, poster = false }: { count: number; poster?: boolean }) {
  return (
    <div
      className={cn(
        'grid gap-4',
        poster
          ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
          : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5'
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'animate-pulse rounded-lg bg-bg-raised/50',
            poster ? 'aspect-[2/3]' : 'aspect-[4/3]'
          )}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Custom Video Player (native <video> + styled controls)             */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Media Player Overlay                                              */
/* ------------------------------------------------------------------ */

function MediaPlayer({ item, accessToken, onClose, server }: {
  item: JellyfinItem; accessToken: string | null; onClose: () => void; server?: JellyfinServer;
}) {
  const [error, setError] = useState<string | null>(null);
  const isVideo = ['movie', 'episode', 'series'].includes(item.type?.toLowerCase() ?? '');
  const isAudio = ['music', 'audio'].includes(item.type?.toLowerCase() ?? '');
  const isPhoto = item.type?.toLowerCase() === 'photo';
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const handleClose = useCallback(() => {
    onCloseRef.current();
  }, []);

  if (!accessToken) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
        <div className="flex flex-col items-center gap-4 py-16 px-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
          <p className="text-white/80 text-sm">Authentifizierung wird geladen…</p>
        </div>
      </div>
    );
  }

  const externalId = item.externalId ?? item.id;
  const mediaType = ['movie', 'episode', 'series', 'Episode', 'Movie'].includes(item.type) ? 'Video' : 'Audio';
  const apiHost = getStreamBaseUrl();
  const streamUrl = server
    ? `${apiHost}/api/v1/jellyfin/servers/${server.id}/items/${externalId}/stream?type=${mediaType}&token=${encodeURIComponent(accessToken)}`
    : `${apiHost}/api/v1/jellyfin/items/${item.id}/stream?token=${encodeURIComponent(accessToken)}`;

  return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      >
      <div
        className="relative max-h-full max-w-full rounded-lg bg-black overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/90">
          <div className="flex items-center gap-2 min-w-0">
            {isVideo && <Play className="h-4 w-4 text-brand-500 shrink-0" />}
            {isAudio && <Music className="h-4 w-4 text-brand-500 shrink-0" />}
            {isPhoto && <ImageIcon className="h-4 w-4 text-brand-500 shrink-0" />}
            <p className="text-sm font-medium text-white truncate">{item.name}</p>
          </div>
          <button onClick={handleClose} className="text-white/70 hover:text-white ml-4 shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Player */}
        <div className="flex items-center justify-center">
          {error && (
            <div className="flex flex-col items-center gap-4 py-16 px-8 text-center">
              <AlertCircle className="h-12 w-12 text-danger" />
              <p className="text-white/80 text-sm max-w-xs">{error}</p>
              <button
                onClick={() => setError(null)}
                className="rounded-md bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors"
              >
                Erneut versuchen
              </button>
            </div>
          )}

          {isVideo && !error && (
            <PlayerErrorBoundary>
              <VideoPlayer
                streamUrl={streamUrl}
                mediaInfoUrl={server
                  ? `${apiHost}/api/v1/jellyfin/servers/${server.id}/items/${externalId}/media-info?token=${encodeURIComponent(accessToken)}`
                  : undefined}
                title={item.name}
                onError={(msg) => setError(msg)}
              />
            </PlayerErrorBoundary>
          )}

          {isAudio && !error && (
            <div className="flex flex-col items-center gap-6 py-16 px-8">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-500/20">
                <Music className="h-12 w-12 text-brand-500" />
              </div>
              <p className="text-white/60 text-sm">Musikwiedergabe</p>
              <PlayerErrorBoundary>
                <AudioPlayerCore
                  streamUrl={streamUrl}
                  onError={(msg) => setError(msg)}
                />
              </PlayerErrorBoundary>
            </div>
          )}

          {isPhoto && !error && (
            <PhotoPlayerCore
              streamUrl={streamUrl}
              alt={item.name}
              onError={(msg) => setError(msg)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  VideoPlayerCore — native <video> + hls.js                         */
/* ------------------------------------------------------------------ */

function VideoPlayerCore({ streamUrl, onError }: {
  streamUrl: string;
  onError: (msg: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: any = null;
    let destroyed = false;

    async function setup() {
      try {
        const Hls = (await import('hls.js')).default;
        if (destroyed) return;
        if (Hls.isSupported()) {
          hls = new Hls({
            xhrSetup: (xhr: XMLHttpRequest, url: string) => {
              xhr.withCredentials = false;
            },
          });
          hls.loadSource(streamUrl);
          hls.attachMedia(video!);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (!destroyed) setReady(true);
            video!.play().catch(() => {});
          });
          hls.on(Hls.Events.ERROR, (_: any, data: any) => {
            console.error('[VideoPlayerCore] HLS error:', data.type, data.details);
            if (data.fatal && !destroyed) {
              onErrorRef.current('Video konnte nicht geladen werden (HLS-Fehler).');
            }
          });
        } else if (video!.canPlayType('application/vnd.apple.mpegurl')) {
          video!.src = streamUrl;
          video!.addEventListener('loadedmetadata', () => {
            if (!destroyed) setReady(true);
            video!.play().catch(() => {});
          });
          video!.addEventListener('error', () => {
            if (!destroyed) onErrorRef.current('Video konnte nicht geladen werden.');
          });
        } else {
          if (!destroyed) onErrorRef.current('HLS wird von diesem Browser nicht unterstützt.');
        }
      } catch (err) {
        console.error('[VideoPlayerCore] setup error:', err);
        if (!destroyed) onErrorRef.current('Video-Player konnte nicht initialisiert werden.');
      }
    }

    setup();

    return () => {
      destroyed = true;
      if (hls) {
        hls.destroy();
      }
    };
  }, [streamUrl]);

  return (
    <div className="relative" style={{ width: '100%', aspectRatio: '16/9', maxHeight: '80vh', backgroundColor: '#000' }}>
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <Loader2 className="h-6 w-6 animate-spin text-white/60" />
          <span className="text-white/60 text-sm ml-2">Lade Video…</span>
        </div>
      )}
      <video
        ref={videoRef}
        crossOrigin="anonymous"
        controls
        autoPlay
        playsInline
        className="w-full h-full"
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AudioPlayerCore — native <audio>                                  */
/* ------------------------------------------------------------------ */

function AudioPlayerCore({ streamUrl, onError }: {
  streamUrl: string;
  onError: (msg: string) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onCanPlay = () => {};
    const onErr = () => {
      onErrorRef.current('Audio konnte nicht geladen werden.');
    };

    audio.addEventListener('canplay', onCanPlay, { once: true });
    audio.addEventListener('error', onErr, { once: true });
    return () => {
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('error', onErr);
    };
  }, [streamUrl]);

  return (
    <div className="w-80 max-w-full">
      <audio
        ref={audioRef}
        src={streamUrl}
        controls
        autoPlay
        className="w-full"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PhotoPlayerCore — native <img>                                    */
/* ------------------------------------------------------------------ */

function PhotoPlayerCore({ streamUrl, alt, onError }: {
  streamUrl: string;
  alt: string;
  onError: (msg: string) => void;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <img
      src={streamUrl}
      alt={alt}
      className="max-h-[80vh] max-w-full object-contain"
      style={{ display: loaded ? 'block' : 'none' }}
      onLoad={() => setLoaded(true)}
      onError={() => onError('Bild konnte nicht geladen werden.')}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Photo Lightbox (Fullscreen-Overlay für Bilder)                    */
/* ------------------------------------------------------------------ */

function PhotoLightbox({
  photos,
  serverId,
  accessToken,
  initialIndex,
  onClose,
}: {
  photos: JellyfinApiItem[];
  serverId: string;
  accessToken: string;
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [slideshowActive, setSlideshowActive] = useState(false);
  const [slideshowInterval, setSlideshowInterval] = useState(5);

  const currentPhoto = photos[index];
  if (!currentPhoto) return null;

  const streamUrl = `${getStreamBaseUrl()}/api/v1/jellyfin/servers/${serverId}/items/${currentPhoto.Id}/stream?type=Image&token=${encodeURIComponent(accessToken)}`;

  function changeIndex(delta: number) {
    setIndex((prev) => {
      const next = prev + delta;
      if (next < 0) return photos.length - 1;
      if (next >= photos.length) return 0;
      return next;
    });
  }

  useEffect(() => {
    if (!slideshowActive) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % photos.length);
    }, slideshowInterval * 1000);
    return () => clearInterval(timer);
  }, [slideshowActive, slideshowInterval, photos.length]);

  useEffect(() => {
    setZoom(1);
  }, [index]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') changeIndex(-1);
      if (e.key === 'ArrowRight') changeIndex(1);
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(z + 0.25, 3));
      if (e.key === '-') setZoom((z) => Math.max(z - 0.25, 0.5));
      if (e.key === '0') setZoom(1);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
      onClick={onClose}
    >
      <div className="relative flex items-center justify-center w-full h-full" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 rounded-full bg-black/50 p-2 text-white/70 hover:text-white transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Counter */}
        <div className="absolute top-4 left-4 z-10 rounded-full bg-black/50 px-3 py-1 text-sm text-white/70">
          {index + 1} / {photos.length}
        </div>

        {/* Prev button */}
        <button
          onClick={() => changeIndex(-1)}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/50 p-2 text-white/70 hover:text-white transition-colors"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>

        {/* Image */}
        <img
          key={currentPhoto.Id}
          src={streamUrl}
          alt={currentPhoto.Name}
          className="max-h-full max-w-full object-contain transition-transform duration-200"
          style={{ transform: `scale(${zoom})` }}
          onWheel={(e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            setZoom((z) => Math.max(0.5, Math.min(3, z + delta)));
          }}
        />

        {/* Next button */}
        <button
          onClick={() => changeIndex(1)}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/50 p-2 text-white/70 hover:text-white transition-colors"
        >
          <ChevronRight className="h-8 w-8" />
        </button>

        {/* Bottom bar */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <p className="text-sm text-white/80 truncate">{currentPhoto.Name}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSlideshowActive(!slideshowActive)}
                className={cn(
                  'rounded-full p-2 transition-colors',
                  slideshowActive ? 'text-amber-500' : 'text-white/50 hover:text-white'
                )}
                title={slideshowActive ? 'Diashow pausieren' : 'Diashow starten'}
              >
                {slideshowActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setZoom(1)}
                className="rounded-full px-2 py-1 text-xs text-white/50 hover:text-white transition-colors"
                title="Zoom zurücksetzen"
              >
                {Math.round(zoom * 100)}%
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Folder Breadcrumb                                                 */
/* ------------------------------------------------------------------ */

function FolderBreadcrumb({ items, onNavigate }: {
  items: BreadcrumbItem[];
  onNavigate: (index: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 text-sm flex-wrap">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-fg-muted/50" />}
          <button
            onClick={() => onNavigate(i)}
            className={cn(
              'rounded px-2 py-0.5 transition-colors',
              i === items.length - 1
                ? 'text-fg font-medium cursor-default'
                : 'text-fg-muted hover:text-fg hover:bg-bg-raised',
            )}
          >
            {item.name}
          </button>
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Library Browser (dispatches by type)                              */
/* ------------------------------------------------------------------ */

function LibraryBrowser({ library, server, onBack }: {
  library: JellyfinLibrary;
  server: JellyfinServer;
  onBack: () => void;
}) {
  if (library.type === 'tvshows') {
    return <SeriesBrowser library={library} server={server} onBack={onBack} />;
  }
  if (library.type === 'music') {
    return <MusicBrowser library={library} server={server} onBack={onBack} />;
  }
  return <FolderBrowser library={library} server={server} onBack={onBack} />;
}

/* ------------------------------------------------------------------ */
/*  Series Browser (TV Shows: Series → Seasons → Episodes)            */
/* ------------------------------------------------------------------ */

function SeriesBrowser({ library, server, onBack }: {
  library: JellyfinLibrary;
  server: JellyfinServer;
  onBack: () => void;
}) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [playingItem, setPlayingItem] = useState<JellyfinApiItem | null>(null);
  const [viewState, setViewState] = useState<{ level: 'series' } | {
    level: 'seasons'; localItemId: string; seriesName: string;
  } | {
    level: 'episodes'; externalId: string; seasonName: string;
  }>({ level: 'series' });

  const { data: items } = useQuery<JellyfinItem[]>({
    queryKey: ['jellyfin-items', library.id],
    queryFn: () => api.get<JellyfinItem[]>(`/jellyfin/items?libraryId=${library.id}`),
    staleTime: 60_000,
  });
  const series = items?.filter((i) => i.type === 'series') ?? [];

  const { data: seasons, isLoading: seasonsLoading } = useQuery<JellyfinApiItem[]>({
    queryKey: ['jellyfin-series-children', viewState.level === 'seasons' ? viewState.localItemId : ''],
    queryFn: () => api.get<JellyfinApiItem[]>(`/jellyfin/items/${viewState.level === 'seasons' ? viewState.localItemId : ''}/children`),
    enabled: viewState.level === 'seasons',
  });

  const { data: episodes, isLoading: episodesLoading } = useQuery<JellyfinApiItem[]>({
    queryKey: ['jellyfin-episodes', viewState.level === 'episodes' ? viewState.externalId : ''],
    queryFn: () => api.get<JellyfinApiItem[]>(`/jellyfin/servers/${server.id}/items/${viewState.level === 'episodes' ? viewState.externalId : ''}/children`),
    enabled: viewState.level === 'episodes',
  });

  const breadcrumb: BreadcrumbItem[] = [
    { id: null, name: library.name },
  ];
  if (viewState.level === 'seasons') {
    breadcrumb.push({ id: viewState.localItemId, name: viewState.seriesName });
  } else if (viewState.level === 'episodes') {
    breadcrumb.push({ id: null, name: '' });
    breadcrumb.push({ id: viewState.externalId, name: viewState.seasonName });
  }

  function handleNavigate(index: number) {
    if (index === 0) setViewState({ level: 'series' });
    else if (index === 1 && viewState.level === 'episodes') {
      setViewState({ level: 'seasons', localItemId: '', seriesName: '' });
    }
  }

  if (viewState.level === 'series') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-fg hover:bg-bg transition-colors">← Zurück</button>
          <h2 className="text-lg font-semibold">{library.name}</h2>
          <span className="rounded-full bg-bg-raised px-2.5 py-0.5 text-xs text-fg-muted">{series.length}</span>
        </div>
        <FolderBreadcrumb items={breadcrumb} onNavigate={handleNavigate} />
        {series.length > 0 ? (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {series.map((s) => (
              <button
                key={s.id}
                onClick={() => setViewState({ level: 'seasons', localItemId: s.id, seriesName: s.name })}
                className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-bg-surface p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-lg hover:border-brand-500/30"
              >
                <div className="flex h-24 w-16 items-center justify-center rounded-lg overflow-hidden bg-purple-500/10 border border-purple-500/20">
                  <JellyfinImage
                    accessToken={accessToken}
                    serverId={server.id}
                    itemId={s.externalId ?? ''}
                    name={s.name}
                    width={200}
                    height={300}
                    className="h-full w-full object-cover"
                    fallback={<Monitor className="h-8 w-8 text-purple-400" />}
                  />
                </div>
                <p className="text-sm font-medium truncate w-full">{s.name}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-fg-muted">
            <Monitor className="h-10 w-10 mb-3 opacity-40" />
            <p className="font-medium">Keine Serien gefunden</p>
          </div>
        )}
      </div>
    );
  }

  if (viewState.level === 'seasons') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setViewState({ level: 'series' })} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-fg hover:bg-bg transition-colors">← Zurück</button>
          <h2 className="text-lg font-semibold">{viewState.seriesName}</h2>
        </div>
        <FolderBreadcrumb items={breadcrumb} onNavigate={handleNavigate} />
        {seasonsLoading && <SkeletonGrid count={6} />}
        {seasons && seasons.length > 0 && (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {seasons.map((season) => (
              <button
                key={season.Id}
                onClick={() => setViewState({ level: 'episodes', externalId: season.Id, seasonName: season.Name })}
                className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-bg-surface p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-lg hover:border-brand-500/30"
              >
                <div className="flex h-24 w-16 items-center justify-center rounded-lg overflow-hidden bg-purple-500/10 border border-purple-500/20">
                  <JellyfinImage
                    accessToken={accessToken}
                    serverId={server.id}
                    itemId={season.Id}
                    name={season.Name}
                    width={200}
                    height={300}
                    className="h-full w-full object-cover"
                    fallback={<Film className="h-8 w-8 text-purple-400" />}
                  />
                </div>
                <p className="text-sm font-medium truncate w-full">{season.Name}</p>
                {season.ProductionYear && (
                  <p className="text-xs text-fg-muted">{season.ProductionYear}</p>
                )}
              </button>
            ))}
          </div>
        )}
        {seasons && seasons.length === 0 && !seasonsLoading && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-fg-muted">
            <Film className="h-10 w-10 mb-3 opacity-40" />
            <p className="font-medium">Keine Staffeln gefunden</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setViewState({ level: 'seasons', localItemId: '', seriesName: '' })} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-fg hover:bg-bg transition-colors">← Zurück</button>
        <h2 className="text-lg font-semibold">{viewState.seasonName}</h2>
      </div>
      <FolderBreadcrumb items={breadcrumb} onNavigate={handleNavigate} />
      {episodesLoading && <SkeletonGrid count={8} />}
      {episodes && episodes.length > 0 && (
        <div className="space-y-2">
          {episodes.map((ep) => (
            <button
              key={ep.Id}
              onClick={() => setPlayingItem(ep)}
              className="flex w-full items-center gap-3 rounded-lg border border-border bg-bg-surface p-3 text-left transition-all hover:border-brand-500/30 hover:shadow"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
                <Play className="h-4 w-4 ml-0.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{ep.Name}</p>
                {ep.Overview && <p className="text-xs text-fg-muted line-clamp-1 mt-0.5">{ep.Overview}</p>}
              </div>
              {ep.RunTimeTicks && (
                <span className="text-xs text-fg-muted shrink-0">
                  {Math.round(ep.RunTimeTicks / 600000000)} min
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {episodes && episodes.length === 0 && !episodesLoading && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-fg-muted">
          <Film className="h-10 w-10 mb-3 opacity-40" />
          <p className="font-medium">Keine Episoden gefunden</p>
        </div>
      )}

      {playingItem && (
        <MediaPlayer
          item={{ id: playingItem.Id, libraryId: library.id, externalId: playingItem.Id, name: playingItem.Name, type: playingItem.Type ?? 'episode', watched: false, path: null, createdAt: '', updatedAt: '' }}
          accessToken={accessToken}
          server={server}
          onClose={() => setPlayingItem(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Music Browser (Artists → Albums → Songs + Player)                 */
/* ------------------------------------------------------------------ */

function MusicBrowser({ library, server, onBack }: {
  library: JellyfinLibrary;
  server: JellyfinServer;
  onBack: () => void;
}) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [viewState, setViewState] = useState<{ level: 'artists' } | {
    level: 'albums'; artistId: string; artistName: string;
  } | {
    level: 'songs'; artistId: string; albumId: string; albumName: string; artistName: string;
  }>({ level: 'artists' });

  const [playerState, setPlayerState] = useState<{
    tracks: JellyfinApiItem[];
    initialIndex: number;
  } | null>(null);

  const { data: artists, isLoading: artistsLoading } = useQuery<JellyfinApiItem[]>({
    queryKey: ['jellyfin-artists', server.id],
    queryFn: () => api.get<JellyfinApiItem[]>(`/jellyfin/artists?serverId=${server.id}`),
    staleTime: 60_000,
  });

  const { data: albums, isLoading: albumsLoading } = useQuery<JellyfinApiItem[]>({
    queryKey: ['jellyfin-albums', server.id, viewState.level === 'albums' ? viewState.artistId : ''],
    queryFn: () => api.get<JellyfinApiItem[]>(`/jellyfin/albums?serverId=${server.id}&artistId=${viewState.level === 'albums' ? viewState.artistId : ''}`),
    enabled: viewState.level === 'albums',
  });

  const { data: songs, isLoading: songsLoading } = useQuery<JellyfinApiItem[]>({
    queryKey: ['jellyfin-album-children', server.id, viewState.level === 'songs' ? viewState.albumId : ''],
    queryFn: () => api.get<JellyfinApiItem[]>(`/jellyfin/servers/${server.id}/items/${viewState.level === 'songs' ? viewState.albumId : ''}/children`),
    enabled: viewState.level === 'songs',
  });

  const breadcrumb: BreadcrumbItem[] = [
    { id: null, name: library.name },
  ];
  if (viewState.level === 'albums') {
    breadcrumb.push({ id: viewState.artistId, name: viewState.artistName });
  } else if (viewState.level === 'songs') {
    breadcrumb.push({ id: viewState.artistId, name: viewState.artistName });
    breadcrumb.push({ id: viewState.albumId, name: viewState.albumName });
  }

  function handleNavigate(index: number) {
    if (index === 0) setViewState({ level: 'artists' });
    else if (index === 1 && viewState.level === 'songs') {
      setViewState({ level: 'albums', artistId: viewState.artistId, artistName: viewState.artistName });
    }
  }

  function playSong(songsList: JellyfinApiItem[], index: number) {
    setPlayerState({ tracks: songsList, initialIndex: index });
  }

  if (viewState.level === 'artists') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-fg hover:bg-bg transition-colors">← Zurück</button>
          <h2 className="text-lg font-semibold">{library.name}</h2>
          <span className="rounded-full bg-bg-raised px-2.5 py-0.5 text-xs text-fg-muted">{artists?.length ?? 0}</span>
        </div>
        <FolderBreadcrumb items={breadcrumb} onNavigate={handleNavigate} />
        {artistsLoading && <SkeletonGrid count={12} />}
        {artists && artists.length > 0 && (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {artists.map((artist) => (
              <button
                key={artist.Id}
                onClick={() => setViewState({ level: 'albums', artistId: artist.Id, artistName: artist.Name })}
                className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-bg-surface p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-lg hover:border-brand-500/30"
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 border border-green-500/20 overflow-hidden">
                  <JellyfinImage
                    accessToken={accessToken}
                    serverId={server.id}
                    itemId={artist.Id}
                    name={artist.Name}
                    width={200}
                    height={200}
                    className="h-full w-full object-cover"
                    fallback={<Mic2 className="h-8 w-8 text-green-400" />}
                  />
                </div>
                <p className="text-sm font-medium truncate w-full">{artist.Name}</p>
              </button>
            ))}
          </div>
        )}
        {artists && artists.length === 0 && !artistsLoading && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-fg-muted">
            <Music className="h-10 w-10 mb-3 opacity-40" />
            <p className="font-medium">Keine Künstler gefunden</p>
            <p className="text-sm mt-1">Synchronisiere den Server.</p>
          </div>
        )}
      </div>
    );
  }

  if (viewState.level === 'albums') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setViewState({ level: 'artists' })} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-fg hover:bg-bg transition-colors">← Zurück</button>
          <h2 className="text-lg font-semibold">{viewState.artistName}</h2>
        </div>
        <FolderBreadcrumb items={breadcrumb} onNavigate={handleNavigate} />
        {albumsLoading && <SkeletonGrid count={8} />}
        {albums && albums.length > 0 && (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {albums.map((album) => (
              <button
                key={album.Id}
                onClick={() => setViewState({ level: 'songs', artistId: viewState.artistId, albumId: album.Id, albumName: album.Name, artistName: viewState.artistName })}
                className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-bg-surface p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-lg hover:border-brand-500/30"
              >
                <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-green-500/10 border border-green-500/20 overflow-hidden">
                  <JellyfinImage
                    accessToken={accessToken}
                    serverId={server.id}
                    itemId={album.Id}
                    name={album.Name}
                    width={300}
                    height={300}
                    className="h-full w-full object-cover"
                    fallback={<Disc3 className="h-10 w-10 text-green-400" />}
                  />
                </div>
                <p className="text-sm font-medium truncate w-full">{album.Name}</p>
                {album.ProductionYear && (
                  <p className="text-xs text-fg-muted">{album.ProductionYear}</p>
                )}
              </button>
            ))}
          </div>
        )}
        {albums && albums.length === 0 && !albumsLoading && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-fg-muted">
            <Disc3 className="h-10 w-10 mb-3 opacity-40" />
            <p className="font-medium">Keine Alben gefunden</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setViewState({ level: 'albums', artistId: viewState.artistId, artistName: viewState.artistName })} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-fg hover:bg-bg transition-colors">← Zurück</button>
        <h2 className="text-lg font-semibold">{viewState.albumName}</h2>
      </div>
      <FolderBreadcrumb items={breadcrumb} onNavigate={handleNavigate} />
      {songsLoading && <SkeletonGrid count={8} />}
      {songs && songs.length > 0 && (
        <div className="space-y-1">
          {songs.map((song, idx) => (
            <button
              key={song.Id}
              onClick={() => playSong(songs, idx)}
              className="flex w-full items-center gap-3 rounded-lg border border-border bg-bg-surface p-3 text-left transition-all hover:border-brand-500/30 hover:shadow"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
                <Play className="h-4 w-4 ml-0.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{song.Name}</p>
                {song.Artists && song.Artists.length > 0 && (
                  <p className="text-xs text-fg-muted truncate">{song.Artists.join(', ')}</p>
                )}
              </div>
              {song.RunTimeTicks && (
                <span className="text-xs text-fg-muted shrink-0">
                  {formatTime(song.RunTimeTicks / 10000000)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {songs && songs.length === 0 && !songsLoading && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-fg-muted">
          <Music className="h-10 w-10 mb-3 opacity-40" />
          <p className="font-medium">Keine Titel gefunden</p>
        </div>
      )}

      {playerState && accessToken && (
        <MusicPlayer
          tracks={playerState.tracks}
          initialIndex={playerState.initialIndex}
          server={server}
          accessToken={accessToken}
          onClose={() => setPlayerState(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FolderItemCard — Einzelkarte in FolderBrowser                     */
/* ------------------------------------------------------------------ */

function FolderItemCard({
  item,
  accessToken,
  serverId,
  onPlay,
  onOpenPhoto,
}: {
  item: JellyfinApiItem;
  accessToken: string | null;
  serverId: string;
  onPlay: () => void;
  onOpenPhoto: () => void;
}) {
  const isPhoto = item.Type?.toLowerCase() === 'photo' || item.Type?.toLowerCase() === 'image';
  const isVideo = ['movie', 'video', 'episode', 'series'].includes(item.Type?.toLowerCase() ?? '');

  return (
    <div className="group relative">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-border bg-bg-surface transition-all duration-200 group-hover:scale-[1.03] group-hover:shadow-xl">
        {/* Show Jellyfin cover image for ALL item types, fallback to icon */}
        <JellyfinImage
          accessToken={accessToken}
          serverId={serverId}
          itemId={item.Id}
          name={item.Name}
          width={300}
          height={450}
          className="h-full w-full object-cover"
          fallback={
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-bg-raised flex items-center justify-center">
              {isPhoto ? (
                <ImageIcon className="h-12 w-12 text-fg-muted/30" />
              ) : isVideo ? (
                <Film className="h-12 w-12 text-fg-muted/30" />
              ) : (
                <Music className="h-12 w-12 text-fg-muted/30" />
              )}
            </div>
          }
        />

        {isVideo && (
          <button
            onClick={onPlay}
            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 shadow-lg shadow-brand-500/30">
              <Play className="h-5 w-5 text-white ml-0.5" />
            </div>
          </button>
        )}
      </div>

      <div className="mt-2">
        <p className="text-sm font-medium truncate">{item.Name}</p>
        {item.ProductionYear && (
          <p className="text-xs text-fg-muted">{item.ProductionYear}</p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FolderBrowser — Ordner-Navigation für movies/homevideos/photos    */
/* ------------------------------------------------------------------ */

/* Helper to synchronously remove playingItem from session before unmount */
function clearPlayerFromSession(storageKey: string) {
  try {
    const current = JSON.parse(sessionStorage.getItem(storageKey) || '{}');
    current.playingItem = null;
    sessionStorage.setItem(storageKey, JSON.stringify(current));
  } catch { /* ignore */ }
}

function FolderBrowser({
  library,
  server,
  onBack,
}: {
  library: JellyfinLibrary;
  server: JellyfinServer;
  onBack: () => void;
}) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const storageKey = `jf-${library.id}`;

  // Persist browsing state across unmounts (e.g. token refresh)
  const [saved] = useState<{
    folderId?: string; breadcrumb?: BreadcrumbItem[]; playingItem?: JellyfinApiItem | null;
  }>(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  const [currentFolderId, setCurrentFolderId] = useState<string>(
    saved.folderId ?? library.externalId ?? library.id
  );
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>(
    saved.breadcrumb ?? [{ id: library.externalId ?? library.id, name: library.name }]
  );
  const [playingItem, _setPlayingItem] = useState<JellyfinApiItem | null>(null);
  function setPlayingItem(item: JellyfinApiItem | null) {
    if (item === null) {
      console.log('[TRACE FolderBrowser] setPlayingItem: null  ←  STACK:', new Error().stack?.split('\n').slice(2,6).join(' → '));
    } else {
      console.log('[TRACE FolderBrowser] setPlayingItem:', item.Name, '←  STACK:', new Error().stack?.split('\n').slice(2,6).join(' → '));
    }
    _setPlayingItem(item);
  }
  const prevPlayingRef = useRef(playingItem);
  useEffect(() => {
    if (prevPlayingRef.current !== playingItem) {
      console.log('[TRACE FolderBrowser] playingItem CHANGED:', prevPlayingRef.current?.Name, '->', playingItem?.Name);
      prevPlayingRef.current = playingItem;
    }
  }, [playingItem]);
  useEffect(() => {
    console.log('[TRACE FolderBrowser] MOUNT');
    return () => { console.log('[TRACE FolderBrowser] UNMOUNT — playingItem was:', playingItem?.Name); };
  }, []);
  const [photoItems, setPhotoItems] = useState<JellyfinApiItem[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  useEffect(() => {
    const payload = JSON.stringify({ folderId: currentFolderId, breadcrumb, playingItem });
    sessionStorage.setItem(storageKey, payload);
  }, [currentFolderId, breadcrumb, playingItem, storageKey]);

  // Clear persisted state when user explicitly goes back to library selection
  function handleBack() {
    try { sessionStorage.removeItem(storageKey); } catch { /* ignore */ }
    onBack();
  }

  const { data: contents, isLoading, error } = useQuery<JellyfinApiItem[]>({
    queryKey: ['jellyfin-folder-children', server.id, currentFolderId],
    queryFn: () =>
      api.get<JellyfinApiItem[]>(
        `/jellyfin/servers/${server.id}/items/${currentFolderId}/children`
      ),
    staleTime: 30_000,
  });

  const allFolders = contents?.filter(
    (c) => c.Type === 'Folder' || c.IsFolder
  ) ?? [];
  // Single-char folders (A, B, C...) are grouping — show as folder icons
  const groupingFolders = allFolders.filter((f) => f.Name?.length === 1);
  // Multi-char folders are film series/collections — show as cover tiles
  const collectionFolders = allFolders.filter((f) => f.Name?.length !== 1);
  const items = contents?.filter(
    (c) => c.Type !== 'Folder' && !c.IsFolder
  ) ?? [];

  const allPhotos = items.filter(
    (i) => i.Type?.toLowerCase() === 'photo' || i.Type?.toLowerCase() === 'image'
  );

  // Track when player state changes

  function handleNavigate(index: number) {
    const target = breadcrumb[index];
    if (!target) return;
    setBreadcrumb((prev) => prev.slice(0, index + 1));
    setCurrentFolderId(target.id ?? library.externalId ?? library.id);
  }

  function openFolder(folder: JellyfinApiItem) {
    setBreadcrumb((prev) => [...prev, { id: folder.Id, name: folder.Name }]);
    setCurrentFolderId(folder.Id);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-fg hover:bg-bg transition-colors"
        >
          ← Zurück
        </button>
        <h2 className="text-lg font-semibold">{library.name}</h2>
        {!isLoading && contents && (
          <span className="rounded-full bg-bg-raised px-2.5 py-0.5 text-xs text-fg-muted">
            {contents.length}
          </span>
        )}
      </div>

      <FolderBreadcrumb items={breadcrumb} onNavigate={handleNavigate} />

      {isLoading && <SkeletonGrid count={12} />}

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-danger/20 bg-danger/5 p-4 text-danger">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm">{(error as Error).message}</p>
        </div>
      )}

      {!isLoading && !error && contents && contents.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 text-fg-muted">
          <Film className="h-10 w-10 mb-3 opacity-40" />
          <p className="font-medium">Dieser Ordner ist leer</p>
        </div>
      )}

      {!isLoading && !error && (allFolders.length > 0 || items.length > 0) && (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {/* Grouping folders (A, B, C...) as folder icons */}
          {groupingFolders.map((folder) => (
            <button
              key={folder.Id}
              onClick={() => openFolder(folder)}
              className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-bg-surface p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-lg hover:border-brand-500/30"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
                <FolderOpen className="h-7 w-7" />
              </div>
              <p className="text-sm font-medium truncate w-full">{folder.Name}</p>
            </button>
          ))}
          {/* Film series / collections as cover tiles */}
          {collectionFolders.map((folder) => (
            <button
              key={folder.Id}
              onClick={() => openFolder(folder)}
              className="group relative"
            >
              <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-border bg-bg-surface transition-all duration-200 group-hover:scale-[1.03] group-hover:shadow-xl">
                <JellyfinImage
                  accessToken={accessToken}
                  serverId={server.id}
                  itemId={folder.Id}
                  name={folder.Name}
                  width={300}
                  height={450}
                  className="h-full w-full object-cover"
                  fallback={
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-bg-raised flex items-center justify-center">
                      <FolderOpen className="h-12 w-12 text-fg-muted/30" />
                    </div>
                  }
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 shadow-lg">
                    <FolderOpen className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>
              <p className="text-sm font-medium truncate mt-2">{folder.Name}</p>
            </button>
          ))}
          {/* Individual items (movies, episodes, photos) */}
          {items.map((item) => (
            <FolderItemCard
              key={item.Id}
              item={item}
              accessToken={accessToken}
              serverId={server.id}
              onPlay={() => setPlayingItem(item)}
              onOpenPhoto={() => {
                const idx = allPhotos.indexOf(item);
                if (idx >= 0) {
                  setPhotoItems(allPhotos);
                  setLightboxIndex(idx);
                }
              }}
            />
          ))}
        </div>
      )}

      {playingItem && (
        <MediaPlayer
          item={{
            id: playingItem.Id,
            libraryId: library.id,
            externalId: playingItem.Id,
            name: playingItem.Name,
            type: playingItem.Type ?? 'unknown',
            watched: false,
            path: null,
            createdAt: '',
            updatedAt: '',
          }}
          accessToken={accessToken}
          server={server}
          onClose={() => {
            console.log('[TRACE FolderBrowser] onClose called');
            setPlayingItem(null);
            clearPlayerFromSession(storageKey);
          }}
        />
      )}

      {/* Photo Lightbox */}
      {lightboxIndex >= 0 && photoItems.length > 0 && (
        <PhotoLightbox
          photos={photoItems}
          serverId={server.id}
          accessToken={accessToken ?? ''}
          initialIndex={lightboxIndex}
          onClose={() => {
            setLightboxIndex(-1);
            setPhotoItems([]);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Music Player (Full-screen overlay with Vidstack audio)            */
/* ------------------------------------------------------------------ */

function MusicPlayer({ tracks, initialIndex, server, accessToken, onClose }: {
  tracks: JellyfinApiItem[];
  initialIndex: number;
  server: JellyfinServer;
  accessToken: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [playing, setPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<'off' | 'all' | 'one'>('off');
  const [volume, setVolume] = useState(0.8);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLInputElement>(null);

  const [shuffledOrder] = useState<number[]>(() => {
    const arr = Array.from({ length: tracks.length }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i]!;
      arr[i] = arr[j]!;
      arr[j] = tmp;
    }
    return arr;
  });

  const currentTrack = tracks[index];
  if (!currentTrack) return null;

  const apiHost = getStreamBaseUrl();
  const streamUrl = `${apiHost}/api/v1/jellyfin/servers/${server.id}/items/${currentTrack.Id}/stream?type=Audio&token=${encodeURIComponent(accessToken)}`;

  const getNextIndex = useCallback((current: number, direction: 1 | -1): number => {
    if (shuffle) {
      const cur = shuffledOrder.indexOf(current);
      if (cur < 0) return 0;
      if (direction === 1) {
        return cur < shuffledOrder.length - 1 ? shuffledOrder[cur + 1]! : (repeat === 'all' ? shuffledOrder[0]! : current);
      }
      return cur > 0 ? shuffledOrder[cur - 1]! : (repeat === 'all' ? shuffledOrder[shuffledOrder.length - 1]! : current);
    }
    if (direction === 1) {
      return current < tracks.length - 1 ? current + 1 : (repeat === 'all' ? 0 : current);
    }
    return current > 0 ? current - 1 : (repeat === 'all' ? tracks.length - 1 : current);
  }, [shuffle, shuffledOrder, tracks.length, repeat]);

  const nextTrackFn = useCallback(() => {
    if (repeat === 'one') {
      if (audioRef.current) audioRef.current.currentTime = 0;
      return;
    }
    setIndex((prev) => getNextIndex(prev, 1));
  }, [repeat, getNextIndex]);

  const prevTrack = useCallback(() => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    setIndex((prev) => getNextIndex(prev, -1));
  }, [getNextIndex]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => setError('Wiedergabe fehlgeschlagen'));
    } else {
      audio.pause();
    }
  }, []);

  const nextTrackRef = useRef(nextTrackFn);
  nextTrackRef.current = nextTrackFn;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => { setDuration(audio.duration); audio.play().catch(() => {}); };
    const onEnd = () => nextTrackRef.current();
    const onErr = () => setError('Audio konnte nicht geladen werden');
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('error', onErr);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    setCurrentTime(0);
    setDuration(0);
    setError(null);
    audio.load();

    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('error', onErr);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, [currentTrack.Id]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const muted = volume < 0.01;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <div className="flex flex-col items-center max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        {/* Close */}
        <div className="w-full flex justify-between items-center mb-6">
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors rounded-md px-2 py-1 text-sm">
            Schließen
          </button>
          <span className="text-xs text-white/30">
            {index + 1} / {tracks.length}
          </span>
        </div>

        {/* Cover Art */}
        <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-2xl overflow-hidden shadow-2xl mb-8 bg-bg-raised flex items-center justify-center">
          <JellyfinImage
            accessToken={accessToken}
            serverId={server.id}
            itemId={currentTrack.AlbumId ?? currentTrack.Id}
            name={currentTrack.Album ?? currentTrack.Name}
            width={400}
            height={400}
            className="w-full h-full object-cover"
            fallback={<Disc3 className="h-16 w-16 text-green-400" />}
          />
        </div>

        {/* Track Info */}
        <h3 className="text-xl font-semibold text-white text-center truncate w-full max-w-sm">
          {currentTrack.Name}
        </h3>
        <p className="text-sm text-white/60 mt-1 text-center truncate w-full max-w-sm">
          {currentTrack.Artist ?? currentTrack.AlbumArtist ?? currentTrack.Album ?? ''}
        </p>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 mt-4 text-danger text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Progress Bar */}
        <div className="w-full mt-8 space-y-1">
          <input
            ref={progressRef}
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={(e) => {
              const t = parseFloat(e.target.value);
              if (audioRef.current) audioRef.current.currentTime = t;
              setCurrentTime(t);
            }}
            className="w-full h-1.5 appearance-none cursor-pointer rounded-full bg-white/20 accent-brand-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-500"
          />
          <div className="flex justify-between text-xs text-white/40">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-5 mt-6">
          <button
            onClick={() => setShuffle(!shuffle)}
            className={cn(
              'p-2 rounded-full transition-colors',
              shuffle ? 'text-brand-500' : 'text-white/50 hover:text-white',
            )}
            title="Zufallswiedergabe"
          >
            <Shuffle className="h-5 w-5" />
          </button>

          <button onClick={prevTrack} className="p-2 text-white/70 hover:text-white transition-colors" title="Vorheriger Titel">
            <SkipBack className="h-6 w-6" />
          </button>

          <button
            onClick={togglePlay}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 hover:bg-brand-400 transition-colors active:scale-95"
            title={playing ? 'Pause' : 'Abspielen'}
          >
            {playing ? (
              <Pause className="h-6 w-6 text-white" />
            ) : (
              <Play className="h-6 w-6 text-white ml-0.5" />
            )}
          </button>

          <button onClick={nextTrackFn} className="p-2 text-white/70 hover:text-white transition-colors" title="Nächster Titel">
            <SkipForward className="h-6 w-6" />
          </button>

          <button
            onClick={() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')}
            className={cn(
              'p-2 rounded-full transition-colors relative',
              repeat !== 'off' ? 'text-brand-500' : 'text-white/50 hover:text-white',
            )}
            title={
              repeat === 'off' ? 'Keine Wiederholung' :
              repeat === 'all' ? 'Alle wiederholen' : 'Einzeln wiederholen'
            }
          >
            <Repeat className="h-5 w-5" />
            {repeat === 'one' && (
              <span className="absolute -top-0.5 -right-0.5 text-[9px] font-bold">1</span>
            )}
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2 mt-6 w-full max-w-xs">
          <button
            onClick={() => setVolume(muted ? 0.8 : 0)}
            className="text-white/50 hover:text-white transition-colors shrink-0"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="flex-1 h-1 appearance-none cursor-pointer rounded-full bg-white/20 accent-brand-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-500"
          />
        </div>

        {/* Hidden Audio Element (for Vidstack-compatible playback) */}
        <audio
          ref={audioRef}
          src={streamUrl}
          preload="auto"
          className="hidden"
        />
      </div>
    </div>
  );
}
