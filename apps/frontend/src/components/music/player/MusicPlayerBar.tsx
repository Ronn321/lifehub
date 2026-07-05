'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  ChevronUp,
  ListMusic,
  Heart,
  Mic2,
  Monitor,
  Maximize2,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useMusicPlayerStore } from '@/lib/music-player-store';
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

function RepeatButton({ mode, onClick }: { mode: RepeatMode; onClick: () => void }) {
  const isActive = mode !== 'off';
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-center justify-center w-8 h-8 rounded-full transition-colors',
        isActive ? 'text-[var(--music-accent)]' : 'text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)]',
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

function ShuffleButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center justify-center w-8 h-8 rounded-full transition-colors',
        active
          ? 'text-[var(--music-accent)]'
          : 'text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)]',
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
/*  VolumeControl — icon toggle + 100px slider                         */
/* ------------------------------------------------------------------ */

function VolumeControl({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
}: {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (v: number) => void;
  onToggleMute: () => void;
}) {
  const effectiveVolume = isMuted ? 0 : volume;

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={onToggleMute}
        className="flex items-center justify-center w-8 h-8 rounded-full text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)] transition-colors"
        aria-label={isMuted ? 'Stummschaltung aufheben' : 'Stummschalten'}
        title="Stummschalten"
      >
        {isMuted || volume === 0 ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.02}
        value={effectiveVolume}
        onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
        className="volume-slider"
        aria-label="Lautstärke"
        title="Lautstärke"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ProgressBar — custom div with click-to-seek + drag support         */
/* ------------------------------------------------------------------ */

function ProgressBar({
  position,
  duration,
  onSeek,
}: {
  position: number;
  duration: number;
  onSeek: (pos: number) => void;
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
            style={{ width: `${progress * 100}%` }}
          >
            {/* Thumb dot — visible on hover/drag */}
            <div
              className={cn(
                'absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md transition-opacity',
                isDragging || isHovering ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              )}
              style={{
                transform: `translate(50%, -50%)`,
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
/*  MusicPlayerBar v2 — 90px persistent player bar                     */
/* ------------------------------------------------------------------ */

interface MusicPlayerBarProps {
  /** Ref for the underlying <audio> element (controlled by parent) */
  audioRef?: React.RefObject<HTMLAudioElement | null>;
  /** Called when the expand button is clicked (sidebar/queue toggle) */
  onExpandToggle?: () => void;
  /** Whether the now-playing sidebar is currently open */
  isExpanded?: boolean;
  /** Called when the like button is clicked */
  onLikeToggle?: (trackId: string) => void;
  /** Whether the current track is liked */
  isLiked?: boolean;
  /** Called when the queue badge is clicked */
  onQueueToggle?: () => void;
  /** Queue item count badge */
  queueCount?: number;
}

export function MusicPlayerBar({
  audioRef,
  onExpandToggle,
  isExpanded = false,
  onLikeToggle,
  isLiked = false,
  onQueueToggle,
  queueCount = 0,
}: MusicPlayerBarProps) {
  /* ── Zustand state ── */

  const {
    currentTrack,
    status,
    position,
    duration,
    volume,
    isMuted,
    shuffle,
    repeatMode,
    togglePlay,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
  } = useMusicPlayerStore();

  const isLoading = status === 'loading';
  const isPlaying = status === 'playing';
  const hasTrack = currentTrack !== null;

  /* ── Volume state (local mirror for immediate slider feedback) ── */

  const [localVolume, setLocalVolume] = useState(volume);

  // Sync local volume with store volume
  useEffect(() => {
    setLocalVolume(volume);
  }, [volume]);

  const handleVolumeChange = useCallback(
    (v: number) => {
      setLocalVolume(v);
      setVolume(v);
      // Update audio element volume
      if (audioRef?.current) {
        audioRef.current.volume = v;
        audioRef.current.muted = isMuted;
      }
    },
    [setVolume, audioRef, isMuted],
  );

  const handleToggleMute = useCallback(() => {
    toggleMute();
    if (audioRef?.current) {
      audioRef.current.muted = !isMuted;
    }
  }, [toggleMute, audioRef, isMuted]);

  /* ── Keyboard shortcuts ── */

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.code) {
        case 'Space': {
          e.preventDefault();
          if (hasTrack) togglePlay();
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          previous();
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          next();
          break;
        }
        case 'Equal':
        case 'NumpadAdd': {
          e.preventDefault();
          const newVol = Math.min(1, localVolume + 0.1);
          handleVolumeChange(newVol);
          break;
        }
        case 'Minus':
        case 'NumpadSubtract': {
          e.preventDefault();
          const newVol = Math.max(0, localVolume - 0.1);
          handleVolumeChange(newVol);
          break;
        }
        case 'KeyM': {
          e.preventDefault();
          handleToggleMute();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasTrack, togglePlay, previous, next, localVolume, handleVolumeChange, handleToggleMute]);

  /* ── Progress seek handler ── */

  const handleSeek = useCallback(
    (pos: number) => {
      seek(pos);
      if (audioRef?.current) {
        audioRef.current.currentTime = pos;
      }
    },
    [seek, audioRef],
  );

  /* ── Render ── */

  return (
    <div
      className="w-full"
      style={{
        height: 'var(--music-player-bar-height, 90px)',
        background: 'var(--music-bg-elevated)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div className="flex items-center h-full px-4 max-w-screen-2xl mx-auto gap-2">
        {/* ── LEFT SECTION (30%) — Cover + Track Info + Actions ── */}
        <div className="flex items-center gap-3 min-w-0 w-[30%] max-w-[360px] shrink-0">
          {/* Cover */}
          <div
            className="shrink-0 rounded overflow-hidden bg-[var(--music-bg-card)] flex items-center justify-center"
            style={{ width: 56, height: 56 }}
          >
            {hasTrack && currentTrack.coverUrl ? (
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
          <div className="min-w-0 flex-1">
            {hasTrack ? (
              <>
                <p className="text-sm font-bold text-[var(--music-text-primary)] truncate leading-tight">
                  {currentTrack.title}
                </p>
                <p className="text-xs text-[var(--music-text-secondary)] truncate leading-tight mt-0.5">
                  {currentTrack.artist}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-[var(--music-text-disabled)] truncate leading-tight">
                  Kein Titel
                </p>
                <p className="text-xs text-[var(--music-text-disabled)] truncate leading-tight mt-0.5">
                  --
                </p>
              </>
            )}
          </div>

          {/* Like Button */}
          {hasTrack && onLikeToggle && (
            <button
              onClick={() => onLikeToggle(currentTrack.id)}
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full transition-colors shrink-0',
                isLiked
                  ? 'text-[var(--music-accent)]'
                  : 'text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)]',
              )}
              aria-label={isLiked ? 'Gefällt mir entfernen' : 'Gefällt mir'}
              title={isLiked ? 'Gefällt mir nicht mehr' : 'Gefällt mir'}
            >
              <Heart
                className={cn('h-4 w-4', isLiked && 'fill-[var(--music-accent)]')}
              />
            </button>
          )}

          {/* Expand Button */}
          <button
            onClick={onExpandToggle}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full transition-colors shrink-0',
              isExpanded
                ? 'text-[var(--music-accent)]'
                : 'text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)]',
            )}
            aria-label="Erweiterte Ansicht"
            title="Now Playing"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>

        {/* ── CENTER SECTION (40%, max 600px) — Controls + Progress ── */}
        <div className="flex-1 flex flex-col items-center gap-1 max-w-[600px] mx-auto px-4">
          {/* Control Buttons */}
          <div className="flex items-center gap-2">
            <ShuffleButton active={shuffle} onClick={toggleShuffle} />
            <button
              onClick={previous}
              className="flex items-center justify-center w-8 h-8 rounded-full text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)] transition-colors"
              aria-label="Vorheriger Titel"
              title="Vorheriger"
            >
              <SkipBack className="h-5 w-5" />
            </button>
            <PlayPauseButton
              isPlaying={isPlaying}
              isLoading={isLoading}
              onClick={togglePlay}
            />
            <button
              onClick={next}
              className="flex items-center justify-center w-8 h-8 rounded-full text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)] transition-colors"
              aria-label="Nächster Titel"
              title="Nächster"
            >
              <SkipForward className="h-5 w-5" />
            </button>
            <RepeatButton mode={repeatMode} onClick={cycleRepeat} />
          </div>

          {/* Progress Bar */}
          <ProgressBar
            position={position}
            duration={duration}
            onSeek={handleSeek}
          />
        </div>

        {/* ── RIGHT SECTION (30%) — Volume + Actions ── */}
        <div className="flex items-center gap-1.5 min-w-0 w-[30%] max-w-[360px] shrink-0 justify-end">
          {/* Lyrics */}
          <button
            className="flex items-center justify-center w-8 h-8 rounded-full text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)] transition-colors"
            aria-label="Songtexte"
            title="Songtexte"
          >
            <Mic2 className="h-4 w-4" />
          </button>

          {/* Queue Badge */}
          <button
            onClick={onQueueToggle}
            className="relative flex items-center justify-center w-8 h-8 rounded-full text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)] transition-colors"
            aria-label="Warteschlange"
            title="Warteschlange"
          >
            <ListMusic className="h-4 w-4" />
            {queueCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-full bg-[var(--music-accent)] text-[9px] font-bold text-black leading-none">
                {queueCount > 99 ? '99+' : queueCount}
              </span>
            )}
          </button>

          {/* Volume */}
          <VolumeControl
            volume={localVolume}
            isMuted={isMuted}
            onVolumeChange={handleVolumeChange}
            onToggleMute={handleToggleMute}
          />

          {/* Mini Player */}
          <button
            className="flex items-center justify-center w-8 h-8 rounded-full text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)] transition-colors"
            aria-label="Mini-Player"
            title="Mini-Player"
          >
            <Monitor className="h-4 w-4" />
          </button>

          {/* Fullscreen */}
          <button
            className="flex items-center justify-center w-8 h-8 rounded-full text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)] transition-colors"
            aria-label="Vollbild"
            title="Vollbild"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Global keyboard shortcut styles ── */}
      <style jsx>{`
        .volume-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100px;
          height: 4px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.2);
          outline: none;
          cursor: pointer;
          accent-color: var(--music-accent, #1db954);
          transition: height 0.1s ease;
        }
        .volume-slider:hover {
          height: 6px;
        }
        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #fff;
          border: none;
          cursor: pointer;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
          opacity: 0;
          transition: opacity 0.15s ease;
        }
        .volume-slider:hover::-webkit-slider-thumb,
        .volume-slider:active::-webkit-slider-thumb {
          opacity: 1;
        }
        .volume-slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #fff;
          border: none;
          cursor: pointer;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
          opacity: 0;
          transition: opacity 0.15s ease;
        }
        .volume-slider:hover::-moz-range-thumb,
        .volume-slider:active::-moz-range-thumb {
          opacity: 1;
        }
        .volume-slider::-webkit-slider-runnable-track {
          height: 4px;
          border-radius: 2px;
        }
        .volume-slider::-moz-range-track {
          height: 4px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.2);
        }
        .volume-slider::-moz-range-progress {
          height: 4px;
          border-radius: 2px;
          background-color: var(--music-accent, #1db954);
        }
      `}</style>
    </div>
  );
}
