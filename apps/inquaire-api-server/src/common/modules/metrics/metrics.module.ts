import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

/**
 * Prometheus Metrics Module
 *
 * Provides application and business metrics for monitoring
 * @Global - Available across all modules without explicit import
 */
@Global()
@Module({
  imports: [
    PrometheusModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({
        // Metrics endpoint path (default: /metrics)
        path: '/metrics',

        // Default metrics (CPU, memory, event loop, etc.)
        defaultMetrics: {
          enabled: true,
          config: {
            prefix: 'inquaire_',
          },
        },

        // Optional: Custom port for metrics (separate from main API)
        // port: configService.get<number>('PROMETHEUS_PORT', 9090),
      }),
    }),
  ],
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
