'use client';
import { create } from 'zustand';

export interface PlayerFileInfo {
  id: string;
  filename: string;
  mimeType: string;
  artist: string;
  album: string;
  duration: number;
  trackNumber: number;
  coverFileId?: string;
}

export type RepeatMode = 'none' | 'one' | 'all';

interface PlayerState {
  queue: PlayerFileInfo[];
  currentIndex: number;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  repeat: RepeatMode;
  shuffle: boolean;

  play: (file: PlayerFileInfo, queue?: PlayerFileInfo[]) => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  next: () => void;
  prev: () => void;
  setVolume: (volume: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  clear: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  currentIndex: 0,
  isPlaying: false,
  volume: 0.7,
  currentTime: 0,
  duration: 0,
  repeat: 'none',
  shuffle: false,

  play: (file, queue) => {
    const q = queue ?? [file];
    const idx = q.findIndex((t) => t.id === file.id);
    set({ queue: q, currentIndex: idx >= 0 ? idx : 0, isPlaying: true, currentTime: 0, duration: file.duration });
  },

  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),

  setPlaying: (playing) => set({ isPlaying: playing }),

  next: () => {
    const { queue, currentIndex, repeat, shuffle } = get();
    if (queue.length === 0) return;
    if (repeat === 'one') {
      set({ currentTime: 0 });
      return;
    }
    let nextIndex: number;
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = currentIndex + 1;
    }
    if (nextIndex >= queue.length) {
      if (repeat === 'all') {
        set({ currentIndex: 0, currentTime: 0 });
      } else {
        set({ isPlaying: false });
      }
    } else {
      set({ currentIndex: nextIndex, currentTime: 0 });
    }
  },

  prev: () => {
    const { queue, currentIndex, currentTime } = get();
    if (queue.length === 0) return;
    if (currentTime > 3) {
      set({ currentTime: 0 });
      return;
    }
    const prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      set({ currentIndex: queue.length - 1, currentTime: 0 });
    } else {
      set({ currentIndex: prevIndex, currentTime: 0 });
    }
  },

  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),

  setCurrentTime: (time) => set({ currentTime: time }),

  setDuration: (duration) => set({ duration }),

  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),

  cycleRepeat: () =>
    set((s) => {
      const modes: RepeatMode[] = ['none', 'all', 'one'];
      const idx = modes.indexOf(s.repeat);
      return { repeat: modes[(idx + 1) % modes.length] };
    }),

  clear: () => set({ queue: [], currentIndex: 0, isPlaying: false, currentTime: 0, duration: 0 }),
}));
