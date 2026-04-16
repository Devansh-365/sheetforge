import { emitTypeScriptSdk } from '@acid-sheets/codegen';
import { createSheetsClient } from '@acid-sheets/shared-google';
import { getAccessTokenForUser } from '@acid-sheets/slice-auth';
import { getProject } from '@acid-sheets/slice-projects';
import { getLatestSchema, inferSchema, saveSchemaSnapshot } from '@acid-sheets/slice-schema';
import {
  attachSchemaSnapshot,
  connectSheet,
  getSheet,
  listSheets,
} from '@acid-sheets/slice-sheets';
import { Hono } from 'hono';
import { requireSession } from '../middleware.js';
import type { AppVariables, RouterDeps } from '../types.js';

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
