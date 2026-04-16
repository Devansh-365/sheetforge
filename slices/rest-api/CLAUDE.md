# slices/rest-api

## Purpose
Public REST endpoints for reads (cached path) and write submission (always via write-queue).

## Public API
Exported from `index.ts`:
- `createRestApiRouter()` — Hono router mounting all public REST routes

## Key Files
- `routes.ts` — route definitions, request validation, response shaping
- `service.ts` — read caching logic, write delegation to write-queue
- `types.ts` — Zod schemas: ReadResponse, WriteRequest, ErrorResponse

## Gotchas
- Every write endpoint must validate and forward `Idempotency-Key` to `slices/write-queue`.
- Read endpoints may serve cached data from Redis — document cache TTL in responses.
- This slice requires `security-reviewer` before merge (public-facing surface).

## Never Do
- Don't call Google Sheets API directly for writes — enqueue via `slices/write-queue`.
- Don't skip `Idempotency-Key` validation on any mutating endpoint.
- Don't import another slice's internals — only their `index.ts`.
