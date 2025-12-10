import { WinstonModuleOptions } from 'nest-winston';
import { format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

/**
 * Winston Logger Configuration for Production
 *
 * Features:
 * - Structured JSON logging for production
 * - Daily log rotation with file size limits
 * - Separate files for different log levels
 * - Color-coded console output for development
 * - Request correlation ID support
 * - Error stack trace formatting
 */

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Console format - color-coded for development, JSON for production
 */
const consoleFormat = isDevelopment
  ? format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.colorize({ all: true }),
      format.printf(({ timestamp, level, message, context, trace, ...metadata }) => {
        let msg = `${timestamp} [${context || 'Application'}] ${level}: ${message}`;

        // Add metadata if present
        if (Object.keys(metadata).length > 0) {
          msg += `\n${JSON.stringify(metadata, null, 2)}`;
        }

        // Add stack trace if present
        if (trace) {
          msg += `\n${trace}`;
        }

        return msg;
      })
    )
  : format.combine(format.timestamp(), format.json());

/**
 * File format - always JSON for easy parsing
 */
const fileFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.json()
);

/**
 * Daily rotate file transport configuration
 */
const createDailyRotateTransport = (level: string, filename: string): DailyRotateFile => {
  return new DailyRotateFile({
    level,
    filename: `logs/${filename}-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d', // Keep logs for 14 days
    format: fileFormat,
  });
};

/**
 * Winston Logger Configuration
 */
export const winstonConfig: WinstonModuleOptions = {
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: {
    service: 'inquaire-api-server',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    // Console transport - always enabled
    new transports.Console({
      format: consoleFormat,
    }),

    // File transports - only in production or when explicitly enabled
    ...(isProduction || process.env.ENABLE_FILE_LOGGING === 'true'
      ? [
          // Combined logs (all levels)
          createDailyRotateTransport('info', 'combined'),

          // Error logs
          createDailyRotateTransport('error', 'error'),

          // Warning logs
          createDailyRotateTransport('warn', 'warn'),

          // Debug logs (only if debug is enabled)
          ...(process.env.LOG_LEVEL === 'debug'
            ? [createDailyRotateTransport('debug', 'debug')]
            : []),
        ]
      : []),
  ],

  // Prevent winston from exiting on error
  exitOnError: false,

  // Silent mode (for testing)
  silent: process.env.LOG_SILENT === 'true',
};

/**
 * HTTP Request Logging Configuration
 */
export const httpLoggerConfig = {
  // Skip logging for certain paths
  skip: (req: { url: string }) => {
    const skipPaths = ['/health', '/metrics', '/favicon.ico'];
    return skipPaths.some(path => req.url.includes(path));
  },

  // Custom request log format
  format: (req: {
    method: string;
    url: string;
    ip: string;
    headers: { 'user-agent'?: string };
  }) => {
    return JSON.stringify({
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  },
};
