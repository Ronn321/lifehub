'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { Shield, LayoutDashboard, Image, BookOpen, ShoppingCart, PiggyBank, Server, Key, LogOut, Menu, X, Users, Plane, Code2, Notebook, FileText, FolderLock, Calendar, Search, Puzzle, ShieldCheck, ScrollText, Settings } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { useState } from 'react';
import { cn } from '@/lib/cn';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, disabled: false },
  { href: '/calendar', label: 'Kalender', icon: Calendar, disabled: false },
  { href: '/pages', label: 'Seiten', icon: Notebook, disabled: false },
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
  { href: '/jellyfin', label: 'Jellyfin', icon: FileText, disabled: false },
  { href: '/search', label: 'Suche', icon: Search, disabled: false },
  { href: '/plugins', label: 'Plugins', icon: Puzzle, disabled: false },
  { href: '/users', label: 'Benutzer', icon: Users, disabled: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button onClick={() => setOpen(!open)} className="fixed top-4 left-4 z-50 lg:hidden rounded-md bg-bg-surface border border-border p-2 text-fg">
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 w-64 transform border-r border-border bg-bg-surface transition-transform duration-200 lg:translate-x-0 lg:static lg:inset-auto',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex h-full flex-col">
          {/* Brand */}
          <div className="flex items-center gap-2 border-b border-border px-6 py-5">
            <Shield className="h-6 w-6 text-brand-500" />
            <span className="text-lg font-semibold">LifeHub</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto space-y-1 px-3 py-4">
            {navItems.map((item) => {
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
                        : 'text-fg-muted hover:text-fg hover:bg-bg'
                  )}
                  aria-disabled={item.disabled}
                  tabIndex={item.disabled ? -1 : undefined}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                  {item.disabled && <span className="ml-auto text-[10px] uppercase tracking-wider text-fg-subtle">Soon</span>}
                </Link>
              );
            })}
          </nav>

          {/* Footer: Theme + User */}
          <div className="border-t border-border px-4 py-4 space-y-3">
            <ThemeToggle />
            <Link href="/settings" className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
              pathname === '/settings'
                ? 'bg-brand-500/10 text-brand-500 font-medium'
                : 'text-fg-muted hover:text-fg hover:bg-bg'
            )}>
              <Settings className="h-4 w-4" />
              Einstellungen
            </Link>
            {user && (
              <>
                <p className="text-sm font-medium truncate">{user.displayName}</p>
                <p className="text-xs text-fg-muted truncate">{user.email}</p>
                <button
                  onClick={() => { clear(); window.location.href = '/login'; }}
                  className="flex items-center gap-2 text-xs text-fg-muted hover:text-danger transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Abmelden
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
