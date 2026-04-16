import { createSheetsClient } from '@acid-sheets/shared-google';
import { ForbiddenError } from '@acid-sheets/shared-types';
import { getAccessTokenForUser } from '@acid-sheets/slice-auth';
import { getProjectUnscoped } from '@acid-sheets/slice-projects';
import { getLatestSchema } from '@acid-sheets/slice-schema';
import { getSheet } from '@acid-sheets/slice-sheets';
import { submitWrite } from '@acid-sheets/slice-write-queue';
import { Hono } from 'hono';
import { requireApiKey } from '../middleware.js';
import type { AppVariables, RouterDeps } from '../types.js';

export function createRowRoutes(deps: RouterDeps): Hono<{ Variables: AppVariables }> {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', requireApiKey(deps));

  app.post('/sheets/:sheetId/rows', async (c) => {
    const ak = c.get('apiKey');
    const sheetId = c.req.param('sheetId');
    if (ak.scopeSheetIds && !ak.scopeSheetIds.includes(sheetId)) {
      throw new ForbiddenError('API key is not scoped to this sheet');
    }
    // Verify the sheet belongs to the API key's project before enqueueing.
    await getSheet({ db: deps.db, sheetId, projectId: ak.projectId });
    const body = await c.req.json<Record<string, unknown>>();
    const idempotencyKey = c.req.header('Idempotency-Key') ?? c.req.header('idempotency-key');
    const result = await submitWrite({
      db: deps.db,
      redis: deps.redis,
      sheetId,
      payload: { op: 'append', data: body },
      ...(idempotencyKey ? { idempotencyKey } : {}),
    });
    return c.json(result, 202);
  });

  app.get('/sheets/:sheetId/rows', async (c) => {
    const ak = c.get('apiKey');
    const sheetId = c.req.param('sheetId');
    if (ak.scopeSheetIds && !ak.scopeSheetIds.includes(sheetId)) {
      throw new ForbiddenError('API key is not scoped to this sheet');
    }
    const sheet = await getSheet({
      db: deps.db,
      sheetId,
      projectId: ak.projectId,
    });
    // Use the project owner's Google token to read — API-key auth has no user.
    const project = await getProjectUnscoped({
      db: deps.db,
      projectId: sheet.projectId,
    });
    const accessToken = await getAccessTokenForUser({
      db: deps.db,
      env: deps.env,
      userId: project.userId,
    });
    const sheetsClient = createSheetsClient({ accessToken });
    const snapshot = await getLatestSchema({ db: deps.db, sheetId });
    const range = `${sheet.tabName}!A1:ZZ`;
    const valueRange = await sheetsClient.getValues({
      spreadsheetId: sheet.googleSheetId,
      range,
    });
    const all = valueRange.values ?? [];
    const dataRows = all.slice(1);
    const rows = dataRows.map((r) => {
      const obj: Record<string, unknown> = {};
      snapshot.columns.forEach((col, i) => {
        obj[col.name] = coerce(r[i] ?? '', col.type);
      });
      return obj;
    });
    return c.json({ rows });
  });

  return app;
}

function coerce(raw: string, type: 'string' | 'number' | 'boolean' | 'datetime'): unknown {
  if (raw === '') return null;
  if (type === 'number') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : raw;
  }
  if (type === 'boolean') return raw.toLowerCase() === 'true';
  return raw;
}
