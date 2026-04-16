# shared/types

## Purpose
Shared Zod schemas, inferred TypeScript types, and DomainError base classes used across all slices.

## Public API
Exported from `src/index.ts`:
- `DomainError` — base error class; all typed errors extend this
- Common Zod schemas: pagination, ID types, timestamps
- (Domain-specific schemas live in their respective slice `types.ts`)

## Key Files
- `src/index.ts` — all exports

## Gotchas
- Zod schemas are the source of truth — never hand-write duplicate TS types.
- `DomainError` subclasses are caught at the HTTP boundary in `apps/api`.
- This is a leaf node: only imports node_modules.

## Never Do
- Don't put domain-specific types here — they belong in the owning slice's `types.ts`.
- Don't import from `slices/*`, `apps/*`, or other `shared/*` packages.
- Don't hand-write TS types that duplicate a Zod schema.
