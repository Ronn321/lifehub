'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
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

  // New fields for expanded library columns
  genre?: string;
  genreId?: string;
  year?: number;
  rating?: number;        // 0-10 scale
  isFavorite?: boolean;
  quality?: string;       // e.g. "FLAC", "MP3", "AAC"
  bitrate?: number;       // bits per second
  dateAdded?: string;     // ISO date string
  lastPlayed?: string;    // ISO date string

  // Audio technical metadata
  sampleRate?: number;    // Hz
  fileSize?: number;      // bytes

  // Lyrics
  lyrics?: { time: number; text: string }[];   // synced (timed) lyrics
  lyricsText?: string;                          // unsynced plain-text lyrics
}

/* 10 Player States (from spotify_player.md) */
export type PlayerStatus =
  | 'uninitialized'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'seeking'
  | 'finished'
  | 'stopped'
  | 'error';

export type RepeatMode = 'off' | 'all' | 'one';

export type QueueType = 'manual' | 'album' | 'playlist' | 'automatic';

/* Queue item states: position + origin per track */
export type QueueItemState =
  | 'current'
  | 'played'
  | 'next'
  | 'manual'
  | 'automatic';

export interface QueueItem extends MusicTrack {
  queueState: QueueItemState;
  addedAt: number; // Unix timestamp ms
  originalIndex?: number; // original position in source playlist/album
  sourceId?: string; // e.g. playlistId or albumId the track came from
}

export interface DeviceInfo {
  id: string;
  name: string;
  type:
    | 'local'
    | 'jellyfin'
    | 'web'
    | 'bluetooth'
    | 'network'
    | 'airplay'
    | 'chromecast'
    | 'dlna';
  isActive: boolean;
  isCurrentDevice: boolean;
  volume?: number; // 0.0 – 1.0
  volumeFixed?: boolean;
  status:
    | 'available'
    | 'connecting'
    | 'connected'
    | 'disconnected'
    | 'unavailable';
  latencyMs?: number;
  syncGroup?: string;
}

export interface PlaybackHistoryEntry {
  track: MusicTrack;
  playedAt: number; // Unix timestamp ms
  position?: number; // position (seconds) when stopped/skipped
  duration?: number; // how long it actually played (seconds)
}

/* ------------------------------------------------------------------ */
/*  Store Interface                                                    */
/* ------------------------------------------------------------------ */

interface MusicPlayerStore {
  /* ── Current track state ── */
  currentTrack: MusicTrack | null;
  status: PlayerStatus;
  position: number; // seconds
  duration: number; // seconds
  bufferingProgress: number; // 0.0 – 1.0

  /* ── Queue ── */
  queue: QueueItem[];
  queueType: QueueType;
  currentIndex: number;
  history: PlaybackHistoryEntry[];

  /* ── Device Selection ── */
  devices: DeviceInfo[];
  currentDevice: DeviceInfo | null;

  /* ── Settings (persisted) ── */
  volume: number; // 0.0 – 1.0
  isMuted: boolean;
  lastVolume: number; // volume before mute
  shuffle: boolean;
  repeatMode: RepeatMode;

  /* ── UI state ── */
  isExpanded: boolean; // right sidebar 'Now Playing' visibility
  isMiniPlayer: boolean; // floating mini-player mode
  miniPlayerPosition: { x: number; y: number }; // last drag position

  /* ── Favorites (persisted) ── */
  favoriteIds: string[];
  favoriteTracks: Record<string, MusicTrack>;

  /* ── Error state ── */
  errorMessage: string | null;
  retryTrigger: number; // incremented to trigger retry

  /* ── Internal: shuffle order indices ── */
  _shuffleOrder: number[];

  /* ── Playback Actions ── */
  playTrack: (
    track: MusicTrack,
    queue?: MusicTrack[],
    queueType?: QueueType,
  ) => void;
  playFromQueue: (index: number) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  setStatus: (status: PlayerStatus) => void;
  next: () => void;
  previous: () => void;
  seek: (position: number) => void;
  seekTo: (seconds: number) => void;
  setPosition: (position: number) => void;
  setDuration: (duration: number) => void;
  setBuffering: (isBuffering: boolean, progress?: number) => void;

