import { describe, it, expect } from 'vitest';
import {
  isFavoriteTab,
  normalizeFavoriteTab,
  matchesFavoriteType,
  FAVORITE_TABS,
  DEFAULT_FAVORITE_TAB,
} from '../music-favorites';

describe('isFavoriteTab', () => {
  it('accepts the three valid tabs', () => {
    expect(isFavoriteTab('songs')).toBe(true);
    expect(isFavoriteTab('albums')).toBe(true);
    expect(isFavoriteTab('artists')).toBe(true);
  });

  it('rejects invalid values', () => {
    expect(isFavoriteTab('playlists')).toBe(false);
    expect(isFavoriteTab('')).toBe(false);
    expect(isFavoriteTab(undefined)).toBe(false);
    expect(isFavoriteTab(null)).toBe(false);
    expect(isFavoriteTab(42)).toBe(false);
  });
});

describe('normalizeFavoriteTab', () => {
  it('defaults to songs for invalid input', () => {
    expect(normalizeFavoriteTab(undefined)).toBe('songs');
    expect(normalizeFavoriteTab('nope')).toBe('songs');
    expect(normalizeFavoriteTab(123)).toBe('songs');
  });

  it('passes through valid tabs', () => {
    expect(normalizeFavoriteTab('albums')).toBe('albums');
    expect(normalizeFavoriteTab('artists')).toBe('artists');
  });

  it('uses the provided fallback for invalid input', () => {
    expect(normalizeFavoriteTab(undefined, 'albums')).toBe('albums');
  });

  it('default constant matches the default fallback', () => {
    expect(DEFAULT_FAVORITE_TAB).toBe('songs');
  });
});

describe('FAVORITE_TABS', () => {
  it('has the three tabs in order, default Songs first', () => {
    expect(FAVORITE_TABS.map((t) => t.key)).toEqual(['songs', 'albums', 'artists']);
    expect(FAVORITE_TABS.map((t) => t.label)).toEqual(['Songs', 'Alben', 'Künstler']);
  });

  it('every tab key is a valid MusicFavoriteTab', () => {
    for (const t of FAVORITE_TABS) {
      expect(isFavoriteTab(t.key)).toBe(true);
    }
  });
});

describe('matchesFavoriteType', () => {
  it('maps songs -> Audio', () => {
    expect(matchesFavoriteType('Audio', 'songs')).toBe(true);
    expect(matchesFavoriteType('MusicAlbum', 'songs')).toBe(false);
  });

  it('maps albums -> MusicAlbum', () => {
    expect(matchesFavoriteType('MusicAlbum', 'albums')).toBe(true);
    expect(matchesFavoriteType('Audio', 'albums')).toBe(false);
  });

  it('maps artists -> MusicArtist', () => {
    expect(matchesFavoriteType('MusicArtist', 'artists')).toBe(true);
    expect(matchesFavoriteType('Audio', 'artists')).toBe(false);
  });

  it('returns false for empty/unknown types', () => {
    expect(matchesFavoriteType(undefined, 'songs')).toBe(false);
    expect(matchesFavoriteType('', 'albums')).toBe(false);
  });
});
