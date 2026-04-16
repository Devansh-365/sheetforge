# slices/demo

## Purpose
Public anonymous concurrency demo for the landing page. Fires N parallel writes at a sentinel "demo sheet" through the real write-queue pipeline, so visitors can see per-sheet serialization prove itself live.

## Public API (barrel)
- `DEMO_SHEET_ID` — sentinel UUID the processor recognizes as "noop sink" (skip Google call).
- `hammerRun({ db, redis, n })` — submits N parallel writes with idempotency keys of the form `hammer:<runId>:<i>`. Returns `{ runId, n, dispatchedAt }`.
- `getHammerStatus({ db, runId })` — returns ledger rows for this run ordered by `completedAt` ascending (the natural proof of serialization).
- Types: `HammerRunResult`, `HammerStatus`, `HammerWrite`.

## Correctness model
The demo reuses `submitWrite` from `slices/write-queue` — same advisory lock, same ledger, same Redis stream. The only thing bypassed is the Google Sheets API call (handled by a sentinel check in `apps/api/src/processor.ts`). The visible ordering of ledger `completedAt` timestamps IS the serialization proof.

## Abuse model
This slice exposes no auth. Rate limiting lives in `slices/rest-api` (per-IP Redis counter) because it's an HTTP concern.

## Never Do
- Don't let `hammerRun` accept `n > 100` — cap at the slice boundary.
- Don't add auth here; the endpoint must work for anonymous visitors.
- Don't import another slice's internals — only barrels.
