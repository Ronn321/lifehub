import { z } from 'zod';

export const WIDGET_TYPES = [
  'media', 'calendar', 'weather', 'savings', 'tasks', 'finance', 'projects',
] as const;
export type WidgetType = (typeof WIDGET_TYPES)[number];

export const widgetSchema = z.object({
  id: z.string().min(1),
  type: z.enum(WIDGET_TYPES),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1).max(6),
  h: z.number().int().min(1).max(6),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const layoutSchema = z.object({
  widgets: z.array(widgetSchema),
});

export const DEFAULT_WIDGETS: { type: WidgetType; label: string; w: number; h: number }[] = [
  { type: 'media', label: 'Letzte Medien', w: 2, h: 2 },
  { type: 'weather', label: 'Wetter', w: 1, h: 1 },
  { type: 'calendar', label: 'Kalender', w: 2, h: 2 },
  { type: 'savings', label: 'Sparziele', w: 1, h: 1 },
];
