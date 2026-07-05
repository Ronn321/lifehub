'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { ListMusic, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { MusicAppShell } from '@/components/music/layout/MusicAppShell';
import { MusicPlayerWrapper } from '@/components/music/player/MusicPlayerWrapper';

/* ------------------------------------------------------------------ */
/*  Playlist Detail Page (Stub)                                        */
/* ------------------------------------------------------------------ */

export default function PlaylistDetailPage() {
  const params = useParams();
  const playlistId = params.id as string;

  return (
    <div className="flex flex-col -m-6 lg:-m-8" style={{ height: 'calc(100% + 48px)' }}>
      <div className="flex-1 overflow-y-auto music-scroll">
        <MusicAppShell
          sidebarProps={{ activeTab: 'playlists' }}
          topBar={
            <Link
              href="/jellyfin/music"
              className="flex items-center gap-2 text-sm text-[var(--music-text-secondary)] hover:text-[var(--music-text-primary)] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück zur Musik
            </Link>
          }
        
        >
          <div className="music-fade-in">
        {/* ── Header ── */}
        <div
          className="relative -mx-[var(--music-space-lg)] -mt-[var(--music-space-lg)] px-[var(--music-space-lg)] pt-[var(--music-space-lg)] pb-6"
          style={{
            background: 'linear-gradient(to bottom, #2a2a5a 0%, transparent 50%, var(--music-bg-base) 100%)',
          }}
        >
          <div className="flex items-end gap-6 pt-8">
            {/* Placeholder Cover */}
            <div className="flex h-[232px] w-[232px] shrink-0 items-center justify-center rounded-md shadow-xl bg-[var(--music-bg-card)]">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--music-bg-hover)]">
                <ListMusic className="h-12 w-12 text-[var(--music-text-disabled)]" />
              </div>
            </div>

            <div className="flex flex-col gap-3 pb-2 min-w-0">
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--music-text-secondary)]">
                Playlist
              </span>
              <h1 className="text-[28px] font-bold text-[var(--music-text-primary)]">
                Playlist
              </h1>
              <p className="text-sm text-[var(--music-text-secondary)]">
                -- Songs
              </p>
            </div>
          </div>
        </div>

        {/* ── Empty State ── */}
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--music-bg-card)]">
            <ListMusic className="h-10 w-10 text-[var(--music-text-disabled)]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--music-text-primary)]">
            Playlist-Funktion kommt bald
          </h2>
          <p className="mt-2 max-w-md text-sm text-[var(--music-text-secondary)]">
            Eigene Playlists sind in Entwicklung. Du kannst bald eigene
            Song-Sammlungen erstellen, teilen und verwalten.
          </p>
        </div>
          </div>
        </MusicAppShell>
      </div>
      <div className="flex-shrink-0" style={{ height: 'var(--music-player-bar-height)' }}>
        <MusicPlayerWrapper />
      </div>
    </div>
  );
}
