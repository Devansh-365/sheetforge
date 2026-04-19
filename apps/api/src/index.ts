import { serve } from '@hono/node-server';
import { createDb } from '@sheetforge/shared-db';
import { createLogger } from '@sheetforge/shared-logger';
import { createIoredisQueueClient, createUpstashQueueClient } from '@sheetforge/shared-redis';
import { createRouter } from '@sheetforge/slice-rest-api';
import { drainOutboxTick } from '@sheetforge/slice-write-queue';
import { demoProcessorTick } from './demo-processor.js';
import { loadEnv } from './env.js';
import { processorTick } from './processor.js';

const env = loadEnv();
const log = createLogger({ service: 'api' });

const db = createDb(env.DATABASE_URL);

// Prefer Upstash REST when configured — works over HTTPS so the same code
// runs on CF Workers later. Fall back to ioredis for local dev without
// Upstash creds. The env refinement guarantees one of these branches.
function selectRedis() {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    return createUpstashQueueClient({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  if (env.REDIS_URL) {
    return createIoredisQueueClient({ url: env.REDIS_URL });
  }
  throw new Error('redis config missing — env refinement should have caught this');
}
const redis = selectRedis();
log.info(
  {
    driver: env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN ? 'upstash-rest' : 'ioredis',
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
    ...(env.ALLOWED_WEB_ORIGINS ? { ALLOWED_WEB_ORIGINS: env.ALLOWED_WEB_ORIGINS } : {}),
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
        // Backoff after errors so a transient Upstash 5xx or auth-failed
        // response doesn't burn through our REST request budget at wire speed.
        await new Promise((res) => setTimeout(res, 1000));
      }
      // No explicit sleep on success — xreadgroupSingle paces the loop via
      // its blockMs (or the Upstash adapter's setTimeout fallback).
    }
  })();

  // Outbox drain — catches envelopes whose inline XADD from submitWrite
  // didn't land (process death between the ledger commit and Redis, or a
  // transient Redis outage). Without this loop those rows would sit in
  // Postgres forever and the corresponding writes would never reach the
  // handler.
  (async () => {
    log.info({}, 'outbox-drain-starting');
    while (true) {
      try {
        const outcome = await drainOutboxTick({ db, redis });
        if (outcome.failed > 0) {
          await new Promise((res) => setTimeout(res, 1000));
        }
      } catch (err) {
        log.error(
          { err: err instanceof Error ? err.message : String(err) },
          'outbox-drain-tick-failed',
        );
        await new Promise((res) => setTimeout(res, 5000));
      }
      await new Promise((res) => setTimeout(res, 500));
    }
  })();
}

process.on('SIGTERM', () => {
  log.info({}, 'sigterm-received');
  redis.disconnect?.().catch(() => {});
  process.exit(0);
});
