'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Loader2,
  Plus,
  ExternalLink,
  Pin,
  Trash2,
  FolderOpen,
  Search,
  Globe,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  X,
} from 'lucide-react';

interface ResearchWorkspaceBlockProps {
  pageId: string;
  content: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

interface ResearchSession {
  id: string;
  name: string;
  mode: string;
  tags: string[];
  notes: string | null;
  createdAt: string;
}

interface ResearchSource {
  id: string;
  type: string;
  url: string | null;
  title: string | null;
  description: string | null;
  isPinned: boolean;
  createdAt: string;
}

interface ResearchCollection {
  id: string;
  name: string;
  description: string | null;
  sourceIds: string[];
}

interface BrowserTab {
  id: string;
  url: string;
  title: string;
  isActive: boolean;
}

type TabKind = 'sources' | 'collections' | 'notes' | 'browser';

export function ResearchWorkspaceBlock({ pageId, content, onChange }: ResearchWorkspaceBlockProps) {
  const queryClient = useQueryClient();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showNewSession, setShowNewSession] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceTitle, setNewSourceTitle] = useState('');
  const [activeTab, setActiveTab] = useState<TabKind>('sources');

  // Get auth token for proxy
  const getAuthToken = useCallback(() => {
    try {
      const raw = localStorage.getItem('lifehub-auth');
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      return parsed?.state?.accessToken ?? '';
    } catch { return ''; }
  }, []);

  // Build proxy URL
  const getProxyUrl = useCallback((targetUrl: string) => {
    const token = getAuthToken();
    return `/api/v1/pages/proxy?url=${encodeURIComponent(targetUrl)}${token ? `&token=${encodeURIComponent(token)}` : ''}`;
  }, [getAuthToken]);

  // Browser state
  const [urlInput, setUrlInput] = useState('https://lite.duckduckgo.com/lite/');
  const [currentIframeUrl, setCurrentIframeUrl] = useState<string | null>(null);
  const [browserHistory, setBrowserHistory] = useState<string[]>([]);
  const [browserHistoryIndex, setBrowserHistoryIndex] = useState(-1);
  const [activeBrowserTabId, setActiveBrowserTabId] = useState<string | null>(null);

  // Fetch sessions
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['research-sessions', pageId],
    queryFn: () => api.get<ResearchSession[]>(`/pages/${pageId}/research-sessions`),
  });

  // Create session
  const createSessionMutation = useMutation({
    mutationFn: (name: string) => api.post<ResearchSession>(`/pages/${pageId}/research-sessions`, { name }),
    onSuccess: (session: ResearchSession) => {
      queryClient.invalidateQueries({ queryKey: ['research-sessions', pageId] });
      setActiveSessionId(session.id);
      setShowNewSession(false);
      setNewSessionName('');
    },
  });

  // Fetch sources for active session
  const { data: sources } = useQuery({
    queryKey: ['research-sources', activeSessionId],
    queryFn: () => api.get<ResearchSource[]>(`/pages/research-sessions/${activeSessionId}/sources`),
    enabled: !!activeSessionId,
  });

  // Add source
  const addSourceMutation = useMutation({
    mutationFn: () => api.post(`/pages/research-sessions/${activeSessionId}/sources`, {
      type: 'web',
      url: newSourceUrl,
      title: newSourceTitle || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research-sources', activeSessionId] });
      setNewSourceUrl('');
      setNewSourceTitle('');
    },
  });

  // Delete source
  const deleteSourceMutation = useMutation({
    mutationFn: (sourceId: string) => api.delete(`/pages/research-sources/${sourceId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['research-sources', activeSessionId] }),
  });

  // Toggle pin
  const togglePinMutation = useMutation({
    mutationFn: ({ sourceId, isPinned }: { sourceId: string; isPinned: boolean }) =>
      api.put(`/pages/research-sources/${sourceId}/pin`, { isPinned }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['research-sources', activeSessionId] }),
  });

  // Fetch collections
  const { data: collections } = useQuery({
    queryKey: ['research-collections', activeSessionId],
    queryFn: () => api.get<ResearchCollection[]>(`/pages/research-sessions/${activeSessionId}/collections`),
    enabled: !!activeSessionId,
  });

  // Create collection
  const createCollectionMutation = useMutation({
    mutationFn: (name: string) => api.post(`/pages/research-sessions/${activeSessionId}/collections`, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['research-collections', activeSessionId] }),
  });

  // ─── Browser tabs API ────────────────────────────────────────────────────────

  const { data: browserTabs } = useQuery({
    queryKey: ['research-browser-tabs', activeSessionId],
    queryFn: () => api.get<BrowserTab[]>(`/pages/research-sessions/${activeSessionId}/tabs`),
    enabled: !!activeSessionId,
  });

  const createTabMutation = useMutation({
    mutationFn: ({ url, title }: { url: string; title?: string }) =>
      api.post<BrowserTab>(`/pages/research-sessions/${activeSessionId}/tabs`, { url, title }),
    onSuccess: (tab: BrowserTab) => {
      queryClient.invalidateQueries({ queryKey: ['research-browser-tabs', activeSessionId] });
      setActiveBrowserTabId(tab.id);
    },
  });

  const activateTabMutation = useMutation({
    mutationFn: (tabId: string) =>
      api.post(`/pages/research-sessions/${activeSessionId}/tabs/${tabId}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research-browser-tabs', activeSessionId] });
    },
  });

  const closeTabMutation = useMutation({
    mutationFn: (tabId: string) =>
      api.delete(`/pages/research-sessions/${activeSessionId}/tabs/${tabId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research-browser-tabs', activeSessionId] });
      setActiveBrowserTabId(null);
    },
  });

  const pinSourceMutation = useMutation({
    mutationFn: ({ url, title }: { url: string; title?: string }) =>
      api.post(`/pages/research-sessions/${activeSessionId}/sources`, {
        type: 'web',
        url,
        title: title || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research-sources', activeSessionId] });
    },
  });

  // ─── Browser helpers ─────────────────────────────────────────────────────────

  const normalizeUrl = useCallback((input: string) => {
    let normalized = input.trim();
    if (!normalized) return '';
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = 'https://' + normalized;
    }
    return normalized;
  }, []);

  const navigateToUrl = useCallback(
    (url: string) => {
      const normalized = normalizeUrl(url);
      if (!normalized) return;

      setUrlInput(normalized);
      setCurrentIframeUrl(normalized);

      // Manage browser history
      setBrowserHistory((prev) => {
        const newHistory = prev.slice(0, browserHistoryIndex + 1);
        newHistory.push(normalized);
        return newHistory;
      });
      setBrowserHistoryIndex((prev) => prev + 1);
    },
    [normalizeUrl, browserHistoryIndex],
  );

  const handleGo = useCallback(() => {
    const normalized = normalizeUrl(urlInput);
    if (!normalized) return;
    navigateToUrl(normalized);

    // Create a browser tab on the backend
    if (activeSessionId) {
      createTabMutation.mutate({ url: normalized, title: normalized });
    }
  }, [urlInput, normalizeUrl, navigateToUrl, activeSessionId, createTabMutation]);

  const handleBack = useCallback(() => {
    if (browserHistoryIndex <= 0) return;
    const newIndex = browserHistoryIndex - 1;
    const url = browserHistory[newIndex];
    if (!url) return;
    setBrowserHistoryIndex(newIndex);
    setUrlInput(url);
    setCurrentIframeUrl(url);
  }, [browserHistoryIndex, browserHistory]);

  const handleForward = useCallback(() => {
    if (browserHistoryIndex >= browserHistory.length - 1) return;
    const newIndex = browserHistoryIndex + 1;
    const url = browserHistory[newIndex];
    if (!url) return;
    setBrowserHistoryIndex(newIndex);
    setUrlInput(url);
    setCurrentIframeUrl(url);
  }, [browserHistoryIndex, browserHistory]);

  const handleRefresh = useCallback(() => {
    if (currentIframeUrl) {
      // Force iframe re-render by briefly clearing
      setCurrentIframeUrl(null);
      setTimeout(() => setCurrentIframeUrl(currentIframeUrl), 50);
    }
  }, [currentIframeUrl]);

  const handleTabClick = useCallback(
    (tab: BrowserTab) => {
      setActiveBrowserTabId(tab.id);
      setUrlInput(tab.url);
      setCurrentIframeUrl(tab.url);
      activateTabMutation.mutate(tab.id);
    },
    [activateTabMutation],
  );

  const handleCloseTab = useCallback(
    (tabId: string) => {
      if (tabId === activeBrowserTabId) {
        const tabs = browserTabs ?? [];
        const idx = tabs.findIndex((t) => t.id === tabId);
        const next = idx > 0 ? tabs[idx - 1] : tabs.length > 1 ? tabs[1] : null;
        if (next) {
          setActiveBrowserTabId(next.id);
          setUrlInput(next.url);
          setCurrentIframeUrl(next.url);
        } else {
          setActiveBrowserTabId(null);
          setUrlInput('');
          setCurrentIframeUrl(null);
        }
      }
      closeTabMutation.mutate(tabId);
    },
    [activeBrowserTabId, browserTabs, closeTabMutation],
  );

  const handlePinAsSource = useCallback(() => {
    if (!currentIframeUrl) return;
    pinSourceMutation.mutate({ url: currentIframeUrl, title: urlInput });
  }, [currentIframeUrl, urlInput, pinSourceMutation]);

  // ─── Render helpers ──────────────────────────────────────────────────────────

  const renderBrowser = () => {
    const tabs = browserTabs ?? [];
    const activeTabData = tabs.find((t) => t.id === activeBrowserTabId);

    return (
      <div className="flex flex-col h-full">
        {/* Browser Tab Bar */}
        <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 overflow-x-auto">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              className={`group flex items-center gap-1 px-2.5 py-1.5 text-xs cursor-pointer border-r border-zinc-200 dark:border-zinc-700 min-w-0 max-w-[160px] transition-colors ${
                tab.id === activeBrowserTabId
                  ? 'bg-white dark:bg-zinc-900 text-fg'
                  : 'bg-zinc-50 dark:bg-zinc-800/50 text-fg-muted hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
            >
              <Globe className="h-3 w-3 shrink-0" />
              <span className="truncate">{tab.title || tab.url}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseTab(tab.id);
                }}
                className="ml-auto shrink-0 opacity-0 group-hover:opacity-100 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded p-0.5 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              setUrlInput('');
              setCurrentIframeUrl(null);
            }}
            className="p-1.5 text-fg-muted hover:text-fg hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded shrink-0 ml-1"
            title="Neuer Tab"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* URL Bar */}
        <div className="flex items-center gap-1 px-2 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
          <button
            onClick={handleBack}
            disabled={browserHistoryIndex <= 0}
            className="p-1 text-fg-muted hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed"
            title="Zurück"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleForward}
            disabled={browserHistoryIndex >= browserHistory.length - 1}
            className="p-1 text-fg-muted hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed"
            title="Vorwärts"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={handleRefresh}
            disabled={!currentIframeUrl}
            className="p-1 text-fg-muted hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed"
            title="Aktualisieren"
          >
            <RotateCw className="h-4 w-4" />
          </button>
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleGo();
            }}
            placeholder='URL oder Suche (z.B. DuckDuckGo Lite)...'
            className="flex-1 px-2.5 py-1 text-sm rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
          />
          <button
            onClick={handleGo}
            disabled={!urlInput.trim() || createTabMutation.isPending}
            className="px-3 py-1 text-sm rounded bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 transition-colors"
          >
            Go
          </button>
        </div>

        {/* Iframe Area */}
        <div className="relative flex-1 bg-zinc-900 min-h-[300px]">
          {currentIframeUrl ? (
            <>
              <iframe
                key={currentIframeUrl}
                src={currentIframeUrl}
                className="w-full h-full border-none"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                title="Browser"
              />
              {/* Pin as Source overlay button */}
              <button
                onClick={handlePinAsSource}
                disabled={pinSourceMutation.isPending}
                className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1.5 text-xs rounded bg-amber-600/90 hover:bg-amber-700 text-white shadow-lg backdrop-blur-sm transition-colors disabled:opacity-50"
                title="Als Quelle pinnen"
              >
                <Pin className="h-3 w-3" />
                <span>Als Quelle pinnen</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-fg-muted gap-2">
              <Globe className="h-10 w-10 opacity-30" />
              <p className="text-sm">Geben Sie eine URL ein und klicken Sie auf Go</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-fg-muted" /></div>;
  }

  // No sessions - show create button
  if (!sessions || sessions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-6 text-center">
        <Search className="h-8 w-8 mx-auto mb-2 text-fg-muted opacity-50" />
        <p className="text-sm text-fg-muted mb-3">Noch keine Recherche-Session</p>
        {showNewSession ? (
          <div className="flex gap-2 max-w-xs mx-auto">
            <input
              type="text"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              placeholder="Session-Name..."
              className="flex-1 px-3 py-1.5 rounded border border-border bg-bg text-sm"
              autoFocus
            />
            <button
              onClick={() => createSessionMutation.mutate(newSessionName)}
              disabled={!newSessionName || createSessionMutation.isPending}
              className="px-3 py-1.5 rounded bg-amber-600 text-white text-sm disabled:opacity-50"
            >
              Erstellen
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowNewSession(true)}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm"
          >
            <Plus className="h-4 w-4 inline mr-1" /> Recherche starten
          </button>
        )}
      </div>
    );
  }

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  if (!activeSession) return null;

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* Session Selector */}
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <select
          value={activeSession.id}
          onChange={(e) => setActiveSessionId(e.target.value)}
          className="flex-1 bg-transparent text-sm font-medium border-none outline-none"
        >
          {sessions.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button
          onClick={() => setShowNewSession(true)}
          className="text-fg-muted hover:text-fg"
          title="Neue Session"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* New Session Form */}
      {showNewSession && (
        <div className="flex gap-2 px-3 py-2 border-b border-zinc-200 dark:border-zinc-800">
          <input
            type="text"
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            placeholder="Session-Name..."
            className="flex-1 px-2 py-1 rounded border border-border bg-bg text-sm"
            autoFocus
          />
          <button
            onClick={() => createSessionMutation.mutate(newSessionName)}
            disabled={!newSessionName}
            className="px-2 py-1 rounded bg-amber-600 text-white text-xs disabled:opacity-50"
          >
            OK
          </button>
          <button onClick={() => setShowNewSession(false)} className="text-xs text-fg-muted">Abbrechen</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        {(['sources', 'collections', 'notes', 'browser'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab
                ? 'text-amber-600 border-b-2 border-amber-600'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            {tab === 'sources' ? 'Quellen' : tab === 'collections' ? 'Sammlungen' : tab === 'notes' ? 'Notizen' : 'Browser'}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'browser' ? (
        <div className="min-h-[400px]">{renderBrowser()}</div>
      ) : (
        <div className="p-3">
          {activeTab === 'sources' && (
            <div className="space-y-2">
              {/* Add Source */}
              <div className="flex gap-2">
                <input
                  type="url"
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  placeholder='URL oder Suche (z.B. DuckDuckGo Lite)...'
                  className="flex-1 px-2 py-1.5 rounded border border-border bg-bg text-sm"
                />
                <input
                  type="text"
                  value={newSourceTitle}
                  onChange={(e) => setNewSourceTitle(e.target.value)}
                  placeholder="Titel (optional)"
                  className="w-32 px-2 py-1.5 rounded border border-border bg-bg text-sm"
                />
                <button
                  onClick={() => addSourceMutation.mutate()}
                  disabled={!newSourceUrl || addSourceMutation.isPending}
                  className="px-2 py-1.5 rounded bg-amber-600 text-white text-sm disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Sources List */}
              {sources && sources.length > 0 ? (
                <div className="space-y-1">
                  {sources.map(source => (
                    <div key={source.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-bg-surface group">
                      <button
                        onClick={() => togglePinMutation.mutate({ sourceId: source.id, isPinned: !source.isPinned })}
                        className={source.isPinned ? 'text-amber-500' : 'text-fg-muted hover:text-amber-500'}
                      >
                        <Pin className="h-3.5 w-3.5" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <a
                          href={source.url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-amber-600 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="truncate">{source.title || source.url}</span>
                        </a>
                        {source.description && (
                          <p className="text-xs text-fg-muted truncate">{source.description}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-fg-subtle px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                        {source.type}
                      </span>
                      <button
                        onClick={() => deleteSourceMutation.mutate(source.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-fg-muted text-center py-4">Noch keine Quellen</p>
              )}
            </div>
          )}

          {activeTab === 'collections' && (
            <div className="space-y-2">
              <button
                onClick={() => {
                  const name = prompt('Sammlungsname:');
                  if (name) createCollectionMutation.mutate(name);
                }}
                className="w-full py-2 rounded border border-dashed border-zinc-300 dark:border-zinc-700 text-sm text-fg-muted hover:text-fg hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
              >
                <FolderOpen className="h-4 w-4 inline mr-1" /> Sammlung erstellen
              </button>
              {collections && collections.length > 0 && (
                <div className="space-y-1">
                  {collections.map(coll => (
                    <div key={coll.id} className="flex items-center gap-2 py-2 px-2 rounded hover:bg-bg-surface">
                      <FolderOpen className="h-4 w-4 text-fg-muted" />
                      <div>
                        <p className="text-sm font-medium">{coll.name}</p>
                        {coll.description && <p className="text-xs text-fg-muted">{coll.description}</p>}
                        <p className="text-[10px] text-fg-subtle">{coll.sourceIds.length} Quellen</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <textarea
              value={activeSession.notes || ''}
              onChange={(e) => {
                // Update notes via API
                api.put(`/pages/research-sessions/${activeSession.id}`, { notes: e.target.value });
              }}
              placeholder="Notizen zur Recherche..."
              className="w-full min-h-[120px] bg-transparent border-none outline-none resize-none text-sm"
            />
          )}
        </div>
      )}

      {/* Tags */}
      {activeSession.tags && activeSession.tags.length > 0 && (
        <div className="px-3 py-2 border-t border-zinc-200 dark:border-zinc-800 flex gap-1 flex-wrap">
          {activeSession.tags.map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
