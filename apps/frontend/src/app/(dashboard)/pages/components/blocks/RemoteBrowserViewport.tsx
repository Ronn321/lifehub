'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { WifiOff } from 'lucide-react';

export const BROWSER_VIEWPORT = { width: 1280, height: 720 } as const;
// devicePixelRatio für den Remote-Render: HiDPI-Clients bekommen die
// doppelte Pixeldichte, normale Displays 1.5× (Supersampling = schärfer).
const DEFAULT_REMOTE_DPR = 1.5;

export interface RemoteBrowserTab {
  id: string;
  url: string;
  title: string;
  isActive: boolean;
}

export interface RemoteBrowserState {
  sessionId: string;
  activeTabId: string | null;
  tabs: RemoteBrowserTab[];
  status: 'running' | 'stopped';
  canControl?: boolean;
  controlHeld?: boolean;
  viewport?: { width: number; height: number };
}

export interface RemoteBrowserViewportHandle {
  sendInput: (payload: Record<string, unknown>) => void;
}

interface RemoteBrowserViewportProps {
  streamPath: string | null;
  token: string | null;
  onState: (state: RemoteBrowserState) => void;
  onStatus: (status: 'connecting' | 'connected' | 'reconnecting' | 'error') => void;
}

const RETRY_DELAY_MS = 1500;

function getRendererWebSocketUrl(streamPath: string): string {
  const configured = process.env.NEXT_PUBLIC_BROWSER_RENDERER_URL;
  const base = configured || `${window.location.protocol}//${window.location.hostname}:3111`;
  const wsBase = base.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
  return `${wsBase.replace(/\/$/, '')}${streamPath}`;
}

export const RemoteBrowserViewport = forwardRef<
  RemoteBrowserViewportHandle,
  RemoteBrowserViewportProps
