-- Free-tier quotas: tag each user with a plan and allow per-user limit
-- overrides without needing a new plan tier. Existing rows default to 'free'.
ALTER TABLE "users" ADD COLUMN "plan_code" text DEFAULT 'free' NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "plan_overrides" jsonb;
