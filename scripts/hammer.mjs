// Concurrency demo — the thesis proof point.
//
// Fires N concurrent POSTs to /v1/sheets/:sheetId/rows and polls the
// write_ledger until every accepted write lands. Prints a final line
// like "1000 POSTs -> 1000 rows. race conditions: 0".
//
// Usage:
//   node --env-file=.env scripts/hammer.mjs <sheetId> <apiKey> [n=1000]
//
// The API + inline processor must be running (`pnpm dev:api`). DATABASE_URL
// is used to count completed writes; if omitted we skip the poll.

import postgres from 'postgres';

const API_URL = process.env.PUBLIC_BASE_URL ?? 'http://localhost:3001';
const dbUrl = process.env.DATABASE_URL;

const sheetId = process.argv[2];
const apiKey = process.argv[3];
const n = Number(process.argv[4] ?? 1000);

if (!sheetId || !apiKey) {
  console.error('usage: node --env-file=.env scripts/hammer.mjs <sheetId> <apiKey> [n=1000]');
  process.exit(1);
}

const runTag = `hammer-${Date.now()}`;

async function main() {
  console.log(`→ firing ${n} concurrent POSTs to sheet ${sheetId} …`);
  const t0 = Date.now();

  const promises = [];
  for (let i = 0; i < n; i++) {
    const idempKey = `${runTag}-${i}`;
    promises.push(
      fetch(`${API_URL}/v1/sheets/${sheetId}/rows`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempKey,
        },
        body: JSON.stringify({
          email: `hammer-${i}@test.sheetforge`,
          source: 'hammer',
          seq: i,
        }),
      })
        .then(async (r) => ({
          status: r.status,
          body: r.status === 202 ? await r.json() : null,
          i,
        }))
        .catch((e) => ({ status: 0, err: String(e), i })),
    );
  }

  const results = await Promise.all(promises);
  const accepted = results.filter((r) => r.status === 202).length;
  const failed = results.filter((r) => r.status !== 202);
  const submitMs = Date.now() - t0;
  console.log(`✓ accepted: ${accepted}/${n} (${submitMs}ms)  ·  rejected: ${failed.length}`);
  if (failed.length && failed.length <= 5) {
    for (const f of failed) {
      console.log(`  - [${f.i}] status=${f.status} ${f.err ?? ''}`);
    }
  }

  if (!dbUrl) {
    console.log('\n(set DATABASE_URL in .env to poll the ledger for final row count)');
    return;
  }

  const sql = postgres(dbUrl, { max: 1, onnotice: () => {} });
  try {
    console.log('→ polling write_ledger …');
    const deadline = Date.now() + 120_000;
    let lastCompleted = -1;
    while (Date.now() < deadline) {
      const rows = await sql`
        SELECT status, count(*)::int AS c
        FROM write_ledger
        WHERE sheet_id = ${sheetId}
          AND idempotency_key LIKE ${`${runTag}-%`}
        GROUP BY status
      `;
      const counts = Object.fromEntries(rows.map((r) => [r.status, r.c]));
      const completed = counts.completed ?? 0;
      const pending = counts.pending ?? 0;
      const processing = counts.processing ?? 0;
      const failedCount = counts.failed ?? 0;
      if (completed !== lastCompleted) {
        process.stdout.write(
          `\r  pending ${pending} · processing ${processing} · completed ${completed} · failed ${failedCount}     `,
        );
        lastCompleted = completed;
      }
      if (completed + failedCount >= accepted) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    console.log();

    const total = Date.now() - t0;
    const finalRows = await sql`
      SELECT status, count(*)::int AS c
      FROM write_ledger
      WHERE sheet_id = ${sheetId}
        AND idempotency_key LIKE ${`${runTag}-%`}
      GROUP BY status
    `;
    const final = Object.fromEntries(finalRows.map((r) => [r.status, r.c]));
    const completed = final.completed ?? 0;
    const races = accepted - completed;

    console.log('\n──────────────────────────────────────────────');
    console.log(`  ${n} POSTs  →  ${completed} rows  ·  ${total}ms total`);
    console.log(
      `  race conditions: ${races}${races === 0 ? '   ✓ thesis holds' : '   ✗ lost writes'}`,
    );
    console.log('──────────────────────────────────────────────');
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error('hammer failed:', err);
  process.exit(1);
});
