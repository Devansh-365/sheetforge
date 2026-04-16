// @acid-sheets/queue — OSS (MIT) write-queue engine.
//
// The public surface is deliberately narrow: the Redis client is DI, the
// stream layout is opinionated (one consumer group, one message at a time),
// and there is no built-in retry — consumers handle retry via PEL redelivery.
//
// Direct import of `./producer` or `./internal/**` is blocked by the
// monorepo's eslint config; all writes must flow through
// `slices/write-queue/submitWrite()`.

export { enqueue } from './producer.js';
export { ensureStreamGroup, claimNext, ackMessage } from './consumer.js';
export type {
  QueueRedisClient,
  EnqueueMessage,
  ClaimedMessage,
} from './types.js';
