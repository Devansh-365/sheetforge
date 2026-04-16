import { type Db, schema } from '@acid-sheets/shared-db';
import { and, eq } from 'drizzle-orm';
import type { SheetRecord } from './types.js';

export async function insertSheet({
  db,
  projectId,
  googleSheetId,
  tabName,
}: {
  db: Db;
  projectId: string;
  googleSheetId: string;
  tabName: string;
}): Promise<SheetRecord> {
  const [row] = await db
    .insert(schema.sheets)
    .values({ projectId, googleSheetId, tabName })
    .returning();
  if (!row) throw new Error('insert into sheets did not return a row');
  return {
    id: row.id,
    projectId: row.projectId,
    googleSheetId: row.googleSheetId,
    tabName: row.tabName,
    schemaSnapshotId: row.schemaSnapshotId,
    createdAt: row.createdAt,
  };
}

export async function findSheetsByProjectId({
  db,
  projectId,
}: {
  db: Db;
  projectId: string;
}): Promise<SheetRecord[]> {
  const rows = await db.select().from(schema.sheets).where(eq(schema.sheets.projectId, projectId));
  return rows.map((r) => ({
    id: r.id,
    projectId: r.projectId,
    googleSheetId: r.googleSheetId,
    tabName: r.tabName,
    schemaSnapshotId: r.schemaSnapshotId,
    createdAt: r.createdAt,
  }));
}

export async function findSheetById({
  db,
  sheetId,
}: {
  db: Db;
  sheetId: string;
}): Promise<SheetRecord | null> {
  const rows = await db.select().from(schema.sheets).where(eq(schema.sheets.id, sheetId)).limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.projectId,
    googleSheetId: row.googleSheetId,
    tabName: row.tabName,
    schemaSnapshotId: row.schemaSnapshotId,
    createdAt: row.createdAt,
  };
}

export async function updateSchemaSnapshotId({
  db,
  sheetId,
  schemaSnapshotId,
}: {
  db: Db;
  sheetId: string;
  schemaSnapshotId: string;
}): Promise<void> {
  await db.update(schema.sheets).set({ schemaSnapshotId }).where(eq(schema.sheets.id, sheetId));
}

export async function deleteSheetById({
  db,
  sheetId,
  projectId,
}: {
  db: Db;
  sheetId: string;
  projectId: string;
}): Promise<void> {
  await db
    .delete(schema.sheets)
    .where(and(eq(schema.sheets.id, sheetId), eq(schema.sheets.projectId, projectId)));
}
