'use client';

// VideoPreviewTile — hover-preview for video tiles in the media gallery.
// Behavior:
//  - Idle: shows an instant thumbnail (ffmpeg frame via `thumbnail`, if present)
//          or a still frame from the MIDDLE of the video (seek on metadata load)
//  - Hover: plays a 5-second snippet starting at (duration/2 - 2.5s), looping
//  - Leave: pauses and snaps back to the still frame / thumbnail
// The <video> stays mounted (preload="metadata") so the still frame renders
// quickly and the LazyMediaTile queue can detect readiness via readyState.

import { useRef, useState, type MouseEvent } from 'react';
import { Video } from 'lucide-react';

const SNIPPET_SECONDS = 5;

interface VideoPreviewTileProps {
  src: string;
  alt?: string;
  className?: string;
  /** Optional instant thumbnail (e.g. ffmpeg-generated frame) shown before the preview loads. */
  thumbnail?: string | null;
  /** Called exactly once when video metadata is loaded and the still-image seek has started. */
  onMetadataLoaded?: () => void;
  /** Ref callback attached to the <video> element (element, or null on unmount). */
  registerVideo?: (el: HTMLVideoElement | null) => void;
}

export function VideoPreviewTile({
  src,
  alt,
  className,
  thumbnail,
  onMetadataLoaded,
  registerVideo,
}: VideoPreviewTileProps) {
  // React 19 types mark RefObject.current as readonly — cast keeps the imperative
  // playback controls (startPreview/stopPreview) working.
  const videoRef = useRef<HTMLVideoElement | null>(null) as React.MutableRefObject<HTMLVideoElement | null>;
  const loopStartRef = useRef(0);
  const loopEndRef = useRef(0);
  const metadataNotifiedRef = useRef(false);
  const [hovered, setHovered] = useState(false);

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

    // Notify the parent exactly once, after the still-image seek started.
    if (!metadataNotifiedRef.current) {
      metadataNotifiedRef.current = true;
      onMetadataLoaded?.();
    }
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
    setHovered(true);
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
    setHovered(false);
    v.pause();
    // Snap back to the still frame
    v.currentTime = loopStartRef.current;
  }

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${className ?? ''}`}
      onMouseEnter={startPreview}
      onMouseLeave={stopPreview}
    >
      {/* Instant thumbnail (ffmpeg frame) — hidden while the preview plays */}
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
        /* Video indicator while idle (no ffmpeg thumbnail available) */
        !hovered && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-black/50 p-2">
              <Video className="h-5 w-5 text-white" />
            </div>
          </div>
        )
      )}
      <video
        ref={(el) => {
          videoRef.current = el;
          registerVideo?.(el);
        }}
        src={src}
        aria-label={alt}
        className={`absolute inset-0 h-full w-full transition-opacity duration-150 ${
          hovered ? 'opacity-100' : 'opacity-0'
        }`}
        muted
        playsInline
        preload="metadata"
        disablePictureInPicture
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
      />
    </div>
  );
}
