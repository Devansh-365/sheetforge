# shared/db

## Purpose
Drizzle ORM schema, client factory, and migrations for the Postgres database
shared across all slices.

## Schema direction: Drizzle → Zod (mandated by v3 plan PV-4)
Tables are defined in `src/schema.ts` as Drizzle `pgTable` definitions.
Zod schemas are **derived** from those tables in `src/zod.ts` using
`drizzle-zod`'s `createSelectSchema` / `createInsertSchema`.

Never hand-write TS types for DB rows — use `z.infer<typeof UserSelect>` etc.
Never write Zod schemas first and generate Drizzle from them.

## Public API (exported from `src/index.ts`)
- `schema` — namespace re-export of all Drizzle table objects
- `createDb(connectionString)` — returns a Drizzle instance bound to the schema;
  no singleton, pass a test DB URL in tests
- `Db` — TypeScript type of the Drizzle instance
- Named Zod schemas: `UserSelect`, `UserInsert`, `ProjectSelect`, `ProjectInsert`,
  `SheetSelect`, `SheetInsert`, `SchemaSelect`, `SchemaInsert`,
  `ApiKeySelect`, `ApiKeyInsert`, `WriteLedgerSelect`, `WriteLedgerInsert`

## Migrations — append-only rule
Migrations in `migrations/` are **immutable** once merged to main.
Fix forward: generate a new migration, never edit an existing SQL file.

### How to generate a new migration
```bash
pnpm --filter @sheetforge/shared-db db:generate
# Review the generated SQL in migrations/ before committing
```

## Key Files
- `src/schema.ts` — all Drizzle table + enum definitions
- `src/zod.ts` — derived Zod select/insert schemas
- `src/client.ts` — `createDb` factory (no singleton)
- `src/index.ts` — barrel export
- `drizzle.config.ts` — drizzle-kit config (dialect postgresql)
- `migrations/0000_unknown_spyke.sql` — initial V0 schema migration

## Never Do
- Don't edit existing migration files — create new ones.
- Don't import from `slices/*`, `apps/*`, or other `shared/*` packages.
- Don't put business logic here — only DB client setup and schema definitions.
- Don't write Zod schemas by hand for DB entities; derive them via drizzle-zod.
- Don't export a module-level `db` singleton; consumers call `createDb()` with
  their own connection string.
