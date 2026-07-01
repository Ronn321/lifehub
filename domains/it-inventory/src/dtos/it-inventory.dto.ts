import { z } from 'zod';

const deviceTypeSchema = z.enum(['server', 'nas', 'router', 'switch', 'raspi', 'printer', 'pc', 'laptop', 'tablet', 'phone', 'other']);

export const createDeviceSchema = z.object({
  name: z.string().min(1).max(255),
  type: deviceTypeSchema.default('other'),
  ipAddress: z.string().ip().optional().or(z.literal('')),
  macAddress: z.string().regex(/^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/).optional().or(z.literal('')),
  hostname: z.string().max(255).optional().or(z.literal('')),
  os: z.string().max(255).optional().or(z.literal('')),
  location: z.string().max(255).optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});
export type CreateDeviceInput = z.infer<typeof createDeviceSchema>;

export const updateDeviceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: deviceTypeSchema.optional(),
  ipAddress: z.string().ip().optional().or(z.literal('')),
  macAddress: z.string().regex(/^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/).optional().or(z.literal('')),
  hostname: z.string().max(255).optional().or(z.literal('')),
  os: z.string().max(255).optional().or(z.literal('')),
  location: z.string().max(255).optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;
