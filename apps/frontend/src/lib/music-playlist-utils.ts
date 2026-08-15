'use client';

import type { JellyfinApiItem } from '@/lib/music-api';

/* ------------------------------------------------------------------ */
/*  Playlist flow helpers (pure logic)                                 */
/*                                                                     */
/*  Adding a whole album (or artist top-songs) to a playlist requires  */
/*  collecting the underlying audio item ids first. These helpers make */
/*  that mapping deterministic and testable.                           */
/* ------------------------------------------------------------------ */

/** Is this Jellyfin item a playable audio track (song)? */
export function isAudioItem(item: JellyfinApiItem): boolean {
  if (!item) return false;
  const t = (item.Type ?? '').toLowerCase();
  const m = (item.MediaType ?? '').toLowerCase();
  return t === 'audio' || m === 'audio';
}

/**
 * Collect the Jellyfin item ids of all playable audio tracks from a list,
 * preserving order and de-duplicating by id. Non-audio items (albums,
 * artists, videos, ...) are skipped.
 */
export function songIdsFromItems(items: JellyfinApiItem[]): string[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const item of items) {
    if (!item?.Id || !isAudioItem(item)) continue;
    if (seen.has(item.Id)) continue;
    seen.add(item.Id);
    ids.push(item.Id);
  }
  return ids;
}

/** Human-readable playlist menu label for a target. */
export function addToPlaylistLabel(itemCount: number): string {
  if (itemCount <= 0) return 'Zur Playlist hinzufügen';
  if (itemCount === 1) return 'Zur Playlist hinzufügen';
  return `Zur Playlist hinzufügen (${itemCount} Songs)`;
}
