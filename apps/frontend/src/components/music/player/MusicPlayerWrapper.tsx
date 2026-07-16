'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useJellyfinServer, getStreamUrl, useReportPlaybackStart, useReportPlaybackProgress, useReportPlaybackStop } from '@/lib/music-api';
import { useMusicPlayerStore } from '@/lib/music-player-store';
import type { RepeatMode, QueueItem } from '@/lib/music-player-store';
import { MusicPlayerBar } from '@/components/music/player/MusicPlayerBar';
import { MiniPlayer } from '@/components/music/player/MiniPlayer';
import { LyricsOverlay } from '@/components/music/player/LyricsOverlay';

/* ------------------------------------------------------------------ */
/*  Dual audio refs — survive App Router page transitions               */
/*  audioRef      → always points to the currently-playing element      */
/*  preloadAudioRef → always points to the preload/idle element          */
/*                                                                     */
/*  On gapless swap we exchange the actual HTMLAudioElement objects     */
/*  between the two refs, so audioRef.current always IS the active      */
/*  element and MusicPlayerBar can operate on it directly.              */
/* ------------------------------------------------------------------ */

const audioRef: { current: HTMLAudioElement | null } = { current: null };
const preloadAudioRef: { current: HTMLAudioElement | null } = { current: null };

function getAudio(): HTMLAudioElement {
  if (!audioRef.current && typeof Audio !== 'undefined') {
    audioRef.current = new Audio();
    audioRef.current.preload = 'auto';
  }
  return audioRef.current!;
}

function getPreloadAudio(): HTMLAudioElement {
  if (!preloadAudioRef.current && typeof Audio !== 'undefined') {
    preloadAudioRef.current = new Audio();
    preloadAudioRef.current.preload = 'auto';
  }
  return preloadAudioRef.current!;
}

/* ------------------------------------------------------------------ */
/*  Helper — determines the next queue index without mutating state    */
/*  Mirrors the logic inside the store's next() for peek-ahead.        */
/* ------------------------------------------------------------------ */

function getNextQueueIndex(
  queue: QueueItem[],
  currentIndex: number,
  repeatMode: RepeatMode,
  shuffle: boolean,
  shuffleOrder: number[],
): number {
  if (queue.length === 0) return -1;
  if (repeatMode === 'one') return currentIndex;

  if (shuffle && shuffleOrder.length > 0) {
    const curPos = shuffleOrder.indexOf(currentIndex);
    if (curPos < shuffleOrder.length - 1) return shuffleOrder[curPos + 1]!;
    if (repeatMode === 'all') return shuffleOrder[0]!;
    return -1;
  }

  if (currentIndex < queue.length - 1) return currentIndex + 1;
  if (repeatMode === 'all') return 0;
  return -1;
}

/** Build the expected stream URL for a track. */
function resolveTrackUrl(
  track: { streamUrl?: string; id: string },
  accessToken: string | null,
  server: { id: string } | null,
): string | null {
  if (track.streamUrl) return track.streamUrl;
  if (!accessToken || !server) return null;
  return getStreamUrl(accessToken, server.id, track.id);
}

/* ------------------------------------------------------------------ */
/*  MusicPlayerWrapper                                                */
/*  Manages audio ↔ Zustand store synchronisation and renders the     */
/*  MusicPlayerBar with the singleton audio ref.                      */
/*                                                                     */
/*  State machine (simplified):                                        */
/*    idle → loading → playing ↔ paused                                */
/*                    ↓↗ buffering (recovery → playing/paused)          */
/*                    ↘ seeking (recovery → playing/paused)             */
/*    playing → finished → next (or idle if queue empty)               */
/* ------------------------------------------------------------------ */

