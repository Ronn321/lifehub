'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  addDays,
  calendarRange,
  getMonthWeeks,
  getWeekDays,
  hexToRgbTriplet,
  shiftMonth,
  todayIso,
  useCurrentMonth,
  type CalendarEvent,
  type CalendarItem,
  type CalendarUserSettings,
  type CalendarView,
  type WeekStart,
} from '@/lib/calendar';
import { CalendarToolbar } from '@/components/calendar/CalendarToolbar';
import { MonthView } from '@/components/calendar/MonthView';
import { WeekView } from '@/components/calendar/WeekView';
import { DayView } from '@/components/calendar/DayView';
import { AgendaView } from '@/components/calendar/AgendaView';
import { EventDialog } from '@/components/calendar/EventDialog';
import { EventDetailModal } from '@/components/calendar/EventDetailModal';
import { CalendarSettingsPanel } from '@/components/calendar/CalendarSettingsPanel';
import { CalendarBackground } from '@/components/calendar/CalendarBackground';

const DEFAULT_SETTINGS: CalendarUserSettings = {
  accentColor: null,
  backgroundUrl: null,
  backgroundOverlay: 0.85,
  backgroundBlur: 12,
  defaultView: 'month',
  weekStart: 'monday',
  showWeekNumbers: true,
};

function isValidView(v: string | null): v is CalendarView {
  return v === 'month' || v === 'week' || v === 'day' || v === 'agenda';
}

function CalendarSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-fg-subtle" />
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <CalendarInner />
    </Suspense>
  );
}

function CalendarInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [view, setView] = useState<CalendarView>('month');
  const [monthStr, setMonthStr] = useCurrentMonth();
  const [selectedDay, setSelectedDay] = useState(todayIso());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [prefillDate, setPrefillDate] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const defaultViewApplied = useRef(false);

  const { data: settings } = useQuery<CalendarUserSettings>({
    queryKey: ['calendar-settings'],
    queryFn: () => api.get<CalendarUserSettings>('/calendar/settings'),
    enabled: !!accessToken,
  });
  const { data: calendars } = useQuery<CalendarItem[]>({
    queryKey: ['calendar-calendars'],
    queryFn: () => api.get<CalendarItem[]>('/calendar/calendars'),
    enabled: !!accessToken,
  });

  const weekStart: WeekStart = settings?.weekStart ?? 'monday';

  // View from ?view= (URL is source of truth), otherwise server defaultView once.
  useEffect(() => {
    const v = searchParams.get('view');
    if (isValidView(v)) setView(v);
  }, [searchParams]);

  useEffect(() => {
    if (!settings || defaultViewApplied.current) return;
    defaultViewApplied.current = true;
    const v = searchParams.get('view');
    if (!isValidView(v) && settings.defaultView) {
      setView(settings.defaultView);
      router.replace(`/calendar?view=${settings.defaultView}`, { scroll: false });
    }
  }, [settings, searchParams, router]);

  // One-time localStorage migration: legacy 'calendar-settings' → server PUT.
  useEffect(() => {
    if (!accessToken || !settings) return;
    const legacy = localStorage.getItem('calendar-settings');
    if (legacy && !localStorage.getItem('calendar-settings-migrated')) {
      try {
        const old = JSON.parse(legacy);
        api
          .put('/calendar/settings', {
            weekStart: old.weekStart,
            showWeekNumbers: old.showWeekNumbers,
          })
          .catch(() => {});
        localStorage.setItem('calendar-settings-migrated', '1');
      } catch {
        /* ignore malformed legacy settings */
      }
    }
  }, [accessToken, settings]);

  const range = useMemo(
    () => calendarRange(view, monthStr, selectedDay, weekStart),
    [view, monthStr, selectedDay, weekStart],
  );
  const { data: events } = useQuery<CalendarEvent[]>({
    queryKey: ['calendar-events', range.from, range.to],
    queryFn: () => api.get<CalendarEvent[]>(`/calendar/events?from=${range.from}&to=${range.to}`),
    enabled: !!accessToken,
  });

  const [year, mon] = monthStr.split('-');
  const monthWeeks = useMemo(() => getMonthWeeks(Number(year), Number(mon) - 1, weekStart), [year, mon, weekStart]);
  const weekDays = useMemo(() => getWeekDays(selectedDay, weekStart), [selectedDay, weekStart]);

  const calendarsMap = useMemo(
    () => (calendars ? Object.fromEntries(calendars.map((c) => [c.id, c])) : undefined),
    [calendars],
  );

  // Apply calendar-local accent color (hex → rgb triplet CSS vars).
  const calAccent = settings?.accentColor ? hexToRgbTriplet(settings.accentColor) : undefined;
  const rootStyle = {
    '--cal-400': calAccent,
    '--cal-500': calAccent,
    '--cal-600': calAccent,
  } as React.CSSProperties;

  const settingsMutation = useMutation({
    mutationFn: (patch: Partial<CalendarUserSettings>) => api.put('/calendar/settings', patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendar-settings'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/calendar/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      setSelectedEvent(null);
    },
  });

  function changeView(v: CalendarView) {
    setView(v);
    router.replace(`/calendar?view=${v}`, { scroll: false });
  }
  function goPrev() {
    if (view === 'month') setMonthStr(shiftMonth(monthStr, -1));
    else if (view === 'week') setSelectedDay(addDays(selectedDay, -7));
    else if (view === 'day') setSelectedDay(addDays(selectedDay, -1));
  }
  function goNext() {
    if (view === 'month') setMonthStr(shiftMonth(monthStr, 1));
    else if (view === 'week') setSelectedDay(addDays(selectedDay, 7));
    else if (view === 'day') setSelectedDay(addDays(selectedDay, 1));
  }
  function goToday() {
    const t = todayIso();
    setSelectedDay(t);
    setMonthStr(t.slice(0, 7));
  }
  function openNew(date?: string) {
    setEditEvent(null);
    setPrefillDate(date ?? todayIso());
    setDialogOpen(true);
  }
  function openEdit(ev: CalendarEvent) {
    setSelectedEvent(null);
    setEditEvent(ev);
    setPrefillDate('');
    setDialogOpen(true);
  }
  function requestDelete(ev: CalendarEvent) {
    if (window.confirm('Wirklich löschen?')) {
      deleteMutation.mutate(ev.id);
    }
  }

  if (!accessToken) return <CalendarSkeleton />;

  return (
    <div className="space-y-6" style={rootStyle}>
      <CalendarBackground settings={settings} />
      <CalendarToolbar
        view={view}
        onViewChange={changeView}
        monthStr={monthStr}
        selectedDay={selectedDay}
        onPrev={goPrev}
        onNext={goNext}
        onToday={goToday}
        onNew={() => openNew()}
        onSettingsOpen={() => setSettingsOpen(true)}
      />

      {view === 'month' && (
        <MonthView
          weeks={monthWeeks}
          events={events ?? []}
          weekStart={weekStart}
          showWeekNumbers={settings?.showWeekNumbers ?? true}
          calendarsMap={calendarsMap}
          onEventClick={setSelectedEvent}
          onCellClick={(date) => {
            setSelectedDay(date);
            changeView('day');
          }}
          onCellDoubleClick={(date) => openNew(date)}
        />
      )}
      {view === 'week' && (
        <WeekView
          days={weekDays}
          events={events ?? []}
          calendarsMap={calendarsMap}
          onEventClick={setSelectedEvent}
        />
      )}
      {view === 'day' && (
        <DayView
          day={selectedDay}
          events={events ?? []}
          calendarsMap={calendarsMap}
          onEventClick={setSelectedEvent}
          onNew={() => openNew(selectedDay)}
        />
      )}
      {view === 'agenda' && (
        <AgendaView
          events={events ?? []}
          calendarsMap={calendarsMap}
          onEventClick={setSelectedEvent}
          onNew={() => openNew()}
        />
      )}

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          calendars={calendars ?? []}
          onClose={() => setSelectedEvent(null)}
          onEdit={openEdit}
          onDelete={requestDelete}
        />
      )}

      <EventDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['calendar-events'] })}
        editEvent={editEvent}
        prefillDate={prefillDate}
        calendars={calendars ?? []}
      />

      <CalendarSettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings ?? DEFAULT_SETTINGS}
        onSave={(patch) => settingsMutation.mutate(patch)}
      />
    </div>
  );
}
