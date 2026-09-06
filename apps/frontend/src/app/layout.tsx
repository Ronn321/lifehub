import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'LifeHub',
  description: 'Private self-hosted family OS',
};

// Verhindert Flash of Wrong Theme — läuft VOR React-Render
const themeScript = `
(function() {
  try {
    var raw = localStorage.getItem('lifehub-theme');
    var t = 'dark';
    if (raw) {
      var parsed = JSON.parse(raw);
      t = parsed && parsed.state && parsed.state.theme ? parsed.state.theme : 'dark';
    }
    if (t === 'system') {
      t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    var isDark = t === 'dark';
    if (isDark) document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = t;
  } catch (e) {}

  // Pre-paint accent sync (mirrors theme-store.applyAccent so the first paint
  // already uses the stored accent — no FOUC of the default amber scale).
  // Weights MUST match customScale()/pickBrandFg() in src/lib/theme-store.ts.
  try {
    var a = 'amber';
    var hx = null;
    try {
      var raw2 = localStorage.getItem('lifehub-theme');
      if (raw2) {
        var st = JSON.parse(raw2);
        st = st && st.state ? st.state : {};
        if (st.accent === 'amber' || st.accent === 'blue' || st.accent === 'green' ||
            st.accent === 'rose' || st.accent === 'violet' || st.accent === 'custom') a = st.accent;
        if (typeof st.customHex === 'string') hx = st.customHex;
      }
    } catch (e2) {}
    var root = document.documentElement;
    var darkNow = root.classList.contains('dark');
    function px(hh) {
      var h = String(hh).replace('#', '').trim();
      if (!/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(h)) return null;
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      var n = parseInt(h, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    function mx(b, tw, am) {
      return Math.round(b[0] + (tw[0] - b[0]) * am) + ' ' +
             Math.round(b[1] + (tw[1] - b[1]) * am) + ' ' +
             Math.round(b[2] + (tw[2] - b[2]) * am);
    }
    function rl(c) {
      function f(x) { var s = x / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }
      return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
    }
    var W = [255, 255, 255], B = [0, 0, 0];
    var STEPS_D = [['50', B, 0.82], ['100', B, 0.7], ['200', B, 0.55], ['300', B, 0.4],
                   ['400', B, 0.22], ['600', W, 0.15], ['700', W, 0.3], ['800', W, 0.45], ['900', W, 0.6]];
    var STEPS_L = [['50', W, 0.9], ['100', W, 0.8], ['200', W, 0.65], ['300', W, 0.45],
                   ['400', W, 0.25], ['600', B, 0.12], ['700', B, 0.28], ['800', B, 0.42], ['900', B, 0.55]];
    var LH = { amber: darkNow ? '#D97706' : '#DD6B20', blue: '#3B82F6', green: '#22C55E', rose: '#F43F5E', violet: '#8B5CF6' };
    function toHex(c) {
      function p2(n) { var s = n.toString(16); return s.length === 1 ? '0' + s : s; }
      return ('#' + p2(c[0]) + p2(c[1]) + p2(c[2])).toUpperCase();
    }
    if (a === 'custom') {
      var base = hx ? px(hx) : null;
      if (base) {
        root.setAttribute('data-accent', 'custom');
        var tb = base[0] + ' ' + base[1] + ' ' + base[2];
        root.style.setProperty('--brand-500', tb);
        var steps = darkNow ? STEPS_D : STEPS_L;
        for (var i = 0; i < steps.length; i++) {
          root.style.setProperty('--brand-' + steps[i][0], mx(base, steps[i][1], steps[i][2]));
        }
        var l = rl(base);
        var cw = (Math.max(l, 1) + 0.05) / (Math.min(l, 1) + 0.05);
        var nb = rl([9, 9, 11]);
        var cn = (Math.max(l, nb) + 0.05) / (Math.min(l, nb) + 0.05);
        root.style.setProperty('--brand-fg', cw > cn ? '255 255 255' : '9 9 11');
        root.style.setProperty('--lh-accent', toHex(base));
      } else {
        root.removeAttribute('data-accent');
        root.style.setProperty('--lh-accent', LH.amber);
      }
    } else if (a === 'amber') {
      root.removeAttribute('data-accent');
      root.style.setProperty('--lh-accent', LH.amber);
    } else {
      root.setAttribute('data-accent', a);
      root.style.setProperty('--lh-accent', LH[a]);
    }
  } catch (e3) {}

  // Dynamic brand accent bridge for the Flutter WebView host. The host calls
  // runJavaScript('setWebAccent("<hex>")'); we write the hex onto the HTML root as an
  // inline style so every Tailwind consumer of var(--lh-accent) resolves to it instantly.
  // Default is --lh-accent: #d97706 (defined in globals.css :root).
  window.setWebAccent = function (hex) {
    if (typeof hex === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(hex)) {
      document.documentElement.style.setProperty('--lh-accent', hex);
    }
  };
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
