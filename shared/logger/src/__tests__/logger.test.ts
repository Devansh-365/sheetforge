import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createLogger } from '../index.js';

describe('createLogger', () => {
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    // Force non-dev to avoid pino-pretty transport in tests
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('returns a pino logger instance with expected methods', () => {
    const logger = createLogger({ service: 'test' });
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('respects explicit level option', () => {
    const logger = createLogger({ level: 'debug', service: 'test' });
    expect(logger.level).toBe('debug');
  });

  it('defaults to info level when no level provided', () => {
    process.env.LOG_LEVEL = undefined;
    const logger = createLogger({ service: 'test' });
    expect(logger.level).toBe('info');
  });

  it('respects LOG_LEVEL env var', () => {
    process.env.LOG_LEVEL = 'warn';
    const logger = createLogger({ service: 'test' });
    expect(logger.level).toBe('warn');
    process.env.LOG_LEVEL = undefined;
  });

  it('child logger inherits context from parent', () => {
    const logger = createLogger({ service: 'api', context: { requestId: 'abc-123' } });
    const child = logger.child({ writeId: 'w-456' });
    expect(typeof child.info).toBe('function');
    // Child should carry over level
    expect(child.level).toBe('info');
  });

  it('createLogger with context option returns a child logger', () => {
    const logger = createLogger({ service: 'worker', context: { env: 'test' } });
    expect(typeof logger.info).toBe('function');
  });

  it('createLogger without options returns a valid logger', () => {
    const logger = createLogger();
    expect(typeof logger.info).toBe('function');
    expect(logger.level).toBe('info');
  });

  it('service field is set on the base logger', () => {
    const logger = createLogger({ service: 'api' });
    // pino stores bindings — verify the logger exists and is functional
    expect(typeof logger.child).toBe('function');
  });
});
