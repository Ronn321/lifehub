'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useJellyfinServer, getStreamUrl, useReportPlaybackStart, useReportPlaybackProgress, useReportPlaybackStop } from '@/lib/music-api';
import { useMusicPlayerStore } from '@/lib/music-player-store';
import { MusicPlayerBar } from '@/components/music/player/MusicPlayerBar';
import { MiniPlayer } from '@/components/music/player/MiniPlayer';
import { LyricsOverlay } from '@/components/music/player/LyricsOverlay';

/* ------------------------------------------------------------------ */
/*  Singleton audio ref — survives App Router page transitions          */
/*  Audio element is created lazily inside useEffect (browser-only).    */
/* ------------------------------------------------------------------ */

const audioRef: { current: HTMLAudioElement | null } = { current: null };

function getAudio(): HTMLAudioElement {
  if (!audioRef.current && typeof Audio !== 'undefined') {
    audioRef.current = new Audio();
    audioRef.current.preload = 'auto';
  }
  return audioRef.current!;
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

  /* ── Auth & Server ── */
  const accessToken = useAuthStore((s) => s.accessToken);
  const server = useJellyfinServer();

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
    if (!audio.src && currentTrack) return; // src hasn't been set yet

    if (status === 'playing' && audio.paused) {
      audio.play().catch(() => {});
    } else if (status === 'paused' && !audio.paused) {
      audio.pause();
    } else if ((status as string) === 'idle') {
      // Reached when store transitions to idle while currentTrack still set
      audio.pause();
      audio.removeAttribute('src');
    }
    // buffering / seeking / finished: do not touch audio element
  }, [status]);

  /* ════════════════════════════════════════════════════════════════ */
  /*  3. Volume / mute sync                                          */
  /* ════════════════════════════════════════════════════════════════ */

  useEffect(() => {
    audio.volume = volume;
    audio.muted = isMuted;
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
      reportPlaybackStop(server.id, prevItemIdRef.current, Math.floor(audio.currentTime * 10_000_000)).catch(() => {});
    }

    prevItemIdRef.current = itemId;
    hasReportedStopRef.current = false;

    reportPlaybackStart(server.id, itemId, 0).catch(() => {});
  }, [currentTrack?.id, server?.id]);

  // Every 10s during playback → report progress
  useEffect(() => {
    if (status !== 'playing' || !currentTrack || !server) return;

    const interval = setInterval(() => {
      const ticks = Math.floor(audio.currentTime * 10_000_000);
      reportPlaybackProgress(server.id, currentTrack.id, ticks, false).catch(() => {});
    }, 10_000);

    return () => clearInterval(interval);
  }, [status, currentTrack?.id, server?.id]);

  // On track end/stop → report playback stop
  useEffect(() => {
    if (!server || !prevItemIdRef.current || hasReportedStopRef.current) return;

    if (status === 'finished' || status === 'stopped') {
      reportPlaybackStop(server.id, prevItemIdRef.current, Math.floor(audio.currentTime * 10_000_000)).catch(() => {});
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
  /*     State transitions:                                          */
  /*       loadstart → loading                                       */
  /*       canplay → recover from loading → [playing|paused]          */
  /*       waiting → buffering (if intended = playing)                */
  /*       playing → recover from buffering                           */
  /*       seeking  → store: 'seeking'                                */
  /*       seeked   → recover from seeking                            */
  /*       ended → finished (then next() after brief delay)           */
  /*       error → error status                                      */
  /*       timeupdate → store position                                */
  /*       durationchange → store duration                            */
  /* ════════════════════════════════════════════════════════════════ */

  useEffect(() => {
    /* ── Position & Duration ── */

    const handleTimeUpdate = () => setPosition(audio.currentTime);

    const handleDurationChange = () => {
      if (isFinite(audio.duration)) setDuration(audio.duration);
    };

    /* ── Loading → Can play ── */

    const handleLoadStart = () => {
      // Only set loading if we're not already playing/paused (track change)
      const s = useMusicPlayerStore.getState().status;
      if (s !== 'buffering' && s !== 'seeking' && s !== 'finished') {
        setStatus('loading');
      }
    };

    const handleCanPlay = () => {
      const s = useMusicPlayerStore.getState().status;
      if (s === 'loading') {
        // Restore to intended status (playing or paused)
        setStatus(intendedStatusRef.current);
        // If should be playing, ensure audio plays
        if (intendedStatusRef.current === 'playing' && audio.paused) {
          audio.play().catch(() => {});
        }
      }
    };

    /* ── Buffering detection (waiting / playing) ── */

    const handleWaiting = () => {
      const s = useMusicPlayerStore.getState().status;
      // Only transition to buffering if we were actively playing
      if (s === 'playing') {
        setStatus('buffering');
      }
    };

    const handlePlaying = () => {
      const s = useMusicPlayerStore.getState().status;
      // Recover from buffering to intended status
      if (s === 'buffering') {
        setStatus(intendedStatusRef.current);
      }
    };

    /* ── Seeking detection (seeking / seeked) ── */

    const handleSeeking = () => {
      const s = useMusicPlayerStore.getState().status;
      if (s === 'playing' || s === 'paused') {
        // Remember intended status before seeking
        intendedStatusRef.current = s;
        setStatus('seeking');
      }
    };

    const handleSeeked = () => {
      const s = useMusicPlayerStore.getState().status;
      if (s === 'seeking') {
        setStatus(intendedStatusRef.current);
      }
    };

    /* ── Track ended → finished → next ── */

    const handleEnded = () => {
      // Clear any pending finished→next timer
      if (finishedTimerRef.current) {
        clearTimeout(finishedTimerRef.current);
      }

      setStatus('finished');

      // Brief delay so UI shows 'finished' before transitioning
      finishedTimerRef.current = setTimeout(() => {
        const store = useMusicPlayerStore.getState();
        // If repeat-one, next() resets to same track
        // If nothing left in queue, next() sets status to 'idle'
        store.next();
      }, 600);
    };

    /* ── Error ── */

    const handleError = () => {
      const errMsg =
        audio.error?.message ??
        (audio.error?.code
          ? `Audio error code: ${audio.error.code}`
          : 'Wiedergabefehler');
      console.error('Audio playback error:', errMsg, audio.error);
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

    /* ── Register all listeners ── */

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);

    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);

    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);

    audio.addEventListener('seeking', handleSeeking);
    audio.addEventListener('seeked', handleSeeked);

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    /* ── Cleanup ── */

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);

      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);

      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);

      audio.removeEventListener('seeking', handleSeeking);
      audio.removeEventListener('seeked', handleSeeked);

      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);

      if (finishedTimerRef.current) {
        clearTimeout(finishedTimerRef.current);
      }
      if (errorSkipTimerRef.current) {
        clearTimeout(errorSkipTimerRef.current);
      }
    };
  }, []);

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
      // For now, this is a placeholder that logs which device was selected
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
