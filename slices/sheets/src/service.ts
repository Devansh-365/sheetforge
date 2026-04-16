import type { Db } from '@acid-sheets/shared-db';
import type { SheetsClient } from '@acid-sheets/shared-google';
import { ForbiddenError, NotFoundError } from '@acid-sheets/shared-types';
import {
  deleteSheetById,
  findSheetById,
  findSheetsByProjectId,
  insertSheet,
  updateSchemaSnapshotId,
} from './repo.js';
import type { SheetRecord } from './types.js';

export async function connectSheet({
  db,
  sheetsClient,
  projectId,
  googleSheetId,
  tabName,
}: {
  db: Db;
  sheetsClient: SheetsClient;
  projectId: string;
  googleSheetId: string;
  tabName: string;
}): Promise<SheetRecord> {
  // Validate upstream: the spreadsheet exists and the tab is present.
  // Any Google error (401/403/404/429) surfaces as a typed DomainError.
  const metadata = await sheetsClient.getSpreadsheet({
    spreadsheetId: googleSheetId,
    fields: 'spreadsheetId,properties.title,sheets.properties',
  });
  const hasTab = metadata.sheets.some((s) => s.properties.title === tabName);
  if (!hasTab) {
    throw new NotFoundError(`Tab "${tabName}" not found in spreadsheet`, {
      availableTabs: metadata.sheets.map((s) => s.properties.title),
    });
  }
  return insertSheet({ db, projectId, googleSheetId, tabName });
}

export async function listSheets({
  db,
  projectId,
}: {
  db: Db;
  projectId: string;
}): Promise<SheetRecord[]> {
  return findSheetsByProjectId({ db, projectId });
}

export async function getSheet({
  db,
  sheetId,
  projectId,
}: {
  db: Db;
  sheetId: string;
  projectId: string;
}): Promise<SheetRecord> {
  const sheet = await findSheetById({ db, sheetId });
  if (!sheet) throw new NotFoundError('Sheet not found');
  if (sheet.projectId !== projectId) {
    throw new ForbiddenError('Sheet does not belong to this project');
  }
  return sheet;
}

export async function disconnectSheet({
  db,
  sheetId,
  projectId,
}: {
  db: Db;
  sheetId: string;
  projectId: string;
}): Promise<void> {
  await getSheet({ db, sheetId, projectId });
  await deleteSheetById({ db, sheetId, projectId });
}

// Called by the schema slice after a new snapshot is persisted.
export async function attachSchemaSnapshot({
  db,
  sheetId,
  schemaSnapshotId,
}: {
  db: Db;
  sheetId: string;
  schemaSnapshotId: string;
}): Promise<void> {
  await updateSchemaSnapshotId({ db, sheetId, schemaSnapshotId });
}
