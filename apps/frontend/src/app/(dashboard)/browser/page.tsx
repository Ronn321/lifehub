'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Globe, ChevronLeft, ChevronRight, RotateCw, ExternalLink, Loader2 } from 'lucide-react';

const PROXY_BASE = typeof window !== 'undefined'
  ? `http://${window.location.hostname}:3007/api/v1/browser/proxy`
  : '/api/v1/browser/proxy';

export default function BrowserPage() {
  const [urlInput, setUrlInput] = useState('http://100.124.4.24:3121');
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const normalizeUrl = useCallback((input: string) => {
    let n = input.trim();
    if (!n) return '';
    if (!/^https?:\/\//i.test(n)) n = 'https://' + n;
    return n;
  }, []);

  const getProxyUrl = useCallback((target: string) => {
    return `${PROXY_BASE}?url=${encodeURIComponent(target)}`;
  }, []);

  const navigate = useCallback((url: string) => {
    const normalized = normalizeUrl(url);
    if (!normalized) return;
    setUrlInput(normalized);
    setIsLoading(true);
    setError(null);
    setCurrentUrl(normalized);
    setHistory(prev => {
      const h = prev.slice(0, historyIndex + 1);
      h.push(normalized);
      return h;
    });
    setHistoryIndex(prev => prev + 1);
  }, [normalizeUrl, historyIndex]);

  const handleGo = useCallback(() => {
    navigate(urlInput);
  }, [urlInput, navigate]);

  // Auto-navigate to SearXNG on page load
  useEffect(() => {
    // Navigate only if the URL is SearXNG (direct-iframe-safe)
    const isDirectUrl = urlInput.includes(':3121');
    if (isDirectUrl) {
      navigate(urlInput);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  }, [historyIndex, history]);

  const handleForward = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const idx = historyIndex + 1;
    const url = history[idx];
    if (!url) return;
    setHistoryIndex(idx);
    setUrlInput(url);
    setCurrentUrl(url);
  }, [historyIndex, history]);

  const handleRefresh = useCallback(() => {
    if (currentUrl) {
      setCurrentUrl(null);
      setTimeout(() => setCurrentUrl(currentUrl), 50);
    }
  }, [currentUrl]);

  // Listen for iframe load complete
  useEffect(() => {
    if (!currentUrl) return;
    const timer = setTimeout(() => setIsLoading(false), 3000);
    return () => clearTimeout(timer);
  }, [currentUrl]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <Globe className="h-5 w-5 text-amber-500" />
        <h1 className="text-lg font-semibold">Browser</h1>
        <span className="text-xs text-zinc-400">(Eigenständig — Proxy testen)</span>
      </div>

      {/* URL Bar */}
      <div className="flex items-center gap-1.5 px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
        <button
          onClick={handleBack}
          disabled={historyIndex <= 0}
          className="p-1.5 rounded text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Zurück"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={handleForward}
          disabled={historyIndex >= history.length - 1}
          className="p-1.5 rounded text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Vorwärts"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={handleRefresh}
          disabled={!currentUrl}
          className="p-1.5 rounded text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Aktualisieren"
        >
          <RotateCw className="h-4 w-4" />
        </button>
        <input
          type="text"
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="URL eingeben..."
          className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-colors"
        />
        <button
          onClick={handleGo}
          disabled={!urlInput.trim()}
          className="px-4 py-1.5 text-sm font-medium rounded-lg bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 transition-colors"
        >
          Go
        </button>
        {currentUrl && (
          <a
            href={currentUrl.includes(':3121') ? currentUrl : getProxyUrl(currentUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            title="In neuem Tab öffnen"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-950 border-b border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Iframe Area */}
      <div className="flex-1 relative bg-zinc-900">
        {currentUrl ? (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 z-10">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              </div>
            )}
            <iframe
              ref={iframeRef}
              key={currentUrl}
              src={currentUrl && currentUrl.includes(':3121') ? currentUrl : (currentUrl ? getProxyUrl(currentUrl) : '')}
              className="w-full h-full border-none"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
              title="Browser"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setError('Seite konnte nicht geladen werden');
                setIsLoading(false);
              }}
            />
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
