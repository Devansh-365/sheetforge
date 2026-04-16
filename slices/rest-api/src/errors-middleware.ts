import { createLogger } from '@acid-sheets/shared-logger';
import { toHttpResponse } from '@acid-sheets/shared-types';
import type { ErrorHandler } from 'hono';

const log = createLogger({ service: 'rest-api' });

export const errorHandler: ErrorHandler = (err, _c) => {
  const { status, body } = toHttpResponse(err);
  if (status >= 500) {
    log.error({ err: err instanceof Error ? err.message : String(err) }, 'request-failed');
  } else {
    log.debug(
      { err: err instanceof Error ? err.message : String(err), status },
      'request-rejected',
    );
  }
  // Bypass Hono's strict status-code typing by building the Response directly.
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};
