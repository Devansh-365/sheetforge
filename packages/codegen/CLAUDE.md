# packages/codegen

## Purpose
OSS (MIT) SDK generator — takes a sheet schema and emits a self-contained TypeScript module. Users commit the generated file; no runtime dep on a published client.

## Status
`"private": true` — do NOT publish until the concurrency acceptance demo passes.

## Public API (barrel)
- `emitTypeScriptSdk({ sheetId, tabName, columns, apiBaseUrl })` — returns the generated TypeScript source as a string. The file exports:
  - a typed row interface named after `tabName` (e.g. `Waitlist`)
  - a `create<Type>Client({ apiKey, baseUrl?, fetch? })` factory with `list()` + `create(row, { idempotencyKey? })`
- Types: `CodegenColumn`, `CodegenColumnType`, `EmitTypescriptSdkInput`.

## Design
- Zero dependencies — generator is a pure string builder; consumer code uses only `fetch`.
- Output is self-documenting: header comment names the source sheet + regenerate command.
- Headers that are not valid JS identifiers are emitted as quoted object keys.

## Non-goals (V0)
- No Python codegen (deferred).
- No enum detection (would require Sheets data-validation metadata).
- No runtime schema validation in the generated SDK — trust the types, the server enforces the write-ledger.

## Never Do
- Don't import from `shared/*`, `slices/*`, or `apps/*` — OSS safety.
- Don't add runtime deps — keep the generator zero-dep.
- Don't publish until the acceptance demo passes.
