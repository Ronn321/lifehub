import { z } from 'zod';

// Hilfs-Preprocessor: akzeptiert sowohl String ("a@b.de, c@d.de") als auch Array
// und normalisiert zu String-Array (getrimmt, leer gefiltert). Verhindert HTTP 500
// wenn Mobile-Clients noch String senden (altes MailApi) oder Web-Clients Array.
function emailArray(min = 1) {
  return z.preprocess(
    (v) => {
      if (typeof v === 'string') {
        return v
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
      return v;
    },
    z.array(z.string().email()).min(min),
  );
}

function optionalEmailArray() {
  return z.preprocess(
    (v) => {
      if (v === undefined || v === null) return v;
      if (typeof v === 'string') {
        const arr = v
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean);
        // Leerer String → undefined (optional)
        return arr.length === 0 ? undefined : arr;
      }
      return v;
    },
    z.array(z.string().email()).optional(),
  );
}

export const sendEmailSchema = z.object({
  to: emailArray(1),
  cc: optionalEmailArray(),
  bcc: optionalEmailArray(),
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
  to: emailArray(1),
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
