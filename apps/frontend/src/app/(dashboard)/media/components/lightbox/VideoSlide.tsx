'use client';

import { useState, type ReactNode } from 'react';
import { MediaPlayer as VidMediaPlayer, MediaOutlet } from '@vidstack/react';
import 'vidstack/styles/base.css';
import 'vidstack/styles/community-skin/video.css';
import { Loader2, AlertCircle } from 'lucide-react';

function PlayerErrorBoundary({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return fallback ?? (
      <div className="flex flex-col items-center gap-2 text-white/60">
        <AlertCircle className="h-10 w-10" />
        <p className="text-sm">Fehler bei der Wiedergabe</p>
      </div>
    );
  }

  return (
    <div onError={() => setHasError(true)}>
      {children}
    </div>
  );
}

export function VideoSlide({ src, mimeType }: { src: string; mimeType: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const isAudio = mimeType.startsWith('audio/');
  const mediaType = isAudio ? 'audio' : 'video';

  if (!src) {
    return (
      <div className="flex flex-col items-center gap-2 text-white/60">
        <AlertCircle className="h-10 w-10" />
        <p className="text-sm">Keine Stream-URL verfügbar</p>
      </div>
    );
  }

  return (
    <PlayerErrorBoundary
      fallback={
        <div className="flex flex-col items-center gap-2 text-white/60">
          <AlertCircle className="h-10 w-10" />
          <p className="text-sm">Fehler bei der Wiedergabe</p>
        </div>
      }
    >
      {loading && !error && (
        <div className="flex items-center justify-center text-white/60">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      <VidMediaPlayer
        src={{ src, type: mimeType }}
        controls
        autoPlay
        className={isAudio ? 'w-96 max-w-full' : 'max-h-[85vh] max-w-[85vw] rounded-lg'}
        loading="eager"
        stream-type={isAudio ? undefined : 'unknown'}
        onLoadedData={() => setLoading(false)}
        onError={() => { setError(true); setLoading(false); }}
        style={{ display: loading && !error ? 'none' : 'block' }}
      >
        <MediaOutlet />
      </VidMediaPlayer>
    </PlayerErrorBoundary>
  );
}
