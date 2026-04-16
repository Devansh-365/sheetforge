# slices/rest-api

## Purpose
Hono-based HTTP router that composes every public endpoint. Runtime-agnostic (Node via `@hono/node-server`, Cloudflare Workers via `fetch`).

## Public API (barrel)
- `createRouter({ db, redis, env })` — returns a Hono app with all routes mounted under `/v1`. Type parameter `{ Variables: AppVariables }` gives typed `c.get('user')` / `c.get('apiKey')`.
- Types: `RouterDeps`, `RouterEnv`, `AppVariables`.

## Route map
**Auth (unprotected):**
- `GET /v1/oauth/login` — redirect to Google
- `GET /v1/oauth/callback` — consume code, set session cookie
- `POST /v1/auth/logout`

**Session-protected (dashboard):**
- `GET/POST/DELETE /v1/projects`
- `GET/POST/DELETE /v1/projects/:projectId/api-keys`
- `GET/POST /v1/projects/:projectId/sheets`
- `GET /v1/projects/:projectId/sheets/:sheetId/schema`
- `POST /v1/projects/:projectId/sheets/:sheetId/schema/refresh`
- `GET /v1/projects/:projectId/sheets/:sheetId/sdk.ts` — returns generated TypeScript source

**API-key-protected (data plane):**
- `POST /v1/sheets/:sheetId/rows` — enqueues via submitWrite, honors `Idempotency-Key`
- `GET /v1/sheets/:sheetId/rows` — reads via the project owner's OAuth token

## Auth design
- `Authorization: Bearer <sk_live_...>` → API-key flow (data plane)
- `Authorization: Bearer <jwt>` or `session` cookie → session flow (dashboard)
- The `requireSession` middleware falls through to the cookie when the Authorization header carries an API key prefix.

## Error boundary
`errorHandler` runs on any thrown error and maps `DomainError` subclasses to their HTTP shape via `shared/types/toHttpResponse`. Unexpected errors become `500 { error: { code: 'INTERNAL', ... } }` and are logged at error level.

## Never Do
- Don't call Google Sheets directly for WRITES — always through `submitWrite`.
- Don't return `hashedKey` or any plaintext token in responses.
- Don't set long-lived cookies without `httpOnly` + `SameSite=Lax`.
- Don't import another slice's internals — only barrels.
