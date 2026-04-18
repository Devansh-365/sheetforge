import { type Db, schema } from '@sheetforge/shared-db';
import { eq } from 'drizzle-orm';

export interface UpsertUserArgs {
  db: Db;
  email: string;
  googleRefreshToken: string | null;
}

export interface UserRow {
  id: string;
  email: string;
  createdAt: Date;
}

/**
 * Atomic upsert on users.email — relies on the unique constraint declared in
 * the schema. The previous select-then-insert version would 500 on concurrent
 * first-time logins for the same email (both txns saw no row, both INSERTed,
 * the second hit a unique violation).
 */
export async function upsertUserByEmail({
  db,
  email,
  googleRefreshToken,
}: UpsertUserArgs): Promise<UserRow> {
  const now = new Date();

  const inserted = await db
    .insert(schema.users)
    .values({ email, googleRefreshToken, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: schema.users.email,
      set: { googleRefreshToken, updatedAt: now },
    })
    .returning({
      id: schema.users.id,
      email: schema.users.email,
      createdAt: schema.users.createdAt,
    });

  const row = inserted[0];
  if (!row) {
    throw new Error('upsert into users did not return a row');
  }
  return row;
}

export async function getUserById({
  db,
  userId,
}: {
  db: Db;
  userId: string;
}): Promise<UserRow | null> {
  const rows = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function findRefreshTokenByUserId({
  db,
  userId,
}: {
  db: Db;
  userId: string;
}): Promise<string | null> {
  const rows = await db
    .select({ googleRefreshToken: schema.users.googleRefreshToken })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  return rows[0]?.googleRefreshToken ?? null;
}
