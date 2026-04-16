# shared/google

## Purpose
Thin, typed, runtime-agnostic Google Sheets v4 HTTP client. Accepts an OAuth access token via DI and exposes only the primitives the write-queue + schema + codegen slices use — nothing more.

## Public API (barrel from `src/index.ts`)
- `createSheetsClient({ accessToken, fetch?, logger? })` — returns a client object with 5 methods:
  - `getSpreadsheet({ spreadsheetId, fields? })` — metadata + tab list
  - `getValues({ spreadsheetId, range })` — read a range
  - `batchUpdateValues({ spreadsheetId, data, valueInputOption })` — write multiple ranges atomically
  - `batchUpdate({ spreadsheetId, requests })` — schema changes via the full batchUpdate API (insertDimension / updateCells / addSheet)
  - `appendSafe({ spreadsheetId, sheetId, startRowIndex, rows })` — atomic row insert via batchUpdate (see gotcha below)
- Types: `SheetsClient`, `SpreadsheetMetadata`, `ValueRange`, `BatchUpdateRequest`, `BatchUpdateResponse`, `BatchUpdateValuesResponse`, `AppendSafeRow`, `AppendSafeCell`, `ValueInputOption`.

## Runtime
- Works in Node AND Cloudflare Workers — only uses `fetch` and Web APIs. No Node-only imports.
- OAuth is NOT this module's concern; callers must pass a fresh access token. Use `slices/auth/refreshGoogleAccessToken` to refresh.

## Deliberate omission: `values.append`
The native Google `values.append` endpoint has a documented race — concurrent appends can drop rows (e.g. 4 parallel appends → 3 rows). We intentionally do not expose it. Use `appendSafe`, which wraps `batchUpdate` with `insertDimension` + `updateCells` in a single call for atomicity. See `.omc/plans/reference-queue-impl.md` §6.

## Error mapping
All non-2xx responses are converted to typed `DomainError` subclasses from `@sheetforge/shared-types`:
- 401 → `UnauthorizedError` (caller should refresh token and retry)
- 403 → `ForbiddenError` (user lacks access to the sheet)
- 404 → `NotFoundError`
- 429 → `RateLimitedError` with `retryAfterMs` derived from `Retry-After`
- 5xx / other → `InternalError`

## Gotchas
- `batchUpdate` atomicity is per-call. Cross-call serialisation is the write-queue's responsibility (advisory lock + fencing token).
- Don't log access tokens or response bodies containing user data at `info` or above — stick to `debug` / `warn`.

## Never Do
- Don't expose a `values.append` wrapper — it's the banned primitive.
- Don't import `slices/*`, `apps/*`, or any other `shared/*` package beyond `shared-logger` and `shared-types`.
- Don't add Node-only deps (`fs`, `crypto`, `stream`) — breaks Workers.
