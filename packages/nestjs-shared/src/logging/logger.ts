import { Logger as NestLogger } from '@nestjs/common';

export class Logger extends NestLogger {
  constructor(context?: string) {
    super(context || 'App');
  }
}
