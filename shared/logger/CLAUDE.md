# shared/logger

## Purpose
Structured JSON logger (pino) used across all apps and slices.

## Public API
Exported from `src/index.ts`:
- `createLogger(opts?: { level?, service?, context? }): Logger` — returns a pino instance
- `Logger` — re-exported pino `Logger` type (no `any`)

No default singleton is exported. Always inject the logger via function parameters or constructors (DI-only pattern).

## Behaviour
- **Production** (`NODE_ENV=production`): emits newline-delimited JSON to stdout.
- **Development** (any other `NODE_ENV`): uses `pino-pretty` transport for human-readable output.
- Log level defaults to `info`; override with `LOG_LEVEL` env var or the `level` option.
- `service` field is stamped on every log line when provided.
- `context` fields are added via `.child(context)` internally; callers may call `.child({ requestId, writeId, ... })` themselves to add correlation IDs.

## Key Files
- `src/index.ts` — `createLogger` factory + `Logger` type

## Rules
- **Never `console.log`** in non-test code — always use this logger.
- Never log secrets, OAuth tokens, or customer PII at any level.
- This is a leaf node: only imports `node_modules` (no `shared/*`, `slices/*`, `apps/*`).
