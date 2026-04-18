<div align="center">

<br />

```
 ███████╗██╗  ██╗███████╗███████╗████████╗███████╗ ██████╗ ██████╗  ██████╗ ███████╗
 ██╔════╝██║  ██║██╔════╝██╔════╝╚══██╔══╝██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝
 ███████╗███████║█████╗  █████╗     ██║   █████╗  ██║   ██║██████╔╝██║  ███╗█████╗
 ╚════██║██╔══██║██╔══╝  ██╔══╝     ██║   ██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝
 ███████║██║  ██║███████╗███████╗   ██║   ██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗
 ╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝   ╚═╝   ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
```

### Google Sheets as a backend that actually behaves like one.

**Race-condition-safe writes · Typed SDKs from your live sheet · No polling, ever.**

<br />

[![CI](https://img.shields.io/github/actions/workflow/status/Devansh-365/sheetforge/ci.yml?branch=main&style=for-the-badge&logo=githubactions&logoColor=white&label=CI&labelColor=black&color=f2eded)](https://github.com/Devansh-365/sheetforge/actions)
[![Stars](https://img.shields.io/github/stars/Devansh-365/sheetforge?style=for-the-badge&logo=github&logoColor=white&labelColor=black&color=CFCECD)](https://github.com/Devansh-365/sheetforge/stargazers)
[![Issues](https://img.shields.io/github/issues/Devansh-365/sheetforge?style=for-the-badge&logo=github&logoColor=white&labelColor=black&color=f2eded)](https://github.com/Devansh-365/sheetforge/issues)
[![License](https://img.shields.io/badge/packages-MIT-black?style=for-the-badge&labelColor=CFCECD)](#license)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-black?style=for-the-badge&labelColor=f2eded)](#contributing)

<br />

[![Quickstart](https://img.shields.io/badge/Get%20started%20→-000000?style=for-the-badge&labelColor=f2eded)](#-quickstart)
&nbsp;
[![Try the hammer demo](https://img.shields.io/badge/Try%20the%20hammer%20demo%20→-f2eded?style=for-the-badge&labelColor=000000)](#-the-hammer-demo)
&nbsp;
[![How it works](https://img.shields.io/badge/How%20it%20works%20→-CFCECD?style=for-the-badge&labelColor=000000)](#-how-the-queue-actually-works)

<br />

<!-- drop `./docs/hammer-demo.gif` here when recorded. Until then: -->
<img alt="sheetforge hammer demo — 50 parallel writes landing as 50 ordered rows" src="https://img.shields.io/badge/▼%20%20drop%20docs%2Fhammer--demo.gif%20here%20%20▼-000000?style=for-the-badge&labelColor=CFCECD" width="520" />

<br /><br />

</div>

---

## TL;DR

The Google Sheets API drops rows under concurrent writes. Every "Sheets as a backend" wrapper you've tried — SheetDB, Sheety, NoCodeAPI — forwards your POST straight to `values.append` and inherits the bug. **sheetforge wraps every write in a per-sheet queue fenced by a Postgres advisory lock.** 50 parallel POSTs → 50 ordered rows, idempotent on retry. And because the sheet's header row is the schema, it generates a typed TypeScript SDK you commit to your repo.

---

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

// 4 POSTs → 3 rows.
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

// 4 POSTs → 4 rows, in order.
// retry-safe by key.
```

</td>
</tr>
</table>

`values.append` isn't serializable. Two concurrent appends can resolve to the same target row and one silently overwrites the other. It's a documented Google bug, and the upstream workaround boils down to "don't write concurrently." Fine for a demo. Not fine when your signup form catches an HN spike.

---

## The hammer demo

There's a button on the landing page labeled **Slam 50 parallel writes**. It fires 50 concurrent POSTs at a shared demo sheet, polls the status endpoint, and paints a 50-tile grid as writes land. Try breaking it.

```
  $ pnpm dev
  ▸ web  http://localhost:3000
  ▸ api  http://localhost:3001

  ┌────────────────────────────────────────────────────┐
  │  slam 50 parallel writes                           │
  ├────────────────────────────────────────────────────┤
  │  ██████████████████████████████████████████ 50/50  │
  │  ordered · idempotent · 1.2s end-to-end            │
  └────────────────────────────────────────────────────┘
```

Zero dropped rows. Zero duplicates on replay. Grid order matches enqueue order because the advisory lock serializes the tail. The same hammer hits a raw Sheets API sample and reliably drops 3-to-8 rows per run.

---

## Quickstart

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
<summary><b>What you need to do in the dashboard</b></summary>

1. Open `http://localhost:3000` → click **Dashboard** → Google OAuth consent (Sheets scope).
2. Land on `/app` → **+ new project** → **+ create key** → copy the `sk_live_…` once.
3. **+ connect sheet** → paste a Google Sheets URL → pick a tab. Header row becomes the schema.
4. On the sheet page, click **↓ download client.ts**. That's your typed SDK.

</details>

<details>
<summary><b>.env.example (full list)</b></summary>

```bash
PORT=3001
PUBLIC_BASE_URL=http://localhost:3001
WEB_BASE_URL=http://localhost:3000
ALLOWED_WEB_ORIGINS=                   # optional: commas, e.g. preview deploys
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

---

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

Returns `{ writeId, status: 'pending' }`. Row lands in the sheet in ~1s.

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

`plan: 'free' | 'pro'` because the sample cells were `'free'` and `'pro'`.

</td>
</tr>
</table>

---

## Features

<table>
<tr>
<td width="33%" valign="top">

### Serialized per-sheet queue
One worker per sheet at a time. Ordering guaranteed by Postgres advisory lock, not token protocols or lease clocks.

</td>
<td width="33%" valign="top">

### Idempotency by design
Every endpoint accepts `Idempotency-Key`. Retries dedupe via a partial unique index. Network flakes never double-write.

</td>
<td width="33%" valign="top">

### Typed SDK from live schema
Point at a sheet, get a typed TypeScript client. Literal unions inferred from sample cells. Compiler catches drift.

</td>
</tr>
<tr>
<td width="33%" valign="top">

### No polling
Redis Streams with consumer groups. Processor reads `XREADGROUP` in a blocking loop, acks after transaction commit.

</td>
<td width="33%" valign="top">

### Crash-safe by construction
Handler inside a Postgres transaction, `XACK` only after commit. Mid-flight crash → rollback → PEL redelivers → idempotency key catches the replay.

</td>
<td width="33%" valign="top">

### Self-host in 60 seconds
Docker-free local dev. One Postgres URL, one Redis URL (or Upstash REST). Next.js + Hono, both in one `pnpm dev`.

</td>
</tr>
</table>

---

## How the queue actually works

`submitWrite()` is the only ingress. It inserts a ledger row in Postgres (partial unique index on `(sheet_id, idempotency_key)` so retries dedupe), then `XADD`s an envelope to the sheet's Redis stream. A processor calls `processNext()` in a loop: `XREADGROUP` on the consumer group, take a Postgres advisory lock keyed by `hashtextextended(streamKey, 0)` inside a transaction, run the handler, `XACK` only after commit. Crash mid-handler → transaction rolls back → PEL redelivers → idempotency key catches the replay. The lock is the fence. No token protocol. No lease clock skew. No leader election.

Touching `slices/write-queue/` or `packages/queue/`? Every change lands with a concurrency test. That's the rule I don't break.

---

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

---

## How it compares

|                                   | **sheetforge**           | SheetDB     | Sheety      | Raw Sheets API |
| :-------------------------------- | :----------------------: | :---------: | :---------: | :------------: |
| Concurrent-write safety           | **yes, always**          | no          | no          | no             |
| Idempotent retries                | **yes**                  | no          | no          | no             |
| Typed SDK from live schema        | **TypeScript (V0)**      | none        | none        | none           |
| Open source                       | **yes (MIT packages)**   | no          | no          | N/A            |
| Self-host                         | **yes**                  | no          | no          | N/A            |
| Webhooks on write                 | V2                       | yes         | no          | no             |
| Free local dev                    | **yes**                  | trial       | trial       | yes            |
| Python SDK                        | V1                       | no          | no          | no             |

If you need webhooks today, use SheetDB. If you need your rows to land, come back.

---

## Repo layout

```
apps/
  web/              Next.js 15 dashboard + marketing
  api/              Hono on @hono/node-server + inline processor
  worker/           dedicated queue consumer (V1)

slices/             feature slices — barrel is the only public API
  auth/             Google OAuth, sessions, refresh tokens
  projects/         project + API-key CRUD
  sheets/           sheet connect, schema infer, cached reads
  schema/           header row → Zod schema derivation
  write-queue/      submitWrite, processNext, advisory-lock fencing
  rest-api/         Hono routes, CORS, idempotency, error boundary
  sdk-codegen/      schema → TypeScript client
  demo/             hammer demo (public, rate-limited)

packages/           MIT, npm-publishable, no shared/ imports
  queue/            generic Redis-Streams consumer
  codegen/          schema → typed-SDK engine
  sdk-ts/           runtime for generated clients

shared/             infra clients, no business logic
  db/               Drizzle schema + migrations
  redis/            ioredis + Upstash REST adapters
  google/           Sheets client + A1 quoting
  logger/           pino
  types/            typed DomainError hierarchy
```

Slice internals stay private. Cross-slice imports fail CI. `packages/*` stays OSS-safe — no `shared/*`, no secrets, publishable to npm tomorrow.

---

## Roadmap

**V0 — shipping now**
- [x] Google OAuth + session management
- [x] Sheet connect + header-row schema inference
- [x] Per-sheet write queue (Redis Streams + pg advisory lock)
- [x] Idempotency by key + partial unique index
- [x] Upstash REST adapter (Workers-ready)
- [x] TypeScript SDK download
- [x] Hammer demo on the landing page

**V1**
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

See `good-first-queue-hack` and `sdk-codegen` labels if you want to help pull V1 in.

---

## Why star this

Most "Sheets as a backend" tools wrap a broken primitive. sheetforge fixes the primitive and hands you a typed client on the way out. If you've ever shipped a form on Sheets and watched rows go missing during a launch, starring is the cheapest vote for correctness I can ask for.

<div align="center">

[![Star History Chart](https://api.star-history.com/svg?repos=Devansh-365/sheetforge&type=Date)](https://star-history.com/#Devansh-365/sheetforge&Date)

</div>

---

## Contributing

Before sending a PR:

- Read the root [`CLAUDE.md`](./CLAUDE.md) for slice boundaries and commit hygiene.
- Changes to `slices/write-queue/` or `packages/queue/` need a concurrency test. No exceptions.
- `packages/*` stays OSS-safe: no `shared/*`, no `apps/*`, no secrets.
- Zod schemas are the source of truth. `z.infer<>` the types, don't hand-write duplicates.
- Run `pnpm lint && pnpm typecheck` before pushing.

Issues and discussions are open. I answer them.

[![Open an issue](https://img.shields.io/badge/Open%20an%20issue%20→-000000?style=for-the-badge&labelColor=f2eded&logo=github&logoColor=black)](https://github.com/Devansh-365/sheetforge/issues/new)
&nbsp;
[![Join discussions](https://img.shields.io/badge/Join%20discussions%20→-f2eded?style=for-the-badge&labelColor=000000&logo=github&logoColor=white)](https://github.com/Devansh-365/sheetforge/discussions)

---

## License

`packages/queue`, `packages/codegen`, and `packages/sdk-ts` are **MIT** once the V0 concurrency acceptance demo passes. The apps and slices are **source-available** (all-rights-reserved pre-launch; source-available after). See [`LICENSE`](./LICENSE) once it lands.

---

<div align="center">

Built by **[@Devansh-365](https://github.com/Devansh-365)**, on purpose.

If this saved you a bug, star it.

```
[ sheetforge ]
```

</div>
