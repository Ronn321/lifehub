import { describe, it, expect } from 'vitest';
import { resolveClientMode, CLIENT_KEY } from '../client-mode';

describe('resolveClientMode', () => {
  it('erkennt tv aus dem Query-Param', () => {
    expect(resolveClientMode('?client=tv')).toBe('tv');
  });
  it('erkennt phone und tablet', () => {
    expect(resolveClientMode('?client=phone')).toBe('phone');
    expect(resolveClientMode('?client=tablet')).toBe('tablet');
  });
  it('fällt auf browser zurück, wenn kein/anderer Param', () => {
    expect(resolveClientMode('')).toBe('browser');
    expect(resolveClientMode('?foo=1')).toBe('browser');
    expect(resolveClientMode('?client=unicorn')).toBe('browser');
  });
  it('ignoriert andere Query-Params', () => {
    expect(resolveClientMode('?a=1&client=tv&b=2')).toBe('tv');
  });
  it('exportiert konstanten Storage-Key', () => {
    expect(CLIENT_KEY).toBe('lifehub:client');
  });
});
