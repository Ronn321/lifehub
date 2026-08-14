import { describe, it, expect } from 'vitest';
import { filterNavItems, readHiddenNav, NAV_ITEM_KEY } from '../nav-filter';

const items = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/media', label: 'Medien' },
  { href: '/jellyfin', label: 'Jellyfin' },
];

describe('filterNavItems', () => {
  it('blendet gemäß hidden-Array aus', () => {
    const hidden = ['/dashboard'];
    expect(filterNavItems(items, hidden).map((i) => i.href)).toEqual(['/media', '/jellyfin']);
  });
  it('ignoriert leere/unbekannte Einträge', () => {
    expect(filterNavItems(items, ['/gibtsnicht']).length).toBe(3);
  });
  it('behält die Reihenfolge der verbleibenden Items bei', () => {
    const hidden = ['/jellyfin'];
    expect(filterNavItems(items, hidden).map((i) => i.label)).toEqual(['Dashboard', 'Medien']);
  });
  it('liefert eine neue Array-Instanz, mutiert die Eingabe nicht', () => {
    const copy = [...items];
    const result = filterNavItems(items, ['/dashboard']);
    expect(result).not.toBe(items);
    expect(items).toEqual(copy);
  });
});

describe('readHiddenNav', () => {
  it('parst ein gültiges JSON-Array', () => {
    expect(readHiddenNav('["/dashboard","/finance"]')).toEqual(['/dashboard', '/finance']);
  });
  it('parst kaputtes JSON als leere Liste', () => {
    expect(readHiddenNav('kaputt')).toEqual([]);
  });
  it('behandelt null/leer als leere Liste', () => {
    expect(readHiddenNav(null)).toEqual([]);
    expect(readHiddenNav('')).toEqual([]);
  });
  it('wirft Nicht-Array-Werte weg', () => {
    expect(readHiddenNav('{"a":1}')).toEqual([]);
    expect(readHiddenNav('[1,true,"/x"]')).toEqual(['/x']);
  });
});

describe('NAV_ITEM_KEY', () => {
  it('exportiert konstanten Storage-Key', () => {
    expect(NAV_ITEM_KEY).toBe('lifehub:sidebar:hidden');
  });
});
