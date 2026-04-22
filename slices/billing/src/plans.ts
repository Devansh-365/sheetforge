import { z } from 'zod';

export const PlanLimitsSchema = z.object({
  projects: z.number().int().positive(),
  sheetsPerProject: z.number().int().positive(),
  apiKeysPerProject: z.number().int().positive(),
});

export type PlanLimits = z.infer<typeof PlanLimitsSchema>;

export const DEFAULT_PLAN_CODE = 'free';

// Plan registry. Bumping a limit is a one-line change — no migration, no
// DB edit. New plans land here alongside the Stripe price id mapping when
// paid tiers launch.
export const PLANS: Record<string, PlanLimits> = {
  free: {
    projects: 3,
    sheetsPerProject: 5,
    apiKeysPerProject: 3,
  },
  pro: {
    projects: 25,
    sheetsPerProject: 50,
    apiKeysPerProject: 10,
  },
  team: {
    projects: 100,
    sheetsPerProject: 250,
    apiKeysPerProject: 25,
  },
};

// Apply per-user overrides on top of the base plan. Overrides are a partial
// map — fields not present fall back to the plan's value.
export function effectiveLimits(
  planCode: string | null | undefined,
  overrides: Partial<PlanLimits> | null | undefined,
): PlanLimits {
  const base = PLANS[planCode ?? DEFAULT_PLAN_CODE] ?? PLANS[DEFAULT_PLAN_CODE];
  if (!base) {
    // Registry is misconfigured; fail loud rather than silently over-deliver.
    throw new Error(`billing: no plan definition for "${planCode}" or "${DEFAULT_PLAN_CODE}"`);
  }
  if (!overrides) return base;
  return { ...base, ...overrides };
}
