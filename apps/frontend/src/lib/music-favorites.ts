'use client';

/* ------------------------------------------------------------------ */
/*  Favorites tab helpers (pure logic)                                */
/*                                                                     */
/*  The favorites page is split into three tabs: Songs | Alben |       */
/*  Künstler. The backend accepts the same values via the `type`       */
/*  query parameter. These helpers keep tab normalization consistent.  */
/* ------------------------------------------------------------------ */

export type MusicFavoriteTab = 'songs' | 'albums' | 'artists';

export interface FavoriteTabDef {
  key: MusicFavoriteTab;
  label: string;
}

/** Tabs shown on the favorites page (default: Songs). */
export const FAVORITE_TABS: FavoriteTabDef[] = [
  { key: 'songs', label: 'Songs' },
  { key: 'albums', label: 'Alben' },
  { key: 'artists', label: 'Künstler' },
];

/** Default tab when no/invalid tab is selected. */
export const DEFAULT_FAVORITE_TAB: MusicFavoriteTab = 'songs';

export function isFavoriteTab(value: unknown): value is MusicFavoriteTab {
  return value === 'songs' || value === 'albums' || value === 'artists';
}

/** Normalize an unknown value into a valid favorites tab (falls back to Songs). */
export function normalizeFavoriteTab(
  value: unknown,
  fallback: MusicFavoriteTab = DEFAULT_FAVORITE_TAB,
): MusicFavoriteTab {
  return isFavoriteTab(value) ? value : fallback;
}

/** Guard: does this item belong to the given favorites tab? */
export function matchesFavoriteType(type: string | undefined, tab: MusicFavoriteTab): boolean {
  if (!type) return false;
  if (tab === 'songs') return type === 'Audio';
  if (tab === 'albums') return type === 'MusicAlbum';
  if (tab === 'artists') return type === 'MusicArtist';
  return false;
}
