import { z } from 'zod';

/**
 * The shape callers submit. Payload is opaque to the queue — the worker-side
 * handler knows how to translate it into Google Sheets ops (append rows,
 * update cells, etc.).
 */
export const WritePayloadSchema = z.object({
  op: z.enum(['append', 'update', 'delete']),
  // Arbitrary JSON payload the worker interprets based on `op`.
  data: z.unknown(),
});
export type WritePayload = z.infer<typeof WritePayloadSchema>;

export type SubmitStatus = 'enqueued' | 'replayed';

export interface SubmitResult {
  writeId: string;
  status: SubmitStatus;
  /** Redis stream message id — only set when status === 'enqueued'. */
  messageId?: string;
}

export type WriteLedgerStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'dead_lettered';

export interface WriteLedgerRow {
  id: string;
  sheetId: string;
  idempotencyKey: string | null;
  writeId: string;
  status: WriteLedgerStatus;
  enqueuedAt: Date;
  completedAt: Date | null;
}

/** Per-sheet stream key convention: `acid:writes:{sheetId}`. */
export function streamKeyForSheet(sheetId: string): string {
  return `acid:writes:${sheetId}`;
}
