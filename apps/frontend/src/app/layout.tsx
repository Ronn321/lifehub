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
    if (t === 'dark') document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = t;
  } catch (e) {}

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
