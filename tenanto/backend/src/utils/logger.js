/**
 * Structured logger. Pino in production (JSON), pino-pretty in dev. Optional
 * Sentry pass-through for errors when SENTRY_DSN is set.
 */
const pino = require('pino');

let SentryHandle = null;
if (process.env.SENTRY_DSN) {
  try {
    const Sentry = require('@sentry/node');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: Number(process.env.SENTRY_TRACES_RATE || 0.1),
    });
    SentryHandle = Sentry;
  } catch (e) {
    console.warn('[logger] @sentry/node not installed — skipping');
  }
}

const baseConfig = {
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'tenanto-api', env: process.env.NODE_ENV || 'development' },
  redact: {
    paths: ['*.password', '*.token', '*.nin', '*.authorization', 'req.headers.authorization', 'req.headers.cookie'],
    censor: '[redacted]',
  },
};

const transport = process.env.NODE_ENV !== 'production'
  ? pino.transport({ target: 'pino-pretty', options: { colorize: true, singleLine: true } })
  : undefined;

const logger = transport ? pino(baseConfig, transport) : pino(baseConfig);

// Wrap error-level calls to also report to Sentry
const originalError = logger.error.bind(logger);
logger.error = function patched(...args) {
  try {
    if (SentryHandle) {
      const obj = typeof args[0] === 'object' ? args[0] : { msg: args[0] };
      const err = obj.err || obj.error;
      if (err instanceof Error) SentryHandle.captureException(err);
      else SentryHandle.captureMessage(obj.msg || JSON.stringify(obj), 'error');
    }
  } catch {}
  return originalError(...args);
};

function captureException(e, ctx) {
  if (SentryHandle) SentryHandle.captureException(e, ctx ? { extra: ctx } : undefined);
}

module.exports = { logger, captureException, Sentry: SentryHandle };
