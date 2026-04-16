# shared/redis

## Purpose
Runtime-specific Redis adapters that implement `@sheetforge/queue`'s `QueueRedisClient` contract. The queue engine is DI — this package is where the actual ioredis / @upstash/redis wiring lives.

## Public API (barrel)
- `createIoredisQueueClient({ url, options? })` — TCP-based Node adapter. Returns a `QueueRedisClient` + `disconnect()`. Used by long-lived Node processes.
- `QueueRedisClient` type — re-exported from `@sheetforge/queue` for convenience.

## Runtime mapping
- **Node (apps/worker, apps/api in Node mode):** `createIoredisQueueClient`
- **Cloudflare Workers (apps/api in Workers mode):** `@upstash/redis` adapter — to be added when the API moves to CF Workers.

Both adapters implement the SAME surface so the queue engine and the write-queue slice stay runtime-agnostic.

## Gotchas
- `ioredis` requires a long-lived TCP connection. Do not use in Cloudflare Workers; `@upstash/redis` HTTP is the Workers-compatible alternative.
- ioredis' `call('XADD', ...)` / `call('XREADGROUP', ...)` escape hatch lets us avoid ioredis' stricter stream typings while keeping the QueueRedisClient contract clean.
- `BUSYGROUP` is swallowed on group creation — that's the expected "group already exists" case.

## Never Do
- Don't expose adapter-specific APIs through the barrel — only the `QueueRedisClient` contract methods.
- Don't import from `slices/*`, `apps/*`, or other `shared/*`.
