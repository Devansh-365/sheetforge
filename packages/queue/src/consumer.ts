import type { ClaimedMessage, QueueRedisClient } from './types.js';

export async function ensureStreamGroup({
  redis,
  streamKey,
  group,
}: {
  redis: QueueRedisClient;
  streamKey: string;
  group: string;
}): Promise<void> {
  await redis.xgroupCreateMkstream(streamKey, group);
}

/**
 * Pull the next message from the stream. Returns null on timeout.
 * The caller is responsible for ack-ing via `ackMessage` once processing is
 * durable (not before).
 */
export async function claimNext<P>({
  redis,
  streamKey,
  group,
  consumer,
  blockMs,
}: {
  redis: QueueRedisClient;
  streamKey: string;
  group: string;
  consumer: string;
  blockMs?: number;
}): Promise<ClaimedMessage<P> | null> {
  const raw = await redis.xreadgroupSingle({
    group,
    consumer,
    key: streamKey,
    blockMs,
  });
  if (!raw) return null;
  const fields = raw.fields;
  const payloadJson = fields.payload ?? 'null';
  const writeId = fields.writeId;
  if (!writeId) {
    throw new Error(`queue message ${raw.id} missing writeId field`);
  }
  return {
    messageId: raw.id,
    writeId,
    idempotencyKey: fields.idempotencyKey,
    payload: JSON.parse(payloadJson) as P,
    enqueuedAt: fields.enqueuedAt ?? '',
  };
}

export async function ackMessage({
  redis,
  streamKey,
  group,
  messageId,
}: {
  redis: QueueRedisClient;
  streamKey: string;
  group: string;
  messageId: string;
}): Promise<void> {
  await redis.xack(streamKey, group, messageId);
}
