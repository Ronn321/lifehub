'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ListMusic,
  X,
} from 'lucide-react';
import { useMusicPlayerStore } from '@/lib/music-player-store';
import { cn } from '@/lib/cn';

/* ------------------------------------------------------------------ */
/*  MiniPlayer — schwebendes, verschiebbares Fenster (280×120px)      */
/*                                                                     */
/*  Erscheint statt MusicPlayerBar wenn isMiniPlayer=true.             */
/*  Enthält: Cover, Track Info, Play/Pause, Prev/Next, Progress Bar,  */
/*  Volume, Close. Frei verschiebbar per Drag & Drop.                 */
/* ------------------------------------------------------------------ */

export function MiniPlayer() {
  /* ── Store ── */
  const currentTrack = useMusicPlayerStore((s) => s.currentTrack);
  const status = useMusicPlayerStore((s) => s.status);
  const position = useMusicPlayerStore((s) => s.position);
  const duration = useMusicPlayerStore((s) => s.duration);
  const volume = useMusicPlayerStore((s) => s.volume);
  const isMuted = useMusicPlayerStore((s) => s.isMuted);

  const togglePlay = useMusicPlayerStore((s) => s.togglePlay);
  const next = useMusicPlayerStore((s) => s.next);
  const previous = useMusicPlayerStore((s) => s.previous);
  const seek = useMusicPlayerStore((s) => s.seek);
  const setVolume = useMusicPlayerStore((s) => s.setVolume);
  const toggleMute = useMusicPlayerStore((s) => s.toggleMute);
  const toggleMiniPlayer = useMusicPlayerStore((s) => s.toggleMiniPlayer);
  const setMiniPlayerPosition = useMusicPlayerStore((s) => s.setMiniPlayerPosition);
  const storedPosition = useMusicPlayerStore((s) => s.miniPlayerPosition);

  const isPlaying = status === 'playing';
  const isLoading = status === 'loading';
  const hasTrack = currentTrack !== null;

  /* ── Position state ── */
  const [pos, setPos] = useState(storedPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
  } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  /* Sync from store on first mount */
  useEffect(() => {
    setPos(storedPosition);
  }, [storedPosition.x, storedPosition.y]);

  /* ── Drag logic (only on drag handle / title bar) ── */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only left button
      if (e.button !== 0) return;
      e.preventDefault();
      setIsDragging(true);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startPosX: pos.x,
        startPosY: pos.y,
      };
    },
    [pos],
  );

  useEffect(() => {
    if (!isDragging || !dragRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const newX = dragRef.current.startPosX + dx;
      const newY = dragRef.current.startPosY + dy;
      setPos({ x: Math.max(0, newX), y: Math.max(0, newY) });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (dragRef.current) {
        // Save final position to store (pos state is up-to-date via setPos)
        setMiniPlayerPosition(pos);
        dragRef.current = null;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, setMiniPlayerPosition, pos]);

  /* ── Progress helpers ── */
  const progress = duration > 0 ? Math.min(position / duration, 1) : 0;

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (duration <= 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const newPos = (x / rect.width) * duration;
      seek(newPos);
    },
    [duration, seek],
  );

  /* ── ── */

  return (
    <div
      ref={panelRef}
      className={cn(
        'fixed z-[9999] overflow-hidden rounded-lg border shadow-lg select-none',
        isDragging ? 'opacity-70 transition-opacity duration-75' : 'opacity-100',
      )}
      style={{
        width: 280,
        height: 120,
        left: pos.x,
        top: pos.y,
        background: 'var(--music-bg-elevated)',
        borderColor: 'rgba(255,255,255,0.1)',
      }}
    >
      <div className="flex flex-col h-full p-2 gap-1">
        {/* ── Row 1: Cover + Info + Close ── */}
        <div
          className="flex items-start gap-2 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          {/* Cover */}
          <div
            className="shrink-0 rounded overflow-hidden bg-[var(--music-bg-card)] flex items-center justify-center"
            style={{ width: 56, height: 56 }}
          >
            {hasTrack && currentTrack?.coverUrl ? (
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <ListMusic className="h-5 w-5 text-[var(--music-text-tertiary)]" />
            )}
          </div>

          {/* Track Info */}
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-sm font-bold text-[var(--music-text-primary)] truncate leading-tight">
              {hasTrack && currentTrack ? currentTrack.title : 'Kein Titel'}
            </p>
            <p className="text-[11px] text-[var(--music-text-secondary)] truncate leading-tight mt-0.5">
              {hasTrack && currentTrack ? currentTrack.artist : '--'}
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={toggleMiniPlayer}
            className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full text-[var(--music-text-tertiary)] hover:text-[var(--music-text-primary)] hover:bg-white/10 transition-colors mt-0.5"
            aria-label="Mini-Player schließen"
            title="Schließen"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* ── Row 2: Progress Bar (2px) ── */}
        <div
          className="w-full h-[6px] flex items-center cursor-pointer group"
          onClick={handleProgressClick}
          role="slider"
          aria-label="Fortschritt"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={position}
        >
          <div className="w-full h-[2px] rounded-full bg-white/20 group-hover:h-[3px] transition-all duration-75">
            <div
              className="h-full rounded-full bg-[var(--music-accent)] transition-[width] duration-75"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        {/* ── Row 3: Controls + Volume ── */}
        <div className="flex items-center gap-1.5 mt-auto">
          {/* Previous */}
          <button
            onClick={previous}
            disabled={!hasTrack || isLoading}
            className="flex items-center justify-center w-6 h-6 rounded-full text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Vorheriger Titel"
            title="Vorheriger"
          >
            <SkipBack className="h-3.5 w-3.5" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            disabled={!hasTrack || isLoading}
            className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--music-accent)] hover:bg-[var(--music-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            aria-label={isPlaying ? 'Pause' : 'Wiedergabe'}
            title={isPlaying ? 'Pause' : 'Wiedergabe'}
          >
            {isLoading ? (
              <svg className="h-3.5 w-3.5 text-black animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                <path
                  d="M12 2a10 10 0 0 1 10 10"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            ) : isPlaying ? (
              <Pause className="h-3.5 w-3.5 text-black fill-black" />
            ) : (
              <Play className="h-3.5 w-3.5 text-black fill-black ml-0.5" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={next}
            disabled={!hasTrack || isLoading}
            className="flex items-center justify-center w-6 h-6 rounded-full text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Nächster Titel"
            title="Nächster"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Volume */}
          <div className="flex items-center gap-1">
            <button
              onClick={toggleMute}
              className="flex items-center justify-center w-5 h-5 rounded-full text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)] transition-colors"
              aria-label={isMuted ? 'Stummschaltung aufheben' : 'Stummschalten'}
              title="Lautstärke"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-3 w-3" />
              ) : (
                <Volume2 className="h-3 w-3" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="mini-volume-slider"
              aria-label="Lautstärke"
              title="Lautstärke"
            />
          </div>
        </div>
      </div>

      {/* ── Volume slider styles ── */}
      <style jsx>{`
        .mini-volume-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 52px;
          height: 3px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.2);
          outline: none;
          cursor: pointer;
          accent-color: var(--music-accent, #1db954);
        }
        .mini-volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #fff;
          border: none;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          opacity: 0;
          transition: opacity 0.15s ease;
        }
        .mini-volume-slider:hover::-webkit-slider-thumb,
        .mini-volume-slider:active::-webkit-slider-thumb {
          opacity: 1;
        }
        .mini-volume-slider::-moz-range-thumb {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #fff;
          border: none;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          opacity: 0;
          transition: opacity 0.15s ease;
        }
        .mini-volume-slider:hover::-moz-range-thumb,
        .mini-volume-slider:active::-moz-range-thumb {
          opacity: 1;
        }
        .mini-volume-slider::-moz-range-track {
          height: 3px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.2);
        }
        .mini-volume-slider::-moz-range-progress {
          height: 3px;
          border-radius: 2px;
          background-color: var(--music-accent, #1db954);
        }
      `}</style>
    </div>
  );
}
