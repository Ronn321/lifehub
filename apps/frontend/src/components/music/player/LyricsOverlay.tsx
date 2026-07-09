'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  LyricsOverlay                                                      */
/*  Vollbild-Overlay für Songtext-Anzeige (Platzhalter).              */
/* ------------------------------------------------------------------ */

interface LyricsOverlayProps {
  /** Ob das Overlay sichtbar ist */
  isVisible: boolean;
  /** Schließt das Overlay */
  onClose: () => void;
}

export function LyricsOverlay({ isVisible, onClose }: LyricsOverlayProps) {
  /* Escape-Taste zum Schließen */
  useEffect(() => {
    if (!isVisible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-center justify-center w-full max-w-lg px-8 py-16 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex items-center justify-center w-10 h-10 rounded-full text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)] hover:bg-white/10 transition-colors"
          aria-label="Schließen"
          title="Schließen"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Placeholder Inhalt */}
        <div className="mb-6">
          <svg
            className="w-16 h-16 mx-auto text-[var(--music-text-tertiary)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-[var(--music-text-primary)] mb-3">
          Songtexte
        </h2>

        <p className="text-base text-[var(--music-text-secondary)] leading-relaxed">
          Lyrics-Funktion kommt bald
        </p>

        <p className="text-sm text-[var(--music-text-tertiary)] mt-4">
          Wir arbeiten daran, dir die Songtexte in Echtzeit anzuzeigen.
        </p>
      </div>
    </div>
  );
}
