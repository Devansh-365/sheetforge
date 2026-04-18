import { randomUUID } from 'node:crypto';
import { generateAuthorizeUrl, handleCallback, issueSessionJwt } from '@sheetforge/slice-auth';
import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { RouterDeps } from '../types.js';

export function createAuthRoutes(deps: RouterDeps): Hono {
  const app = new Hono();

  // `secure` mirrors whether the API is HTTPS in this env. Local dev runs
  // http://localhost so we can't blindly set it; production must.
  const cookieSecure = deps.env.PUBLIC_BASE_URL.startsWith('https://');

  app.get('/oauth/login', (c) => {
    const state = randomUUID();
    setCookie(c, 'oauth_state', state, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: cookieSecure,
      path: '/',
      maxAge: 600,
    });
    return c.redirect(generateAuthorizeUrl({ env: deps.env, state }));
  });

  app.get('/oauth/callback', async (c) => {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const cookieState = getCookie(c, 'oauth_state');
    if (!code || !state || state !== cookieState) {
      return c.json(
        {
          error: {
            code: 'STATE_MISMATCH',
            message: 'OAuth state mismatch',
          },
        },
        400,
      );
    }
    deleteCookie(c, 'oauth_state', { path: '/' });
    const { userId, email } = await handleCallback({
      code,
      env: deps.env,
      db: deps.db,
    });
    const token = await issueSessionJwt({
      claims: { userId, email },
      env: deps.env,
    });
    setCookie(c, 'session', token, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: cookieSecure,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return c.redirect(`${deps.env.WEB_BASE_URL}/app`);
  });

  app.post('/auth/logout', (c) => {
    deleteCookie(c, 'session', { path: '/' });
    return c.json({ ok: true });
  });

  return app;
}
