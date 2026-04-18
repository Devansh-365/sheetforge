import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorHandler } from './errors-middleware.js';
import { createAuthRoutes } from './routes/auth.js';
import { createDemoRoutes } from './routes/demo.js';
import { createProjectRoutes } from './routes/projects.js';
import { createRowRoutes } from './routes/rows.js';
import { createSheetRoutes } from './routes/sheets.js';
import type { AppVariables, RouterDeps } from './types.js';

export function createRouter(deps: RouterDeps): Hono<{ Variables: AppVariables }> {
  const app = new Hono<{ Variables: AppVariables }>();

  // Origin allowlist — WEB_BASE_URL plus any extra entries from the CSV.
  // Trim trailing slashes so https://foo.com matches https://foo.com/.
  const allowed = new Set(
    [deps.env.WEB_BASE_URL, ...(deps.env.ALLOWED_WEB_ORIGINS?.split(',') ?? [])]
      .map((o) => o.trim().replace(/\/+$/, ''))
      .filter((o) => o.length > 0),
  );

  app.use(
    '*',
    cors({
      origin: (origin, c) => {
        // Public demo endpoints are unauthenticated — echo any origin so the
        // hammer demo works from anywhere (Vercel previews, the marketing
        // site, embedded iframes). Browsers won't send credentials here.
        if (c.req.path.startsWith('/v1/demo/')) return origin || '*';
        if (!origin) return null;
        const normalized = origin.replace(/\/+$/, '');
        return allowed.has(normalized) ? origin : null;
      },
      credentials: true,
    }),
  );

  app.onError(errorHandler);

  app.get('/', (c) =>
    c.json({
      name: 'sheetforge',
      version: '0.0.0',
      docs: 'https://github.com/Devansh-365/sheetforge',
    }),
  );

  // Auth routes (unprotected — the OAuth dance establishes the session).
  app.route('/v1', createAuthRoutes(deps));

  // Public demo routes (unprotected, rate-limited per IP).
  app.route('/v1', createDemoRoutes(deps));

  // Dashboard routes (session-protected).
  app.route('/v1', createProjectRoutes(deps));
  app.route('/v1', createSheetRoutes(deps));

  // Data-plane routes (API-key-protected).
  app.route('/v1', createRowRoutes(deps));

  return app;
}
