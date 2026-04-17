import { createDb } from '@sheetforge/shared-db';
import { createLogger } from '@sheetforge/shared-logger';
import {
  createIoredisQueueClient,
  createUpstashQueueClient,
} from '@sheetforge/shared-redis';
import { createRouter } from '@sheetforge/slice-rest-api';
import { serve } from '@hono/node-server';
import { demoProcessorTick } from './demo-processor.js';
import { loadEnv } from './env.js';
import { processorTick } from './processor.js';

const env = loadEnv();
const log = createLogger({ service: 'api' });

const db = createDb(env.DATABASE_URL);

// Prefer Upstash REST when configured — works over HTTPS so the same code
// runs on CF Workers later. Fall back to ioredis for local dev without
// Upstash creds.
const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? createUpstashQueueClient({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      })
    : createIoredisQueueClient({ url: env.REDIS_URL! });
log.info(
  {
    driver:
      env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
        ? 'upstash-rest'
        : 'ioredis',
  },
  'redis-driver-selected',
);

const app = createRouter({
  db,
  redis,
  env: {
    GOOGLE_OAUTH_CLIENT_ID: env.GOOGLE_OAUTH_CLIENT_ID,
    GOOGLE_OAUTH_CLIENT_SECRET: env.GOOGLE_OAUTH_CLIENT_SECRET,
    GOOGLE_OAUTH_REDIRECT_URL: env.GOOGLE_OAUTH_REDIRECT_URL,
    SESSION_JWT_SECRET: env.SESSION_JWT_SECRET,
    PUBLIC_BASE_URL: env.PUBLIC_BASE_URL,
    WEB_BASE_URL: env.WEB_BASE_URL,
  },
});

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  log.info({ port: info.port, url: `http://localhost:${info.port}` }, 'api-listening');
});

if (env.PROCESSOR_ENABLED) {
  (async () => {
    log.info({ tickMs: env.PROCESSOR_TICK_MS }, 'processor-starting (inline mode)');
    while (true) {
      try {
        await processorTick({ db, redis, env });
      } catch (err) {
        log.error(
          { err: err instanceof Error ? err.message : String(err) },
          'processor-tick-failed',
        );
      }
      await new Promise((res) => setTimeout(res, env.PROCESSOR_TICK_MS));
    }
  })();

  // Dedicated drain for the public hammer demo stream. Runs on its own loop
  // so the demo doesn't get starved (or starve) the real processor.
  (async () => {
    log.info({}, 'demo-processor-starting');
    while (true) {
      try {
        await demoProcessorTick({ db, redis });
      } catch (err) {
        log.error(
          { err: err instanceof Error ? err.message : String(err) },
          'demo-processor-tick-failed',
        );
      }
      // No sleep — processNext blocks on BLOCK 100ms when idle anyway.
    }
  })();
}

process.on('SIGTERM', () => {
  log.info({}, 'sigterm-received');
  redis.disconnect?.().catch(() => {});
  process.exit(0);
});
