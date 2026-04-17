import type { QueueRedisClient } from '@sheetforge/queue';

/**
 * Upstash REST adapter — implements the QueueRedisClient contract via raw
 * fetch calls to the Upstash REST endpoint. No @upstash/redis dep so we can
 * stay version-proof and keep the shared/redis package light.
 *
 * Upstash REST does not support XREADGROUP BLOCK (HTTP doesn't long-poll
 * here), so the adapter simulates blocking semantics by sleeping for blockMs
 * when the stream is empty. Fine for the V0 inline processor; the long-term
 * story is Cloudflare Workers where short polls are idiomatic anyway.
 */
export function createUpstashQueueClient({
  url,
  token,
}: {
  url: string;
  token: string;
}): QueueRedisClient & { disconnect: () => Promise<void> } {
  const endpoint = url.replace(/\/+$/, '');

  async function exec<T = unknown>(...args: (string | number)[]): Promise<T> {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args.map(String)),
    });
    if (!res.ok) {
      throw new Error(`Upstash HTTP ${res.status}: ${await res.text()}`);
    }
    const body = (await res.json()) as { result?: T; error?: string };
    if (body.error) throw new Error(`Upstash: ${body.error}`);
    return body.result as T;
  }

  return {
    async xadd(key, fields) {
      const flat: string[] = [];
      for (const [k, v] of Object.entries(fields)) flat.push(k, v);
      const id = await exec<string>('XADD', key, '*', ...flat);
      return id;
    },

    async xreadgroupSingle({ group, consumer, key, blockMs }) {
      // Upstash REST doesn't long-poll. Call once, sleep blockMs if empty.
      const result = (await exec(
        'XREADGROUP',
        'GROUP',
        group,
        consumer,
        'COUNT',
        '1',
        'STREAMS',
        key,
        '>',
      )) as Array<[string, Array<[string, string[]]>]> | null;

      if (!result || result.length === 0) {
        if (blockMs && blockMs > 0) {
          await new Promise((res) => setTimeout(res, blockMs));
        }
        return null;
      }
      const stream = result[0];
      if (!stream) return null;
      const entries = stream[1];
      if (!entries || entries.length === 0) return null;
      const entry = entries[0];
      if (!entry) return null;
      const [id, flat] = entry;
      const out: Record<string, string> = {};
      for (let i = 0; i < flat.length; i += 2) {
        const k = flat[i];
        const v = flat[i + 1];
        if (k !== undefined && v !== undefined) out[k] = v;
      }
      return { id, fields: out };
    },

    async xack(key, group, id) {
      await exec('XACK', key, group, id);
    },

    async xgroupCreateMkstream(key, group) {
      try {
        await exec('XGROUP', 'CREATE', key, group, '$', 'MKSTREAM');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!/BUSYGROUP/.test(msg)) throw err;
      }
    },

    async xtrimMaxlenApprox(key, maxLen) {
      await exec('XTRIM', key, 'MAXLEN', '~', maxLen);
    },

    async setNxPx(key, value, ttlMs) {
      const result = await exec<'OK' | null>(
        'SET',
        key,
        value,
        'NX',
        'PX',
        ttlMs,
      );
      return result === 'OK';
    },

    async get(key) {
      return (await exec<string | null>('GET', key)) ?? null;
    },

    async disconnect() {
      // REST adapter holds no long-lived connections.
    },
  };
}
