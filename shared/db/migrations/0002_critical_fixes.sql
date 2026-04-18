-- C1: Idempotency uniqueness — prevent two concurrent submitWrite() calls
-- from creating two ledger rows for the same (sheet, idempotency_key).
-- Partial because nullable idempotency_key is allowed for fire-and-forget.
CREATE UNIQUE INDEX IF NOT EXISTS write_ledger_sheet_idem_uq
  ON write_ledger (sheet_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
--> statement-breakpoint

-- M1: API key prefix — display the first chars of the plaintext key the user
-- copied (not last chars of the hash, which is what the repo was returning).
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS prefix text;
--> statement-breakpoint

-- m4: Schema snapshot version uniqueness — prevent two concurrent
-- saveSchemaSnapshot() calls from inserting the same (sheet, version).
CREATE UNIQUE INDEX IF NOT EXISTS schemas_sheet_version_uq
  ON schemas (sheet_id, version);
--> statement-breakpoint

-- Prior review C1: Sentinel email must be unreachable via Google OAuth so
-- nobody can hijack the demo project by signing in as demo@sheetforge.dev.
-- The .invalid TLD (RFC 2606) can never be issued as a real address.
UPDATE users
SET email = '__demo-sentinel@sheetforge.invalid'
WHERE id = '00000000-0000-0000-0000-0000000d3001';
