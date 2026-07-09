'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, VolumeX, ChevronUp, ListMusic, X } from 'lucide-react';
import { cn } from '@/lib/cn';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface MusicTrack {
  Id: string;
  Name: string;
  Album?: string;
  AlbumId?: string;
  AlbumArtist?: string;
  Artist?: string;
  Artists?: string[];
  RunTimeTicks?: number;
}

export interface MusicPlayerState {
  tracks: MusicTrack[];
  index: number;
  playing: boolean;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  volume: number;
  currentTime: number;
  duration: number;
  error: string | null;
}

/* ------------------------------------------------------------------ */
/*  Persistent Music Player Bar                                       */
/* ------------------------------------------------------------------ */

export function MusicPlayerBar({
  tracks, index, playing, shuffle, repeat, volume, currentTime, duration, error,
  coverUrl, trackName, artistName, albumName,
  onTogglePlay, onPrev, onNext, onShuffle, onRepeat, onVolumeChange, onSeek,
  onClose, onToggleNowPlaying, nowPlayingOpen,
}: {
  tracks: MusicTrack[];
  index: number;
  playing: boolean;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  volume: number;
  currentTime: number;
  duration: number;
  error: string | null;
  coverUrl?: string;
  trackName: string;
  artistName: string;
  albumName?: string;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onShuffle: () => void;
  onRepeat: () => void;
  onVolumeChange: (v: number) => void;
  onSeek: (t: number) => void;
  onClose: () => void;
  onToggleNowPlaying: () => void;
  nowPlayingOpen: boolean;
}) {
  const progressRef = useRef<HTMLInputElement>(null);
  const muted = volume < 0.01;

  function formatTime(seconds: number): string {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-bg-surface/95 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
      <div className="flex items-center h-[72px] px-4 max-w-screen-2xl mx-auto gap-3">
        {/* Left: Cover + Track Info */}
        <div className="flex items-center gap-3 min-w-0 w-[280px] shrink-0">
          <div className="h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-bg-raised flex items-center justify-center">
            {coverUrl ? (
              <img src={coverUrl} alt={trackName} className="h-full w-full object-cover" />
            ) : (
              <ListMusic className="h-5 w-5 text-fg-muted" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate text-fg">{trackName}</p>
            <p className="text-xs text-fg-muted truncate">{artistName}</p>
          </div>
        </div>

        {/* Center: Controls + Progress */}
        <div className="flex-1 flex flex-col items-center gap-0.5 max-w-2xl mx-auto">
          {/* Control buttons */}
          <div className="flex items-center gap-3">
            <button onClick={onShuffle} className={cn('p-1 rounded transition-colors', shuffle ? 'text-brand-500' : 'text-fg-muted hover:text-fg')} title="Zufallswiedergabe">
              <Shuffle className="h-4 w-4" />
            </button>
            <button onClick={onPrev} className="p-1 text-fg-muted hover:text-fg transition-colors" title="Vorheriger">
              <SkipBack className="h-5 w-5" />
            </button>
            <button
              onClick={onTogglePlay}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 hover:bg-brand-400 transition-colors active:scale-95"
              title={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause className="h-4 w-4 text-white" /> : <Play className="h-4 w-4 text-white ml-0.5" />}
            </button>
            <button onClick={onNext} className="p-1 text-fg-muted hover:text-fg transition-colors" title="Nächster">
              <SkipForward className="h-5 w-5" />
            </button>
            <button
              onClick={onRepeat}
              className={cn('p-1 rounded transition-colors relative', repeat !== 'off' ? 'text-brand-500' : 'text-fg-muted hover:text-fg')}
              title={repeat === 'off' ? 'Keine Wiederholung' : repeat === 'all' ? 'Alle wiederholen' : 'Einzeln wiederholen'}
            >
              <Repeat className="h-4 w-4" />
              {repeat === 'one' && <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold">1</span>}
            </button>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2 w-full">
            <span className="text-[11px] text-fg-muted w-8 text-right tabular-nums">{formatTime(currentTime)}</span>
            <input
              ref={progressRef}
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              className="flex-1 h-1 appearance-none cursor-pointer rounded-full bg-white/10 accent-brand-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-500"
            />
            <span className="text-[11px] text-fg-muted w-8 tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right: Volume + Queue + Close */}
        <div className="flex items-center gap-2 w-[200px] shrink-0 justify-end">
          <div className="flex items-center gap-1">
            <button onClick={() => onVolumeChange(muted ? 0.8 : 0)} className="p-1 text-fg-muted hover:text-fg" title="Stumm">
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-20 h-1 appearance-none cursor-pointer rounded-full bg-white/10 accent-brand-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-500"
            />
          </div>

          {error && (
            <span className="text-xs text-danger truncate max-w-[80px]" title={error}>Fehler</span>
          )}

          <button
            onClick={onToggleNowPlaying}
            className={cn('p-1.5 rounded transition-colors', nowPlayingOpen ? 'text-brand-500 bg-brand-500/10' : 'text-fg-muted hover:text-fg')}
            title="Now Playing / Queue"
          >
            <ChevronUp className="h-4 w-4" />
          </button>

          <button onClick={onClose} className="p-1.5 text-fg-muted hover:text-fg transition-colors" title="Player schließen">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Now Playing / Queue Panel (Right Sidebar)                         */
/* ------------------------------------------------------------------ */

export function NowPlayingPanel({
  tracks, index, playing, coverUrl, trackName, artistName, albumName,
  onPlayTrack, onRemoveTrack, onClose,
}: {
  tracks: MusicTrack[];
  index: number;
  playing: boolean;
  coverUrl?: string;
  trackName: string;
  artistName: string;
  albumName?: string;
  onPlayTrack: (i: number) => void;
  onRemoveTrack: (i: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed bottom-[72px] right-0 z-40 w-80 border-l border-t border-border bg-bg-surface/95 backdrop-blur-xl rounded-tl-xl shadow-2xl max-h-[60vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">Warteschlange</h3>
        <button onClick={onClose} className="p-1 text-fg-muted hover:text-fg">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Current Track */}
      <div className="flex items-center gap-3 px-4 py-3 bg-brand-500/5 border-b border-border">
        <div className="h-10 w-10 shrink-0 rounded overflow-hidden bg-bg-raised flex items-center justify-center">
          {coverUrl ? (
            <img src={coverUrl} alt={trackName} className="h-full w-full object-cover" />
          ) : (
            <ListMusic className="h-4 w-4 text-fg-muted" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate text-fg">{trackName}</p>
          <p className="text-xs text-fg-muted truncate">{artistName}</p>
        </div>
        {playing && (
          <span className="flex gap-0.5">
            <span className="h-3 w-0.5 bg-brand-500 animate-pulse rounded-full" />
            <span className="h-3 w-0.5 bg-brand-500 animate-pulse rounded-full delay-75" />
            <span className="h-3 w-0.5 bg-brand-500 animate-pulse rounded-full delay-150" />
          </span>
        )}
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto">
        {tracks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-fg-muted">
            <ListMusic className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-xs">Keine Titel in der Warteschlange</p>
          </div>
        )}

        {tracks.map((track, i) => (
          <button
            key={`${track.Id}-${i}`}
            onClick={() => onPlayTrack(i)}
            className={cn(
              'flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-bg-raised/50 transition-colors group',
              i === index ? 'bg-brand-500/5' : '',
            )}
          >
            <span className={cn(
              'text-xs w-5 text-right shrink-0 tabular-nums',
              i === index ? 'text-brand-500' : 'text-fg-muted',
            )}>
              {i === index ? '▶' : (i + 1)}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn('text-sm truncate', i === index ? 'text-brand-500 font-medium' : 'text-fg')}>{track.Name}</p>
              <p className="text-xs text-fg-muted truncate">{track.Artist ?? track.AlbumArtist ?? ''}</p>
            </div>
            {track.RunTimeTicks && (
              <span className="text-xs text-fg-muted shrink-0 tabular-nums">{Math.round(track.RunTimeTicks / 10000000 / 60)} min</span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onRemoveTrack(i); }}
              className="p-1 text-fg-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              title="Entfernen"
            >
              <X className="h-3 w-3" />
            </button>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  useMusicPlayer — shared hook for player logic                      */
/* ------------------------------------------------------------------ */

export function useMusicPlayer() {
  const [playerState, setPlayerState] = useState<{
    tracks: MusicTrack[];
    index: number;
    playing: boolean;
    shuffle: boolean;
    repeat: 'off' | 'all' | 'one';
    volume: number;
    currentTime: number;
    duration: number;
    error: string | null;
    coverUrl: string;
    trackName: string;
    artistName: string;
    albumName: string;
  } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ... player logic will be handled by the parent component
  // This hook manages the state, the parent handles audio

  return {
    playerState,
    setPlayerState,
    audioRef,
  };
}
