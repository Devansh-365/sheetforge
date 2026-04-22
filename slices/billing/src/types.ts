import { DomainError } from '@sheetforge/shared-types';
import { z } from 'zod';
import { PlanLimitsSchema } from './plans.js';

export const UsageSnapshotSchema = z.object({
  planCode: z.string(),
  limits: PlanLimitsSchema,
  used: z.object({
    projects: z.number().int().nonnegative(),
    sheetsByProject: z.record(z.string(), z.number().int().nonnegative()),
    apiKeysByProject: z.record(z.string(), z.number().int().nonnegative()),
  }),
});

export type UsageSnapshot = z.infer<typeof UsageSnapshotSchema>;

export type QuotaResource = 'projects' | 'sheetsPerProject' | 'apiKeysPerProject';

export interface QuotaExceededDetails {
  resource: QuotaResource;
  limit: number;
  used: number;
  planCode: string;
  projectId?: string;
}

export class QuotaExceededError extends DomainError {
  readonly code = 'QUOTA_EXCEEDED' as const;
  // 402 Payment Required — signals "upgrade to unlock" rather than a bug.
  readonly statusCode = 402;

  constructor(details: QuotaExceededDetails) {
    super(
      `Quota exceeded for ${details.resource} (limit ${details.limit}, used ${details.used})`,
      details as unknown as Record<string, unknown>,
    );
  }
}
