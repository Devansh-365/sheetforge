// Internal producer — not a public API.
// All writes must flow through slices/write-queue/submitWrite().
// Direct import is blocked by eslint-plugin-boundaries (no-restricted-imports).

import type { EnqueueMessage, QueueRedisClient } from './types.js';

const DEFAULT_MAX_LEN = 10_000;

export async function enqueue<P>({
  redis,
  streamKey,
  message,
  maxLen = DEFAULT_MAX_LEN,
}: {
  redis: QueueRedisClient;
  streamKey: string;
  message: EnqueueMessage<P>;
  maxLen?: number;
}): Promise<{ messageId: string }> {
  const fields: Record<string, string> = {
    writeId: message.writeId,
    payload: JSON.stringify(message.payload),
    enqueuedAt: new Date().toISOString(),
  };
  if (message.idempotencyKey !== undefined) {
    fields.idempotencyKey = message.idempotencyKey;
  }
  const messageId = await redis.xadd(streamKey, fields);
  // Approximate trim — Redis uses the `~` variant under the hood, never exact.
  // Fire-and-forget: trim is best-effort, never block enqueue on it.
  redis.xtrimMaxlenApprox(streamKey, maxLen).catch(() => {
    // swallow — the caller will observe queue growth via their own metrics
  });
  return { messageId };
}
