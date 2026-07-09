'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Search, X, Film, Monitor, Tv, Loader2, TrendingUp, Clock } from 'lucide-react';
import { cn } from '@/lib/cn';
import { searchMedia, type SearchResults, type JellyfinMediaItem } from '@/lib/jellyfin-media-api';
import { MediaCard } from './MediaCard';

/* ------------------------------------------------------------------ */
/*  SearchOverlay — Global search that slides down                    */
/* ------------------------------------------------------------------ */

interface SearchOverlayProps {
  serverId?: string;
  open: boolean;
  onClose: () => void;
}

export function SearchOverlay({ serverId = 'default', open, onClose }: SearchOverlayProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Auto-focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (!open) {
      setQuery('');
      setDebouncedQuery('');
    }
  }, [open]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Close on click outside
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  }, [onClose]);

  // Search query
  const { data: results, isLoading } = useQuery<SearchResults>({
    queryKey: ['jellyfin-search-overlay', debouncedQuery],
    queryFn: () => searchMedia(serverId, debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  });

  const totalResults =
    (results?.Movies.length ?? 0) +
    (results?.Series.length ?? 0) +
    (results?.Episodes.length ?? 0) +
    (results?.Collections.length ?? 0);

  function handleItemClick(item: JellyfinMediaItem) {
    onClose();
    if (item.Type === 'Movie') {
      router.push(`/jellyfin/movies/${item.Id}`);
    } else if (item.Type === 'Series') {
      router.push(`/jellyfin/series/${item.Id}`);
    } else if (item.Type === 'Episode') {
      router.push(`/jellyfin/watch/${item.Id}`);
    } else {
      router.push(`/jellyfin/collections/${item.Id}`);
    }
  }

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      {/* Overlay panel */}
      <div className="mx-auto max-w-3xl mt-[10vh] px-4">
        {/* Search bar */}
        <div className="relative animate-in slide-in-from-top-2 duration-200">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-fg-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filme, Serien, Schauspieler …"
            className="w-full rounded-2xl border-2 border-brand-500/50 bg-bg-surface py-4 pl-14 pr-12 text-lg font-medium placeholder:text-fg-muted/40 focus:outline-none focus:border-brand-500 shadow-2xl"
          />
          <button
            onClick={onClose}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-fg-muted hover:text-fg hover:bg-bg-muted/50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Results */}
        <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-2xl border border-border bg-bg-surface shadow-2xl animate-in slide-in-from-top-1 duration-200">
          {debouncedQuery.length < 2 ? (
            /* Empty state — recent/trending indicator */
            <div className="flex flex-col items-center justify-center py-12 text-fg-muted">
              <Search className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">Gib mindestens 2 Zeichen ein</p>
              <p className="text-xs mt-1 opacity-60">Durchsuche Filme, Serien, Episoden und Sammlungen</p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-fg-muted" />
            </div>
          ) : totalResults === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-fg-muted">
              <Search className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">Keine Ergebnisse</p>
              <p className="text-xs mt-1 opacity-60">Für &bdquo;{debouncedQuery}&rdquo; wurde nichts gefunden</p>
            </div>
          ) : (
            <div className="p-4 space-y-6">
              {/* Results count */}
              <p className="text-xs text-fg-muted font-medium tracking-wider uppercase">
                {totalResults} Ergebnis{totalResults !== 1 ? 'se' : ''}
              </p>

              {/* Movies */}
              {results!.Movies.length > 0 && (
                <ResultSection title="Filme" icon={<Film className="h-4 w-4 text-blue-400" />}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {results!.Movies.slice(0, 8).map(m => (
                      <button
                        key={m.Id}
                        onClick={() => handleItemClick(m)}
                        className="group text-left"
                      >
                        <MediaCard item={m} serverId={serverId} size="sm" showYear />
                      </button>
                    ))}
                  </div>
                </ResultSection>
              )}

              {/* Series */}
              {results!.Series.length > 0 && (
                <ResultSection title="Serien" icon={<Monitor className="h-4 w-4 text-purple-400" />}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {results!.Series.slice(0, 8).map(s => (
                      <button key={s.Id} onClick={() => handleItemClick(s)} className="group text-left">
                        <MediaCard item={s} serverId={serverId} size="sm" showYear />
                      </button>
                    ))}
                  </div>
                </ResultSection>
              )}

              {/* Episodes */}
              {results!.Episodes.length > 0 && (
                <ResultSection title="Episoden" icon={<Tv className="h-4 w-4 text-green-400" />}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {results!.Episodes.slice(0, 8).map(e => (
                      <button key={e.Id} onClick={() => handleItemClick(e)} className="group text-left">
                        <MediaCard item={e} serverId={serverId} size="sm" showYear={false} />
                      </button>
                    ))}
                  </div>
                </ResultSection>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ResultSection — category wrapper                                  */
/* ------------------------------------------------------------------ */

function ResultSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-bold">{title}</h3>
      </div>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  SearchTrigger — floating search button + keyboard shortcut        */
/* ------------------------------------------------------------------ */

interface SearchTriggerProps {
  onOpen: () => void;
}

export function SearchTrigger({ onOpen }: SearchTriggerProps) {
  // Ctrl+K or / to open search
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName))) {
        e.preventDefault();
        onOpen();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onOpen]);

  return (
    <button
      onClick={onOpen}
      className="flex items-center gap-2 rounded-lg border border-border bg-bg-surface px-3 py-1.5 text-xs text-fg-muted hover:text-fg hover:border-brand-500/30 transition-colors"
      title="Suchen (Strg+K)"
    >
      <Search className="h-3.5 w-3.5" />
      <span>Suchen</span>
      <kbd className="ml-1 rounded border border-border px-1.5 py-0.5 text-[10px] font-mono text-fg-subtle">/</kbd>
    </button>
  );
}
