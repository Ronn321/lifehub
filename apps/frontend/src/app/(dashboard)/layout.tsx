'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronRight, Menu, MoreHorizontal, Search, Shield, X } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { CommandPalette } from '@/components/ui/lifehub/CommandPalette';
import {
  ALL_NAV_ITEMS,
  BOTTOM_TAB_HREFS,
  BOTTOM_TAB_LABELS,
  findNavItem,
  labelForSegment,
} from '@/components/ui/lifehub/nav-items';
import { readHiddenNav, filterNavItems, NAV_ITEM_KEY } from '@/lib/nav-filter';
import { useBrandName } from '@/lib/use-brand-name';
import { cn } from '@/lib/cn';

// Check whether the event target is an editable element (palette `/`
// shortcut must not fire while typing).
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

// Topbar: 64px with breadcrumb (desktop), global search trigger and a
// placeholder notifications button. Phones get a compact brand bar with a
// burger that opens the sidebar drawer; the bottom tab bar covers primary nav.
function Topbar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const pathname = usePathname();
  const brandName = useBrandName();

  const crumbs = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    const trail: { href: string; label: string }[] = [];
    let acc = '';
    for (const seg of segments) {
      acc += `/${seg}`;
      trail.push({ href: acc, label: labelForSegment(seg) });
    }
    return trail;
  }, [pathname]);

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-bg-surface px-4">
      {/* Tablet menu button — opens the sidebar drawer (phones: bottom tabs) */}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event('lifehub:open-sidebar'))}
        className="hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-bg hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 md:max-lg:flex"
        aria-label="Navigation öffnen"
        title="Navigation öffnen"
      >
        <Menu className="h-5 w-5" />
      </button>
      {/* Phone brand mark */}
      <Link href="/dashboard" className="flex items-center gap-2 md:hidden" aria-label={`${brandName} – Dashboard`}>
        <Shield className="h-5 w-5 shrink-0 text-[var(--lh-accent)]" />
        <span className="text-base font-semibold text-fg">{brandName}</span>
      </Link>
      {/* Desktop breadcrumb */}
      <nav aria-label="Brotkrumen" className="hidden min-w-0 items-center gap-1 text-sm md:flex">
        {crumbs.length === 0 ? (
          <span className="font-medium text-fg">Dashboard</span>
        ) : (
          crumbs.map((crumb, index) => {
            const last = index === crumbs.length - 1;
            return (
              <span key={crumb.href} className="flex min-w-0 items-center gap-1">
                {index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden="true" />}
                {last ? (
                  <span className="truncate font-medium text-fg" aria-current="page">
                    {crumb.label}
                  </span>
                ) : (
                  <Link href={crumb.href} className="shrink-0 text-fg-muted transition-colors hover:text-fg">
                    {crumb.label}
                  </Link>
                )}
              </span>
            );
          })
        )}
      </nav>
      <div className="flex-1" />
      {/* Global search trigger */}
      <button
        type="button"
        onClick={onOpenPalette}
        aria-label="Globale Suche öffnen"
        className="flex min-h-[44px] items-center gap-2 rounded-md border border-border bg-bg px-3 text-sm text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        <span className="hidden lg:inline">Suchen …</span>
        <kbd className="hidden rounded border border-border bg-bg-surface px-1.5 py-0.5 text-[10px] text-fg-subtle lg:block">
          ⌘K
        </kbd>
      </button>
      {/* Notifications placeholder (disabled until the feature lands) */}
      <button
        type="button"
        disabled
        title="Bald verfügbar"
        aria-label="Benachrichtigungen (bald verfügbar)"
        className="flex min-h-[44px] min-w-[44px] cursor-not-allowed items-center justify-center rounded-md text-fg-subtle opacity-50"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
      </button>
    </header>
  );
}

// Mobile bottom tab bar per UI_UX.md §4.4: 5 top items + "Mehr" sheet.
// Active tab gets a 2px brand indicator on top.
function BottomTabBar({ onOpenMore, moreActive }: { onOpenMore: () => void; moreActive: boolean }) {
  const pathname = usePathname();

  const tabs = useMemo(
    () =>
      BOTTOM_TAB_HREFS.map((href) => {
        const item = findNavItem(href);
        if (!item) throw new Error(`Unknown bottom tab href: ${href}`);
        return { ...item, tabLabel: BOTTOM_TAB_LABELS[href] ?? item.label };
      }),
    [],
  );

  return (
    <nav aria-label="Hauptnavigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg-surface md:hidden">
      <div className="grid grid-cols-6">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 text-[11px] transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500',
                active ? 'text-brand-500' : 'text-fg-muted hover:text-fg',
              )}
            >
              {active && <span className="absolute inset-x-3 top-0 h-[2px] rounded-full bg-brand-500" aria-hidden="true" />}
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="max-w-full truncate">{tab.tabLabel}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onOpenMore}
          aria-label="Mehr Navigation anzeigen"
          aria-expanded={moreActive}
          className={cn(
            'relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 text-[11px] transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500',
            moreActive ? 'text-brand-500' : 'text-fg-muted hover:text-fg',
          )}
        >
          {moreActive && <span className="absolute inset-x-3 top-0 h-[2px] rounded-full bg-brand-500" aria-hidden="true" />}
          <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
          <span>Mehr</span>
        </button>
      </div>
    </nav>
  );
}

// "Mehr" sheet listing the remaining nav items below the bottom tab bar.
function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const [hiddenNav, setHiddenNav] = useState<string[]>([]);

  useEffect(() => {
    if (open) setHiddenNav(readHiddenNav(window.localStorage.getItem(NAV_ITEM_KEY)));
  }, [open ]);

  const restItems = useMemo(() => {
    const tabSet = new Set(BOTTOM_TAB_HREFS);
    return filterNavItems(
      ALL_NAV_ITEMS.filter((item) => !tabSet.has(item.href)),
      hiddenNav,
    );
  }, [hiddenNav]);

  // Esc closes the sheet.
  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="presentation">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Weitere Navigation"
        className="absolute inset-x-0 bottom-0 max-h-[70vh] overflow-y-auto rounded-t-xl border-t border-border bg-bg-surface pb-[env(safe-area-inset-bottom)] animate-slide-up"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-medium text-fg">Mehr</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Menü schließen"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-bg hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <nav aria-label="Weitere Bereiche" className="grid grid-cols-1 gap-1 px-3 pb-4">
          {restItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-[48px] items-center gap-3 rounded-md px-3 text-sm transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                  active ? 'bg-brand-500/10 font-medium text-brand-500' : 'text-fg-muted hover:bg-bg hover:text-fg',
                )}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
                {active && <span className="h-5 w-[2px] rounded-full bg-brand-500" aria-hidden="true" />}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();
  const moreActive = useMemo(
    () => !BOTTOM_TAB_HREFS.some((href) => pathname === href || pathname.startsWith(`${href}/`)),
    [pathname],
  );

  // Global shortcuts: cmd/ctrl+k always; `/` when not typing.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      } else if (e.key === '/' && !isTypingTarget(e.target)) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenPalette={() => setPaletteOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6 pb-24 md:pb-6 lg:p-8">
          <a href="#main-content" className="sr-only">
            Zum Inhalt springen
          </a>
          <div id="main-content">{children}</div>
        </main>
        <BottomTabBar onOpenMore={() => setMoreOpen(true)} moreActive={moreOpen || moreActive} />
        <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
    </div>
  );
}
