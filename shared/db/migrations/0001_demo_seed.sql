-- Seed synthetic user/project/sheet rows so the public hammer demo has
-- something to reference via the write_ledger FK chain. Idempotent — safe to
-- re-run in any environment.
INSERT INTO "users" ("id", "email")
VALUES ('00000000-0000-0000-0000-0000000d3001', '__demo-sentinel@sheetforge.invalid')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "projects" ("id", "user_id", "name")
VALUES (
  '00000000-0000-0000-0000-0000000d3002',
  '00000000-0000-0000-0000-0000000d3001',
  'sheetforge public demo'
)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "sheets" ("id", "project_id", "google_sheet_id", "tab_name")
VALUES (
  '00000000-0000-0000-0000-0000000d3000',
  '00000000-0000-0000-0000-0000000d3002',
  '__demo__',
  'demo'
)
ON CONFLICT ("id") DO NOTHING;
