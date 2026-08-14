'use client';
import { useState, useEffect, useRef, useCallback, type RefObject } from 'react';
import type Hls from 'hls.js';

export interface SubtitleTrack {
  index: number;
  language: string | null;
  title: string | null;
  isDefault: boolean;
  isForced: boolean;
  deliveryMethod: string | null;
  deliveryUrl: string | null;
  active: boolean;
}

export interface AudioTrack {
  index: number;
  language: string | null;
  title: string | null;
  isDefault: boolean;
  codec: string | null;
  active: boolean;
}

export interface PlayerState {
  playing: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  muted: boolean;
  ready: boolean;
  loading: boolean;
  fullscreen: boolean;
  pip: boolean;
  playbackRate: number;
  subtitleTracks: SubtitleTrack[];
  audioTracks: AudioTrack[];
  activeSubtitle: number;
  activeAudio: number;
  isMobile: boolean;
}

export interface PlayerActions {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  seekRelative: (delta: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  setPlaybackRate: (rate: number) => void;
  enterFullscreen: (el: HTMLElement) => Promise<void>;
  exitFullscreen: () => Promise<void>;
  toggleFullscreen: (el: HTMLElement) => Promise<void>;
  togglePip: () => Promise<void>;
  setActiveSubtitle: (index: number) => void;
  setActiveAudio: (index: number) => void;
  setBrightness: (value: number) => void;
  setAudioTracks: (tracks: AudioTrack[]) => void;
  setSubtitleTracks: (tracks: SubtitleTrack[]) => void;
}

export interface UseVideoPlayerReturn {
  state: PlayerState;
  actions: PlayerActions;
  videoRef: RefObject<HTMLVideoElement>;
  containerRef: RefObject<HTMLDivElement>;
  hlsRef: RefObject<Hls | null>;
}

function detectMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768 || 'ontouchstart' in window;
}

