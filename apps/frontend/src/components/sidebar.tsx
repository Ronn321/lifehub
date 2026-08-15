'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import {
  Shield, LayoutDashboard, Image, BookOpen, ShoppingCart, PiggyBank,
  Server, Key, Menu, X, Users, Plane, Code2, Notebook,
  FileText, FolderLock, Calendar, Search, Puzzle, ShieldCheck,
  ScrollText, Settings, Monitor, ChevronRight, ChevronDown, Pin, Plus,
  PanelLeftClose, PanelLeftOpen, Mail,
} from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { useState, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/cn';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { readHiddenNav, filterNavItems, NAV_ITEM_KEY } from '@/lib/nav-filter';
import { useBrandName } from '@/lib/use-brand-name';

declare global {
  interface Window {
    // Exposed for the mobile WebView shell (reads the real nav list via runJavaScript).
    __lifehubNav: { href: string; label: string }[];
  }
}

interface Page {
  id: string;
  title: string;
  slug: string | null;
  ownerId: string;
  parentId: string | null;
  icon: string | null;
  description: string | null;
  sortOrder: number;
  children?: Page[];
}

interface PinnedPage {
  pageId: string;
  title: string;
  slug: string | null;
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, disabled: false },
  { href: '/calendar', label: 'Kalender', icon: Calendar, disabled: false },
  { href: '/email', label: 'E-Mail', icon: Mail, disabled: false },
  { href: '/media', label: 'Medien', icon: Image, disabled: false },
  { href: '/travel', label: 'Reisen', icon: Plane, disabled: false },
  { href: '/projects', label: 'Projekte', icon: Code2, disabled: false },
  { href: '/recipes', label: 'Rezepte', icon: BookOpen, disabled: false },
  { href: '/shopping', label: 'Einkauf', icon: ShoppingCart, disabled: false },
  { href: '/finance', label: 'Finanzen', icon: PiggyBank, disabled: false },
  { href: '/insurance', label: 'Versicherung', icon: ShieldCheck, disabled: false },
  { href: '/vault', label: 'Tresor', icon: FolderLock, disabled: false },
  { href: '/documents', label: 'Dokumente', icon: ScrollText, disabled: false },
  { href: '/it-inventory', label: 'Haus-IT', icon: Server, disabled: false },
  { href: '/jellyfin', label: 'Jellyfin', icon: Monitor, disabled: false },
  { href: '/search', label: 'Suche', icon: Search, disabled: false },
  { href: '/plugins', label: 'Plugins', icon: Puzzle, disabled: false },
  { href: '/users', label: 'Benutzer', icon: Users, disabled: false },
];

function flattenPages(pagesList: Page[] | undefined): Page[] {
  if (!pagesList) return [];
  const result: Page[] = [];
  function walk(list: Page[]) {
    for (const p of list) {
      result.push(p);
      if (p.children) walk(p.children);
    }
  }
  walk(pagesList);
  return result;
}

