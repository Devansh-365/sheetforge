import { type Db, schema } from '@acid-sheets/shared-db';
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
 * Find-or-insert on users.email. Deliberately not using ON CONFLICT DO UPDATE
 * because a unique constraint on `email` hasn't been declared in the schema
 * yet; a follow-up migration will add it and this can collapse to an upsert.
 */
export async function upsertUserByEmail({
  db,
  email,
  googleRefreshToken,
}: UpsertUserArgs): Promise<UserRow> {
  const now = new Date();

  const existing = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  if (existing[0]) {
    await db
      .update(schema.users)
      .set({ googleRefreshToken, updatedAt: now })
      .where(eq(schema.users.id, existing[0].id));
    return existing[0];
  }

  const inserted = await db
    .insert(schema.users)
    .values({ email, googleRefreshToken, createdAt: now, updatedAt: now })
    .returning({
      id: schema.users.id,
      email: schema.users.email,
      createdAt: schema.users.createdAt,
    });

  const row = inserted[0];
  if (!row) {
    throw new Error('insert into users did not return a row');
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
