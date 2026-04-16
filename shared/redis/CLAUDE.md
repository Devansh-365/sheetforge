# shared/redis

## Purpose
Redis client abstraction supporting both Upstash Redis (HTTP) and ioredis (TCP) via dependency injection.

## Public API
Exported from `src/index.ts`:
- `createRedisClient(config)` — returns a unified Redis client interface

## Key Files
- `src/index.ts` — DI factory, unified client interface

## Gotchas
- Upstash HTTP client is used in Cloudflare Workers (no TCP). ioredis used in Node.js worker.
- The client interface must be identical regardless of the underlying adapter.
- This is a leaf node: only imports node_modules.

## Never Do
- Don't hardcode which adapter to use — inject via config.
- Don't import from `slices/*`, `apps/*`, or other `shared/*` packages.
- Don't expose adapter-specific APIs through the shared interface.
