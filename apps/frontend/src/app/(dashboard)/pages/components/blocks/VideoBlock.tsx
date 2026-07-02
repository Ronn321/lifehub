'use client';

import { useState } from 'react';
import { Image, Play } from 'lucide-react';

interface VideoBlockProps {
  mediaId: string;
  url: string;
  onChange: (data: { mediaId: string; url: string }) => void;
}

export function VideoBlock({ mediaId, url, onChange }: VideoBlockProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [editUrl, setEditUrl] = useState(url);

  const handleUrlSubmit = () => {
    onChange({ mediaId, url: editUrl });
  };

  if (!mediaId && !url) {
    return (
      <div>
        <button
          onClick={() => setShowPicker(true)}
          className="w-full py-8 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-sm text-fg-muted hover:text-fg hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors flex items-center justify-center gap-2"
        >
          <Play className="h-5 w-5" /> Video auswählen
        </button>
        {showPicker && (
          <div className="mt-2 flex gap-2">
            <input
              type="url"
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              placeholder="Video-URL eingeben..."
              className="flex-1 px-3 py-1.5 rounded border border-border bg-bg text-sm"
            />
            <button
              onClick={handleUrlSubmit}
              className="px-3 py-1.5 rounded bg-amber-600 text-white text-sm"
            >
              OK
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden border border-border">
      {mediaId ? (
        <video
          src={`http://${window.location.hostname}:3007/api/v1/media/files/${mediaId}/stream`}
          controls
          className="w-full"
        />
      ) : url ? (
        <iframe
          src={url}
          className="w-full aspect-video"
          allowFullScreen
        />
      ) : null}
    </div>
  );
}
