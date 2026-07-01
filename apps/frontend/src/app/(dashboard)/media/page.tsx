'use client';
import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  Plus, FolderOpen, Image, Loader2, AlertCircle, Hash, Tag, FileText, X,
  FolderSearch, Star, MapPin, ChevronLeft, ChevronRight, Camera, Video,
  Heart, Filter, Globe, ScanSearch, Search, Check,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import dynamic from 'next/dynamic';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface MediaSource {
  id: string;
  name: string;
  type: 'nas_path' | 'windows_path' | 'upload_temp';
  path: string;
  createdAt: string;
}

interface MediaAlbum {
  id: string;
  name: string;
  description: string;
  type: 'standard' | 'travel' | 'event';
  createdAt: string;
}

interface MediaFile {
  id: string;
  filename: string;
  relativePath: string;
  mimeType: string;
  width?: number;
  height?: number;
  thumbnailPath?: string;
  gpsLat?: number;
  gpsLng?: number;
  takenAt?: string;
  createdAt: string;
  isFavorite: boolean;
  fileSize?: number;
}

interface ScanResult {
  scanned: number;
  added: number;
  skipped: number;
  errors: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Tabs                                                              */
/* ------------------------------------------------------------------ */

type TabId = 'sources' | 'albums' | 'gallery' | 'map';

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: 'sources', label: 'Quellen', icon: <FolderOpen className="h-4 w-4" /> },
  { id: 'albums', label: 'Alben', icon: <Image className="h-4 w-4" /> },
  { id: 'gallery', label: 'Galerie', icon: <Camera className="h-4 w-4" /> },
  { id: 'map', label: 'Karte', icon: <MapPin className="h-4 w-4" /> },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const SOURCE_TYPE_LABELS: Record<MediaSource['type'], string> = {
  nas_path: 'NAS-Pfad',
  windows_path: 'Windows-Pfad',
  upload_temp: 'Upload (temporär)',
};

const SOURCE_TYPE_ICONS: Record<MediaSource['type'], ReactNode> = {
  nas_path: <Hash className="h-4 w-4" />,
  windows_path: <FileText className="h-4 w-4" />,
  upload_temp: <Tag className="h-4 w-4" />,
};

const ALBUM_TYPE_LABELS: Record<MediaAlbum['type'], string> = {
  standard: 'Standard',
  travel: 'Reise',
  event: 'Event',
};

function formatDateGroup(dateStr: string | undefined): string {
  if (!dateStr) return 'Ohne Datum';
  const d = new Date(dateStr);
  const months = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
  ];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function dateGroupKey(dateStr: string | undefined): string {
  if (!dateStr) return '0000-00';
  return dateStr.substring(0, 7);
}

function isVideo(mimeType?: string): boolean {
  return !!mimeType?.startsWith('video/');
}

