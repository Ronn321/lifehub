'use client';

import { useState } from 'react';
import { Link2, ExternalLink, Pencil } from 'lucide-react';

interface LinkBlockProps {
  url: string;
  title: string;
  description: string;
  onChange: (data: { url: string; title: string; description: string }) => void;
}

export function LinkBlock({ url, title, description, onChange }: LinkBlockProps) {
  const [isEditing, setIsEditing] = useState(!url);
  const [editUrl, setEditUrl] = useState(url);
  const [editTitle, setEditTitle] = useState(title);
  const [editDescription, setEditDescription] = useState(description);

  const handleSave = () => {
    onChange({ url: editUrl, title: editTitle, description: editDescription });
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
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="Titel (optional)"
          className="w-full px-3 py-2 rounded border border-border bg-bg text-sm"
        />
        <textarea
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          placeholder="Beschreibung (optional)"
          className="w-full px-3 py-2 rounded border border-border bg-bg text-sm resize-none"
          rows={2}
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
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-bg-surface transition-colors group">
      <Link2 className="h-5 w-5 text-fg-muted mt-0.5" />
      <div className="flex-1 min-w-0">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-amber-600 hover:underline flex items-center gap-1"
        >
          {title || url}
          <ExternalLink className="h-3 w-3" />
        </a>
        {description && (
          <p className="text-xs text-fg-muted mt-0.5">{description}</p>
        )}
        <p className="text-xs text-fg-subtle mt-1">{url}</p>
      </div>
      <button
        onClick={() => setIsEditing(true)}
        className="opacity-0 group-hover:opacity-100 text-fg-muted hover:text-fg transition-opacity"
      >
        <Pencil className="h-4 w-4" />
      </button>
    </div>
  );
}
