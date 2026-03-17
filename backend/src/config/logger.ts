import winston from 'winston';
import { captureErrorWithContext } from './sentry';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const { service, environment, ...rest } = meta;
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(rest).length > 0) log += ` | ${JSON.stringify(rest)}`;
    if (stack) log += `\n${stack}`;
    return log;
  })
);

// Console-only logger — Sentry handles production errors
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'dev-codex-backend', environment: process.env.NODE_ENV || 'development' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), logFormat),
    }),
  ],
});

export { logger };

export const logError = (message: string, error?: Error, context?: Record<string, any>) => {
  logger.error(message, { error: error?.message, stack: error?.stack, ...context });

  if (error) {
    try {
      captureErrorWithContext(error, { message, severity: context?.severity || 'medium', ...context });
    } catch {
      // Fail silently to avoid infinite loops
    }
  }
};

export const logInfo = (message: string, context?: Record<string, any>) => {
  logger.info(message, context);
};

export const logWarn = (message: string, context?: Record<string, any>) => {
  logger.warn(message, context);
};

export const logDebug = (message: string, context?: Record<string, any>) => {
  logger.debug(message, context);
};

export default logger;