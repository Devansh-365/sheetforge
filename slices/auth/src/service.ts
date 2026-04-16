import type { Db } from '@sheetforge/shared-db';
import { type Logger, createLogger } from '@sheetforge/shared-logger';
import { InternalError, UnauthorizedError } from '@sheetforge/shared-types';
import { SignJWT, jwtVerify } from 'jose';
import { findRefreshTokenByUserId, upsertUserByEmail } from './repo.js';
import {
  type AuthEnv,
  GoogleTokenResponseSchema,
  GoogleUserInfoSchema,
  type SessionClaims,
  SessionClaimsSchema,
} from './types.js';

const GOOGLE_OAUTH_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/spreadsheets',
].join(' ');

const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

const SESSION_JWT_TTL_SECONDS = 60 * 60 * 24 * 7;

export function generateAuthorizeUrl({
  env,
  state,
}: {
  env: AuthEnv;
  state: string;
}): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_OAUTH_CLIENT_ID,
    redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URL,
    response_type: 'code',
    scope: GOOGLE_OAUTH_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `${GOOGLE_AUTHORIZE_URL}?${params.toString()}`;
}

export async function handleCallback({
  code,
  env,
  db,
  logger,
}: {
  code: string;
  env: AuthEnv;
  db: Db;
  logger?: Logger;
}): Promise<{ userId: string; email: string }> {
  const log = logger ?? createLogger({ service: 'auth' });

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URL,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    log.warn({ status: tokenRes.status }, 'google-oauth-token-exchange-failed');
    if (tokenRes.status === 400 || tokenRes.status === 401) {
      throw new UnauthorizedError('Google rejected the authorization code', {
        status: tokenRes.status,
      });
    }
    throw new InternalError('Google token exchange failed', {
      status: tokenRes.status,
    });
  }

  const tokenJson = await tokenRes.json();
  const token = GoogleTokenResponseSchema.safeParse(tokenJson);
  if (!token.success) {
    throw new InternalError('Invalid Google token response', {
      issues: token.error.flatten(),
    });
  }

  const userinfoRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${token.data.access_token}` },
  });
  if (!userinfoRes.ok) {
    throw new InternalError('Google userinfo fetch failed', {
      status: userinfoRes.status,
    });
  }
  const userinfoJson = await userinfoRes.json();
  const userinfo = GoogleUserInfoSchema.safeParse(userinfoJson);
  if (!userinfo.success) {
    throw new InternalError('Invalid Google userinfo response', {
      issues: userinfo.error.flatten(),
    });
  }

  // Refresh token stored as plaintext in V0; encryption-at-rest is a follow-up.
  const user = await upsertUserByEmail({
    db,
    email: userinfo.data.email,
    googleRefreshToken: token.data.refresh_token ?? null,
  });

  return { userId: user.id, email: user.email };
}

export async function issueSessionJwt({
  claims,
  env,
}: {
  claims: { userId: string; email: string };
  env: AuthEnv;
}): Promise<string> {
  const secret = new TextEncoder().encode(env.SESSION_JWT_SECRET);
  return new SignJWT({ userId: claims.userId, email: claims.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_JWT_TTL_SECONDS)
    .sign(secret);
}

export async function verifySessionJwt({
  token,
  env,
}: {
  token: string;
  env: AuthEnv;
}): Promise<SessionClaims> {
  const secret = new TextEncoder().encode(env.SESSION_JWT_SECRET);
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    });
    const parsed = SessionClaimsSchema.safeParse(payload);
    if (!parsed.success) {
      throw new UnauthorizedError('Session token has an invalid shape');
    }
    return parsed.data;
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    throw new UnauthorizedError('Invalid or expired session token');
  }
}

export async function refreshGoogleAccessToken({
  refreshToken,
  env,
}: {
  refreshToken: string;
  env: AuthEnv;
}): Promise<{ accessToken: string; expiresIn: number }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    if (res.status === 400 || res.status === 401) {
      throw new UnauthorizedError('Google rejected the refresh token; user must re-authenticate');
    }
    throw new InternalError('Google refresh token exchange failed', {
      status: res.status,
    });
  }
  const json = await res.json();
  const parsed = GoogleTokenResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new InternalError('Invalid refresh token response', {
      issues: parsed.error.flatten(),
    });
  }
  return {
    accessToken: parsed.data.access_token,
    expiresIn: parsed.data.expires_in,
  };
}

/**
 * Resolve a user's stored refresh token and trade it for a fresh Google access
 * token in one step. Throws UnauthorizedError if the user has not connected
 * Google (or their refresh token was revoked).
 */
export async function getAccessTokenForUser({
  db,
  env,
  userId,
}: {
  db: Db;
  env: AuthEnv;
  userId: string;
}): Promise<string> {
  const refreshToken = await findRefreshTokenByUserId({ db, userId });
  if (!refreshToken) {
    throw new UnauthorizedError('User must re-authenticate with Google');
  }
  const { accessToken } = await refreshGoogleAccessToken({ refreshToken, env });
  return accessToken;
}
