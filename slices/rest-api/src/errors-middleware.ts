import { createLogger } from '@sheetforge/shared-logger';
import { toHttpResponse } from '@sheetforge/shared-types';
import type { ErrorHandler } from 'hono';

const log = createLogger({ service: 'rest-api' });

export const errorHandler: ErrorHandler = (err, _c) => {
  const { status, body } = toHttpResponse(err);
  if (status >= 500) {
    // Log full details server-side, but strip them from the response so we
    // never leak upstream API bodies (Google Sheets returns spreadsheet
    // titles/IDs in error messages) to clients.
    log.error(
      {
        err: err instanceof Error ? err.message : String(err),
        details: body.error.details,
      },
      'request-failed',
    );
    // Assigning undefined keeps biome happy and JSON.stringify omits the key.
    (body.error as { details?: unknown }).details = undefined;
  } else {
    log.debug(
      { err: err instanceof Error ? err.message : String(err), status },
      'request-rejected',
    );
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};
