import { z } from 'zod';

export const createTripSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  coverMediaId: z.string().uuid().optional(),
  status: z.enum(['planned', 'active', 'completed']).optional().default('planned'),
});
export type CreateTripInput = z.infer<typeof createTripSchema>;

export const updateTripSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  coverMediaId: z.string().uuid().nullable().optional(),
  status: z.enum(['planned', 'active', 'completed']).optional(),
});
export type UpdateTripInput = z.infer<typeof updateTripSchema>;

export const addMediaToTripSchema = z.object({
  mediaId: z.string().uuid(),
  caption: z.string().optional(),
  dayId: z.string().uuid().nullable().optional(),
  ord: z.number().int().optional().default(0),
});
export type AddMediaToTripInput = z.infer<typeof addMediaToTripSchema>;

export const createDestinationSchema = z.object({
  name: z.string().min(1).max(255),
  lat: z.string().optional(),
  lng: z.string().optional(),
});
export type CreateDestinationInput = z.infer<typeof createDestinationSchema>;

export const createTripDaySchema = z.object({
  dayDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().optional(),
  notes: z.string().optional(),
});
export type CreateTripDayInput = z.infer<typeof createTripDaySchema>;
