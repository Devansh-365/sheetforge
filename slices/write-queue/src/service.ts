import { randomUUID } from 'node:crypto';
import {
  type ClaimedMessage,
  type EnqueueMessage,
  type QueueRedisClient,
  ackMessage,
  claimNext,
  enqueue,
  ensureStreamGroup,
} from '@sheetforge/queue';
import type { Db } from '@sheetforge/shared-db';
import { type Logger, createLogger } from '@sheetforge/shared-logger';
import { InternalError } from '@sheetforge/shared-types';
import {
  countLedgerByStatus,
  findLedgerByIdempotencyKey,
  findRecentLedger,
  getLedgerStatus,
  insertLedger,
  insertOutbox,
  markOutboxSent,
  tryAdvisoryXactLock,
  updateLedgerStatus,
} from './repo.js';
import type { WriteLedgerRow, WriteLedgerStatus } from './types.js';
import { type SubmitResult, type WritePayload, streamKeyForSheet } from './types.js';

/**
 * The ONE ingress point for every write in the system. No REST handler,
 * worker, or CLI may enqueue directly via `packages/queue` — all paths land
 * here so idempotency dedupe and ledger tracking are inescapable.
 *
 * Enforcement: eslint-plugin-boundaries + no-restricted-imports ban any file
 * outside this slice from importing `packages/queue/src/producer*` or
 * `packages/queue/src/internal/**`.
 */
export async function submitWrite({
  db,
  redis,
  sheetId,
  payload,
  idempotencyKey,
  logger,
}: {
  db: Db;
  redis: QueueRedisClient;
  sheetId: string;
  payload: WritePayload;
  idempotencyKey?: string;
  logger?: Logger;
}): Promise<SubmitResult> {
  const log = logger ?? createLogger({ service: 'write-queue' });

  if (idempotencyKey !== undefined) {
    const prior = await findLedgerByIdempotencyKey({
      db,
      sheetId,
      idempotencyKey,
    });
    if (prior) {
      // Replay — callers get the original writeId back. Don't surface a 409 to
      // the client: retries are a feature, not an error. The ledger row's
      // status tells the caller whether the original attempt finished.
      log.debug(
        { sheetId, idempotencyKey, writeId: prior.writeId, status: prior.status },
        'idempotency-replay',
      );
      return { writeId: prior.writeId, status: 'replayed' };
    }
  }

  const writeId = randomUUID();
  const streamKey = streamKeyForSheet(sheetId);
  const envelope: EnqueueMessage<WritePayload> = { writeId, idempotencyKey, payload };

  // Atomic commit of the ledger row + outbox envelope. The outbox closes
  // the gap where a process death between the INSERT and the Redis XADD
  // would leave a "pending" ledger row with no stream entry — permanently
  // lost. By staging the envelope in Postgres within the same transaction,
  // a background drain worker can later re-XADD anything the inline path
  // didn't manage to deliver.
  let outboxId: string;
  try {
    outboxId = await (
      db as unknown as {
        transaction: <T>(cb: (tx: Db) => Promise<T>) => Promise<T>;
      }
    ).transaction(async (tx) => {
      await insertLedger({
        db: tx,
        sheetId,
        idempotencyKey: idempotencyKey ?? null,
        writeId,
      });
      return await insertOutbox({
        db: tx,
        writeId,
        sheetId,
        streamKey,
        envelope,
      });
    });
  } catch (err) {
    // Concurrent submitWrite() raced us between the find above and the
    // transaction here. The partial unique index on
    // (sheet_id, idempotency_key) catches it; treat as a replay so the
    // caller still gets ONE writeId per key.
    if (idempotencyKey !== undefined && isUniqueViolation(err)) {
      const prior = await findLedgerByIdempotencyKey({
        db,
        sheetId,
        idempotencyKey,
      });
      if (prior) {
        log.debug(
          { sheetId, idempotencyKey, writeId: prior.writeId, status: prior.status },
          'idempotency-replay-after-race',
        );
        return { writeId: prior.writeId, status: 'replayed' };
      }
      // Race-loser found nothing — winner must have rolled back. Don't
      // leak the raw constraint name to clients via the 500 message.
      throw new InternalError('write submission failed; please retry');
    }
    throw err;
  }

  // Best-effort inline XADD — keeps happy-path latency low. On success
  // we mark the outbox row sent so the drain skips it. On failure the
  // drain worker will pick it up within ~1s; the extra stream entry it
  // might later produce is absorbed by processNext's skip-if-completed
  // guard.
  let messageId: string | undefined;
  try {
    const { messageId: mid } = await enqueue({ redis, streamKey, message: envelope });
    messageId = mid;
    try {
      await markOutboxSent({ db, id: outboxId });
    } catch (markErr) {
      log.warn(
        {
          err: markErr instanceof Error ? markErr.message : String(markErr),
          outboxId,
          writeId,
        },
        'outbox-mark-sent-failed',
      );
    }
  } catch (enqueueErr) {
    log.warn(
      {
        err: enqueueErr instanceof Error ? enqueueErr.message : String(enqueueErr),
        writeId,
        outboxId,
      },
      'inline-xadd-failed-drain-will-retry',
    );
  }

  log.debug({ sheetId, writeId, messageId, outboxId }, 'enqueued');
  return { writeId, status: 'enqueued', messageId };
}

