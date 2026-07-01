'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, AlertCircle, FileText } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { ImageSlide } from './ImageSlide';
import { VideoSlide } from './VideoSlide';
import { SlideshowControls } from './SlideshowControls';

interface MediaFile {
  id: string;
  filename: string;
  mimeType: string;
  width?: number;
  height?: number;
  takenAt?: string;
  isFavorite: boolean;
}

function isImage(mimeType?: string): boolean {
  return !!mimeType?.startsWith('image/');
}

function isVideo(mimeType?: string): boolean {
  return !!mimeType?.startsWith('video/');
}

function isAudio(mimeType?: string): boolean {
  return !!mimeType?.startsWith('audio/');
}

function getStreamUrl(fileId: string): string {
  if (typeof window === 'undefined') return '';
  const token = useAuthStore.getState().accessToken ?? '';
  return `http://${window.location.hostname}:3007/api/v1/media/files/${fileId}/stream?token=${token}`;
}

export function MediaLightbox({
  files,
  initialIndex,
  onClose,
}: {
  files: MediaFile[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [slideshowState, setSlideshowState] = useState<'idle' | 'start' | 'playing' | 'paused'>('idle');
  const [slideshowInterval, setSlideshowInterval] = useState(5000);

  const file = files[currentIndex] ?? null;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < files.length - 1;

  const goPrev = useCallback(() => {
    if (hasPrev) setCurrentIndex((i) => i - 1);
  }, [hasPrev]);

  const goNext = useCallback(() => {
    if (hasNext) setCurrentIndex((i) => i + 1);
  }, [hasNext]);

  const handlePlay = useCallback(() => {
    setSlideshowState('start');
    setTimeout(() => setSlideshowState('playing'), 800);
  }, []);

  const handlePause = useCallback(() => {
    setSlideshowState('paused');
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, goNext, goPrev]);

  useEffect(() => {
    if (slideshowState !== 'playing' || !hasNext) return;
    const timer = setTimeout(() => goNext(), slideshowInterval);
    return () => clearTimeout(timer);
  }, [slideshowState, slideshowInterval, currentIndex, hasNext, goNext]);

  useEffect(() => {
    if (!hasNext && slideshowState === 'playing') {
      setSlideshowState('paused');
    }
  }, [hasNext, slideshowState]);

  if (files.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85" onClick={onClose}>
        <div className="flex flex-col items-center gap-2 text-white/60" onClick={(e) => e.stopPropagation()}>
          <AlertCircle className="h-10 w-10" />
          <p className="text-sm">Keine Mediendateien vorhanden</p>
          <button onClick={onClose} className="mt-4 rounded-md bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors">
            Schließen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-30 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
        aria-label="Schließen"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="absolute top-4 left-4 z-30 rounded-full bg-black/50 px-3 py-1 text-xs text-white/80">
        {currentIndex + 1} / {files.length}
      </div>

      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-30 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
          aria-label="Vorheriges"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-30 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
          aria-label="Nächstes"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      <SlideshowControls
        state={slideshowState}
        interval={slideshowInterval}
        hasPrev={hasPrev}
        hasNext={hasNext}
        onPrev={goPrev}
        onNext={goNext}
        onPlay={handlePlay}
        onPause={handlePause}
        onIntervalChange={setSlideshowInterval}
      />

      <div className="flex items-center justify-center max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        {!file ? (
          <div className="flex flex-col items-center gap-2 text-white/60">
            <AlertCircle className="h-10 w-10" />
            <p className="text-sm">Datei nicht gefunden</p>
          </div>
        ) : isImage(file.mimeType) ? (
          <ImageSlide src={getStreamUrl(file.id)} alt={file.filename} />
        ) : isVideo(file.mimeType) || isAudio(file.mimeType) ? (
          <VideoSlide src={getStreamUrl(file.id)} mimeType={file.mimeType} />
        ) : (
          <div className="flex flex-col items-center gap-2 text-white/60">
            <FileText className="h-16 w-16 opacity-50" />
            <p className="text-sm">{file.filename}</p>
            <p className="text-xs text-white/40">Vorschau nicht verfügbar</p>
          </div>
        )}
      </div>

      {file && (
        <div
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 rounded-lg bg-black/60 backdrop-blur px-4 py-2 text-center pointer-events-none"
        >
          <p className="text-sm font-medium text-white truncate max-w-[400px]">{file.filename}</p>
          <div className="flex items-center justify-center gap-3 text-xs text-white/70 mt-0.5">
            {file.width && file.height && <span>{file.width}&times;{file.height}</span>}
            {file.takenAt && (
              <span>
                {new Date(file.takenAt).toLocaleDateString('de-DE', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
