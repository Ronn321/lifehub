import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { AccentSync } from '@/lib/accent';

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
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen font-sans">
        <AccentSync />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
