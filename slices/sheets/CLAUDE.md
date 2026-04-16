# slices/sheets

## Purpose
Connect a Google Sheet to a project, introspect its headers, and store sheet metadata.

## Public API
Exported from `index.ts`:
- `createSheetsRouter()` — Hono router for sheet connect/list endpoints
- `getSheetById(id)` — fetch sheet metadata
- `introspectSheet(spreadsheetId)` — read headers from Google Sheets API

## Key Files
- `service.ts` — connect flow, introspection, metadata refresh
- `repo.ts` — Postgres CRUD for sheet records
- `types.ts` — Zod schemas: Sheet, SheetColumn, IntrospectionResult

## Gotchas
- Introspection calls Google Sheets API — subject to quota limits.
- Sheet metadata must be refreshed when columns change.

## Never Do
- Don't write to Google Sheets from this slice — that goes through `slices/write-queue`.
- Don't cache introspection results in-memory; use Redis via `shared/redis`.
- Don't import another slice's internals — only their `index.ts`.
