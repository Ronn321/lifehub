'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, Pencil } from 'lucide-react';

interface BookmarkData {
  title: string;
  description: string;
  image: string;
  domain: string;
}

interface BookmarkBlockProps {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  onChange: (data: { url: string; title?: string; description?: string; image?: string }) => void;
}

export function BookmarkBlock({ url, title, description, image, onChange }: BookmarkBlockProps) {
  const [preview, setPreview] = useState<BookmarkData | null>(null);
  const [loading, setLoading] = useState(false);
  const [editUrl, setEditUrl] = useState(url);
  const [isEditingUrl, setIsEditingUrl] = useState(!url);

  const fetchPreview = async (targetUrl: string) => {
    if (!targetUrl) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/bookmark-preview?url=${encodeURIComponent(targetUrl)}`);
      const data = await res.json();
      setPreview(data);
      onChange({
        url: targetUrl,
        title: data.title,
        description: data.description,
        image: data.image,
      });
    } catch {
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (url && !preview && !loading) {
      fetchPreview(url);
    }
  }, []);

  const handleUrlSubmit = () => {
    if (editUrl) {
      onChange({ url: editUrl });
      fetchPreview(editUrl);
      setIsEditingUrl(false);
    }
  };

  if (isEditingUrl || (!url && !editUrl)) {
    return (
      <div className="py-1">
        <div className="flex gap-2">
          <input
            type="url"
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
            placeholder="URL eingeben (https://...)"
            className="flex-1 bg-transparent border-none outline-none text-sm"
          />
          <button
            onClick={handleUrlSubmit}
            className="px-3 py-1 text-xs bg-brand-500 text-white rounded hover:bg-brand-600"
          >
            Vorschau
          </button>
          {url && (
            <button
              onClick={() => setIsEditingUrl(false)}
              className="px-3 py-1 text-xs text-fg-muted hover:text-fg rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Abbrechen
            </button>
          )}
        </div>
      </div>
    );
  }

  const domain = (() => { try { return preview?.domain || new URL(url).hostname; } catch { return url; } })();

  return (
    <div className="rounded-lg overflow-hidden hover:shadow-md transition-shadow group">
      {loading ? (
        <div className="py-4 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-fg-muted" />
        </div>
      ) : (
        <>
          {(image || preview?.image) && (
            <div className="h-32 bg-zinc-100 dark:bg-zinc-800 overflow-hidden rounded-t-lg">
              <img
                src={image || preview?.image}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
          <div className="p-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm line-clamp-1">
                  {title || preview?.title || 'Laden...'}
                </h4>
                {(description || preview?.description) && (
                  <p className="text-xs text-fg-muted mt-0.5 line-clamp-2">
                    {description || preview?.description}
                  </p>
                )}
                <p className="text-xs text-fg-muted mt-1 opacity-60">
                  {domain}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setIsEditingUrl(true)}
                  className="text-fg-muted hover:text-brand-500 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  title="URL andern"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-fg-muted hover:text-brand-500 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
