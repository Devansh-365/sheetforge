import { type Db, schema } from '@sheetforge/shared-db';
import { desc, eq } from 'drizzle-orm';
import type { ColumnDescriptor, SchemaSnapshot } from './types.js';

export async function insertSchemaSnapshot({
  db,
  sheetId,
  columns,
  version,
}: {
  db: Db;
  sheetId: string;
  columns: ColumnDescriptor[];
  version: number;
}): Promise<SchemaSnapshot> {
  const [row] = await db.insert(schema.schemas).values({ sheetId, columns, version }).returning();
  if (!row) throw new Error('insert into schemas did not return a row');
  return {
    id: row.id,
    sheetId: row.sheetId,
    columns: row.columns as ColumnDescriptor[],
    version: row.version,
    generatedAt: row.generatedAt,
  };
}

export async function findLatestSchemaBySheetId({
  db,
  sheetId,
}: {
  db: Db;
  sheetId: string;
}): Promise<SchemaSnapshot | null> {
  const rows = await db
    .select()
    .from(schema.schemas)
    .where(eq(schema.schemas.sheetId, sheetId))
    .orderBy(desc(schema.schemas.version))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    sheetId: row.sheetId,
    columns: row.columns as ColumnDescriptor[],
    version: row.version,
    generatedAt: row.generatedAt,
  };
}
