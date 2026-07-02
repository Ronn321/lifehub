'use client';

import { File, Download, ExternalLink } from 'lucide-react';

interface FileBlockProps {
  mediaId: string;
  filename: string;
  url: string;
  onChange: (data: { mediaId: string; filename: string; url: string }) => void;
}

export function FileBlock({ mediaId, filename, url, onChange }: FileBlockProps) {
  if (!mediaId && !url) {
    return (
      <button
        className="w-full py-4 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-sm text-fg-muted hover:text-fg hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors flex items-center justify-center gap-2"
      >
        <File className="h-5 w-5" /> Datei auswählen
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-bg-surface transition-colors group">
      <File className="h-8 w-8 text-fg-muted" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{filename || 'Datei'}</p>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-amber-600 hover:underline flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            Link
          </a>
        )}
      </div>
      {mediaId && (
        <a
          href={`http://${window.location.hostname}:3007/api/v1/media/files/${mediaId}/stream`}
          download
          className="opacity-0 group-hover:opacity-100 text-fg-muted hover:text-fg transition-opacity"
        >
          <Download className="h-5 w-5" />
        </a>
      )}
    </div>
  );
}
