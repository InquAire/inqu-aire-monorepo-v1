import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

@Injectable()
export class LoggerService implements NestLoggerService {
  log(message: string | object, context?: string) {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    console.log(`[${context || 'App'}] ${messageStr}`);
  }

  error(message: string | object, trace?: string, context?: string) {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    console.error(`[${context || 'App'}] ${messageStr}`, trace);
  }

  warn(message: string | object, context?: string) {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    console.warn(`[${context || 'App'}] ${messageStr}`);
  }

  debug(message: string | object, context?: string) {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    console.debug(`[${context || 'App'}] ${messageStr}`);
  }

  verbose(message: string | object, context?: string) {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    console.log(`[${context || 'App'}] ${messageStr}`);
  }
}
