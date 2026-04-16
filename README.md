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

Copy `.env.example` to `.env` and fill in the secrets:

```
PORT=3001
PUBLIC_BASE_URL=http://localhost:3001       # API base — where the SDK POSTs
WEB_BASE_URL=http://localhost:3000          # browser base — CORS + post-OAuth redirect
DATABASE_URL=postgres://…                   # local Postgres or a Neon connection string
REDIS_URL=redis://localhost:6379
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URL=http://localhost:3001/v1/oauth/callback
SESSION_JWT_SECRET=                         # openssl rand -hex 32
PROCESSOR_ENABLED=true
PROCESSOR_TICK_MS=1000
```

### setup

```bash
pnpm install

# push the initial schema (works with local Postgres or Neon — no psql needed)
node --env-file=.env shared/db/scripts/push-migration.mjs

# marketing + dashboard → http://localhost:3000
pnpm dev

# api + inline write-queue processor → http://localhost:3001
pnpm --filter @acid-sheets/api dev
```

### end-to-end flow

1. Open `http://localhost:3000` → click **Dashboard** → redirects to Google OAuth (Sheets scope).
2. After consent you land at `http://localhost:3000/app` — click **+ new project**.
3. On the project page, click **+ create key** and copy the plaintext `sk_live_…` value (shown once).
4. Click **+ connect sheet**, paste a Google Sheets URL, pick a tab — the sheet must be shared with your Google account and the first row must be headers. The schema is inferred automatically.
5. Open the sheet detail page and click **↓ download client.ts** — that's your typed SDK, ready to commit to your repo.
6. ```bash
   curl -X POST http://localhost:3001/v1/sheets/:sheetId/rows \
     -H 'Authorization: Bearer sk_live_...' \
     -H 'Idempotency-Key: abc-123' \
     -d '{"email":"hi@example.com"}'
   ```
   Row lands in the sheet ~1s later (processor tick). Same `Idempotency-Key` never duplicates.

Prefer raw HTTP? The same flow works via `curl` against the REST endpoints — see `slices/rest-api/CLAUDE.md` for the route map.

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
