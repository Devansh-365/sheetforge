# packages/queue

## Purpose
OSS (MIT) write-queue engine — the portable core of ACID-ish Sheets' race-condition-safe write primitive.

## WARNING — OSS SAFETY + CORRECTNESS CRITICAL
- This package ships to npm. No secrets, internal URLs, or SaaS-specific code.
- No imports from `shared/*`, `slices/*`, or `apps/*`. Only node_modules + other `packages/*`.
- "private": true until V0-028 acceptance tests pass — do NOT publish before that milestone.
- All changes require a concurrency test first (TDD). See AGENTS.md write-queue rules.

## Public API
Exported from `src/index.ts` — stable OSS surface:
- (to be defined during V0 implementation)

## Key Files
- `src/index.ts` — public barrel

## Gotchas
- OSS-safe means no customer data, no internal config, no proprietary logic.
- API changes here affect external consumers after publish — treat as a public contract.

## Never Do
- Don't import from `shared/*`, `slices/*`, or `apps/*`.
- Don't add secrets, internal URLs, or SaaS-specific logic.
- Don't publish until V0-028 passes.
