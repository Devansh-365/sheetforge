# slices/auth

## Purpose
Google OAuth 3-legged flow + short-lived session JWT + Google access-token refresh helper.

## Public API (barrel from `index.ts`)
- `generateAuthorizeUrl({ env, state })` — builds the Google consent URL; caller is responsible for persisting `state` for CSRF protection.
- `handleCallback({ code, env, db, logger? })` — exchanges authorization code, fetches userinfo, upserts the user row, returns `{ userId, email }`. Callers should then `issueSessionJwt` and set a cookie.
- `issueSessionJwt({ claims, env })` — HS256 JWT with 7-day expiry.
- `verifySessionJwt({ token, env })` — returns `SessionClaims` or throws `UnauthorizedError`.
- `refreshGoogleAccessToken({ refreshToken, env })` — trades a stored refresh token for a fresh access token.
- Types: `AuthEnv`, `SessionClaims`, `GoogleUserInfo`. Zod schemas: `AuthEnvSchema`, `SessionClaimsSchema`, `GoogleUserInfoSchema`.

## Key Files
- `service.ts` — OAuth + JWT business logic, no DB coupling other than `handleCallback`.
- `repo.ts` — Drizzle-backed `upsertUserByEmail` and `getUserById`.
- `types.ts` — Zod source of truth for env + claim shapes.

## Env required
```
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_OAUTH_REDIRECT_URL
SESSION_JWT_SECRET     # ≥32 bytes random
```

## Scopes requested
`openid email profile https://www.googleapis.com/auth/spreadsheets`

## Gotchas
- `access_type=offline` + `prompt=consent` are both required to get a refresh token on every consent; dropping `prompt=consent` means Google only returns a refresh token on first consent and the upsert path will leave `googleRefreshToken` null on subsequent logins.
- Refresh tokens are stored plaintext in V0 — encryption-at-rest is tracked as a follow-up, not a blocker for initial launch.
- Session cookie is the consumer's job (`apps/web` sets it) — this slice only produces/verifies the JWT.
- Workers-compatible: uses only `fetch` + `jose` (Web Crypto); no Node-only imports.

## Never Do
- Don't log access/refresh tokens at any level.
- Don't import another slice's internals — only its `index.ts`.
- Don't swap `jose` for a Node-only JWT lib — breaks Cloudflare Workers compatibility.
