// Built-in cover images for pages (Notion-style).
// Stored in pages.cover_media_id as `builtin:<id>`. No media upload required.
// Two kinds: real photos (image) and gradient covers (background).

export interface BuiltinCover {
  id: string; // e.g. 'builtin:photo-mountains' or 'builtin:amber-waves'
  name: string; // German label
  /** Real photo path (served from /covers/*.jpg) — takes precedence over background */
  image?: string;
  /** CSS background value for gradient covers */
  background?: string;
}

export const BUILTIN_COVERS: BuiltinCover[] = [
  // ── Real photos (Unsplash, free license) ──
  { id: 'builtin:photo-mountains', name: 'Berge', image: '/covers/mountains.jpg' },
  { id: 'builtin:photo-lake', name: 'See', image: '/covers/lake.jpg' },
  { id: 'builtin:photo-forest', name: 'Wald', image: '/covers/forest.jpg' },
  { id: 'builtin:photo-beach', name: 'Strand', image: '/covers/beach.jpg' },
  { id: 'builtin:photo-city', name: 'Stadt', image: '/covers/city.jpg' },
  { id: 'builtin:photo-aurora', name: 'Nordlicht', image: '/covers/aurora.jpg' },
  { id: 'builtin:photo-desert', name: 'Wüste', image: '/covers/desert.jpg' },
  { id: 'builtin:photo-meadow', name: 'Blumenwiese', image: '/covers/meadow.jpg' },
  { id: 'builtin:photo-ocean', name: 'Meer', image: '/covers/ocean.jpg' },
  { id: 'builtin:photo-snow', name: 'Schneeberge', image: '/covers/snow.jpg' },
  { id: 'builtin:photo-starry', name: 'Sternenhimmel', image: '/covers/starry.jpg' },
  { id: 'builtin:photo-misty-forest', name: 'Nebelwald', image: '/covers/autumn.jpg' },

  // ── Gradient covers ──
  { id: 'builtin:amber-waves', name: 'Amber Wellen', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 45%, #78350f 100%)' },
  { id: 'builtin:ember-glow', name: 'Glut-Glühen', background: 'radial-gradient(circle at 30% 20%, #f97316, #c2410c 60%, #7c2d12 100%)' },
  { id: 'builtin:sunset-sky', name: 'Sonnenuntergang', background: 'linear-gradient(180deg, #fecaca 0%, #fb7185 40%, #7c3aed 100%)' },
  { id: 'builtin:ocean-deep', name: 'Tiefsee', background: 'linear-gradient(160deg, #0ea5e9 0%, #1d4ed8 50%, #172554 100%)' },
  { id: 'builtin:forest-mist', name: 'Waldnebel', background: 'linear-gradient(160deg, #86efac 0%, #16a34a 50%, #14532d 100%)' },
  { id: 'builtin:lavender-dusk', name: 'Lavendel-Dämmerung', background: 'linear-gradient(160deg, #c4b5fd 0%, #8b5cf6 50%, #4c1d95 100%)' },
  { id: 'builtin:midnight-city', name: 'Nachtstadt', background: 'linear-gradient(180deg, #334155 0%, #0f172a 55%, #020617 100%)' },
  { id: 'builtin:rose-gold', name: 'Roségold', background: 'linear-gradient(135deg, #fda4af 0%, #e11d48 50%, #881337 100%)' },
  { id: 'builtin:desert-dune', name: 'Wüstendüne', background: 'linear-gradient(160deg, #fde68a 0%, #d97706 45%, #92400e 100%)' },
  { id: 'builtin:arctic-ice', name: 'Arktis', background: 'linear-gradient(160deg, #e0f2fe 0%, #7dd3fc 45%, #0369a1 100%)' },
  { id: 'builtin:aurora', name: 'Aurora', background: 'linear-gradient(120deg, #34d399 0%, #06b6d4 35%, #6366f1 70%, #a855f7 100%)' },
  { id: 'builtin:graphite', name: 'Graphit', background: 'linear-gradient(160deg, #525252 0%, #262626 50%, #0a0a0a 100%)' },
  { id: 'builtin:berry-blast', name: 'Beeren', background: 'linear-gradient(160deg, #f0abfc 0%, #d946ef 40%, #86198f 100%)' },
  { id: 'builtin:golden-hour', name: 'Goldene Stunde', background: 'linear-gradient(180deg, #fef3c7 0%, #fbbf24 45%, #b45309 100%)' },
  { id: 'builtin:teal-tide', name: 'Türkis', background: 'linear-gradient(160deg, #99f6e4 0%, #14b8a6 50%, #134e4a 100%)' },
  { id: 'builtin:slate-fog', name: 'Nebelgrau', background: 'linear-gradient(160deg, #cbd5e1 0%, #64748b 55%, #1e293b 100%)' },
];

export function isBuiltinCover(coverMediaId: string | null | undefined): boolean {
  return !!coverMediaId && coverMediaId.startsWith('builtin:');
}

export function getBuiltinCover(coverMediaId: string | null | undefined): BuiltinCover | undefined {
  if (!coverMediaId) return undefined;
  return BUILTIN_COVERS.find((c) => c.id === coverMediaId);
}
