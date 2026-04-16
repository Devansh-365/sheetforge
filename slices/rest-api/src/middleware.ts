import { UnauthorizedError } from '@acid-sheets/shared-types';
import { verifySessionJwt } from '@acid-sheets/slice-auth';
import { validateApiKey } from '@acid-sheets/slice-projects';
import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import type { AppVariables, RouterDeps } from './types.js';

const BEARER_PREFIX = /^Bearer\s+/i;

export function requireSession(deps: RouterDeps): MiddlewareHandler<{ Variables: AppVariables }> {
  return async (c, next) => {
    let token = c.req.header('Authorization')?.replace(BEARER_PREFIX, '');
    // If the Authorization header carries an API key (not a session JWT),
    // fall through to the session cookie.
    if (!token || token.startsWith('sk_live_')) {
      token = getCookie(c, 'session');
    }
    if (!token) {
      throw new UnauthorizedError('Missing session token');
    }
    const claims = await verifySessionJwt({ token, env: deps.env });
    c.set('user', { userId: claims.userId, email: claims.email });
    await next();
  };
}

export function requireApiKey(deps: RouterDeps): MiddlewareHandler<{ Variables: AppVariables }> {
  return async (c, next) => {
    const header = c.req.header('Authorization');
    if (!header) {
      throw new UnauthorizedError('Missing Authorization header');
    }
    const token = header.replace(BEARER_PREFIX, '');
    const resolved = await validateApiKey({ db: deps.db, apiKey: token });
    c.set('apiKey', resolved);
    await next();
  };
}
