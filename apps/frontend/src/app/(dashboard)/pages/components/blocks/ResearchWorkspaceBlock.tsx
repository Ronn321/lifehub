'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Loader2, Plus, ExternalLink, Pin, Trash2, FolderOpen, Search,
} from 'lucide-react';
import { BrowserBlock } from './BrowserBlock';

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

type TabKind = 'sources' | 'collections' | 'notes' | 'browser';

export function ResearchWorkspaceBlock({ pageId, content, onChange }: ResearchWorkspaceBlockProps) {
  const queryClient = useQueryClient();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showNewSession, setShowNewSession] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceTitle, setNewSourceTitle] = useState('');
  const [activeTab, setActiveTab] = useState<TabKind>('sources');

  // ─── Research Session browser block ID (virtual, for BrowserBlock) ────────
  // BrowserBlock needs a stable blockId for session management. We use the
  // research session id prefixed with 'research-' as a virtual block ID.
  const browserBlockId = activeSessionId ? `research-${activeSessionId}` : 'research-pending';

  // ─── Pin-as-source: runs when user clicks "pin" in BrowserBlock ───────────
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

  const [pinUrl, setPinUrl] = useState<string | null>(null);

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
        <div className="min-h-[400px]">
          <BrowserBlock
            blockId={browserBlockId}
            pageId={pageId}
            content={{ startUrl: 'http://100.124.4.24:3121', title: '', sessionId: null }}
            onChange={() => {}}
            onUrlChange={(url) => setPinUrl(url)}
            extraOverlayControls={
              pinUrl ? (
                <button
                  onClick={() => {
                    pinSourceMutation.mutate({ url: pinUrl, title: pinUrl });
                    setPinUrl(null);
                  }}
                  disabled={pinSourceMutation.isPending}
                  className="absolute top-12 right-2 flex items-center gap-1 px-2.5 py-1.5 text-xs rounded bg-amber-600/90 hover:bg-amber-700 text-white shadow-lg backdrop-blur-sm transition-colors disabled:opacity-50"
                  title="Als Quelle pinnen"
                >
                  <Pin className="h-3 w-3" />
                  <span>Als Quelle pinnen</span>
                </button>
              ) : null
            }
          />
        </div>
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
