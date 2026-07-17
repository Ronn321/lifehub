'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Globe, ChevronLeft, ChevronRight, RotateCw, Plus, X,
  ExternalLink, Loader2, Bookmark, BookmarkPlus, Star,
} from 'lucide-react';

interface BrowserBlockProps {
  blockId: string;
  pageId: string;
  content: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  /** Optional extra overlay buttons rendered on top of the iframe */
  extraOverlayControls?: React.ReactNode;
  /** Called when the user navigates to a new URL */
  onUrlChange?: (url: string) => void;
}

interface BrowserSession {
  id: string;
  blockId: string;
  startUrl: string;
  settings: Record<string, unknown>;
}

interface BrowserTab {
  id: string;
  url: string;
  title: string | null;
  isActive: boolean;
}

interface BookmarkItem {
  id: string;
  url: string;
  title: string | null;
}

const SEARXNG_HOST = '100.124.4.24:3121';

const PROXY_BASE = typeof window !== 'undefined'
  ? `http://${window.location.hostname}:3007/api/v1/browser/proxy`
  : '/api/v1/browser/proxy';

/** Check if a URL can be loaded directly in an iframe (no proxy needed) */
function isDirectUrl(url: string): boolean {
  try {
    const u = new URL(url);
    // SearXNG is configured with frame-ancestors * — always embeddable
    return u.host === SEARXNG_HOST;
  } catch { return false; }
}