  /* ── Volume ── */
  setVolume: (volume: number) => void;
  toggleMute: () => void;

  /* ── Error handling ── */
  setError: (message: string | null) => void;
  retry: () => void;

  /* ── Shuffle & Repeat ── */
  toggleShuffle: () => void;
  cycleRepeat: () => void;

  /* ── Queue Actions ── */
  addToQueue: (track: MusicTrack) => void;
  addToQueueNext: (track: MusicTrack) => void;
  removeFromQueue: (index: number) => void;
  removeMultiple: (indices: number[]) => void;
  moveSong: (fromIndex: number, toIndex: number) => void;
  reorderQueue: (from: number, to: number) => void;
  clearQueue: () => void;
  saveQueue: () => void;
  loadQueue: () => void;
  regenerateQueue: (tracks: MusicTrack[], sourceType: QueueType) => void;
  addToHistory: (track: MusicTrack, position?: number, duration?: number) => void;

  /* ── UI Actions ── */
  toggleExpanded: () => void;
  toggleMiniPlayer: () => void;
  setMiniPlayerPosition: (pos: { x: number; y: number }) => void;

  /* ── Device Actions ── */
  setDevices: (devices: DeviceInfo[]) => void;
  setCurrentDevice: (device: DeviceInfo | null) => void;
  addDevice: (device: DeviceInfo) => void;
  removeDevice: (deviceId: string) => void;
  updateDevice: (deviceId: string, updates: Partial<DeviceInfo>) => void;

