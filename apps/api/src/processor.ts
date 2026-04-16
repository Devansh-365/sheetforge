import type { QueueRedisClient } from '@sheetforge/queue';
import type { Db } from '@sheetforge/shared-db';
import { type AppendSafeRow, createSheetsClient } from '@sheetforge/shared-google';
import { createLogger } from '@sheetforge/shared-logger';
import { getAccessTokenForUser } from '@sheetforge/slice-auth';
import { getProjectUnscoped } from '@sheetforge/slice-projects';
import { getLatestSchema } from '@sheetforge/slice-schema';
import { listAllSheetsForProcessor } from '@sheetforge/slice-sheets';
import { processNext, streamKeyForSheet } from '@sheetforge/slice-write-queue';
import type { ApiEnv } from './env.js';

const log = createLogger({ service: 'processor' });
const GROUP = 'acid-workers';
const CONSUMER = 'api-inline';

interface WriteOp {
  op: 'append' | 'update' | 'delete';
  data: unknown;
}

export async function processorTick({
  db,
  redis,
  env,
}: {
  db: Db;
  redis: QueueRedisClient;
  env: ApiEnv;
}): Promise<void> {
  const sheets = await listAllSheetsForProcessor({ db });
  for (const sheet of sheets) {
    try {
      await processOneSheet({ db, redis, env, sheet });
    } catch (err) {
      log.warn(
        {
          sheetId: sheet.id,
          err: err instanceof Error ? err.message : String(err),
        },
        'sheet-tick-failed',
      );
    }
  }
}

async function processOneSheet({
  db,
  redis,
  env,
  sheet,
}: {
  db: Db;
  redis: QueueRedisClient;
  env: ApiEnv;
  sheet: {
    id: string;
    projectId: string;
    googleSheetId: string;
    tabName: string;
  };
}): Promise<void> {
  const project = await getProjectUnscoped({ db, projectId: sheet.projectId });
  const accessToken = await getAccessTokenForUser({
    db,
    env,
    userId: project.userId,
  });
  const sheetsClient = createSheetsClient({ accessToken });
  const streamKey = streamKeyForSheet(sheet.id);

  await processNext<WriteOp>({
    db,
    redis,
    streamKey,
    group: GROUP,
    consumer: CONSUMER,
    blockMs: 100,
    handler: async (msg) => {
      if (msg.payload.op !== 'append') {
        log.warn({ writeId: msg.writeId, op: msg.payload.op }, 'op-not-implemented');
        return;
      }
      const rowObj = msg.payload.data as Record<string, unknown>;
      const snapshot = await getLatestSchema({ db, sheetId: sheet.id });
      const metadata = await sheetsClient.getSpreadsheet({
        spreadsheetId: sheet.googleSheetId,
        fields: 'sheets.properties',
      });
      const tab = metadata.sheets.find((s) => s.properties.title === sheet.tabName);
      if (!tab) {
        throw new Error(`tab ${sheet.tabName} missing from spreadsheet`);
      }
      const tabSheetId = tab.properties.sheetId;
      const vals = await sheetsClient.getValues({
        spreadsheetId: sheet.googleSheetId,
        range: sheet.tabName,
      });
      const currentRowCount = vals.values?.length ?? 0;
      const cells: AppendSafeRow = snapshot.columns.map((col) => {
        const v = rowObj[col.name];
        if (col.type === 'number' && typeof v === 'number') {
          return { numberValue: v };
        }
        if (col.type === 'boolean' && typeof v === 'boolean') {
          return { boolValue: v };
        }
        return { stringValue: v == null ? '' : String(v) };
      });
      await sheetsClient.appendSafe({
        spreadsheetId: sheet.googleSheetId,
        sheetId: tabSheetId,
        startRowIndex: currentRowCount,
        rows: [cells],
      });
    },
  });
}
