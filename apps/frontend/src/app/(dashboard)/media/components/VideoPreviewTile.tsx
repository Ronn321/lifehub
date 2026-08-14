'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  VideoPreviewTile — thumbnail first, video preview on hover        */
/*                                                                     */
/*  Shows an instant thumbnail (base64 data URI from the DB, or a      */
/*  placeholder) immediately. The actual video stream is only mounted  */
/*  when the user hovers the tile — so loading 600+ gallery items      */
/*  never blocks on video data.                                        */
/* ------------------------------------------------------------------ */

interface VideoPreviewTileProps {
  /** Stream URL of the video (loaded lazily on hover) */
  src: string;
  alt?: string;
  className?: string;
  /** Optional instant thumbnail (e.g. base64 data URI) shown before the preview loads */
  thumbnail?: string | null;
}

export function VideoPreviewTile({
  src,
  alt,
  className,
  thumbnail,
}: VideoPreviewTileProps) {
  const [hovered, setHovered] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={`relative overflow-hidden ${className ?? ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setVideoReady(false);
      }}
    >
      {/* Instant thumbnail — shown immediately, before any video data loads */}
      {thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnail}
          alt={alt ?? ''}
          className="absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-raised">
          <Play className="h-8 w-8 text-fg-muted" />
        </div>
      )}

      {/* Video preview — mounted only on hover; fades in when ready */}
      {hovered && !failed && (
        <video
          src={src}
          muted
          loop
          playsInline
          preload="metadata"
          autoPlay
          onLoadedData={() => setVideoReady(true)}
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-200 ${
            videoReady ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
}
