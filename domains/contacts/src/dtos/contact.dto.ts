import { z } from 'zod';

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Ungültige Farbe (erwartet #RRGGBB)');

export const createContactSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(255),
  email: z.string().email('Ungültige E-Mail-Adresse').nullable().optional(),
  phone: z.string().max(255).nullable().optional(),
  notes: z.string().nullable().optional(),
  color: hexColor.nullable().optional(),
});
export type CreateContactInput = z.infer<typeof createContactSchema>;

export const updateContactSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(255).optional(),
  email: z.string().email('Ungültige E-Mail-Adresse').nullable().optional(),
  phone: z.string().max(255).nullable().optional(),
  notes: z.string().nullable().optional(),
  color: hexColor.nullable().optional(),
});
export type UpdateContactInput = z.infer<typeof updateContactSchema>;

export const querySchema = z.object({
  q: z.string().max(255).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(50),
});
export type ContactQuery = z.infer<typeof querySchema>;
