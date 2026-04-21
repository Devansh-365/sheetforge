<div align="center">

<br />

<img src="apps/web/public/logo.svg" alt="sheetforge" width="120" height="120" />

# sheetforge

### Google Sheets as a backend that actually behaves like one.

Serialized writes. Idempotent retries. Typed TypeScript SDKs, generated live from your sheet's headers.

<br />

[![CI](https://img.shields.io/github/actions/workflow/status/Devansh-365/sheetforge/ci.yml?branch=main&style=for-the-badge&logo=githubactions&logoColor=white&label=CI&labelColor=0c0c0e&color=22c55e)](https://github.com/Devansh-365/sheetforge/actions)
[![Stars](https://img.shields.io/github/stars/Devansh-365/sheetforge?style=for-the-badge&logo=github&logoColor=white&labelColor=0c0c0e&color=22c55e)](https://github.com/Devansh-365/sheetforge/stargazers)
[![Issues](https://img.shields.io/github/issues/Devansh-365/sheetforge?style=for-the-badge&logo=github&logoColor=white&labelColor=0c0c0e&color=22c55e)](https://github.com/Devansh-365/sheetforge/issues)
[![License](https://img.shields.io/badge/license-MIT-0c0c0e?style=for-the-badge&labelColor=22c55e)](./LICENSE)
[![Hosted SaaS](https://img.shields.io/badge/status-hosted%20live-22c55e?style=for-the-badge&labelColor=0c0c0e)](https://getsheetforge.vercel.app/)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-0c0c0e?style=for-the-badge&labelColor=22c55e)](#contributing)

<br />

[![Get started free](https://img.shields.io/badge/Get%20started%20free%20→-0c0c0e?style=for-the-badge&labelColor=22c55e)](https://getsheetforge.vercel.app/)
&nbsp;
[![How it works](https://img.shields.io/badge/How%20it%20works%20→-bbf7d0?style=for-the-badge&labelColor=0c0c0e)](#how-the-queue-actually-works)

<br />

</div>

> ### 🟢 Hosted SaaS is live
>
> **[getsheetforge.vercel.app](https://getsheetforge.vercel.app/)** — one-click Google sign-in, no infra required. The MIT-licensed OSS core (`packages/queue`, `packages/codegen`, `packages/sdk-ts`) stays free forever, and self-hosting is fully supported if you'd rather run your own stack. See [Quickstart](#quickstart) below for both paths.

> **TL;DR.** The Google Sheets API drops rows under concurrent writes. Every "Sheets as a backend" wrapper (SheetDB, Sheety, NoCodeAPI) forwards your POST straight to `values.append` and inherits the bug. **sheetforge** wraps every write in a per-sheet queue fenced by a Postgres advisory lock: 50 parallel writes, 50 ordered rows, retry-safe by key. And because your header row is the schema, you get a typed TypeScript SDK you can commit alongside the call sites.

## The problem

<table>
<tr>
<td width="50%" valign="top">

**Raw Google Sheets API**

```ts
await Promise.all([
  sheets.values.append({ ...a }),
  sheets.values.append({ ...b }),
  sheets.values.append({ ...c }),
  sheets.values.append({ ...d }),
]);

// 4 POSTs, 3 rows.
// one silently clobbered.
```

</td>
<td width="50%" valign="top">

**sheetforge**

```ts
await Promise.all([
  sheetforge.rows.insert(a, { idempotencyKey: '1' }),
  sheetforge.rows.insert(b, { idempotencyKey: '2' }),
  sheetforge.rows.insert(c, { idempotencyKey: '3' }),
  sheetforge.rows.insert(d, { idempotencyKey: '4' }),
]);

// 4 POSTs, 4 rows, in order.
// retry-safe by key.
```

</td>
</tr>
</table>

`values.append` isn't serializable. Two concurrent appends can resolve to the same target row and one silently overwrites the other. It's a documented Google bug whose upstream workaround boils down to "don't write concurrently." Fine for a demo. Not fine when your signup form catches an HN spike.

## Status

| Surface | Status |
| :-- | :-- |
| Hosted SaaS (sign up, skip local infra) | ✅ live at [getsheetforge.vercel.app](https://getsheetforge.vercel.app/) |
| Dashboard + API (write-queue, SDK codegen) | ✅ live (also runs locally via `pnpm dev`) |
| Self-host | ✅ supported — see [quickstart](#quickstart) |
| OSS core (`packages/queue`, `packages/codegen`, `packages/sdk-ts`) | ✅ MIT, free forever |

## Quickstart

### Hosted (30 seconds)
1. Go to [getsheetforge.vercel.app](https://getsheetforge.vercel.app/)
2. Sign in with Google
3. Connect a Sheet

### Self-host

```bash
git clone https://github.com/Devansh-365/sheetforge.git
cd sheetforge
pnpm install
cp .env.example .env          # fill in Google OAuth + DATABASE_URL
pnpm db:push                  # apply migrations (works against Neon too)
pnpm dev                      # web :3000, api + processor :3001
```

**Prereqs.** Node 20+, pnpm 9+, Postgres 14+, and either local Redis on `:6379` **or** an Upstash REST endpoint (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`).

<details>
<summary><b>What you do in the dashboard</b></summary>

<br />

1. Open `http://localhost:3000` and click **Dashboard**. Google OAuth consent with the Sheets scope.
2. Land on `/app`. Click **+ new project**, then **+ create key**, then copy the `sk_live_…` value (shown once).
3. Click **+ connect sheet**. Paste a Google Sheets URL. Pick a tab. The header row becomes your schema.
4. On the sheet page, click **↓ download client.ts**. That is your typed SDK.

</details>

<details>
<summary><b>.env.example (full list)</b></summary>

```bash
PORT=3001
PUBLIC_BASE_URL=http://localhost:3001
WEB_BASE_URL=http://localhost:3000
ALLOWED_WEB_ORIGINS=                   # optional, commas. e.g. preview deploys
DATABASE_URL=postgres://…              # local or Neon
REDIS_URL=redis://localhost:6379       # either this…
UPSTASH_REDIS_REST_URL=                # …or these two
UPSTASH_REDIS_REST_TOKEN=
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URL=http://localhost:3001/v1/oauth/callback
SESSION_JWT_SECRET=                    # openssl rand -hex 32
PROCESSOR_ENABLED=true
PROCESSOR_TICK_MS=1000
```

</details>

## First write

<table>
<tr>
<td width="50%" valign="top">

**REST**

```bash
curl -X POST \
  http://localhost:3001/v1/sheets/$SHEET_ID/rows \
  -H "Authorization: Bearer $API_KEY" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{"email":"hi@example.com","plan":"free"}'
```

Returns `{ writeId, status: 'pending' }`. The row lands in the sheet in about one second.

</td>
<td width="50%" valign="top">

**Typed SDK (generated from your headers)**

```ts
import { createClient } from './sheetforge-client';

const sheet = createClient({
  apiKey: process.env.SHEETFORGE_API_KEY!,
  sheetId: 'sht_…',
});

await sheet.rows.insert(
  { email: 'hi@example.com', plan: 'free' },
  { idempotencyKey: crypto.randomUUID() },
);
```

`plan: 'free' | 'pro'` because the sample cells read `'free'` and `'pro'`.

</td>
</tr>
</table>

## Features

<table>
<tr>
<td width="33%" valign="top">

### Serialized per-sheet queue
One worker per sheet at a time. Ordering guaranteed by a Postgres advisory lock, not a token protocol or a lease clock.

</td>
<td width="33%" valign="top">

### Idempotency by design
Every endpoint accepts `Idempotency-Key`. Retries dedupe via a partial unique index. Network flakes never double-write.

</td>
<td width="33%" valign="top">

### Typed SDK from live schema
Point at a sheet, get a typed TypeScript client. Literal unions inferred from sample cells. The compiler catches drift.

</td>
</tr>
<tr>
<td width="33%" valign="top">

### No polling
Redis Streams with consumer groups. The processor blocks on `XREADGROUP` and acks only after the handler commits.

</td>
<td width="33%" valign="top">

### Crash-safe by construction
Handler runs inside a Postgres transaction. `XACK` happens post-commit. Mid-flight crash rolls back. The PEL redelivers. The idempotency key catches the replay.

</td>
<td width="33%" valign="top">

### Self-host in 60 seconds
No Docker required for local dev — one Postgres URL, one Redis URL (or Upstash REST). Next.js and Hono, both in one `pnpm dev`. Or skip all of it and use the [hosted version](https://getsheetforge.vercel.app/).

</td>
</tr>
</table>

## How the queue actually works

`submitWrite()` is the only ingress. It inserts a ledger row in Postgres (with a partial unique index on `(sheet_id, idempotency_key)` so retries dedupe), then `XADD`s an envelope to the sheet's Redis stream. The processor runs `processNext()` in a loop: `XREADGROUP` on the consumer group, take a Postgres advisory lock keyed by `hashtextextended(streamKey, 0)` inside a transaction, run the handler, `XACK` only after commit. A crash mid-handler rolls the transaction back, the PEL redelivers, and the idempotency key catches the replay. The lock is the fence. No token protocol. No lease clock skew. No leader election.

Touching `slices/write-queue/` or `packages/queue/`? Every change lands with a concurrency test. That is the rule I do not break.

## Tech stack

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript%205-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js 20](https://img.shields.io/badge/Node%2020-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js%2015-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React 19](https://img.shields.io/badge/React%2019-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Hono](https://img.shields.io/badge/Hono-FF5C00?style=for-the-badge&logo=hono&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis Streams](https://img.shields.io/badge/Redis%20Streams-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Drizzle](https://img.shields.io/badge/Drizzle%20ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black)
![Zod](https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white)
![Upstash](https://img.shields.io/badge/Upstash-00E9A3?style=for-the-badge&logo=upstash&logoColor=black)
![Google Sheets API](https://img.shields.io/badge/Sheets%20API%20v4-34A853?style=for-the-badge&logo=googlesheets&logoColor=white)

![pnpm](https://img.shields.io/badge/pnpm%209-F69220?style=for-the-badge&logo=pnpm&logoColor=white)
![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?style=for-the-badge&logo=turborepo&logoColor=white)
![Biome](https://img.shields.io/badge/Biome-60A5FA?style=for-the-badge&logo=biome&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/CF%20Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)

</div>

## How it compares

|                                 | **sheetforge**         | SheetDB | Sheety | Raw Sheets API |
| :------------------------------ | :--------------------: | :-----: | :----: | :------------: |
| Concurrent-write safety         | **yes, always**        | no      | no     | no             |
| Idempotent retries              | **yes**                | no      | no     | no             |
| Typed SDK from live schema      | **TypeScript (V0)**    | none    | none   | none           |
| Open source                     | **yes (MIT packages)** | no      | no     | N/A            |
| Self-host                       | **yes**                | no      | no     | N/A            |
| Webhooks on write               | V2                     | yes     | no     | no             |
| Free local dev                  | **yes**                | trial   | trial  | yes            |
| Python SDK                      | V1                     | no      | no     | no             |

If you need webhooks today, use SheetDB. If you need your rows to land, come back.

## Repo layout

```
apps/
  web/              Next.js 15 dashboard and marketing
  api/              Hono on @hono/node-server plus inline processor
  worker/           dedicated queue consumer (V1)

slices/             feature slices. barrel is the only public API
  auth/             Google OAuth, sessions, refresh tokens
  projects/         project and API-key CRUD
  sheets/           sheet connect, schema infer, cached reads
  schema/           header row to Zod schema derivation
  write-queue/      submitWrite, processNext, advisory-lock fencing
  rest-api/         Hono routes, CORS, idempotency, error boundary
  sdk-codegen/      schema to TypeScript client
  demo/             local-only hammer demo

packages/           MIT, npm-publishable, no shared/ imports
  queue/            generic Redis-Streams consumer
  codegen/          schema to typed-SDK engine
  sdk-ts/           runtime for generated clients

shared/             infra clients, no business logic
  db/               Drizzle schema and migrations
  redis/            ioredis and Upstash REST adapters
  google/           Sheets client and A1 quoting
  logger/           pino
  types/            typed DomainError hierarchy
```

Slice internals stay private. Cross-slice imports fail CI. `packages/*` stays OSS-safe with no `shared/*` imports, no secrets, publishable to npm tomorrow.

## Roadmap

**V0, shipping now**
- [x] Google OAuth and session management
- [x] Sheet connect with header-row schema inference
- [x] Per-sheet write queue (Redis Streams + pg advisory lock)
- [x] Idempotency by key, partial unique index
- [x] Upstash REST adapter (Workers-ready)
- [x] TypeScript SDK download

**V1**
- [ ] Hammer demo on the hosted landing page
- [ ] Dedicated worker process (currently inline with API)
- [ ] Python SDK generator
- [ ] Write-status webhooks
- [ ] Per-API-key rate limits
- [ ] Richer cell types (dates, enums from data validation)

**V2**
- [ ] Sub-10ms cached reads via stream-tailing CDC
- [ ] Per-cell audit log
- [ ] Embeddable signup-form widget
- [ ] Team workspaces
- [ ] Cloudflare Workers deploy target

See the `good-first-queue-hack` and `sdk-codegen` labels if you want to help pull V1 in.

## Why star this

Most "Sheets as a backend" tools wrap a broken primitive. sheetforge fixes the primitive, then hands you a typed client on the way out. If you've ever shipped a form on Sheets and watched rows vanish mid-launch, a star is the cheapest vote for correctness you can cast.

## Contributing

Before sending a PR:

- Read the root [`CLAUDE.md`](./CLAUDE.md) for slice boundaries and commit hygiene.
- Changes to `slices/write-queue/` or `packages/queue/` need a concurrency test. No exceptions.
- `packages/*` stays OSS-safe. No `shared/*`, no `apps/*`, no secrets.
- Zod schemas are the source of truth. `z.infer<>` the types. Do not hand-write duplicates.
- Run `pnpm lint && pnpm typecheck` before pushing.

Issues and discussions are open. I answer them.

<div align="center">

[![Open an issue](https://img.shields.io/badge/Open%20an%20issue%20→-000000?style=for-the-badge&labelColor=f2eded&logo=github&logoColor=black)](https://github.com/Devansh-365/sheetforge/issues/new)
&nbsp;
[![Join discussions](https://img.shields.io/badge/Join%20discussions%20→-f2eded?style=for-the-badge&labelColor=000000&logo=github&logoColor=white)](https://github.com/Devansh-365/sheetforge/discussions)

</div>

## License

[MIT](./LICENSE). Clone, fork, self-host, ship — no strings. The hosted SaaS runs on the same MIT core; the managed service is the product, the code stays free.

<br />

<div align="center">

Built by <a href="https://github.com/Devansh-365"><b>@Devansh-365</b></a>, on purpose.

If this saved you a bug, star it.

<br />

`[ sheetforge ]`

</div>
