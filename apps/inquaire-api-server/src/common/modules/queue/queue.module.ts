import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

const bullImports =
  process.env.BULL_DISABLED === 'true'
    ? []
    : [
        BullModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: async (configService: ConfigService) => ({
            connection: {
              host: configService.get<string>('BULL_REDIS_HOST', 'localhost'),
              port: configService.get<number>('BULL_REDIS_PORT', 6379),
              password: configService.get<string>('BULL_REDIS_PASSWORD'),
            },
          }),
        }),
        // AI Analysis Queue
        BullModule.registerQueue({
          name: 'ai-analysis',
        }),
        // Webhook Queue
        BullModule.registerQueue({
          name: 'webhooks',
        }),
      ];

@Global()
@Module({
  imports: bullImports,
  exports: process.env.BULL_DISABLED === 'true' ? [] : [BullModule],
})
export class QueueModule {}
