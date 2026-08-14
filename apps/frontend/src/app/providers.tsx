'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { initClientMode } from '@/lib/client-mode';

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  // Client-mode bootstrap: resolve ?client=, persist it, restore stored mode and
  // register TV D-pad focus helpers only in TV mode. Runs once after hydration.
  useEffect(() => {
    const mode = initClientMode();
    if (mode === 'tv') {
      // Dynamic import keeps the desktop bundle untouched by the TV helper.
      import('@/lib/tv-focus').then(({ initTvFocus }) => {
        initTvFocus();
      });
    }
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
