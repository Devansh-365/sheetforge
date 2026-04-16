# shared/google

## Purpose
Google Sheets API v4 client and OAuth helper utilities shared by slices that need to read or write sheets.

## WARNING — SECURITY SENSITIVE
Every change here requires a `security-reviewer` agent pass before merge (OAuth token handling).

## Public API
Exported from `src/index.ts`:
- `createSheetsClient(credentials)` — returns authenticated Sheets API client
- `refreshOAuthToken(refreshToken)` — refresh a user OAuth token

## Key Files
- `src/index.ts` — client factory and OAuth helpers

## Gotchas
- Refresh tokens are secrets — never log them, never return them in API responses.
- This is a leaf node: only imports node_modules.

## Never Do
- Don't log OAuth tokens or refresh tokens at any log level.
- Don't import from `slices/*`, `apps/*`, or other `shared/*` packages.
- Don't skip `security-reviewer` for any change here.
