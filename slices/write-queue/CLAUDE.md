# slices/write-queue

## Purpose
HEADLINE FEATURE: serialized, idempotent write queue ensuring race-condition-safe writes to Google Sheets.

## WARNING — CORRECTNESS CRITICAL
This slice is the product's core correctness guarantee. Every change requires:
1. A failing concurrency test BEFORE any implementation (TDD, no exceptions).
2. Review by `test-engineer` and `code-reviewer` agents before merge.
3. Use `superpowers:test-driven-development` agent for all work here.
The product dies if this is wrong.

## Public API
Exported from `index.ts`:
- `enqueueWrite(sheetId, payload, idempotencyKey)` — add write to Redis Stream
- `getWriteStatus(idempotencyKey)` — check write result by idempotency key

## Key Files
- `service.ts` — enqueue logic, idempotency key deduplication
- `repo.ts` — Redis Stream + Postgres write-result persistence
- `types.ts` — Zod schemas: WriteJob, WriteResult, WriteStatus

## Gotchas
- Idempotency keys must be stored and checked BEFORE enqueuing to Redis.
- The advisory lock is acquired by `apps/worker`, not here.
- Duplicate submissions with same key must return the original result, not enqueue again.

## Never Do
- Don't call Google Sheets API from this slice — that's `apps/worker`'s job.
- Don't skip the concurrency test requirement for any change.
- Don't import another slice's internals — only their `index.ts`.
