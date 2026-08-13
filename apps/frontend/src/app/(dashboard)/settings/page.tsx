'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  Loader2, AlertCircle, Settings, FolderOpen, Globe,
  Save, Check, ArrowLeft, RefreshCw, Palette, Sun, Moon, Monitor, Chrome,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useJellyfinLayout, type SidebarStyle } from '@/lib/jellyfin-layout-store';
import { useThemeStore, type Accent } from '@/lib/theme-store';
import { ACCENT_PRESETS, useAccentStore, type AccentKey } from '@/lib/accent';
import { GoogleAccountCard } from '@/components/integrations/GoogleAccountCard';

interface SystemSettings {
  [key: string]: unknown;
}

type Tab = 'general' | 'appearance' | 'google' | 'paths' | 'network';

export default function SettingsPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const currentRoles = useAuthStore((s) => s.roles);
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('general');

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
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">System-Einstellungen</h1>
        <p className="text-sm text-fg-muted mt-1">Konfiguriere LifeHub Pfade, Netzwerk und Allgemeines.</p>
      </div>

      <div className="flex gap-1 rounded-md border border-border bg-bg-surface p-1 w-fit">
        <button onClick={() => setActiveTab('general')}
          className={`rounded px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === 'general' ? 'bg-bg-raised text-fg' : 'text-fg-muted hover:text-fg'}`}>
          <Settings className="h-4 w-4 inline mr-1.5" /> Allgemein
        </button>
        <button onClick={() => setActiveTab('appearance')}
          className={`rounded px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === 'appearance' ? 'bg-bg-raised text-fg' : 'text-fg-muted hover:text-fg'}`}>
          <Palette className="h-4 w-4 inline mr-1.5" /> Darstellung
        </button>
        <button onClick={() => setActiveTab('google')}
          className={`rounded px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === 'google' ? 'bg-bg-raised text-fg' : 'text-fg-muted hover:text-fg'}`}>
          <Chrome className="h-4 w-4 inline mr-1.5" /> Google-Konto
        </button>
        <button onClick={() => setActiveTab('paths')}
          className={`rounded px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === 'paths' ? 'bg-bg-raised text-fg' : 'text-fg-muted hover:text-fg'}`}>
          <FolderOpen className="h-4 w-4 inline mr-1.5" /> Pfade
        </button>
        <button onClick={() => setActiveTab('network')}
          className={`rounded px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === 'network' ? 'bg-bg-raised text-fg' : 'text-fg-muted hover:text-fg'}`}>
          <Globe className="h-4 w-4 inline mr-1.5" /> Netzwerk
        </button>
      </div>

      {activeTab === 'general' && <GeneralSettings />}
      {activeTab === 'appearance' && <AppearanceSettings />}
      {activeTab === 'google' && <GoogleAccountCard />}
      {activeTab === 'paths' && <PathSettings />}
      {activeTab === 'network' && <NetworkSettings />}
    </div>
  );
}

// ========== GENERAL TAB ==========

function GeneralSettings() {
  const qc = useQueryClient();
  const { data: settings, isLoading, error } = useQuery<SystemSettings>({
    queryKey: ['system-settings'],
    queryFn: () => api.get<SystemSettings>('/system/settings'),
  });

  const [brandName, setBrandName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setBrandName(String(settings['general.brand_name'] ?? 'LifeHub'));
      setTimezone(String(settings['general.timezone'] ?? ''));
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.put('/system/settings', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (isLoading) return <LoadingState text="Lade Einstellungen …" />;
  if (error) return <ErrorState message={(error as Error).message} />;

  return (
    <div className="rounded-lg border border-border bg-bg-surface p-6 space-y-4">
      <h2 className="text-lg font-medium">Allgemein</h2>

      <Field label="Anwendungsname">
        <input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)}
          className="input-field" />
      </Field>

      <Field label="Zeitzone">
        <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
          className="input-field">
          <option value="">Automatisch (System)</option>
          <option value="Europe/Berlin">Europe/Berlin</option>
          <option value="Europe/Vienna">Europe/Vienna</option>
          <option value="Europe/Zurich">Europe/Zurich</option>
          <option value="UTC">UTC</option>
        </select>
        <p className="text-xs text-fg-subtle mt-1">„Automatisch (System)" übernimmt die Zeitzone des Servers.</p>
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <button onClick={() => mutation.mutate({ 'general.brand_name': brandName, 'general.timezone': timezone })}
          disabled={mutation.isPending || saved}
          className="flex items-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-bg hover:bg-brand-400 disabled:opacity-50">
          {saved ? <><Check className="h-4 w-4" /> Gespeichert</> : mutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Speichert …</> : <><Save className="h-4 w-4" /> Speichern</>}
        </button>
        {mutation.isError && <p className="text-sm text-danger">{(mutation.error as Error).message}</p>}
      </div>
    </div>
  );
}

