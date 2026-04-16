import type { Db } from '@sheetforge/shared-db';
import type { SheetsClient } from '@sheetforge/shared-google';
import { NotFoundError, ValidationError } from '@sheetforge/shared-types';
import { findLatestSchemaBySheetId, insertSchemaSnapshot } from './repo.js';
import type { ColumnDescriptor, ColumnType, SchemaSnapshot } from './types.js';

const DEFAULT_SAMPLE_SIZE = 50;

export async function inferSchema({
  sheetsClient,
  spreadsheetId,
  tabName,
  sampleSize,
}: {
  sheetsClient: SheetsClient;
  spreadsheetId: string;
  tabName: string;
  sampleSize?: number;
}): Promise<ColumnDescriptor[]> {
  const size = sampleSize ?? DEFAULT_SAMPLE_SIZE;
  // Fetch header + N data rows in one call. ZZ is ~700 columns, more than any
  // sensible sheet in V0 scope.
  const range = `${tabName}!A1:ZZ${size + 1}`;
  const valueRange = await sheetsClient.getValues({ spreadsheetId, range });
  const rows = valueRange.values ?? [];

  if (rows.length === 0) {
    throw new ValidationError('Sheet is empty — no header row found');
  }
  const headers = rows[0] ?? [];
  if (headers.length === 0) {
    throw new ValidationError('Sheet has no header row');
  }

  const dataRows = rows.slice(1);
  return headers.map((rawHeader, colIdx) => {
    const header = rawHeader.trim();
    if (header.length === 0) {
      throw new ValidationError(
        `Column ${colIdx + 1} has an empty header — every column must be named`,
      );
    }
    const columnValues = dataRows.map((r) => (r[colIdx] ?? '').trim()).filter((v) => v.length > 0);
    return {
      name: header,
      type: detectType(columnValues),
      nullable: columnValues.length !== dataRows.length,
    };
  });
}

export async function saveSchemaSnapshot({
  db,
  sheetId,
  columns,
}: {
  db: Db;
  sheetId: string;
  columns: ColumnDescriptor[];
}): Promise<SchemaSnapshot> {
  const previous = await findLatestSchemaBySheetId({ db, sheetId });
  const version = (previous?.version ?? 0) + 1;
  return insertSchemaSnapshot({ db, sheetId, columns, version });
}

export async function getLatestSchema({
  db,
  sheetId,
}: {
  db: Db;
  sheetId: string;
}): Promise<SchemaSnapshot> {
  const snap = await findLatestSchemaBySheetId({ db, sheetId });
  if (!snap) {
    throw new NotFoundError('No schema snapshot exists for this sheet');
  }
  return snap;
}

// ---------------------------------------------------------------------------
// Type detection
// ---------------------------------------------------------------------------
// Order matters: the most specific types win. Any sample that fails a type
// check falls through to `string`, which always matches.

function detectType(samples: string[]): ColumnType {
  if (samples.length === 0) return 'string';
  if (samples.every(isBooleanLike)) return 'boolean';
  if (samples.every(isNumberLike)) return 'number';
  if (samples.every(isIsoDateLike)) return 'datetime';
  return 'string';
}

function isBooleanLike(v: string): boolean {
  return /^(true|false)$/i.test(v);
}

function isNumberLike(v: string): boolean {
  if (v.length === 0) return false;
  const n = Number(v);
  return Number.isFinite(n);
}

function isIsoDateLike(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}/.test(v)) return false;
  const parsed = Date.parse(v);
  return !Number.isNaN(parsed);
}
