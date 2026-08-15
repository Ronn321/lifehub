'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  LazyMediaTile — renders content only when BOTH conditions hold:    */
/*    1. the tile is (near) the viewport (IntersectionObserver), and   */
/*    2. the parent has activated it (index < activatedUpTo).          */
/*  Once the content mounts, reports load completion via onTileLoaded. */
/* ------------------------------------------------------------------ */

interface LazyMediaTileProps {
  /** Index of this tile within its parent list */
  index: number;
  /** Parent-driven gate: content mounts only when index < activatedUpTo */
  activatedUpTo: number;
  /** Called once when the tile's media has (or is assumed to have) loaded */
  onTileLoaded: (index: number) => void;
  /** Renders the actual content; only invoked once the tile is visible & activated */
  renderContent: () => ReactNode;
  /** Optional custom placeholder; falls back to a spinner if omitted */
  renderPlaceholder?: () => ReactNode;
  /** Classes applied to the wrapper element */
  className?: string;
}

/**
 * Default placeholder: a centered spinner on the raised background token.
 */
function DefaultPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-bg-raised">
      <Loader2 className="h-5 w-5 animate-spin text-fg-subtle" />
    </div>
  );
}

export function LazyMediaTile({
  index,
  activatedUpTo,
  onTileLoaded,
  renderContent,
  renderPlaceholder,
  className = 'relative h-full w-full',
}: LazyMediaTileProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [contentMounted, setContentMounted] = useState(false);
  const loadedRef = useRef(false);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ready = visible && index < activatedUpTo;

  // Report load completion at most once (guarded by loadedRef).
  const reportLoaded = () => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    onTileLoaded(index);
  };

  // Track visibility with an IntersectionObserver (disposed after first hit).
  useEffect(() => {
    // Fallback: no IntersectionObserver support -> treat tile as always visible.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const node = wrapperRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px 0px' }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Once both conditions are met, mount the content and start the load timer.
  useEffect(() => {
    if (!ready) return;

    setContentMounted(true);
    // Safety net: report loaded after 4s even if no load event fires.
    loadTimerRef.current = setTimeout(reportLoaded, 4000);

    return () => {
      if (loadTimerRef.current) {
        clearTimeout(loadTimerRef.current);
        loadTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Detect load completion from the rendered subtree (img naturalWidth / video readyState).
  const handleLoadCapture = (e: React.SyntheticEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target instanceof HTMLImageElement) {
      if (target.naturalWidth > 0) reportLoaded();
    } else if (target instanceof HTMLVideoElement) {
      // readyState >= 1 means metadata is loaded (fires around loadedmetadata).
      if (target.readyState >= 1) reportLoaded();
    }
  };

  return (
    <div ref={wrapperRef} className={className} onLoadCapture={handleLoadCapture}>
      {contentMounted ? renderContent() : renderPlaceholder ? renderPlaceholder() : <DefaultPlaceholder />}
    </div>
  );
}
