import { type Db, schema } from '@sheetforge/shared-db';
import { eq, sql } from 'drizzle-orm';

export interface UserPlanRow {
  planCode: string;
  planOverrides: unknown;
}

export async function getUserPlan({
  db,
  userId,
}: {
  db: Db;
  userId: string;
}): Promise<UserPlanRow | null> {
  const rows = await db
    .select({
      planCode: schema.users.planCode,
      planOverrides: schema.users.planOverrides,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function countProjectsByUser({
  db,
  userId,
}: {
  db: Db;
  userId: string;
}): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.projects)
    .where(eq(schema.projects.userId, userId));
  return rows[0]?.n ?? 0;
}

export async function countSheetsByProject({
  db,
  projectId,
}: {
  db: Db;
  projectId: string;
}): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.sheets)
    .where(eq(schema.sheets.projectId, projectId));
  return rows[0]?.n ?? 0;
}

export async function countApiKeysByProject({
  db,
  projectId,
}: {
  db: Db;
  projectId: string;
}): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.projectId, projectId));
  return rows[0]?.n ?? 0;
}

export async function getProjectOwner({
  db,
  projectId,
}: {
  db: Db;
  projectId: string;
}): Promise<string | null> {
  const rows = await db
    .select({ userId: schema.projects.userId })
    .from(schema.projects)
    .where(eq(schema.projects.id, projectId))
    .limit(1);
  return rows[0]?.userId ?? null;
}

// Single-query usage digest: one row per project with inline sub-selects for
// the two per-project counts. Keeps round-trips to one for the dashboard.
export interface ProjectUsageRow {
  id: string;
  sheetCount: number;
  apiKeyCount: number;
}

export async function listProjectUsage({
  db,
  userId,
}: {
  db: Db;
  userId: string;
}): Promise<ProjectUsageRow[]> {
  return db
    .select({
      id: schema.projects.id,
      sheetCount: sql<number>`(
        select count(*)::int from ${schema.sheets}
        where ${schema.sheets.projectId} = ${schema.projects.id}
      )`,
      apiKeyCount: sql<number>`(
        select count(*)::int from ${schema.apiKeys}
        where ${schema.apiKeys.projectId} = ${schema.projects.id}
      )`,
    })
    .from(schema.projects)
    .where(eq(schema.projects.userId, userId));
}
