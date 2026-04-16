import { createHash, randomBytes } from 'node:crypto';
import { type Db, schema } from '@sheetforge/shared-db';
import { and, eq } from 'drizzle-orm';
import type { ApiKeyHandle, Project } from './types.js';

export async function insertProject({
  db,
  userId,
  name,
}: {
  db: Db;
  userId: string;
  name: string;
}): Promise<Project> {
  const [row] = await db.insert(schema.projects).values({ userId, name }).returning();
  if (!row) throw new Error('insert into projects did not return a row');
  return { id: row.id, userId: row.userId, name: row.name, createdAt: row.createdAt };
}

export async function findProjectsByUserId({
  db,
  userId,
}: {
  db: Db;
  userId: string;
}): Promise<Project[]> {
  const rows = await db.select().from(schema.projects).where(eq(schema.projects.userId, userId));
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    name: r.name,
    createdAt: r.createdAt,
  }));
}

export async function findProjectById({
  db,
  projectId,
}: {
  db: Db;
  projectId: string;
}): Promise<Project | null> {
  const rows = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, projectId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, userId: row.userId, name: row.name, createdAt: row.createdAt };
}

export async function deleteProjectById({
  db,
  projectId,
}: {
  db: Db;
  projectId: string;
}): Promise<void> {
  await db.delete(schema.projects).where(eq(schema.projects.id, projectId));
}

export async function insertApiKey({
  db,
  projectId,
  hashedKey,
  prefix,
  scopeSheetIds,
}: {
  db: Db;
  projectId: string;
  hashedKey: string;
  prefix: string;
  scopeSheetIds: string[] | null;
}): Promise<ApiKeyHandle> {
  const [row] = await db
    .insert(schema.apiKeys)
    .values({
      projectId,
      hashedKey,
      scopeSheetIds,
    })
    .returning();
  if (!row) throw new Error('insert into api_keys did not return a row');
  return {
    id: row.id,
    projectId: row.projectId,
    prefix,
    scopeSheetIds: row.scopeSheetIds ?? null,
    lastUsedAt: row.lastUsedAt,
    createdAt: row.createdAt,
  };
}

export async function findApiKeysByProjectId({
  db,
  projectId,
}: {
  db: Db;
  projectId: string;
}): Promise<ApiKeyHandle[]> {
  const rows = await db
    .select()
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.projectId, projectId));
  return rows.map((r) => ({
    id: r.id,
    projectId: r.projectId,
    prefix: 'sk_live_…' + r.hashedKey.slice(-4),
    scopeSheetIds: r.scopeSheetIds ?? null,
    lastUsedAt: r.lastUsedAt,
    createdAt: r.createdAt,
  }));
}

export async function deleteApiKeyById({
  db,
  projectId,
  apiKeyId,
}: {
  db: Db;
  projectId: string;
  apiKeyId: string;
}): Promise<void> {
  await db
    .delete(schema.apiKeys)
    .where(and(eq(schema.apiKeys.projectId, projectId), eq(schema.apiKeys.id, apiKeyId)));
}

export async function findApiKeyByHashedKey({
  db,
  hashedKey,
}: {
  db: Db;
  hashedKey: string;
}): Promise<{
  id: string;
  projectId: string;
  scopeSheetIds: string[] | null;
} | null> {
  const rows = await db
    .select({
      id: schema.apiKeys.id,
      projectId: schema.apiKeys.projectId,
      scopeSheetIds: schema.apiKeys.scopeSheetIds,
    })
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.hashedKey, hashedKey))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.projectId,
    scopeSheetIds: row.scopeSheetIds ?? null,
  };
}

export async function touchLastUsedAt({
  db,
  apiKeyId,
}: {
  db: Db;
  apiKeyId: string;
}): Promise<void> {
  await db
    .update(schema.apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.apiKeys.id, apiKeyId));
}

// ---------------------------------------------------------------------------
// API key generation + hashing
// ---------------------------------------------------------------------------

const API_KEY_PREFIX = 'sk_live_';
const API_KEY_BYTES = 24;

export function generateApiKey(): { plaintextKey: string; prefix: string } {
  const hex = randomBytes(API_KEY_BYTES).toString('hex');
  const plaintextKey = `${API_KEY_PREFIX}${hex}`;
  const prefix = `${API_KEY_PREFIX}…${plaintextKey.slice(-4)}`;
  return { plaintextKey, prefix };
}

export function hashApiKey(plaintextKey: string): string {
  return createHash('sha256').update(plaintextKey).digest('hex');
}

export function apiKeyLooksValid(plaintextKey: string): boolean {
  return plaintextKey.startsWith(API_KEY_PREFIX);
}
