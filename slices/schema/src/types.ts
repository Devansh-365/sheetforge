import { z } from 'zod';

export const ColumnTypeSchema = z.enum(['string', 'number', 'boolean', 'datetime']);
export type ColumnType = z.infer<typeof ColumnTypeSchema>;

export const ColumnDescriptorSchema = z.object({
  name: z.string().min(1),
  type: ColumnTypeSchema,
  nullable: z.boolean(),
});
export type ColumnDescriptor = z.infer<typeof ColumnDescriptorSchema>;

export const SchemaSnapshotSchema = z.object({
  id: z.string().uuid(),
  sheetId: z.string().uuid(),
  columns: z.array(ColumnDescriptorSchema),
  version: z.number().int().positive(),
  generatedAt: z.date(),
});
export type SchemaSnapshot = z.infer<typeof SchemaSnapshotSchema>;
