# apps/api

## Purpose
Edge API on Cloudflare Workers via Hono. Accepts `Idempotency-Key`. Only enqueues writes via `slices/write-queue`; never writes to Sheets directly.

## Public API
None — this is an entrypoint, not a library.

## Key Files
- `src/index.ts` — Hono app entrypoint, route registration
- `wrangler.toml` — Cloudflare Workers config (to be created)

## Gotchas
- Runs on the Cloudflare Workers runtime — no Node.js built-ins.
- Every write endpoint must validate `Idempotency-Key` header before enqueuing.
- Reads may use the cached read path; writes always go through `slices/write-queue`.

## Never Do
- Don't call Google Sheets API directly for writes.
- Don't put business logic here — delegate to slices.
- Don't use Node.js APIs incompatible with the Workers runtime.
