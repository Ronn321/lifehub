'use client';

import React, { useState, type FormEvent } from 'react';
import { Loader2, X } from 'lucide-react';
import { useCreatePlaylist } from '@/lib/music-api';

/* ------------------------------------------------------------------ */
/*  CreatePlaylistDialog Props                                         */
/* ------------------------------------------------------------------ */

interface CreatePlaylistDialogProps {
  /** Jellyfin server id */
  serverId: string;
  /** Called after successful creation so parent can refresh playlists */
  onCreated: () => void;
  /** Close the dialog without creating */
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  CreatePlaylistDialog Component                                     */
/* ------------------------------------------------------------------ */

export function CreatePlaylistDialog({ serverId, onCreated, onClose }: CreatePlaylistDialogProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const createPlaylist = useCreatePlaylist();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      await createPlaylist(serverId, trimmed);
      onCreated();
    } catch (err: any) {
      setError(err?.message ?? 'Fehler beim Erstellen der Playlist');
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Close when clicking the backdrop (not the dialog content)
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[var(--music-z-overlay)] flex items-center justify-center bg-black/60"
      onClick={handleOverlayClick}
    >
      <div
        className="relative w-full max-w-sm rounded-xl p-6 shadow-xl"
        style={{ background: 'var(--music-bg-elevated)' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full text-[var(--music-text-tertiary)] hover:bg-[var(--music-bg-card)] hover:text-[var(--music-text-primary)] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Title */}
        <h2
          className="mb-1 text-lg font-bold"
          style={{ color: 'var(--music-text-primary)' }}
        >
          Neue Playlist
        </h2>
        <p
          className="mb-5 text-xs"
          style={{ color: 'var(--music-text-tertiary)' }}
        >
          Gib einen Namen für deine neue Playlist ein.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Playlist-Name"
            autoFocus
            disabled={loading}
            className="w-full rounded-lg border-none bg-[var(--music-bg-card)] px-4 py-2.5 text-sm text-[var(--music-text-primary)] placeholder-[var(--music-text-tertiary)] outline-none focus:ring-2 focus:ring-[var(--music-accent)]"
          />

          {/* Error message */}
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--music-text-secondary)] hover:bg-[var(--music-bg-card)] transition-colors disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
              style={{ background: 'var(--music-accent, #1db954)' }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Erstellen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
