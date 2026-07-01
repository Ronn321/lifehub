'use client';
import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Settings, Subtitles, Languages,
  PictureInPicture, Cast, Airplay,
} from 'lucide-react';
import type { PlayerState } from './hooks/useVideoPlayer';

interface PlayerControlsProps {
  state: PlayerState;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSeekRelative: (delta: number) => void;
  onSetVolume: (vol: number) => void;
  onToggleMute: () => void;
  onSetPlaybackRate: (rate: number) => void;
  onToggleFullscreen: (el: HTMLElement) => Promise<void>;
  onTogglePip: () => Promise<void>;
  onOpenSubtitles: () => void;
  onOpenAudioTracks: () => void;
  onCast?: () => void;
  onAirPlay?: () => void;
  containerRef: React.RefObject<HTMLDivElement>;
  visible: boolean;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function PlayerControls({
  state, onTogglePlay, onSeek, onSeekRelative, onSetVolume, onToggleMute,
  onSetPlaybackRate, onToggleFullscreen, onTogglePip,
  onOpenSubtitles, onOpenAudioTracks, onCast, onAirPlay,
  containerRef, visible,
}: PlayerControlsProps) {
  const progressRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);
  const [draggingProgress, setDraggingProgress] = useState<number | null>(null);
  const [draggingVolume, setDraggingVolume] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close settings on outside click
  useEffect(() => {
    if (!showSettings) return;
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSettings]);

  const handleProgressClick = useCallback((e: React.MouseEvent) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(pct * state.duration);
  }, [state.duration, onSeek]);

  const handleProgressMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setDraggingProgress(pct * state.duration);

    const handleMove = (ev: MouseEvent) => {
      const p = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      setDraggingProgress(p * state.duration);
    };
    const handleUp = (ev: MouseEvent) => {
      const p = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      onSeek(p * state.duration);
      setDraggingProgress(null);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [state.duration, onSeek]);

  const handleVolumeClick = useCallback((e: React.MouseEvent) => {
    const rect = volumeRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSetVolume(pct);
  }, [onSetVolume]);

  const currentTime = draggingProgress ?? state.currentTime;
  const progressPct = state.duration > 0 ? (currentTime / state.duration) * 100 : 0;
  const bufferedPct = state.duration > 0 ? (state.buffered / state.duration) * 100 : 0;

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

      <div className="relative px-4 pb-4 pt-12">
        {/* Progress bar */}
        <div
          ref={progressRef}
          className="group relative h-1.5 mb-4 cursor-pointer hover:h-2.5 transition-all rounded-full bg-white/20"
          onClick={handleProgressClick}
          onMouseDown={handleProgressMouseDown}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-white/30"
            style={{ width: `${bufferedPct}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-brand-500"
            style={{ width: `${progressPct}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-brand-500 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progressPct}% - 6px)` }}
          />
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-2 text-white">
          {/* Left controls */}
          <button onClick={onTogglePlay} className="p-1.5 hover:bg-white/10 rounded-md transition-colors">
            {state.playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>

          <button onClick={() => onSeekRelative(-10)} className="p-1.5 hover:bg-white/10 rounded-md transition-colors hidden sm:flex">
            <SkipBack className="h-4 w-4" />
          </button>
          <button onClick={() => onSeekRelative(10)} className="p-1.5 hover:bg-white/10 rounded-md transition-colors hidden sm:flex">
            <SkipForward className="h-4 w-4" />
          </button>

          {/* Time */}
          <span className="text-xs tabular-nums ml-1 hidden sm:inline">
            {formatTime(currentTime)} / {formatTime(state.duration)}
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right controls */}
          {/* Volume */}
          <div className="flex items-center gap-1 group/vol">
            <button onClick={onToggleMute} className="p-1.5 hover:bg-white/10 rounded-md transition-colors">
              {state.muted || state.volume === 0
                ? <VolumeX className="h-4 w-4" />
                : <Volume2 className="h-4 w-4" />
              }
            </button>
            <div
              ref={volumeRef}
              className="w-0 group-hover/vol:w-20 overflow-hidden transition-all duration-200"
              onClick={handleVolumeClick}
            >
              <div className="relative h-1 bg-white/20 rounded-full cursor-pointer">
                <div
                  className="absolute inset-y-0 left-0 bg-white rounded-full"
                  style={{ width: `${(state.muted ? 0 : state.volume) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Subtitles */}
          {state.subtitleTracks.length > 0 && (
            <button
              onClick={onOpenSubtitles}
              className={`p-1.5 hover:bg-white/10 rounded-md transition-colors ${
                state.activeSubtitle >= 0 ? 'text-brand-500' : ''
              }`}
            >
              <Subtitles className="h-4 w-4" />
            </button>
          )}

          {/* Audio tracks */}
          {state.audioTracks.length > 1 && (
            <button
              onClick={onOpenAudioTracks}
              className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
            >
              <Languages className="h-4 w-4" />
            </button>
          )}

          {/* PiP */}
          {document.pictureInPictureEnabled && (
            <button
              onClick={onTogglePip}
              className={`p-1.5 hover:bg-white/10 rounded-md transition-colors ${
                state.pip ? 'text-brand-500' : ''
              }`}
            >
              <PictureInPicture className="h-4 w-4" />
            </button>
          )}

          {/* AirPlay */}
          {onAirPlay && (
            <button onClick={onAirPlay} className="p-1.5 hover:bg-white/10 rounded-md transition-colors">
              <Airplay className="h-4 w-4" />
            </button>
          )}

          {/* Chromecast */}
          {onCast && (
            <button onClick={onCast} className="p-1.5 hover:bg-white/10 rounded-md transition-colors">
              <Cast className="h-4 w-4" />
            </button>
          )}

          {/* Settings */}
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setShowSettings(s => !s)}
              className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
            >
              <Settings className="h-4 w-4" />
            </button>
            {showSettings && (
              <div className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-sm rounded-lg p-2 min-w-[140px]">
                <p className="text-xs text-white/50 px-2 pb-1">Geschwindigkeit</p>
                {PLAYBACK_RATES.map(rate => (
                  <button
                    key={rate}
                    onClick={() => { onSetPlaybackRate(rate); setShowSettings(false); }}
                    className={`block w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${
                      state.playbackRate === rate ? 'text-brand-500 bg-white/10' : 'text-white hover:bg-white/5'
                    }`}
                  >
                    {rate === 1 ? 'Normal' : `${rate}x`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fullscreen */}
          <button
            onClick={() => containerRef.current && onToggleFullscreen(containerRef.current)}
            className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
          >
            {state.fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
