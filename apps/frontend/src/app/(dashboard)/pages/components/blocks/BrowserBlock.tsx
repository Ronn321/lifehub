'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bookmark,
  BookmarkPlus,
  ChevronLeft,
  ChevronRight,
  Download,
  Fullscreen,
  Globe,
  Loader2,
  Maximize2,
  MousePointer2,
  Plus,
  RotateCw,
  Star,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import {
  RemoteBrowserState,
  RemoteBrowserTab,
  RemoteBrowserViewport,
  RemoteBrowserViewportHandle,
} from './RemoteBrowserViewport';

interface BrowserBlockProps {
  blockId: string;
  pageId: string;
  content: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  extraOverlayControls?: React.ReactNode;
  onUrlChange?: (url: string) => void;
}

interface BrowserSession {
  id: string;
  blockId: string;
  startUrl: string;
  settings: Record<string, unknown>;
}

interface StoredBrowserTab {
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

interface DownloadItem {
  filename: string;
  size: number;
  status: 'in_progress' | 'complete' | 'too_large';
  updatedAt: string;
}

interface StreamInfo {
  sessionId: string;
  streamPath: string;
  token: string;
  expiresAt: number;
}

type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'error';

function normalizeInput(input: string): string {
  const value = input.trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[^\s./]+\.[^\s./]+/.test(value)) return `https://${value}`;
  return `https://www.google.com/search?q=${encodeURIComponent(value)}`;
}

const DEFAULT_START_URL = 'https://www.google.com/';

