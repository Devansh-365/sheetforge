# slices/schema

## Purpose
Type inference from sheet headers and column-level validation rule management.

## Public API
Exported from `index.ts`:
- `inferSchema(columns)` — infer Zod schema from sheet column metadata
- `getSchemaForSheet(sheetId)` — fetch persisted schema for a sheet
- `validateRow(schema, row)` — validate a data row against a sheet schema

## Key Files
- `service.ts` — schema inference logic, validation rule application
- `repo.ts` — Postgres CRUD for persisted schema rules
- `types.ts` — Zod schemas: ColumnSchema, SheetSchema, ValidationRule

## Gotchas
- Schema inference is best-effort; types default to `string` when ambiguous.
- Zod schemas are the source of truth — never hand-write duplicate TS types.

## Never Do
- Don't hardcode type mappings for specific sheet structures.
- Don't store inferred schemas without user confirmation (V1 behavior TBD).
- Don't import another slice's internals — only their `index.ts`.
