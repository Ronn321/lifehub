'use client';
import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  Loader2, Plus, Key, FileText, CreditCard, Globe, User,
  Lock, Eye, EyeOff, Copy, Check, Trash2, ArrowLeft,
  Shield, Smartphone, Hash, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/cn';

interface VaultEntry {
  id: string;
  name: string;
  type: 'login' | 'note' | 'card' | 'identity' | 'ssh';
  username: string | null;
  encryptedPassword: string | null;
  url: string | null;
  notes: string | null;
  totpSecret: string | null;
  cardLast4: string | null;
  cardBrand: string | null;
  keyVersion: number;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface TotpResponse {
  code: string;
  period: number;
}

const typeLabels: Record<string, string> = {
  login: 'Login', note: 'Notiz', card: 'Kreditkarte', identity: 'Ausweis', ssh: 'SSH-Schlüssel',
};

const typeIcons: Record<string, React.ReactNode> = {
  login: <Key className="h-5 w-5" />,
  note: <FileText className="h-5 w-5" />,
  card: <CreditCard className="h-5 w-5" />,
  identity: <User className="h-5 w-5" />,
  ssh: <Lock className="h-5 w-5" />,
};

function formatDate(date: string | null) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('de-DE');
}

export default function VaultPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  useEffect(() => { if (!accessToken) router.push('/login'); }, [accessToken, router]);

  const { data: entries, isLoading } = useQuery<VaultEntry[]>({
    queryKey: ['vault', 'entries'],
    queryFn: () => api.get<VaultEntry[]>('/vault/entries'),
    enabled: !!accessToken,
  });

  const { data: detail } = useQuery<VaultEntry>({
    queryKey: ['vault', 'entry', selectedId],
    queryFn: () => api.get<VaultEntry>(`/vault/entries/${selectedId}`),
    enabled: !!accessToken && !!selectedId,
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/vault/entries', body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vault', 'entries'] }); setShowCreate(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: Record<string, unknown>) => api.put(`/vault/entries/${id}`, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vault', 'entries'] }); queryClient.invalidateQueries({ queryKey: ['vault', 'entry', selectedId] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/vault/entries/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vault', 'entries'] }); setSelectedId(null); },
  });

  if (!accessToken) {
    return <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-fg-muted" />
    </div>;
  }

  if (selectedId && detail) {
    return <DetailView
      entry={detail}
      onBack={() => setSelectedId(null)}
      onDelete={(id) => { deleteMutation.mutate(id); }}
      isDeleting={deleteMutation.isPending}
    />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Tresor</h1>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
        >
          <Plus className="h-4 w-4" /> Neuer Eintrag
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(() => {
          if (isLoading) {
            return (
              <div className="col-span-full flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-fg-muted" />
              </div>
            );
          }
          if (!entries || entries.length === 0) {
            return (
              <div className="col-span-full text-center py-12 text-fg-muted">
                <Shield className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>Keine Tresor-Einträge vorhanden</p>
                <button onClick={() => setShowCreate(true)}
                  className="mt-3 text-sm text-brand-500 hover:underline"
                >Jetzt ersten Eintrag anlegen</button>
              </div>
            );
          }
          return (entries ?? []).map((entry) => (
            <button key={entry.id} onClick={() => setSelectedId(entry.id)}
              className="text-left rounded-lg border border-border bg-bg-surface p-4 hover:border-brand-500/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'p-2.5 rounded-full shrink-0',
                  entry.type === 'login' ? 'bg-blue-500/10 text-blue-500' :
                  entry.type === 'card' ? 'bg-green-500/10 text-green-500' :
                  entry.type === 'note' ? 'bg-amber-500/10 text-amber-500' :
                  entry.type === 'ssh' ? 'bg-purple-500/10 text-purple-500' :
                  'bg-brand-500/10 text-brand-500'
                )}>
                  {typeIcons[entry.type] ?? <Key className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{entry.name}</p>
                  <p className="text-xs text-fg-muted mt-0.5">
                    {typeLabels[entry.type] ?? entry.type}
                    {entry.username && <span className="ml-2">{entry.username}</span>}
                  </p>
                </div>
              </div>
              <div className="mt-3 text-xs text-fg-muted">
                {entry.url && <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {entry.url}</span>}
              </div>
            </button>
          ));
        })()}
      </div>

      {showCreate && <CreateDialog
        onClose={() => setShowCreate(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />}
    </div>
  );
}