function isImage(mimeType?: string): boolean {
  return !!mimeType?.startsWith('image/');
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                         */
/* ------------------------------------------------------------------ */

export default function MediaPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('sources');
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated && !accessToken) {
      router.push('/login');
    }
  }, [hydrated, accessToken, router]);

  if (!hydrated || !accessToken) {
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
          <h1 className="text-2xl font-semibold">Medien</h1>
          <p className="text-sm text-fg-muted mt-1">
            Verwalte deine Foto- und Videoquellen, Alben und die Galerie.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-md border border-border bg-bg-surface p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 rounded px-4 py-1.5 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-bg-raised text-fg'
                : 'text-fg-muted hover:text-fg',
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'sources' && (
        <SourcesTab onCreate={() => setShowSourceModal(true)} />
      )}
      {activeTab === 'albums' && (
        <AlbumsTab onCreate={() => setShowAlbumModal(true)} />
      )}
      {activeTab === 'gallery' && <GalleryTab />}
      {activeTab === 'map' && <MapView />}

      {/* Modals */}
      {showSourceModal && <SourceDialog onClose={() => setShowSourceModal(false)} />}
      {showAlbumModal && <AlbumDialog onClose={() => setShowAlbumModal(false)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sources Tab                                                       */
/* ------------------------------------------------------------------ */

function SourcesTab({ onCreate }: { onCreate: () => void }) {
  const { data: sources, isLoading, error } = useQuery<MediaSource[]>({
    queryKey: ['media-sources'],
    queryFn: () => api.get<MediaSource[]>('/media/sources'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-fg-muted">
          {sources?.length ?? 0} Quelle{(sources?.length ?? 0) !== 1 ? 'n' : ''}
        </p>
        <button
          onClick={onCreate}
          className="flex items-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-bg hover:bg-brand-400 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Quelle hinzufügen
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20 text-fg-muted">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Lade Quellen …
        </div>
      )}

      {error && !isLoading && (
        <div className="flex items-start gap-3 rounded-lg border border-danger/20 bg-danger/5 p-4 text-danger">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Fehler beim Laden der Quellen</p>
            <p className="text-sm text-danger/80 mt-1">{(error as Error).message}</p>
          </div>
        </div>
      )}

      {!isLoading && !error && (sources?.length ?? 0) > 0 && (
        <div className="grid gap-3">
          {sources!.map((source) => (
            <ScanSourceCard key={source.id} source={source} />
          ))}
        </div>
      )}

      {!isLoading && !error && (sources?.length ?? 0) === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-fg-muted">
          <FolderOpen className="h-10 w-10 mb-3 opacity-40" />
          <p className="font-medium">Noch keine Medienquellen</p>
          <p className="text-sm mt-1">Füge deine erste Quelle hinzu, um Fotos und Videos zu verwalten.</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Scan Source Card                                                  */
/* ------------------------------------------------------------------ */

function ScanSourceCard({ source }: { source: MediaSource }) {
  const qc = useQueryClient();
  const [showResult, setShowResult] = useState(false);
  const [editing, setEditing] = useState(false);

  const scanMut = useMutation({
    mutationFn: () =>
      api.post<ScanResult>(`/media/sources/${source.id}/index`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['media-sources'] });
      qc.invalidateQueries({ queryKey: ['media-files'] });
      setShowResult(true);
      setTimeout(() => setShowResult(false), 5000);
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => api['delete'](`/media/sources/${source.id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['media-sources'] }),
  });

  return (
    <>
      <div className="flex items-center gap-4 rounded-lg border border-border bg-bg-surface p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-500/10 text-brand-500">
          {SOURCE_TYPE_ICONS[source.type]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{source.name}</p>
          <p className="text-xs text-fg-muted truncate font-mono">{source.path}</p>
        </div>
        <span className="shrink-0 rounded-full bg-bg px-2.5 py-0.5 text-[11px] font-medium text-fg-muted border border-border">
          {SOURCE_TYPE_LABELS[source.type]}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {showResult && scanMut.data && (
            <div className="flex items-center gap-1.5 text-xs font-medium">
              {scanMut.data.errors > 0 ? (
                <span className="text-danger">{scanMut.data.errors} Fehler</span>
              ) : (
                <span className="text-green-500">+{scanMut.data.added} neu · {scanMut.data.skipped} übersprungen</span>
              )}
            </div>
          )}
          <button onClick={() => setEditing(true)} className="rounded-md p-1.5 text-fg-muted hover:text-fg hover:bg-bg transition-colors" title="Bearbeiten">
            <FileText className="h-4 w-4" />
          </button>
          <button
            onClick={() => scanMut.mutate()}
            disabled={scanMut.isPending}
            className="flex items-center gap-1.5 rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-bg hover:bg-brand-400 disabled:opacity-50 transition-colors"
          >
            {scanMut.isPending ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> Scanne…</>
            ) : (
              <span>Jetzt scannen</span>
            )}
          </button>
        </div>
      </div>
      {editing && <EditSourceDialog source={source} onClose={() => setEditing(false)} onDelete={() => { if (confirm('Quelle wirklich löschen?')) deleteMut.mutate(); setEditing(false); }} />}
    </>
  );
}

function EditSourceDialog({ source, onClose, onDelete }: { source: MediaSource; onClose: () => void; onDelete: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(source.name);
  const [path, setPath] = useState(source.path);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (body: { name?: string; path?: string }) =>
      api.put(`/media/sources/${source.id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['media-sources'] }); onClose(); },
    onError: (err) => setError((err as Error).message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (!name.trim() || !path.trim()) { setError('Name und Pfad dürfen nicht leer sein.'); return; }
    mutation.mutate({ name: name.trim(), path: path.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-lg border border-border bg-bg-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Quelle bearbeiten</h2>
          <button type="button" onClick={onClose} className="text-fg-muted hover:text-fg"><X className="h-5 w-5" /></button>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Pfad</label>
          <input type="text" value={path} onChange={(e) => setPath(e.target.value)} className="w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/50" required />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onDelete} className="rounded-md border border-danger/30 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/5 transition-colors">Löschen</button>
          <button type="button" onClick={onClose} className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-bg transition-colors">Abbrechen</button>
          <button type="submit" disabled={mutation.isPending} className="flex-1 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-bg hover:bg-brand-400 disabled:opacity-50 transition-colors">
            {mutation.isPending ? 'Speichert…' : 'Speichern'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Albums Tab                                                        */
/* ------------------------------------------------------------------ */

function AlbumsTab({ onCreate }: { onCreate: () => void }) {
  const qc = useQueryClient();
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [selectedAlbumName, setSelectedAlbumName] = useState<string>('');
  const [editingAlbum, setEditingAlbum] = useState<MediaAlbum | null>(null);
  const [showAddFiles, setShowAddFiles] = useState<string | null>(null);

  const { data: albums, isLoading, error } = useQuery<MediaAlbum[]>({
    queryKey: ['media-albums'],
    queryFn: () => api.get<MediaAlbum[]>('/media/albums'),
  });

  const deleteAlbumMut = useMutation({
    mutationFn: (id: string) => api['delete'](`/media/albums/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['media-albums'] }),
  });

  const favMut = useMutation({
    mutationFn: (fileId: string) =>
      api.post<{ isFavorite: boolean }>(`/media/files/${fileId}/favorite`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['media-album-files', selectedAlbumId] });
      qc.invalidateQueries({ queryKey: ['media-files'] });
    },
  });

  return (
    <div className="space-y-4">
      {selectedAlbumId ? (
        <AlbumDetailView
          albumId={selectedAlbumId}
          albumName={selectedAlbumName}
          onBack={() => { setSelectedAlbumId(null); setSelectedAlbumName(''); }}
          onFavoriteToggle={(fileId) => favMut.mutate(fileId)}
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-fg-muted">
              {albums?.length ?? 0} Album{(albums?.length ?? 0) !== 1 ? 's' : ''}
            </p>
            <button
              onClick={onCreate}
              className="flex items-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-bg hover:bg-brand-400 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Album erstellen
            </button>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-20 text-fg-muted">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Lade Alben …
            </div>
          )}

          {error && !isLoading && (
            <div className="flex items-start gap-3 rounded-lg border border-danger/20 bg-danger/5 p-4 text-danger">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Fehler beim Laden der Alben</p>
                <p className="text-sm text-danger/80 mt-1">{(error as Error).message}</p>
              </div>
            </div>
          )}

          {!isLoading && !error && (albums?.length ?? 0) > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {albums!.map((album) => (
                <div key={album.id} className="group rounded-lg border border-border bg-bg-surface overflow-hidden">
                  <button
                    onClick={() => { setSelectedAlbumId(album.id); setSelectedAlbumName(album.name); }}
                    className="flex flex-col gap-2 p-4 text-left hover:border-brand-500/50 transition-colors cursor-pointer w-full"
                  >
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4 text-brand-500" />
                      <p className="text-sm font-medium truncate">{album.name}</p>
                    </div>
                    {album.description && (
                      <p className="text-xs text-fg-muted line-clamp-2">{album.description}</p>
                    )}
                    <span className="self-start rounded-full bg-bg px-2.5 py-0.5 text-[11px] font-medium text-fg-muted border border-border">
                      {ALBUM_TYPE_LABELS[album.type]}
                    </span>
                  </button>
                  <div className="flex items-center gap-1 border-t border-border px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingAlbum(album)} className="rounded-md p-1 text-fg-muted hover:text-fg hover:bg-bg text-xs transition-colors" title="Bearbeiten">Bearbeiten</button>
                    <button onClick={() => setShowAddFiles(album.id)} className="rounded-md p-1 text-fg-muted hover:text-fg hover:bg-bg text-xs transition-colors" title="Dateien hinzufügen">+ Dateien</button>
                    <button onClick={() => { if (confirm('Album wirklich löschen?')) deleteAlbumMut.mutate(album.id); }} className="rounded-md p-1 text-fg-muted hover:text-danger hover:bg-danger/10 text-xs transition-colors ml-auto" title="Löschen">Löschen</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && !error && (albums?.length ?? 0) === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-fg-muted">
              <Image className="h-10 w-10 mb-3 opacity-40" />
              <p className="font-medium">Noch keine Alben</p>
              <p className="text-sm mt-1">Erstelle dein erstes Album, um Medien zu gruppieren.</p>
            </div>
          )}
        </>
      )}

      {/* Album editor modal */}
      {editingAlbum && (
        <AlbumEditDialog
          album={editingAlbum}
          onClose={() => setEditingAlbum(null)}
        />
      )}

      {/* Add files to album modal */}
      {showAddFiles && (
        <AddFilesToAlbumDialog
          albumId={showAddFiles}
          onClose={() => setShowAddFiles(null)}
        />
      )}
    </div>
  );
}

function AlbumEditDialog({ album, onClose }: { album: MediaAlbum; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(album.name);
  const [description, setDescription] = useState(album.description ?? '');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (body: { name?: string; description?: string }) =>
      api.put(`/media/albums/${album.id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['media-albums'] }); onClose(); },
    onError: (err) => setError((err as Error).message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (!name.trim()) { setError('Name darf nicht leer sein.'); return; }
    mutation.mutate({ name: name.trim(), description: description.trim() || undefined });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-lg border border-border bg-bg-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Album bearbeiten</h2>
          <button type="button" onClick={onClose} className="text-fg-muted hover:text-fg"><X className="h-5 w-5" /></button>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Beschreibung (optional)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50" />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-bg transition-colors">Abbrechen</button>
          <button type="submit" disabled={mutation.isPending} className="flex-1 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-bg hover:bg-brand-400 disabled:opacity-50 transition-colors">{mutation.isPending ? 'Speichert…' : 'Speichern'}</button>
        </div>
      </form>
    </div>
  );
}

function AddFilesToAlbumDialog({ albumId, onClose }: { albumId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const { data: allFiles, isLoading } = useQuery<MediaFile[]>({
    queryKey: ['media-files-all'],
    queryFn: () => api.get<MediaFile[]>('/media/files?limit=500'),
  });

  const filtered = (allFiles ?? []).filter(f => !search || f.filename.toLowerCase().includes(search.toLowerCase()));

  const addMut = useMutation({
    mutationFn: (mediaIds: string[]) => api.post(`/media/albums/${albumId}/items`, { mediaIds }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['media-album-files', albumId] }); onClose(); },
  });

  function toggle(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl max-h-[80vh] space-y-4 rounded-lg border border-border bg-bg-surface p-6 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Dateien zum Album hinzufügen</h2>
          <button type="button" onClick={onClose} className="text-fg-muted hover:text-fg"><X className="h-5 w-5" /></button>
        </div>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Dateiname suchen..." className="w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50" />
        {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-fg-muted" /></div>}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {filtered.slice(0, 100).map((f) => (
            <button key={f.id} onClick={() => toggle(f.id)}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${selectedIds.includes(f.id) ? 'border-brand-500' : 'border-border hover:border-brand-500/50'}`}>
              {f.thumbnailPath ? <img src={f.thumbnailPath} alt={f.filename} className="h-full w-full object-cover" /> :
                <div className="flex h-full items-center justify-center bg-bg-raised"><FileText className="h-6 w-6 opacity-30" /></div>}
              {selectedIds.includes(f.id) && <div className="absolute top-1 right-1 rounded-full bg-brand-500 p-0.5"><Check className="h-3 w-3 text-bg" /></div>}
            </button>
          ))}
        </div>
        {filtered.length === 0 && !isLoading && <p className="text-sm text-fg-muted text-center py-4">Keine Dateien gefunden</p>}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-bg transition-colors">Abbrechen</button>
          <button onClick={() => addMut.mutate(selectedIds)} disabled={selectedIds.length === 0 || addMut.isPending}
            className="flex-1 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-bg hover:bg-brand-400 disabled:opacity-50 transition-colors">
            {addMut.isPending ? 'Füge hinzu…' : `${selectedIds.length} Datei(en) hinzufügen`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Album Detail View                                                 */
/* ------------------------------------------------------------------ */

interface AlbumMediaItem {
  file: MediaFile;
  sortOrder: number;
}

function AlbumDetailView({
  albumId,
  albumName,
  onBack,
  onFavoriteToggle,
}: {
  albumId: string;
  albumName: string;
  onBack: () => void;
  onFavoriteToggle: (fileId: string) => void;
}) {
  const { data: albumItems, isLoading, error } = useQuery<AlbumMediaItem[]>({
    queryKey: ['media-album-files', albumId],
    queryFn: () => api.get<AlbumMediaItem[]>(`/media/albums/${albumId}/media`),
  });

  const files = albumItems?.map((item) => item.file) ?? [];

  // Group by date
  const grouped = files.reduce<Record<string, MediaFile[]>>((acc, f) => {
    const key = dateGroupKey(f.takenAt ?? f.createdAt);
    (acc[key] ??= []).push(f);
    return acc;
  }, {});

  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a));

  return (
    <div className="space-y-4">
      {/* Back button + header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-md border border-border bg-bg-surface px-3 py-1.5 text-sm font-medium text-fg hover:bg-bg-raised transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Zurück
        </button>
        <div>
          <h2 className="text-lg font-semibold">{albumName}</h2>
          <p className="text-xs text-fg-muted">{files.length} Dateien</p>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-20 text-fg-muted">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Lade Medien …
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="flex items-start gap-3 rounded-lg border border-danger/20 bg-danger/5 p-4 text-danger">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Fehler beim Laden der Album-Medien</p>
            <p className="text-sm text-danger/80 mt-1">{(error as Error).message}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && files.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-fg-muted">
          <Image className="h-10 w-10 mb-3 opacity-40" />
          <p className="font-medium">Album ist leer</p>
          <p className="text-sm mt-1">Füge Medien zu diesem Album hinzu, um sie hier zu sehen.</p>
        </div>
      )}

      {/* File grid grouped by date */}
      {!isLoading && !error && sortedGroups.length > 0 && (
        <div className="space-y-6">
          {sortedGroups.map(([groupKey, groupFiles]) => (
            <div key={groupKey}>
              <h3 className="text-sm font-semibold text-fg-muted mb-3 border-b border-border pb-1">
                {groupKey === '0000-00' ? 'Ohne Datum' : formatDateGroup(groupFiles[0]?.takenAt)}
                <span className="text-xs ml-2 text-fg-subtle">{groupFiles.length} Dateien</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {groupFiles.map((file) => (
                  <div
                    key={file.id}
                    className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-bg-surface hover:border-brand-500/50 transition-colors"
                  >
                    {/* Thumbnail */}
                    {file.thumbnailPath ? (
                      <img
                        src={file.thumbnailPath}
                        alt={file.filename}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : isVideo(file.mimeType) ? (
                      <div className="flex h-full items-center justify-center bg-bg-raised">
                        <Video className="h-10 w-10 opacity-30" />
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center bg-bg-raised">
                        <FileText className="h-10 w-10 opacity-30" />
                      </div>
                    )}

                    {/* Video overlay indicator */}
                    {isVideo(file.mimeType) && file.thumbnailPath && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="rounded-full bg-black/50 p-2">
                          <Video className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    )}

                    {/* Favorite button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFavoriteToggle(file.id);
                      }}
                      className={cn(
                        'absolute top-1.5 right-1.5 rounded-full p-1 transition-all opacity-0 group-hover:opacity-100',
                        file.isFavorite
                          ? 'text-red-400 bg-black/40'
                          : 'text-white bg-black/40 hover:text-red-300',
                      )}
                    >
                      <Star
                        className={cn(
                          'h-4 w-4',
                          file.isFavorite && 'fill-current',
                        )}
                      />
                    </button>

                    {/* Info overlay */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] text-white truncate">{file.filename}</p>
                      {file.width && file.height && (
                        <p className="text-[9px] text-white/70">{file.width}×{file.height}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Gallery Tab (full implementation)                                 */
/* ------------------------------------------------------------------ */

function GalleryTab() {
  const qc = useQueryClient();
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [favoriteFilter, setFavoriteFilter] = useState(false);
  const [search, setSearch] = useState<string>('');
  const [lightboxFile, setLightboxFile] = useState<MediaFile | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addToAlbumId, setAddToAlbumId] = useState<string | null>(null);

  // Get sources for the filter dropdown
  const { data: sources } = useQuery<MediaSource[]>({
    queryKey: ['media-sources'],
    queryFn: () => api.get<MediaSource[]>('/media/sources'),
    staleTime: 30_000,
  });

  // Fetch files (simple query — API returns plain array)
  const {
    data: allFiles,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['media-files', sourceFilter, favoriteFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (sourceFilter) params.set('sourceId', sourceFilter);
      return api.get<MediaFile[]>(`/media/files?${params.toString()}`);
    },
    staleTime: 10_000,
  });

  const files = (allFiles ?? []).filter(f => {
    if (search && !f.filename.toLowerCase().includes(search.toLowerCase())) return false;
    if (favoriteFilter && !f.isFavorite) return false;
    return true;
  });

  // Selection helpers
  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function clearSelection() { setSelectedIds(new Set()); setSelectMode(false); }

  // Favorite toggle mutation
  const favMut = useMutation({
    mutationFn: (fileId: string) =>
      api.post<{ isFavorite: boolean }>(`/media/files/${fileId}/favorite`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['media-files'] });
    },
  });

  // Group by year-month
  const grouped = files.reduce<Record<string, MediaFile[]>>((acc, f) => {
    const key = dateGroupKey(f.takenAt ?? f.createdAt);
    (acc[key] ??= []).push(f);
    return acc;
  }, {});

  // Sort groups descending by date key
  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a));

  // Lightbox navigation
  function openLightbox(file: MediaFile) {
    const idx = files.findIndex((f) => f.id === file.id);
    setLightboxFile(file);
    setLightboxIndex(idx);
  }

  function closeLightbox() {
    setLightboxFile(null);
    setLightboxIndex(-1);
  }

  function goNext() {
    if (lightboxIndex < files.length - 1) {
      const next = files[lightboxIndex + 1];
      if (next) setLightboxFile(next);
      setLightboxIndex(lightboxIndex + 1);
    }
  }

  function goPrev() {
    if (lightboxIndex > 0) {
      const prev = files[lightboxIndex - 1];
      if (prev) setLightboxFile(prev);
      setLightboxIndex(lightboxIndex - 1);
    }
  }

  // Keyboard shortcuts for lightbox
  useEffect(() => {
    if (!lightboxFile) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxFile, lightboxIndex, files]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-fg-muted" />
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="rounded-md border border-border bg-bg-surface px-3 py-1.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          >
            <option value="">Alle Quellen</option>
            {sources?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="flex items-center gap-1.5 rounded-md border border-border bg-bg-surface px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-fg-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Dateiname suchen..." className="bg-transparent text-sm text-fg outline-none w-36 placeholder:text-fg-subtle" />
          {search && <button onClick={() => setSearch('')} className="text-fg-subtle hover:text-fg"><X className="h-3 w-3" /></button>}
        </div>

        <button
          onClick={() => setFavoriteFilter((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
            favoriteFilter
              ? 'border-brand-500/50 bg-brand-500/10 text-brand-500'
              : 'border-border text-fg-muted hover:text-fg',
          )}
        >
          <Heart
            className={cn('h-3.5 w-3.5', favoriteFilter && 'fill-current')}
          />
          Favoriten
        </button>

        {/* Select mode toggle */}
        <button
          onClick={() => { if (selectMode) clearSelection(); else setSelectMode(true); }}
          className={cn(
            'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
            selectMode
              ? 'border-brand-500/50 bg-brand-500/10 text-brand-500'
              : 'border-border text-fg-muted hover:text-fg',
          )}
        >
          <Check className="h-3.5 w-3.5" />
          Auswählen
        </button>

        {/* Selection actions */}
        {selectMode && selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-fg-muted">{selectedIds.size} ausgewählt</span>
            <button onClick={() => setAddToAlbumId('__select__')} className="rounded-md bg-brand-500 px-3 py-1 text-xs font-medium text-bg hover:bg-brand-400 transition-colors">
              + Zu Album
            </button>
            <button onClick={clearSelection} className="text-xs text-fg-muted hover:text-fg transition-colors">
              Abbrechen
            </button>
          </div>
        )}

        <span className="text-xs text-fg-muted ml-auto">
          {files.length} Dateien
          {sourceFilter && sources ? ` · ${sources.find((s) => s.id === sourceFilter)?.name ?? ''}` : ''}
        </span>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-20 text-fg-muted">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Lade Medien …
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="flex items-start gap-3 rounded-lg border border-danger/20 bg-danger/5 p-4 text-danger">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Fehler beim Laden</p>
            <p className="text-sm text-danger/80 mt-1">{(error as Error).message}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && files.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-fg-muted">
          <Camera className="h-12 w-12 mb-3 opacity-30" />
          <p className="font-medium">Noch keine indexierten Medien</p>
          <p className="text-sm mt-1 max-w-md text-center">
            {favoriteFilter
              ? 'Keine Favoriten gefunden. Markiere Medien als Favorit, um sie hier zu sehen.'
              : 'Scanne eine Quelle im Reiter „Quellen" mit dem „Jetzt scannen"-Button.'}
          </p>
        </div>
      )}

      {/* Gallery Grid */}
      {!isLoading && !error && sortedGroups.length > 0 && (
        <div className="space-y-8">
          {sortedGroups.map(([groupKey, groupFiles]) => (
            <div key={groupKey}>
              <h3 className="text-sm font-semibold text-fg-muted mb-3 sticky top-0 bg-bg py-2 z-10 border-b border-border">
                {groupKey === '0000-00' ? 'Ohne Datum' : formatDateGroup(groupFiles[0]?.takenAt)}
                <span className="text-xs ml-2 text-fg-subtle">{groupFiles.length} Dateien</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {groupFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`group relative aspect-square rounded-lg overflow-hidden border transition-colors cursor-pointer ${
                      selectMode && selectedIds.has(file.id)
                        ? 'border-brand-500 ring-2 ring-brand-500/30'
                        : selectMode
                          ? 'border-border hover:border-brand-500/50'
                          : 'border-border hover:border-brand-500/50'
                    }`}
                    onClick={() => selectMode ? toggleSelect(file.id) : openLightbox(file)}
                  >
                    {/* Select checkbox */}
                    {selectMode && (
                      <div className="absolute top-1.5 left-1.5 z-10">
                        <div className={`rounded-full p-0.5 ${selectedIds.has(file.id) ? 'bg-brand-500' : 'bg-black/40'}`}>
                          <Check className={`h-4 w-4 ${selectedIds.has(file.id) ? 'text-white' : 'text-white/70'}`} />
                        </div>
                      </div>
                    )}
                    {/* Thumbnail */}
                    {file.thumbnailPath ? (
                      <img
                        src={file.thumbnailPath}
                        alt={file.filename}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : isVideo(file.mimeType) ? (
                      <div className="flex h-full items-center justify-center bg-bg-raised">
                        <Video className="h-10 w-10 opacity-30" />
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center bg-bg-raised">
                        <FileText className="h-10 w-10 opacity-30" />
                      </div>
                    )}

                    {/* Video overlay indicator */}
                    {isVideo(file.mimeType) && file.thumbnailPath && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="rounded-full bg-black/50 p-2">
                          <Video className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    )}

                    {/* GPS indicator */}
                    {file.gpsLat != null && file.gpsLng != null && (
                      <div className="absolute top-1.5 left-1.5 rounded bg-black/50 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MapPin className="h-3 w-3 text-white" />
                      </div>
                    )}

                    {/* Favorite button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        favMut.mutate(file.id);
                      }}
                      className={cn(
                        'absolute top-1.5 right-1.5 rounded-full p-1 transition-all opacity-0 group-hover:opacity-100',
                        file.isFavorite
                          ? 'text-red-400 bg-black/40'
                          : 'text-white bg-black/40 hover:text-red-300',
                      )}
                    >
                      <Star
                        className={cn(
                          'h-4 w-4',
                          file.isFavorite && 'fill-current',
                        )}
                      />
                    </button>

                    {/* Filename overlay */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] text-white truncate">{file.filename}</p>
                      {file.width && file.height && (
                        <p className="text-[9px] text-white/70">
                          {file.width}×{file.height}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

        </div>
      )}

      {/* Lightbox */}
      {lightboxFile && (
        <Lightbox
          file={lightboxFile}
          onClose={closeLightbox}
          onPrev={goPrev}
          onNext={goNext}
          hasPrev={lightboxIndex > 0}
          hasNext={lightboxIndex < files.length - 1}
          onFavoriteToggle={() => favMut.mutate(lightboxFile.id)}
        />
      )}

      {/* Add selected to album modal */}
      {addToAlbumId && (
        <AddSelectedToAlbum
          mediaIds={Array.from(selectedIds)}
          onClose={() => { setAddToAlbumId(null); clearSelection(); }}
        />
      )}
    </div>
  );
}

function AddSelectedToAlbum({ mediaIds, onClose }: { mediaIds: string[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [selectedAlbumId, setSelectedAlbumId] = useState('');

  const { data: albums } = useQuery<MediaAlbum[]>({
    queryKey: ['media-albums'],
    queryFn: () => api.get<MediaAlbum[]>('/media/albums'),
  });

  const addMut = useMutation({
    mutationFn: (albumId: string) => api.post(`/media/albums/${albumId}/items`, { mediaIds }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['media-albums'] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-bg-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{mediaIds.length} Datei(en) zu Album hinzufügen</h2>
          <button type="button" onClick={onClose} className="text-fg-muted hover:text-fg"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {albums?.map((a) => (
            <button key={a.id} onClick={() => { setSelectedAlbumId(a.id); addMut.mutate(a.id); }}
              className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${selectedAlbumId === a.id ? 'border-brand-500 bg-brand-500/10' : 'border-border hover:bg-bg'}`}>
              <p className="font-medium">{a.name}</p>
              {a.description && <p className="text-xs text-fg-muted">{a.description}</p>}
            </button>
          ))}
          {albums?.length === 0 && <p className="text-sm text-fg-muted text-center py-4">Keine Alben vorhanden. Erstelle zuerst ein Album.</p>}
        </div>
        {addMut.isPending && <p className="text-xs text-fg-muted text-center">Füge hinzu…</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Lightbox Component                                                */
/* ------------------------------------------------------------------ */

function Lightbox({
  file,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  onFavoriteToggle,
}: {
  file: MediaFile;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  onFavoriteToggle: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors z-10"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Prev button */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors z-10"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Next button */}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors z-10"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Image / Video */}
      <div
        className="relative max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo(file.mimeType) ? (
          <video
            src={`${typeof window !== 'undefined' ? `http://${window.location.hostname}:3007` : 'http://localhost:3007'}/api/v1/media/files/${file.id}/stream?token=${typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('lifehub-auth') || '{}')?.state?.accessToken ?? '') : ''}`}
            controls
            autoPlay
            className="max-h-[85vh] max-w-[85vw] rounded-lg"
          >
            Your browser does not support the video tag.
          </video>
        ) : file.thumbnailPath ? (
          <img
            src={file.thumbnailPath}
            alt={file.filename}
            className="max-h-[85vh] max-w-[85vw] object-contain rounded-lg"
          />
        ) : (
          <div className="flex h-64 w-64 items-center justify-center rounded-lg bg-bg-surface">
            <FileText className="h-16 w-16 opacity-40" />
          </div>
        )}

        {/* Info bar */}
        <div className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-white">
              <p className="font-medium truncate">{file.filename}</p>
              <div className="flex items-center gap-3 text-xs text-white/70 mt-0.5">
                {file.width && file.height && (
                  <span>{file.width}×{file.height}</span>
                )}
                {file.takenAt && (
                  <span>{new Date(file.takenAt).toLocaleDateString('de-DE', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}</span>
                )}
                {file.gpsLat != null && file.gpsLng != null && (
                  <span>
                    {file.gpsLat.toFixed(4)}, {file.gpsLng.toFixed(4)}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onFavoriteToggle(); }}
              className={cn(
                'rounded-full p-2 transition-colors',
                file.isFavorite ? 'text-red-400' : 'text-white/70 hover:text-red-300',
              )}
            >
              <Star className={cn('h-5 w-5', file.isFavorite && 'fill-current')} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Map View (GPS-tagged media)                                       */
/* ------------------------------------------------------------------ */

// Dynamically import the map to avoid SSR issues with Leaflet
const MapContent = dynamic(() => import('./MapContent'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-20 text-fg-muted">
      <Loader2 className="h-6 w-6 animate-spin mr-2" />
      Lade Karte …
    </div>
  ),
});

function MapView() {
  const { data, isLoading, error } = useQuery<MediaFile[]>({
    queryKey: ['media-files-gps'],
    queryFn: async () => {
      const res = await api.get<MediaFile[]>('/media/files?limit=500&offset=0');
      return (Array.isArray(res) ? res : []).filter((f) => f.gpsLat != null && f.gpsLng != null);
    },
    staleTime: 30_000,
  });

  const qc = useQueryClient();
  const favMut = useMutation({
    mutationFn: (fileId: string) =>
      api.post<{ isFavorite: boolean }>(`/media/files/${fileId}/favorite`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['media-files-gps'] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-fg-muted">
          {data?.length ?? 0} Medien mit GPS-Daten
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20 text-fg-muted">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Lade GPS-Daten …
        </div>
      )}

      {error && !isLoading && (
        <div className="flex items-start gap-3 rounded-lg border border-danger/20 bg-danger/5 p-4 text-danger">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Fehler beim Laden der Karte</p>
            <p className="text-sm text-danger/80 mt-1">{(error as Error).message}</p>
          </div>
        </div>
      )}

      {!isLoading && !error && (!data || data.length === 0) && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-fg-muted">
          <Globe className="h-12 w-12 mb-3 opacity-30" />
          <p className="font-medium">Keine Medien mit GPS-Daten</p>
          <p className="text-sm mt-1 max-w-md text-center">
            Fotos mit GPS-Koordinaten erscheinen hier auf der Karte.
            Scanne eine Quelle, um indexierte Medien zu finden.
          </p>
        </div>
      )}

      {!isLoading && !error && data && data.length > 0 && (
        <div className="h-[600px] rounded-lg overflow-hidden border border-border">
          <MapContent
            files={data}
            onFavoriteToggle={(fileId) => favMut.mutate(fileId)}
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Source Dialog                                                     */
/* ------------------------------------------------------------------ */

function SourceDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [type, setType] = useState<MediaSource['type']>('nas_path');
  const [path, setPath] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: (body: { name: string; type: string; path: string }) =>
      api.post<MediaSource>('/media/sources', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['media-sources'] });
      onClose();
    },
    onError: (err) => {
      setError((err as Error).message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !path.trim()) {
      setError('Name und Pfad dürfen nicht leer sein.');
      return;
    }
    mutation.mutate({ name: name.trim(), type, path: path.trim() });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-lg border border-border bg-bg-surface p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Quelle hinzufügen</h2>
          <button type="button" onClick={onClose} className="text-fg-muted hover:text-fg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Urlaubsfotos 2025"
            className="w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-sm placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Typ</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as MediaSource['type'])}
            className="w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          >
            <option value="nas_path">NAS-Pfad (Linux)</option>
            <option value="windows_path">Windows-Pfad</option>
            <option value="upload_temp">Upload (temporär)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Pfad</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/mnt/nas/fotos oder D:\\Fotos"
              className="flex-1 rounded-md border border-border-strong bg-bg px-3 py-2 text-sm font-mono placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              required
            />
            <button
              type="button"
              onClick={async () => {
                const w = window as unknown as { showDirectoryPicker?: () => Promise<{ name: string }> };
                if (w.showDirectoryPicker) {
                  try {
                    const dir = await w.showDirectoryPicker();
                    setPath(dir.name);
                  } catch {
                    // User cancelled
                  }
                } else {
                  fileInputRef.current?.click();
                }
              }}
              className="flex items-center gap-1.5 rounded-md border border-border bg-bg-surface px-3 py-2 text-sm font-medium text-fg hover:bg-bg-raised transition-colors"
              title="Ordner durchsuchen"
            >
              <FolderSearch className="h-4 w-4" />
              <span className="hidden sm:inline">Durchsuchen</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              // @ts-expect-error: webkitdirectory ist non-standard
              webkitdirectory=""
              style={{ display: 'none' }}
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                  const first = files[0] as File & { webkitRelativePath?: string };
                  const rel = first.webkitRelativePath || first.name;
                  const folder = rel.split('/')[0];
                  if (folder) setPath(folder);
                }
              }}
            />
          </div>
          <p className="mt-1 text-xs text-fg-subtle">
            Tipp: „Durchsuchen" öffnet den Windows-Explorer (Chromium/Edge).
            Für NAS-Pfade auf Linux manuell eingeben.
            Unterstützte Formate: JPG, PNG, RAW, WEBP, GIF, SVG, BMP, MP4, MOV, MKV, MP3, WAV, FLAC, PDF, DOCX
          </p>
        </div>

        {error && (
          <p className="text-sm text-danger">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-bg transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-bg hover:bg-brand-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Speichern
          </button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Album Dialog                                                      */
/* ------------------------------------------------------------------ */

function AlbumDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<MediaAlbum['type']>('standard');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (body: { name: string; description?: string; type: string }) =>
      api.post<MediaAlbum>('/media/albums', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['media-albums'] });
      onClose();
    },
    onError: (err) => {
      setError((err as Error).message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Name darf nicht leer sein.');
      return;
    }
    mutation.mutate({ name: name.trim(), description: description.trim() || undefined, type });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-lg border border-border bg-bg-surface p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Album erstellen</h2>
          <button type="button" onClick={onClose} className="text-fg-muted hover:text-fg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Italien 2025"
            className="w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-sm placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Beschreibung (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="z.B. Sommerurlaub mit der Familie"
            rows={3}
            className="w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-sm placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Typ</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as MediaAlbum['type'])}
            className="w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          >
            <option value="standard">Standard</option>
            <option value="travel">Reise</option>
            <option value="event">Event</option>
          </select>
        </div>

        {error && (
          <p className="text-sm text-danger">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-bg transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-bg hover:bg-brand-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Erstellen
          </button>
        </div>
      </form>
    </div>
  );
}