>(function RemoteBrowserViewport({ streamPath, token, onState, onStatus }, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputChannelRef = useRef<RTCDataChannel | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Aktiver Remote-Viewport (vom Server-State); Basis für die Koordinaten-
  // Transformation. Kann durch resize-Nachrichten von BROWSER_VIEWPORT abweichen.
  const remoteViewportRef = useRef<{ width: number; height: number }>(BROWSER_VIEWPORT);
  const [frameDead, setFrameDead] = useState(false);
  // Autoplay-Policy: unmuted + autoplay wird vom Browser blockiert → kein
  // Video, Watchdog eskaliert endlos. Default muted starten, beim ersten
  // Pointerdown entmuten (User-Geste erlaubt Audio).
  const [muted, setMuted] = useState(true);

  const sendInput = (payload: Record<string, unknown>) => {
    const data = JSON.stringify(payload);
    const channel = inputChannelRef.current;
    if (channel?.readyState === 'open') {
      channel.send(data);
      return;
    }
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'input', payload }));
    }
  };

  useImperativeHandle(ref, () => ({ sendInput }), []);

  useEffect(() => {
    if (!streamPath || !token) return undefined;

    let disposed = false;
    let peer: RTCPeerConnection | null = null;
    let remoteDescriptionSet = false;
    // Zählt die Verbindungsversuche innerhalb dieses Effect-Laufs (startet bei
    // 0, auch beim initialen connect()). Wird in socket.onclose erhöht.
    let connectAttempts = 0;
    // Handshake-Timeout (12s) muss auf Effect-Ebene leben, damit cleanup() ihn
    // aufräumen kann; gesetzt wird er in connect().
    let handshakeTimeout: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
      if (handshakeTimeout) clearTimeout(handshakeTimeout);
      handshakeTimeout = null;
      // Release über Channel ODER Socket schicken (sendInput-Logik): sonst
      // bleiben bei Disconnect über WS gehaltene Tasten hängen.
      try {
        const release = JSON.stringify({ type: 'release' });
        const channel = inputChannelRef.current;
        if (channel?.readyState === 'open') channel.send(release);
        else if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ type: 'input', payload: { type: 'release' } }));
        }
      } catch { /* ignore */ }
      inputChannelRef.current?.close();
      inputChannelRef.current = null;
      socketRef.current?.close();
      socketRef.current = null;
      peer?.close();
      peer = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    const connect = () => {
      if (disposed) return;
      setFrameDead(false);
      onStatus('connecting');
      // ICE-Kandidaten-Puffer je Verbindungsversuch: geteilt über Reconnects
      // würden alte Kandidaten in neue PeerConnections fließen.
      const pendingCandidates: RTCIceCandidateInit[] = [];
      // Token als WebSocket-Subprotocol ("bearer-<token>") statt Query-Param:
      // landet nicht in Access-Logs/Proxies. Der Renderer prüft das Subprotocol
      // beim Upgrade.
      const socket = new WebSocket(getRendererWebSocketUrl(streamPath), [`bearer-${token}`]);
      socketRef.current = socket;
      peer = new RTCPeerConnection({ iceServers: [] });
      // Handshake-Timeout: Bleibt der WebRTC-Handshake (Offer/Answer) aus,
      // hängt der Socket sonst endlos — nach 12s abbrechen; onclose übernimmt
      // die Reconnect-Eskalation.
      handshakeTimeout = setTimeout(() => {
        if (peer?.connectionState !== 'connected' && socketRef.current?.readyState === WebSocket.OPEN) {
          console.error('[RemoteBrowserViewport] Handshake-Timeout — Abbruch');
          socketRef.current.close();
        }
      }, 12_000);
      // Video/Audio im OFFER anbieten (recvonly): Nach RFC 3264 darf ein
      // Answer keine m-lines enthalten, die nicht im Offer waren. Ohne
      // addTransceiver bietet der Client nur den DataChannel an und der
      // Server kann seine Video-Tracks nicht ins Answer übernehmen →
      // Verbindung steht, aber es kommt kein Stream an.
      peer.addTransceiver('video', { direction: 'recvonly' });
      peer.addTransceiver('audio', { direction: 'recvonly' });
      const inputChannel = peer.createDataChannel('input');
      inputChannelRef.current = inputChannel;
      peer.ontrack = (event) => {
        const currentStream = videoRef.current?.srcObject instanceof MediaStream
          ? videoRef.current.srcObject
          : new MediaStream();
        if (!currentStream.getTracks().some((track) => track.id === event.track.id)) currentStream.addTrack(event.track);
        if (videoRef.current) {
          const stream = currentStream;
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
        }
      };
      peer.onicecandidate = (event) => {
        if (event.candidate && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
        }
      };
      peer.onconnectionstatechange = () => {
        if (peer?.connectionState === 'connected') onStatus('connected');
        if (peer?.connectionState === 'failed') socket.close();
      };
      socket.onopen = async () => {
        try {
          const offer = await peer?.createOffer();
          if (!offer || !peer) return;
          await peer.setLocalDescription(offer);
          socket.send(JSON.stringify({ type: 'offer', offer: peer.localDescription }));
        } catch {
          socket.close();
        }
      };
      socket.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data as string) as {
            type: string;
            answer?: RTCSessionDescriptionInit;
            candidate?: RTCIceCandidateInit;
            state?: RemoteBrowserState;
          };
          if (message.type === 'answer' && message.answer && peer) {
            await peer.setRemoteDescription(message.answer);
            remoteDescriptionSet = true;
            for (const candidate of pendingCandidates.splice(0)) await peer.addIceCandidate(candidate);
          } else if (message.type === 'candidate' && message.candidate && peer) {
            if (remoteDescriptionSet) await peer.addIceCandidate(message.candidate);
            else pendingCandidates.push(message.candidate);
          } else if (message.type === 'state' && message.state) {
            if (message.state.viewport) remoteViewportRef.current = message.state.viewport;
            onState(message.state);
          }
        } catch {
          onStatus('error');
        }
      };
      socket.onclose = () => {
        if (disposed) return;
        if (handshakeTimeout) clearTimeout(handshakeTimeout);
        handshakeTimeout = null;
        connectAttempts += 1;
        inputChannelRef.current = null;
        peer?.close();
        peer = null;
        // Eskalation: Nach 5 Fehlversuchen KEIN weiterer Reconnect mit demselben
        // Token — Status 'error' → BrowserBlock holt einen frischen Stream-Token.
        if (connectAttempts >= 5) {
          onStatus('error');
          return;
        }
        onStatus('reconnecting');
        reconnectTimerRef.current = setTimeout(connect, RETRY_DELAY_MS * connectAttempts);
      };
      // Kein onerror→'error': onclose übernimmt die Backoff-Eskalation; ein
      // sofortiges 'error' würde fälschlich einen Token-Refresh auslösen.
    };

    connect();
    return () => {
      disposed = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamPath, token]);

  /* Koordinaten-Mapping: Mausposition im Overlay → Remote-Viewport-Pixel.
   * Letterbox-bewusst: Bei object-contain wird das Video innerhalb der
   * Element-Grenzen zentriert — die tatsächliche Video-Fläche ergibt sich aus
   * videoWidth/videoHeight (Stream-Auflösung) relativ zur Element-Bounds.
   */
  const mapPoint = (clientX: number, clientY: number) => {
    const viewport = remoteViewportRef.current;
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return null;
    const bounds = video.getBoundingClientRect();
    const scale = Math.min(bounds.width / video.videoWidth, bounds.height / video.videoHeight);
    const offsetX = bounds.left + (bounds.width - video.videoWidth * scale) / 2;
    const offsetY = bounds.top + (bounds.height - video.videoHeight * scale) / 2;
    return {
      x: (clientX - offsetX) / scale,
      y: (clientY - offsetY) / scale,
    };
  };

  // Fallback-Mapping vor dem ersten Videoframe: Overlay-Grenzen auf den
  // aktuellen Remote-Viewport mappen (gleiche Annahme wie beim Move-Fallback).
  const mapPointOrFallback = (clientX: number, clientY: number, bounds: DOMRect) => {
    const mapped = mapPoint(clientX, clientY);
    if (mapped) return mapped;
    return {
      x: ((clientX - bounds.left) / bounds.width) * remoteViewportRef.current.width,
      y: ((clientY - bounds.top) / bounds.height) * remoteViewportRef.current.height,
    };
  };

  const overlayRef = useRef<HTMLDivElement>(null);
  // Wheel-Akkumulation: Rad-Impulse werden gesammelt und alle 16ms gesendet
  // (ein DataChannel-Frame pro Browser-Frame, ohne Deltas zu verlieren).
  // Trailing-Flush: Bleiben Events aus, werden Rest-Deltas nach 20ms
  // nachgesendet — sonst geht der Fenster-Rest verloren.
  const wheelPendingRef = useRef({ deltaX: 0, deltaY: 0, lastSentAt: 0 });
  const wheelFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushWheel = () => {
    const pending = wheelPendingRef.current;
    if (!pending.deltaX && !pending.deltaY) return;
    sendInput({ type: 'wheel', deltaX: pending.deltaX, deltaY: pending.deltaY });
    pending.deltaX = 0;
    pending.deltaY = 0;
  };

  // Frame-Watchdog: Wenn das Video eingefroren ist (currentTime bleibt stehen,
  // obwohl die Verbindung offen ist), aktiv neu verbinden. 4s: kurze schwarze
  // Fläche wird sofort durch ein sichtbares Overlay ersetzt.
  useEffect(() => {
    if (!streamPath || !token) return undefined;
    let lastTime = -1;
    let lastChangeAt = Date.now();
    const watchdog = setInterval(() => {
      const v = videoRef.current;
      if (!v) return;
      const t = v.currentTime;
      if (t !== lastTime) {
        lastTime = t;
        lastChangeAt = Date.now();
        setFrameDead(false); // Frame kommt an → Overlay schließen
      } else if (Date.now() - lastChangeAt > 4_000 && socketRef.current?.readyState === WebSocket.OPEN) {
        console.error('[RemoteBrowserViewport] Kein Frame — sichtbarer Reconnect');
        setFrameDead(true);
        socketRef.current?.close(); // löst die bestehende Reconnect-Eskalation aus
        lastChangeAt = Date.now();
      }
    }, 1000);
    return () => clearInterval(watchdog);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamPath, token]);

  // Wheel-Scroll-Isolation: Reacts onWheel ist passiv (preventDefault greift
  // nicht) → die LifeHub-Seite scrollte mit. Nativer non-passiver Listener:
  // stoppt die Propagation und leitet das Rad nur an den Remote-Browser weiter.
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return undefined;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const pending = wheelPendingRef.current;
      pending.deltaX += event.deltaX;
      pending.deltaY += event.deltaY;
      const now = performance.now();
      if (now - pending.lastSentAt < 16) {
        // Trailing-Flush: stellt sicher, dass die akkumulierten Deltas auch
        // ohne weiteres Wheel-Event noch gesendet werden.
        if (!wheelFlushTimerRef.current) {
          wheelFlushTimerRef.current = setTimeout(() => {
            wheelFlushTimerRef.current = null;
            wheelPendingRef.current.lastSentAt = performance.now();
            flushWheel();
          }, 20);
        }
        return;
      }
      pending.lastSentAt = now;
      if (wheelFlushTimerRef.current) { clearTimeout(wheelFlushTimerRef.current); wheelFlushTimerRef.current = null; }
      sendInput({ type: 'wheel', deltaX: pending.deltaX, deltaY: pending.deltaY });
      pending.deltaX = 0;
      pending.deltaY = 0;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      if (wheelFlushTimerRef.current) { clearTimeout(wheelFlushTimerRef.current); wheelFlushTimerRef.current = null; }
      flushWheel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamPath, token]);

  /* Dynamisches Resize: Der Overlay folgt der Layout-Größe (auch Layout-Modus
   * medium/fullscreen). Debounced überträgt der ResizeObserver die neue
   * Container-Größe — Chromium rendert dann exakt in dieser Auflösung (× DPR),
   * das Video füllt den Container 1:1 ohne Verzerrung.
   */
  useEffect(() => {
    const el = overlayRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    let lastSent: { width: number; height: number } | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      if (width < 480 || height < 360) return; // zu klein sinnvoll zu rendern
      if (lastSent && Math.abs(lastSent.width - width) < 8 && Math.abs(lastSent.height - height) < 8) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        lastSent = { width, height };
        const dpr = Math.min(2, Math.max(DEFAULT_REMOTE_DPR, window.devicePixelRatio || 1));
        sendInput({ type: 'resize', width, height, dpr });
      }, 200);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamPath, token]);

  const mapButton = (button: number) => (button === 2 ? 'right' : button === 1 ? 'middle' : 'left');

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-950">
      {/* Fehlerbehandlung am Video-Element: stalled feuert bei Datenmangel,
          error bei Dekodier-/Netzwerkfehlern — beide führen über onclose zur
          Reconnect-Eskalation. object-contain statt object-fill: Das Video
          behält das Seitenverhältnis des Remote-Viewports (der Server rendert
          exakt in der Container-Größe), keine Verzerrung mehr. */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-contain select-none"
        autoPlay
        playsInline
        muted={muted}
        aria-label="Remote Chromium Browser"
        onStalled={() => socketRef.current?.close()}
        onError={() => socketRef.current?.close()}
      />
      <div
        ref={overlayRef}
        className="absolute inset-0 cursor-default outline-none"
        role="application"
        tabIndex={0}
        onPointerDown={(event) => {
          void videoRef.current?.play().catch(() => undefined);
          // Erste User-Geste: Autoplay-Policy erlaubt jetzt Audio → entmuten.
          if (videoRef.current) videoRef.current.muted = false;
          if (muted) setMuted(false);
          event.currentTarget.focus();
          // Vor dem ersten Frame greift das Bounds-Fallback (kein Drop).
          const point = mapPointOrFallback(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
          // sendInput VOR setPointerCapture: setPointerCapture kann werfen
          // (NotFoundError, wenn der Pointer nicht registriert ist — z.B. beim
          // ersten Klick). Vorher ging der Klick dadurch verloren.
          sendInput({ type: 'mouse', action: 'down', ...point, button: mapButton(event.button) });
          try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* non-fatal */ }
        }}
        onPointerMove={(event) => {
          // LÜCKENLOS: Jedes pointermove wird sofort übertragen — keine
          // Zeit-Drossel, kein 3px-Gate, kein Stale-Drop mehr. Coalesced
          // Events liefern zusätzlich alle Zwischenpunkte, die der Browser
          // pro Frame zusammengefasst hat (echte Trajektorie für Captchas).
          const bounds = event.currentTarget.getBoundingClientRect();
          const native = event.nativeEvent as PointerEvent & { getCoalescedEvents?: () => PointerEvent[] };
          const coalesced = typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [];
          const events = coalesced.length > 0 ? coalesced : [native];
          for (const point of events) {
            const video = videoRef.current;
            if (video?.videoWidth && video?.videoHeight) {
              const mapped = mapPoint(point.clientX, point.clientY);
              if (mapped) sendInput({ type: 'mouse', action: 'move', ...mapped });
            } else {
              // Fallback vor dem ersten Frame: Overlay-Grenzen auf den
              // aktuellen Remote-Viewport mappen (gleiche Annahme wie früher).
              sendInput({
                type: 'mouse',
                action: 'move',
                x: ((point.clientX - bounds.left) / bounds.width) * remoteViewportRef.current.width,
                y: ((point.clientY - bounds.top) / bounds.height) * remoteViewportRef.current.height,
              });
            }
          }
        }}
        onPointerUp={(event) => {
          // Vor dem ersten Frame greift das Bounds-Fallback (kein Drop).
          const point = mapPointOrFallback(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
          sendInput({ type: 'mouse', action: 'up', ...point, button: mapButton(event.button) });
          try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* non-fatal */ }
        }}
        onPointerCancel={() => sendInput({ type: 'release' })}
        onLostPointerCapture={() => sendInput({ type: 'release' })}
        onBlur={() => sendInput({ type: 'release' })}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          event.preventDefault();
          sendInput({ type: 'keyboard', action: 'down', key: event.key });
        }}
        onKeyUp={(event) => {
          event.preventDefault();
          sendInput({ type: 'keyboard', action: 'up', key: event.key });
        }}
      />
      {frameDead && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-zinc-950/85">
          <WifiOff className="h-8 w-8 text-amber-500" />
          <p className="text-sm text-zinc-300">Kein Videosignal — Verbindung wird wiederhergestellt…</p>
          <button
            onClick={() => { setFrameDead(false); socketRef.current?.close(); }}
            className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700"
          >
            Neu verbinden
          </button>
        </div>
      )}
    </div>
  );
});
