# apps/api

## Purpose
HTTP entry + inline write-queue processor for the V0 demo. Runs on Node via `@hono/node-server`. Will be ported to Cloudflare Workers in a follow-up pass (Hono app stays; processor moves to a separate worker).

## Key Files
- `src/env.ts` — Zod-validated env loader; fails fast on bad config
- `src/index.ts` — boots the Hono app, connects DB + Redis, starts the inline processor loop
- `src/processor.ts` — per-tick scan of connected sheets, calls `processNext` for each

## Env required
See `.env.example` at the repo root. Fails to boot if any required var is missing.

## Inline processor mode
For a solo V0 demo, the API process also runs the write-queue consumer in a background loop (`PROCESSOR_ENABLED=true`). This keeps the deploy count at one. When traffic picks up, flip `PROCESSOR_ENABLED=false` here and run `apps/worker` separately.

## Gotchas
- The inline loop acquires a Postgres advisory lock per sheet — make sure your DB connection pool is sized at least `sheets × 2` so the API layer isn't starved.
- On CF Workers, this inline pattern will not work (no long-running transactions). Port the processor to `apps/worker` before the Workers migration.
- `SIGTERM` gracefully quits the Redis client; ioredis otherwise hangs for the full reconnect timeout.

## Never Do
- Don't write to Google Sheets from here directly — always through `submitWrite`.
- Don't put business logic in this app — delegate to slices.
- Don't ack a queue message before the handler's DB transaction commits (the write-queue slice already enforces this — don't bypass it).
