import { emitTypeScriptSdk } from '@sheetforge/codegen';
import { a1Range, createSheetsClient } from '@sheetforge/shared-google';
import { getAccessTokenForUser } from '@sheetforge/slice-auth';
import { getProject } from '@sheetforge/slice-projects';
import { getLatestSchema, inferSchema, saveSchemaSnapshot } from '@sheetforge/slice-schema';
import {
  attachSchemaSnapshot,
  connectSheet,
  disconnectSheet,
  getSheet,
  listSheets,
} from '@sheetforge/slice-sheets';
import { getLedgerStats, submitWrite } from '@sheetforge/slice-write-queue';
import { Hono } from 'hono';
import { requireSession } from '../middleware.js';
import type { AppVariables, RouterDeps } from '../types.js';

function coerceCell(raw: string, type: 'string' | 'number' | 'boolean' | 'datetime'): unknown {
  if (raw === '') return null;
  if (type === 'number') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : raw;
  }
  if (type === 'boolean') return raw.toLowerCase() === 'true';
  return raw;
}

function buildDemoRow(
  columns: Array<{ name: string; type: 'string' | 'number' | 'boolean' | 'datetime' }>,
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const col of columns) {
    switch (col.type) {
      case 'number':
        row[col.name] = Math.floor(Math.random() * 1000);
        break;
      case 'boolean':
        row[col.name] = Math.random() > 0.5;
        break;
      case 'datetime':
        row[col.name] = new Date().toISOString();
        break;
      default:
        row[col.name] = `demo-${Math.random().toString(36).slice(2, 8)}`;
    }
  }
  return row;
}

