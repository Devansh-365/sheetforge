import { createDb } from '@sheetforge/shared-db';
import { createLogger } from '@sheetforge/shared-logger';
import { createIoredisQueueClient } from '@sheetforge/shared-redis';
import { createRouter } from '@sheetforge/slice-rest-api';
import { serve } from '@hono/node-server';
import { loadEnv } from './env.js';
import { processorTick } from './processor.js';

const env = loadEnv();
const log = createLogger({ service: 'api' });

const db = createDb(env.DATABASE_URL);
const redis = createIoredisQueueClient({ url: env.REDIS_URL });

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
}

process.on('SIGTERM', () => {
  log.info({}, 'sigterm-received');
  redis.disconnect?.().catch(() => {});
  process.exit(0);
});
