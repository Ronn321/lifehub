export type CalendarSource = 'local' | 'google' | 'caldav';

export const CALENDAR_SOURCES = ['local', 'google', 'caldav'] as const;

export type CalendarView = 'month' | 'week' | 'day' | 'agenda';
export type CalendarWeekStart = 'monday' | 'sunday';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  allDay: boolean;
  location: string | null;
  color: string | null;
  category: string | null;
  calendarSource: CalendarSource;
  externalId: string | null;
  calendarId: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CalendarUserSettings {
  ownerId: string;
  accentColor: string | null;
  backgroundUrl: string | null;
  backgroundOverlay: number;
  backgroundBlur: number;
  defaultView: CalendarView;
  weekStart: CalendarWeekStart;
  showWeekNumbers: boolean;
}

export interface Calendar {
  id: string;
  title: string;
  color: string | null;
  source: CalendarSource;
  externalId: string | null;
  ownerId: string;
  syncToken: string | null;
  lastSyncAt: string | null;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
