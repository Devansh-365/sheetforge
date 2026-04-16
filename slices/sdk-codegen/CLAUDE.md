# slices/sdk-codegen

## Purpose
Generate TypeScript SDK code from a sheet's inferred schema (V0). Python SDK deferred to V1.

## Public API
Exported from `index.ts`:
- `generateTsSdk(sheetSchema)` — returns TypeScript SDK source as a string
- `createSdkCodegenRouter()` — Hono router for SDK generation endpoints

## Key Files
- `service.ts` — code generation orchestration, delegates to `packages/codegen`
- `types.ts` — Zod schemas: SdkGenerationRequest, SdkGenerationResult

## Gotchas
- Python SDK generation is explicitly deferred to V1. Don't implement it.
- Generated code is returned as a string; storage/delivery is the caller's concern.
- Depends on `slices/schema` barrel for schema retrieval.

## Never Do
- Don't implement Python SDK generation (V1 only).
- Don't put codegen logic here — delegate to `packages/codegen` (OSS layer).
- Don't import another slice's internals — only their `index.ts`.
