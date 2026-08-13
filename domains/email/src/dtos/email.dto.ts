import { z } from 'zod';

export const sendEmailSchema = z.object({
  to: z.array(z.string().email()).min(1),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  subject: z.string().min(1).max(255),
  bodyHtml: z.string().min(1),
});
export type SendEmailInput = z.infer<typeof sendEmailSchema>;

export const replySchema = z.object({
  messageId: z.string().min(1),
  bodyHtml: z.string().min(1),
  replyAll: z.boolean().optional(),
});
export type ReplyInput = z.infer<typeof replySchema>;

export const forwardSchema = z.object({
  to: z.array(z.string().email()).min(1),
  bodyHtml: z.string().min(1),
});
export type ForwardInput = z.infer<typeof forwardSchema>;

export const modifyThreadSchema = z
  .object({
    addLabelIds: z.array(z.string()).optional(),
    removeLabelIds: z.array(z.string()).optional(),
  })
  .refine((v) => (v.addLabelIds?.length ?? 0) > 0 || (v.removeLabelIds?.length ?? 0) > 0, {
    message: 'Mindestens eine Label-Änderung angeben.',
  });
export type ModifyThreadInput = z.infer<typeof modifyThreadSchema>;
