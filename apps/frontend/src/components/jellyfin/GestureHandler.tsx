'use client';
import React, { useRef, useCallback, useState, useEffect, type ReactNode } from 'react';
import { Volume2, Sun, Rewind, FastForward } from 'lucide-react';

interface GestureHandlerProps {
  children: ReactNode;
  enabled: boolean;
  onDoubleTapSeek: (delta: number) => void;
  onSwipeVolume: (delta: number) => void;
  onSwipeBrightness: (delta: number) => void;
  onSwipeSeek: (delta: number) => void;
  onTap: () => void;
}

interface FeedbackState {
  show: boolean;
  type: 'seek' | 'volume' | 'brightness';
  value: string;
  x: number;
  y: number;
}

export function GestureHandler({
  children, enabled, onDoubleTapSeek, onSwipeVolume, onSwipeBrightness, onSwipeSeek, onTap,
}: GestureHandlerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef<number>(0);
  const lastTapXRef = useRef<number>(0);
  const swipeAccRef = useRef<{ type: 'h' | 'v' | null; acc: number }>({ type: null, acc: 0 });
  const [feedback, setFeedback] = useState<FeedbackState>({ show: false, type: 'seek', value: '', x: 0, y: 0 });
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFeedback = useCallback((type: FeedbackState['type'], value: string, x: number, y: number) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedback({ show: true, type, value, x, y });
    feedbackTimerRef.current = setTimeout(() => setFeedback(f => ({ ...f, show: false })), 600);
  }, []);

  useEffect(() => {
    return () => { if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current); };
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    swipeAccRef.current = { type: null, acc: 0 };
  }, [enabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || !touchStartRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Determine gesture type on first significant move
    if (!swipeAccRef.current.type) {
      if (absDx > 15 || absDy > 15) {
        swipeAccRef.current.type = absDx > absDy ? 'h' : 'v';
      }
      return;
    }

    if (swipeAccRef.current.type === 'h') {
      // Horizontal swipe = seek scrubbing
      const scrubDelta = dx * 0.3;
      swipeAccRef.current.acc = scrubDelta;
      const seconds = Math.round(scrubDelta / 5);
      showFeedback('seek', `${seconds > 0 ? '+' : ''}${seconds}s`, touch.clientX - rect.left, rect.height / 2);
    } else if (swipeAccRef.current.type === 'v') {
      // Vertical swipe = brightness (left half) or volume (right half)
      const isLeftHalf = touch.clientX < rect.left + rect.width / 2;
      const delta = -dy / rect.height;
      swipeAccRef.current.acc = delta;
      const pct = Math.round(delta * 100);
      showFeedback(
        isLeftHalf ? 'brightness' : 'volume',
        `${pct > 0 ? '+' : ''}${pct}%`,
        isLeftHalf ? rect.width * 0.3 : rect.width * 0.7,
        touch.clientY - rect.top,
      );
    }
  }, [enabled, showFeedback]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;

    const swipe = swipeAccRef.current;
    if (swipe.type === 'h' && Math.abs(swipe.acc) > 10) {
      onSwipeSeek(Math.round(swipe.acc / 5));
    } else if (swipe.type === 'v' && Math.abs(swipe.acc) > 0.02) {
      const rect = containerRef.current?.getBoundingClientRect();
      const touch = e.changedTouches[0];
      if (rect && touch) {
        const isLeftHalf = touch.clientX < rect.left + rect.width / 2;
        if (isLeftHalf) {
          onSwipeBrightness(swipe.acc);
        } else {
          onSwipeVolume(swipe.acc);
        }
      }
    } else if (!swipe.type || (swipe.type && Math.abs(swipe.acc) < 5)) {
      // Tap detection
      const touch = e.changedTouches[0];
      if (!touch) return;
      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current;
      const dxFromLastTap = Math.abs(touch.clientX - lastTapXRef.current);

      if (timeSinceLastTap < 300 && dxFromLastTap < 50) {
        // Double tap
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const isLeftHalf = touch.clientX < rect.left + rect.width / 2;
          onDoubleTapSeek(isLeftHalf ? -10 : 10);
          showFeedback('seek', isLeftHalf ? '-10s' : '+10s', touch.clientX - rect.left, touch.clientY - rect.top);
        }
        lastTapRef.current = 0;
      } else {
        // Single tap — delayed to allow double-tap detection
        lastTapRef.current = now;
        lastTapXRef.current = touch.clientX;
        setTimeout(() => {
          if (lastTapRef.current === now) {
            onTap();
          }
        }, 300);
      }
    }

    touchStartRef.current = null;
    swipeAccRef.current = { type: null, acc: 0 };
  }, [enabled, onDoubleTapSeek, onSwipeVolume, onSwipeBrightness, onSwipeSeek, onTap, showFeedback]);

  if (!enabled) return <>{children}</>;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
      {feedback.show && (
        <div
          className="absolute z-50 pointer-events-none flex flex-col items-center gap-1"
          style={{ left: feedback.x, top: feedback.y, transform: 'translate(-50%, -50%)' }}
        >
          <div className="rounded-full bg-black/70 px-4 py-3 backdrop-blur-sm">
            {feedback.type === 'seek' && (
              feedback.value.startsWith('-')
                ? <Rewind className="h-8 w-8 text-white" />
                : <FastForward className="h-8 w-8 text-white" />
            )}
            {feedback.type === 'volume' && <Volume2 className="h-8 w-8 text-white" />}
            {feedback.type === 'brightness' && <Sun className="h-8 w-8 text-white" />}
          </div>
          <span className="text-white text-sm font-medium drop-shadow-lg">{feedback.value}</span>
        </div>
      )}
    </div>
  );
}
