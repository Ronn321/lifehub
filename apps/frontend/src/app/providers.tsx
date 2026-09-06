'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { initClientMode } from '@/lib/client-mode';
import { useAuthStore } from '@/lib/auth-store';

// Global boot gate: blocks rendering until BOTH the persisted auth store
// (zustand `lifehub-auth`) and the client-mode bootstrap are hydrated.
// Without this, TanStack queries on deep-links (e.g. /recipes/<id>,
// /jellyfin/watch/<id>, /calendar) fire before the token is restored and
// bounce to /login or /dashboard on hard reload (FUNC-001).
function BootGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Client-mode bootstrap: resolve ?client=, persist it, restore stored mode and
    // register TV D-pad focus helpers only in TV mode. Runs once after hydration.
    const mode = initClientMode();
    if (mode === 'tv') {
      // Dynamic import keeps the desktop bundle untouched by the TV helper.
      import('@/lib/tv-focus').then(({ initTvFocus }) => {
        initTvFocus();
      });
    }

    // Auth persist hydration: token may already be restored synchronously.
    if (useAuthStore.persist.hasHydrated()) {
      setReady(true);
      return;
    }
    const unsub = useAuthStore.persist.onFinishHydration(() => setReady(true));
    return unsub;
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Wird geladen">
        <Loader2 className="h-8 w-8 animate-spin text-fg-muted" />
      </div>
    );
  }
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  // QueryClientProvider wraps the gate so queries only mount after auth +
  // client-mode are ready (children render only once BootGate is ready).
  return (
    <QueryClientProvider client={client}>
      <BootGate>{children}</BootGate>
    </QueryClientProvider>
  );
}
