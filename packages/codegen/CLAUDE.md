# packages/codegen

## Purpose
OSS (MIT) SDK generator library — takes a sheet schema and emits TypeScript (V0) or Python (V1) SDK source.

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
- Python codegen is V1 only. Don't add it in V0.
- Generated code quality directly affects developer trust — test generated output.

## Never Do
- Don't import from `shared/*`, `slices/*`, or `apps/*`.
- Don't implement Python codegen in V0.
- Don't publish until V0-028 passes.