function DetailView({ entry, onBack, onDelete, isDeleting }: {
  entry: VaultEntry;
  onBack: () => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState<string | null>(null);
  const [totpLoading, setTotpLoading] = useState(false);

  const fetchTotp = useCallback(async () => {
    if (!entry.totpSecret) return;
    setTotpLoading(true);
    try {
      const res = await api.post<TotpResponse>(`/vault/entries/${entry.id}/generate-totp`);
      setTotpCode(res.code);
    } catch {
      setTotpCode(null);
    } finally {
      setTotpLoading(false);
    }
  }, [entry.id, entry.totpSecret]);

  useEffect(() => {
    if (entry.totpSecret) {
      fetchTotp();
      const interval = setInterval(fetchTotp, 30_000);
      return () => clearInterval(interval);
    }
  }, [entry.totpSecret, fetchTotp]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <button onClick={onBack}
        className="flex items-center gap-2 text-sm text-fg-muted hover:text-fg transition-colors"
      ><ArrowLeft className="h-4 w-4" /> Zurück</button>

      <div className="rounded-lg border border-border bg-bg-surface p-6">
        <div className="flex items-start gap-4">
          <div className={cn(
            'p-3 rounded-full shrink-0',
            entry.type === 'login' ? 'bg-blue-500/10 text-blue-500' :
            entry.type === 'card' ? 'bg-green-500/10 text-green-500' :
            entry.type === 'note' ? 'bg-amber-500/10 text-amber-500' :
            entry.type === 'ssh' ? 'bg-purple-500/10 text-purple-500' :
            'bg-brand-500/10 text-brand-500'
          )}>
            {typeIcons[entry.type] ?? <Key className="h-6 w-6" />}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{entry.name}</h2>
            <p className="text-sm text-fg-muted mt-1">{typeLabels[entry.type] ?? entry.type}</p>
          </div>
          <button onClick={() => onDelete(entry.id)} disabled={isDeleting}
            className="p-2 rounded-md text-fg-muted hover:text-danger hover:bg-danger/10 transition-colors"
          ><Trash2 className="h-4 w-4" /></button>
        </div>

        <div className="mt-6 space-y-4">
          {entry.username && (
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-xs text-fg-muted">Benutzername</p>
                <p className="text-sm font-medium mt-0.5">{entry.username}</p>
              </div>
              <button onClick={() => copyToClipboard(entry.username!, 'username')}
                className="p-2 rounded-md text-fg-muted hover:text-brand-500 transition-colors"
                title="Kopieren"
              >
                {copied === 'username' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          )}

          {entry.encryptedPassword && (
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-fg-muted">Passwort</p>
                <p className="text-sm font-mono mt-0.5 truncate">
                  {showPassword ? entry.encryptedPassword : '••••••••••••'}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setShowPassword(!showPassword)}
                  className="p-2 rounded-md text-fg-muted hover:text-brand-500 transition-colors"
                  title={showPassword ? 'Verbergen' : 'Anzeigen'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button onClick={() => copyToClipboard(entry.encryptedPassword!, 'password')}
                  className="p-2 rounded-md text-fg-muted hover:text-brand-500 transition-colors"
                  title="Kopieren"
                >
                  {copied === 'password' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {entry.url && (
            <div>
              <p className="text-xs text-fg-muted mb-1">URL</p>
              <a href={entry.url} target="_blank" rel="noopener noreferrer"
                className="text-sm text-brand-500 hover:underline flex items-center gap-1"
              ><Globe className="h-3.5 w-3.5" /> {entry.url}</a>
            </div>
          )}

          {entry.notes && (
            <div>
              <p className="text-xs text-fg-muted mb-1">Notizen</p>
              <p className="text-sm whitespace-pre-wrap rounded-lg border border-border p-3 bg-bg">{entry.notes}</p>
            </div>
          )}

          {entry.type === 'card' && (
            <div className="grid grid-cols-2 gap-3">
              {entry.cardBrand && (
                <div>
                  <p className="text-xs text-fg-muted mb-1">Karte</p>
                  <p className="text-sm font-medium">{entry.cardBrand}</p>
                </div>
              )}
              {entry.cardLast4 && (
                <div>
                  <p className="text-xs text-fg-muted mb-1">Letzte 4 Ziffern</p>
                  <p className="text-sm font-mono">•••• {entry.cardLast4}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {entry.totpSecret && (
        <div className="rounded-lg border border-border bg-bg-surface p-6">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="h-5 w-5 text-brand-500" />
            <h3 className="text-lg font-semibold">Zwei-Faktor-Authentifizierung (TOTP)</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-xs text-fg-muted">Geheimer Schlüssel</p>
                <p className="text-sm font-mono mt-0.5">{entry.totpSecret}</p>
              </div>
              <button onClick={() => copyToClipboard(entry.totpSecret!, 'totp')}
                className="p-2 rounded-md text-fg-muted hover:text-brand-500 transition-colors"
              >
                {copied === 'totp' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <Hash className="h-5 w-5 text-brand-500" />
                <div>
                  <p className="text-xs text-fg-muted">Aktueller Code</p>
                  <p className={cn(
                    'text-2xl font-mono font-bold tracking-widest mt-0.5',
                    totpCode ? 'text-brand-500' : 'text-fg-muted'
                  )}>
                    {totpLoading ? <Loader2 className="h-5 w-5 animate-spin inline" /> : (totpCode ?? '—— ——')}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { if (totpCode) copyToClipboard(totpCode, 'totpCode'); }}
                  className="p-2 rounded-md text-fg-muted hover:text-brand-500 transition-colors"
                  title="Code kopieren"
                >
                  {copied === 'totpCode' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </button>
                <button onClick={fetchTotp}
                  className="p-2 rounded-md text-fg-muted hover:text-brand-500 transition-colors"
                  title="Aktualisieren"
                >
                  <RefreshCw className={cn('h-4 w-4', totpLoading && 'animate-spin')} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateDialog({ onClose, onSubmit, isPending }: {
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    name: '', type: 'login', username: '', encryptedPassword: '',
    url: '', notes: '', totpSecret: '',
    cardLast4: '', cardBrand: '', keyVersion: 1,
  });

  const handleSubmit = () => {
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) {
      if (v !== '' && v !== 1) data[k] = v;
    }
    if (data.name) onSubmit(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="rounded-lg border border-border bg-bg-surface p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Neuer Tresor-Eintrag</h2>
        <div className="space-y-3">
          <input name="name" placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />

          <select name="type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          {form.type === 'login' && (
            <>
              <input name="username" placeholder="Benutzername" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <input name="encryptedPassword" type="text" placeholder="Passwort" value={form.encryptedPassword} onChange={(e) => setForm({ ...form, encryptedPassword: e.target.value })}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <input name="url" placeholder="URL (z.B. https://example.com)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <input name="totpSecret" placeholder="TOTP Secret (optional)" value={form.totpSecret} onChange={(e) => setForm({ ...form, totpSecret: e.target.value })}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </>
          )}

          {form.type === 'card' && (
            <div className="grid grid-cols-2 gap-3">
              <input name="cardBrand" placeholder="Kartentyp (z.B. Visa)" value={form.cardBrand} onChange={(e) => setForm({ ...form, cardBrand: e.target.value })}
                className="rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <input name="cardLast4" placeholder="Letzte 4 Ziffern" maxLength={4} value={form.cardLast4} onChange={(e) => setForm({ ...form, cardLast4: e.target.value })}
                className="rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          )}

          {form.type === 'note' && (
            <textarea name="notes" placeholder="Notizinhalt..." rows={5} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          )}

          {(form.type === 'login' || form.type === 'identity' || form.type === 'ssh') && (
            <textarea name="notes" placeholder="Notizen (optional)" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          )}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-bg transition-colors"
          >Abbrechen</button>
          <button onClick={handleSubmit} disabled={isPending || !form.name}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
          >{isPending ? 'Wird angelegt...' : 'Anlegen'}</button>
        </div>
      </div>
    </div>
  );
}
