import { randomUUID } from 'node:crypto';
import type { QueueRedisClient } from '@sheetforge/queue';
import { type Db, schema } from '@sheetforge/shared-db';
import { ValidationError } from '@sheetforge/shared-types';
import { submitWrite } from '@sheetforge/slice-write-queue';
import { and, eq, like } from 'drizzle-orm';
import type { HammerRunResult, HammerStatus, HammerWrite } from './types.js';
import { DEMO_SHEET_ID } from './types.js';

const MAX_N = 50;

export async function hammerRun({
  db,
  redis,
  n,
}: {
  db: Db;
  redis: QueueRedisClient;
  n: number;
}): Promise<HammerRunResult> {
  if (!Number.isFinite(n) || n < 1 || n > MAX_N) {
    throw new ValidationError(`n must be between 1 and ${MAX_N}`);
  }
  const runId = randomUUID();
  const dispatchedAt = new Date();

  // Fire all writes in parallel — this is the point of the demo.
  await Promise.all(
    Array.from({ length: n }, (_, i) =>
      submitWrite({
        db,
        redis,
        sheetId: DEMO_SHEET_ID,
        payload: { op: 'append', data: { runId, ordinal: i } },
        idempotencyKey: `hammer:${runId}:${i}`,
      }),
    ),
  );

  return { runId, n, dispatchedAt: dispatchedAt.toISOString() };
}

export async function getHammerStatus({
  db,
  runId,
}: {
  db: Db;
  runId: string;
}): Promise<HammerStatus> {
  const rows = await db
    .select()
    .from(schema.writeLedger)
    .where(
      and(
        eq(schema.writeLedger.sheetId, DEMO_SHEET_ID),
        like(schema.writeLedger.idempotencyKey, `hammer:${runId}:%`),
      ),
    );

  const writes: HammerWrite[] = rows
    .map((r): HammerWrite => {
      const key = r.idempotencyKey ?? '';
      const ordinalStr = key.split(':')[2] ?? '0';
      return {
        writeId: r.writeId,
        ordinal: Number(ordinalStr) || 0,
        idempotencyKey: key,
        enqueuedAt: r.enqueuedAt.toISOString(),
        completedAt: r.completedAt?.toISOString() ?? null,
        status: r.status,
      };
    })
    // Sort by completedAt so visitors see writes arrive in serialized order.
    // Still-pending rows sink to the bottom ordered by enqueuedAt.
    .sort((a, b) => {
      if (a.completedAt && b.completedAt) {
        return a.completedAt.localeCompare(b.completedAt);
      }
      if (a.completedAt) return -1;
      if (b.completedAt) return 1;
      return a.enqueuedAt.localeCompare(b.enqueuedAt);
    });

  const done =
    writes.length > 0 &&
    writes.every(
      (w) => w.status === 'completed' || w.status === 'failed' || w.status === 'dead_lettered',
    );

  return { runId, writes, done };
}
