import { z } from 'zod';

/** DTOs for the integrations domain (Google OAuth2 connect). */

export const oauthStateSchema = z.object({
  u: z.string(), // ownerId
  r: z.string(), // random nonce
});
export type OauthState = z.infer<typeof oauthStateSchema>;

export const googleCallbackQuerySchema = z.object({
  code: z.string(),
  state: z.string(),
});
export type GoogleCallbackQuery = z.infer<typeof googleCallbackQuerySchema>;
