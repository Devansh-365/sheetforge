export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
    // Restore prototype chain in transpiled environments
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): {
    code: string;
    message: string;
    statusCode: number;
    details?: Record<string, unknown>;
  } {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      ...(this.details !== undefined ? { details: this.details } : {}),
    };
  }
}

export class UnauthorizedError extends DomainError {
  readonly code = 'AUTH_REQUIRED' as const;
  readonly statusCode = 401;

  constructor(message = 'Authentication required', details?: Record<string, unknown>) {
    super(message, details);
  }
}

export class ForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN' as const;
  readonly statusCode = 403;

  constructor(message = 'Forbidden', details?: Record<string, unknown>) {
    super(message, details);
  }
}

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND' as const;
  readonly statusCode = 404;

  constructor(message = 'Not found', details?: Record<string, unknown>) {
    super(message, details);
  }
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_FAILED' as const;
  readonly statusCode = 400;

  constructor(message = 'Validation failed', fieldErrors?: Record<string, unknown>) {
    super(message, fieldErrors !== undefined ? { fieldErrors } : undefined);
  }
}

export class ConflictError extends DomainError {
  readonly code = 'CONFLICT' as const;
  readonly statusCode = 409;

  constructor(message = 'Conflict', details?: Record<string, unknown>) {
    super(message, details);
  }
}

export class RateLimitedError extends DomainError {
  readonly code = 'RATE_LIMITED' as const;
  readonly statusCode = 429;

  constructor(message = 'Rate limited', retryAfterMs?: number) {
    super(message, retryAfterMs !== undefined ? { retryAfterMs } : undefined);
  }
}

export class InternalError extends DomainError {
  readonly code = 'INTERNAL' as const;
  readonly statusCode = 500;

  constructor(message = 'Internal server error', details?: Record<string, unknown>) {
    super(message, details);
  }
}

export class IdempotencyReplayError extends DomainError {
  readonly code = 'IDEMPOTENCY_REPLAY' as const;
  readonly statusCode = 409;

  constructor(message = 'Duplicate idempotency key', details?: Record<string, unknown>) {
    super(message, details);
  }
}

export class SchemaVersionMismatchError extends DomainError {
  readonly code = 'SCHEMA_VERSION_MISMATCH' as const;
  readonly statusCode = 409;

  constructor(message = 'Schema version mismatch', details?: Record<string, unknown>) {
    super(message, details);
  }
}

/**
 * The user's Google OAuth grant is gone — either they revoked access from
 * their Google account settings or the refresh token expired (6-month idle).
 * Clients should send them through /signin?reconnect=1 instead of silently
 * treating the 401 like a normal missing-session case.
 */
export class GoogleReconnectRequiredError extends DomainError {
  readonly code = 'GOOGLE_RECONNECT_REQUIRED' as const;
  readonly statusCode = 401;

  constructor(
    message = 'Google connection expired — user must re-authenticate',
    details?: Record<string, unknown>,
  ) {
    super(message, details);
  }
}

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

export function isDomainError(err: unknown): err is DomainError {
  return err instanceof DomainError;
}

// ---------------------------------------------------------------------------
// HTTP boundary helper
// ---------------------------------------------------------------------------

export interface HttpErrorResponse {
  status: number;
  body: {
    error: {
      code: string;
      message: string;
      details?: Record<string, unknown>;
    };
  };
}

export function toHttpResponse(err: unknown): HttpErrorResponse {
  if (isDomainError(err)) {
    return {
      status: err.statusCode,
      body: {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details !== undefined ? { details: err.details } : {}),
        },
      },
    };
  }

  const message = err instanceof Error ? err.message : 'An unexpected error occurred';
  return {
    status: 500,
    body: {
      error: {
        code: 'INTERNAL',
        message,
      },
    },
  };
}
