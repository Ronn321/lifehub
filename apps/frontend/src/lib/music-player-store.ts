'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/* ------------------------------------------------------------------ */
/*  Types (from spotify_player.md + spotify_library.md)               */
/* ------------------------------------------------------------------ */

export interface MusicTrack {
  id: string; // Jellyfin ItemId
  title: string;
  artist: string;
  artistId?: string;
  album: string;
  albumId?: string;
  albumArtist?: string;
  duration: number; // seconds
  trackNumber?: number;
  discNumber?: number;
  coverUrl?: string;
  streamUrl?: string;
}

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';
export type RepeatMode = 'off' | 'all' | 'one';
export type QueueType = 'manual' | 'album' | 'playlist';

interface MusicPlayerStore {
  /* Current track state */
  currentTrack: MusicTrack | null;
  status: PlayerStatus;
  position: number; // seconds
  duration: number; // seconds

  /* Queue */
  queue: MusicTrack[];
  queueType: QueueType;
  currentIndex: number;
  history: MusicTrack[];

  /* Settings (persisted) */
  volume: number; // 0.0 - 1.0
  isMuted: boolean;
  shuffle: boolean;
  repeatMode: RepeatMode;

  /* Internal: shuffle order indices */
  _shuffleOrder: number[];

  /* Actions */
  playTrack: (
    track: MusicTrack,
    queue?: MusicTrack[],
    queueType?: QueueType,
  ) => void;
  playFromQueue: (index: number) => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  setStatus: (status: PlayerStatus) => void;
  next: () => void;
  previous: () => void;
  seek: (position: number) => void;
  setPosition: (position: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (track: MusicTrack) => void;
  addToQueueNext: (track: MusicTrack) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (from: number, to: number) => void;
  clearQueue: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function generateShuffleOrder(length: number, startIndex: number): number[] {
  const arr = Array.from({ length }, (_, i) => i);
  // Fisher-Yates shuffle
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  // Move startIndex to front so current track doesn't change
  const currentPos = arr.indexOf(startIndex);
  if (currentPos > 0) {
    [arr[0], arr[currentPos]] = [arr[currentPos]!, arr[0]!];
  }
  return arr;
}

const MAX_HISTORY = 50;

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useMusicPlayerStore = create<MusicPlayerStore>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      status: 'idle',
      position: 0,
      duration: 0,

      queue: [],
      queueType: 'manual',
      currentIndex: 0,
      history: [],

      volume: 0.8,
      isMuted: false,
      shuffle: false,
      repeatMode: 'off',

      _shuffleOrder: [],

      /* ── Playback Actions ── */

      playTrack: (track, queue, queueType) => {
        const q = queue ?? [track];
        const idx = q.findIndex((t) => t.id === track.id);
        const realIndex = idx >= 0 ? idx : 0;
        const { shuffle } = get();
        set({
          queue: q,
          queueType: queueType ?? 'manual',
          currentIndex: realIndex,
          currentTrack: q[realIndex] ?? track,
          status: 'playing',
          position: 0,
          duration: q[realIndex]?.duration ?? track.duration ?? 0,
          _shuffleOrder: shuffle
            ? generateShuffleOrder(q.length, realIndex)
            : [],
        });
      },

      playFromQueue: (index) => {
        const { queue } = get();
        if (index < 0 || index >= queue.length) return;
        set({
          currentIndex: index,
          currentTrack: queue[index] ?? null,
          status: 'playing',
          position: 0,
          duration: queue[index]?.duration ?? 0,
        });
      },

      togglePlay: () => {
        const { status } = get();
        if (status === 'playing') {
          set({ status: 'paused' });
        } else if (status === 'paused') {
          set({ status: 'playing' });
        }
      },

      setPlaying: (playing) =>
        set({ status: playing ? 'playing' : 'paused' }),

      setStatus: (status) => set({ status }),

      next: () => {
        const { queue, currentIndex, repeatMode, shuffle, _shuffleOrder, currentTrack } =
          get();
        if (queue.length === 0) return;

        // Add current track to history
        if (currentTrack) {
          set((s) => ({
            history: [currentTrack, ...s.history].slice(0, MAX_HISTORY),
          }));
        }

        if (repeatMode === 'one') {
          set({ position: 0, status: 'playing' });
          return;
        }

        let nextIdx: number;
        if (shuffle && _shuffleOrder.length > 0) {
          const curPos = _shuffleOrder.indexOf(currentIndex);
          if (curPos < _shuffleOrder.length - 1) {
            nextIdx = _shuffleOrder[curPos + 1]!;
          } else if (repeatMode === 'all') {
            nextIdx = _shuffleOrder[0]!;
          } else {
            set({ status: 'idle' });
            return;
          }
        } else {
          if (currentIndex < queue.length - 1) {
            nextIdx = currentIndex + 1;
          } else if (repeatMode === 'all') {
            nextIdx = 0;
          } else {
            set({ status: 'idle' });
            return;
          }
        }

        set({
          currentIndex: nextIdx,
          currentTrack: queue[nextIdx] ?? null,
          position: 0,
          duration: queue[nextIdx]?.duration ?? 0,
          status: 'playing',
        });
      },

      previous: () => {
        const { position, queue, currentIndex, repeatMode, shuffle, _shuffleOrder } =
          get();
        if (queue.length === 0) return;

        // If past 3 seconds, restart current track
        if (position > 3) {
          set({ position: 0 });
          return;
        }

        let prevIdx: number;
        if (shuffle && _shuffleOrder.length > 0) {
          const curPos = _shuffleOrder.indexOf(currentIndex);
          if (curPos > 0) {
            prevIdx = _shuffleOrder[curPos - 1]!;
          } else if (repeatMode === 'all') {
            prevIdx = _shuffleOrder[_shuffleOrder.length - 1]!;
          } else {
            prevIdx = currentIndex;
          }
        } else {
          if (currentIndex > 0) {
            prevIdx = currentIndex - 1;
          } else if (repeatMode === 'all') {
            prevIdx = queue.length - 1;
          } else {
            prevIdx = 0;
          }
        }

        set({
          currentIndex: prevIdx,
          currentTrack: queue[prevIdx] ?? null,
          position: 0,
          duration: queue[prevIdx]?.duration ?? 0,
          status: 'playing',
        });
      },

      seek: (position) => set({ position }),
      setPosition: (position) => set({ position }),
      setDuration: (duration) => set({ duration }),

      setVolume: (volume) =>
        set({ volume: Math.max(0, Math.min(1, volume)) }),

      toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),

