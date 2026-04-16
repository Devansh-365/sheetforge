# packages/queue

## Purpose
OSS (MIT) write-queue engine — the portable core. Zero SaaS-specific code, zero runtime deps. Redis is injected by the caller.

## Status
`"private": true` — do NOT publish to npm until the concurrency acceptance demo passes.

## Public API (barrel)
- `enqueue({ redis, streamKey, message, maxLen? })` — add a write to a Redis Stream. Fields: writeId, payload (JSON), enqueuedAt, optional idempotencyKey. Approximate MAXLEN trim is fire-and-forget. **Do not import this function outside `slices/write-queue`** — eslint enforces it.
- `ensureStreamGroup({ redis, streamKey, group })` — idempotent XGROUP CREATE MKSTREAM.
- `claimNext({ redis, streamKey, group, consumer, blockMs? })` — XREADGROUP, returns at most one `ClaimedMessage<P>` or null on timeout.
- `ackMessage({ redis, streamKey, group, messageId })` — XACK. Caller must only ack after durable processing.
- Types: `QueueRedisClient` (the DI contract), `EnqueueMessage<P>`, `ClaimedMessage<P>`.

## Redis client contract
`QueueRedisClient` is the narrow interface both `@upstash/redis` (HTTP — CF Workers) and `ioredis` (TCP — Node workers) can satisfy via a thin adapter. The queue itself has zero Redis-library dependencies.

Operations the contract requires: xadd (object fields), xreadgroupSingle, xack, xgroupCreateMkstream, xtrimMaxlenApprox, setNxPx, get.

## Design opinions
- One consumer group per stream.
- One message per claim — no batching at the queue layer (keep the serialisation semantics clean).
- No built-in retry loop — Redis Streams PEL redelivery is the retry mechanism. Consumer decides when to ack.
- Approximate MAXLEN trim only (Redis `~` variant); exact trims are deliberately not exposed.

## Never Do
- Don't import from `shared/*`, `slices/*`, or `apps/*` — breaks OSS safety.
- Don't add runtime deps on `ioredis`, `@upstash/redis`, or any Redis library — the whole point is DI.
- Don't `console.*` — the engine is pure; logging is the adapter's job.
- Don't publish to npm before the concurrency demo passes.
