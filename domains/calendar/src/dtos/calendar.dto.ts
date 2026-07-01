import { z } from 'zod';

export const createCalendarEventSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, 'Must be ISO datetime'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/).optional(),
  allDay: z.boolean().optional().default(false),
  location: z.string().optional(),
  color: z.string().optional(),
  category: z.string().optional(),
  calendarSource: z.enum(['local', 'google', 'caldav']).optional().default('local'),
  externalId: z.string().optional(),
});
export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;

export const updateCalendarEventSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/).nullable().optional(),
  allDay: z.boolean().optional(),
  location: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
});
export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventSchema>;

export const queryCalendarEventsSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Must be YYYY-MM-DD'),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Must be YYYY-MM-DD'),
});
export type QueryCalendarEventsInput = z.infer<typeof queryCalendarEventsSchema>;
