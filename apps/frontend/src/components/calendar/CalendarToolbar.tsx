'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Settings } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatDayLong, type CalendarView } from '@/lib/calendar';
import { MonthPickerPopover } from '@/components/calendar/MonthPickerPopover';

interface CalendarToolbarProps {
  view: CalendarView;
  onViewChange: (v: CalendarView) => void;
  monthStr: string;
  selectedDay: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onNew: () => void;
  onSettingsOpen: () => void;
  onMonthNavigate: (monthStr: 'YYYY-MM') => void;
}

const VIEW_LABELS: Record<CalendarView, string> = {
  month: 'Monat',
  week: 'Woche',
  day: 'Tag',
  agenda: 'Agenda',
};

/** Build the period title shown in the navigation row. */
function navLabel(view: CalendarView, monthStr: string, selectedDay: string): string {
  if (view === 'agenda') return 'Anstehende Termine';
  if (view === 'day') return formatDayLong(selectedDay);
  const [y, m] = monthStr.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('de-DE', {
    month: 'long',
    year: 'numeric',
  });
}

export function CalendarToolbar({
  view,
  onViewChange,
  monthStr,
  selectedDay,
  onPrev,
  onNext,
  onToday,
  onNew,
  onSettingsOpen,
  onMonthNavigate,
}: CalendarToolbarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  // Year shown in the month picker, reset to the current month's year on open.
  const [pickerYear, setPickerYear] = useState(() => Number(monthStr.split('-')[0]));

  function togglePicker() {
    if (!pickerOpen) setPickerYear(Number(monthStr.split('-')[0]));
    setPickerOpen((o) => !o);
  }

  return (
    <div className="space-y-3">
      {/* Header row: title + view switcher + actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kalender</h1>
          <p className="text-fg-subtle mt-1">Deine Termine und Ereignisse</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-bg-surface p-1">
            {(['month', 'week', 'day', 'agenda'] as const).map((v) => (
              <button
                key={v}
                onClick={() => onViewChange(v)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  view === v ? 'bg-cal-500 text-bg' : 'text-fg-muted hover:text-fg',
                )}
              >
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>
          <button
            onClick={onSettingsOpen}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-bg-raised transition-colors"
          >
            <Settings className="h-4 w-4" /> Einstellungen
          </button>
          <button
            onClick={onNew}
            className="inline-flex items-center gap-2 rounded-lg bg-cal-500 px-4 py-2 text-sm font-medium text-bg hover:bg-cal-400 transition-colors"
          >
            <Plus className="h-4 w-4" /> Neuer Termin
          </button>
        </div>
      </div>

      {/* Navigation row */}
      {view !== 'agenda' && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 relative">
            <button
              onClick={onPrev}
              className="p-2 rounded-lg hover:bg-bg-raised transition-colors"
              aria-label="Zurück"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={togglePicker}
              className="px-3 py-1 rounded-lg hover:bg-bg-raised transition-colors text-xl font-semibold min-w-[200px] text-center"
              aria-haspopup="dialog"
              aria-expanded={pickerOpen}
            >
              {navLabel(view, monthStr, selectedDay)}
            </button>
            <button
              onClick={onNext}
              className="p-2 rounded-lg hover:bg-bg-raised transition-colors"
              aria-label="Weiter"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <MonthPickerPopover
              open={pickerOpen}
              onClose={() => setPickerOpen(false)}
              currentMonthStr={monthStr}
              year={pickerYear}
              onYearChange={setPickerYear}
              onSelect={onMonthNavigate}
            />
          </div>
          <button
            onClick={onToday}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-bg-raised transition-colors"
          >
            Heute
          </button>
        </div>
      )}
      {view === 'agenda' && (
        <div className="flex justify-end">
          <button
            onClick={onToday}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-bg-raised transition-colors"
          >
            Heute
          </button>
        </div>
      )}
    </div>
  );
}
