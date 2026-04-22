import type { Db } from '@sheetforge/shared-db';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '@sheetforge/shared-types';
import { assertApiKeyQuota, assertProjectQuota } from '@sheetforge/slice-billing';
import {
  apiKeyLooksValid,
  deleteApiKeyById,
  deleteProjectById,
  findApiKeyByHashedKey,
  findApiKeysByProjectId,
  findProjectById,
  findProjectsByUserId,
  generateApiKey,
  hashApiKey,
  insertApiKey,
  insertProject,
  touchLastUsedAt,
} from './repo.js';
import type { ApiKeyHandle, NewApiKeyResult, Project, ResolvedApiKey } from './types.js';

export async function createProject({
  db,
  userId,
  name,
}: {
  db: Db;
  userId: string;
  name: string;
}): Promise<Project> {
  await assertProjectQuota({ db, userId });
  return insertProject({ db, userId, name });
}

export async function listProjects({
  db,
  userId,
}: {
  db: Db;
  userId: string;
}): Promise<Project[]> {
  return findProjectsByUserId({ db, userId });
}

export async function getProject({
  db,
  projectId,
  userId,
}: {
  db: Db;
  projectId: string;
  userId: string;
}): Promise<Project> {
  const project = await findProjectById({ db, projectId });
  if (!project) throw new NotFoundError('Project not found');
  if (project.userId !== userId) {
    throw new ForbiddenError('Project does not belong to this user');
  }
  return project;
}

/**
 * Used by the processor and by API-key authed routes where ownership is
 * already established transitively (via the API key → project mapping).
 * Does NOT check user ownership — callers must have already authorised.
 */
export async function getProjectUnscoped({
  db,
  projectId,
}: {
  db: Db;
  projectId: string;
}): Promise<Project> {
  const project = await findProjectById({ db, projectId });
  if (!project) throw new NotFoundError('Project not found');
  return project;
}

export async function deleteProject({
  db,
  projectId,
  userId,
}: {
  db: Db;
  projectId: string;
  userId: string;
}): Promise<void> {
  // ownership check throws if not owned
  await getProject({ db, projectId, userId });
  await deleteProjectById({ db, projectId });
}

export async function createApiKey({
  db,
  projectId,
  userId,
  scopeSheetIds,
}: {
  db: Db;
  projectId: string;
  userId: string;
  scopeSheetIds?: string[] | null;
}): Promise<NewApiKeyResult> {
  await getProject({ db, projectId, userId });
  await assertApiKeyQuota({ db, projectId });
  const { plaintextKey, prefix } = generateApiKey();
  const hashedKey = hashApiKey(plaintextKey);
  const handle = await insertApiKey({
    db,
    projectId,
    hashedKey,
    prefix,
    scopeSheetIds: scopeSheetIds ?? null,
  });
  return { handle: { ...handle, prefix }, plaintextKey };
}

export async function listApiKeys({
  db,
  projectId,
  userId,
}: {
  db: Db;
  projectId: string;
  userId: string;
}): Promise<ApiKeyHandle[]> {
  await getProject({ db, projectId, userId });
  return findApiKeysByProjectId({ db, projectId });
}

export async function revokeApiKey({
  db,
  projectId,
  userId,
  apiKeyId,
}: {
  db: Db;
  projectId: string;
  userId: string;
  apiKeyId: string;
}): Promise<void> {
  await getProject({ db, projectId, userId });
  await deleteApiKeyById({ db, projectId, apiKeyId });
}

// Auth middleware entry point: resolves an incoming API key to its owning
// project. Throws UnauthorizedError on any failure so callers can 401 cleanly.
export async function validateApiKey({
  db,
  apiKey,
}: {
  db: Db;
  apiKey: string;
}): Promise<ResolvedApiKey> {
  if (!apiKeyLooksValid(apiKey)) {
    throw new UnauthorizedError('Invalid API key format');
  }
  const hashedKey = hashApiKey(apiKey);
  const row = await findApiKeyByHashedKey({ db, hashedKey });
  if (!row) {
    throw new UnauthorizedError('Invalid API key');
  }
  // Best-effort — never block auth on a failed touch.
  touchLastUsedAt({ db, apiKeyId: row.id }).catch(() => {});
  return {
    apiKeyId: row.id,
    projectId: row.projectId,
    scopeSheetIds: row.scopeSheetIds,
  };
}
