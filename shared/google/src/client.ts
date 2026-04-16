import { type Logger, createLogger } from '@acid-sheets/shared-logger';
import {
  ForbiddenError,
  InternalError,
  NotFoundError,
  RateLimitedError,
  UnauthorizedError,
} from '@acid-sheets/shared-types';
import {
  type AppendSafeRow,
  type BatchUpdateRequest,
  type BatchUpdateResponse,
  BatchUpdateResponseSchema,
  type BatchUpdateValuesResponse,
  BatchUpdateValuesResponseSchema,
  type SpreadsheetMetadata,
  SpreadsheetMetadataSchema,
  type ValueRange,
  ValueRangeSchema,
} from './types.js';

const SHEETS_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

export type ValueInputOption = 'RAW' | 'USER_ENTERED';

export interface CreateSheetsClientOptions {
  accessToken: string;
  fetch?: typeof globalThis.fetch;
  logger?: Logger;
}

interface ZodLike<T> {
  safeParse(v: unknown): { success: true; data: T } | { success: false; error: unknown };
}

export function createSheetsClient({
  accessToken,
  fetch: fetchImpl,
  logger,
}: CreateSheetsClientOptions) {
  const doFetch = fetchImpl ?? globalThis.fetch;
  const log = logger ?? createLogger({ service: 'shared-google' });

  async function call<T>(path: string, init: RequestInit, schema?: ZodLike<T>): Promise<T> {
    const url = `${SHEETS_BASE_URL}${path}`;
    const started = Date.now();
    const res = await doFetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });
    const ms = Date.now() - started;
    log.debug({ method: init.method ?? 'GET', path, status: res.status, ms }, 'sheets-api');

    if (!res.ok) {
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = await res.text().catch(() => null);
      }
      log.warn(
        { method: init.method ?? 'GET', path, status: res.status, body },
        'sheets-api-error',
      );
      throwTypedError(res, body);
    }

    if (res.status === 204) {
      return undefined as T;
    }

    const json = (await res.json()) as unknown;
    if (schema) {
      const parsed = schema.safeParse(json);
      if (!parsed.success) {
        throw new InternalError('Unexpected Sheets API response shape', {
          path,
        });
      }
      return parsed.data;
    }
    return json as T;
  }

  return {
    async getSpreadsheet({
      spreadsheetId,
      fields,
    }: {
      spreadsheetId: string;
      fields?: string;
    }): Promise<SpreadsheetMetadata> {
      const query = fields ? `?fields=${encodeURIComponent(fields)}` : '';
      return call(`/${spreadsheetId}${query}`, { method: 'GET' }, SpreadsheetMetadataSchema);
    },

    async getValues({
      spreadsheetId,
      range,
    }: {
      spreadsheetId: string;
      range: string;
    }): Promise<ValueRange> {
      return call(
        `/${spreadsheetId}/values/${encodeURIComponent(range)}`,
        { method: 'GET' },
        ValueRangeSchema,
      );
    },

    async batchUpdateValues({
      spreadsheetId,
      data,
      valueInputOption,
    }: {
      spreadsheetId: string;
      data: Array<{ range: string; values: unknown[][] }>;
      valueInputOption: ValueInputOption;
    }): Promise<BatchUpdateValuesResponse> {
      return call(
        `/${spreadsheetId}/values:batchUpdate`,
        {
          method: 'POST',
          body: JSON.stringify({ valueInputOption, data }),
        },
        BatchUpdateValuesResponseSchema,
      );
    },

    async batchUpdate({
      spreadsheetId,
      requests,
    }: {
      spreadsheetId: string;
      requests: BatchUpdateRequest[];
    }): Promise<BatchUpdateResponse> {
      return call(
        `/${spreadsheetId}:batchUpdate`,
        { method: 'POST', body: JSON.stringify({ requests }) },
        BatchUpdateResponseSchema,
      );
    },

    // Atomic row insertion via batchUpdate (insertDimension + updateCells in one call).
    // Avoids the documented values.append race: concurrent appends drop rows
    // (4 appends -> 3 rows). See `.omc/plans/reference-queue-impl.md` §6.
    async appendSafe({
      spreadsheetId,
      sheetId,
      startRowIndex,
      rows,
    }: {
      spreadsheetId: string;
      sheetId: number;
      startRowIndex: number;
      rows: AppendSafeRow[];
    }): Promise<BatchUpdateResponse> {
      if (rows.length === 0) {
        throw new InternalError('appendSafe requires at least one row');
      }
      const requests: BatchUpdateRequest[] = [
        {
          insertDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: startRowIndex,
              endIndex: startRowIndex + rows.length,
            },
            inheritFromBefore: false,
          },
        },
        {
          updateCells: {
            rows: rows.map((cells) => ({
              values: cells.map((cell) => ({ userEnteredValue: cell })),
            })),
            fields: 'userEnteredValue',
            start: { sheetId, rowIndex: startRowIndex, columnIndex: 0 },
          },
        },
      ];
      return call(
        `/${spreadsheetId}:batchUpdate`,
        { method: 'POST', body: JSON.stringify({ requests }) },
        BatchUpdateResponseSchema,
      );
    },
  };
}

function throwTypedError(res: Response, body: unknown): never {
  const status = res.status;
  if (status === 401) {
    throw new UnauthorizedError('Google rejected the access token', {
      status,
      body,
    });
  }
  if (status === 403) {
    throw new ForbiddenError('User lacks access to this sheet', {
      status,
      body,
    });
  }
  if (status === 404) {
    throw new NotFoundError('Spreadsheet or range not found', { status, body });
  }
  if (status === 429) {
    const retryAfter = Number(res.headers.get('Retry-After') ?? '1');
    throw new RateLimitedError('Google Sheets rate limit hit', retryAfter * 1000);
  }
  throw new InternalError('Google Sheets API error', { status, body });
}

export type SheetsClient = ReturnType<typeof createSheetsClient>;
