# shared/types

## Purpose
Typed `DomainError` hierarchy and HTTP-boundary helpers used across all apps and slices.

## Public API
Exported from `src/index.ts` (re-exports `src/errors.ts`):

### Error classes
| Class | `code` | `statusCode` |
|---|---|---|
| `UnauthorizedError` | `AUTH_REQUIRED` | 401 |
| `ForbiddenError` | `FORBIDDEN` | 403 |
| `NotFoundError` | `NOT_FOUND` | 404 |
| `ValidationError` | `VALIDATION_FAILED` | 400 |
| `ConflictError` | `CONFLICT` | 409 |
| `RateLimitedError` | `RATE_LIMITED` | 429 |
| `InternalError` | `INTERNAL` | 500 |
| `IdempotencyReplayError` | `IDEMPOTENCY_REPLAY` | 409 |
| `SchemaVersionMismatchError` | `SCHEMA_VERSION_MISMATCH` | 409 |

All extend `DomainError` which provides `toJSON()` → `{ code, message, statusCode, details? }`.

### Helpers
- `isDomainError(err): err is DomainError` — type guard
- `toHttpResponse(err: unknown): { status, body: { error: { code, message, details? } } }` — wraps unknown errors as `InternalError` shape

## Rules
- **Never `console.log`** — log via `shared/logger`.
- Throw `DomainError` subclasses everywhere; catch at the HTTP boundary using `toHttpResponse`.
- This is a leaf node: only imports `node_modules` (no `shared/*`, `slices/*`, `apps/*`).
- Do not add domain-specific error types here — they belong in the owning slice's `types.ts`.