// ========== PATHS TAB ==========

function PathSettings() {
  const qc = useQueryClient();
  const { data: settings, isLoading, error } = useQuery<SystemSettings>({
    queryKey: ['system-settings'],
    queryFn: () => api.get<SystemSettings>('/system/settings'),
  });

  const [photos, setPhotos] = useState('');
  const [videos, setVideos] = useState('');
  const [documents, setDocuments] = useState('');
  const [projects, setProjects] = useState('');
  const [data, setData] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setPhotos(String(settings['paths.photos'] ?? ''));
      setVideos(String(settings['paths.videos'] ?? ''));
      setDocuments(String(settings['paths.documents'] ?? ''));
      setProjects(String(settings['paths.projects'] ?? ''));
      setData(String(settings['paths.data'] ?? ''));
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.put('/system/paths', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (isLoading) return <LoadingState text="Lade Pfade …" />;
  if (error) return <ErrorState message={(error as Error).message} />;

  return (
    <div className="rounded-lg border border-border bg-bg-surface p-6 space-y-4">
      <h2 className="text-lg font-medium">Speicher-Pfade</h2>
      <p className="text-sm text-fg-muted">Pfade zu deinen Medien und Daten. Nach Änderungen ist ein Container-Neustart erforderlich.</p>

      <Field label="Fotos">
        <input type="text" value={photos} onChange={(e) => setPhotos(e.target.value)}
          placeholder="/volume1/photo" className="input-field" />
      </Field>

      <Field label="Videos">
        <input type="text" value={videos} onChange={(e) => setVideos(e.target.value)}
          placeholder="/volume1/video" className="input-field" />
      </Field>

      <Field label="Dokumente">
        <input type="text" value={documents} onChange={(e) => setDocuments(e.target.value)}
          placeholder="/volume1/documents" className="input-field" />
      </Field>

      <Field label="Projekte">
        <input type="text" value={projects} onChange={(e) => setProjects(e.target.value)}
          placeholder="/volume1/projects" className="input-field" />
      </Field>

      <hr className="border-border" />

      <Field label="LifeHub Daten-Verzeichnis">
        <input type="text" value={data} onChange={(e) => setData(e.target.value)}
          placeholder="/volume1/docker/lifehub/data" className="input-field" />
        <p className="text-xs text-fg-subtle mt-1">Basis-Verzeichnis für DB, Cache, Thumbnails, Vault</p>
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <button onClick={() => mutation.mutate({ photos, videos, documents, projects, data })}
          disabled={mutation.isPending || saved}
          className="flex items-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-bg hover:bg-brand-400 disabled:opacity-50">
          {saved ? <><Check className="h-4 w-4" /> Gespeichert</> : mutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Speichert …</> : <><Save className="h-4 w-4" /> Speichern</>}
        </button>
        {mutation.isError && <p className="text-sm text-danger">{(mutation.error as Error).message}</p>}
      </div>
    </div>
  );
}

// ========== NETWORK TAB ==========

function NetworkSettings() {
  const qc = useQueryClient();
  const { data: settings, isLoading, error } = useQuery<SystemSettings>({
    queryKey: ['system-settings'],
    queryFn: () => api.get<SystemSettings>('/system/settings'),
  });

  const [frontendPort, setFrontendPort] = useState('');
  const [backendPort, setBackendPort] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setFrontendPort(String(settings['network.frontend_port'] ?? '3001'));
      setBackendPort(String(settings['network.backend_port'] ?? '3007'));
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.put('/system/settings', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (isLoading) return <LoadingState text="Lade Netzwerk-Einstellungen …" />;
  if (error) return <ErrorState message={(error as Error).message} />;

  return (
    <div className="rounded-lg border border-border bg-bg-surface p-6 space-y-4">
      <h2 className="text-lg font-medium">Netzwerk</h2>
      <p className="text-sm text-fg-muted">Ports und API-URL. Nach Änderungen ist ein Container-Neustart erforderlich.</p>

      <Field label="Frontend Port">
        <input type="text" value={frontendPort} onChange={(e) => setFrontendPort(e.target.value)}
          placeholder="3001" className="input-field" />
      </Field>

      <Field label="Backend Port">
        <input type="text" value={backendPort} onChange={(e) => setBackendPort(e.target.value)}
          placeholder="3007" className="input-field" />
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <button onClick={() => mutation.mutate({ 'network.frontend_port': Number(frontendPort), 'network.backend_port': Number(backendPort) })}
          disabled={mutation.isPending || saved}
          className="flex items-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-bg hover:bg-brand-400 disabled:opacity-50">
          {saved ? <><Check className="h-4 w-4" /> Gespeichert</> : mutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Speichert …</> : <><Save className="h-4 w-4" /> Speichern</>}
        </button>
        {mutation.isError && <p className="text-sm text-danger">{(mutation.error as Error).message}</p>}
      </div>
    </div>
  );
}

// ========== APPEARANCE TAB ==========

const THEME_OPTIONS: { value: 'light' | 'dark' | 'system'; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Hell' },
  { value: 'dark', icon: Moon, label: 'Dunkel' },
  { value: 'system', icon: Monitor, label: 'System' },
];

const ACCENT_OPTIONS: { key: Accent; label: string; swatch: string }[] = [
  { key: 'amber', label: 'Amber', swatch: '#D97706' },
  { key: 'blue', label: 'Blau', swatch: '#3B82F6' },
  { key: 'green', label: 'Grün', swatch: '#22C55E' },
  { key: 'rose', label: 'Rose', swatch: '#F43F5E' },
  { key: 'violet', label: 'Violett', swatch: '#8B5CF6' },
];

const SIDEBAR_STYLE_OPTIONS: { key: SidebarStyle; title: string; desc: string }[] = [
  {
    key: 'classic',
    title: 'Klassisch',
    desc: 'Eingeklappt: Icons sichtbar, Toggle-Knopf an der Sidebar-Grenze',
  },
  {
    key: 'spotify',
    title: 'Spotify',
    desc: 'Eingeklappt: Toggle-Button oben in der Sidebar',
  },
];

function AppearanceSettings() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const accent = useThemeStore((s) => s.accent);
  const setAccent = useThemeStore((s) => s.setAccent);
  const sidebarStyle = useJellyfinLayout((s) => s.sidebarStyle);
  const setSidebarStyle = useJellyfinLayout((s) => s.setSidebarStyle);
  const hubAccent = useAccentStore((s) => s.accent);
  const hubCustomHex = useAccentStore((s) => s.customHex);
  const hubSetAccent = useAccentStore((s) => s.setAccent);

  return (
    <div className="space-y-4">
      {/* Hub-Akzentfarbe (calendar/hub-wide, additive to jellyfin theme-store accent) */}
      <div className="rounded-lg border border-border bg-bg-surface p-6 space-y-4">
        <h2 className="text-lg font-medium">Akzentfarbe</h2>
        <div className="flex flex-wrap gap-2">
          {ACCENT_PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => hubSetAccent(p.key)}
              title={p.label}
              aria-label={p.label}
              className={cn(
                'h-8 w-8 rounded-full border-2 transition-all',
                hubAccent === p.key ? 'border-fg scale-110' : 'border-transparent hover:scale-105',
              )}
              style={{ backgroundColor: `rgb(${p.dark[500]})` }}
            />
          ))}
          <label
            className="h-8 w-8 rounded-full border-2 border-dashed border-fg-subtle cursor-pointer grid place-items-center text-xs"
            title="Eigene Farbe"
          >
            <input
              type="color"
              className="sr-only"
              value={hubCustomHex ?? '#d97706'}
              onChange={(e) => hubSetAccent('custom', e.target.value)}
            />
            +
          </label>
        </div>
        <p className="text-xs text-fg-subtle mt-1">Standard: Amber — die Akzentfarbe des Hubs.</p>
      </div>

      {/* Theme */}
      <div className="rounded-lg border border-border bg-bg-surface p-6 space-y-4">
        <h2 className="text-lg font-medium">Design</h2>
        <p className="text-sm text-fg-muted">
          Wähle das Theme und die Akzentfarbe. Die Auswahl wird automatisch gespeichert.
        </p>

        <div>
          <label className="block text-sm font-medium mb-2">Theme</label>
          <div className="flex items-center gap-1 rounded-md border border-border bg-bg p-1 w-fit">
            {THEME_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    'flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-brand-500/10 text-brand-500'
                      : 'text-fg-muted hover:text-fg hover:bg-bg-raised',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Akzentfarbe</label>
          <div className="flex items-center gap-3">
            {ACCENT_OPTIONS.map((opt) => {
              const active = accent === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setAccent(opt.key)}
                  title={opt.label}
                  aria-label={opt.label}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full transition-all',
                    active
                      ? 'ring-2 ring-offset-2 ring-offset-bg-surface'
                      : 'hover:scale-110',
                  )}
                  style={{
                    backgroundColor: opt.swatch,
                    ...(active ? { boxShadow: `0 0 0 2px ${opt.swatch}` } : {}),
                  }}
                >
                  {active && <Check className="h-4 w-4 text-white" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sidebar style */}
      <div className="rounded-lg border border-border bg-bg-surface p-6 space-y-4">
        <h2 className="text-lg font-medium">Musik-Sidebar</h2>
        <p className="text-sm text-fg-muted">
          Wähle den Stil der eingeklappten Musik-Sidebar (Jellyfin).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SIDEBAR_STYLE_OPTIONS.map((opt) => {
            const active = sidebarStyle === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setSidebarStyle(opt.key)}
                className={cn(
                  'relative rounded-lg border p-4 text-left transition-colors',
                  active
                    ? 'border-brand-500 bg-brand-500/5'
                    : 'border-border hover:border-fg-muted',
                )}
              >
                {/* Miniatur-Vorschau */}
                <div className="relative h-16 w-24 rounded border border-border bg-bg-raised">
                  {/* Sidebar-Leiste */}
                  <div className="absolute inset-y-0 left-0 w-10 rounded-l border-r border-border bg-bg-surface">
                    <div className="flex flex-col items-center gap-2 pt-3">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-fg-muted" />
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-fg-muted" />
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-fg-muted" />
                    </div>
                    {opt.key === 'classic' && (
                      /* Toggle-Knopf an der Grenze (Klassisch) */
                      <span className="absolute -right-1 top-3 h-2.5 w-2.5 rounded-full border border-border bg-bg-surface shadow-sm" />
                    )}
                  </div>
                  {opt.key === 'spotify' && (
                    /* Toggle oben in der Leiste (Spotify) */
                    <span className="absolute left-4 top-2 h-2.5 w-2.5 rounded-full border border-border bg-bg-surface shadow-sm" />
                  )}
                  {/* Content-Andeutung */}
                  <div className="absolute left-[52px] top-4 right-2 h-2 rounded bg-bg-raised" />
                  <div className="absolute left-[52px] top-8 right-6 h-2 rounded bg-bg-raised" />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm font-medium">{opt.title}</span>
                  {active && <Check className="h-4 w-4 ml-auto text-brand-500" />}
                </div>
                <p className="mt-1 text-xs text-fg-muted">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ========== SHARED COMPONENTS ==========

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
    </div>
  );
}

function LoadingState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-20 text-fg-muted">
      <Loader2 className="h-6 w-6 animate-spin mr-2" /> {text}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-danger/20 bg-danger/5 p-4 text-danger">
      <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
      <div>
        <p className="font-medium">Fehler</p>
        <p className="text-sm text-danger/80 mt-1">{message}</p>
      </div>
    </div>
  );
}
