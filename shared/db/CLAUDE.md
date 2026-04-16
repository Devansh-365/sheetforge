# shared/db

## Purpose
Drizzle ORM client and migrations for the Postgres database shared across all slices.

## Public API
Exported from `src/index.ts`:
- `db` — Drizzle client instance
- `migrations/` — append-only migration files

## Key Files
- `src/index.ts` — exports configured Drizzle client
- `src/migrations/` — Drizzle migration SQL files (append-only)

## Gotchas
- Migrations are IMMUTABLE once merged to main. Fix forward with a new migration file.
- This is a leaf node: only imports node_modules.

## Never Do
- Don't edit existing migration files — create new ones.
- Don't import from `slices/*`, `apps/*`, or other `shared/*` packages.
- Don't put business logic here — only DB client setup and schema definitions.
