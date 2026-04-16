# sheetforge

Google Sheets as a backend that actually behaves like one. Race-condition-safe writes, auto-generated typed SDKs, no polling.

## Why

Every `values.append` on the Google Sheets API can drop rows under concurrent writes — 4 parallel appends → 3 rows is a documented bug. sheetforge wraps every write in a per-sheet queue with Postgres-advisory-lock fencing, so 1000 concurrent POSTs land as 1000 ordered rows. It also generates a TypeScript SDK live from your sheet's header row.

## Local demo

### prerequisites

- Node 20+
- pnpm 9+
- Postgres 14+ on `:5432`
- Redis 6+ on `:6379`
- A Google Cloud OAuth 2.0 client ID ([create one](https://console.cloud.google.com/apis/credentials) — redirect URI: `http://localhost:3001/v1/oauth/callback`)

### env

Create `.env` at the repo root with:

```
PORT=3001
PUBLIC_BASE_URL=http://localhost:3001
DATABASE_URL=postgres://postgres:postgres@localhost:5432/sheetforge
REDIS_URL=redis://localhost:6379
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URL=http://localhost:3001/v1/oauth/callback
SESSION_JWT_SECRET=   # openssl rand -hex 32
PROCESSOR_ENABLED=true
PROCESSOR_TICK_MS=1000
```

### setup

```bash
pnpm install
createdb sheetforge
psql sheetforge -f shared/db/migrations/0000_unknown_spyke.sql

# marketing site → http://localhost:3000
pnpm dev

# api + inline write-queue processor → http://localhost:3001
pnpm --filter @acid-sheets/api dev
```

### end-to-end flow

1. `open http://localhost:3001/v1/oauth/login` — sign in with Google (Sheets scope).
2. `curl -X POST http://localhost:3001/v1/projects -H 'Cookie: session=...' -d '{"name":"demo"}'` — project id comes back.
3. `curl -X POST http://localhost:3001/v1/projects/:id/api-keys` — returns plaintext `sk_live_...` **once**; copy it.
4. `curl -X POST http://localhost:3001/v1/projects/:id/sheets -d '{"googleSheetId":"<id>","tabName":"Sheet1"}'` — share the sheet with your Google account first; first row must be headers.
5. `curl http://localhost:3001/v1/projects/:id/sheets/:sheetId/sdk.ts > client.ts` — typed TypeScript client.
6. ```bash
   curl -X POST http://localhost:3001/v1/sheets/:sheetId/rows \
     -H 'Authorization: Bearer sk_live_...' \
     -H 'Idempotency-Key: abc-123' \
     -d '{"email":"hi@example.com"}'
   ```
   Row lands in the sheet ~1s later (processor tick). Same `Idempotency-Key` never duplicates.

## architecture

Feature-sliced monorepo. See [CLAUDE.md](./CLAUDE.md) for slice-boundary rules and [AGENTS.md](./AGENTS.md) for agent routing.

```
apps/        web (Next.js), api (Hono on Node + inline processor), worker (separate consumer, V1)
slices/      auth · projects · sheets · schema · write-queue · rest-api · sdk-codegen
packages/    queue (OSS MIT) · codegen (OSS MIT) · sdk-ts
shared/      db · redis · google · types · logger
```

The write-queue slice is the thesis: `submitWrite()` is the only ingress; `processNext()` acquires a Postgres advisory lock per sheet (atomic fencing, no token protocol), runs the handler inside a transaction, and acks Redis only after commit. Crash → rollback → PEL redelivery → idempotency dedupe catches the replay.

## license

`packages/queue` and `packages/codegen` will ship under MIT once the concurrency acceptance demo passes. Everything else is all-rights-reserved until the V0 launch.
