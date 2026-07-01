export type CalendarSource = 'local' | 'google' | 'caldav';

export const CALENDAR_SOURCES = ['local', 'google', 'caldav'] as const;

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
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
