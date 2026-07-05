'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  X,
  ChevronDown,
  Heart,
  ListMusic,
  Mic2,
  Trash2,
} from 'lucide-react';
import { useMusicPlayerStore } from '@/lib/music-player-store';
import { MusicImage } from '@/components/music/shared/MusicCard';
import { SongRow } from '@/components/music/shared/SongRow';
import { formatTime } from '@/lib/music-api';

/* ------------------------------------------------------------------ */
/*  NowPlayingView — Right Sidebar / Fullscreen / Mini Player         */
/*  Spec: spotify_now_playing_view.md                                  */
/* ------------------------------------------------------------------ */

type NowPlayingMode = 'sidebar' | 'fullscreen' | 'mini';

interface NowPlayingViewProps {
  mode: NowPlayingMode;
  onClose: () => void;
  audioRef?: React.RefObject<HTMLAudioElement>;
}

export function NowPlayingView({ mode, onClose, audioRef }: NowPlayingViewProps) {
  const [activeTab, setActiveTab] = useState<'nowplaying' | 'lyrics' | 'queue'>('nowplaying');

  const {
    currentTrack,
    status,
    queue,
    currentIndex,
    position,
    duration,
    volume,
    isMuted,
    shuffle,
    repeatMode,
    togglePlay,
    next,
    previous,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    playFromQueue,
    removeFromQueue,
    clearQueue,
    seek,
  } = useMusicPlayerStore();

  // Don't render if no track
  if (!currentTrack && mode !== 'fullscreen') return null;

  const isFullscreen = mode === 'fullscreen';
  const isMini = mode === 'mini';

  /* ── Fullscreen Mode ── */
  if (isFullscreen) {
    return (
      <FullscreenNowPlaying
        track={currentTrack}
        status={status}
        position={position}
        duration={duration}
        onClose={onClose}
        onTogglePlay={togglePlay}
        onNext={next}
        onPrev={previous}
        onSeek={(t) => {
          seek(t);
          if (audioRef?.current) audioRef.current.currentTime = t;
        }}
        shuffle={shuffle}
        repeatMode={repeatMode}
        onShuffle={toggleShuffle}
        onRepeat={cycleRepeat}
      />
    );
  }

  /* ── Mini Player Mode ── */
  if (isMini) {
    return (
      <div
        className="fixed bottom-[100px] right-4 z-50 flex w-80 items-center gap-3 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[var(--music-bg-elevated)] px-4 py-3 shadow-2xl backdrop-blur-xl"
        style={{ height: '80px' }}
      >
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded">
          {currentTrack?.coverUrl ? (
            <img src={currentTrack.coverUrl} alt={currentTrack.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[var(--music-bg-card)]">
              <ListMusic className="h-5 w-5 text-[var(--music-text-disabled)]" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[var(--music-text-primary)]">
            {currentTrack?.title ?? '--'}
          </p>
          <p className="truncate text-xs text-[var(--music-text-secondary)]">
            {currentTrack?.artist ?? ''}
          </p>
        </div>
        <button onClick={onClose} className="p-1 text-[var(--music-text-secondary)] hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  /* ── Sidebar Mode (320px right sidebar) ── */
  return (
    <aside
      className="flex flex-col border-l border-[rgba(255,255,255,0.1)] bg-[var(--music-bg-elevated)]"
      style={{ width: 'var(--music-right-sidebar-width, 320px)' }}
    >
      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] px-2">
        <div className="flex">
          {(['nowplaying', 'lyrics', 'queue'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="relative px-4 py-3 text-xs font-bold transition-colors"
              style={{
                color: activeTab === tab ? 'var(--music-text-primary)' : 'var(--music-text-secondary)',
              }}
            >
              {tab === 'nowplaying' ? 'Now Playing' : tab === 'lyrics' ? 'Lyrics' : 'Queue'}
              {activeTab === tab && (
                <div
                  className="absolute bottom-0 left-2 right-2 rounded-full"
                  style={{ height: '2px', background: 'var(--music-accent)' }}
                />
              )}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="p-2 text-[var(--music-text-secondary)] hover:text-white">
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto music-scroll">
        {activeTab === 'nowplaying' && (
          <NowPlayingTab
            track={currentTrack}
            status={status}
            position={position}
            duration={duration}
            onTogglePlay={togglePlay}
            onNext={next}
            onPrev={previous}
          />
        )}
        {activeTab === 'lyrics' && <LyricsTab track={currentTrack} />}
        {activeTab === 'queue' && (
          <QueueTab
            queue={queue}
            currentIndex={currentIndex}
            onPlayFromQueue={playFromQueue}
            onRemoveFromQueue={removeFromQueue}
            onClearQueue={clearQueue}
          />
        )}
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  Now Playing Tab                                                    */
/* ------------------------------------------------------------------ */

function NowPlayingTab({
  track,
  status,
  position,
  duration,
  onTogglePlay,
  onNext,
  onPrev,
}: {
  track: ReturnType<typeof useMusicPlayerStore.getState>['currentTrack'];
  status: string;
  position: number;
  duration: number;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const isPlaying = status === 'playing';

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      {/* Cover */}
      <div className="overflow-hidden rounded-lg shadow-2xl" style={{ width: '280px', height: '280px' }}>
        {track?.coverUrl ? (
          <img src={track.coverUrl} alt={track.album} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--music-bg-card)]">
            <ListMusic className="h-16 w-16 text-[var(--music-text-disabled)]" />
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="text-center">
        <p className="text-lg font-bold text-[var(--music-text-primary)]">{track?.title ?? '--'}</p>
        <p className="text-sm text-[var(--music-text-secondary)]">
          {track?.artist ?? 'Unbekannt'}
        </p>
        {track?.album && (
          <p className="text-xs text-[var(--music-text-tertiary)]">{track.album}</p>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button onClick={onPrev} className="text-[var(--music-text-secondary)] hover:text-white">
          <SkipBack className="h-5 w-5" />
        </button>
        <button
          onClick={onTogglePlay}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--music-accent)] hover:bg-[var(--music-accent-hover)]"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 fill-black text-black" />
          ) : (
            <Play className="h-4 w-4 fill-black text-black" />
          )}
        </button>
        <button onClick={onNext} className="text-[var(--music-text-secondary)] hover:text-white">
          <SkipForward className="h-5 w-5" />
        </button>
      </div>

      {/* Progress */}
      <div className="flex w-full items-center gap-2">
        <span className="text-xs tabular-nums text-[var(--music-text-tertiary)]">
          {formatTime(position)}
        </span>
        <div className="relative h-1 flex-1 rounded-full bg-[rgba(255,255,255,0.1)]">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-[var(--music-accent)]"
            style={{ width: `${duration > 0 ? (position / duration) * 100 : 0}%` }}
          />
        </div>
        <span className="text-xs tabular-nums text-[var(--music-text-tertiary)]">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Lyrics Tab                                                         */
/* ------------------------------------------------------------------ */

function LyricsTab({ track }: { track: ReturnType<typeof useMusicPlayerStore.getState>['currentTrack'] }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Mic2 className="mb-3 h-12 w-12 text-[var(--music-text-disabled)]" />
      <p className="text-sm font-bold text-[var(--music-text-primary)]">Keine Lyrics verfügbar</p>
      <p className="mt-1 text-xs text-[var(--music-text-secondary)]">
        Lyrics für „{track?.title ?? 'diesen Titel'}" sind nicht verfügbar.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Queue Tab                                                          */
/* ------------------------------------------------------------------ */

function QueueTab({
  queue,
  currentIndex,
  onPlayFromQueue,
  onRemoveFromQueue,
  onClearQueue,
}: {
  queue: ReturnType<typeof useMusicPlayerStore.getState>['queue'];
  currentIndex: number;
  onPlayFromQueue: (index: number) => void;
  onRemoveFromQueue: (index: number) => void;
  onClearQueue: () => void;
}) {
  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ListMusic className="mb-3 h-12 w-12 text-[var(--music-text-disabled)]" />
        <p className="text-sm font-bold text-[var(--music-text-primary)]">Warteschlange leer</p>
        <p className="mt-1 text-xs text-[var(--music-text-secondary)]">
          Spiele Musik ab, um die Queue zu füllen.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--music-text-secondary)]">
          Warteschlange ({queue.length})
        </h3>
        <button
          onClick={onClearQueue}
          className="p-1 text-[var(--music-text-secondary)] hover:text-[var(--music-error)]"
          aria-label="Queue leeren"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Current */}
      {queue[currentIndex] && (
        <div className="px-2 pb-1">
          <p className="px-2 pb-1 text-xs font-bold uppercase text-[var(--music-text-tertiary)]">
            Aktuell
          </p>
          <QueueItem
            track={queue[currentIndex]!}
            index={currentIndex}
            isActive
            onPlay={onPlayFromQueue}
            onRemove={onRemoveFromQueue}
          />
        </div>
      )}

      {/* Next Up */}
      {queue.slice(currentIndex + 1).length > 0 && (
        <div className="px-2 pb-1">
          <p className="px-2 py-1 text-xs font-bold uppercase text-[var(--music-text-tertiary)]">
            Als Nächstes
          </p>
          {queue.slice(currentIndex + 1).map((track, i) => (
            <QueueItem
              key={`${track.id}-${i}`}
              track={track}
              index={currentIndex + 1 + i}
              onPlay={onPlayFromQueue}
              onRemove={onRemoveFromQueue}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Queue Item                                                         */
/* ------------------------------------------------------------------ */

function QueueItem({
  track,
  index,
  isActive = false,
  onPlay,
  onRemove,
}: {
  track: NonNullable<ReturnType<typeof useMusicPlayerStore.getState>['currentTrack']>;
  index: number;
  isActive?: boolean;
  onPlay: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div
      className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--music-bg-card)]"
      onDoubleClick={() => onPlay(index)}
    >
      {/* Cover */}
      <div className="h-8 w-8 shrink-0 overflow-hidden rounded">
        {track.coverUrl ? (
          <img src={track.coverUrl} alt={track.album} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--music-bg-card)]">
            <ListMusic className="h-3 w-3 text-[var(--music-text-disabled)]" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p
          className={
            'truncate text-sm ' +
            (isActive
              ? 'font-medium text-[var(--music-accent)]'
              : 'text-[var(--music-text-primary)]')
          }
        >
          {track.title}
        </p>
        <p className="truncate text-xs text-[var(--music-text-secondary)]">{track.artist}</p>
      </div>

      {/* Soundbar if active */}
      {isActive && (
        <div className="music-soundbar flex items-end gap-0.5">
          <span style={{ width: 3, height: 8 }} />
          <span style={{ width: 3, height: 12 }} />
          <span style={{ width: 3, height: 6 }} />
        </div>
      )}

      {/* Duration */}
      <span className="shrink-0 text-xs tabular-nums text-[var(--music-text-tertiary)]">
        {formatTime(track.duration)}
      </span>

      {/* Remove */}
      <button
        onClick={() => onRemove(index)}
        className="shrink-0 p-1 opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Entfernen"
      >
        <X className="h-3 w-3 text-[var(--music-text-secondary)] hover:text-[var(--music-error)]" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Fullscreen Now Playing                                             */
/* ------------------------------------------------------------------ */

function FullscreenNowPlaying({
  track,
  status,
  position,
  duration,
  onClose,
  onTogglePlay,
  onNext,
  onPrev,
  onSeek,
  shuffle,
  repeatMode,
  onShuffle,
  onRepeat,
}: {
  track: ReturnType<typeof useMusicPlayerStore.getState>['currentTrack'];
  status: string;
  position: number;
  duration: number;
  onClose: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (t: number) => void;
  shuffle: boolean;
  repeatMode: string;
  onShuffle: () => void;
  onRepeat: () => void;
}) {
  const isPlaying = status === 'playing';
  const progressRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleSeek = useCallback(
    (e: React.MouseEvent) => {
      const bar = progressRef.current;
      if (!bar || duration === 0) return;
      const rect = bar.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      onSeek(Math.max(0, Math.min(1, pct)) * duration);
    },
    [duration, onSeek],
  );

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col bg-[var(--music-bg-base)]">
      {/* Blurred background */}
      {track?.coverUrl && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${track.coverUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(60px)',
            opacity: 0.3,
            transform: 'scale(1.2)',
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-8 p-8">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-6 top-6 p-2 text-white/60 hover:text-white"
        >
          <ChevronDown className="h-6 w-6" />
        </button>

        {/* Cover */}
        <div className="overflow-hidden rounded-lg shadow-2xl" style={{ width: '400px', height: '400px', maxWidth: '60vw', maxHeight: '40vh' }}>
          {track?.coverUrl ? (
            <img src={track.coverUrl} alt={track.album} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[var(--music-bg-card)]">
              <ListMusic className="h-20 w-20 text-[var(--music-text-disabled)]" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{track?.title ?? '--'}</p>
          <p className="text-lg text-[var(--music-text-secondary)]">
            {track?.artist ?? 'Unbekannt'}
          </p>
        </div>

        {/* Progress */}
        <div className="w-full max-w-2xl">
          <div className="flex items-center gap-3">
            <span className="w-12 text-right text-xs tabular-nums text-[var(--music-text-secondary)]">
              {formatTime(position)}
            </span>
            <div
              ref={progressRef}
              className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-[rgba(255,255,255,0.15)]"
              onClick={handleSeek}
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-[var(--music-accent)]"
                style={{ width: `${duration > 0 ? (position / duration) * 100 : 0}%` }}
              />
            </div>
            <span className="w-12 text-xs tabular-nums text-[var(--music-text-secondary)]">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6">
          <button
            onClick={onShuffle}
            className={shuffle ? 'text-[var(--music-accent)]' : 'text-[var(--music-text-secondary)] hover:text-white'}
          >
            <Shuffle className="h-5 w-5" />
          </button>
          <button onClick={onPrev} className="text-white hover:text-[var(--music-text-secondary)]">
            <SkipBack className="h-7 w-7" />
          </button>
          <button
            onClick={onTogglePlay}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white hover:scale-105"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6 fill-black text-black" />
            ) : (
              <Play className="h-6 w-6 fill-black text-black" />
            )}
          </button>
          <button onClick={onNext} className="text-white hover:text-[var(--music-text-secondary)]">
            <SkipForward className="h-7 w-7" />
          </button>
          <button
            onClick={onRepeat}
            className={repeatMode !== 'off' ? 'text-[var(--music-accent)]' : 'text-[var(--music-text-secondary)] hover:text-white'}
          >
            <Repeat className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