export function BrowserBlock({
  blockId,
  pageId: _pageId,
  content,
  onChange,
  extraOverlayControls,
  onUrlChange,
}: BrowserBlockProps) {
  const queryClient = useQueryClient();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<RemoteBrowserViewportHandle>(null);
  const syncedRendererTabsRef = useRef(new Map<string, string>());
  const lastSyncSignatureRef = useRef('');

  const sessionId = typeof content.sessionId === 'string' ? content.sessionId : null;
  const startUrl = typeof content.startUrl === 'string' && content.startUrl.trim()
    ? content.startUrl
    : DEFAULT_START_URL;
  const [urlInput, setUrlInput] = useState(startUrl);
  const [remoteState, setRemoteState] = useState<RemoteBrowserState | null>(null);
  const [stream, setStream] = useState<StreamInfo | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'normal' | 'medium' | 'fullscreen'>('normal');

  // Layout-Modus an die Seite melden: 'medium' füllt die Hauptseite (Sidebar
  // bleibt sichtbar), 'fullscreen' klappt zusätzlich die Sidebar ein.
  const applyLayoutMode = useCallback((mode: 'normal' | 'medium' | 'fullscreen') => {
    setLayoutMode(mode);
    window.dispatchEvent(new CustomEvent('lifehub:browser-layout', { detail: { mode } }));
    if (mode === 'fullscreen') {
      window.dispatchEvent(new CustomEvent('lifehub:sidebar-collapse', { detail: { collapsed: true } }));
    } else {
      // medium/normal: Sidebar sichtbar lassen
      window.dispatchEvent(new CustomEvent('lifehub:sidebar-collapse', { detail: { collapsed: false } }));
    }
  }, []);

  // Beim Unmount in den Normal-Modus zurückkehren (falls die Seite verlassen wird)
  useEffect(() => {
    return () => {
      window.dispatchEvent(new CustomEvent('lifehub:browser-layout', { detail: { mode: 'normal' } }));
      window.dispatchEvent(new CustomEvent('lifehub:sidebar-collapse', { detail: { collapsed: false } }));
    };
  }, []);

  const { mutate: initSession } = useMutation({
    mutationFn: () => api.post<BrowserSession>(`/pages/browser/${blockId}/session`, { startUrl }),
    onSuccess: (session) => onChange({ ...content, sessionId: session.id }),
  });

  useEffect(() => {
    if (!sessionId) initSession();
    // A block without a session only needs one initialization request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const { mutate: startStream } = useMutation({
    mutationFn: (id: string) => api.post<StreamInfo>(`/browser/sessions/${id}/stream`),
    onSuccess: (info) => setStream(info),
    onError: () => setStatus('error'),
  });

  useEffect(() => {
    if (sessionId && (!stream || stream.sessionId !== sessionId)) startStream(sessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const { data: storedTabs } = useQuery({
    queryKey: ['browser-tabs', sessionId],
    queryFn: () => api.get<StoredBrowserTab[]>(`/pages/browser/sessions/${sessionId}/tabs`),
    enabled: !!sessionId,
  });

  const { data: bookmarks } = useQuery({
    queryKey: ['browser-bookmarks', sessionId],
    queryFn: () => api.get<BookmarkItem[]>(`/pages/browser/sessions/${sessionId}/bookmarks`),
    enabled: !!sessionId,
  });

  const { data: downloads } = useQuery({
    queryKey: ['browser-downloads', sessionId],
    queryFn: () => api.get<DownloadItem[]>(`/browser/sessions/${sessionId}/downloads`),
    enabled: !!sessionId,
    refetchInterval: 5000,
  });

  const activeTab = remoteState?.tabs.find((tab) => tab.isActive) ?? null;
  const currentUrl = activeTab && activeTab.url !== 'about:blank' ? activeTab.url : '';
  const tabList = remoteState?.tabs ?? [];
  const bookmarkList = bookmarks ?? [];
  const isBookmarked = Boolean(currentUrl && bookmarkList.some((bookmark) => bookmark.url === currentUrl));

  const handleRemoteState = useCallback((state: RemoteBrowserState) => {
    setRemoteState(state);
    const active = state.tabs.find((tab) => tab.isActive);
    const url = active?.url && active.url !== 'about:blank' ? active.url : '';
    setUrlInput(url);
    if (url) onUrlChange?.(url);
  }, [onUrlChange]);

  const handleStatus = useCallback((nextStatus: ConnectionStatus) => {
    setStatus(nextStatus);
    // Nach Verbindungsverlust (Server-Neustart, Token-Ablauf) einen frischen
    // Stream-Token holen — der alte Token ist sonst nach 5 Min/Server-Restart
    // ungültig und der Client reconnectet endlos mit abgelehntem Token.
    if (nextStatus === 'error' && sessionId) startStream(sessionId);
  }, [sessionId, startStream]);

  // Keep the LifeHub tab metadata synchronized while Chromium remains the source of truth
  // for cookies, local storage, history and the actual open pages.
  useEffect(() => {
    if (!sessionId || !remoteState || remoteState.tabs.length === 0) return;
    const signature = remoteState.tabs.map((tab) => `${tab.id}:${tab.url}:${tab.title}:${tab.isActive}`).join('|');
    if (signature === lastSyncSignatureRef.current) return;
    lastSyncSignatureRef.current = signature;

    const synchronize = async () => {
      const liveIds = new Set(remoteState.tabs.map((tab) => tab.id));
      for (const [rendererTabId, storedTabId] of syncedRendererTabsRef.current) {
        if (!liveIds.has(rendererTabId)) {
          await api.delete(`/pages/browser/sessions/${sessionId}/tabs/${storedTabId}`).catch(() => undefined);
          syncedRendererTabsRef.current.delete(rendererTabId);
        }
      }

      for (const tab of remoteState.tabs) {
        const knownId = syncedRendererTabsRef.current.get(tab.id)
          ?? storedTabs?.find((stored) => stored.url === tab.url)?.id;
        if (knownId) {
          syncedRendererTabsRef.current.set(tab.id, knownId);
          await api.put(`/pages/browser/sessions/${sessionId}/tabs/${knownId}`, {
            url: tab.url,
            title: tab.title,
            isActive: tab.isActive,
          }).catch(() => undefined);
        } else {
          const created = await api.post<StoredBrowserTab>(`/pages/browser/sessions/${sessionId}/tabs`, {
            url: tab.url,
            title: tab.title,
          }).catch(() => null);
          if (created) syncedRendererTabsRef.current.set(tab.id, created.id);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['browser-tabs', sessionId] });
    };
    void synchronize();
  }, [queryClient, remoteState, sessionId, storedTabs]);

  const navigate = useCallback((input: string) => {
    const target = normalizeInput(input);
    if (!target) return;
    setUrlInput(input);
    viewportRef.current?.sendInput({ type: 'navigate', url: target });
    onUrlChange?.(target);
  }, [onUrlChange]);

  const addBookmarkMutation = useMutation({
    mutationFn: () => api.post(`/pages/browser/sessions/${sessionId}/bookmarks`, {
      url: currentUrl,
      title: activeTab?.title || currentUrl,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['browser-bookmarks', sessionId] }),
  });

  const removeBookmarkMutation = useMutation({
    mutationFn: (bookmarkId: string) => api.delete(`/pages/browser/bookmarks/${bookmarkId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['browser-bookmarks', sessionId] }),
  });

  const closeBookmark = useCallback((bookmarkId: string) => {
    removeBookmarkMutation.mutate(bookmarkId);
  }, [removeBookmarkMutation]);

  useEffect(() => {
    if (!showBookmarks) return undefined;
    const handler = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setShowBookmarks(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showBookmarks]);

  const connectionLabel = useMemo(() => ({
    connecting: 'Verbinde…',
    connected: 'Verbunden',
    reconnecting: 'Verbindung wird wiederhergestellt…',
    error: 'Browser nicht erreichbar',
  }[status]), [status]);

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-0.5 overflow-x-auto border-b border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
        {tabList.map((tab: RemoteBrowserTab) => (
          <div
            key={tab.id}
            onClick={() => viewportRef.current?.sendInput({ type: 'activate-tab', tabId: tab.id })}
            className={`group flex min-w-0 max-w-[180px] cursor-pointer items-center gap-1 border-r border-zinc-200 px-2.5 py-1.5 text-xs dark:border-zinc-700 ${
              tab.isActive ? 'bg-white text-fg dark:bg-zinc-900' : 'text-fg-muted hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <Globe className="h-3 w-3 shrink-0" />
            <span className="truncate">{tab.title || tab.url || 'Neuer Tab'}</span>
            <button
              onClick={(event) => {
                event.stopPropagation();
                viewportRef.current?.sendInput({ type: 'close-tab', tabId: tab.id });
              }}
              className="ml-auto shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:bg-zinc-200 group-hover:opacity-100 dark:hover:bg-zinc-600"
              title="Tab schließen"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          onClick={() => viewportRef.current?.sendInput({ type: 'new-tab' })}
          className="ml-1 shrink-0 rounded p-1.5 text-fg-muted hover:bg-zinc-200 hover:text-fg dark:hover:bg-zinc-700"
          title="Neuer Tab"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-1 border-b border-zinc-200 bg-zinc-50 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-800/50">
        <button onClick={() => viewportRef.current?.sendInput({ type: 'back' })} className="p-1 text-fg-muted hover:text-fg" title="Zurück">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button onClick={() => viewportRef.current?.sendInput({ type: 'forward' })} className="p-1 text-fg-muted hover:text-fg" title="Vorwärts">
          <ChevronRight className="h-4 w-4" />
        </button>
        <button onClick={() => viewportRef.current?.sendInput({ type: 'reload' })} className="p-1 text-fg-muted hover:text-fg" title="Aktualisieren">
          <RotateCw className="h-4 w-4" />
        </button>
        <div ref={dropdownRef} className="relative">
          <button onClick={() => setShowBookmarks((visible) => !visible)} disabled={!sessionId} className="p-1 text-fg-muted hover:text-fg disabled:opacity-30" title="Lesezeichen">
            <Star className="h-4 w-4" />
          </button>
          {showBookmarks && (
            <div className="absolute left-0 top-full z-50 mt-1 max-h-[300px] w-64 overflow-y-auto rounded-xl border border-border bg-white py-1 shadow-xl dark:bg-zinc-900">
              <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase text-fg-muted">Lesezeichen</div>
              {bookmarkList.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-fg-muted">Keine Lesezeichen</div>
              ) : bookmarkList.map((bookmark) => (
                <div key={bookmark.id} className="group flex items-center gap-1 px-2 py-1">
                  <button onClick={() => { setShowBookmarks(false); navigate(bookmark.url); }} className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-bg-surface">
                    <Globe className="h-3.5 w-3.5 shrink-0 text-fg-muted" />
                    <span className="truncate">{bookmark.title || bookmark.url}</span>
                  </button>
                  <button onClick={() => closeBookmark(bookmark.id)} className="shrink-0 rounded p-1 text-fg-subtle opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100" title="Entfernen">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button onClick={() => setShowDownloads((visible) => !visible)} disabled={!sessionId} className="flex items-center gap-0.5 p-1 text-fg-muted hover:text-fg disabled:opacity-30" title="Downloads">
            <Download className="h-4 w-4" />
            {downloads && downloads.length > 0 && <span className="text-[10px]">{downloads.length}</span>}
          </button>
          {showDownloads && (
            <div className="absolute left-0 top-full z-50 mt-1 max-h-[300px] w-72 overflow-y-auto rounded-xl border border-border bg-white py-1 shadow-xl dark:bg-zinc-900">
              <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase text-fg-muted">Downloads</div>
              {!downloads || downloads.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-fg-muted">Noch keine Downloads</div>
              ) : downloads.map((download) => (
                <button
                  key={`${download.filename}-${download.updatedAt}`}
                  disabled={download.status !== 'complete'}
                  onClick={() => api.download(`/browser/sessions/${sessionId}/downloads/${encodeURIComponent(download.filename)}`)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-bg-surface disabled:cursor-wait disabled:opacity-60"
                >
                  <span className="min-w-0 truncate">{download.filename}</span>
                  <span className="shrink-0 text-xs text-fg-muted">{download.status === 'complete' ? `${Math.ceil(download.size / 1024)} KB` : download.status === 'too_large' ? 'zu groß' : 'läuft…'}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <input
          type="text"
          value={urlInput}
          onChange={(event) => setUrlInput(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') navigate(urlInput); }}
          placeholder="URL eingeben oder suchen…"
          className="flex-1 rounded border border-zinc-300 bg-white px-2.5 py-1 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 dark:border-zinc-600 dark:bg-zinc-900"
        />
        <button onClick={() => navigate(urlInput)} disabled={!urlInput.trim()} className="rounded bg-amber-600 px-3 py-1 text-sm text-white transition-colors hover:bg-amber-700 disabled:opacity-50">Go</button>
        {remoteState && remoteState.canControl === false && (
          <button
            onClick={() => viewportRef.current?.sendInput({ type: 'take-control' })}
            className="flex items-center gap-1 rounded border border-amber-500/50 px-2 py-1 text-xs text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/30"
            title="Eingabekontrolle übernehmen"
          >
            <MousePointer2 className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Kontrolle übernehmen</span>
          </button>
        )}
        {currentUrl && (
          <button
            onClick={() => {
              const bookmark = bookmarkList.find((item) => item.url === currentUrl);
              if (bookmark) removeBookmarkMutation.mutate(bookmark.id);
              else addBookmarkMutation.mutate();
            }}
            className={`p-1 transition-colors ${isBookmarked ? 'text-amber-500' : 'text-fg-muted hover:text-fg'}`}
            title={isBookmarked ? 'Lesezeichen entfernen' : 'Als Lesezeichen speichern'}
          >
            <BookmarkPlus className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>
        )}
        <span className="ml-1 flex items-center gap-1 whitespace-nowrap text-[11px] text-fg-muted" title={connectionLabel}>
          {status === 'connected' ? <Wifi className="h-3.5 w-3.5 text-emerald-500" /> : status === 'error' ? <WifiOff className="h-3.5 w-3.5 text-red-500" /> : <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          <span className="hidden xl:inline">{connectionLabel}</span>
        </span>
        <span className="ml-auto flex items-center gap-0.5 border-l border-zinc-200 pl-2 dark:border-zinc-700">
          <button
            onClick={() => applyLayoutMode(layoutMode === 'medium' ? 'normal' : 'medium')}
            className={`flex items-center gap-1 rounded px-1.5 py-1 text-[11px] transition-colors ${
              layoutMode === 'medium'
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                : 'text-fg-muted hover:text-fg hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60'
            }`}
            title="Medium: füllt die gesamte Hauptseite (Sidebar bleibt sichtbar)"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Medium</span>
          </button>
          <button
            onClick={() => applyLayoutMode(layoutMode === 'fullscreen' ? 'normal' : 'fullscreen')}
            className={`flex items-center gap-1 rounded px-1.5 py-1 text-[11px] transition-colors ${
              layoutMode === 'fullscreen'
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                : 'text-fg-muted hover:text-fg hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60'
            }`}
            title="Vollbild: füllt alles und klappt die Sidebar ein"
          >
            <Fullscreen className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Vollbild</span>
          </button>
        </span>
      </div>

      <div className={cn(
        'relative bg-zinc-950',
        layoutMode === 'fullscreen' ? 'h-[calc(100vh-120px)] min-h-[480px]' : layoutMode === 'medium' ? 'h-[calc(100vh-180px)] min-h-[420px]' : 'h-[500px] min-h-[320px]',
      )}>
        {stream ? (
          <RemoteBrowserViewport ref={viewportRef} streamPath={stream.streamPath} token={stream.token} onState={handleRemoteState} onStatus={handleStatus} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-zinc-500">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            <p className="text-sm">Persistenter Browser wird gestartet…</p>
          </div>
        )}
        {stream && !remoteState && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-zinc-950/60">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        )}
        {extraOverlayControls}
        {currentUrl && (
          <button
            onClick={() => {
              const bookmark = bookmarkList.find((item) => item.url === currentUrl);
              if (bookmark) removeBookmarkMutation.mutate(bookmark.id);
              else addBookmarkMutation.mutate();
            }}
            className={`absolute right-2 top-2 flex items-center gap-1 rounded px-2.5 py-1.5 text-xs text-white shadow-lg backdrop-blur-sm transition-colors ${isBookmarked ? 'bg-amber-600/90' : 'bg-zinc-700/80 hover:bg-zinc-600'}`}
            title={isBookmarked ? 'Lesezeichen entfernen' : 'Als Lesezeichen speichern'}
          >
            <Bookmark className={`h-3 w-3 ${isBookmarked ? 'fill-current' : ''}`} />
            <span>{isBookmarked ? 'Gespeichert' : 'Speichern'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
