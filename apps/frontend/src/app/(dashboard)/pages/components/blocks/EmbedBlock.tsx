'use client';

import { useState } from 'react';
import { Code, ExternalLink } from 'lucide-react';

interface EmbedBlockProps {
  url: string;
  html: string;
  onChange: (data: { url: string; html: string }) => void;
}

export function EmbedBlock({ url, html, onChange }: EmbedBlockProps) {
  const [isEditing, setIsEditing] = useState(!url);
  const [editUrl, setEditUrl] = useState(url);
  const [editHtml, setEditHtml] = useState(html);

  const handleSave = () => {
    onChange({ url: editUrl, html: editHtml });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <input
          type="url"
          value={editUrl}
          onChange={(e) => setEditUrl(e.target.value)}
          placeholder="URL eingeben..."
          className="w-full px-3 py-2 rounded border border-border bg-bg text-sm"
        />
        <textarea
          value={editHtml}
          onChange={(e) => setEditHtml(e.target.value)}
          placeholder="oder HTML-Code eingeben..."
          className="w-full px-3 py-2 rounded border border-border bg-bg text-sm font-mono min-h-[80px]"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="px-3 py-1.5 rounded bg-amber-600 text-white text-sm"
          >
            Speichern
          </button>
          {url && (
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 rounded text-sm text-fg-muted hover:text-fg"
            >
              Abbrechen
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      {html ? (
        <div
          className="rounded-lg overflow-hidden border border-border"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-amber-600 hover:underline"
        >
          <ExternalLink className="h-4 w-4" />
          {url}
        </a>
      ) : (
        <div className="text-sm text-fg-muted">Kein Inhalt</div>
      )}
      <button
        onClick={() => setIsEditing(true)}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 px-2 py-1 rounded bg-black/50 text-white text-xs transition-opacity"
      >
        Bearbeiten
      </button>
    </div>
  );
}
