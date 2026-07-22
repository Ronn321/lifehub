'use client';

import React, { useState, useEffect } from 'react';
import { Moon } from 'lucide-react';
import { useMusicPlayerStore } from '@/lib/music-player-store';

/* ------------------------------------------------------------------ */
/*  SleepTimerButton — popover with sleep timer presets                */
/* ------------------------------------------------------------------ */

const PRESETS = [
  { label: '5 Min.', ms: 5 * 60 * 1000 },
  { label: '15 Min.', ms: 15 * 60 * 1000 },
  { label: '30 Min.', ms: 30 * 60 * 1000 },
  { label: '45 Min.', ms: 45 * 60 * 1000 },
  { label: '60 Min.', ms: 60 * 60 * 1000 },
];

export function SleepTimerButton() {
  const [showPopover, setShowPopover] = useState(false);
  const sleepTimerEnd = useMusicPlayerStore((s) => s.sleepTimerEnd);
  const setSleepTimer = useMusicPlayerStore((s) => s.setSleepTimer);
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (!sleepTimerEnd) {
      setRemaining(0);
      return;
    }
    const interval = setInterval(() => {
      const diff = Math.max(0, sleepTimerEnd - Date.now());
      setRemaining(diff);
      if (diff === 0) setShowPopover(false);
    }, 1000);
    return () => clearInterval(interval);
  }, [sleepTimerEnd]);

  const formatRemaining = (ms: number) => {
    const totalSec = Math.ceil(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowPopover(!showPopover)}
        className="flex items-center justify-center w-8 h-8 rounded-full text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)] transition-colors"
        aria-label="Sleep-Timer"
        title="Sleep-Timer"
        style={sleepTimerEnd ? { color: 'var(--music-accent)' } : undefined}
      >
        <Moon className="h-4 w-4" />
      </button>

      {showPopover && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPopover(false)}
          />
          <div
            className="absolute bottom-full right-0 mb-2 min-w-[160px] rounded-lg shadow-xl border overflow-hidden z-50"
            style={{
              background: 'var(--music-bg-elevated)',
              borderColor: 'rgba(255,255,255,0.1)',
            }}
          >
            {sleepTimerEnd && remaining > 0 && (
              <div
                className="px-3 py-2 text-xs font-bold uppercase tracking-wider border-b"
                style={{
                  color: 'var(--music-accent)',
                  borderColor: 'rgba(255,255,255,0.06)',
                }}
              >
                Aktiv: {formatRemaining(remaining)}
              </div>
            )}
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  setSleepTimer(p.ms);
                  setShowPopover(false);
                }}
                className="flex w-full items-center px-3 py-2 text-xs text-[var(--music-text-primary)] transition-colors hover:bg-[var(--music-bg-hover)]"
              >
                {p.label}
              </button>
            ))}
            {sleepTimerEnd && (
              <button
                onClick={() => {
                  setSleepTimer(null);
                  setShowPopover(false);
                }}
                className="flex w-full items-center px-3 py-2 text-xs font-medium text-[var(--music-text-secondary)] transition-colors hover:bg-[var(--music-bg-hover)] border-t"
                style={{ borderColor: 'rgba(255,255,255,0.06)' }}
              >
                Aus
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
