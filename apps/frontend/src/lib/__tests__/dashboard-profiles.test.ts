// src/lib/__tests__/dashboard-profiles.test.ts
import { describe, it, expect } from 'vitest';
import type { Widget } from '../grid-utils';
import {
  PROFILES, getProfile, clampWidgetToProfile, normalizeForProfile,
  defaultWidgetSizeForProfile,
} from '../dashboard-profiles';

const mediaWidget: Widget = { id: 'w1', type: 'media', x: 0, y: 0, w: 4, h: 2 };

describe('dashboard-profiles', () => {
  it('browser hat kein Profil', () => {
    expect(getProfile('browser')).toBeNull();
  });

  it('phone: 2 Spalten, alle Widgets Mindestbreite 2 (volle Breite)', () => {
    const p = PROFILES.phone;
    expect(p.columns).toBe(2);
    for (const t of ['media', 'weather', 'calendar', 'savings'] as const) {
      expect(p.minSizes[t].w).toBe(2);
    }
  });

  it('clampWidgetToProfile erzwingt Mindestgröße und Spaltenmaximum', () => {
    const p = PROFILES.phone;
    const clamped = clampWidgetToProfile({ ...mediaWidget, w: 1, h: 1 }, p);
    expect(clamped.w).toBe(2);
    expect(clamped.h).toBe(2); // media min 2x2 auf phone
    const wide = clampWidgetToProfile({ ...mediaWidget, w: 99 }, p);
    expect(wide.w).toBe(2); // nie breiter als Spaltenzahl
    const shifted = clampWidgetToProfile({ ...mediaWidget, x: 5 }, p);
    expect(shifted.x).toBe(0); // x passt nie über den Rand
  });

  it('normalizeForProfile produziert keine Überlagerungen', () => {
    const p = PROFILES.tablet; // 4 Spalten
    const widgets: Widget[] = [
      { id: 'a', type: 'media', x: 0, y: 0, w: 4, h: 2 },
      { id: 'b', type: 'weather', x: 0, y: 0, w: 1, h: 1 }, // kollidiert + unter Min
      { id: 'c', type: 'calendar', x: 3, y: 1, w: 1, h: 1 },
    ];
    const out = normalizeForProfile(widgets, p);
    const rects = out.map((w) => ({ x1: w.x, x2: w.x + w.w, y1: w.y, y2: w.y + w.h }));
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i]!;
        const b = rects[j]!;
        const overlap = a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
        expect(overlap).toBe(false);
      }
    }
    for (const w of out) expect(w.w).toBeGreaterThanOrEqual(p.minSizes[w.type].w);
  });

  it('defaultWidgetSizeForProfile nutzt Profil-Mindestgröße, Desktop DEFAULT_SIZES', () => {
    expect(defaultWidgetSizeForProfile(PROFILES.phone, 'weather')).toEqual({ w: 2, h: 1 });
    expect(defaultWidgetSizeForProfile(null, 'weather')).toEqual({ w: 3, h: 2 });
  });

  it('Standard-Layouts sind kollisionsfrei und innerhalb der Spalten', () => {
    for (const p of [PROFILES.phone, PROFILES.tablet, PROFILES.tv]) {
      expect(normalizeForProfile(p.defaultLayout, p)).toEqual(p.defaultLayout);
      for (const w of p.defaultLayout) {
        expect(w.x + w.w).toBeLessThanOrEqual(p.columns);
      }
    }
  });
});

import { cycleWidgetSize } from '../grid-utils';

describe('cycleWidgetSize', () => {
  it('liefert die nächste erlaubte Größe (zyklisch)', () => {
    // phone weather (min 2x1): erlaubt sind 2x2 und 2x3 (2x1 gibt es in
    // ALLOWED_SIZES nicht) → von 2x2 aus kommt 2x3, von 2x3 wickelt es zu 2x2.
    const next = cycleWidgetSize({ w: 2, h: 2 }, PROFILES.phone, 'weather');
    expect(next).toEqual({ w: 2, h: 3 });
    const wrapped = cycleWidgetSize({ w: 2, h: 3 }, PROFILES.phone, 'weather');
    expect(wrapped).toEqual({ w: 2, h: 2 });
  });

  it('Größen unter dem Minimum springen auf die erste erlaubte Größe', () => {
    const next = cycleWidgetSize({ w: 1, h: 1 }, PROFILES.phone, 'media');
    expect(next).toEqual({ w: 2, h: 2 });
  });

  it('niemals kleiner als Profil-Mindestgröße, niemals breiter als Spalten', () => {
    const p = PROFILES.phone;
    let current = { w: 2, h: 1 };
    for (let i = 0; i < 20; i++) {
      current = cycleWidgetSize(current, p, 'media');
      expect(current.w).toBeGreaterThanOrEqual(p.minSizes.media.w);
      expect(current.h).toBeGreaterThanOrEqual(p.minSizes.media.h);
      expect(current.w).toBeLessThanOrEqual(p.columns);
    }
  });
});
