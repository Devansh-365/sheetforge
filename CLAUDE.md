# ACID-ish Sheets — Assistant Guardrails

> Google Sheets as a backend that actually behaves like one. Race-condition-safe writes, typed SDKs, no polling.

## Project snapshot
- **Thesis:** technical-credibility wedge targeting indie devs shipping MVPs on Google Sheets.
- **V1 headline:** per-sheet write queue (serialized, idempotent) + auto-generated TypeScript/Python SDKs from live sheet schema.
- **Stage:** pre-code. Spec lives at `.omc/specs/deep-interview-acid-sheets.md` — read it before touching anything.
- **Solo indie, 12-week timeline, ~250 dev hours.** Scope discipline matters more than feature breadth.

## Repo layout (feature-sliced monorepo)
```
apps/        # thin entrypoints: web (Next.js), api (CF Workers), worker (queue consumer)
slices/      # feature slices: auth, projects, sheets, schema, write-queue, rest-api, sdk-codegen
packages/    # OSS (MIT) — queue, codegen, sdk-ts, sdk-py
shared/      # infra clients + primitives: db, redis, google, logger, types
marketing/   # Next.js landing (copy of ai-website-cloner-template, content-swapped only)
```

Import rules (enforced in CI via ESLint `boundaries`):
- `apps/*` may import from `slices/*`, `shared/*`, `packages/*`
- `slices/*` may **not** import another slice's internals — only its `index.ts` barrel
- `packages/*` must stay OSS-safe: node_modules + other `packages/*` only, no `shared/*`, no `apps/*`, no `slices/*`
- `shared/*` is a leaf — node_modules only

## Slice anatomy
Each `slices/<name>/` owns: `index.ts` (barrel), `routes.ts`, `service.ts`, `repo.ts`, `types.ts` (Zod source of truth), `__tests__/`, and its own `CLAUDE.md`. Before creating a new slice, read the parent folder's CLAUDE.md for its public-API contract.

## Stack (locked)
- Node 20+, TypeScript strict, pnpm workspaces, Turborepo
- Next.js 15 (web) — App Router
- Hono on Cloudflare Workers (API)
- Upstash Redis (queue + cache), Supabase/Neon Postgres (tenant + auth metadata)
- Drizzle ORM, Zod validation everywhere
- Google Sheets API v4 via service accounts + user OAuth refresh tokens
- Biome (lint + format); Vitest (unit); Playwright (e2e for dashboard)

## Non-negotiable behavioral rules

### Correctness over cleverness (write-queue slice especially)
The headline feature is "no race conditions." If you touch `slices/write-queue/` or `packages/queue/`, every change needs a concurrency test. No exceptions. The whole product dies if this is wrong.

### Zod schemas are the source of truth
Declare domain types as Zod schemas first, `z.infer<>` the TS types. Never hand-write duplicate TS types next to a schema.

### No secrets in packages/
The `packages/` tree is MIT OSS. Anything committed there ships to npm/pypi. Never put API keys, internal URLs, or customer data touching code there.

### Migrations are append-only
Drizzle migrations in `shared/db/migrations/` are immutable once merged to main. Fix forward with a new migration, never edit the past.

### API writes go through the queue, always
`rest-api` slice never talks to Google Sheets directly for writes. It submits to `write-queue`. Reads may hit the cached read path.

### Don't add features not in the spec
V2 items (webhooks, widget, audit log) are explicitly deferred. If you feel the urge, open an issue, don't implement.

### Idempotency by design
Every write endpoint accepts `Idempotency-Key` header. Retries must be safe. Treat this as a correctness property, not a "nice to have."

## Coding conventions
- **Error handling:** typed errors from `shared/types/errors.ts`. Throw `DomainError` subclasses, catch at the HTTP boundary.
- **Logging:** structured JSON via `shared/logger` (pino). Never `console.log` in non-test code.
- **Comments:** default to none. Only comment WHY when non-obvious (invariants, gotchas). Never describe WHAT the code does.
- **Tests:** co-located `__tests__/` per slice. Integration tests hit real Postgres + real Redis (Testcontainers), not mocks.
- **Naming:** slices are kebab-case, exports are camelCase, types are PascalCase.

## Marketing website
Lives at `marketing/`. It's a **verbatim copy** of `/Users/devanshtiwari/github/ai-website-cloner-template/src`. Only the content (text strings, logo, feature list, FAQ, demo video) gets swapped. Do not redesign the layout, colors, typography, or component structure. The OpenCode-style dark monospace aesthetic is intentional and brand-defining for the HN/portfolio audience.

## How to run locally (once scaffolded)
```bash
pnpm install
pnpm dev           # starts web, api, worker, redis, postgres via turbo
pnpm test          # vitest across all slices
pnpm test:e2e      # Playwright on the dashboard
pnpm lint          # biome + eslint boundaries
```

## When in doubt
1. Read `.omc/specs/deep-interview-acid-sheets.md` — it answers most "why" questions.
2. Read the slice's local `CLAUDE.md` before editing that slice.
3. Check `AGENTS.md` for which agent to delegate to — don't do cross-slice refactors without planner involvement.
