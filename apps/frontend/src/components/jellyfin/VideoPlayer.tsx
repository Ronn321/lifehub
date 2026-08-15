'use client';
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useVideoPlayer } from './hooks/useVideoPlayer';
import type { AudioTrack, SubtitleTrack } from './hooks/useVideoPlayer';
import { PlayerControls } from './PlayerControls';
import { GestureHandler } from './GestureHandler';
import { SubtitleSelector } from './SubtitleSelector';
import { AudioTrackSelector } from './AudioTrackSelector';

declare global {
  interface Window {
    cast?: any;
  }
}

interface MediaInfo {
  mediaSourceId: string;
  streams: {
    type: 'Video' | 'Audio' | 'Subtitle';
    index: number;
    codec: string | null;
    language: string | null;
    title: string | null;
    isDefault: boolean;
    isForced: boolean;
    width: number | null;
    height: number | null;
    bitrate: number | null;
    deliveryMethod: string | null;
    deliveryUrl: string | null;
  }[];
}

function getStreamBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return `http://${window.location.hostname}:3007`;
  }
  // SSR-sicher: im Docker-Container ist localhost der Frontend-Container selbst.
  return process.env.NEXT_PUBLIC_API_BASE
    ? process.env.NEXT_PUBLIC_API_BASE.replace(/\/api\/v1\/?$/, '')
    : 'http://localhost:3007';
}

interface VideoPlayerProps {
  streamUrl: string;
  mediaInfoUrl?: string;
  title?: string;
  onError?: (msg: string) => void;
  onEnded?: () => void;
  startPositionTicks?: number;
}

