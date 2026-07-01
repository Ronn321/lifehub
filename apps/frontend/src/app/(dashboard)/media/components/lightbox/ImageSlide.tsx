'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Loader2, AlertCircle, ImageOff } from 'lucide-react';

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const ZOOM_STEP = 0.25;
const DOUBLE_CLICK_ZOOM = 2.5;

export function ImageSlide({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef(0);
  const pinchStartScale = useRef(1);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale((prev) => {
      const next = e.deltaY < 0 ? prev + ZOOM_STEP : prev - ZOOM_STEP;
      return Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    });
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setScale((prev) => {
      if (prev > 1) return 1;
      return DOUBLE_CLICK_ZOOM;
    });
    setOffset({ x: 0, y: 0 });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    isDragging.current = true;
    dragStart.current = { x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y };
  }, [scale]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;
    dragOffset.current = { x: newX, y: newY };
    setOffset({ x: newX, y: newY });
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const resetView = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    dragOffset.current = { x: 0, y: 0 };
  }, []);

  useEffect(() => {
    resetView();
    setLoaded(false);
    setError(false);
  }, [src, resetView]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const t0 = e.touches[0]!;
      const t1 = e.touches[1]!;
      const dx = t0.clientX - t1.clientX;
      const dy = t0.clientY - t1.clientY;
      lastPinchDist.current = Math.sqrt(dx * dx + dy * dy);
      pinchStartScale.current = scale;
    } else if (e.touches.length === 1 && scale > 1) {
      const t0 = e.touches[0]!;
      dragStart.current = { x: t0.clientX - dragOffset.current.x, y: t0.clientY - dragOffset.current.y };
      isDragging.current = true;
    }
  }, [scale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const t0 = e.touches[0]!;
      const t1 = e.touches[1]!;
      const dx = t0.clientX - t1.clientX;
      const dy = t0.clientY - t1.clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastPinchDist.current > 0) {
        const ratio = dist / lastPinchDist.current;
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchStartScale.current * ratio));
        setScale(newScale);
      }
    } else if (e.touches.length === 1 && isDragging.current) {
      const t0 = e.touches[0]!;
      const newX = t0.clientX - dragStart.current.x;
      const newY = t0.clientY - dragStart.current.y;
      dragOffset.current = { x: newX, y: newY };
      setOffset({ x: newX, y: newY });
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
    lastPinchDist.current = 0;
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center w-full h-full overflow-hidden select-none"
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'none', cursor: scale > 1 ? 'grab' : 'default' }}
    >
      {!loaded && !error && (
        <div className="flex items-center justify-center text-white/60">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center gap-2 text-white/60">
          <ImageOff className="h-12 w-12" />
          <span className="text-sm">Bild konnte nicht geladen werden</span>
          <button
            onClick={() => { setError(false); setLoaded(false); }}
            className="mt-2 rounded-md bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20 transition-colors"
          >
            Erneut versuchen
          </button>
        </div>
      )}

      {!error && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onError={() => { setError(true); setLoaded(true); }}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transition: isDragging.current ? 'none' : 'transform 0.15s ease-out',
          }}
          className="max-h-[85vh] max-w-[85vw] object-contain rounded-lg"
          draggable={false}
        />
      )}

      {loaded && !error && scale !== 1 && (
        <div className="absolute bottom-2 right-2 z-10 rounded-full bg-black/60 px-2.5 py-0.5 text-xs text-white/80 pointer-events-none">
          {Math.round(scale * 100)}%
        </div>
      )}
    </div>
  );
}
