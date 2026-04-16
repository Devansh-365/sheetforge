import { z } from 'zod';

export const SheetRecordSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  googleSheetId: z.string(),
  tabName: z.string(),
  schemaSnapshotId: z.string().uuid().nullable(),
  createdAt: z.date(),
});
export type SheetRecord = z.infer<typeof SheetRecordSchema>;

export const ConnectSheetInputSchema = z.object({
  googleSheetId: z.string().min(1),
  tabName: z.string().min(1),
});
export type ConnectSheetInput = z.infer<typeof ConnectSheetInputSchema>;
