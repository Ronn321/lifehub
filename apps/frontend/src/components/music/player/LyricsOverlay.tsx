'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { X, Mic2 } from 'lucide-react';
import { useMusicPlayerStore } from '@/lib/music-player-store';
import { useJellyfinServer, useLyrics } from '@/lib/music-api';

/* ------------------------------------------------------------------ */
/*  LRC Parser                                                         */
/* ------------------------------------------------------------------ */

interface ParsedLyricLine {
  time: number; // seconds
  text: string;
}

function parseLRC(lrc: string): ParsedLyricLine[] {
  const lines = lrc.split('\n');
  const result: ParsedLyricLine[] = [];
  const regex = /\[(\d{1,3}):(\d{2})[.:](\d{2,3})\](.*)/;

  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      const minutes = parseInt(match[1]!, 10);
      const seconds = parseInt(match[2]!, 10);
      const cs = parseInt(match[3]!, 10);
      const text = (match[4] ?? '').trim();
      // Handle both centiseconds (2-digit) and milliseconds (3-digit)
      const time = minutes * 60 + seconds + (match[3]!.length === 3 ? cs / 1000 : cs / 100);
      if (text) {
        result.push({ time, text });
      }
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

/* ------------------------------------------------------------------ */
/*  LyricsOverlay                                                      */
/* ------------------------------------------------------------------ */

interface LyricsOverlayProps {
  /** Ob das Overlay sichtbar ist (nur für variant='overlay') */
  isVisible?: boolean;
  /** Schließt das Overlay */
  onClose?: () => void;
  /** 'overlay' (default) für Fullscreen-Overlay, 'inline' für eingebettete Anzeige */
  variant?: 'overlay' | 'inline';
}

export function LyricsOverlay({ isVisible = true, onClose, variant = 'overlay' }: LyricsOverlayProps) {
  const currentTrack = useMusicPlayerStore((s) => s.currentTrack);
  const position = useMusicPlayerStore((s) => s.position);
  const server = useJellyfinServer();
  const serverId = server?.id;

  const { data, isLoading } = useLyrics(serverId, currentTrack?.id);

  /* ── Parse synced lyrics ── */
  const syncedLines = useMemo<ParsedLyricLine[]>(() => {
    if (!data?.synced || !data.lyrics) return [];
    return parseLRC(data.lyrics);
  }, [data]);

  const plainText = (!data?.synced && data?.lyrics) ? data.lyrics : null;

  /* ── Active line for synced lyrics ── */
  const activeLineIndex = useMemo(() => {
    if (syncedLines.length === 0) return -1;
    let idx = -1;
    for (let i = 0; i < syncedLines.length; i++) {
      if (syncedLines[i]!.time <= position) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [syncedLines, position]);

  const lyricsContainerRef = useRef<HTMLDivElement>(null!);
  const activeLineRef = useRef<HTMLDivElement>(null!);

  /* ── Auto-scroll for synced lyrics ── */
  useEffect(() => {
    const el = activeLineRef.current;
    const container = lyricsContainerRef.current;
    if (!el || !container) return;

    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    if (elRect.top < containerRect.top + 60 || elRect.bottom > containerRect.bottom - 20) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeLineIndex]);

  /* ── Scroll plain text to top on track change ── */
  useEffect(() => {
    if (lyricsContainerRef.current) {
      lyricsContainerRef.current.scrollTop = 0;
    }
  }, [currentTrack?.id]);

  /* ── Escape key (overlay mode only) ── */
  useEffect(() => {
    if (variant !== 'overlay' || !isVisible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, onClose, variant]);

  if (variant === 'overlay' && !isVisible) return null;

  const content = (
    <LyricsContent
      isLoading={isLoading}
      syncedLines={syncedLines}
      plainText={plainText}
      activeLineIndex={activeLineIndex}
      activeLineRef={activeLineRef}
      containerRef={lyricsContainerRef}
      trackTitle={currentTrack?.title}
    />
  );

  /* ── Overlay mode with backdrop ── */
  if (variant === 'overlay') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
        onClick={onClose}
      >
        <div
          className="relative flex flex-col w-full max-w-2xl h-[80vh] px-8 py-16"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 flex items-center justify-center w-10 h-10 rounded-full text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)] hover:bg-white/10 transition-colors"
            aria-label="Schließen"
            title="Schließen"
          >
            <X className="h-5 w-5" />
          </button>

          {content}
        </div>
      </div>
    );
  }

  /* ── Inline mode (no backdrop, used in sidebar tab) ── */
  return content;
}

/* ------------------------------------------------------------------ */
/*  LyricsContent — shared display logic                               */
/* ------------------------------------------------------------------ */

interface LyricsContentProps {
  isLoading: boolean;
  syncedLines: ParsedLyricLine[];
  plainText: string | null;
  activeLineIndex: number;
  activeLineRef: React.RefObject<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  trackTitle?: string;
}

function LyricsContent({
  isLoading,
  syncedLines,
  plainText,
  activeLineIndex,
  activeLineRef,
  containerRef,
  trackTitle,
}: LyricsContentProps) {
  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[var(--music-text-tertiary)] border-t-[var(--music-accent)]" />
        <p className="text-sm text-[var(--music-text-secondary)]">Lyrics werden geladen…</p>
      </div>
    );
  }

  /* ── No lyrics available ── */
  if (syncedLines.length === 0 && !plainText) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center">
        <Mic2 className="mb-4 h-12 w-12 text-[var(--music-text-tertiary)]" />
        <p className="text-lg font-bold text-[var(--music-text-primary)]">Keine Lyrics verfügbar</p>
        {trackTitle && (
          <p className="mt-1 text-sm text-[var(--music-text-secondary)]">
            Lyrics für &bdquo;{trackTitle}&ldquo; sind nicht verfügbar.
          </p>
        )}
      </div>
    );
  }

  /* ── Synced lyrics ── */
  if (syncedLines.length > 0) {
    return (
      <>
        {/* Badge */}
        <div className="mb-4 shrink-0">
          <span
            className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: 'var(--music-accent)',
              color: 'var(--music-bg-base)',
              opacity: 0.8,
            }}
          >
            Synchronisiert
          </span>
        </div>

        {/* Lines */}
        <div ref={containerRef} className="flex-1 overflow-y-auto music-scroll">
          <div className="space-y-4">
            {syncedLines.map((line, i) => (
              <div
                key={i}
                ref={i === activeLineIndex ? activeLineRef : undefined}
                className="transition-all duration-300"
                style={{
                  color:
                    i === activeLineIndex
                      ? 'var(--music-accent)'
                      : i < activeLineIndex
                        ? 'var(--music-text-tertiary)'
                        : 'var(--music-text-secondary)',
                  fontSize: i === activeLineIndex ? '1rem' : '0.875rem',
                  fontWeight: i === activeLineIndex ? 700 : 400,
                  opacity: i < activeLineIndex ? 0.4 : 1,
                  transform: i === activeLineIndex ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                {line.text || '\u00A0'}
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  /* ── Plain text lyrics ── */
  return (
    <>
      {/* Badge */}
      <div className="mb-4 shrink-0">
        <span
          className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          style={{
            background: 'var(--music-accent)',
            color: 'var(--music-bg-base)',
            opacity: 0.8,
          }}
        >
          Nicht synchronisiert
        </span>
      </div>

      {/* Text */}
      <div ref={containerRef} className="flex-1 overflow-y-auto music-scroll">
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--music-text-secondary)]">
          {plainText}
        </div>
      </div>
    </>
  );
}