  /* ── Favorites Actions ── */
    toggleFavorite: (track: MusicTrack) => void;
    isFavorite: (trackId: string) => boolean;
    getFavoriteTracks: () => MusicTrack[];
    syncFavorites: (tracks: MusicTrack[]) => void;
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

/** Wrap a MusicTrack into a QueueItem with default state. */
function toQueueItem(
  track: MusicTrack,
  state: QueueItemState = 'manual',
  originalIndex?: number,
  sourceId?: string,
): QueueItem {
  return {
    ...track,
    queueState: state,
    addedAt: Date.now(),
    originalIndex,
    sourceId,
  };
}

/** Convert an array of MusicTrack to QueueItem[], assigning states relative to a currentIndex. */
function trackListToQueue(
  tracks: MusicTrack[],
  currentIndex: number,
  sourceType: QueueType,
  sourceId?: string,
): QueueItem[] {
  return tracks.map((track, i) => {
    let state: QueueItemState;
    if (i === currentIndex) {
      state = 'current';
    } else if (i < currentIndex) {
      state = 'played';
    } else {
      state = sourceType === 'manual' ? 'manual' : 'automatic';
    }
    return toQueueItem(track, state, i, sourceId);
  });
}

/** Recalculate queueItem states after a change (currentIndex, removals, etc.). */
function refreshQueueStates(
  queue: QueueItem[],
  currentIndex: number,
): QueueItem[] {
  return queue.map((item, i) => {
    let state: QueueItemState;
    if (i === currentIndex) {
      state = 'current';
    } else if (i < currentIndex) {
      state = 'played';
    } else {
      // Keep origin for items that had a manual/automatic origin state
      state =
        item.queueState === 'manual' || item.queueState === 'automatic'
          ? item.queueState
          : 'next';
    }
    return { ...item, queueState: state };
  });
}

const MAX_HISTORY = 50;
const QUEUE_STORAGE_KEY = 'saved-player-queue';

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useMusicPlayerStore = create<MusicPlayerStore>()(
  persist(
    (set, get) => ({
      /* ── Initial State ── */

      currentTrack: null,
      status: 'uninitialized',
      position: 0,
      duration: 0,
      bufferingProgress: 0,

      queue: [],
      queueType: 'manual',
      currentIndex: 0,
      history: [],

      devices: [],
      currentDevice: null,

      volume: 0.8,
      isMuted: false,
      lastVolume: 0.8,
      shuffle: false,
      repeatMode: 'off',

      /* ── UI state ── */
      isExpanded: false,
      isMiniPlayer: false,
      miniPlayerPosition: typeof window !== 'undefined' ? { x: window.innerWidth - 320, y: window.innerHeight - 200 } : { x: 200, y: 200 },

      /* ── Favorites (persisted) ── */
      favoriteIds: [],
      favoriteTracks: {},

      errorMessage: null,
      retryTrigger: 0,

      _shuffleOrder: [],

      /* ── Playback Actions ── */

      playTrack: (track, queue, queueType) => {
        const q = queue ?? [track];
        const idx = q.findIndex((t) => t.id === track.id);
        const realIndex = idx >= 0 ? idx : 0;
        const { shuffle } = get();
        const qt = queueType ?? 'manual';

        const queueItems = trackListToQueue(q, realIndex, qt);

        set({
          queue: queueItems,
          queueType: qt,
          currentIndex: realIndex,
          currentTrack: q[realIndex] ?? track,
          status: 'loading',
          position: 0,
          duration: q[realIndex]?.duration ?? track.duration ?? 0,
          bufferingProgress: 0,
          _shuffleOrder: shuffle
            ? generateShuffleOrder(q.length, realIndex)
            : [],
        });
      },

      playFromQueue: (index) => {
        const { queue } = get();
        if (index < 0 || index >= queue.length) return;

        // Mark previous current as 'played'
        const updatedQueue = queue.map((item, i) => {
          if (i === index) return { ...item, queueState: 'current' as const };
          if (i < index && item.queueState === 'current')
            return { ...item, queueState: 'played' as const };
          return item;
        });

        // Refresh all states
        const refreshed = refreshQueueStates(updatedQueue, index);

        set({
          currentIndex: index,
          currentTrack: refreshed[index] ?? null,
          status: 'loading',
          position: 0,
          duration: refreshed[index]?.duration ?? 0,
          bufferingProgress: 0,
          queue: refreshed,
        });
      },

      togglePlay: () => {
        const { status } = get();
        if (status === 'playing') {
          set({ status: 'paused' });
        } else if (status === 'paused' || status === 'ready') {
          set({ status: 'playing' });
        }
      },

      play: () => {
        const { status } = get();
        if (status === 'paused' || status === 'ready') {
          set({ status: 'playing' });
        }
      },

      pause: () => {
        const { status } = get();
        if (status === 'playing') {
          set({ status: 'paused' });
        }
      },

      setPlaying: (playing) =>
        set({ status: playing ? 'playing' : 'paused' }),

      setStatus: (status) => set({ status }),

      next: () => {
        const {
          queue,
          currentIndex,
          repeatMode,
          shuffle,
          _shuffleOrder,
          currentTrack,
        } = get();
        if (queue.length === 0) return;

        // Add current track to history
        if (currentTrack) {
          get().addToHistory(currentTrack, get().position);
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
            set({ status: 'stopped', position: 0 });
            return;
          }
        } else {
          if (currentIndex < queue.length - 1) {
            nextIdx = currentIndex + 1;
          } else if (repeatMode === 'all') {
            nextIdx = 0;
          } else {
            set({ status: 'stopped', position: 0 });
            return;
          }
        }

        const refreshed = refreshQueueStates(queue, nextIdx);

        set({
          queue: refreshed,
          currentIndex: nextIdx,
          currentTrack: refreshed[nextIdx] ?? null,
          position: 0,
          duration: refreshed[nextIdx]?.duration ?? 0,
          status: 'loading',
          bufferingProgress: 0,
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

        const refreshed = refreshQueueStates(queue, prevIdx);

        set({
          queue: refreshed,
          currentIndex: prevIdx,
          currentTrack: refreshed[prevIdx] ?? null,
          position: 0,
          duration: refreshed[prevIdx]?.duration ?? 0,
          status: 'loading',
          bufferingProgress: 0,
        });
      },

      seek: (position) => set({ position }),
      seekTo: (seconds) => {
        const { duration } = get();
        set({
          position: Math.max(0, Math.min(seconds, duration)),
          status: 'seeking',
        });
      },
      setPosition: (position) => set({ position }),
      setDuration: (duration) => set({ duration }),

      setBuffering: (isBuffering, progress) => {
        if (isBuffering) {
          set({
            status: 'buffering',
            bufferingProgress: progress ?? 0,
          });
        } else {
          const { status } = get();
          set({
            bufferingProgress: 0,
            // Only revert to playing if we were buffering
            status: status === 'buffering' ? 'playing' : status,
          });
        }
      },

      /* ── Volume ── */

      setVolume: (volume) =>
        set((state) => {
          const clamped = Math.max(0, Math.min(1, volume));
          // When muted, still update lastVolume so the desired volume is remembered
          if (state.isMuted) {
            return { volume: clamped, lastVolume: clamped };
          }
          return { volume: clamped };
        }),

      toggleMute: () =>
        set((state) => {
          if (state.isMuted) {
            // Unmuting: restore lastVolume (or a sensible default)
            const restoreVolume = state.lastVolume > 0 ? state.lastVolume : 0.8;
            return { isMuted: false, volume: restoreVolume };
          } else {
            // Muting: save current volume as lastVolume
            return { isMuted: true, lastVolume: state.volume };
          }
        }),

      /* ── Error handling ── */

      setError: (message) => set({ errorMessage: message }),

      retry: () =>
        set((state) => ({
          status: 'loading',
          errorMessage: null,
          retryTrigger: state.retryTrigger + 1,
          position: 0,
          bufferingProgress: 0,
        })),

      /* ── Shuffle & Repeat ── */

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
        set((s) => ({
          queue: [...s.queue, toQueueItem(track, 'manual')],
        }));
      },

      addToQueueNext: (track) => {
        const { currentIndex } = get();
        set((s) => {
          const newQueue = [...s.queue];
          newQueue.splice(currentIndex + 1, 0, toQueueItem(track, 'manual'));
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
          newCurrentIndex = Math.min(currentIndex, newQueue.length - 1);
        }

        const refreshed =
          newQueue.length > 0
            ? refreshQueueStates(newQueue, Math.max(0, newCurrentIndex))
            : newQueue;

        set({
          queue: refreshed,
          currentIndex: Math.max(0, newCurrentIndex),
          currentTrack:
            refreshed.length > 0 ? (refreshed[Math.max(0, newCurrentIndex)] ?? null) : null,
        });
      },

      removeMultiple: (indices) => {
        const { queue, currentIndex } = get();
        const sorted = Array.from(new Set(indices)).sort((a, b) => b - a); // descending
        let newQueue = [...queue];
        for (const idx of sorted) {
          if (idx >= 0 && idx < newQueue.length) {
            newQueue.splice(idx, 1);
          }
        }
        // Adjust currentIndex — count how many removed before it
        const removedBeforeCurrent = sorted.filter((i) => i < currentIndex).length;
        let newCurrentIndex = currentIndex - removedBeforeCurrent;
        if (sorted.includes(currentIndex)) {
          newCurrentIndex = Math.min(newCurrentIndex, newQueue.length - 1);
        }
        newCurrentIndex = Math.max(0, newCurrentIndex);

        const refreshed =
          newQueue.length > 0
            ? refreshQueueStates(newQueue, newCurrentIndex)
            : newQueue;

        set({
          queue: refreshed,
          currentIndex: newCurrentIndex,
          currentTrack:
            refreshed.length > 0 ? (refreshed[newCurrentIndex] ?? null) : null,
        });
      },

      moveSong: (fromIndex, toIndex) => {
        const { queue, currentIndex } = get();
        if (
          fromIndex === toIndex ||
          fromIndex < 0 ||
          toIndex < 0 ||
          fromIndex >= queue.length ||
          toIndex >= queue.length
        )
          return;

        const newQueue = [...queue];
        const [moved] = newQueue.splice(fromIndex, 1);
        if (moved) newQueue.splice(toIndex, 0, moved);

        // Adjust currentIndex if needed
        let newCurrentIndex = currentIndex;
        if (fromIndex === currentIndex) {
          newCurrentIndex = toIndex;
        } else {
          if (fromIndex < currentIndex && toIndex >= currentIndex) {
            newCurrentIndex--;
          } else if (fromIndex > currentIndex && toIndex <= currentIndex) {
            newCurrentIndex++;
          }
        }

        const refreshed = refreshQueueStates(newQueue, newCurrentIndex);
        set({ queue: refreshed, currentIndex: newCurrentIndex });
      },

      reorderQueue: (from, to) => {
        // Alias for moveSong to maintain API compatibility
        get().moveSong(from, to);
      },

      clearQueue: () => {
        set({
          queue: [],
          currentIndex: 0,
          currentTrack: null,
          status: 'uninitialized',
          position: 0,
          duration: 0,
          bufferingProgress: 0,
          _shuffleOrder: [],
        });
      },

      saveQueue: () => {
        const { queue, queueType, currentIndex } = get();
        try {
          const payload = { queue, queueType, currentIndex, savedAt: Date.now() };
          localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(payload));
        } catch {
          // localStorage full or unavailable — silently fail
        }
      },

      loadQueue: () => {
        try {
          const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
          if (!raw) return;
          const parsed = JSON.parse(raw) as {
            queue: QueueItem[];
            queueType: QueueType;
            currentIndex: number;
          };
          if (!Array.isArray(parsed.queue) || parsed.queue.length === 0) return;

          const refreshed = refreshQueueStates(
            parsed.queue,
            parsed.currentIndex,
          );

          set({
            queue: refreshed,
            queueType: parsed.queueType ?? 'manual',
            currentIndex: parsed.currentIndex,
            currentTrack: refreshed[parsed.currentIndex] ?? null,
            status: 'ready',
          });
        } catch {
          // Corrupt data — silently ignore
        }
      },

      regenerateQueue: (tracks, sourceType) => {
        const { queue, currentIndex, currentTrack } = get();

        // Keep manually added tracks (those with queueState 'manual')
        const manualTracks = queue.filter(
          (item) => item.queueState === 'manual',
        );

        // Build new queue from source tracks
        const newTrackItems = trackListToQueue(
          tracks,
          sourceType === 'manual' ? 0 : 0,
          sourceType,
        );

        // Insert manual tracks after the current index
        let finalQueue: QueueItem[];
        let newCurrentIndex: number;

        if (manualTracks.length > 0 && newTrackItems.length > 0) {
          // Find the current track in the new track list
          const currentInNew = currentTrack
            ? newTrackItems.findIndex((t) => t.id === currentTrack.id)
            : -1;
          const insertIdx =
            currentInNew >= 0 ? currentInNew + 1 : newTrackItems.length;

          finalQueue = [...newTrackItems];
          finalQueue.splice(insertIdx, 0, ...manualTracks);
          newCurrentIndex =
            currentInNew >= 0
              ? currentInNew
              : Math.min(0, finalQueue.length - 1);
        } else if (manualTracks.length > 0) {
          // No source tracks, only manual
          finalQueue = manualTracks.map((t) => ({
            ...t,
            queueState: 'next' as const,
          }));
          newCurrentIndex = 0;
        } else {
          finalQueue = newTrackItems;
          newCurrentIndex = 0;
        }

        const refreshed = refreshQueueStates(finalQueue, newCurrentIndex);

        const { shuffle } = get();
        set({
          queue: refreshed,
          queueType: sourceType,
          currentIndex: newCurrentIndex,
          currentTrack: refreshed[newCurrentIndex] ?? currentTrack,
          status: refreshed.length > 0 ? 'ready' : 'uninitialized',
          position: 0,
          duration: refreshed[newCurrentIndex]?.duration ?? 0,
          bufferingProgress: 0,
          _shuffleOrder: shuffle
            ? generateShuffleOrder(refreshed.length, newCurrentIndex)
            : [],
        });
      },

      addToHistory: (track, position, duration) => {
        set((s) => ({
          history: [
            {
              track,
              playedAt: Date.now(),
              position,
              duration,
            },
            ...s.history,
          ].slice(0, MAX_HISTORY),
        }));
      },

      /* ── UI Actions ── */

      toggleExpanded: () => set((s) => ({ isExpanded: !s.isExpanded })),

      toggleMiniPlayer: () =>
        set((s) => ({ isMiniPlayer: !s.isMiniPlayer })),

      setMiniPlayerPosition: (pos) => set({ miniPlayerPosition: pos }),

      /* ── Favorites Actions ── */

      toggleFavorite: (track) => {
        const { favoriteIds, favoriteTracks } = get();
        const idx = favoriteIds.indexOf(track.id);
        if (idx >= 0) {
          // Remove from favorites
          const newIds = favoriteIds.filter((id) => id !== track.id);
          const newTracks = { ...favoriteTracks };
          delete newTracks[track.id];
          set({ favoriteIds: newIds, favoriteTracks: newTracks });
        } else {
          // Add to favorites
          set({
            favoriteIds: [...favoriteIds, track.id],
            favoriteTracks: { ...favoriteTracks, [track.id]: track },
          });
        }
      },

      isFavorite: (trackId) => {
        return get().favoriteIds.includes(trackId);
      },

      getFavoriteTracks: () => {
        const { favoriteIds, favoriteTracks } = get();
        return favoriteIds
          .map((id) => favoriteTracks[id])
          .filter((t): t is MusicTrack => t !== undefined);
      },

      syncFavorites: (tracks) => {
        const ids = tracks.map((t) => t.id);
        const trackMap: Record<string, MusicTrack> = {};
        for (const t of tracks) trackMap[t.id] = t;
        set({ favoriteIds: ids, favoriteTracks: trackMap });
      },

      /* ── Device Actions ── */

      setDevices: (devices) => set({ devices }),

      setCurrentDevice: (device) => {
        const { devices } = get();
        // Update the isCurrentDevice flag across all devices
        const updatedDevices = devices.map((d) => ({
          ...d,
          isCurrentDevice: device ? d.id === device.id : false,
          isActive: device ? d.id === device.id : d.isActive,
        }));
        set({
          currentDevice: device,
          devices: updatedDevices,
        });
      },

      addDevice: (device) => {
        set((s) => {
          if (s.devices.some((d) => d.id === device.id)) return s;
          return { devices: [...s.devices, device] };
        });
      },

      removeDevice: (deviceId) => {
        const { currentDevice } = get();
        set((s) => ({
          devices: s.devices.filter((d) => d.id !== deviceId),
          currentDevice:
            currentDevice?.id === deviceId ? null : currentDevice,
        }));
      },

      updateDevice: (deviceId, updates) => {
        set((s) => ({
          devices: s.devices.map((d) =>
            d.id === deviceId ? { ...d, ...updates } : d,
          ),
          currentDevice:
            s.currentDevice?.id === deviceId
              ? { ...s.currentDevice, ...updates }
              : s.currentDevice,
        }));
      },
    }),
    {
      name: 'music-player-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist settings, not runtime state
      partialize: (state) => ({
        volume: state.volume,
        isMuted: state.isMuted,
        lastVolume: state.lastVolume,
        shuffle: state.shuffle,
        repeatMode: state.repeatMode,
        isExpanded: state.isExpanded,
        isMiniPlayer: state.isMiniPlayer,
        miniPlayerPosition: state.miniPlayerPosition,
        favoriteIds: state.favoriteIds,
        favoriteTracks: state.favoriteTracks,
      }),
    },
  ),
);