/**
 * postgres-js surfaces unique-violation errors with code '23505'. Drizzle
 * preserves that on the thrown error object.
 */
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === '23505'
  );
}

export type ProcessOutcome = 'processed' | 'no-work' | 'locked-elsewhere';

/**
 * Consumer loop step — pulls one message, acquires a per-sheet Postgres
 * advisory lock, runs the handler, updates the ledger, and acks. Call this
 * repeatedly from `apps/worker`.
 *
 * The advisory lock is held for the duration of the DB transaction, which
 * includes the Google Sheets API call. A stale lease can't write because
 * Postgres guarantees only one session holds the lock at a time — no hand-
 * rolled fencing tokens needed.
 */
export async function processNext<P extends WritePayload>({
  db,
  redis,
  streamKey,
  group,
  consumer,
  handler,
  blockMs,
  logger,
}: {
  db: Db;
  redis: QueueRedisClient;
  streamKey: string;
  group: string;
  consumer: string;
  handler: (msg: ClaimedMessage<P>) => Promise<void>;
  blockMs?: number;
  logger?: Logger;
}): Promise<ProcessOutcome> {
  const log = logger ?? createLogger({ service: 'write-queue' });

  await ensureStreamGroup({ redis, streamKey, group });
  const msg = await claimNext<P>({
    redis,
    streamKey,
    group,
    consumer,
    blockMs,
  });
  if (!msg) return 'no-work';

  let processedInsideTx = false;

  try {
    await (
      db as unknown as {
        transaction: (cb: (tx: Db) => Promise<void>) => Promise<void>;
      }
    ).transaction(async (tx) => {
      const gotLock = await tryAdvisoryXactLock({ db: tx, key: streamKey });
      if (!gotLock) {
        log.debug({ streamKey, writeId: msg.writeId }, 'lock-held-elsewhere');
        return; // transaction commits without touching the ledger
      }

      // Guard against duplicate stream delivery: Redis PEL redelivery or
      // the outbox drain re-XADDing the same writeId can land a message
      // for work already completed. Running the handler again would
      // write the same row twice. Short-circuit to "safe to ack" instead.
      const currentStatus = await getLedgerStatus({ db: tx, writeId: msg.writeId });
      if (currentStatus === 'completed' || currentStatus === 'dead_lettered') {
        log.debug({ streamKey, writeId: msg.writeId, currentStatus }, 'skip-already-terminal');
        processedInsideTx = true;
        return;
      }

      await updateLedgerStatus({
        db: tx,
        writeId: msg.writeId,
        status: 'processing',
      });

      try {
        await handler(msg);
        await updateLedgerStatus({
          db: tx,
          writeId: msg.writeId,
          status: 'completed',
          completedAt: new Date(),
        });
        processedInsideTx = true;
      } catch (err) {
        await updateLedgerStatus({
          db: tx,
          writeId: msg.writeId,
          status: 'failed',
        });
        throw err;
      }
    });
  } catch (err) {
    log.warn(
      { err: err instanceof Error ? err.message : String(err), writeId: msg.writeId },
      'handler-failed',
    );
    // Don't ack — Redis PEL will redeliver after idle timeout so another
    // worker (or this one after a transient fix) can try again.
    throw err instanceof Error ? err : new InternalError('handler failed');
  }

  if (processedInsideTx) {
    await ackMessage({
      redis,
      streamKey,
      group,
      messageId: msg.messageId,
    });
    log.debug({ writeId: msg.writeId, messageId: msg.messageId }, 'acked');
    return 'processed';
  }

  return 'locked-elsewhere';
}

// Helper re-export so consumers of the slice barrel can sidestep the
// producer/consumer import dance.
export { streamKeyForSheet } from './types.js';

export interface LedgerStats {
  stats: Record<WriteLedgerStatus, number>;
  recent: WriteLedgerRow[];
}

const EMPTY_STATS: Record<WriteLedgerStatus, number> = {
  pending: 0,
  processing: 0,
  completed: 0,
  failed: 0,
  dead_lettered: 0,
};

export async function getLedgerStats({
  db,
  sheetId,
  recentLimit = 20,
}: {
  db: Db;
  sheetId: string;
  recentLimit?: number;
}): Promise<LedgerStats> {
  const [counts, recent] = await Promise.all([
    countLedgerByStatus({ db, sheetId }),
    findRecentLedger({ db, sheetId, limit: recentLimit }),
  ]);
  const stats = { ...EMPTY_STATS };
  for (const c of counts) stats[c.status] = c.count;
  return { stats, recent };
}
