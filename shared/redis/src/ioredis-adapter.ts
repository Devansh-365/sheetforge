import type { QueueRedisClient } from '@sheetforge/queue';
import { Redis, type RedisOptions } from 'ioredis';

/**
 * Node-side adapter — implements the narrow QueueRedisClient contract
 * against `ioredis`. Used by apps/worker (Fly.io) and the inline processor
 * in apps/api when running on Node.
 *
 * A matching `@upstash/redis` adapter will be added when the API moves to
 * Cloudflare Workers; both adapters implement the same interface so the
 * queue engine stays oblivious to the underlying transport.
 */
export function createIoredisQueueClient({
  url,
  options,
}: {
  url: string;
  options?: RedisOptions;
}): QueueRedisClient & { disconnect: () => Promise<void> } {
  const redis = new Redis(url, { maxRetriesPerRequest: null, ...options });

  return {
    async xadd(key, fields) {
      const args: string[] = [];
      for (const [k, v] of Object.entries(fields)) {
        args.push(k, v);
      }
      const id = (await redis.call('XADD', key, '*', ...args)) as string | null;
      if (!id) throw new Error('XADD returned null');
      return id;
    },

    async xreadgroupSingle({ group, consumer, key, blockMs }) {
      const args: string[] = ['GROUP', group, consumer, 'COUNT', '1'];
      if (blockMs !== undefined) args.push('BLOCK', String(blockMs));
      args.push('STREAMS', key, '>');
      const result = (await redis.call('XREADGROUP', ...args)) as Array<
        [string, Array<[string, string[]]>]
      > | null;
      if (!result || result.length === 0) return null;
      const stream = result[0];
      if (!stream) return null;
      const entries = stream[1];
      if (!entries || entries.length === 0) return null;
      const entry = entries[0];
      if (!entry) return null;
      const [id, flat] = entry;
      const fields: Record<string, string> = {};
      for (let i = 0; i < flat.length; i += 2) {
        const k = flat[i];
        const v = flat[i + 1];
        if (k !== undefined && v !== undefined) fields[k] = v;
      }
      return { id, fields };
    },

    async xack(key, group, id) {
      await redis.xack(key, group, id);
    },

    async xgroupCreateMkstream(key, group) {
      try {
        await redis.xgroup('CREATE', key, group, '$', 'MKSTREAM');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!/BUSYGROUP/.test(msg)) throw err;
      }
    },

    async xtrimMaxlenApprox(key, maxLen) {
      await redis.xtrim(key, 'MAXLEN', '~', maxLen);
    },

    async setNxPx(key, value, ttlMs) {
      const result = await redis.set(key, value, 'PX', ttlMs, 'NX');
      return result === 'OK';
    },

    async get(key) {
      return redis.get(key);
    },

    async disconnect() {
      await redis.quit();
    },
  };
}
