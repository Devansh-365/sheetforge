import { type Db, schema } from '@sheetforge/shared-db';
import { and, eq, sql } from 'drizzle-orm';
import type { WriteLedgerRow, WriteLedgerStatus } from './types.js';

export async function findLedgerByIdempotencyKey({
  db,
  sheetId,
  idempotencyKey,
}: {
  db: Db;
  sheetId: string;
  idempotencyKey: string;
}): Promise<WriteLedgerRow | null> {
  const rows = await db
    .select()
    .from(schema.writeLedger)
    .where(
      and(
        eq(schema.writeLedger.sheetId, sheetId),
        eq(schema.writeLedger.idempotencyKey, idempotencyKey),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return toLedgerRow(row);
}

export async function insertLedger({
  db,
  sheetId,
  idempotencyKey,
  writeId,
}: {
  db: Db;
  sheetId: string;
  idempotencyKey: string | null;
  writeId: string;
}): Promise<WriteLedgerRow> {
  const [row] = await db
    .insert(schema.writeLedger)
    .values({ sheetId, idempotencyKey, writeId, status: 'pending' })
    .returning();
  if (!row) throw new Error('insert into write_ledger did not return a row');
  return toLedgerRow(row);
}

export async function updateLedgerStatus({
  db,
  writeId,
  status,
  completedAt,
}: {
  db: Db;
  writeId: string;
  status: WriteLedgerStatus;
  completedAt?: Date;
}): Promise<void> {
  await db
    .update(schema.writeLedger)
    .set({ status, ...(completedAt ? { completedAt } : {}) })
    .where(eq(schema.writeLedger.writeId, writeId));
}

/**
 * Read-only status lookup used by processNext to skip duplicate stream
 * deliveries (PEL redelivery or outbox drain re-XADD). Returns null if the
 * ledger row doesn't exist, which is itself a signal that the write was
 * never accepted — caller should treat as "safe to ack and move on."
 */
export async function getLedgerStatus({
  db,
  writeId,
}: {
  db: Db;
  writeId: string;
}): Promise<WriteLedgerStatus | null> {
  const rows = await db
    .select({ status: schema.writeLedger.status })
    .from(schema.writeLedger)
    .where(eq(schema.writeLedger.writeId, writeId))
    .limit(1);
  return (rows[0]?.status ?? null) as WriteLedgerStatus | null;
}

/**
 * Outbox insert — runs inside submitWrite's transaction so the ledger row
 * and the queue envelope commit atomically. Returns the outbox row id so
 * the caller can mark it sent after a successful inline XADD.
 */
export async function insertOutbox({
  db,
  writeId,
  sheetId,
  streamKey,
  envelope,
}: {
  db: Db;
  writeId: string;
  sheetId: string;
  streamKey: string;
  envelope: unknown;
}): Promise<string> {
  const [row] = await db
    .insert(schema.writeOutbox)
    .values({ writeId, sheetId, streamKey, envelope })
    .returning({ id: schema.writeOutbox.id });
  if (!row) throw new Error('insert into write_outbox did not return a row');
  return row.id;
}

/**
 * Mark an outbox row as sent so the drain worker skips it. Called best-
 * effort after an inline XADD succeeds; if this fails the drain worker
 * may re-XADD, but processNext's skip-if-completed guard prevents the
 * handler from running twice.
 */
export async function markOutboxSent({
  db,
  id,
}: {
  db: Db;
  id: string;
}): Promise<void> {
  await db
    .update(schema.writeOutbox)
    .set({ sentAt: new Date() })
    .where(eq(schema.writeOutbox.id, id));
}

/**
 * Postgres advisory lock scoped to a single transaction. Returns true if the
 * lock was acquired, false if another transaction currently holds it. Released
 * automatically when the transaction commits or rolls back — this is the
 * fencing-token guarantee we rely on (atomic, race-free).
 */
export async function tryAdvisoryXactLock({
  db,
  key,
}: {
  db: Db;
  key: string;
}): Promise<boolean> {
  const rows = await db.execute<{ acquired: boolean }>(
    sql`SELECT pg_try_advisory_xact_lock(hashtextextended(${key}::text, 0)) AS acquired`,
  );
  // drizzle-orm/postgres-js returns an array-like result
  const first = (rows as unknown as Array<{ acquired: boolean }>)[0];
  return Boolean(first?.acquired);
}

export interface LedgerStatusCount {
  status: WriteLedgerStatus;
  count: number;
}

export async function countLedgerByStatus({
  db,
  sheetId,
}: {
  db: Db;
  sheetId: string;
}): Promise<LedgerStatusCount[]> {
  const rows = await db
    .select({
      status: schema.writeLedger.status,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.writeLedger)
    .where(eq(schema.writeLedger.sheetId, sheetId))
    .groupBy(schema.writeLedger.status);
  return rows.map((r) => ({
    status: r.status as WriteLedgerStatus,
    count: r.count,
  }));
}

export async function findRecentLedger({
  db,
  sheetId,
  limit = 20,
}: {
  db: Db;
  sheetId: string;
  limit?: number;
}): Promise<WriteLedgerRow[]> {
  const rows = await db
    .select()
    .from(schema.writeLedger)
    .where(eq(schema.writeLedger.sheetId, sheetId))
    .orderBy(sql`${schema.writeLedger.enqueuedAt} desc`)
    .limit(limit);
  return rows.map(toLedgerRow);
}

function toLedgerRow(row: typeof schema.writeLedger.$inferSelect): WriteLedgerRow {
  return {
    id: row.id,
    sheetId: row.sheetId,
    idempotencyKey: row.idempotencyKey,
    writeId: row.writeId,
    status: row.status,
    enqueuedAt: row.enqueuedAt,
    completedAt: row.completedAt,
  };
}