export function MusicPlayerWrapper() {
  const audio = getAudio();
  const preloadAudio = getPreloadAudio();

  /* ── Auth & Server ── */
  const accessToken = useAuthStore((s) => s.accessToken);
  const server = useJellyfinServer();

  /* ── Refs for use inside event listeners (stable across renders) ── */
  const accessTokenRef = useRef(accessToken);
  const serverRef = useRef(server);

  useEffect(() => { accessTokenRef.current = accessToken; }, [accessToken]);
  useEffect(() => { serverRef.current = server; }, [server]);

  /* ── Tracks which HTMLAudioElement is currently "active" (feeds store) ── */
  const activeElementRef = useRef<HTMLAudioElement>(audio);

  /* ── Store selectors ── */
  const currentTrack = useMusicPlayerStore((s) => s.currentTrack);
  const status = useMusicPlayerStore((s) => s.status);
  const volume = useMusicPlayerStore((s) => s.volume);
  const isMuted = useMusicPlayerStore((s) => s.isMuted);
  const queue = useMusicPlayerStore((s) => s.queue);
  const errorMessage = useMusicPlayerStore((s) => s.errorMessage);
  const retryTrigger = useMusicPlayerStore((s) => s.retryTrigger);

  /* ── Store actions ── */
  const setStatus = useMusicPlayerStore((s) => s.setStatus);
  const setPosition = useMusicPlayerStore((s) => s.setPosition);
  const setDuration = useMusicPlayerStore((s) => s.setDuration);
  const next = useMusicPlayerStore((s) => s.next);
  const togglePlay = useMusicPlayerStore((s) => s.togglePlay);
  const setError = useMusicPlayerStore((s) => s.setError);
  const retry = useMusicPlayerStore((s) => s.retry);

  /* ── UI state from store ── */
  const isExpanded = useMusicPlayerStore((s) => s.isExpanded);
  const toggleExpanded = useMusicPlayerStore((s) => s.toggleExpanded);
  const isMiniPlayer = useMusicPlayerStore((s) => s.isMiniPlayer);

  /* ── Local UI state for the player bar ── */
  const [isLiked, setIsLiked] = useState(false);
  const [isLyricsVisible, setIsLyricsVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isGaplessLoading, setIsGaplessLoading] = useState(false);

  /* ── Ref: intended status (playing/paused) for buffering/seeking recovery ── */
  const intendedStatusRef = useRef<'playing' | 'paused'>('paused');

  /* ── Ref: finished → next delay timer ── */
  const finishedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Ref: error → auto-skip timer ── */
  const errorSkipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Keep intendedStatusRef in sync with store status when not buffering/seeking */
  useEffect(() => {
    if (status === 'playing' || status === 'paused') {
      intendedStatusRef.current = status;
    }
  }, [status]);

  /* ════════════════════════════════════════════════════════════════ */
  /*  GAPLESS — preload the next track into the standby element      */
  /* ════════════════════════════════════════════════════════════════ */

  /** Swap the two HTMLAudioElement objects so audioRef points to the new active element. */
  const swapAudioRefs = useCallback(() => {
    const tmp = audioRef.current;
    audioRef.current = preloadAudioRef.current;
    preloadAudioRef.current = tmp;
    activeElementRef.current = audioRef.current!;
  }, []);

  /** Start preloading the next-next track on the standby element. */
  const startPreloadingNext = useCallback(() => {
    const store = useMusicPlayerStore.getState();
    const { queue: q, currentIndex: idx, repeatMode: rm, shuffle: sh, _shuffleOrder: so } = store;
    const nextIdx = getNextQueueIndex(q, idx, rm, sh, so);
    if (nextIdx < 0 || nextIdx >= q.length) {
      // No next track — clear preload
      const standby = preloadAudioRef.current;
      if (standby) {
        standby.pause();
        standby.removeAttribute('src');
      }
      return;
    }

    const nextTrack = q[nextIdx]!;
    const token = accessTokenRef.current;
    const srv = serverRef.current;
    const url = resolveTrackUrl(nextTrack, token, srv);
    if (!url) return;

    const standby = preloadAudioRef.current;
    if (!standby) return;

    // Only set src if different from what's already loaded
    if (standby.src !== url) {
      standby.src = url;
      standby.load();
    }
  }, []);

  /** Perform a gapless track swap — move preloaded audio to active. */
  const performGaplessSwap = useCallback(() => {
    const standby = preloadAudioRef.current;
    if (!standby || !standby.src) {
      // Preload not available — fall back to normal loading
      return false;
    }

    const activePreSwap = activeElementRef.current;

    // Pause old active
    if (!activePreSwap.paused) activePreSwap.pause();

    // Swap the refs so audioRef.current is now the preloaded element
    swapAudioRefs();

    // Start playback on the new active element (was standby)
    const newActive = audioRef.current;
    if (newActive) {
      newActive.play().catch((err) => {
        const errMsg = err instanceof Error ? err.message : 'Gapless-Wiedergabe fehlgeschlagen';
        console.warn('Gapless playback failed:', err);
        setStatus('error');
        setError(errMsg);
      });
    }

    // Clear the old element (now in standby slot) for re-use
    const oldElement = preloadAudioRef.current;
    if (oldElement) {
      oldElement.pause();
      oldElement.removeAttribute('src');
    }

    // Update store to next track
    const store = useMusicPlayerStore.getState();
    store.next();

    // Start preloading the following track
    startPreloadingNext();

    setIsGaplessLoading(false);
    return true;
  }, [swapAudioRefs, startPreloadingNext, setStatus, setError]);

  /* ════════════════════════════════════════════════════════════════ */
  /*  1. Source sync — update audio src when currentTrack changes   */
  /*  Sets status to 'loading' while the new src is being fetched   */
  /* ════════════════════════════════════════════════════════════════ */

  useEffect(() => {
    if (!currentTrack || !accessToken || !server) {
      // No track to play — pause and clear src
      if (!audio.paused) audio.pause();
      audio.removeAttribute('src');
      return;
    }

    // Check if preloadAudioRef already has this track loaded (gapless preload)
    const standby = preloadAudioRef.current;
    const expectedUrl = resolveTrackUrl(currentTrack, accessToken, server) ?? '';

    if (standby && standby.src && standby.src === expectedUrl && standby.readyState >= 2) {
      // Preloaded track available — do a gapless swap instead of setting src
      const activePreSwap = activeElementRef.current;
      if (!activePreSwap.paused) activePreSwap.pause();

      swapAudioRefs();

      const newActive = audioRef.current;
      if (newActive) {
        // The preloaded element's readyState should be good enough to play immediately
        setStatus('playing');
        newActive.play().catch((err) => {
          const errMsg = err instanceof Error ? err.message : 'Playback fehlgeschlagen';
          console.warn('Audio playback failed:', err);
          setStatus('error');
          setError(errMsg);
        });
      }

      // Clear the old element (now standby)
      const oldElement = preloadAudioRef.current;
      if (oldElement) {
        oldElement.pause();
        oldElement.removeAttribute('src');
      }

      // Start preloading next-next
      startPreloadingNext();
      return;
    }

    // Normal path — set src directly on the active element
    const url =
      currentTrack.streamUrl ??
      getStreamUrl(accessToken, server.id, currentTrack.id);

    if (audio.src !== url) {
      audio.src = url;
      setStatus('loading');
      audio.load();
    }

    // If the store says we should be playing, start playback.
    // This covers both initial play and next/prev track changes.
    if (status === 'playing') {
      audio.play().catch((err) => {
        const errMsg =
          err instanceof Error ? err.message : 'Playback fehlgeschlagen';
        console.warn('Audio playback failed:', err);
        setStatus('error');
        setError(errMsg);
      });
    }
  }, [currentTrack?.id, retryTrigger]);

  /* ════════════════════════════════════════════════════════════════ */
  /*  2. Play / pause sync — react to store status changes          */
  /*  Ignores transient statuses (buffering, seeking, finished)      */
  /* ════════════════════════════════════════════════════════════════ */

  useEffect(() => {
    if (!currentTrack) return;
    const activeEl = activeElementRef.current;
    if (!activeEl) return;

    if (status === 'playing' && activeEl.paused) {
      activeEl.play().catch(() => {});
    } else if (status === 'paused' && !activeEl.paused) {
      activeEl.pause();
    } else if ((status as string) === 'idle') {
      // Reached when store transitions to idle while currentTrack still set
      activeEl.pause();
      activeEl.removeAttribute('src');
    }
    // buffering / seeking / finished: do not touch audio element
  }, [status]);

  /* ════════════════════════════════════════════════════════════════ */
  /*  3. Volume / mute sync                                          */
  /*  Sync to BOTH elements so standby volume is always correct.     */
  /* ════════════════════════════════════════════════════════════════ */

  useEffect(() => {
    audio.volume = volume;
    audio.muted = isMuted;
    if (preloadAudio && preloadAudio !== audio) {
      preloadAudio.volume = volume;
      preloadAudio.muted = isMuted;
    }
  }, [volume, isMuted]);

  /* ════════════════════════════════════════════════════════════════ */
  /*  3b. Playback Reporting — start, progress (every 10s), stop    */
  /* ════════════════════════════════════════════════════════════════ */

  const reportPlaybackStart = useReportPlaybackStart();
  const reportPlaybackProgress = useReportPlaybackProgress();
  const reportPlaybackStop = useReportPlaybackStop();

  // Track the current item to detect skips and avoid redundant stops
  const prevItemIdRef = useRef<string | null>(null);
  const hasReportedStopRef = useRef(true);

  // On track load → report playback start
  useEffect(() => {
    if (!currentTrack || !server) return;
    const itemId = currentTrack.id;

    // If we changed from a previous track that hasn't been stopped yet, stop it first
    if (prevItemIdRef.current && prevItemIdRef.current !== itemId && !hasReportedStopRef.current) {
      const activeEl = activeElementRef.current;
      reportPlaybackStop(server.id, prevItemIdRef.current, Math.floor((activeEl?.currentTime ?? 0) * 10_000_000)).catch(() => {});
    }

    prevItemIdRef.current = itemId;
    hasReportedStopRef.current = false;

    reportPlaybackStart(server.id, itemId, 0).catch(() => {});
  }, [currentTrack?.id, server?.id]);

  // Every 10s during playback → report progress
  useEffect(() => {
    if (status !== 'playing' || !currentTrack || !server) return;

    const interval = setInterval(() => {
      const activeEl = activeElementRef.current;
      if (activeEl) {
        const ticks = Math.floor(activeEl.currentTime * 10_000_000);
        reportPlaybackProgress(server.id, currentTrack.id, ticks, false).catch(() => {});
      }
    }, 10_000);

    return () => clearInterval(interval);
  }, [status, currentTrack?.id, server?.id]);

  // On track end/stop → report playback stop
  useEffect(() => {
    if (!server || !prevItemIdRef.current || hasReportedStopRef.current) return;

    if (status === 'finished' || status === 'stopped') {
      const activeEl = activeElementRef.current;
      reportPlaybackStop(server.id, prevItemIdRef.current, Math.floor((activeEl?.currentTime ?? 0) * 10_000_000)).catch(() => {});
      hasReportedStopRef.current = true;
    }
  }, [status, server?.id]);

  /* ════════════════════════════════════════════════════════════════ */
  /*  4a. Error auto-skip: clear the timeout if status leaves error  */
  /* ════════════════════════════════════════════════════════════════ */

  useEffect(() => {
    if (status !== 'error' && errorSkipTimerRef.current) {
      clearTimeout(errorSkipTimerRef.current);
      errorSkipTimerRef.current = null;
    }
  }, [status]);

  /* ════════════════════════════════════════════════════════════════ */
  /*  4b. Audio event listeners                                      */
  /*     Attached to BOTH elements — each handler checks if it is    */
  /*     the active element before updating the store.                */
  /*                                                                 */
  /*     State transitions:                                          */
  /*       loadstart → loading                                       */
  /*       canplay → recover from loading → [playing|paused]          */
  /*       waiting → buffering (if intended = playing)                */
  /*       playing → recover from buffering                           */
  /*       seeking  → store: 'seeking'                                */
  /*       seeked   → recover from seeking                            */
  /*       ended → gapless swap (or finished then next)               */
  /*       error → error status                                      */
  /*       timeupdate → store position + trigger preload              */
  /*       durationchange → store duration                            */
  /* ════════════════════════════════════════════════════════════════ */

  useEffect(() => {
    /* ── Shared handler helpers ── */

    const isActive = (el: HTMLAudioElement): boolean =>
      el === activeElementRef.current;

    /* ── Position & Duration ── */

    const handleTimeUpdate = (el: HTMLAudioElement) => () => {
      if (!isActive(el)) return;
      setPosition(el.currentTime);

      // GAPLESS: preload next track when 80% through
      if (el.duration > 0 && el.currentTime / el.duration > 0.8) {
        const store = useMusicPlayerStore.getState();
        const { queue: q, currentIndex: idx, repeatMode: rm, shuffle: sh, _shuffleOrder: so } = store;
        const nextIdx = getNextQueueIndex(q, idx, rm, sh, so);
        if (nextIdx < 0 || nextIdx >= q.length) {
          // No next track — clear preload if set
          const standby = preloadAudioRef.current;
          if (standby && standby.src) {
            standby.removeAttribute('src');
          }
          return;
        }

        const nextTrack = q[nextIdx]!;
        const token = accessTokenRef.current;
        const srv = serverRef.current;
        const url = resolveTrackUrl(nextTrack, token, srv);
        if (!url) return;

        const standby = preloadAudioRef.current;
        if (!standby) return;

        // Only set src if different from what's already loaded or preloaded
        if (standby.src !== url) {
          standby.src = url;
          standby.load();
        }
      }
    };

    const handleDurationChange = (el: HTMLAudioElement) => () => {
      if (!isActive(el)) return;
      if (isFinite(el.duration)) setDuration(el.duration);
    };

    /* ── Loading → Can play ── */

    const handleLoadStart = (el: HTMLAudioElement) => () => {
      if (!isActive(el)) return;
      const s = useMusicPlayerStore.getState().status;
      if (s !== 'buffering' && s !== 'seeking' && s !== 'finished') {
        setStatus('loading');
      }
    };

    const handleCanPlay = (el: HTMLAudioElement) => () => {
      if (!isActive(el)) return;
      const s = useMusicPlayerStore.getState().status;
      if (s === 'loading') {
        // Restore to intended status (playing or paused)
        setStatus(intendedStatusRef.current);
        // If should be playing, ensure audio plays
        if (intendedStatusRef.current === 'playing' && el.paused) {
          el.play().catch(() => {});
        }
      }
    };

    /* ── Buffering detection (waiting / playing) ── */

    const handleWaiting = (el: HTMLAudioElement) => () => {
      if (!isActive(el)) return;
      const s = useMusicPlayerStore.getState().status;
      if (s === 'playing') {
        setStatus('buffering');
      }
    };

    const handlePlaying = (el: HTMLAudioElement) => () => {
      if (!isActive(el)) return;
      const s = useMusicPlayerStore.getState().status;
      if (s === 'buffering') {
        setStatus(intendedStatusRef.current);
      }
    };

    /* ── Seeking detection (seeking / seeked) ── */

    const handleSeeking = (el: HTMLAudioElement) => () => {
      if (!isActive(el)) return;
      const s = useMusicPlayerStore.getState().status;
      if (s === 'playing' || s === 'paused') {
        intendedStatusRef.current = s;
        setStatus('seeking');
      }
    };

    const handleSeeked = (el: HTMLAudioElement) => () => {
      if (!isActive(el)) return;
      const s = useMusicPlayerStore.getState().status;
      if (s === 'seeking') {
        setStatus(intendedStatusRef.current);
      }
    };

    /* ── Track ended → gapless swap (or finished → next) ── */

    const handleEnded = (el: HTMLAudioElement) => () => {
      if (!isActive(el)) return;

      // Clear any pending finished→next timer
      if (finishedTimerRef.current) {
        clearTimeout(finishedTimerRef.current);
      }

      // Try gapless swap first
      const standby = preloadAudioRef.current;
      if (standby && standby.src && standby.readyState >= 2) {
        // Gapless track transition
        const activePreSwap = activeElementRef.current;
        if (!activePreSwap.paused) activePreSwap.pause();

        swapAudioRefs();

        const newActive = audioRef.current;
        if (newActive) {
          newActive.play().catch((err) => {
            const errMsg = err instanceof Error ? err.message : 'Gapless-Wiedergabe fehlgeschlagen';
            console.warn('Gapless playback failed:', err);
            setStatus('error');
            setError(errMsg);
          });
        }

        // Clear old element
        const oldElement = preloadAudioRef.current;
        if (oldElement) {
          oldElement.pause();
          oldElement.removeAttribute('src');
        }

        // Update store
        useMusicPlayerStore.getState().next();

        // Preload the following track
        startPreloadingNext();

        setIsGaplessLoading(false);
        return;
      }

      // Preload not ready — show brief loading state
      if (standby && standby.src && standby.readyState < 2) {
        setIsGaplessLoading(true);
      }

      setStatus('finished');

      // Brief delay so UI shows 'finished' before transitioning
      finishedTimerRef.current = setTimeout(() => {
        const store = useMusicPlayerStore.getState();
        store.next();
        setIsGaplessLoading(false);
      }, 600);
    };

    /* ── Error ── */

    const handleError = (el: HTMLAudioElement) => () => {
      if (!isActive(el)) return;
      const errMsg =
        el.error?.message ??
        (el.error?.code
          ? `Audio error code: ${el.error.code}`
          : 'Wiedergabefehler');
      console.error('Audio playback error:', errMsg, el.error);
      setStatus('error');
      useMusicPlayerStore.getState().setError(errMsg);

      // Auto-skip to next track after 5 seconds on error
      if (errorSkipTimerRef.current) {
        clearTimeout(errorSkipTimerRef.current);
      }
      errorSkipTimerRef.current = setTimeout(() => {
        const store = useMusicPlayerStore.getState();
        store.next();
      }, 5000);

      // Show toast notification
      setToastMessage('Fehler bei Wiedergabe — überspringe zu nächstem Track');
      setTimeout(() => setToastMessage(null), 4000);
    };

    /* ── Register all listeners on both elements ── */

    const elements = [audio, preloadAudio];
    const cleanups: Array<() => void> = [];

    for (const el of elements) {
      const onTimeUpdate = handleTimeUpdate(el);
      const onDurationChange = handleDurationChange(el);
      const onLoadStart = handleLoadStart(el);
      const onCanPlay = handleCanPlay(el);
      const onWaiting = handleWaiting(el);
      const onPlaying = handlePlaying(el);
      const onSeeking = handleSeeking(el);
      const onSeeked = handleSeeked(el);
      const onEnded = handleEnded(el);
      const onError = handleError(el);

      el.addEventListener('timeupdate', onTimeUpdate);
      el.addEventListener('durationchange', onDurationChange);
      el.addEventListener('loadstart', onLoadStart);
      el.addEventListener('canplay', onCanPlay);
      el.addEventListener('waiting', onWaiting);
      el.addEventListener('playing', onPlaying);
      el.addEventListener('seeking', onSeeking);
      el.addEventListener('seeked', onSeeked);
      el.addEventListener('ended', onEnded);
      el.addEventListener('error', onError);

      cleanups.push(() => {
        el.removeEventListener('timeupdate', onTimeUpdate);
        el.removeEventListener('durationchange', onDurationChange);
        el.removeEventListener('loadstart', onLoadStart);
        el.removeEventListener('canplay', onCanPlay);
        el.removeEventListener('waiting', onWaiting);
        el.removeEventListener('playing', onPlaying);
        el.removeEventListener('seeking', onSeeking);
        el.removeEventListener('seeked', onSeeked);
        el.removeEventListener('ended', onEnded);
        el.removeEventListener('error', onError);
      });
    }

    /* ── Cleanup ── */

    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
      if (finishedTimerRef.current) {
        clearTimeout(finishedTimerRef.current);
      }
      if (errorSkipTimerRef.current) {
        clearTimeout(errorSkipTimerRef.current);
      }
    };
  }, []);

  /* ════════════════════════════════════════════════════════════════ */
  /*  4c. Clear preload on shuffle / repeat changes                  */
  /* ════════════════════════════════════════════════════════════════ */

  const shuffle = useMusicPlayerStore((s) => s.shuffle);
  const repeatMode = useMusicPlayerStore((s) => s.repeatMode);

  useEffect(() => {
    const standby = preloadAudioRef.current;
    if (standby && standby.src) {
      standby.pause();
      standby.removeAttribute('src');
    }
  }, [shuffle, repeatMode]);

  /* ════════════════════════════════════════════════════════════════ */
  /*  5. Callbacks for MusicPlayerBar                                */
  /* ════════════════════════════════════════════════════════════════ */

  const handleLikeToggle = useCallback((_trackId: string) => {
    setIsLiked((prev) => !prev);
    // TODO: Wire up to a real favourites API call
  }, []);

  const handleExpandToggle = useCallback(() => {
    toggleExpanded();
  }, [toggleExpanded]);

  const handleQueueToggle = useCallback(() => {
    // TODO: Open queue/now-playing panel
  }, []);

  const handleLyricsToggle = useCallback(() => {
    setIsLyricsVisible((prev) => !prev);
  }, []);

  const handleDeviceSelect = useCallback(
    (_deviceId: string) => {
      // TODO: Wire up to actual device management API
      console.log('Device selected:', _deviceId);
    },
    [],
  );

  const handleRetry = useCallback(() => {
    retry();
    // The source sync effect will re-run due to retryTrigger change
    if (currentTrack && accessToken && server) {
      const url =
        currentTrack.streamUrl ??
        getStreamUrl(accessToken, server.id, currentTrack.id);
      if (audio.src) {
        audio.src = url;
        audio.load();
        if (status === 'playing' || intendedStatusRef.current === 'playing') {
          audio.play().catch(() => {});
        }
      }
    }
  }, [retry, currentTrack, accessToken, server, audio, status]);

  /* ════════════════════════════════════════════════════════════════ */
  /*  6. Render                                                      */
  /* ════════════════════════════════════════════════════════════════ */

  return (
    <>
      {isMiniPlayer ? (
        <MiniPlayer />
      ) : (
        <MusicPlayerBar
          audioRef={audioRef as React.RefObject<HTMLAudioElement | null>}
          onExpandToggle={handleExpandToggle}
          isExpanded={isExpanded}
          onLikeToggle={handleLikeToggle}
          isLiked={isLiked}
          onQueueToggle={handleQueueToggle}
          queueCount={queue.length}
          onLyricsToggle={handleLyricsToggle}
          isLyricsVisible={isLyricsVisible}
          onDeviceSelect={handleDeviceSelect}
          onRetry={handleRetry}
          errorMessage={errorMessage}
        />
      )}

      {/* ── Gapless loading overlay ── */}
      {isGaplessLoading && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium"
          style={{
            background: 'rgba(59, 130, 246, 0.9)',
            color: '#fff',
            backdropFilter: 'blur(8px)',
          }}
        >
          Nächster Track wird geladen…
        </div>
      )}

      <LyricsOverlay
        isVisible={isLyricsVisible}
        onClose={handleLyricsToggle}
      />

      {/* ── Toast notification ── */}
      {toastMessage && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium"
          style={{
            background: 'rgba(239, 68, 68, 0.9)',
            color: '#fff',
            backdropFilter: 'blur(8px)',
          }}
        >
          {toastMessage}
        </div>
      )}
    </>
  );
}
