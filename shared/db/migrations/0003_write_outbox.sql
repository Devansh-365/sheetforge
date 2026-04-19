-- R1 Rev1: Transactional outbox — close the partial-commit window between
-- write_ledger INSERT and Redis XADD. submitWrite() inserts the ledger row +
-- outbox envelope inside one DB transaction; a background drain worker
-- guarantees the XADD eventually happens even if the API process dies
-- between the commit and the network call.
CREATE TABLE IF NOT EXISTS write_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  write_id uuid NOT NULL,
  sheet_id uuid NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
  stream_key text NOT NULL,
  envelope jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  attempts integer NOT NULL DEFAULT 0
);
--> statement-breakpoint

-- Partial index on unsent rows only. The vast majority of rows transition to
-- sent within seconds, so this index stays near-empty during steady state.
CREATE INDEX IF NOT EXISTS write_outbox_pending_idx
  ON write_outbox (created_at)
  WHERE sent_at IS NULL;
