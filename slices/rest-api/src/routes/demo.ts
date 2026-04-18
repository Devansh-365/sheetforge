import { getHammerStatus, hammerRun } from '@sheetforge/slice-demo';
import { RateLimitedError } from '@sheetforge/shared-types';
import { Hono } from 'hono';
import type { AppVariables, RouterDeps } from '../types.js';

const RUNS_PER_HOUR = 5;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_N = 50;

function clientIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return headers.get('x-real-ip') ?? 'unknown';
}

/**
 * In-memory sliding-window rate limit per IP. Fine for a single-node demo —
 * Redis would be nicer but `QueueRedisClient` is intentionally narrow
 * (stream ops only) and the demo traffic on a landing page does not justify
 * broadening that contract. State resets on process restart; acceptable.
 */
const hits = new Map<string, number[]>();

function rateLimit(ip: string): void {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const recent = (hits.get(ip) ?? []).filter((t) => t > cutoff);
  if (recent.length >= RUNS_PER_HOUR) {
    throw new RateLimitedError(
      `demo limit reached (${RUNS_PER_HOUR} runs/hour)`,
      WINDOW_MS,
    );
  }
  recent.push(now);
  hits.set(ip, recent);

  // Cheap janitor — 1% of writes sweep the map. Without this an attacker
  // rotating IPs grows the heap unbounded.
  if (Math.random() < 0.01) {
    for (const [k, arr] of hits) {
      if (arr.every((t) => t <= cutoff)) hits.delete(k);
    }
  }
}

export function createDemoRoutes(deps: RouterDeps): Hono<{ Variables: AppVariables }> {
  const app = new Hono<{ Variables: AppVariables }>();

  app.post('/demo/hammer', async (c) => {
    rateLimit(clientIp(c.req.raw.headers));

    const body: { n?: number } = await c.req
      .json<{ n?: number }>()
      .catch(() => ({}) as { n?: number });
    const requestedN = Math.floor(Number(body.n ?? 50));
    const n = Math.min(Math.max(requestedN || 50, 1), MAX_N);

    const result = await hammerRun({ db: deps.db, redis: deps.redis, n });
    return c.json(result, 202);
  });

  app.get('/demo/hammer/:runId', async (c) => {
    const runId = c.req.param('runId');
    const status = await getHammerStatus({ db: deps.db, runId });
    return c.json(status);
  });

  return app;
}
