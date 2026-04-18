import pino from 'pino';

export type Logger = pino.Logger;

export interface CreateLoggerOptions {
  level?: 'debug' | 'info' | 'warn' | 'error';
  service?: string;
  context?: Record<string, unknown>;
}

/**
 * Factory — no default singleton, always DI.
 * In development (NODE_ENV !== "production") uses pino-pretty for human-readable output.
 * In production emits structured JSON.
 */
export function createLogger(opts: CreateLoggerOptions = {}): Logger {
  const level = opts.level ?? (process.env.LOG_LEVEL as CreateLoggerOptions['level']) ?? 'info';
  const isDev = process.env.NODE_ENV !== 'production';

  const transport = isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined;

  const base: Record<string, unknown> = {};
  if (opts.service !== undefined) {
    base.service = opts.service;
  }

  const logger = pino({
    level,
    base,
    transport,
  });

  if (opts.context && Object.keys(opts.context).length > 0) {
    return logger.child(opts.context);
  }

  return logger;
}
