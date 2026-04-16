import type { QueueRedisClient } from '@sheetforge/queue';
import type { Db } from '@sheetforge/shared-db';
import { createLogger } from '@sheetforge/shared-logger';
import { DEMO_SHEET_ID } from '@sheetforge/slice-demo';
import { processNext, streamKeyForSheet } from '@sheetforge/slice-write-queue';

const log = createLogger({ service: 'demo-processor' });
const GROUP = 'acid-workers';
const CONSUMER = 'api-demo';

/**
 * Dedicated processor loop for the public hammer demo. Same advisory-lock and
 * ledger path as the real pipeline — the only difference is the handler: we
 * skip the Google Sheets API call entirely because the "demo sheet" is a
 * sentinel that has no real spreadsheet behind it. The fencing, ordering and
 * idempotency guarantees are what visitors see anyway.
 */
export async function demoProcessorTick({
  db,
  redis,
}: {
  db: Db;
  redis: QueueRedisClient;
}): Promise<void> {
  const streamKey = streamKeyForSheet(DEMO_SHEET_ID);
  await processNext({
    db,
    redis,
    streamKey,
    group: GROUP,
    consumer: CONSUMER,
    blockMs: 100,
    handler: async (msg) => {
      // Synthetic sink — nothing to do. The advisory lock + ledger writes
      // around this handler are the whole point.
      log.debug({ writeId: msg.writeId }, 'demo-write-processed');
    },
  });
}
