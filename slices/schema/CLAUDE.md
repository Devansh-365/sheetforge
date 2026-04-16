# slices/schema

## Purpose
Type inference from a live Google Sheet's header + sample rows, plus monotonic-versioned snapshot persistence. Produces the typed column descriptors the SDK codegen slice turns into TypeScript types.

## Public API (barrel)
- `inferSchema({ sheetsClient, spreadsheetId, tabName, sampleSize? })` — reads the first `N + 1` rows (default 50 + header) and returns `ColumnDescriptor[]`. Stateless; does not touch the DB.
- `saveSchemaSnapshot({ db, sheetId, columns })` — persists a new row in `schemas`, bumps `version` from the previous latest.
- `getLatestSchema({ db, sheetId })` — newest snapshot, or throws `NotFoundError`.
- Types: `ColumnType` (`'string'|'number'|'boolean'|'datetime'`), `ColumnDescriptor`, `SchemaSnapshot`. Zod: `ColumnTypeSchema`, `ColumnDescriptorSchema`, `SchemaSnapshotSchema`.

## Type detection rules
Order-sensitive. Falls through to `string` on ambiguity:
1. `boolean` — every non-empty sample matches `/^(true|false)$/i`.
2. `number` — every sample parses as a finite `Number`.
3. `datetime` — every sample matches `\d{4}-\d{2}-\d{2}` prefix AND `Date.parse` succeeds.
4. `string` — default.

`nullable` is set when any data row has an empty value in the column.

Headers with an empty name throw `ValidationError`. Empty sheets throw `ValidationError`.

## Non-goals (V0)
- No enum detection from Sheets data validation (would require a second `getSpreadsheet` call).
- No user-editable override of detected types (V1 dashboard feature).
- No handling of locale-specific number formats (`1.000,00`).
- No inference from >50 rows — the sample window is a tradeoff between accuracy and Google quota burn.

## Never Do
- Don't import another slice's internals — only barrels.
- Don't hand-write Zod types that duplicate `ColumnDescriptorSchema`.
- Don't persist a snapshot with the same `(sheetId, version)` — let `saveSchemaSnapshot` own the version bump.
