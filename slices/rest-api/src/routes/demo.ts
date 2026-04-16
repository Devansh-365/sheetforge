import { getHammerStatus, hammerRun } from '@sheetforge/slice-demo';
import { RateLimitedError } from '@sheetforge/shared-types';
import { Hono } from 'hono';
import type { AppVariables, RouterDeps } from '../types.js';

const RUNS_PER_HOUR = 5;
const WINDOW_SECONDS = 60 * 60;
const MAX_N = 50;

function clientIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return headers.get('x-real-ip') ?? 'unknown';
}

export function createDemoRoutes(deps: RouterDeps): Hono<{ Variables: AppVariables }> {
  const app = new Hono<{ Variables: AppVariables }>();

  app.post('/demo/hammer', async (c) => {
    const ip = clientIp(c.req.raw.headers);
    const key = `demo:rl:${ip}`;
    const redis = deps.redis as unknown as {
      incr: (key: string) => Promise<number>;
      expire: (key: string, seconds: number) => Promise<number>;
    };
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, WINDOW_SECONDS);
    }
    if (count > RUNS_PER_HOUR) {
      throw new RateLimitedError(
        `demo limit reached (${RUNS_PER_HOUR} runs/hour)`,
        WINDOW_SECONDS * 1000,
      );
    }

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
