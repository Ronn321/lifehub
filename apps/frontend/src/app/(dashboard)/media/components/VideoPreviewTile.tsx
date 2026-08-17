'use client';

// VideoPreviewTile — hover-preview for video tiles in the media gallery.
// Behavior:
//  - Idle: shows an instant thumbnail (ffmpeg frame via `thumbnail`, if present)
//          or a subtle Play badge overlay when no thumbnail is available.
//  - Hover: mounts the <video> and plays a 5-second snippet starting at
//          (duration/2 - 2.5s), looping until the pointer leaves.
//  - Leave/unmount: React unmounts the <video>, so no explicit pause is needed.
// The <video> is mounted ONLY while hovered — this keeps 200+ tiles from
// holding a video element each and avoids wasted memory/network resources.

import { useRef, useState } from 'react';
import { Play } from 'lucide-react';

interface VideoPreviewTileProps {
  src: string;
  alt?: string;
  className?: string;
  /** Optional instant thumbnail (e.g. ffmpeg-generated frame) shown before the preview loads. */
  thumbnail?: string | null;
}

export function VideoPreviewTile({ src, alt, className, thumbnail }: VideoPreviewTileProps) {
  const [hovered, setHovered] = useState(false);
  // Loop window computed from the loaded metadata. Handlers use e.currentTarget,
  // so no element ref is required.
  const loopStartRef = useRef(0);
  const loopEndRef = useRef(0);

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${className ?? ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnail}
          alt={alt ?? ''}
          draggable={false}
          className={`absolute inset-0 h-full w-full transition-opacity duration-150 ${
            hovered ? 'opacity-0' : 'opacity-100'
          }`}
        />
      ) : (
        /* Play badge while idle when no ffmpeg thumbnail is available */
        !hovered && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-black/50 p-2">
              <Play className="h-5 w-5 text-white" />
            </div>
          </div>
        )
      )}
      {hovered && (
        <video
          src={src}
          aria-label={alt}
          className={`absolute inset-0 h-full w-full ${className ?? 'object-cover'}`}
          muted
          playsInline
          autoPlay
          preload="metadata"
          disablePictureInPicture
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            const dur = v.duration;
            if (Number.isFinite(dur) && dur > 0) {
              loopStartRef.current = dur > 5 ? Math.max(0, dur / 2 - 2.5) : 0;
              loopEndRef.current = dur > 5 ? loopStartRef.current + 5 : dur;
              v.currentTime = loopStartRef.current;
            }
          }}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (v.paused) return;
            if (v.currentTime >= loopEndRef.current) v.currentTime = loopStartRef.current;
          }}
          onError={() => {}}
        />
      )}
    </div>
  );
}