export function Sidebar() {
  const pathname = usePathname();
  const brandName = useBrandName();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [seitenOpen, setSeitenOpen] = useState(true);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [hiddenNav, setHiddenNav] = useState<string[]>([]);

  // Load/save desktop collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('lifehub-sidebar-collapsed');
    if (saved === 'true') setDesktopCollapsed(true);
  }, []);
  useEffect(() => {
    localStorage.setItem('lifehub-sidebar-collapsed', String(desktopCollapsed));
    // Notify other components (e.g. music sidebar toggle position)
    window.dispatchEvent(
      new CustomEvent('lifehub:sidebar-collapse', { detail: { collapsed: desktopCollapsed } }),
    );
  }, [desktopCollapsed]);

  // Read hidden nav items after hydration (client-only, avoids SSR mismatch).
  useEffect(() => {
    setHiddenNav(readHiddenNav(window.localStorage.getItem(NAV_ITEM_KEY)));
  }, []);

  // Expose the real nav list to the mobile WebView shell.
  useEffect(() => {
    window.__lifehubNav = navItems.map((i) => ({ href: i.href, label: i.label }));
  }, []);

  // Externes Einklappen/Aufklappen (z.B. BrowserBlock-Vollbild-Modus)
  useEffect(() => {
    const handler = (e: Event) => {
      const collapsed = (e as CustomEvent<{ collapsed: boolean }>).detail?.collapsed;
      if (typeof collapsed === 'boolean') setDesktopCollapsed(collapsed);
    };
    window.addEventListener('lifehub:sidebar-collapse', handler);
    return () => window.removeEventListener('lifehub:sidebar-collapse', handler);
  }, []);

  // Fetch all pages
  const { data: pages } = useQuery<Page[]>({
    queryKey: ['pages'],
    queryFn: () => api.get<Page[]>('/pages'),
  });

  // Fetch pinned page IDs
  const { data: pinnedPages } = useQuery<PinnedPage[]>({
    queryKey: ['pages-pins'],
    queryFn: () => api.get<PinnedPage[]>('/pages/pin/list'),
  });

  const pinnedPageIds = new Set(pinnedPages?.map((p) => p.pageId) ?? []);

  // Pin mutation
  const pinMutation = useMutation({
    mutationFn: (pageId: string) => api.post(`/pages/pin/add/${pageId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages-pins'] });
    },
  });

  // Unpin mutation
  const unpinMutation = useMutation({
    mutationFn: (pageId: string) => api.delete(`/pages/pin/remove/${pageId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages-pins'] });
    },
  });

  // Close context menu on outside click / Escape
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClick);
      document.addEventListener('keydown', handleKey);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 120);
    setContextMenu({ x, y });
  };

  const allPages = flattenPages(pages);
  const pinnedList = allPages.filter((p) => pinnedPageIds.has(p.id));
  const unpinnedList = allPages.filter((p) => !pinnedPageIds.has(p.id));

  const visibleItems = useMemo(() => filterNavItems(navItems, hiddenNav), [hiddenNav]);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 lg:hidden rounded-md bg-bg-surface border border-border p-2 text-fg"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 border-r border-border bg-bg-surface transition-all duration-200',
          'lg:static lg:inset-auto lg:translate-x-0',
          'flex flex-col',
          open ? 'translate-x-0' : '-translate-x-full',
          desktopCollapsed ? 'w-[64px]' : 'w-64',
        )}
      >
        {/* Brand + Desktop Toggle */}
        <div className={cn(
          'flex items-center border-b border-border gap-2 px-6 py-5',
        )}>
          <Shield className="h-6 w-6 shrink-0 text-brand-500" />
          {!desktopCollapsed && (
            <>
              <span className="flex-1 text-lg font-semibold">{brandName}</span>
              {/* Desktop collapse toggle — only on lg+ */}
              <button
                onClick={() => setDesktopCollapsed(true)}
                className="hidden lg:flex items-center justify-center h-7 w-7 rounded-md text-fg-muted hover:text-fg hover:bg-bg transition-colors"
                title="Sidebar einklappen"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </>
          )}
          {/* Expand button when collapsed — small circle on the right edge */}
          {desktopCollapsed && (
            <button
              onClick={() => setDesktopCollapsed(false)}
              className="absolute -right-3 top-5 flex items-center justify-center h-6 w-6 rounded-full border border-border bg-bg-surface text-fg-muted hover:text-fg hover:bg-bg transition-colors shadow-sm"
              title="Sidebar erweitern"
            >
              <PanelLeftOpen className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto space-y-1 px-3 py-4">
          {visibleItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
                  active
                    ? 'bg-brand-500/10 text-brand-500 font-medium'
                    : item.disabled
                      ? 'text-fg-subtle cursor-not-allowed opacity-40'
                      : 'text-fg-muted hover:text-fg hover:bg-bg',
                )}
                aria-disabled={item.disabled}
                tabIndex={item.disabled ? -1 : undefined}
                title={desktopCollapsed ? item.label : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!desktopCollapsed && item.label}
                {!desktopCollapsed && item.disabled && (
                  <span className="ml-auto text-[10px] uppercase tracking-wider text-fg-subtle">
                    Soon
                  </span>
                )}
              </Link>
            );
          })}

          {/* ─── Seiten section ─── */}
          {!desktopCollapsed && (
            <div>
              {/* Section header — Klick auf Label navigiert zur Übersicht, Chevron klappt die Liste um */}
              <div
                onContextMenu={handleContextMenu}
                className={cn(
                  'flex w-full items-center rounded-md text-sm transition-colors',
                  pathname.startsWith('/pages')
                    ? 'bg-brand-500/10 text-brand-500 font-medium'
                    : 'text-fg-muted hover:text-fg hover:bg-bg',
                )}
              >
                <button
                  onClick={() => setSeitenOpen((prev) => !prev)}
                  className="flex h-10 w-8 shrink-0 items-center justify-center rounded-l-md"
                  title={seitenOpen ? 'Liste einklappen' : 'Liste ausklappen'}
                >
                  {seitenOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                <Link
                  href="/pages"
                  onClick={() => setOpen(false)}
                  className="flex flex-1 items-center gap-1.5 rounded-r-md py-2.5 pr-3 min-w-0"
                  title="Zur Seiten-Übersicht"
                >
                  <Notebook className="h-5 w-5 shrink-0" />
                  <span className="flex-1 text-left">Seiten</span>
                  {pinnedList.length > 0 && (
                    <span className="text-[10px] text-fg-subtle bg-bg rounded-full px-1.5 py-0.5 leading-none">
                      {pinnedList.length}
                    </span>
                  )}
                </Link>
              </div>

              {/* Pinned pages — always visible regardless of collapse state */}
              {pinnedList.length > 0 && (
                <div className="ml-2 mt-1 space-y-0.5">
                  {pinnedList.map((page) => (
                    <div key={page.id} className="group flex items-center">
                      <Link
                        href={`/pages/${page.slug || page.id}`}
                        onClick={() => setOpen(false)}
                        className="flex flex-1 items-center gap-2 rounded-md px-3 py-1.5 text-xs text-fg-muted hover:text-fg hover:bg-bg transition-colors min-w-0"
                      >
                        <span className="shrink-0 text-xs leading-none">
                          {page.icon ?? <Notebook className="h-3.5 w-3.5" />}
                        </span>
                        <span className="truncate">{page.title}</span>
                      </Link>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          unpinMutation.mutate(page.id);
                        }}
                        className="p-1 rounded text-fg-subtle hover:text-brand-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                        title="Loslösen"
                      >
                        <Pin className="h-3 w-3 fill-current" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Expanded page list */}
              {seitenOpen && (
                <div className="ml-2 mt-1 space-y-0.5 border-l border-border pl-2">
                  {allPages.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-fg-subtle">Keine Seiten vorhanden</p>
                  ) : unpinnedList.length === 0 ? null : (
                    unpinnedList.map((page) => (
                      <div key={page.id} className="group flex items-center">
                        <Link
                          href={`/pages/${page.slug || page.id}`}
                          onClick={() => setOpen(false)}
                          className="flex flex-1 items-center gap-2 rounded-md px-3 py-1.5 text-xs text-fg-muted hover:text-fg hover:bg-bg transition-colors min-w-0"
                        >
                          <span className="shrink-0 text-xs leading-none">
                            {page.icon ?? <Notebook className="h-3.5 w-3.5" />}
                          </span>
                          <span className="truncate">{page.title}</span>
                        </Link>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            pinMutation.mutate(page.id);
                          }}
                          className="p-1 rounded text-fg-subtle hover:text-brand-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                          title="Anheften"
                        >
                          <Pin className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Footer: Theme + Settings (user section moved to /settings) */}
        <div className={cn(
          'border-t border-border py-4',
          desktopCollapsed ? 'flex flex-col items-start gap-3 px-4' : 'px-4 space-y-3',
        )}>
          {!desktopCollapsed && <ThemeToggle />}
          <Link
            href="/settings"
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
              pathname === '/settings'
                ? 'bg-brand-500/10 text-brand-500 font-medium'
                : 'text-fg-muted hover:text-fg hover:bg-bg',
            )}
            title={desktopCollapsed ? 'Einstellungen' : undefined}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!desktopCollapsed && 'Einstellungen'}
          </Link>
        </div>
      </aside>

      {/* ─── Context Menu ─── */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 min-w-[200px] rounded-lg border border-border bg-bg-surface shadow-xl py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-fg hover:bg-bg transition-colors"
            onClick={() => {
              setContextMenu(null);
              window.location.href = '/pages?new=true';
            }}
          >
            <Plus className="h-4 w-4" />
            Neue Seite
          </button>
          <button
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-fg hover:bg-bg transition-colors"
            onClick={() => {
              setContextMenu(null);
              window.location.href = '/pages?manage-pins=true';
            }}
          >
            <Pin className="h-4 w-4" />
            Seiten anheften verwalten
          </button>
        </div>
      )}
    </>
  );
}
