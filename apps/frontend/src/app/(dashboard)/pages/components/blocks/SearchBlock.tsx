'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, Loader2, FileText, Globe, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';

/* ─── Types ─── */

type SearchScope = 'page' | 'domain' | 'global';

interface SearchResult {
  id: string;
  title: string;
  snippet?: string;
  type: 'page' | 'block' | 'domain';
  domain?: string;
  url?: string;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
}

/* ─── Props ─── */

interface SearchBlockProps {
  pageId?: string;
  scope?: SearchScope;
  onNavigate?: (pageId: string) => void;
}

/* ─── Scope config ─── */

const SCOPE_OPTIONS: Array<{ value: SearchScope; label: string; icon: typeof FileText }> = [
  { value: 'page', label: 'Diese Seite', icon: FileText },
  { value: 'domain', label: 'Pages', icon: FolderOpen },
  { value: 'global', label: 'Global', icon: Globe },
];

/* ─── Component ─── */

export function SearchBlock({ pageId, scope: initialScope = 'page', onNavigate }: SearchBlockProps) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<SearchScope>(initialScope);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [total, setTotal] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search
  const performSearch = useCallback(
    async (searchQuery: string, searchScope: SearchScope) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setTotal(0);
        setHasSearched(false);
        return;
      }

      setIsSearching(true);
      setHasSearched(true);

      try {
        const params = new URLSearchParams({ q: searchQuery.trim(), scope: searchScope });
        if (pageId && searchScope === 'page') {
          params.set('pageId', pageId);
        }

        const data = await api.get<SearchResponse>(`/search?${params.toString()}`);
        setResults(data.results ?? []);
        setTotal(data.total ?? 0);
      } catch {
        // Fallback: return empty results
        setResults([]);
        setTotal(0);
      } finally {
        setIsSearching(false);
      }
    },
    [pageId],
  );

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      performSearch(value, scope);
    }, 350);
  };

  const handleScopeChange = (newScope: SearchScope) => {
    setScope(newScope);
    if (query.trim()) {
      performSearch(query, newScope);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Suche nach Inhalten..."
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-zinc-400" />
        )}
      </div>

      {/* Scope Selector */}
      <div className="flex gap-1.5">
        {SCOPE_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              onClick={() => handleScopeChange(opt.value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                scope === opt.value
                  ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-transparent hover:bg-zinc-200 dark:hover:bg-zinc-700',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Results */}
      <div className="min-h-[60px]">
        {isSearching ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          </div>
        ) : hasSearched && results.length === 0 ? (
          <div className="text-center py-8">
            <Search className="h-8 w-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm text-zinc-400">Keine Ergebnisse gefunden</p>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-1">
            <p className="text-xs text-zinc-400 px-1">
              {total} Ergebnis{total !== 1 ? 'se' : ''}
            </p>
            <div className="space-y-0.5">
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => {
                    if (result.type === 'page' && onNavigate) {
                      onNavigate(result.id);
                    }
                  }}
                  className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {result.type === 'page' ? (
                      <FileText className="h-4 w-4 text-amber-500" />
                    ) : result.type === 'block' ? (
                      <FileText className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Globe className="h-4 w-4 text-zinc-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {result.title}
                    </p>
                    {result.snippet && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
                        {result.snippet}
                      </p>
                    )}
                    {result.domain && (
                      <p className="text-[10px] text-zinc-400 mt-0.5">{result.domain}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : !hasSearched ? (
          <div className="text-center py-8">
            <Search className="h-8 w-8 mx-auto mb-2 text-zinc-200 dark:text-zinc-700" />
            <p className="text-sm text-zinc-400">Gib einen Suchbegriff ein</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
