'use client';

import { ChevronLeft, ChevronRight, Play, Pause, Clock } from 'lucide-react';

const INTERVALS = [
  { label: '2s', value: 2000 },
  { label: '3s', value: 3000 },
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
];

export function SlideshowControls({
  state,
  interval,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onPlay,
  onPause,
  onIntervalChange,
}: {
  state: 'idle' | 'start' | 'playing' | 'paused';
  interval: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onPlay: () => void;
  onPause: () => void;
  onIntervalChange: (interval: number) => void;
}) {
  const isActive = state === 'playing' || state === 'paused';

  return (
    <div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full bg-black/70 backdrop-blur px-3 py-2"
      onClick={(e) => e.stopPropagation()}
    >
      {state === 'idle' && (
        <>
          <button
            onClick={onPlay}
            className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white hover:bg-white/25 transition-colors"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Diashow
          </button>
          <div className="flex items-center gap-1 pl-2 border-l border-white/20">
            <Clock className="h-3 w-3 text-white/60" />
            {INTERVALS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onIntervalChange(opt.value)}
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                  interval === opt.value
                    ? 'bg-white/20 text-white'
                    : 'text-white/50 hover:text-white hover:bg-white/10'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}

      {state === 'start' && (
        <span className="flex items-center gap-1.5 px-2 text-xs text-white/80">
          <Clock className="h-3.5 w-3.5 animate-pulse" />
          Starte Diashow …
        </span>
      )}

      {state === 'playing' && (
        <>
          <button
            onClick={onPrev}
            disabled={!hasPrev}
            className="rounded-full p-1 text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Vorheriges"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            onClick={onPause}
            className="rounded-full bg-white/15 p-1.5 text-white hover:bg-white/25 transition-colors"
            aria-label="Pause"
          >
            <Pause className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={onNext}
            disabled={!hasNext}
            className="rounded-full p-1 text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Nächstes"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <span className="ml-1 text-[10px] text-white/50 border-l border-white/20 pl-2">
            {interval / 1000}s
          </span>
        </>
      )}

      {state === 'paused' && (
        <>
          <button
            onClick={onPrev}
            disabled={!hasPrev}
            className="rounded-full p-1 text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Vorheriges"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            onClick={onPlay}
            className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/25 transition-colors"
          >
            <Play className="h-3 w-3 fill-current" />
            Fortsetzen
          </button>

          <button
            onClick={onNext}
            disabled={!hasNext}
            className="rounded-full p-1 text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Nächstes"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-1 ml-1 pl-2 border-l border-white/20">
            {INTERVALS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onIntervalChange(opt.value)}
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                  interval === opt.value
                    ? 'bg-white/20 text-white'
                    : 'text-white/50 hover:text-white hover:bg-white/10'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
