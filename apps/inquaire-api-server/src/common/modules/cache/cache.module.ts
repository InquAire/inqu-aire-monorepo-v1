import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-ioredis-yet';

import { CacheService } from './cache.service';

import { LoggerModule } from '@/common/modules/logger/logger.module';

@Global()
@Module({
  imports: [
    LoggerModule,
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);
        const redisPassword = configService.get<string>('REDIS_PASSWORD');
        const redisTtl = configService.get<number>('REDIS_TTL', 300); // 5분 기본값

        return {
          store: await redisStore({
            host: redisHost,
            port: redisPort,
            password: redisPassword,
            ttl: redisTtl * 1000, // milliseconds
            db: 0,
            keyPrefix: 'inquaire:',
          }),
        };
      },
    }),
  ],
  providers: [CacheService],
  exports: [NestCacheModule, CacheService],
})
export class CacheModule {}
