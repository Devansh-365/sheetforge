import { getUsage } from '@sheetforge/slice-billing';
import {
  createApiKey,
  createProject,
  deleteProject,
  listApiKeys,
  listProjects,
  revokeApiKey,
} from '@sheetforge/slice-projects';
import { Hono } from 'hono';
import { requireSession } from '../middleware.js';
import type { AppVariables, RouterDeps } from '../types.js';

export function createProjectRoutes(deps: RouterDeps): Hono<{ Variables: AppVariables }> {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use('*', requireSession(deps));

  app.get('/me', (c) => {
    const user = c.get('user');
    return c.json({ user });
  });

  app.get('/me/usage', async (c) => {
    const user = c.get('user');
    const usage = await getUsage({ db: deps.db, userId: user.userId });
    return c.json(usage);
  });

  app.get('/projects', async (c) => {
    const user = c.get('user');
    const projects = await listProjects({ db: deps.db, userId: user.userId });
    return c.json({ projects });
  });

  app.post('/projects', async (c) => {
    const user = c.get('user');
    const body = await c.req.json<{ name: string }>();
    const project = await createProject({
      db: deps.db,
      userId: user.userId,
      name: body.name,
    });
    return c.json({ project }, 201);
  });

  app.delete('/projects/:projectId', async (c) => {
    const user = c.get('user');
    await deleteProject({
      db: deps.db,
      userId: user.userId,
      projectId: c.req.param('projectId'),
    });
    return c.body(null, 204);
  });

  app.get('/projects/:projectId/api-keys', async (c) => {
    const user = c.get('user');
    const apiKeys = await listApiKeys({
      db: deps.db,
      userId: user.userId,
      projectId: c.req.param('projectId'),
    });
    return c.json({ apiKeys });
  });

  app.post('/projects/:projectId/api-keys', async (c) => {
    const user = c.get('user');
    const result = await createApiKey({
      db: deps.db,
      userId: user.userId,
      projectId: c.req.param('projectId'),
    });
    return c.json(result, 201);
  });

  app.delete('/projects/:projectId/api-keys/:keyId', async (c) => {
    const user = c.get('user');
    await revokeApiKey({
      db: deps.db,
      userId: user.userId,
      projectId: c.req.param('projectId'),
      apiKeyId: c.req.param('keyId'),
    });
    return c.body(null, 204);
  });

  return app;
}
