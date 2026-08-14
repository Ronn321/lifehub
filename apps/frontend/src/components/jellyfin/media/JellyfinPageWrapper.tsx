'use client';

import React from 'react';
import { useJellyfinLayout } from '@/lib/jellyfin-layout-store';
import { Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export function JellyfinPageWrapper({ children }: { children: React.ReactNode }) {
  const fullWidth = useJellyfinLayout((s) => s.fullWidth);
  const toggleFullWidth = useJellyfinLayout((s) => s.toggleFullWidth);

  return (
    <>
      {/* Full-width toggle button */}
      <button
        onClick={toggleFullWidth}
        className="fixed top-4 right-4 z-30 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-bg-surface text-fg-muted hover:text-fg hover:border-brand-500/30 shadow-sm transition-colors"
        title={fullWidth ? 'Normale Breite' : 'Volle Breite'}
      >
        {fullWidth ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>
      <div className={cn(
        fullWidth
          ? '-mx-6 lg:-mx-8 -mt-6 lg:-mt-8 px-6 lg:px-8'
          : 'mx-auto max-w-7xl'
      )}>
        {children}
      </div>
    </>
  );
}
