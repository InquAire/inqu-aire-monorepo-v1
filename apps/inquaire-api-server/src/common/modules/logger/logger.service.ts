import { Inject, Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

/**
 * Custom Logger Service
 *
 * Wraps Winston logger with NestJS LoggerService interface
 * Provides structured logging with context and metadata support
 */
@Injectable()
export class CustomLoggerService implements NestLoggerService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger
  ) {}

  /**
   * Log a message at 'log' level (info in Winston)
   */
  log(message: string, context?: string, metadata?: Record<string, unknown>): void {
    this.logger.info(message, { context, ...metadata });
  }

  /**
   * Log an error message
   */
  error(message: string, trace?: string, context?: string, metadata?: Record<string, unknown>): void {
    this.logger.error(message, { context, trace, ...metadata });
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: string, metadata?: Record<string, unknown>): void {
    this.logger.warn(message, { context, ...metadata });
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: string, metadata?: Record<string, unknown>): void {
    this.logger.debug(message, { context, ...metadata });
  }

  /**
   * Log a verbose message
   */
  verbose(message: string, context?: string, metadata?: Record<string, unknown>): void {
    this.logger.verbose(message, { context, ...metadata });
  }

  /**
   * Log with custom level
   */
  logWithLevel(
    level: 'info' | 'error' | 'warn' | 'debug' | 'verbose',
    message: string,
    context?: string,
    metadata?: Record<string, unknown>
  ): void {
    this.logger.log(level, message, { context, ...metadata });
  }

  /**
   * Log HTTP request
   */
  logHttpRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    metadata?: Record<string, unknown>
  ): void {
    this.logger.info('HTTP Request', {
      context: 'HTTP',
      method,
      url,
      statusCode,
      duration,
      ...metadata,
    });
  }

  /**
   * Log database query
   */
  logDatabaseQuery(
    query: string,
    duration: number,
    metadata?: Record<string, unknown>
  ): void {
    this.logger.debug('Database Query', {
      context: 'Database',
      query,
      duration,
      ...metadata,
    });
  }

  /**
   * Log business event
   */
  logBusinessEvent(
    eventName: string,
    eventData: Record<string, unknown>,
    context?: string
  ): void {
    this.logger.info('Business Event', {
      context: context || 'BusinessEvent',
      eventName,
      ...eventData,
    });
  }
}
