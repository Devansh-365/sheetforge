import type { Db } from '@sheetforge/shared-db';
import { NotFoundError } from '@sheetforge/shared-types';
import { DEFAULT_PLAN_CODE, type PlanLimits, effectiveLimits } from './plans.js';
import {
  countApiKeysByProject,
  countProjectsByUser,
  countSheetsByProject,
  getProjectOwner,
  getUserPlan,
  listProjectUsage,
} from './repo.js';
import { QuotaExceededError, type UsageSnapshot } from './types.js';

interface ResolvedPlan {
  planCode: string;
  limits: PlanLimits;
}

async function resolvePlan(db: Db, userId: string): Promise<ResolvedPlan> {
  const row = await getUserPlan({ db, userId });
  if (!row) {
    // Session said this user exists but the DB disagrees — either a race on
    // account deletion or a stale JWT. 404 is the right signal.
    throw new NotFoundError('User not found');
  }
  const planCode = row.planCode ?? DEFAULT_PLAN_CODE;
  return {
    planCode,
    limits: effectiveLimits(planCode, row.planOverrides as Partial<PlanLimits> | null),
  };
}

export async function assertProjectQuota({
  db,
  userId,
}: {
  db: Db;
  userId: string;
}): Promise<void> {
  const { planCode, limits } = await resolvePlan(db, userId);
  const used = await countProjectsByUser({ db, userId });
  if (used >= limits.projects) {
    throw new QuotaExceededError({
      resource: 'projects',
      limit: limits.projects,
      used,
      planCode,
    });
  }
}

export async function assertSheetQuota({
  db,
  projectId,
}: {
  db: Db;
  projectId: string;
}): Promise<void> {
  const userId = await getProjectOwner({ db, projectId });
  if (!userId) throw new NotFoundError('Project not found');
  const { planCode, limits } = await resolvePlan(db, userId);
  const used = await countSheetsByProject({ db, projectId });
  if (used >= limits.sheetsPerProject) {
    throw new QuotaExceededError({
      resource: 'sheetsPerProject',
      limit: limits.sheetsPerProject,
      used,
      planCode,
      projectId,
    });
  }
}

export async function assertApiKeyQuota({
  db,
  projectId,
}: {
  db: Db;
  projectId: string;
}): Promise<void> {
  const userId = await getProjectOwner({ db, projectId });
  if (!userId) throw new NotFoundError('Project not found');
  const { planCode, limits } = await resolvePlan(db, userId);
  const used = await countApiKeysByProject({ db, projectId });
  if (used >= limits.apiKeysPerProject) {
    throw new QuotaExceededError({
      resource: 'apiKeysPerProject',
      limit: limits.apiKeysPerProject,
      used,
      planCode,
      projectId,
    });
  }
}

export async function getUsage({
  db,
  userId,
}: {
  db: Db;
  userId: string;
}): Promise<UsageSnapshot> {
  const [{ planCode, limits }, projects] = await Promise.all([
    resolvePlan(db, userId),
    listProjectUsage({ db, userId }),
  ]);
  return {
    planCode,
    limits,
    used: {
      projects: projects.length,
      sheetsByProject: Object.fromEntries(projects.map((p) => [p.id, p.sheetCount])),
      apiKeysByProject: Object.fromEntries(projects.map((p) => [p.id, p.apiKeyCount])),
    },
  };
}
