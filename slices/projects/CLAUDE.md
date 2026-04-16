# slices/projects

## Purpose
Project and API key CRUD — the top-level tenant resource each user owns.

## Public API
Exported from `index.ts`:
- `createProjectsRouter()` — Hono router for project endpoints
- `getProjectById(id)` — fetch a project by ID
- `listProjectsForUser(userId)` — list all projects for a user

## Key Files
- `service.ts` — project creation, API key rotation logic
- `repo.ts` — Postgres CRUD for projects and API keys
- `types.ts` — Zod schemas: Project, ApiKeyCreate

## Gotchas
- API keys are generated here but validated in `slices/auth`.
- Deleting a project must cascade-delete its sheets and queue entries.

## Never Do
- Don't validate API keys here — delegate to `slices/auth`.
- Don't import another slice's internals — only their `index.ts`.
- Don't put HTTP logic in `service.ts`.
