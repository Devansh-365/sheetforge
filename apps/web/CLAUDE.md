# apps/web

## Purpose
Thin Next.js 15 dashboard. Owns auth flow, project management UI, sheet connect wizard, and SDK generator UI.

## Public API
None — this is an entrypoint, not a library.

## Key Files
- `src/app/` — Next.js App Router pages and layouts
- `src/app/api/` — Next.js route handlers (thin, delegate to slices)

## Gotchas
- App Router only. No Pages Router.
- All data mutations must go through `slices/*` — no direct DB/Redis calls here.
- Auth state comes from `slices/auth` barrel only.

## Never Do
- Don't put business logic in page components or route handlers.
- Don't import slice internals directly — only slice `index.ts` barrels.
- Don't call Google Sheets API from this app.
