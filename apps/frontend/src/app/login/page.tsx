'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api, authResponseSchema, ApiError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Loader2, Shield } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const existingToken = useAuthStore((s) => s.accessToken);
  const [email, setEmail] = useState('admin@lifehub.local');
  const [password, setPassword] = useState('admin12345');
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Wenn schon eingeloggt, direkt zum Dashboard
  useEffect(() => {
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated && existingToken) {
      router.replace('/dashboard');
    }
  }, [hydrated, existingToken, router]);

  const login = useMutation({
    mutationFn: async () => {
      const raw = await api.post('/auth/login', { email, password });
      return authResponseSchema.parse(raw);
    },
    onSuccess: (data) => {
      setAuth(data);
      router.push('/dashboard');
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.status === 401 ? 'E-Mail oder Passwort falsch' : `Fehler: ${err.status}`);
      } else {
        setError('Verbindung zum Server fehlgeschlagen');
      }
    },
  });

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 animate-slide-up">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="rounded-full bg-brand-500/10 p-3">
            <Shield className="h-8 w-8 text-brand-500" />
          </div>
          <h1 className="text-3xl font-semibold">Willkommen zurück</h1>
          <p className="text-sm text-fg-muted">Melde dich bei LifeHub an</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            login.mutate();
          }}
          className="space-y-4 rounded-lg border border-border bg-bg-surface p-6"
        >
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">E-Mail</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">Passwort</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="current-password"
              className="w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>

          {error && (
            <p className="rounded-md border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={login.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-500 px-4 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-brand-400 disabled:opacity-50"
          >
            {login.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Anmelden
          </button>

          <p className="text-center text-xs text-fg-subtle">
            Default: <code className="text-brand-500">admin@lifehub.local</code> / <code className="text-brand-500">admin12345</code>
          </p>
        </form>
      </div>
    </main>
  );
}
