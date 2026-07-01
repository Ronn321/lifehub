'use client';

import { useRef, useEffect, useCallback } from 'react';
import { MediaPlayer, MediaOutlet } from '@vidstack/react';
import 'vidstack/styles/base.css';
import { usePlayerStore } from '@/lib/player-store';
import { getMediaStreamUrl } from '@/lib/media';
import { cn } from '@/lib/cn';
import {
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Music,
} from 'lucide-react';

function formatTime(seconds: number): string {
  if (!seconds || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function titleFromFilename(filename: string): string {
  return filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
}

export function AudioPlayer() {
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const volume = usePlayerStore((s) => s.volume);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);

  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const setPlaying = usePlayerStore((s) => s.setPlaying);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setDuration = usePlayerStore((s) => s.setDuration);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);

  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevVolumeRef = useRef(0.7);

  const currentFile = queue[currentIndex];
  const streamUrl = currentFile ? getMediaStreamUrl(currentFile.id) : '';
  const coverUrl = currentFile?.coverFileId ? getMediaStreamUrl(currentFile.coverFileId) : null;

  const findAudioElement = useCallback(() => {
    if (!containerRef.current) return null;
    const audio = containerRef.current.querySelector('audio');
    if (audio && audio !== audioRef.current) {
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  const handlePlayerReady = useCallback(() => {
    const audio = findAudioElement();
    if (!audio || audio.dataset.listenerAttached) return;

    audio.dataset.listenerAttached = 'true';
    audio.volume = volume;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration);
    const onEnded = () => next();
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    if (isPlaying) {
      audio.play().catch(() => {});
    }
  }, [findAudioElement, volume, isPlaying, next, setPlaying, setCurrentTime, setDuration]);

  useEffect(() => {
    const audio = findAudioElement();
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying, findAudioElement]);

  useEffect(() => {
    const audio = findAudioElement();
    if (audio) audio.volume = volume;
  }, [volume, findAudioElement]);

  if (queue.length === 0) return null;

  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    const audio = audioRef.current ?? findAudioElement();
    if (audio) audio.currentTime = newTime;
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    setVolume(Number(e.target.value));
  }

  function handleToggleMute() {
    if (volume > 0) {
      prevVolumeRef.current = volume;
      setVolume(0);
    } else {
      setVolume(prevVolumeRef.current);
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-bg-surface shadow-lg shadow-black/20">
      <div ref={containerRef} className="hidden">
        {streamUrl && currentFile && (
          <MediaPlayer
            key={currentFile.id}
            src={{ src: streamUrl, type: currentFile.mimeType }}
            onLoadedData={handlePlayerReady}
          >
            <MediaOutlet />
          </MediaPlayer>
        )}
      </div>

      <div className="mx-auto flex max-w-screen-2xl items-center gap-4 px-4 py-3">
        <div className="flex w-56 items-center gap-3">
          {coverUrl ? (
            <img src={coverUrl} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-bg-raised">
              <Music className="h-5 w-5 text-fg-muted" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-fg">
              {currentFile ? titleFromFilename(currentFile.filename) : ''}
            </p>
            <p className="truncate text-xs text-fg-muted">{currentFile?.artist ?? 'Unbekannter Künstler'}</p>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleShuffle}
              className={cn(
                'rounded p-1.5 transition-colors',
                shuffle ? 'text-brand-500' : 'text-fg-muted hover:text-fg',
              )}
              title="Zufallswiedergabe"
            >
              <Shuffle className="h-4 w-4" />
            </button>
            <button
              onClick={prev}
              className="rounded p-1.5 text-fg-muted transition-colors hover:text-fg"
              title="Vorheriger Titel"
            >
              <SkipBack className="h-5 w-5" />
            </button>
            <button
              onClick={togglePlay}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white transition-colors hover:bg-brand-400"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              onClick={next}
              className="rounded p-1.5 text-fg-muted transition-colors hover:text-fg"
              title="Nächster Titel"
            >
              <SkipForward className="h-5 w-5" />
            </button>
            <button
              onClick={cycleRepeat}
              className={cn(
                'rounded p-1.5 transition-colors',
                repeat !== 'none' ? 'text-brand-500' : 'text-fg-muted hover:text-fg',
              )}
              title={
                repeat === 'none'
                  ? 'Wiederholung aus'
                  : repeat === 'all'
                    ? 'Alle wiederholen'
                    : 'Einzeln wiederholen'
              }
            >
              <RepeatIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="flex w-full max-w-xl items-center gap-2">
            <span className="w-10 text-right text-xs tabular-nums text-fg-muted">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={1}
              value={currentTime}
              onChange={handleSeek}
              className="slider-thumb-brand h-1 w-full cursor-pointer appearance-none rounded-full bg-bg-raised accent-brand-500
                [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-500"
            />
            <span className="w-10 text-left text-xs tabular-nums text-fg-muted">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex w-32 items-center gap-2">
          <button
            onClick={handleToggleMute}
            className="rounded p-1 text-fg-muted transition-colors hover:text-fg"
            title={volume > 0 ? 'Stumm' : 'Ton einschalten'}
          >
            {volume > 0 ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={handleVolumeChange}
            className="slider-thumb-brand h-1 w-full cursor-pointer appearance-none rounded-full bg-bg-raised accent-brand-500
              [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-500"
          />
        </div>
      </div>
    </div>
  );
}
