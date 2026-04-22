import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const writeLedgerStatusEnum = pgEnum('write_ledger_status', [
  'pending',
  'processing',
  'completed',
  'failed',
  'dead_lettered',
]);

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  googleRefreshToken: text('google_refresh_token'),
  // Billing / quota tier — resolved against slices/billing's PLANS registry.
  planCode: text('plan_code').notNull().default('free'),
  // Per-user overrides on top of the resolved plan's limits. Shape is
  // Partial<PlanLimits>; null means "use plan defaults". Lets us bump
  // individual users (design partners, comp accounts) without spawning a
  // new plan tier.
  planOverrides: jsonb('plan_overrides'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// projects
// ---------------------------------------------------------------------------

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// sheets
// ---------------------------------------------------------------------------

export const sheets = pgTable(
  'sheets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    googleSheetId: text('google_sheet_id').notNull(),
    tabName: text('tab_name').notNull(),
    // FK to schemas.id — forward reference resolved via string to break cycle
    schemaSnapshotId: uuid('schema_snapshot_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Non-unique: multiple tabs may share the same underlying spreadsheet.
    // Used for lookups by googleSheetId in write-queue stream key resolution.
    index('sheets_google_sheet_id_idx').on(t.googleSheetId),
  ],
);

// ---------------------------------------------------------------------------
// schemas (schema snapshots per sheet)
// ---------------------------------------------------------------------------

export const schemas = pgTable('schemas', {
  id: uuid('id').primaryKey().defaultRandom(),
  sheetId: uuid('sheet_id')
    .notNull()
    .references(() => sheets.id, { onDelete: 'cascade' }),
  // Array of { name, type } column descriptors stored as JSONB
  columns: jsonb('columns').notNull(),
  version: integer('version').notNull(),
  generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// api_keys
// ---------------------------------------------------------------------------

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    // bcrypt/argon2 hash of the raw key — never store plaintext
    hashedKey: text('hashed_key').notNull(),
    // Display-only — first chars of the plaintext key the user copied. Used
    // by the dashboard to identify which key is which without revealing the
    // plaintext (which we never persist). Nullable for legacy rows created
    // before this column existed.
    prefix: text('prefix'),
    // nullable: null means key is scoped to all sheets in the project
    scopeSheetIds: jsonb('scope_sheet_ids').$type<string[]>(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Unique: hashed keys must be collision-free at lookup time
    unique('api_keys_hashed_key_unique').on(t.hashedKey),
  ],
);

// ---------------------------------------------------------------------------
// write_ledger — idempotency dedupe + audit trail (supports V0-015b)
// ---------------------------------------------------------------------------

export const writeLedger = pgTable('write_ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  sheetId: uuid('sheet_id')
    .notNull()
    .references(() => sheets.id, { onDelete: 'cascade' }),
  // Caller-supplied idempotency key; nullable for fire-and-forget writes
  idempotencyKey: text('idempotency_key'),
  // Stable write identity returned to the caller; deduped retries return the same writeId
  writeId: uuid('write_id').notNull(),
  status: writeLedgerStatusEnum('status').notNull().default('pending'),
  enqueuedAt: timestamp('enqueued_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// write_outbox — transactional outbox closing the ledger+XADD partial-commit
// window. submitWrite() inserts a ledger row + outbox envelope inside ONE DB
// transaction; a background drain worker is the only path that XADDs to the
// stream. Inline XADD in submitWrite is a best-effort latency optimization
// that marks sent_at on success; the drain picks up anything left unsent.
// ---------------------------------------------------------------------------

export const writeOutbox = pgTable('write_outbox', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Matches write_ledger.writeId — same uuid flows through both rows so the
  // drain worker can correlate without a JOIN.
  writeId: uuid('write_id').notNull(),
  sheetId: uuid('sheet_id')
    .notNull()
    .references(() => sheets.id, { onDelete: 'cascade' }),
  // streamKey is derivable from sheetId via streamKeyForSheet() but stored
  // explicitly so the drain worker stays self-contained.
  streamKey: text('stream_key').notNull(),
  // The full queue envelope — { writeId, payload, idempotencyKey? }
  envelope: jsonb('envelope').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  attempts: integer('attempts').notNull().default(0),
});
