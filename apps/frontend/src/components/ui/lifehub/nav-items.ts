// Shared navigation map for the LifeHub app shell.
// Single source of truth for sidebar, bottom tab bar, "Mehr" sheet,
// command palette and breadcrumb labels (mirrors UI_UX.md §5 order).
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Calendar,
  Mail,
  Image,
  Plane,
  Code2,
  BookOpen,
  ShoppingCart,
  BookUser,
  PiggyBank,
  ShieldCheck,
  FolderLock,
  ScrollText,
  Server,
  Monitor,
  Search,
  Puzzle,
  Users,
  Notebook,
  Settings,
} from 'lucide-react';

export interface LifehubNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  keywords: string[];
  disabled?: boolean;
}

// Main domain navigation — same structure, labels and icons as the sidebar.
export const NAV_ITEMS: LifehubNavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, keywords: ['start', 'home', 'übersicht'] },
  { href: '/calendar', label: 'Kalender', icon: Calendar, keywords: ['kalender', 'termine', 'termin', 'event', 'events'] },
  { href: '/email', label: 'E-Mail', icon: Mail, keywords: ['mail', 'postfach', 'nachrichten', 'posteingang'] },
  { href: '/media', label: 'Medien', icon: Image, keywords: ['medien', 'fotos', 'bilder', 'galerie', 'videos'] },
  { href: '/travel', label: 'Reisen', icon: Plane, keywords: ['reisen', 'reise', 'urlaub', 'trips', 'trip'] },
  { href: '/projects', label: 'Projekte', icon: Code2, keywords: ['projekte', 'projekt', 'kanban', 'aufgaben'] },
  { href: '/recipes', label: 'Rezepte', icon: BookOpen, keywords: ['rezepte', 'rezept', 'kochen', 'essen'] },
  { href: '/shopping', label: 'Einkauf', icon: ShoppingCart, keywords: ['einkauf', 'einkaufsliste', 'einkaufen', 'liste'] },
  { href: '/contacts', label: 'Kontakte', icon: BookUser, keywords: ['kontakte', 'kontakt', 'adressen', 'personen'] },
  { href: '/finance', label: 'Finanzen', icon: PiggyBank, keywords: ['finanzen', 'geld', 'budget', 'portfolio', 'ausgaben', 'konto'] },
  { href: '/insurance', label: 'Versicherung', icon: ShieldCheck, keywords: ['versicherung', 'versicherungen', 'police', 'policen'] },
  { href: '/vault', label: 'Tresor', icon: FolderLock, keywords: ['tresor', 'vault', 'passwörter', 'passwort', 'geheimnisse', 'totp'] },
  { href: '/documents', label: 'Dokumente', icon: ScrollText, keywords: ['dokumente', 'dokument', 'dateien', 'pdf'] },
  { href: '/it-inventory', label: 'Haus-IT', icon: Server, keywords: ['haus-it', 'hausit', 'server', 'nas', 'geräte', 'netzwerk'] },
  { href: '/jellyfin', label: 'Jellyfin', icon: Monitor, keywords: ['jellyfin', 'filme', 'serien', 'mediathek', 'kino', 'film', 'serie', 'tv'] },
  { href: '/search', label: 'Suche', icon: Search, keywords: ['suche', 'suchen', 'finden'] },
  { href: '/plugins', label: 'Plugins', icon: Puzzle, keywords: ['plugins', 'erweiterungen', 'addons'] },
  { href: '/users', label: 'Benutzer', icon: Users, keywords: ['benutzer', 'user', 'accounts', 'mitglieder'] },
];

// Secondary routes reachable via sidebar sections (Seiten) and footer.
export const EXTRA_NAV_ITEMS: LifehubNavItem[] = [
  { href: '/pages', label: 'Seiten', icon: Notebook, keywords: ['seiten', 'seite', 'notizen', 'wiki', 'notiz'] },
  { href: '/settings', label: 'Einstellungen', icon: Settings, keywords: ['einstellungen', 'settings', 'konto', 'theme', 'darstellung', 'allgemein'] },
];

export const ALL_NAV_ITEMS: LifehubNavItem[] = [...NAV_ITEMS, ...EXTRA_NAV_ITEMS];

// Bottom-tab-bar tabs per UI_UX.md §4.4 (5 visible domains + "Mehr" sheet).
export const BOTTOM_TAB_HREFS = ['/dashboard', '/calendar', '/media', '/jellyfin', '/shopping'];

// Short tab labels for the narrow bottom bar (Jellyfin → Filme & Serien).
export const BOTTOM_TAB_LABELS: Record<string, string> = {
  '/jellyfin': 'Filme & Serien',
};

export function findNavItem(href: string): LifehubNavItem | undefined {
  return ALL_NAV_ITEMS.find((item) => item.href === href);
}

// Map a URL segment to its German label for breadcrumbs; unknown segments
// fall back to a humanized capitalized form.
export function labelForSegment(segment: string): string {
  const item = findNavItem(`/${segment}`);
  if (item) return item.label;
  const humanized = segment.replace(/-/g, ' ');
  return humanized.charAt(0).toUpperCase() + humanized.slice(1);
}
