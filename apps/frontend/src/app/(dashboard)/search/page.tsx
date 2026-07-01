'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { Search, Loader2, Image, Plane, Code2, BookOpen, ShoppingCart, PiggyBank, ShieldCheck, Lock, FileText, CalendarIcon, Server, Clapperboard, ExternalLink, X } from 'lucide-react';
import { cn } from '@/lib/cn';

type SearchDomain =
  | 'media' | 'travel' | 'projects' | 'recipes' | 'shopping'
  | 'finance' | 'insurance' | 'vault' | 'documents' | 'calendar'
  | 'it_inventory' | 'jellyfin';

interface SearchResultItem {
  id: string;
  domain: SearchDomain;
  title: string;
  description: string | null;
  url: string;
  thumbnailUrl: string | null;
  matchField: string | null;
  matchSnippet: string | null;
}

interface SearchResults {
  query: string;
  totalResults: number;
  results: SearchResultItem[];
  grouped: Partial<Record<SearchDomain, SearchResultItem[]>>;
}

const domainConfig: Record<SearchDomain, { label: string; icon: typeof Image; color: string }> = {
  media:        { label: 'Medien',       icon: Image,         color: 'text-pink-500' },
  travel:       { label: 'Reisen',       icon: Plane,         color: 'text-sky-500' },
  projects:     { label: 'Projekte',     icon: Code2,         color: 'text-violet-500' },
  recipes:      { label: 'Rezepte',      icon: BookOpen,      color: 'text-orange-500' },
  shopping:     { label: 'Einkauf',      icon: ShoppingCart,  color: 'text-emerald-500' },
  finance:      { label: 'Finanzen',     icon: PiggyBank,     color: 'text-yellow-500' },
  insurance:    { label: 'Versicherungen', icon: ShieldCheck, color: 'text-red-500' },
  vault:        { label: 'Tresor',       icon: Lock,          color: 'text-amber-500' },
  documents:    { label: 'Dokumente',    icon: FileText,      color: 'text-blue-500' },
  calendar:     { label: 'Kalender',     icon: CalendarIcon,  color: 'text-cyan-500' },
  it_inventory: { label: 'Haus-IT',      icon: Server,        color: 'text-slate-500' },
  jellyfin:     { label: 'Jellyfin',     icon: Clapperboard,  color: 'text-purple-500' },
};

const domainOrder: SearchDomain[] = [
  'media', 'travel', 'projects', 'recipes', 'shopping',
  'finance', 'insurance', 'vault', 'documents', 'calendar',
  'it_inventory', 'jellyfin',
];

type FilterMode = 'all' | SearchDomain;

export default function SearchPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!accessToken) { router.push('/login'); return; }
    if (debouncedQuery.length < 1) {
      setResults(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ q: debouncedQuery });
    if (filter !== 'all') params.set('type', filter);

    api.get<SearchResults>(`/search?${params.toString()}`)
      .then((data) => {
        if (!cancelled) setResults(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Fehler bei der Suche');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [debouncedQuery, filter, accessToken]);

  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(value.trim());
    }, 300);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setResults(null);
    setFilter('all');
    inputRef.current?.focus();
  }, []);

  const totalFiltered = filter === 'all' ? (results?.totalResults ?? 0) : (results?.grouped[filter]?.length ?? 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Suche</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Durchsuche alle Bereiche deiner LifeHub-Instanz
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-muted" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Suche nach Medien, Reisen, Rezepten, Dokumenten..."
          className="w-full rounded-xl border border-border bg-bg-surface py-3.5 pl-12 pr-12 text-base placeholder:text-fg-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          autoFocus
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Domain Filter Chips */}
      {results && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
              filter === 'all'
                ? 'bg-brand-500 text-white'
                : 'bg-bg-surface border border-border text-fg-muted hover:text-fg hover:border-fg-muted'
            )}
          >
            Alle ({results.totalResults})
          </button>
          {domainOrder.map((domain) => {
            const count = results.grouped[domain]?.length ?? 0;
            if (count === 0) return null;
            const cfg = domainConfig[domain];
            return (
              <button
                key={domain}
                onClick={() => setFilter(filter === domain ? 'all' : domain)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
                  filter === domain
                    ? 'bg-brand-500 text-white'
                    : 'bg-bg-surface border border-border text-fg-muted hover:text-fg hover:border-fg-muted'
                )}
              >
                <cfg.icon className={cn('h-3.5 w-3.5', filter !== domain && cfg.color)} />
                {cfg.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && debouncedQuery.length > 0 && results && totalFiltered === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="mb-4 h-12 w-12 text-fg-subtle" />
          <p className="text-lg font-medium">Keine Ergebnisse gefunden</p>
          <p className="mt-1 text-sm text-fg-muted">
            {filter === 'all'
              ? `Für "${debouncedQuery}" wurde nichts gefunden.`
              : `Im Bereich ${domainConfig[filter as SearchDomain]?.label ?? filter} wurde nichts gefunden.`}
          </p>
        </div>
      )}

      {/* Grouped Results */}
      {!loading && results && totalFiltered > 0 && (
        <div className="space-y-8">
          {(filter === 'all' ? domainOrder : [filter]).map((domain) => {
            const items = results.grouped[domain];
            if (!items || items.length === 0) return null;
            const cfg = domainConfig[domain];

            return (
              <section key={domain}>
                <div className="mb-3 flex items-center gap-2">
                  <cfg.icon className={cn('h-5 w-5', cfg.color)} />
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-muted">
                    {cfg.label}
                  </h2>
                  <span className="text-xs text-fg-subtle">({items.length})</span>
                </div>
                <div className="space-y-2">
                  {items.map((item) => (
                    <a
                      key={`${item.domain}-${item.id}`}
                      href={item.url}
                      className="group flex items-start gap-4 rounded-xl border border-border bg-bg-surface p-4 transition-colors hover:border-brand-500/40 hover:bg-brand-500/[0.02]"
                    >
                      {/* Thumbnail */}
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-bg">
                        {item.thumbnailUrl ? (
                          <img
                            src={item.thumbnailUrl}
                            alt=""
                            className="h-full w-full rounded-lg object-cover"
                          />
                        ) : (
                          <cfg.icon className={cn('h-5 w-5', cfg.color)} />
                        )}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium group-hover:text-brand-500 transition-colors">
                            {item.title}
                          </p>
                          <ExternalLink className="h-3 w-3 shrink-0 text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                        {item.matchField && (
                          <p className="mt-0.5 truncate text-xs text-fg-muted">
                            Gefunden in: {item.matchField}
                          </p>
                        )}
                        {item.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-fg-subtle">{item.description}</p>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Initial State */}
      {!loading && debouncedQuery.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Search className="mb-4 h-16 w-16 text-fg-subtle" />
          <p className="text-lg font-medium">Gib einen Suchbegriff ein</p>
          <p className="mt-1 text-sm text-fg-muted max-w-md">
            Durchsuche Medien, Reisen, Projekte, Rezepte, Einkaufslisten, Finanzen, Versicherungen,
            Tresor, Dokumente, Kalender, Haus-IT und Jellyfin.
          </p>
        </div>
      )}
    </div>
  );
}
