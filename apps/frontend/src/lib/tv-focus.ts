// TV D-pad focus helper. Exposes a global JS API (window.lifehubTvFocus /
// window.lifehubTvClick) that the Flutter app drives via runJavaScript, plus an
// in-browser keydown listener so the flow can be tested on a desktop keyboard.
// Only wired up in TV client mode (initTvFocus is invoked at boot for client=tv).

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

function visible(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  const s = getComputedStyle(el);
  return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
}

function focusables(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(visible);
}

// Geometrically navigate focus in the given direction.
function step(dir: 'up' | 'down' | 'left' | 'right'): void {
  const all = focusables();
  const current = document.activeElement as HTMLElement | null;
  const from = current && all.includes(current) ? current.getBoundingClientRect() : null;
  const cx = from ? from.left + from.width / 2 : window.innerWidth / 2;
  const cy = from ? from.top + from.height / 2 : window.innerHeight / 2;
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  for (const el of all) {
    if (el === current) continue;
    const r = el.getBoundingClientRect();
    const ex = r.left + r.width / 2;
    const ey = r.top + r.height / 2;
    const dx = ex - cx;
    const dy = ey - cy;
    let score: number;
    if (dir === 'left') score = dx < -1 ? -dx + Math.abs(dy) * 2 : Infinity;
    else if (dir === 'right') score = dx > 1 ? dx + Math.abs(dy) * 2 : Infinity;
    else if (dir === 'up') score = dy < -1 ? -dy + Math.abs(dx) * 2 : Infinity;
    else score = dy > 1 ? dy + Math.abs(dx) * 2 : Infinity;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  if (best) {
    // Explizite Markierung statt Verlass auf :focus/:focus-visible —
    // programmatischer Fokus wird von konkurrierenden CSS-Regeln
    // (focus:outline-none etc.) sonst unsichtbar (TV-Hardware verifiziert).
    document.querySelectorAll('.tv-focus-current').forEach((el) =>
      el.classList.remove('tv-focus-current'),
    );
    best.focus();
    best.classList.add('tv-focus-current');
  }
}

function click(): void {
  const a = document.activeElement as HTMLElement | null;
  if (a && a !== document.body) a.click();
}

declare global {
  interface Window {
    lifehubTvFocus: (dir: 'up' | 'down' | 'left' | 'right') => void;
    lifehubTvClick: () => void;
  }
}

const DIRECTION_MAP: Record<string, 'up' | 'down' | 'left' | 'right'> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

// Expose the global API immediately at module load, so calls from the
// Flutter app (window.lifehubTvFocus / lifehubTvClick) work on EVERY route —
// even if initTvFocus ran before the TV class was applied (boot ordering).
window.lifehubTvFocus = step;
window.lifehubTvClick = click;

// Expose the global API and (only when the TV class is active) wire up keyboard
// navigation. Returns a cleanup that removes the listener.
export function initTvFocus(): () => void {
  if (!document.documentElement.classList.contains('lifehub-tv')) {
    return () => {};
  }
  const handler = (e: KeyboardEvent) => {
    const dir = DIRECTION_MAP[e.key];
    if (dir) {
      e.preventDefault();
      step(dir);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      click();
    }
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}