export function VideoPlayer({ streamUrl, mediaInfoUrl, title, onError, onEnded, startPositionTicks }: VideoPlayerProps) {
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [showAudioTracks, setShowAudioTracks] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [brightness, setBrightness] = useState(1);

  // Media info state
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const [activeAudioIndex, setActiveAudioIndex] = useState<number>(0);
  const [activeSubtitleIndex, setActiveSubtitleIndex] = useState<number>(-1);

  // Build stream URL with audioStreamIndex only (subtitles via <track> proxy)
  const currentStreamUrl = useMemo(() => {
    const url = new URL(streamUrl);
    if (activeAudioIndex > 0) url.searchParams.set('audioStreamIndex', String(activeAudioIndex));
    return url.toString();
  }, [streamUrl, activeAudioIndex]);

  // Parse subtitle base URL from streamUrl for <track> proxy
  const subtitleBaseUrl = useMemo(() => {
    if (!streamUrl) return null;
    const url = new URL(streamUrl);
    const token = url.searchParams.get('token');
    if (!token) return null;
    // streamUrl: .../servers/{serverId}/items/{externalId}/stream?...
    const match = url.pathname.match(/\/servers\/([^/]+)\/items\/([^/]+)\/stream/);
    if (!match) return null;
    const [, serverId, externalId] = match;
    return { base: `${getStreamBaseUrl()}/api/v1/jellyfin/servers/${serverId}/items/${externalId}/subtitles`, token };
  }, [streamUrl]);

  const { state, actions, videoRef, containerRef, hlsRef } = useVideoPlayer(currentStreamUrl, startPositionTicks);

  // Fetch media info
  useEffect(() => {
    if (!mediaInfoUrl) return;
    let cancelled = false;
    fetch(mediaInfoUrl)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!cancelled && data) setMediaInfo(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [mediaInfoUrl]);

  // Sync media info into player state
  useEffect(() => {
    if (!mediaInfo) return;
    const audioTracks: AudioTrack[] = mediaInfo.streams
      .filter(s => s.type === 'Audio')
      .map(s => ({
        index: s.index,
        language: s.language,
        title: s.title,
        isDefault: s.isDefault,
        codec: s.codec,
        active: s.index === activeAudioIndex,
      }));
    const subtitleTracks: SubtitleTrack[] = mediaInfo.streams
      .filter(s => s.type === 'Subtitle')
      .map(s => ({
        index: s.index,
        language: s.language,
        title: s.title,
        isDefault: s.isDefault,
        isForced: s.isForced,
        deliveryMethod: s.deliveryMethod,
        deliveryUrl: s.deliveryUrl,
        active: false,
      }));
    actions.setAudioTracks(audioTracks);
    actions.setSubtitleTracks(subtitleTracks);
  }, [mediaInfo, activeAudioIndex, actions]);

  // Subtitle switching via <track> elements (proxied through backend FFmpeg extraction)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Remove existing subtitle tracks
    const existing = Array.from(video.children).filter(c => c instanceof HTMLTrackElement);
    existing.forEach(t => t.remove());

    if (activeSubtitleIndex < 0 || !subtitleBaseUrl) return;

    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = `Subtitle ${activeSubtitleIndex}`;
    track.srclang = 'und';
    track.src = `${subtitleBaseUrl.base}/${activeSubtitleIndex}?token=${encodeURIComponent(subtitleBaseUrl.token)}`;
    track.default = false;

    // Attach load listener BEFORE appendChild to avoid race condition with cached responses
    track.addEventListener('load', () => {
      const tracks = video.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        const t = tracks[i];
        if (t) t.mode = i === tracks.length - 1 ? 'showing' : 'disabled';
      }
    });

    video.appendChild(track);

    // Also try activating immediately (some browsers fire load synchronously)
    const tracks = video.textTracks;
    for (let i = 0; i < tracks.length; i++) {
      const t = tracks[i];
      if (t) t.mode = i === tracks.length - 1 ? 'showing' : 'disabled';
    }
  }, [activeSubtitleIndex, subtitleBaseUrl, videoRef]);

  // Audio track switching — update URL (preserves position via useVideoPlayer)
  const handleAudioSelect = useCallback((index: number) => {
    setActiveAudioIndex(index);
    setShowAudioTracks(false);
  }, []);

  // Subtitle track switching
  const handleSubtitleSelect = useCallback((index: number) => {
    setActiveSubtitleIndex(index);
    setShowSubtitles(false);
  }, []);

  // Auto-hide controls
  const resetHideTimer = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setControlsVisible(true);
    if (state.playing) {
      hideTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
        setShowSubtitles(false);
        setShowAudioTracks(false);
      }, 3000);
    }
  }, [state.playing]);

  useEffect(() => {
    resetHideTimer();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [state.playing, resetHideTimer]);

  // Error listener
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onError) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) onError(detail);
    };
    video.addEventListener('playererror', handler);
    return () => video.removeEventListener('playererror', handler);
  }, [onError, videoRef]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          actions.togglePlay();
          resetHideTimer();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          actions.seekRelative(-10);
          resetHideTimer();
          break;
        case 'ArrowRight':
          e.preventDefault();
          actions.seekRelative(10);
          resetHideTimer();
          break;
        case 'ArrowUp':
          e.preventDefault();
          actions.setVolume(state.volume + 0.1);
          resetHideTimer();
          break;
        case 'ArrowDown':
          e.preventDefault();
          actions.setVolume(state.volume - 0.1);
          resetHideTimer();
          break;
        case 'f':
          e.preventDefault();
          containerRef.current && actions.toggleFullscreen(containerRef.current);
          break;
        case 'm':
          e.preventDefault();
          actions.toggleMute();
          resetHideTimer();
          break;
        case 'p':
          e.preventDefault();
          actions.togglePip();
          break;
        case 'c':
          e.preventDefault();
          setShowSubtitles(s => !s);
          setShowAudioTracks(false);
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [actions, state.volume, containerRef, resetHideTimer]);

  const handleGestureBrightness = useCallback((delta: number) => {
    setBrightness(b => {
      const next = Math.max(0.1, Math.min(3, b + delta));
      actions.setBrightness(next);
      return next;
    });
  }, [actions]);

  const handleGestureVolume = useCallback((delta: number) => {
    actions.setVolume(state.volume + delta);
  }, [actions, state.volume]);

  const handleGestureSeek = useCallback((delta: number) => {
    actions.seekRelative(delta);
  }, [actions]);

  const handleTap = useCallback(() => {
    setControlsVisible(v => !v);
    if (controlsVisible) {
      setShowSubtitles(false);
      setShowAudioTracks(false);
    }
  }, [controlsVisible]);

  // Chromecast
  const [castAvailable, setCastAvailable] = useState(false);
  const castSessionRef = useRef<any>(null);

  useEffect(() => {
    const checkCast = () => {
      if (window.cast && window.cast.framework) {
        setCastAvailable(true);
        return;
      }
      if (!document.querySelector('script[src*="cast_sender"]')) {
        const script = document.createElement('script');
        script.src = 'https://www.gstatic.com/cv2/js/cast_sender/v0.js';
        script.onload = () => {
          const interval = setInterval(() => {
            if (window.cast && window.cast.framework) {
              setCastAvailable(true);
              clearInterval(interval);
            }
          }, 500);
          setTimeout(() => clearInterval(interval), 5000);
        };
        script.onerror = () => {};
        document.head.appendChild(script);
      }
    };
    checkCast();
  }, []);

  const [airPlaySupported, setAirPlaySupported] = useState(false);
  useEffect(() => {
    const video = videoRef.current;
    if (video && 'webkitShowPlaybackTargetPicker' in video) {
      setAirPlaySupported(true);
    }
  }, [videoRef]);

  const handleCast = useCallback(async () => {
    try {
      if (!window.cast || !window.cast.framework) return;
      const castContext = window.cast.framework.CastContext.getInstance();
      if (castSessionRef.current) {
        castContext.endCurrentSession(true);
        castSessionRef.current = null;
        return;
      }
      const session = await castContext.requestSession();
      castSessionRef.current = session;
      const mediaInfo = new window.cast.framework.RemoteMediaInfo(currentStreamUrl);
      mediaInfo.contentType = 'application/vnd.apple.mpegurl';
      const mediaMetadata = new window.cast.framework.RemoteMediaMetadata();
      mediaMetadata.title = title ?? 'LifeHub Video';
      mediaInfo.metadata = mediaMetadata;
      const mediaSession = session.getCurrentMediaSession();
      if (mediaSession) {
        mediaSession.load(mediaInfo);
      } else {
        const remoteMedia = new window.cast.framework.RemoteMediaClient(session);
        remoteMedia.loadMedia(mediaInfo);
      }
    } catch (err) {
      console.error('[VideoPlayer] Cast error:', err);
    }
  }, [currentStreamUrl, title]);

  const handleAirPlay = useCallback(() => {
    const video = videoRef.current;
    if (video && 'webkitShowPlaybackTargetPicker' in video) {
      (video as any).webkitShowPlaybackTargetPicker();
    }
  }, [videoRef]);

  // Merge media info tracks with hls.js tracks (media info takes priority)
  const mergedAudioTracks = useMemo(() => {
    if (state.audioTracks.length > 0) return state.audioTracks;
    // Fallback: try to build from mediaInfo
    if (!mediaInfo) return [];
    return mediaInfo.streams
      .filter(s => s.type === 'Audio')
      .map(s => ({
        index: s.index,
        language: s.language,
        title: s.title,
        isDefault: s.isDefault,
        codec: s.codec,
        active: s.index === activeAudioIndex,
      }));
  }, [state.audioTracks, mediaInfo, activeAudioIndex]);

  const mergedSubtitleTracks = useMemo(() => {
    if (state.subtitleTracks.length > 0) return state.subtitleTracks;
    if (!mediaInfo) return [];
    return mediaInfo.streams
      .filter(s => s.type === 'Subtitle')
      .map(s => ({
        index: s.index,
        language: s.language,
        title: s.title,
        isDefault: s.isDefault,
        isForced: s.isForced,
        deliveryMethod: s.deliveryMethod,
        deliveryUrl: s.deliveryUrl,
        active: s.index === activeSubtitleIndex,
      }));
  }, [state.subtitleTracks, mediaInfo, activeSubtitleIndex]);

  const hasAudioTracks = mergedAudioTracks.length > 1;
  const hasSubtitleTracks = mergedSubtitleTracks.length > 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black select-none"
      style={{ aspectRatio: '16/9', maxHeight: '80vh' }}
      onMouseMove={resetHideTimer}
      onMouseLeave={() => state.playing && setControlsVisible(false)}
    >
      <GestureHandler
        enabled={state.isMobile}
        onDoubleTapSeek={actions.seekRelative}
        onSwipeVolume={handleGestureVolume}
        onSwipeBrightness={handleGestureBrightness}
        onSwipeSeek={handleGestureSeek}
        onTap={handleTap}
      >
        <video
          ref={videoRef}
          crossOrigin="anonymous"
          autoPlay
          playsInline
          className="w-full h-full"
          style={{ display: 'block', width: '100%', height: '100%' }}
          onEnded={onEnded}
        />
      </GestureHandler>

      {/* Loading spinner */}
      {state.loading && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <Loader2 className="h-8 w-8 animate-spin text-white/60" />
        </div>
      )}

      {/* Title */}
      {title && controlsVisible && (
        <div className="absolute top-0 left-0 right-0 z-30 px-4 py-3 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
          <p className="text-white text-sm font-medium truncate">{title}</p>
        </div>
      )}

      {/* Controls */}
      <PlayerControls
        state={{
          ...state,
          audioTracks: mergedAudioTracks,
          subtitleTracks: mergedSubtitleTracks,
        }}
        onTogglePlay={actions.togglePlay}
        onSeek={actions.seek}
        onSeekRelative={actions.seekRelative}
        onSetVolume={actions.setVolume}
        onToggleMute={actions.toggleMute}
        onSetPlaybackRate={actions.setPlaybackRate}
        onToggleFullscreen={actions.toggleFullscreen}
        onTogglePip={actions.togglePip}
        onOpenSubtitles={() => { setShowSubtitles(s => !s); setShowAudioTracks(false); }}
        onOpenAudioTracks={() => { setShowAudioTracks(s => !s); setShowSubtitles(false); }}
        onCast={castAvailable ? handleCast : undefined}
        onAirPlay={airPlaySupported ? handleAirPlay : undefined}
        containerRef={containerRef}
        visible={controlsVisible}
      />

      {/* Subtitle selector */}
      {showSubtitles && (
        <SubtitleSelector
          tracks={mergedSubtitleTracks}
          activeIndex={activeSubtitleIndex}
          onSelect={handleSubtitleSelect}
          onClose={() => setShowSubtitles(false)}
        />
      )}

      {/* Audio track selector */}
      {showAudioTracks && (
        <AudioTrackSelector
          tracks={mergedAudioTracks}
          activeIndex={activeAudioIndex}
          onSelect={handleAudioSelect}
          onClose={() => setShowAudioTracks(false)}
        />
      )}
    </div>
  );
}
