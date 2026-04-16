# slices/projects

## Purpose
CRUD for projects (the top-level tenant resource each user owns) and API keys (one-way hashed credentials scoped to a project).

## Public API (barrel)
- `createProject`, `listProjects`, `getProject`, `deleteProject` — ownership enforced by `userId` passed in.
- `createApiKey` — returns `{ handle, plaintextKey }`. The plaintext key is surfaced exactly once; it is never stored and never returned again.
- `listApiKeys`, `revokeApiKey` — safe views only (no plaintext, no hash).
- `validateApiKey({ db, apiKey })` — used by the API auth middleware to resolve an incoming `sk_live_*` key to its owning project. Throws `UnauthorizedError` on format or lookup failure.
- Types: `Project`, `CreateProjectInput`, `ApiKeyHandle`, `NewApiKeyResult`, `ResolvedApiKey`. Zod schemas: `ProjectSchema`, `CreateProjectInputSchema`, `ApiKeyHandleSchema`.

## Key design choices
- API keys are high-entropy random (24 bytes / 48 hex chars), prefixed `sk_live_`, stored as SHA-256 hex in the DB. Because input entropy is high, a single-round cryptographic hash is sufficient for lookup — no bcrypt/argon2 work factor needed.
- No plaintext comparison, no timing attack surface: the lookup is a straight `WHERE hashed_key = $1` on an indexed unique column.
- `touchLastUsedAt` runs fire-and-forget after a successful validate — never blocks auth if the touch fails (logged upstream as debug).
- Ownership is enforced in `service.ts` — every non-validate method accepts `userId` and verifies ownership before any write.

## Runtime
Uses `node:crypto`. In Cloudflare Workers enable `nodejs_compat` in `wrangler.toml`; Node workers use it natively.

## Never Do
- Don't return the raw `hashedKey` in any response — always build a `prefix` view.
- Don't surface plaintext keys more than once (the `createApiKey` return value is the only time).
- Don't skip the ownership check in service methods — repo-level writes trust the caller.
- Don't import another slice's internals — only barrels.
