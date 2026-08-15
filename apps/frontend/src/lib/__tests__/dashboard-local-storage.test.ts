// src/lib/__tests__/dashboard-local-storage.test.ts
import { beforeEach, describe, it, expect, vi } from 'vitest';
import type { Widget } from '../grid-utils';
import { PROFILES } from '../dashboard-profiles';
import {
  layoutKey, readLocalLayout, writeLocalLayout, seedLocalLayout, clearLocalLayout,
} from '../dashboard-local-storage';

const widgets: Widget[] = [{ id: 'w1', type: 'weather', x: 0, y: 0, w: 2, h: 1 }];

// Vitest läuft hier in node-Umgebung (kein jsdom): localStorage + window mocken.
function createStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  };
}

describe('dashboard-local-storage', () => {
  beforeEach(() => {
    const storage = createStorage();
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', { localStorage: storage });
  });

  it('Key enthält das Profil', () => {
    expect(layoutKey('phone')).toBe('lifehub:dashboard:phone');
  });

  it('leer → null', () => {
    expect(readLocalLayout('phone')).toBeNull();
  });

  it('Roundtrip lesen/schreiben', () => {
    writeLocalLayout('phone', { widgets });
    expect(readLocalLayout('phone')).toEqual({ widgets });
  });

  it('kaputtes JSON → null', () => {
    localStorage.setItem(layoutKey('phone'), '{kaputt');
    expect(readLocalLayout('phone')).toBeNull();
  });

  it('ungültige Einträge werden gefiltert; alles ungültig → null', () => {
    localStorage.setItem(layoutKey('phone'), JSON.stringify({
      widgets: [widgets[0], { id: 1, type: 'weather' }, 'müll'],
    }));
    expect(readLocalLayout('phone')).toEqual({ widgets });
    localStorage.setItem(layoutKey('phone'), JSON.stringify({ widgets: ['x'] }));
    expect(readLocalLayout('phone')).toBeNull();
  });

  it('seed schreibt Profil-Standard-Layout und liest es zurück', () => {
    const layout = seedLocalLayout('phone', PROFILES.phone);
    expect(layout.widgets.length).toBe(3);
    expect(readLocalLayout('phone')).toEqual(layout);
  });

  it('clear entfernt den Key', () => {
    seedLocalLayout('phone', PROFILES.phone);
    clearLocalLayout('phone');
    expect(localStorage.getItem(layoutKey('phone'))).toBeNull();
  });
});
