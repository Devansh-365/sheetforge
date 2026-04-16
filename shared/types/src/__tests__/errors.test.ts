import { describe, expect, it } from 'vitest';
import {
  ConflictError,
  DomainError,
  ForbiddenError,
  IdempotencyReplayError,
  InternalError,
  NotFoundError,
  RateLimitedError,
  SchemaVersionMismatchError,
  UnauthorizedError,
  ValidationError,
  isDomainError,
  toHttpResponse,
} from '../errors.js';

describe('DomainError subclasses', () => {
  it('UnauthorizedError has correct code and statusCode', () => {
    const err = new UnauthorizedError();
    expect(err.code).toBe('AUTH_REQUIRED');
    expect(err.statusCode).toBe(401);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(DomainError);
  });

  it('ForbiddenError has correct code and statusCode', () => {
    const err = new ForbiddenError();
    expect(err.code).toBe('FORBIDDEN');
    expect(err.statusCode).toBe(403);
  });

  it('NotFoundError has correct code and statusCode', () => {
    const err = new NotFoundError('Resource not found');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Resource not found');
  });

  it('ValidationError has correct code, statusCode and fieldErrors details', () => {
    const err = new ValidationError('Bad input', { name: 'required' });
    expect(err.code).toBe('VALIDATION_FAILED');
    expect(err.statusCode).toBe(400);
    expect(err.details).toEqual({ fieldErrors: { name: 'required' } });
  });

  it('ConflictError has correct code and statusCode', () => {
    const err = new ConflictError('Already exists');
    expect(err.code).toBe('CONFLICT');
    expect(err.statusCode).toBe(409);
  });

  it('RateLimitedError has correct code, statusCode and retryAfterMs', () => {
    const err = new RateLimitedError('Slow down', 5000);
    expect(err.code).toBe('RATE_LIMITED');
    expect(err.statusCode).toBe(429);
    expect(err.details).toEqual({ retryAfterMs: 5000 });
  });

  it('InternalError has correct code and statusCode', () => {
    const err = new InternalError();
    expect(err.code).toBe('INTERNAL');
    expect(err.statusCode).toBe(500);
  });

  it('IdempotencyReplayError has correct code and statusCode', () => {
    const err = new IdempotencyReplayError();
    expect(err.code).toBe('IDEMPOTENCY_REPLAY');
    expect(err.statusCode).toBe(409);
  });

  it('SchemaVersionMismatchError has correct code and statusCode', () => {
    const err = new SchemaVersionMismatchError();
    expect(err.code).toBe('SCHEMA_VERSION_MISMATCH');
    expect(err.statusCode).toBe(409);
  });
});

describe('toJSON', () => {
  it('returns stable shape with code, message, statusCode', () => {
    const err = new NotFoundError('Sheet not found');
    const json = err.toJSON();
    expect(json).toEqual({
      code: 'NOT_FOUND',
      message: 'Sheet not found',
      statusCode: 404,
    });
  });

  it('includes details when present', () => {
    const err = new ValidationError('Bad input', { email: 'invalid' });
    const json = err.toJSON();
    expect(json.details).toEqual({ fieldErrors: { email: 'invalid' } });
  });

  it('omits details key when no details', () => {
    const err = new InternalError();
    const json = err.toJSON();
    expect('details' in json).toBe(false);
  });
});

describe('isDomainError', () => {
  it('returns true for DomainError instances', () => {
    expect(isDomainError(new NotFoundError())).toBe(true);
    expect(isDomainError(new UnauthorizedError())).toBe(true);
    expect(isDomainError(new InternalError())).toBe(true);
  });

  it('returns false for plain Error', () => {
    expect(isDomainError(new Error('oops'))).toBe(false);
  });

  it('returns false for non-error values', () => {
    expect(isDomainError(null)).toBe(false);
    expect(isDomainError(undefined)).toBe(false);
    expect(isDomainError('string')).toBe(false);
    expect(isDomainError(42)).toBe(false);
  });
});

describe('toHttpResponse', () => {
  it('maps a DomainError to the correct HTTP response shape', () => {
    const err = new NotFoundError('Sheet missing');
    const res = toHttpResponse(err);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toBe('Sheet missing');
  });

  it('includes details in the response when present', () => {
    const err = new RateLimitedError('Too fast', 3000);
    const res = toHttpResponse(err);
    expect(res.status).toBe(429);
    expect(res.body.error.details).toEqual({ retryAfterMs: 3000 });
  });

  it('wraps unknown errors as InternalError shape', () => {
    const res = toHttpResponse(new Error('db exploded'));
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL');
    expect(res.body.error.message).toBe('db exploded');
  });

  it('wraps non-Error unknowns with generic message', () => {
    const res = toHttpResponse('something weird');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL');
  });

  it('omits details key for unknown errors', () => {
    const res = toHttpResponse(new Error('boom'));
    expect('details' in res.body.error).toBe(false);
  });
});
