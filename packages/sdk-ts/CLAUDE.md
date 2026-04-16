# packages/sdk-ts

## Purpose
OSS (MIT) TypeScript SDK runtime helpers — base classes and fetch utilities used by generated SDKs.

## WARNING — OSS SAFETY
- This package ships to npm. No secrets, internal URLs, or SaaS-specific code.
- No imports from `shared/*`, `slices/*`, or `apps/*`. Only node_modules + other `packages/*`.
- "private": true until V0-028 acceptance tests pass — do NOT publish before that milestone.

## Public API
Exported from `src/index.ts`:
- (to be defined during V0 implementation)

## Key Files
- `src/index.ts` — public barrel

## Gotchas
- This is a runtime dependency for end-user projects — keep bundle size minimal.
- No Node.js-only APIs; must work in browser and edge runtimes.

## Never Do
- Don't import from `shared/*`, `slices/*`, or `apps/*`.
- Don't add Node.js-only APIs.
- Don't publish until V0-028 passes.