export function createSheetRoutes(deps: RouterDeps): Hono<{ Variables: AppVariables }> {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', requireSession(deps));

  app.post('/projects/:projectId/sheets', async (c) => {
    const user = c.get('user');
    const projectId = c.req.param('projectId');
    await getProject({ db: deps.db, userId: user.userId, projectId });
    const body = await c.req.json<{ googleSheetId: string; tabName: string }>();
    const accessToken = await getAccessTokenForUser({
      db: deps.db,
      env: deps.env,
      userId: user.userId,
    });
    const sheetsClient = createSheetsClient({ accessToken });
    const sheet = await connectSheet({
      db: deps.db,
      sheetsClient,
      projectId,
      googleSheetId: body.googleSheetId,
      tabName: body.tabName,
    });
    // Auto-infer + persist schema so the SDK + write paths work immediately.
    const columns = await inferSchema({
      sheetsClient,
      spreadsheetId: sheet.googleSheetId,
      tabName: sheet.tabName,
    });
    const snapshot = await saveSchemaSnapshot({
      db: deps.db,
      sheetId: sheet.id,
      columns,
    });
    await attachSchemaSnapshot({
      db: deps.db,
      sheetId: sheet.id,
      schemaSnapshotId: snapshot.id,
    });
    return c.json({ sheet, schema: snapshot }, 201);
  });

  app.get('/projects/:projectId/sheets', async (c) => {
    const user = c.get('user');
    const projectId = c.req.param('projectId');
    await getProject({ db: deps.db, userId: user.userId, projectId });
    const sheets = await listSheets({ db: deps.db, projectId });
    return c.json({ sheets });
  });

  app.post('/projects/:projectId/sheets/:sheetId/schema/refresh', async (c) => {
    const user = c.get('user');
    const projectId = c.req.param('projectId');
    const sheetId = c.req.param('sheetId');
    const sheet = await getSheet({ db: deps.db, sheetId, projectId });
    const accessToken = await getAccessTokenForUser({
      db: deps.db,
      env: deps.env,
      userId: user.userId,
    });
    const sheetsClient = createSheetsClient({ accessToken });
    const columns = await inferSchema({
      sheetsClient,
      spreadsheetId: sheet.googleSheetId,
      tabName: sheet.tabName,
    });
    const snapshot = await saveSchemaSnapshot({
      db: deps.db,
      sheetId: sheet.id,
      columns,
    });
    await attachSchemaSnapshot({
      db: deps.db,
      sheetId: sheet.id,
      schemaSnapshotId: snapshot.id,
    });
    return c.json({ schema: snapshot });
  });

  app.get('/projects/:projectId/sheets/:sheetId/schema', async (c) => {
    const user = c.get('user');
    const projectId = c.req.param('projectId');
    const sheetId = c.req.param('sheetId');
    await getProject({ db: deps.db, userId: user.userId, projectId });
    await getSheet({ db: deps.db, sheetId, projectId });
    const snapshot = await getLatestSchema({ db: deps.db, sheetId });
    return c.json({ schema: snapshot });
  });

  app.delete('/projects/:projectId/sheets/:sheetId', async (c) => {
    const user = c.get('user');
    const projectId = c.req.param('projectId');
    const sheetId = c.req.param('sheetId');
    // Ownership: project must belong to the user.
    await getProject({ db: deps.db, userId: user.userId, projectId });
    // Ownership: sheet must belong to the project; disconnectSheet re-checks.
    await disconnectSheet({ db: deps.db, sheetId, projectId });
    return c.body(null, 204);
  });

  app.get('/projects/:projectId/sheets/:sheetId/ledger-stats', async (c) => {
    const user = c.get('user');
    const projectId = c.req.param('projectId');
    const sheetId = c.req.param('sheetId');
    await getProject({ db: deps.db, userId: user.userId, projectId });
    await getSheet({ db: deps.db, sheetId, projectId });
    const ledger = await getLedgerStats({ db: deps.db, sheetId });
    return c.json(ledger);
  });

  app.post('/projects/:projectId/sheets/:sheetId/test-write', async (c) => {
    const user = c.get('user');
    const projectId = c.req.param('projectId');
    const sheetId = c.req.param('sheetId');
    await getProject({ db: deps.db, userId: user.userId, projectId });
    await getSheet({ db: deps.db, sheetId, projectId });
    const snapshot = await getLatestSchema({ db: deps.db, sheetId });
    const row = buildDemoRow(snapshot.columns);
    const result = await submitWrite({
      db: deps.db,
      redis: deps.redis,
      sheetId,
      payload: { op: 'append', data: row },
      idempotencyKey: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    });
    return c.json({ ...result, submittedRow: row }, 202);
  });

  app.get('/projects/:projectId/sheets/:sheetId/preview', async (c) => {
    const user = c.get('user');
    const projectId = c.req.param('projectId');
    const sheetId = c.req.param('sheetId');
    const limit = Math.min(Number(c.req.query('limit') ?? '10') || 10, 100);
    await getProject({ db: deps.db, userId: user.userId, projectId });
    const sheet = await getSheet({ db: deps.db, sheetId, projectId });
    const snapshot = await getLatestSchema({ db: deps.db, sheetId });
    const accessToken = await getAccessTokenForUser({
      db: deps.db,
      env: deps.env,
      userId: user.userId,
    });
    const sheetsClient = createSheetsClient({ accessToken });
    const range = a1Range(sheet.tabName, `A1:ZZ${limit + 1}`);
    const result = await sheetsClient.getValues({
      spreadsheetId: sheet.googleSheetId,
      range,
    });
    const [, ...dataRows] = result.values ?? [];
    const rows = dataRows.map((raw) => {
      const row: Record<string, unknown> = {};
      snapshot.columns.forEach((col, i) => {
        row[col.name] = coerceCell(String(raw[i] ?? ''), col.type);
      });
      return row;
    });
    return c.json({ rows, columns: snapshot.columns });
  });

  app.get('/projects/:projectId/sheets/:sheetId/sdk.ts', async (c) => {
    const user = c.get('user');
    const projectId = c.req.param('projectId');
    const sheetId = c.req.param('sheetId');
    await getProject({ db: deps.db, userId: user.userId, projectId });
    const sheet = await getSheet({ db: deps.db, sheetId, projectId });
    const snapshot = await getLatestSchema({ db: deps.db, sheetId });
    const source = emitTypeScriptSdk({
      sheetId: sheet.id,
      tabName: sheet.tabName,
      columns: snapshot.columns,
      apiBaseUrl: deps.env.PUBLIC_BASE_URL,
    });
    c.header('Content-Type', 'text/typescript; charset=utf-8');
    return c.body(source);
  });

  return app;
}