export function useVideoPlayer(streamUrl: string, startPositionTicks?: number): UseVideoPlayerReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const destroyRef = useRef(false);
  // Preserve position across stream URL changes (audio/subtitle switch)
  const resumeRef = useRef<{ time: number; wasPlaying: boolean } | null>(null);
  // Ensure the initial resume seek only runs once
  const seekedRef = useRef(false);

  const [state, setState] = useState<PlayerState>({
    playing: false,
    currentTime: 0,
    duration: 0,
    buffered: 0,
    volume: 1,
    muted: false,
    ready: false,
    loading: true,
    fullscreen: false,
    pip: false,
    playbackRate: 1,
    subtitleTracks: [],
    audioTracks: [],
    activeSubtitle: -1,
    activeAudio: 0,
    isMobile: detectMobile(),
  });

  // Setup HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    destroyRef.current = false;
    let hls: Hls | null = null;

    async function setup() {
      try {
        const { default: HlsLib } = await import('hls.js');
        if (destroyRef.current) return;

        if (HlsLib.isSupported()) {
          hls = new HlsLib({
            xhrSetup: (xhr: XMLHttpRequest) => { xhr.withCredentials = false; },
          });
          hlsRef.current = hls;

          hls.loadSource(streamUrl);
          hls.attachMedia(video!);

          hls.on(HlsLib.Events.MANIFEST_PARSED, () => {
            if (destroyRef.current) return;
            setState(s => ({ ...s, ready: true, loading: false }));
            // Seek to the resume position once the stream is ready
            if (startPositionTicks && startPositionTicks > 0 && !seekedRef.current && video) {
              video.currentTime = startPositionTicks / 10_000_000;
              seekedRef.current = true;
            }
            // Restore position after audio/subtitle switch
            const resume = resumeRef.current;
            if (resume && video) {
              video.currentTime = resume.time;
              if (resume.wasPlaying) video.play().catch(() => {});
              resumeRef.current = null;
            } else {
              video!.play().catch(() => {});
            }
          });

          hls.on(HlsLib.Events.SUBTITLE_TRACKS_UPDATED, (_: any, data: any) => {
            if (destroyRef.current) return;
            const subtitleTracks: SubtitleTrack[] = data.subtitleTracks.map((t: any, i: number) => ({
              index: i,
              language: t.lang ?? null,
              title: t.name ?? t.lang ?? null,
              isDefault: t.default ?? false,
              isForced: t.forced ?? false,
              deliveryMethod: 'Hls',
              deliveryUrl: t.url ?? null,
              active: i === hls!.subtitleTrack,
            }));
            setState(s => ({ ...s, subtitleTracks, activeSubtitle: hls!.subtitleTrack }));
          });

          hls.on(HlsLib.Events.SUBTITLE_TRACK_SWITCH, (_: any, data: any) => {
            if (destroyRef.current) return;
            setState(s => ({
              ...s,
              activeSubtitle: data.id,
              subtitleTracks: s.subtitleTracks.map((t, i) => ({ ...t, active: i === data.id })),
            }));
          });

          hls.on(HlsLib.Events.ERROR, (_: any, data: any) => {
            console.error('[useVideoPlayer] HLS error:', data.type, data.details);
            if (data.fatal && !destroyRef.current) {
              video!.dispatchEvent(new CustomEvent('playererror', { detail: 'Video konnte nicht geladen werden.' }));
            }
          });
        } else if (video!.canPlayType('application/vnd.apple.mpegurl')) {
          video!.src = streamUrl;
          video!.addEventListener('loadedmetadata', () => {
            if (!destroyRef.current) {
              // Seek to the resume position once metadata is loaded (native HLS)
              if (startPositionTicks && startPositionTicks > 0 && !seekedRef.current) {
                video!.currentTime = startPositionTicks / 10_000_000;
                seekedRef.current = true;
              }
              const resume = resumeRef.current;
              if (resume && video) {
                video.currentTime = resume.time;
                if (resume.wasPlaying) video.play().catch(() => {});
                resumeRef.current = null;
              } else {
                video!.play().catch(() => {});
              }
              setState(s => ({ ...s, ready: true, loading: false }));
            }
          });
        } else {
          if (!destroyRef.current) {
            video!.dispatchEvent(new CustomEvent('playererror', { detail: 'HLS wird von diesem Browser nicht unterstuetzt.' }));
          }
        }
      } catch (err) {
        console.error('[useVideoPlayer] setup error:', err);
        if (!destroyRef.current) {
          video!.dispatchEvent(new CustomEvent('playererror', { detail: 'Player konnte nicht initialisiert werden.' }));
        }
      }
    }

    setup();

    return () => {
      // Save position BEFORE hls.destroy() resets the video element
      const v = videoRef.current;
      if (v && v.currentTime > 0) {
        resumeRef.current = { time: v.currentTime, wasPlaying: !v.paused };
      }
      destroyRef.current = true;
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setState(s => ({ ...s, playing: true }));
    const onPause = () => setState(s => ({ ...s, playing: false }));
    const onTimeUpdate = () => {
      const buffered = video.buffered.length > 0
        ? video.buffered.end(video.buffered.length - 1)
        : 0;
      setState(s => ({
        ...s,
        currentTime: video.currentTime,
        duration: video.duration || 0,
        buffered,
      }));
    };
    const onVolumeChange = () => {
      setState(s => ({
        ...s,
        volume: video.volume,
        muted: video.muted,
      }));
    };
    const onRateChange = () => {
      setState(s => ({ ...s, playbackRate: video.playbackRate }));
    };
    const onEnterPiP = () => setState(s => ({ ...s, pip: true }));
    const onLeavePiP = () => setState(s => ({ ...s, pip: false }));

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('volumechange', onVolumeChange);
    video.addEventListener('ratechange', onRateChange);
    video.addEventListener('enterpictureinpicture', onEnterPiP);
    video.addEventListener('leavepictureinpicture', onLeavePiP);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('volumechange', onVolumeChange);
      video.removeEventListener('ratechange', onRateChange);
      video.removeEventListener('enterpictureinpicture', onEnterPiP);
      video.removeEventListener('leavepictureinpicture', onLeavePiP);
    };
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const onFsChange = () => {
      setState(s => ({ ...s, fullscreen: !!document.fullscreenElement }));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Resize listener for mobile detection
  useEffect(() => {
    const onResize = () => setState(s => ({ ...s, isMobile: detectMobile() }));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Actions
  const play = useCallback(() => videoRef.current?.play().catch(() => {}), []);
  const pause = useCallback(() => videoRef.current?.pause(), []);
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play().catch(() => {}) : v.pause();
  }, []);

  const seek = useCallback((time: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(time, v.duration || 0));
  }, []);

  const seekRelative = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.currentTime + delta, v.duration || 0));
  }, []);

  const setVolume = useCallback((vol: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = Math.max(0, Math.min(1, vol));
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = rate;
  }, []);

  const enterFullscreen = useCallback(async (el: HTMLElement) => {
    try {
      if (el.requestFullscreen) await el.requestFullscreen();
      else if ((el as any).webkitRequestFullscreen) await (el as any).webkitRequestFullscreen();
    } catch {}
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if ((document as any).webkitExitFullscreen) await (document as any).webkitExitFullscreen();
    } catch {}
  }, []);

  const toggleFullscreen = useCallback(async (el: HTMLElement) => {
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
      await exitFullscreen();
    } else {
      await enterFullscreen(el);
    }
  }, [enterFullscreen, exitFullscreen]);

  const togglePip = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await v.requestPictureInPicture();
      }
    } catch {}
  }, []);

  const setActiveSubtitle = useCallback((index: number) => {
    const hls = hlsRef.current;
    if (hls) {
      hls.subtitleTrack = index;
      hls.subtitleDisplay = index >= 0;
    } else {
      const v = videoRef.current;
      if (v) {
        const tracks = v.textTracks;
        for (let i = 0; i < tracks.length; i++) {
          const track = tracks[i];
          if (track) track.mode = i === index ? 'showing' : 'disabled';
        }
      }
    }
    setState(s => ({
      ...s,
      activeSubtitle: index,
      subtitleTracks: s.subtitleTracks.map((t, i) => ({ ...t, active: i === index })),
    }));
  }, []);

  const setActiveAudio = useCallback((index: number) => {
    const hls = hlsRef.current;
    if (hls) {
      hls.audioTrack = index;
    }
    setState(s => ({
      ...s,
      activeAudio: index,
      audioTracks: s.audioTracks.map((t, i) => ({ ...t, active: i === index })),
    }));
  }, []);

  const setBrightness = useCallback((value: number) => {
    const v = videoRef.current;
    if (!v) return;
    const clamped = Math.max(0.1, Math.min(3, value));
    v.style.filter = `brightness(${clamped})`;
  }, []);

  const setAudioTracks = useCallback((tracks: AudioTrack[]) => {
    setState(s => ({ ...s, audioTracks: tracks }));
  }, []);

  const setSubtitleTracks = useCallback((tracks: SubtitleTrack[]) => {
    setState(s => ({ ...s, subtitleTracks: tracks }));
  }, []);

  return {
    state,
    actions: {
      play, pause, togglePlay, seek, seekRelative,
      setVolume, toggleMute, setPlaybackRate,
      enterFullscreen, exitFullscreen, toggleFullscreen,
      togglePip, setActiveSubtitle, setActiveAudio, setBrightness,
      setAudioTracks, setSubtitleTracks,
    },
    videoRef,
    containerRef,
    hlsRef,
  };
}