      toggleShuffle: () => {
        const { shuffle, queue, currentIndex } = get();
        const newShuffle = !shuffle;
        set({
          shuffle: newShuffle,
          _shuffleOrder: newShuffle
            ? generateShuffleOrder(queue.length, currentIndex)
            : [],
        });
      },

      cycleRepeat: () => {
        const modes: RepeatMode[] = ['off', 'all', 'one'];
        const { repeatMode } = get();
        const idx = modes.indexOf(repeatMode);
        set({ repeatMode: modes[(idx + 1) % modes.length]! });
      },

      /* ── Queue Actions ── */

      addToQueue: (track) => {
        set((s) => ({ queue: [...s.queue, track] }));
      },

      addToQueueNext: (track) => {
        const { currentIndex } = get();
        set((s) => {
          const newQueue = [...s.queue];
          newQueue.splice(currentIndex + 1, 0, track);
          return { queue: newQueue };
        });
      },

      removeFromQueue: (index) => {
        const { queue, currentIndex } = get();
        if (index < 0 || index >= queue.length) return;
        const newQueue = queue.filter((_, i) => i !== index);
        let newCurrentIndex = currentIndex;
        if (index < currentIndex) newCurrentIndex--;
        if (index === currentIndex) {
          // Removed the current track — move to next available
          newCurrentIndex = Math.min(currentIndex, newQueue.length - 1);
        }
        set({
          queue: newQueue,
          currentIndex: Math.max(0, newCurrentIndex),
          currentTrack: newQueue[newCurrentIndex] ?? null,
        });
      },

      reorderQueue: (from, to) => {
        const { queue } = get();
        if (from === to || from < 0 || to < 0 || from >= queue.length) return;
        const newQueue = [...queue];
        const [moved] = newQueue.splice(from, 1);
        if (moved) newQueue.splice(to, 0, moved);
        set({ queue: newQueue });
      },

      clearQueue: () => {
        set({
          queue: [],
          currentIndex: 0,
          currentTrack: null,
          status: 'idle',
          position: 0,
          duration: 0,
          _shuffleOrder: [],
        });
      },
    }),
    {
      name: 'music-player-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist settings, not runtime state
      partialize: (state) => ({
        volume: state.volume,
        isMuted: state.isMuted,
        shuffle: state.shuffle,
        repeatMode: state.repeatMode,
      }),
    },
  ),
);