export function BrowserBlock({ blockId, pageId, content, onChange, extraOverlayControls, onUrlChange }: BrowserBlockProps) {
  const queryClient = useQueryClient();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Session
  const sessionId = (content.sessionId as string) ?? null;
  const startUrl = (content.startUrl as string) ?? '';

  // UI state
  const [urlInput, setUrlInput] = useState(startUrl || '');
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ─── Session init ──────────────────────────────────────────────────────────
  const { mutate: initSession } = useMutation({
    mutationFn: () =>
      api.post<BrowserSession>(`/pages/browser/${blockId}/session`, { startUrl }),
    onSuccess: (session: BrowserSession) => {
      onChange({ ...content, sessionId: session.id });
    },
  });

  useEffect(() => {
    if (!sessionId) initSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-navigate to startUrl when session is ready
  useEffect(() => {
    if (sessionId && startUrl && !currentUrl) {
      navigate(startUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ─── Tabs ─────────────────────────────────────────────────────────────────
  const { data: tabs } = useQuery({
    queryKey: ['browser-tabs', sessionId],
    queryFn: () => api.get<BrowserTab[]>(`/pages/research-sessions/${sessionId}/tabs`),
    enabled: !!sessionId,
  });

  const activeTab = tabs?.find((t) => t.isActive);

  const createTabMutation = useMutation({
    mutationFn: ({ url, title }: { url: string; title?: string }) =>
      api.post<BrowserTab>(`/pages/research-sessions/${sessionId}/tabs`, { url, title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['browser-tabs', sessionId] });
    },
  });

  const updateTabMutation = useMutation({
    mutationFn: ({ tabId, url, title }: { tabId: string; url: string; title?: string }) =>
      api.put(`/pages/browser-tabs/${tabId}`, { url, title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['browser-tabs', sessionId] });
    },
  });

  const closeTabMutation = useMutation({
    mutationFn: (tabId: string) => api.delete(`/pages/browser-tabs/${tabId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['browser-tabs', sessionId] });
    },
  });

  const activateTabMutation = useMutation({
    mutationFn: (tabId: string) =>
      api.post(`/pages/research-sessions/${sessionId}/tabs/${tabId}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['browser-tabs', sessionId] });
    },
  });

  // ─── Bookmarks ─────────────────────────────────────────────────────────────
  const { data: bookmarks } = useQuery({
    queryKey: ['browser-bookmarks', sessionId],
    queryFn: () => api.get<BookmarkItem[]>(`/pages/browser/sessions/${sessionId}/bookmarks`),
    enabled: !!sessionId,
  });

  const addBookmarkMutation = useMutation({
    mutationFn: () =>
      api.post(`/pages/browser/sessions/${sessionId}/bookmarks`, {
        url: currentUrl, title: urlInput,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['browser-bookmarks', sessionId] });
    },
  });

  const removeBookmarkMutation = useMutation({
    mutationFn: (bookmarkId: string) => api.delete(`/pages/browser/bookmarks/${bookmarkId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['browser-bookmarks', sessionId] });
    },
  });

  const isBookmarked = currentUrl && bookmarks?.some((b) => b.url === currentUrl);

  // Close bookmark dropdown on outside click
  useEffect(() => {
    if (!showBookmarks) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowBookmarks(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showBookmarks]);

  // ─── Navigation ────────────────────────────────────────────────────────────
  const normalizeUrl = useCallback((input: string) => {
    const n = input.trim();
    if (!n) return '';
    return /^https?:\/\//i.test(n) ? n : 'https://' + n;
  }, []);

  const getProxyUrl = useCallback((target: string) => {
    // Use direct URL for embeddable services (SearXNG), proxy for everything else
    if (isDirectUrl(target)) return target;
    return `${PROXY_BASE}?url=${encodeURIComponent(target)}`;
  }, []);

  const navigate = useCallback((url: string, opts?: { createTab?: boolean }) => {
    const normalized = normalizeUrl(url);
    if (!normalized) return;
    setUrlInput(normalized);
    setCurrentUrl(normalized);
    setIsLoading(true);
    setHistory((prev) => {
      const h = prev.slice(0, historyIndex + 1);
      h.push(normalized);
      return h;
    });
    setHistoryIndex((prev) => prev + 1);
    if (!sessionId) return;
    if (opts?.createTab || !activeTab) {
      createTabMutation.mutate({ url: normalized, title: normalized });
    } else {
      updateTabMutation.mutate({ tabId: activeTab.id, url: normalized, title: normalized });
    }
    onUrlChange?.(normalized);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizeUrl, historyIndex, sessionId, activeTab?.id]);

  const handleGo = useCallback(() => navigate(urlInput), [urlInput, navigate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleGo();
  }, [handleGo]);

  const handleBack = useCallback(() => {
    if (historyIndex <= 0) return;
    const idx = historyIndex - 1;
    const url = history[idx];
    if (!url) return;
    setHistoryIndex(idx);
    setUrlInput(url);
    setCurrentUrl(url);
    setIsLoading(true);
  }, [historyIndex, history]);

  const handleForward = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const idx = historyIndex + 1;
    const url = history[idx];
    if (!url) return;
    setHistoryIndex(idx);
    setUrlInput(url);
    setCurrentUrl(url);
    setIsLoading(true);
  }, [historyIndex, history]);

  const handleRefresh = useCallback(() => {
    if (!currentUrl) return;
    setCurrentUrl(null);
    setTimeout(() => setCurrentUrl(currentUrl), 50);
    setIsLoading(true);
  }, [currentUrl]);

  const handleTabClick = useCallback((tab: BrowserTab) => {
    setUrlInput(tab.url);
    setCurrentUrl(tab.url);
    setIsLoading(true);
    setShowBookmarks(false);
    activateTabMutation.mutate(tab.id);
  }, [activateTabMutation]);

  const handleCloseTab = useCallback((tabId: string) => {
    closeTabMutation.mutate(tabId);
  }, [closeTabMutation]);

  const handleBookmarkNavigate = useCallback((url: string) => {
    setShowBookmarks(false);
    navigate(url, { createTab: true });
  }, [navigate]);

  // Loading timeout
  useEffect(() => {
    if (!currentUrl) return;
    const timer = setTimeout(() => setIsLoading(false), 5000);
    return () => clearTimeout(timer);
  }, [currentUrl]);

  const tabList = tabs ?? [];
  const bookmarkList = bookmarks ?? [];

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* ── Tab Bar ── */}
      <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 overflow-x-auto">
        {tabList.map((tab) => (
          <div
            key={tab.id}
            onClick={() => handleTabClick(tab)}
            className={`group flex items-center gap-1 px-2.5 py-1.5 text-xs cursor-pointer border-r border-zinc-200 dark:border-zinc-700 min-w-0 max-w-[160px] transition-colors ${
              tab.id === (activeTab?.id ?? null)
                ? 'bg-white dark:bg-zinc-900 text-fg'
                : 'bg-zinc-50 dark:bg-zinc-800/50 text-fg-muted hover:bg-zinc-100 dark:hover:bg-zinc-700'
            }`}
          >
            <Globe className="h-3 w-3 shrink-0" />
            <span className="truncate">{tab.title || tab.url}</span>
            <button
              onClick={(e) => { e.stopPropagation(); handleCloseTab(tab.id); }}
              className="ml-auto shrink-0 opacity-0 group-hover:opacity-100 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded p-0.5 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          onClick={() => { setUrlInput(''); setCurrentUrl(null); }}
          className="p-1.5 text-fg-muted hover:text-fg hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded shrink-0 ml-1"
          title="Neuer Tab"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── URL Bar ── */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
        <button onClick={handleBack} disabled={historyIndex <= 0}
          className="p-1 text-fg-muted hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed"
          title="Zurück"><ChevronLeft className="h-4 w-4" /></button>
        <button onClick={handleForward} disabled={historyIndex >= history.length - 1}
          className="p-1 text-fg-muted hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed"
          title="Vorwärts"><ChevronRight className="h-4 w-4" /></button>
        <button onClick={handleRefresh} disabled={!currentUrl}
          className="p-1 text-fg-muted hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed"
          title="Aktualisieren"><RotateCw className="h-4 w-4" /></button>

        {/* Bookmarks dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowBookmarks(!showBookmarks)}
            disabled={!sessionId}
            className="p-1 text-fg-muted hover:text-fg disabled:opacity-30"
            title="Lesezeichen"
          >
            <Star className="h-4 w-4" />
          </button>
          {showBookmarks && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-border py-1 z-50 max-h-[300px] overflow-y-auto">
              <div className="px-3 py-2 text-xs font-semibold text-fg-muted uppercase border-b border-border">
                Lesezeichen
              </div>
              {bookmarkList.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-fg-muted">
                  Keine Lesezeichen
                </div>
              ) : (
                bookmarkList.map((bm) => (
                  <div key={bm.id} className="group flex items-center gap-1 px-2 py-1">
                    <button
                      onClick={() => handleBookmarkNavigate(bm.url)}
                      className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-bg-surface transition-colors min-w-0"
                    >
                      <Globe className="h-3.5 w-3.5 shrink-0 text-fg-muted" />
                      <span className="truncate">{bm.title || bm.url}</span>
                    </button>
                    <button
                      onClick={() => removeBookmarkMutation.mutate(bm.id)}
                      className="p-1 rounded text-fg-subtle hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      title="Entfernen"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <input
          type="text" value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="URL eingeben oder suchen..."
          className="flex-1 px-2.5 py-1 text-sm rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
        />
        <button onClick={handleGo} disabled={!urlInput.trim()}
          className="px-3 py-1 text-sm rounded bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 transition-colors"
        >Go</button>

        {/* Show/hide bookmarks toggle */}
        {currentUrl && (
          <button
            onClick={() => {
              if (isBookmarked) {
                const bm = bookmarkList.find((b) => b.url === currentUrl);
                if (bm) removeBookmarkMutation.mutate(bm.id);
              } else {
                addBookmarkMutation.mutate();
              }
            }}
            disabled={addBookmarkMutation.isPending || removeBookmarkMutation.isPending}
            className={`p-1 transition-colors ${
              isBookmarked ? 'text-amber-500' : 'text-fg-muted hover:text-fg'
            }`}
            title={isBookmarked ? 'Lesezeichen entfernen' : 'Als Lesezeichen speichern'}
          >
            <BookmarkPlus className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>
        )}
        {currentUrl && (
          <a href={getProxyUrl(currentUrl)} target="_blank" rel="noopener noreferrer"
            className="p-1 text-fg-muted hover:text-fg" title="In neuem Tab öffnen">
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      {/* ── iframe Area ── */}
      <div className="relative bg-zinc-900" style={{ minHeight: '500px', height: '500px' }}>
        {currentUrl ? (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 z-10">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              </div>
            )}
            <iframe
              ref={iframeRef} key={currentUrl}
              src={getProxyUrl(currentUrl)}
              className="w-full h-full border-none"
              sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
              title="Browser"
              onLoad={() => setIsLoading(false)}
            />
            {/* Bookmark toggle overlay */}
            <button
              onClick={() => {
                if (isBookmarked) {
                  const bm = bookmarkList.find((b) => b.url === currentUrl);
                  if (bm) removeBookmarkMutation.mutate(bm.id);
                } else {
                  addBookmarkMutation.mutate();
                }
              }}
              disabled={addBookmarkMutation.isPending || removeBookmarkMutation.isPending}
              className={`absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1.5 text-xs rounded shadow-lg backdrop-blur-sm transition-colors disabled:opacity-50 ${
                isBookmarked
                  ? 'bg-amber-600/90 hover:bg-amber-700 text-white'
                  : 'bg-zinc-700/80 hover:bg-zinc-600 text-white'
              }`}
              title={isBookmarked ? 'Lesezeichen entfernen' : 'Als Lesezeichen speichern'}
            >
              <Bookmark className={`h-3 w-3 ${isBookmarked ? 'fill-current' : ''}`} />
              <span>{isBookmarked ? 'Gespeichert' : 'Speichern'}</span>
            </button>
            {extraOverlayControls}
            <a
              href={getProxyUrl(currentUrl)} target="_blank" rel="noopener noreferrer"
              className="absolute top-2 left-2 flex items-center gap-1 px-2.5 py-1.5 text-xs rounded bg-zinc-700/80 hover:bg-zinc-600 text-white shadow-lg backdrop-blur-sm transition-colors"
              title="In neuem Tab öffnen"
            >
              <ExternalLink className="h-3 w-3" />
              <span>Neuer Tab</span>
            </a>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-3">
            <Globe className="h-16 w-16 opacity-20" />
            <p className="text-sm">URL eingeben und Go klicken</p>
          </div>
        )}
      </div>
    </div>
  );
}
