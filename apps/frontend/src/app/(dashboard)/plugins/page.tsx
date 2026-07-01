'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  Puzzle, Plus, Loader2, AlertCircle, X, ToggleLeft, ToggleRight, Trash2, ExternalLink,
} from 'lucide-react';

interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string | null;
  author: string | null;
  homepage: string | null;
  enabled: boolean;
  permissions: string[];
  settings: Record<string, unknown>;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export default function PluginsPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [hydrated, setHydrated] = useState(false);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (hydrated && !accessToken) router.push('/login');
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
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Plugins & Erweiterungen</h1>
        <p className="text-sm text-fg-muted mt-1">
          Installiere und verwalte Erweiterungen für LifeHub.
        </p>
      </div>

      <PluginsList onInstall={() => setShowInstall(true)} />
      {showInstall && <InstallDialog onClose={() => setShowInstall(false)} />}
    </div>
  );
}

function PluginsList({ onInstall }: { onInstall: () => void }) {
  const qc = useQueryClient();
  const { data: plugins, isLoading, error } = useQuery<Plugin[]>({
    queryKey: ['plugins'],
    queryFn: () => api.get<Plugin[]>('/plugins'),
  });

  const toggleMutation = useMutation({
    mutationFn: (p: Plugin) =>
      api.post<Plugin>(`/plugins/${p.id}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plugins'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/plugins/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plugins'] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-fg-muted">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Lade Plugins …
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-danger/20 bg-danger/5 p-4 text-danger">
        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Fehler beim Laden</p>
          <p className="text-sm text-danger/80 mt-1">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-fg-muted">
          {plugins?.length ?? 0} Erweiterungen
        </p>
        <button
          onClick={onInstall}
          className="flex items-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-bg hover:bg-brand-400 transition-colors"
        >
          <Plus className="h-4 w-4" /> Installieren
        </button>
      </div>

      {(plugins?.length ?? 0) === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-fg-muted">
          <Puzzle className="h-10 w-10 mb-3 opacity-40" />
          <p className="font-medium">Noch keine Plugins installiert</p>
          <p className="text-sm mt-1">
            Installiere ein neues Plugin, um LifeHub zu erweitern.
          </p>
        </div>
      )}

      {plugins && plugins.length > 0 && (
        <div className="space-y-2">
          {plugins.map((plugin) => (
            <div
              key={plugin.id}
              className="flex items-center gap-4 rounded-lg border border-border bg-bg-surface p-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/10 text-brand-500 shrink-0">
                <Puzzle className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{plugin.name}</p>
                  <span className="text-[11px] text-fg-subtle font-mono">
                    v{plugin.version}
                  </span>
                  {plugin.enabled && (
                    <span className="rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-500 border border-green-500/20">
                      Aktiv
                    </span>
                  )}
                </div>
                {plugin.description && (
                  <p className="text-xs text-fg-muted truncate mt-0.5">
                    {plugin.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1">
                  {plugin.author && (
                    <span className="text-[11px] text-fg-subtle">
                      von {plugin.author}
                    </span>
                  )}
                  {plugin.homepage && (
                    <a
                      href={plugin.homepage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-brand-500 hover:underline inline-flex items-center gap-0.5"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Webseite
                    </a>
                  )}
                </div>
              </div>
              <button
                onClick={() => toggleMutation.mutate(plugin)}
                disabled={toggleMutation.isPending}
                className={`${plugin.enabled ? 'text-green-500' : 'text-fg-subtle'} hover:opacity-80 transition-opacity`}
                title={plugin.enabled ? 'Deaktivieren' : 'Aktivieren'}
              >
                {toggleMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : plugin.enabled ? (
                  <ToggleRight className="h-5 w-5" />
                ) : (
                  <ToggleLeft className="h-5 w-5" />
                )}
              </button>
              <button
                onClick={() => {
                  if (confirm(`Plugin "${plugin.name}" wirklich deinstallieren?`))
                    deleteMutation.mutate(plugin.id);
                }}
                disabled={deleteMutation.isPending}
                className="text-fg-subtle hover:text-danger transition-colors"
                title="Deinstallieren"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InstallDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [homepage, setHomepage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (body: {
      name: string;
      version: string;
      description?: string;
      author?: string;
      homepage?: string;
    }) => api.post<Plugin>('/plugins', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plugins'] });
      onClose();
    },
    onError: (err) => setError((err as Error).message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !version.trim()) {
      setError('Name und Version sind Pflichtfelder.');
      return;
    }
    mutation.mutate({
      name: name.trim(),
      version: version.trim(),
      description: description.trim() || undefined,
      author: author.trim() || undefined,
      homepage: homepage.trim() || undefined,
    });
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
          <h2 className="text-lg font-semibold">Plugin installieren</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-fg-muted hover:text-fg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. home-assistant-bridge"
            required
            className="w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-sm placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Version *</label>
          <input
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="1.0.0"
            required
            className="w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-sm placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Beschreibung</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Kurze Beschreibung des Plugins"
            rows={2}
            className="w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-sm placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Autor</label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="z.B. Max Mustermann"
            className="w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-sm placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Webseite</label>
          <input
            type="url"
            value={homepage}
            onChange={(e) => setHomepage(e.target.value)}
            placeholder="https://github.com/..."
            className="w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-sm placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-bg"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-bg hover:bg-brand-400 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Installieren
          </button>
        </div>
      </form>
    </div>
  );
}
