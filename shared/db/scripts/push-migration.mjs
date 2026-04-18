// One-shot migration runner. Reads DATABASE_URL from env (use --env-file),
// splits the migration on Drizzle's statement-breakpoint markers, and runs
// each statement sequentially. Idempotent-ish: logs and continues past
// "already exists" errors so re-runs are safe.
//
// Usage:
//   node --env-file=.env shared/db/scripts/push-migration.mjs
//   node --env-file=.env shared/db/scripts/push-migration.mjs path/to/file.sql

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL missing (did you pass --env-file=.env?)');
  process.exit(1);
}

// Resolve the migration file — default to the newest 0000_*.sql in migrations/.
const migrationsDir = 'shared/db/migrations';
const explicit = process.argv[2];
const migrationPath =
  explicit ??
  join(
    migrationsDir,
    readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort()[0],
  );

console.log(`→ applying ${migrationPath}`);
const raw = readFileSync(migrationPath, 'utf-8');
const statements = raw
  .split(/-->\s*statement-breakpoint/i)
  .map((s) => s.trim())
  .filter(Boolean);

const sql = postgres(url, { max: 1, onnotice: () => {} });
let applied = 0;
let skipped = 0;
try {
  for (const [i, stmt] of statements.entries()) {
    try {
      await sql.unsafe(stmt);
      applied++;
      console.log(`  ✓ [${i + 1}/${statements.length}] ${firstLine(stmt)}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/already exists/i.test(msg)) {
        skipped++;
        console.log(`  · [${i + 1}/${statements.length}] already exists — ${firstLine(stmt)}`);
      } else {
        console.error(`  ✗ [${i + 1}/${statements.length}] ${firstLine(stmt)}`);
        throw err;
      }
    }
  }
  console.log(`\n✓ done. ${applied} applied, ${skipped} already-existing.`);
} finally {
  await sql.end();
}

function firstLine(stmt) {
  return stmt.split('\n')[0].slice(0, 72);
}
