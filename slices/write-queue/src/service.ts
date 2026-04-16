import { randomUUID } from 'node:crypto';
import {
  type ClaimedMessage,
  type QueueRedisClient,
  ackMessage,
  claimNext,
  enqueue,
  ensureStreamGroup,
} from '@acid-sheets/queue';
import type { Db } from '@acid-sheets/shared-db';
import { type Logger, createLogger } from '@acid-sheets/shared-logger';
import { InternalError } from '@acid-sheets/shared-types';
import {
  findLedgerByIdempotencyKey,
  insertLedger,
  tryAdvisoryXactLock,
  updateLedgerStatus,
} from './repo.js';
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
  await insertLedger({
    db,
    sheetId,
    idempotencyKey: idempotencyKey ?? null,
    writeId,
  });

  const streamKey = streamKeyForSheet(sheetId);
  const { messageId } = await enqueue({
    redis,
    streamKey,
    message: { writeId, idempotencyKey, payload },
  });

  log.debug({ sheetId, writeId, messageId }, 'enqueued');
  return { writeId, status: 'enqueued', messageId };
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
