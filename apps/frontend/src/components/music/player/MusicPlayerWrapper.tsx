'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useJellyfinServer, getStreamUrl } from '@/lib/music-api';
import { useMusicPlayerStore } from '@/lib/music-player-store';
import { MusicPlayerBar } from '@/components/music/player/MusicPlayerBar';

/* ------------------------------------------------------------------ */
/*  Singleton audio ref — survives App Router page transitions          */
/*  Audio element is created lazily inside useEffect (browser-only).    */
/* ------------------------------------------------------------------ */

const audioRef: { current: HTMLAudioElement | null } = { current: null };
let audioInitialized = false;

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

  /* ── Store actions ── */
  const setStatus = useMusicPlayerStore((s) => s.setStatus);
  const setPosition = useMusicPlayerStore((s) => s.setPosition);
  const setDuration = useMusicPlayerStore((s) => s.setDuration);
  const next = useMusicPlayerStore((s) => s.next);

  /* ── Local UI state for the player bar ── */
  const [isLiked, setIsLiked] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  /* ════════════════════════════════════════════════════════════════ */
  /*  1. Source sync — update audio src when currentTrack changes   */
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
      audio.load();
    }

    // If the store says we should be playing, start playback.
    // This covers both initial play and next/prev track changes.
    if (status === 'playing') {
      audio.play().catch((err) => {
        console.warn('Audio playback failed:', err);
        setStatus('error');
      });
    }
  }, [currentTrack?.id]);

  /* ════════════════════════════════════════════════════════════════ */
  /*  2. Play / pause sync — react to store status changes          */
  /* ════════════════════════════════════════════════════════════════ */

  useEffect(() => {
    if (!currentTrack) return;
    if (!audio.src && currentTrack) return; // src hasn't been set yet

    if (status === 'playing' && audio.paused) {
      audio.play().catch(() => {});
    } else if (status === 'paused' && !audio.paused) {
      audio.pause();
    } else if (status === 'idle') {
      audio.pause();
      audio.removeAttribute('src');
    }
  }, [status]);

  /* ════════════════════════════════════════════════════════════════ */
  /*  3. Volume / mute sync                                          */
  /* ════════════════════════════════════════════════════════════════ */

  useEffect(() => {
    audio.volume = volume;
    audio.muted = isMuted;
  }, [volume, isMuted]);

  /* ════════════════════════════════════════════════════════════════ */
  /*  4. Audio event listeners                                       */
  /*     timeupdate → store position                                 */
  /*     durationchange → store duration                              */
  /*     ended → auto-next                                           */
  /*     error → store error status                                  */
  /* ════════════════════════════════════════════════════════════════ */

  useEffect(() => {
    const handleTimeUpdate = () => setPosition(audio.currentTime);
    const handleDurationChange = () => {
      if (isFinite(audio.duration)) setDuration(audio.duration);
    };
    const handleEnded = () => next();
    const handleError = () => {
      console.error('Audio playback error:', audio.error);
      setStatus('error');
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
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
    setIsExpanded((prev) => !prev);
  }, []);

  const handleQueueToggle = useCallback(() => {
    // TODO: Open queue/now-playing panel
  }, []);

  /* ════════════════════════════════════════════════════════════════ */
  /*  6. Render                                                      */
  /* ════════════════════════════════════════════════════════════════ */

  return (
    <MusicPlayerBar
      audioRef={audioRef as React.RefObject<HTMLAudioElement | null>}
      onExpandToggle={handleExpandToggle}
      isExpanded={isExpanded}
      onLikeToggle={handleLikeToggle}
      isLiked={isLiked}
      onQueueToggle={handleQueueToggle}
      queueCount={queue.length}
    />
  );
}
