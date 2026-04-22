# slices/billing

## Purpose
Free-tier quota enforcement. Pure-Postgres — deliberately Redis-free so an
Upstash outage never blocks a write or a dashboard load. When paid plans
launch, a Stripe webhook bumps `users.plan_code` and this slice picks it up
with no schema change.

## Public API (barrel)
- `assertProjectQuota({ db, userId })` — throws `QuotaExceededError` (402) if
  the user is at their project cap.
- `assertSheetQuota({ db, projectId })` — throws if the project is at its
  sheet cap. Resolves the owning user via a single join.
- `assertApiKeyQuota({ db, projectId })` — throws if the project is at its
  api-key cap.
- `getUsage({ db, userId })` — returns `{ planCode, limits, used }` for the
  dashboard.
- `PLANS`, `effectiveLimits(planCode, overrides)` — plan registry.
- `QuotaExceededError` — `DomainError` mapped to HTTP 402.
- Zod schemas: `PlanLimitsSchema`, `UsageSnapshotSchema`.

## Design
- **Plan registry lives in code**, not the DB. Tweaking a cap is a one-line
  PR, no migration.
- **`users.plan_overrides` jsonb** lets you bump a specific user without
  creating a new plan tier (design partners, gift accounts, etc.).
- **Enforcement is in the service layer** — every `create*` call that can
  cross a quota boundary invokes `assert*Quota` before doing its work. Route
  handlers never enforce; the slice is the choke point.
- **TOCTOU tolerance:** two concurrent `createProject` calls can both pass
  the pre-check and commit. For free-tier count caps (1–5), that's ± one
  item worst case. We don't burn complexity on a unique partial index until
  there's a revenue reason to.

## Never Do
- Don't import `@sheetforge/queue` or any redis client — billing stays on
  Postgres so Upstash outages don't affect it.
- Don't encode plan limits in the database. Code is the source of truth.
- Don't skip the pre-check in service methods; routes trust the slice.
- Don't import another slice's internals — only their barrels.
