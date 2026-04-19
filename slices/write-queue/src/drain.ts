import { type QueueRedisClient, enqueue } from '@sheetforge/queue';
import { type Db, schema } from '@sheetforge/shared-db';
import { type Logger, createLogger } from '@sheetforge/shared-logger';
import { and, asc, isNull, lt } from 'drizzle-orm';
import { markOutboxSent } from './repo.js';

export interface DrainOutcome {
  claimed: number;
  sent: number;
  failed: number;
}

/**
 * One tick of the outbox drain loop. Scans for unsent envelopes older than
 * `staleMs` and XADDs each to its stream. Marks the row sent on success;
 * leaves it for the next tick on failure.
 *
 * The staleness threshold deliberately skips rows the inline submitWrite
 * XADD is still trying to deliver. Without it the drain would race the
 * inline path and produce a duplicate stream message on every write.
 *
 * Duplicates remain possible if two drain workers run against the same
 * database (or if mark-sent lost a write after a successful inline XADD).
 * processNext's skip-if-completed guard absorbs them harmlessly — the row
 * lands once, later stream deliveries short-circuit to ack.
 */
export async function drainOutboxTick({
  db,
  redis,
  batchSize = 50,
  staleMs = 1000,
  logger,
}: {
  db: Db;
  redis: QueueRedisClient;
  batchSize?: number;
  staleMs?: number;
  logger?: Logger;
}): Promise<DrainOutcome> {
  const log = logger ?? createLogger({ service: 'write-queue-drain' });
  const cutoff = new Date(Date.now() - staleMs);

  const candidates = await db
    .select({
      id: schema.writeOutbox.id,
      writeId: schema.writeOutbox.writeId,
      streamKey: schema.writeOutbox.streamKey,
      envelope: schema.writeOutbox.envelope,
    })
    .from(schema.writeOutbox)
    .where(and(isNull(schema.writeOutbox.sentAt), lt(schema.writeOutbox.createdAt, cutoff)))
    .orderBy(asc(schema.writeOutbox.createdAt))
    .limit(batchSize);

  let sent = 0;
  let failed = 0;
  for (const row of candidates) {
    try {
      // envelope is jsonb on the column. submitWrite wrote it as an
      // EnqueueMessage<WritePayload>; trust that shape round-trips cleanly.
      await enqueue({
        redis,
        streamKey: row.streamKey,
        message: row.envelope as { writeId: string; idempotencyKey?: string; payload: unknown },
      });
      await markOutboxSent({ db, id: row.id });
      sent++;
    } catch (err) {
      log.warn(
        {
          err: err instanceof Error ? err.message : String(err),
          outboxId: row.id,
          writeId: row.writeId,
        },
        'drain-xadd-failed',
      );
      failed++;
    }
  }

  if (candidates.length > 0) {
    log.debug({ claimed: candidates.length, sent, failed }, 'drain-tick');
  }

  return { claimed: candidates.length, sent, failed };
}
