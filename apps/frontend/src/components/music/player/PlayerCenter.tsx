'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { RepeatMode } from '@/lib/music-player-store';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PROGRESS_BAR_HEIGHT = 4;
const PROGRESS_BAR_HOVER_HEIGHT = 6;

/* ------------------------------------------------------------------ */
/*  formatTime — convert seconds to 'm:ss'                            */
/* ------------------------------------------------------------------ */

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ */
/*  RepeatButton — handles 3-state repeat with optional '1' badge      */
/* ------------------------------------------------------------------ */

function RepeatButton({ mode, onClick, disabled }: { mode: RepeatMode; onClick: () => void; disabled?: boolean }) {
  const isActive = mode !== 'off';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative flex items-center justify-center w-8 h-8 rounded-full transition-colors',
        isActive ? 'text-[var(--music-accent)]' : 'text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)]',
        disabled && 'opacity-40 cursor-not-allowed hover:text-[var(--music-text-secondary)]',
      )}
      aria-label={
        mode === 'off'
          ? 'Wiederholung aus'
          : mode === 'all'
            ? 'Alle wiederholen'
            : 'Einzeln wiederholen'
      }
      title={
        mode === 'off'
          ? 'Keine Wiederholung'
          : mode === 'all'
            ? 'Alle wiederholen'
            : 'Einzeln wiederholen'
      }
    >
      <Repeat className="h-4 w-4" />
      {mode === 'one' && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[var(--music-accent)] text-[8px] font-bold text-black leading-none">
          1
        </span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  ShuffleButton — green when active                                  */
/* ------------------------------------------------------------------ */

function ShuffleButton({ active, onClick, disabled }: { active: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center w-8 h-8 rounded-full transition-colors',
        active
          ? 'text-[var(--music-accent)]'
          : 'text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)]',
        disabled && 'opacity-40 cursor-not-allowed hover:text-[var(--music-text-secondary)]',
      )}
      aria-label={active ? 'Zufallswiedergabe an' : 'Zufallswiedergabe aus'}
      title="Zufallswiedergabe"
    >
      <Shuffle className="h-4 w-4" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  PlayPauseButton — 32px circle with accent background               */
/* ------------------------------------------------------------------ */

function PlayPauseButton({
  isPlaying,
  isLoading,
  onClick,
}: {
  isPlaying: boolean;
  isLoading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        'flex items-center justify-center w-8 h-8 rounded-full transition-all active:scale-95',
        'bg-[var(--music-accent)] hover:bg-[var(--music-accent-hover)]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
      )}
      aria-label={isPlaying ? 'Pause' : 'Wiedergabe'}
      title={isPlaying ? 'Pause' : 'Wiedergabe'}
    >
      {isLoading ? (
        <svg className="h-4 w-4 text-black animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
          <path
            d="M12 2a10 10 0 0 1 10 10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      ) : isPlaying ? (
        <Pause className="h-4 w-4 text-black fill-black" />
      ) : (
        <Play className="h-4 w-4 text-black fill-black ml-0.5" />
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  ProgressBar — custom div with click-to-seek + drag support         */
/*                                                                     */
/*  Features:                                                          */
/*    - Click to seek                                                  */
/*    - Drag handle (thumb) visible only on hover / drag               */
/*    - Preview line while hovering                                    */
/*    - Hover expands bar height                                       */
/* ------------------------------------------------------------------ */

function ProgressBar({
  position,
  duration,
  onSeek,
  onContextMenu,
}: {
  position: number;
  duration: number;
  onSeek: (pos: number) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPosition, setHoverPosition] = useState(0);

  const progress = duration > 0 ? Math.min(position / duration, 1) : 0;

  // Calculate position from mouse event
  const getPositionFromEvent = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      if (!barRef.current || duration <= 0) return 0;
      const rect = barRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      return (x / rect.width) * duration;
    },
    [duration],
  );

  // Click to seek
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (duration <= 0) return;
      const newPos = getPositionFromEvent(e);
      onSeek(newPos);
    },
    [duration, getPositionFromEvent, onSeek],
  );

  // Hover tracking
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (duration <= 0) return;
      setHoverPosition(getPositionFromEvent(e));
    },
    [duration, getPositionFromEvent],
  );

  // Drag start
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (duration <= 0) return;
      e.preventDefault();
      setIsDragging(true);
      const newPos = getPositionFromEvent(e);
      onSeek(newPos);
    },
    [duration, getPositionFromEvent, onSeek],
  );

  // Drag + release (global listeners)
  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      if (!barRef.current || duration <= 0) return;
      const newPos = getPositionFromEvent(e);
      onSeek(newPos);
    };
    const handleUp = () => {
      setIsDragging(false);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, duration, getPositionFromEvent, onSeek]);

  const barHeight = isDragging || isHovering ? PROGRESS_BAR_HOVER_HEIGHT : PROGRESS_BAR_HEIGHT;

  return (
    <div className="flex items-center gap-2 w-full">
      <span className="text-[11px] text-[var(--music-text-secondary)] w-8 text-right tabular-nums select-none">
        {formatTime(position)}
      </span>
      <div
        ref={barRef}
        className="relative flex-1 cursor-pointer group"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => {
          setIsHovering(false);
          setHoverPosition(0);
        }}
        onContextMenu={onContextMenu}
        role="slider"
        aria-label="Fortschritt"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={position}
        tabIndex={0}
      >
        {/* Track background */}
        <div
          className="w-full rounded-full bg-white/20 transition-all duration-75"
          style={{ height: barHeight }}
        >
          {/* Filled portion */}
          <div
            className="h-full rounded-full bg-[var(--music-accent)] relative transition-[width] duration-75"
            style={{ width: `${progress * 100}%`, willChange: 'width', transform: 'translateZ(0)' }}
          >
            {/* Thumb dot — visible on hover/drag */}
            <div
              className={cn(
                'absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md transition-opacity',
                isDragging || isHovering ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              )}
              style={{
                transform: 'translate(50%, -50%) translateZ(0)',
                willChange: 'transform',
              }}
            />
          </div>
        </div>
        {/* Hover preview line */}
        {isHovering && !isDragging && duration > 0 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/40 pointer-events-none"
            style={{
              left: `${(hoverPosition / duration) * 100}%`,
            }}
          />
        )}
      </div>
      <span className="text-[11px] text-[var(--music-text-secondary)] w-8 tabular-nums select-none">
        {formatTime(duration)}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PlayerCenter — Shuffle, Previous, Play/Pause, Next, Repeat, Bar   */
