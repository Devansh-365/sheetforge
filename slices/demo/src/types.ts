/**
 * Sentinel UUID the write-queue processor recognizes as "noop sink" — the
 * handler skips the Google Sheets API call but still exercises the advisory
 * lock, ledger, and Redis stream. This is what lets anonymous visitors hammer
 * the pipeline without touching a real user's spreadsheet.
 */
export const DEMO_SHEET_ID = '00000000-0000-0000-0000-0000000d3000';

export interface HammerRunResult {
  runId: string;
  n: number;
  dispatchedAt: string;
}

export interface HammerWrite {
  writeId: string;
  ordinal: number;
  idempotencyKey: string;
  enqueuedAt: string;
  completedAt: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead_lettered';
}

export interface HammerStatus {
  runId: string;
  writes: HammerWrite[];
  done: boolean;
}
