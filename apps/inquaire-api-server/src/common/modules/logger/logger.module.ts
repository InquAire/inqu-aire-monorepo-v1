import { Global, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';

import { CustomLoggerService } from './logger.service';

import { winstonConfig } from '@/common/config/logger.config';

/**
 * Logger Module (Global)
 *
 * Provides Winston-based logging throughout the application
 * Marked as @Global() so CustomLoggerService is available in all modules
 */
@Global()
@Module({
  imports: [WinstonModule.forRoot(winstonConfig)],
  providers: [CustomLoggerService],
  exports: [WinstonModule, CustomLoggerService],
})
export class LoggerModule {}
