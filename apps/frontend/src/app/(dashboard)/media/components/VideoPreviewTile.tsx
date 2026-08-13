'use client';

// VideoPreviewTile — hover-preview for video tiles in the media gallery.
// Behavior:
//  - Idle: shows a still frame from the MIDDLE of the video (seek on metadata load)
//  - Hover: plays a 5-second snippet starting at (duration/2 - 2.5s), looping
//  - Leave: pauses and snaps back to the still frame
// Uses the range-capable stream endpoint, so only metadata + snippet bytes are loaded.

import { useRef, type MouseEvent } from 'react';
import { Video } from 'lucide-react';

const SNIPPET_SECONDS = 5;

interface VideoPreviewTileProps {
  src: string;
  alt?: string;
  className?: string;
}

export function VideoPreviewTile({ src, alt, className }: VideoPreviewTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const loopStartRef = useRef(0);
  const loopEndRef = useRef(0);

  // Seek to the middle on metadata load so the tile shows a still frame (poster-like).
  function handleLoadedMetadata() {
    const v = videoRef.current;
    if (!v) return;
    const dur = v.duration;
    if (!Number.isFinite(dur) || dur <= 0) return;
    if (dur > SNIPPET_SECONDS) {
      loopStartRef.current = Math.max(0, dur / 2 - SNIPPET_SECONDS / 2);
      loopEndRef.current = loopStartRef.current + SNIPPET_SECONDS;
    } else {
      // Short video: loop the whole thing
      loopStartRef.current = 0;
      loopEndRef.current = dur;
    }
    // Seek without playing — browser renders the target frame as a still
    v.currentTime = loopStartRef.current;
  }

  // Enforce the snippet window while playing
  function handleTimeUpdate() {
    const v = videoRef.current;
    if (!v || v.paused) return;
    const end = loopEndRef.current > 0 ? loopEndRef.current : v.duration;
    if (v.currentTime >= end) {
      v.currentTime = loopStartRef.current;
    }
  }

  function startPreview(e: MouseEvent<HTMLDivElement>) {
    // Ignore hover events originating on interactive children (favorite button etc.)
    if ((e.target as HTMLElement).closest('button')) return;
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.playsInline = true;
    v.currentTime = loopStartRef.current;
    v.play().catch(() => {
      /* autoplay may be blocked; tile stays a still frame */
    });
  }

  function stopPreview() {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    // Snap back to the still frame
    v.currentTime = loopStartRef.current;
  }

  return (
    <div className="relative h-full w-full" onMouseEnter={startPreview} onMouseLeave={stopPreview}>
      <video
        ref={videoRef}
        src={src}
        aria-label={alt}
        className={className ?? 'h-full w-full object-cover'}
        muted
        playsInline
        preload="metadata"
        disablePictureInPicture
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
      />
      {/* Video indicator while idle */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="rounded-full bg-black/50 p-2">
          <Video className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}
