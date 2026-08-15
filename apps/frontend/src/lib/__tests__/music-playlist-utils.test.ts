import { describe, it, expect } from 'vitest';
import { isAudioItem, songIdsFromItems, addToPlaylistLabel } from '../music-playlist-utils';
import type { JellyfinApiItem } from '../music-api';

function item(partial: Partial<JellyfinApiItem> & { Id: string }): JellyfinApiItem {
  return partial as JellyfinApiItem;
}

describe('isAudioItem', () => {
  it('detects Audio items by Type or MediaType', () => {
    expect(isAudioItem(item({ Id: 'a', Type: 'Audio' }))).toBe(true);
    expect(isAudioItem(item({ Id: 'a', MediaType: 'Audio' }))).toBe(true);
    expect(isAudioItem(item({ Id: 'a', MediaType: 'audio' }))).toBe(true);
  });

  it('rejects albums, artists and other media', () => {
    expect(isAudioItem(item({ Id: 'a', Type: 'MusicAlbum' }))).toBe(false);
    expect(isAudioItem(item({ Id: 'a', Type: 'MusicArtist' }))).toBe(false);
    expect(isAudioItem(item({ Id: 'a', Type: 'Movie', MediaType: 'Video' }))).toBe(false);
  });
});

describe('songIdsFromItems', () => {
  it('extracts ids of audio tracks and preserves order', () => {
    const items = [
      item({ Id: 's1', Type: 'Audio' }),
      item({ Id: 's2', Type: 'Audio' }),
      item({ Id: 's3', Type: 'Audio' }),
    ];
    expect(songIdsFromItems(items)).toEqual(['s1', 's2', 's3']);
  });

  it('skips non-audio items (albums/artists/videos)', () => {
    const items = [
      item({ Id: 'album1', Type: 'MusicAlbum' }),
      item({ Id: 's1', Type: 'Audio' }),
      item({ Id: 'artist1', Type: 'MusicArtist' }),
      item({ Id: 's2', MediaType: 'Audio' }),
    ];
    expect(songIdsFromItems(items)).toEqual(['s1', 's2']);
  });

  it('de-duplicates ids', () => {
    const items = [
      item({ Id: 's1', Type: 'Audio' }),
      item({ Id: 's1', Type: 'Audio' }),
      item({ Id: 's2', Type: 'Audio' }),
      item({ Id: 's1', MediaType: 'Audio' }),
    ];
    expect(songIdsFromItems(items)).toEqual(['s1', 's2']);
  });

  it('returns an empty array for empty or invalid input', () => {
    expect(songIdsFromItems([])).toEqual([]);
    expect(songIdsFromItems(undefined as unknown as JellyfinApiItem[])).toEqual([]);
    expect(songIdsFromItems([item({ Id: '', Type: 'Audio' })])).toEqual([]);
  });
});

describe('addToPlaylistLabel', () => {
  it('builds a German label with the song count for albums', () => {
    expect(addToPlaylistLabel(5)).toBe('Zur Playlist hinzufügen (5 Songs)');
  });

  it('does not claim a count for empty selections', () => {
    expect(addToPlaylistLabel(0)).toBe('Zur Playlist hinzufügen');
  });
});
