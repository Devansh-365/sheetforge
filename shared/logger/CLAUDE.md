# shared/logger

## Purpose
Structured JSON logger (pino) used across all apps and slices.

## Public API
Exported from `src/index.ts`:
- `createLogger(context)` — returns a pino logger instance with context fields

## Key Files
- `src/index.ts` — logger factory

## Gotchas
- Never use `console.log` in non-test code — always use this logger.
- Log level is controlled by `LOG_LEVEL` env var; default `info` in production.
- This is a leaf node: only imports node_modules.

## Never Do
- Don't log secrets, OAuth tokens, or customer PII at any level.
- Don't import from `slices/*`, `apps/*`, or other `shared/*` packages.
- Don't use `console.log` — use the logger.
