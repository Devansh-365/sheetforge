# apps/worker

## Purpose
Fly.io long-lived write-queue consumer. Consumes Redis Streams, holds per-sheet Postgres advisory lock, calls Google Sheets API.

## Public API
None — this is an entrypoint, not a library.

## Key Files
- `src/index.ts` — consumer loop entrypoint
- `fly.toml` — Fly.io config (to be created)

## Gotchas
- Must hold a Postgres advisory lock per sheet before processing any write.
- Advisory lock prevents concurrent workers from writing to the same sheet simultaneously.
- Crashes must be safe: Redis Streams XACK only after successful Sheets API write.

## Never Do
- Don't process writes without acquiring the advisory lock first.
- Don't XACK a message before the Sheets API write is confirmed.
- Don't import from `slices/*` internals — only barrels.
