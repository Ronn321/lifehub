'use client';

import { useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { todayIso } from '@/lib/calendar';

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mär',
  'Apr',
  'Mai',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Okt',
  'Nov',
  'Dez',
] as const;

interface MonthPickerPopoverProps {
  open: boolean;
  onClose: () => void;
  currentMonthStr: string; // 'YYYY-MM' — highlighted in the grid
  year: number; // currently displayed year (controlled by the toolbar)
  onYearChange: (year: number) => void;
  onSelect: (monthStr: 'YYYY-MM') => void;
}

/** Popover with a 3×4 month grid and year arrows to jump between months. */
export function MonthPickerPopover({
  open,
  onClose,
  currentMonthStr,
  year,
  onYearChange,
  onSelect,
}: MonthPickerPopoverProps) {
  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function handleSelect(monthIndex: number) {
    const m = String(monthIndex + 1).padStart(2, '0');
    onSelect(`${year}-${m}` as 'YYYY-MM');
    onClose();
  }

  function handleToday() {
    onSelect(todayIso().slice(0, 7) as 'YYYY-MM');
    onClose();
  }

  return (
    <>
      {/* Invisible overlay: clicking outside closes the popover. */}
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <div
        className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 bg-bg-surface border border-border rounded-xl shadow-2xl p-4 w-72"
        role="dialog"
        aria-label="Monat auswählen"
      >
        {/* Year navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => onYearChange(year - 1)}
            className="p-1 rounded-lg hover:bg-bg-raised transition-colors"
            aria-label="Vorheriges Jahr"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold">{year}</span>
          <button
            onClick={() => onYearChange(year + 1)}
            className="p-1 rounded-lg hover:bg-bg-raised transition-colors"
            aria-label="Nächstes Jahr"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* 3×4 month grid */}
        <div className="grid grid-cols-3 gap-1">
          {MONTH_NAMES.map((name, i) => {
            const m = String(i + 1).padStart(2, '0');
            const isCurrent = currentMonthStr === `${year}-${m}`;
            return (
              <button
                key={name}
                onClick={() => handleSelect(i)}
                className={cn(
                  'rounded-md px-2 py-2 text-sm transition-colors hover:bg-bg-raised',
                  isCurrent ? 'bg-cal-500 text-bg' : 'text-fg',
                )}
              >
                {name}
              </button>
            );
          })}
        </div>

        {/* Today */}
        <button
          onClick={handleToday}
          className="mt-3 w-full rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-bg-raised transition-colors"
        >
          Heute
        </button>
      </div>
    </>
  );
}
