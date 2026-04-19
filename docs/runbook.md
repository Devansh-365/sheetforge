# Runbook

Operational playbook for common sheetforge incidents. Commands assume you have `psql`, `redis-cli`, and `pnpm` available, plus shell access to the API host.

## Restart the API

```bash
# find the running process
ps aux | grep '@sheetforge/api'

# graceful stop (SIGTERM flushes the Redis client cleanly; see apps/api/src/index.ts)
kill -15 <pid>

# start it back up
cd apps/api && pnpm dev          # local / interactive
# or via your process manager in production
```

If the API refuses to boot, the env validator in `apps/api/src/env.ts` prints exactly which variable is wrong. Fix the `.env` and restart.

## Inspect stuck writes

Writes are "stuck" when their ledger row is `pending` or `processing` far longer than expected. Two root causes cover almost every case.

### 1. Outbox never drained

```sql
-- rows where the inline XADD missed and the drain loop hasn't caught up
SELECT id, write_id, sheet_id, stream_key, created_at, attempts
FROM write_outbox
WHERE sent_at IS NULL
ORDER BY created_at ASC
LIMIT 50;
```

If rows are older than ~10 seconds, the drain loop is not running. Check API logs for `outbox-drain-starting` at boot and `outbox-drain-tick-failed` since. Restart the API to respawn the loop.

### 2. Advisory lock contention

The consumer blocks on `pg_try_advisory_xact_lock`. If one sheet has a handler that hangs, its lock holds and every later write to that sheet queues up.

```sql
-- which sheets have long-running writes?
SELECT sheet_id, status, COUNT(*) AS n, MIN(enqueued_at) AS oldest
FROM write_ledger
WHERE status IN ('pending', 'processing')
GROUP BY sheet_id, status
ORDER BY oldest ASC;
```

```sql
-- who holds advisory locks right now?
SELECT pid, pg_blocking_pids(pid) AS blocked_by, query
FROM pg_stat_activity
WHERE wait_event_type = 'Lock' OR state = 'active';
```

If a handler is genuinely stuck (Sheets API timeout), kill the PG backend with `SELECT pg_cancel_backend(<pid>);`. The transaction rolls back, the advisory lock releases, and the next `processNext` picks up the pending messages.

## Replay from the ledger

If a handler failed and Redis lost the message (unlikely — PEL redelivery catches this automatically), you can force a re-enqueue from the outbox.

```sql
-- mark the row unsent so the drain worker picks it up again
UPDATE write_outbox
SET sent_at = NULL, attempts = 0
WHERE write_id = '<write-id>';
```

The `skip-if-completed` guard in `processNext` makes this safe even if the write already landed — the second delivery short-circuits to ack.

If a ledger row is stuck in `processing` and you know the handler died:

```sql
UPDATE write_ledger
SET status = 'pending'
WHERE write_id = '<write-id>' AND status = 'processing';
```

Next processor tick will re-claim the Redis message (PEL redelivery) and retry.

## Redis stream inspection

```bash
# what's queued for a specific sheet
redis-cli XLEN acid:writes:<sheet-id>

# what's in the pending list (claimed but not acked)
redis-cli XPENDING acid:writes:<sheet-id> <consumer-group>

# the first 10 pending entries in detail
redis-cli XRANGE acid:writes:<sheet-id> - + COUNT 10
```

Consumer group is typically `sheetforge-processor`. See `apps/api/src/processor.ts` for the exact name in use.

## Rotate API keys

A leaked `sk_live_...` needs to be revoked immediately.

```sql
-- find the key by its plaintext prefix (first chars the user copied)
SELECT id, project_id, prefix, last_used_at
FROM api_keys
WHERE prefix = '<first-chars-of-leaked-key>';

-- delete it (cascades to nothing; projects and sheets are untouched)
DELETE FROM api_keys WHERE id = '<api-key-id>';
```

Then message the user via the dashboard's support email and ask them to generate a replacement. Never print or log the plaintext key — the database only stores the hash plus a display prefix.

## Draining the queue before a deploy

```bash
# 1. stop accepting new writes — set a maintenance flag or drop traffic at the LB
# 2. wait for the pending count to hit zero
watch -n 1 'psql -c "SELECT status, COUNT(*) FROM write_ledger WHERE status IN (\"pending\", \"processing\") GROUP BY status"'
# 3. once zero, rotate the process
# 4. re-admit traffic
```

## Log patterns to grep

| Pattern | Meaning |
|---------|---------|
| `idempotency-replay` | caller retried with a known key; not an error |
| `lock-held-elsewhere` | another worker is handling this sheet right now; expected under concurrency |
| `skip-already-terminal` | duplicate stream delivery landed on a completed writeId; the guard caught it |
| `inline-xadd-failed-drain-will-retry` | submitWrite's inline XADD missed; the drain loop will pick it up |
| `outbox-mark-sent-failed` | XADD succeeded but the follow-up UPDATE failed; drain may re-XADD, processNext will dedupe |
| `drain-xadd-failed` | the drain couldn't reach Redis for a specific envelope; next tick retries |
| `handler-failed` | the write failed inside the transaction; PEL will redeliver |

## When in doubt

- Read `CLAUDE.md` at the repo root for the architectural guardrails.
- Read `slices/write-queue/CLAUDE.md` for the correctness model (idempotency, advisory-lock fencing, ack-after-commit).
- Every write flows through `submitWrite`. If something looks like it skipped the queue, the ESLint boundary rule was bypassed.
