import { type Db, schema } from '@acid-sheets/shared-db';
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
