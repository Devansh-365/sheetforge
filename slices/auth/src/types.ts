import { z } from 'zod';

export const AuthEnvSchema = z.object({
  GOOGLE_OAUTH_CLIENT_ID: z.string().min(1),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1),
  GOOGLE_OAUTH_REDIRECT_URL: z.string().url(),
  SESSION_JWT_SECRET: z.string().min(32, 'SESSION_JWT_SECRET must be at least 32 bytes'),
});
export type AuthEnv = z.infer<typeof AuthEnvSchema>;

export const SessionClaimsSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  iat: z.number().int(),
  exp: z.number().int(),
});
export type SessionClaims = z.infer<typeof SessionClaimsSchema>;

export const GoogleUserInfoSchema = z.object({
  sub: z.string(),
  email: z.string().email(),
  email_verified: z.boolean().optional(),
  name: z.string().optional(),
  picture: z.string().url().optional(),
});
export type GoogleUserInfo = z.infer<typeof GoogleUserInfoSchema>;

export const GoogleTokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number().int(),
  refresh_token: z.string().optional(),
  scope: z.string(),
  token_type: z.literal('Bearer'),
  id_token: z.string().optional(),
});
export type GoogleTokenResponse = z.infer<typeof GoogleTokenResponseSchema>;
