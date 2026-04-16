# slices/write-queue

## Purpose
HEADLINE FEATURE. The one ingress point for every write in the system. Enforces idempotency dedupe, per-sheet serialisation (via Postgres advisory lock in the consumer), and ledger-tracked status.

## Public API (barrel)
- `submitWrite({ db, redis, sheetId, payload, idempotencyKey?, logger? })` — the ONLY enqueue path. Returns `{ writeId, status: 'enqueued' | 'replayed', messageId? }`. Replay is not an error: callers retrying with the same idempotency key get the original writeId back.
- `processNext({ db, redis, streamKey, group, consumer, handler, blockMs?, logger? })` — consumer loop step. Pulls one message, acquires a per-sheet advisory lock, runs the handler under it, updates the ledger, acks. Called repeatedly from `apps/worker`.
- `streamKeyForSheet(sheetId)` — `acid:writes:{sheetId}` convention.
- Types: `SubmitResult`, `WritePayload`, `WriteLedgerRow`, `WriteLedgerStatus`, `ProcessOutcome`. Zod: `WritePayloadSchema`.

## Correctness model
1. **Ingress idempotency** — on a known idempotency key for the same sheet, return the original writeId without re-enqueueing. Prevents duplicate rows on client retries.
2. **Per-sheet serialisation** — the worker wraps the handler in a DB transaction; inside the transaction it calls `pg_try_advisory_xact_lock(hashtextextended(streamKey, 0))`. Only one session holds the lock at a time. Postgres releases it on commit/rollback automatically — no hand-rolled fencing tokens.
3. **Crash safety** — we only ack the Redis stream message AFTER the DB transaction commits. If the worker crashes mid-handler, the transaction rolls back, PEL redelivers the message, and idempotency dedupe (via the ledger) catches the replay.
4. **No writes bypass this path** — ESLint bans importing `packages/queue/src/producer*` from anywhere except this slice (see `eslint.config.mjs` + `no-restricted-imports`).

## Runtime assumption
`processNext` must run on a platform that can hold a long-lived Postgres transaction — i.e. `apps/worker` (Fly.io / Railway / long-lived Node). CF Workers cannot call `processNext` because the Neon serverless driver cannot hold a transaction across a 1–5s Sheets API call. CF Workers call `submitWrite` only.

## Never Do
- Don't call Google Sheets directly from this slice — the handler passed to `processNext` does that (typically wired in `apps/worker` using `shared/google`).
- Don't ack a message before the ledger update commits.
- Don't skip the advisory lock — it is the atomic fencing guarantee.
- Don't import another slice's internals — only barrels.
