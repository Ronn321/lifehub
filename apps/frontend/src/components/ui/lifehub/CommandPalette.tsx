'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ALL_NAV_ITEMS } from './nav-items';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

// Global command palette (UI_UX.md §3 `Command`, §7.3 ⌘K).
// Plain dialog listing all nav routes, filtered by fuzzy `includes`
// on label + keywords. Enter navigates, Esc closes, arrows move selection.
// The open shortcut (cmd/ctrl+k and `/` outside inputs) lives in the
// dashboard layout; this component only handles in-dialog keys.
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_NAV_ITEMS;
    return ALL_NAV_ITEMS.filter((item) => {
      const haystack = `${item.label} ${item.href} ${item.keywords.join(' ')}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [query]);

  // Reset query + selection on open and focus the input.
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      // Focus after mount so the animation/paint does not steal it.
      const timer = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open ]);

  // Clamp the selection when the result list shrinks.
  useEffect(() => {
    if (activeIndex > results.length - 1) {
      setActiveIndex(Math.max(0, results.length - 1));
    }
  }, [results.length, activeIndex]);

  // Keep the active item scrolled into view.
  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, results.length]);

  // Lock body scroll while the dialog is open.
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open ]);

  if (!open) return null;

  const choose = (href: string) => {
    onClose();
    if (href !== pathname) router.push(href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (results.length === 0 ? 0 : (i + 1) % results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (results.length === 0 ? 0 : (i - 1 + results.length) % results.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = results[activeIndex];
      if (target) choose(target.href);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]"
      role="presentation"
      onKeyDown={handleKeyDown}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Globale Suche"
        className="relative w-full max-w-lg overflow-hidden rounded-lg border border-border bg-bg-surface shadow-xl animate-fade-in"
      >
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Seite suchen …"
            aria-label="Seite suchen"
            className="h-12 w-full bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
          />
          <kbd className="hidden shrink-0 rounded border border-border bg-bg px-1.5 py-0.5 text-[10px] text-fg-subtle sm:block">
            ESC
          </kbd>
        </div>
        {/* Results */}
        <div ref={listRef} role="listbox" aria-label="Seiten" className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-fg-muted">Keine Seite gefunden</p>
          ) : (
            results.map((item, index) => {
              const active = index === activeIndex;
              const current = pathname === item.href;
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  type="button"
                  role="option"
                  aria-selected={active}
                  aria-label={item.label}
                  data-active={active ? 'true' : undefined}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(item.href)}
                  className={cn(
                    'flex min-h-[44px] w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                    active ? 'bg-brand-500/10 text-fg' : 'text-fg-muted hover:bg-bg hover:text-fg',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1">{item.label}</span>
                  {current && (
                    <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-medium text-brand-500">
                      Aktuell
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