/* ------------------------------------------------------------------ */

interface PlayerCenterProps {
  shuffle: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  repeatMode: RepeatMode;
  position: number;
  duration: number;
  onToggleShuffle: () => void;
  onPrevious: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onCycleRepeat: () => void;
  onSeek: (pos: number) => void;
  /** Context menu for the timeline/progress bar */
  onTimelineContextMenu?: (e: React.MouseEvent) => void;
}

export function PlayerCenter({
  shuffle,
  isPlaying,
  isLoading,
  repeatMode,
  position,
  duration,
  onToggleShuffle,
  onPrevious,
  onTogglePlay,
  onNext,
  onCycleRepeat,
  onSeek,
  onTimelineContextMenu,
}: PlayerCenterProps) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1 max-w-[600px] mx-auto px-4">
      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        <ShuffleButton active={shuffle} onClick={onToggleShuffle} disabled={isLoading} />
        <button
          onClick={onPrevious}
          disabled={isLoading}
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-full transition-colors',
            'text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)]',
            isLoading && 'opacity-40 cursor-not-allowed hover:text-[var(--music-text-secondary)]',
          )}
          aria-label="Vorheriger Titel"
          title="Vorheriger"
        >
          <SkipBack className="h-5 w-5" />
        </button>
        <PlayPauseButton
          isPlaying={isPlaying}
          isLoading={isLoading}
          onClick={onTogglePlay}
        />
        <button
          onClick={onNext}
          disabled={isLoading}
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-full transition-colors',
            'text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)]',
            isLoading && 'opacity-40 cursor-not-allowed hover:text-[var(--music-text-secondary)]',
          )}
          aria-label="Nächster Titel"
          title="Nächster"
        >
          <SkipForward className="h-5 w-5" />
        </button>
        <RepeatButton mode={repeatMode} onClick={onCycleRepeat} disabled={isLoading} />
      </div>

      {/* Progress Bar / Timeline — disabled during loading */}
      <div className={cn('w-full', isLoading && 'pointer-events-none opacity-30')}>
        <ProgressBar
          position={position}
          duration={duration}
          onSeek={onSeek}
          onContextMenu={onTimelineContextMenu}
        />
      </div>
    </div>
  );
}
