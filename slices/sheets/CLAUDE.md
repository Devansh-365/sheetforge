# slices/sheets

## Purpose
Connect a Google Sheet (by ID + tab name) to a project, validate it exists via the Sheets API, and persist the row. Ownership-scoped reads, writes, and disconnect.

## Public API (barrel)
- `connectSheet({ db, sheetsClient, projectId, googleSheetId, tabName })` — verifies the spreadsheet + tab via the injected Sheets client, then inserts the sheets row.
- `listSheets({ db, projectId })` — project-scoped list.
- `getSheet({ db, sheetId, projectId })` — ownership-enforced single fetch.
- `disconnectSheet({ db, sheetId, projectId })` — cascade-safe delete (DB cascades to schemas and write_ledger).
- `attachSchemaSnapshot({ db, sheetId, schemaSnapshotId })` — used by the schema slice after it persists a new snapshot.
- Types: `SheetRecord`, `ConnectSheetInput`. Zod schemas: `SheetRecordSchema`, `ConnectSheetInputSchema`.

## Dependency injection
- `sheetsClient` is passed in so the slice is testable without live Google credentials. Production callers pass a fresh `createSheetsClient({ accessToken })` per request, refreshing the access token beforehand via `slices/auth`.

## Never Do
- Don't write data rows here — that's the write-queue slice's job.
- Don't cache the full `metadata` response — only what's persisted in the row.
- Don't call Google Sheets for listings — the DB is the source of truth for connected sheets.
- Don't import another slice's internals — only barrels.
