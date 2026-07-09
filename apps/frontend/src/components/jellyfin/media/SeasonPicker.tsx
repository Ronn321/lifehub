'use client';

import React from 'react';
import { cn } from '@/lib/cn';
import { ChevronDown } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  SeasonPicker — Season selector dropdown                           */
/* ------------------------------------------------------------------ */

interface Season {
  Id: string;
  Name: string;
  IndexNumber: number;
}

interface SeasonPickerProps {
  seasons: Season[];
  selectedIndex: number;
  onSelect: (seasonIndex: number) => void;
  className?: string;
}

export function SeasonPicker({ seasons, selectedIndex, onSelect, className }: SeasonPickerProps) {
  const current = seasons.find(s => s.IndexNumber === selectedIndex);
  const [open, setOpen] = React.useState(false);

  if (seasons.length <= 1) return null;

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-border bg-bg-surface px-4 py-2 text-sm font-medium hover:border-brand-500/30 transition-colors"
      >
        {current?.Name ?? `Staffel ${selectedIndex}`}
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-40 min-w-[200px] rounded-lg border border-border bg-bg-surface shadow-xl overflow-hidden">
            {seasons
              .sort((a, b) => a.IndexNumber - b.IndexNumber)
              .map((season) => (
                <button
                  key={season.Id}
                  onClick={() => { onSelect(season.IndexNumber); setOpen(false); }}
                  className={cn(
                    'flex w-full items-center px-4 py-2 text-left text-sm transition-colors hover:bg-brand-500/10',
                    season.IndexNumber === selectedIndex && 'bg-brand-500/10 text-brand-400 font-medium',
                  )}
                >
                  {season.Name}
                </button>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
