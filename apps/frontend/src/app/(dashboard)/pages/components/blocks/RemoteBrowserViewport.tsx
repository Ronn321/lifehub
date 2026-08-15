'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';

export const BROWSER_VIEWPORT = { width: 1280, height: 720 } as const;

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

function getRendererWebSocketUrl(streamPath: string, token: string): string {
  const configured = process.env.NEXT_PUBLIC_BROWSER_RENDERER_URL;
  const base = configured || `${window.location.protocol}//${window.location.hostname}:3111`;
  const wsBase = base.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
  return `${wsBase.replace(/\/$/, '')}${streamPath}?token=${encodeURIComponent(token)}`;
}

export const RemoteBrowserViewport = forwardRef<
  RemoteBrowserViewportHandle,
  RemoteBrowserViewportProps
>(function RemoteBrowserViewport({ streamPath, token, onState, onStatus }, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputChannelRef = useRef<RTCDataChannel | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const pendingCandidates: RTCIceCandidateInit[] = [];
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
      try { inputChannelRef.current?.send(JSON.stringify({ type: 'release' })); } catch { /* ignore */ }
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
      onStatus('connecting');
      const socket = new WebSocket(getRendererWebSocketUrl(streamPath, token));
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
      socket.onerror = () => onStatus('error');
    };

    connect();
    return () => {
      disposed = true;
      cleanup();
    };
  }, [onState, onStatus, streamPath, token]);

  const getPoint = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * BROWSER_VIEWPORT.width,
      y: ((event.clientY - bounds.top) / bounds.height) * BROWSER_VIEWPORT.height,
    };
  };

  const overlayRef = useRef<HTMLDivElement>(null);
  // Hover-Drosselung: letzter Send-Zeitpunkt und letzter gesendeter Punkt, um
  // Bewegungen nur alle 33ms und bei >3px Abstand zu übertragen (siehe onPointerMove).
  const lastMoveSentAtRef = useRef(0);
  const lastMovePointRef = useRef<{ x: number; y: number } | null>(null);

  // Frame-Watchdog: Wenn das Video eingefroren ist (currentTime bleibt stehen,
  // obwohl die Verbindung offen ist), aktiv neu verbinden. 10s statt 5s: Unter
  // Last (mehrere Sessions) dauert ein Frame gelegentlich länger als 5s — der
  // Server erkennt Stalls bereits nach 10s und startet hart neu. Dieser Watchdog
  // ist nur der Fallback und darf nicht zuerst feuern.
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
      } else if (Date.now() - lastChangeAt > 10_000 && socketRef.current?.readyState === WebSocket.OPEN) {
        console.error('[RemoteBrowserViewport] Stream eingefroren — Reconnect');
        socketRef.current?.close();
        lastChangeAt = Date.now();
      }
    }, 1000);
    return () => clearInterval(watchdog);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamPath, token]);

  // Wheel-Scroll-Isolation: Reacts onWheel ist passiv (preventDefault greift
  // nicht) → die LifeHub-Seite scrollte mit. Nativer non-passive Listener:
  // stoppt die Propagation und leitet das Rad nur an den Remote-Browser weiter.
  // Gedrosselt: Rad-Impulse (bei einigen Mausrädern sehr schnell) werden zu
  // Deltas akkumuliert und max. alle 40ms gesendet, damit der DataChannel nicht
  // geflutet wird.
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return undefined;
    let pendingDeltaX = 0;
    let pendingDeltaY = 0;
    let lastSentAt = 0;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      pendingDeltaX += event.deltaX;
      pendingDeltaY += event.deltaY;
      const now = performance.now();
      if (now - lastSentAt < 40) return;
      lastSentAt = now;
      sendInput({ type: 'wheel', deltaX: pendingDeltaX, deltaY: pendingDeltaY });
      pendingDeltaX = 0;
      pendingDeltaY = 0;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamPath, token]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-950">
      {/* Fehlerbehandlung am Video-Element: stalled feuert bei Datenmangel,
          error bei Dekodier-/Netzwerkfehlern — beide führen über onclose zur
          Reconnect-Eskalation. */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-fill select-none"
        autoPlay
        playsInline
        muted={false}
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
          event.currentTarget.focus();
          const point = getPoint(event);
          // sendInput VOR setPointerCapture: setPointerCapture kann werfen
          // (NotFoundError, wenn der Pointer nicht registriert ist — z.B. beim
          // ersten Klick). Vorher ging der Klick dadurch verloren; erst nach
          // einer Maus-Interaktion (Markieren) war der Pointer aktiv.
          sendInput({ type: 'mouse', action: 'down', ...point, button: event.button === 2 ? 'right' : 'left' });
          try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* non-fatal */ }
        }}
        onPointerMove={(event) => {
          // Hover-Bewegungen IMMER senden (gedrosselt): Cloudflare-Captchas werten
          // die Cursor-Trajektorie zur Checkbox aus — ohne Hover sieht der Renderer
          // nur Klick-Sprünge und der Captcha schlägt fehl. Drossel: max. alle 33ms
          // und nur bei >3px Positionsänderung, damit der DataChannel nicht flutet.
          const now = performance.now();
          if (now - lastMoveSentAtRef.current < 33) return;
          const point = getPoint(event);
          const last = lastMovePointRef.current;
          if (last && Math.abs(point.x - last.x) < 3 && Math.abs(point.y - last.y) < 3) return;
          lastMoveSentAtRef.current = now;
          lastMovePointRef.current = point;
          sendInput({ type: 'mouse', action: 'move', ...point });
        }}
        onPointerUp={(event) => {
          const point = getPoint(event);
          sendInput({ type: 'mouse', action: 'up', ...point, button: event.button === 2 ? 'right' : 'left' });
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
    </div>
  );
});
