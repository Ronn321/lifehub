'use client';
import React from 'react';
import { X, Check } from 'lucide-react';
import type { SubtitleTrack } from './hooks/useVideoPlayer';

interface SubtitleSelectorProps {
  tracks: SubtitleTrack[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}

export function SubtitleSelector({ tracks, activeIndex, onSelect, onClose }: SubtitleSelectorProps) {
  return (
    <div className="absolute bottom-14 right-4 z-40 bg-black/90 backdrop-blur-sm rounded-lg p-2 min-w-[200px] max-h-[300px] overflow-y-auto">
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-xs text-white/50 uppercase tracking-wide">Untertitel</span>
        <button onClick={onClose} className="text-white/50 hover:text-white">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <button
        onClick={() => onSelect(-1)}
        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${
          activeIndex === -1 ? 'text-brand-500 bg-white/10' : 'text-white hover:bg-white/5'
        }`}
      >
        {activeIndex === -1 && <Check className="h-3.5 w-3.5 shrink-0" />}
        <span className={activeIndex === -1 ? '' : 'ml-5.5'}>Aus</span>
      </button>

      {tracks.map((track) => (
        <button
          key={track.index}
          onClick={() => onSelect(track.index)}
          className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${
            activeIndex === track.index ? 'text-brand-500 bg-white/10' : 'text-white hover:bg-white/5'
          }`}
        >
          {activeIndex === track.index && <Check className="h-3.5 w-3.5 shrink-0" />}
          <span className={activeIndex === track.index ? '' : 'ml-5.5'}>
            {track.title ?? track.language ?? `Spur ${track.index}`}
            {track.isForced && <span className="text-white/40 ml-1">(Forced)</span>}
          </span>
        </button>
      ))}
    </div>
  );
}
