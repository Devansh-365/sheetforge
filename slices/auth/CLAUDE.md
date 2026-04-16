# slices/auth

## Purpose
Google OAuth flow, session management, and API key validation.

## Public API
Exported from `index.ts`:
- `createAuthRouter()` — Hono router for OAuth endpoints
- `validateSession(token)` — validate session token, return user
- `validateApiKey(key)` — validate API key, return project

## Key Files
- `service.ts` — OAuth flow logic, token refresh
- `repo.ts` — session + API key DB access
- `types.ts` — Zod schemas: Session, ApiKey, OAuthToken

## Gotchas
- OAuth refresh tokens are encrypted at rest. Never log them.
- Every change here requires a `security-reviewer` pass before merge (see AGENTS.md).
- API keys use constant-time comparison to prevent timing attacks.

## Never Do
- Don't store raw refresh tokens in plaintext.
- Don't skip the `security-reviewer` agent for any change in this slice.
- Don't import another slice's internals — only their `index.ts`.
