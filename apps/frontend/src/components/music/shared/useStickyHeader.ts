'use client';

import { useState, useEffect, type RefObject } from 'react';

/* ------------------------------------------------------------------ */
/*  useStickyHeader — detect scroll past threshold on a container      */
/* ------------------------------------------------------------------ */

export function useStickyHeader(
  scrollRef: RefObject<HTMLElement | null>,
  threshold = 200,
): { isScrolled: boolean } {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      setIsScrolled(el.scrollTop > threshold);
    };

    // Check initial state
    onScroll();

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollRef, threshold]);

  return { isScrolled };
}
