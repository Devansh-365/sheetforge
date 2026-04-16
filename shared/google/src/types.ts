import { z } from 'zod';

export const SheetTabSchema = z.object({
  properties: z.object({
    sheetId: z.number().int(),
    title: z.string(),
    index: z.number().int().optional(),
    gridProperties: z
      .object({
        rowCount: z.number().int(),
        columnCount: z.number().int(),
      })
      .optional(),
  }),
});
export type SheetTab = z.infer<typeof SheetTabSchema>;

export const SpreadsheetMetadataSchema = z.object({
  spreadsheetId: z.string(),
  properties: z.object({
    title: z.string(),
    locale: z.string().optional(),
    timeZone: z.string().optional(),
  }),
  sheets: z.array(SheetTabSchema),
});
export type SpreadsheetMetadata = z.infer<typeof SpreadsheetMetadataSchema>;

export const ValueRangeSchema = z.object({
  range: z.string(),
  majorDimension: z.enum(['ROWS', 'COLUMNS']),
  values: z.array(z.array(z.string())).optional(),
});
export type ValueRange = z.infer<typeof ValueRangeSchema>;

export const BatchUpdateValuesResponseSchema = z.object({
  spreadsheetId: z.string(),
  totalUpdatedRows: z.number().int().optional(),
  totalUpdatedCells: z.number().int().optional(),
  responses: z
    .array(
      z.object({
        spreadsheetId: z.string(),
        updatedRange: z.string(),
        updatedRows: z.number().int().optional(),
        updatedColumns: z.number().int().optional(),
        updatedCells: z.number().int().optional(),
      }),
    )
    .optional(),
});
export type BatchUpdateValuesResponse = z.infer<typeof BatchUpdateValuesResponseSchema>;

// Narrow union of the batchUpdate requests we currently send.
// Sheets API supports many more; only wire what the write-queue + schema slices need.
export type BatchUpdateRequest =
  | {
      insertDimension: {
        range: {
          sheetId: number;
          dimension: 'ROWS' | 'COLUMNS';
          startIndex: number;
          endIndex: number;
        };
        inheritFromBefore?: boolean;
      };
    }
  | {
      updateCells: {
        rows: Array<{
          values: Array<{
            userEnteredValue: {
              stringValue?: string;
              numberValue?: number;
              boolValue?: boolean;
            };
          }>;
        }>;
        fields: string;
        start: { sheetId: number; rowIndex: number; columnIndex: number };
      };
    }
  | {
      addSheet: {
        properties: { title: string };
      };
    };

export const BatchUpdateResponseSchema = z.object({
  spreadsheetId: z.string(),
  replies: z.array(z.record(z.string(), z.unknown())).optional(),
});
export type BatchUpdateResponse = z.infer<typeof BatchUpdateResponseSchema>;

export type AppendSafeCell = {
  stringValue?: string;
  numberValue?: number;
  boolValue?: boolean;
};
export type AppendSafeRow = AppendSafeCell[];
