import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { users, projects, sheets, schemas, apiKeys, writeLedger } from "./schema.js";

// Direction: Drizzle table definitions → Zod schemas (mandated by v3 plan PV-4).
// Never hand-write domain types here; derive them from the table definition.

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------

export const UserSelect = createSelectSchema(users);
export const UserInsert = createInsertSchema(users);
export type UserSelect = typeof UserSelect._type;
export type UserInsert = typeof UserInsert._type;

// ---------------------------------------------------------------------------
// projects
// ---------------------------------------------------------------------------

export const ProjectSelect = createSelectSchema(projects);
export const ProjectInsert = createInsertSchema(projects);
export type ProjectSelect = typeof ProjectSelect._type;
export type ProjectInsert = typeof ProjectInsert._type;

// ---------------------------------------------------------------------------
// sheets
// ---------------------------------------------------------------------------

export const SheetSelect = createSelectSchema(sheets);
export const SheetInsert = createInsertSchema(sheets);
export type SheetSelect = typeof SheetSelect._type;
export type SheetInsert = typeof SheetInsert._type;

// ---------------------------------------------------------------------------
// schemas
// ---------------------------------------------------------------------------

export const SchemaSelect = createSelectSchema(schemas);
export const SchemaInsert = createInsertSchema(schemas);
export type SchemaSelect = typeof SchemaSelect._type;
export type SchemaInsert = typeof SchemaInsert._type;

// ---------------------------------------------------------------------------
// apiKeys
// ---------------------------------------------------------------------------

export const ApiKeySelect = createSelectSchema(apiKeys);
export const ApiKeyInsert = createInsertSchema(apiKeys);
export type ApiKeySelect = typeof ApiKeySelect._type;
export type ApiKeyInsert = typeof ApiKeyInsert._type;

// ---------------------------------------------------------------------------
// writeLedger
// ---------------------------------------------------------------------------

export const WriteLedgerSelect = createSelectSchema(writeLedger);
export const WriteLedgerInsert = createInsertSchema(writeLedger);
export type WriteLedgerSelect = typeof WriteLedgerSelect._type;
export type WriteLedgerInsert = typeof WriteLedgerInsert._type;
