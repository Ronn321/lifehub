'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Mail, Calendar, Loader2, AlertCircle, CheckCircle2, Link2, Unplug } from 'lucide-react';
import { api } from '@/lib/api';

// Response of GET /integrations/google/status
interface GoogleStatus {
  connected: boolean;
  email: string | null;
  grantedScopes: string[];
  lastSyncAt: string | null;
}

function formatDateTime(value: string | null): string {
  if (!value) return '–';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '–';
  return d.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
}

/** Scope badges shown for a connected account. Falls back to both when unknown. */
function ScopeBadges({ scopes }: { scopes: string[] }) {
  const hasGmail = scopes.length === 0 || scopes.some((s) => s.toLowerCase().includes('gmail'));
  const hasCalendar = scopes.length === 0 || scopes.some((s) => s.toLowerCase().includes('calendar'));
  return (
    <div className="flex flex-wrap gap-2">
      {hasGmail && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 px-2.5 py-0.5 text-xs font-medium text-brand-500">
          <Mail className="h-3.5 w-3.5" /> E-Mail
        </span>
      )}
      {hasCalendar && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 px-2.5 py-0.5 text-xs font-medium text-brand-500">
          <Calendar className="h-3.5 w-3.5" /> Kalender
        </span>
      )}
    </div>
  );
}

export function GoogleAccountCard() {
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [justConnected, setJustConnected] = useState(false);

  // Detect a successful OAuth redirect (?google=connected) and show a success toast.
  useEffect(() => {
    if (searchParams.get('google') === 'connected') {
      setJustConnected(true);
      router.replace('/settings');
    }
  }, [searchParams, router]);

  const { data, isLoading, isError, error } = useQuery<GoogleStatus>({
    queryKey: ['google-status'],
    queryFn: () => api.get<GoogleStatus>('/integrations/google/status'),
  });

  const connectMutation = useMutation({
    mutationFn: () => api.get<{ url: string }>('/integrations/google/auth-url'),
    onSuccess: (res) => {
      if (res?.url) window.location.href = res.url;
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => api.delete<void>('/integrations/google/connection'),
    onSuccess: () => {
      setJustConnected(false);
      qc.invalidateQueries({ queryKey: ['google-status'] });
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-bg-surface p-6">
        <div className="flex items-center gap-2 text-sm text-fg-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Lade Google-Kontoverbindung …
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-danger/20 bg-danger/5 p-4 text-danger">
        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Verbindung konnte nicht geladen werden</p>
          <p className="text-sm text-danger/80 mt-1">{error instanceof Error ? error.message : 'Unbekannter Fehler'}</p>
        </div>
      </div>
    );
  }

  const connected = data?.connected ?? false;

  return (
    <div className="rounded-lg border border-border bg-bg-surface p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <Link2 className="h-5 w-5 text-brand-500" /> Google-Konto
        </h2>
        {connected && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
            <span className="h-2 w-2 rounded-full bg-success" /> Verbunden
          </span>
        )}
      </div>

      {justConnected && (
        <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" /> Google-Konto verbunden ✓
        </div>
      )}

      {!connected ? (
        <>
          <p className="text-sm text-fg-muted">
            Verbinde dein Google-Konto, um auf E-Mails (Gmail) und den Kalender zuzugreifen.
          </p>
          <ScopeBadges scopes={[]} />
          <button
            onClick={() => connectMutation.mutate()}
            disabled={connectMutation.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-bg hover:bg-brand-400 disabled:opacity-50"
          >
            {connectMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Verbindet …
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4" /> Mit Google-Konto verbinden
              </>
            )}
          </button>
          {connectMutation.isError && (
            <p className="text-sm text-danger">{(connectMutation.error as Error).message}</p>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-fg-muted" />
            <span className="font-medium">{data?.email ?? 'Google-Konto'}</span>
          </div>
          <ScopeBadges scopes={data?.grantedScopes ?? []} />
          <p className="text-xs text-fg-subtle">Zuletzt synchronisiert: {formatDateTime(data?.lastSyncAt ?? null)}</p>
          <button
            onClick={() => {
              if (window.confirm('Google-Konto wirklich trennen? Kalender- und E-Mail-Zugriff werden entfernt.')) {
                disconnectMutation.mutate();
              }
            }}
            disabled={disconnectMutation.isPending}
            className="inline-flex items-center gap-2 rounded-md border border-danger/30 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/5 disabled:opacity-50"
          >
            {disconnectMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Trennt …
              </>
            ) : (
              <>
                <Unplug className="h-4 w-4" /> Trennen
              </>
            )}
          </button>
          {disconnectMutation.isError && (
            <p className="text-sm text-danger">{(disconnectMutation.error as Error).message}</p>
          )}
        </>
      )}
    </div>
  );
}
