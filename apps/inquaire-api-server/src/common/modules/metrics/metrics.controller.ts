import { Public } from '@ai-next/nestjs-shared';
import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

/**
 * Metrics Controller
 *
 * Handles Prometheus metrics endpoint
 * Note: The actual /metrics endpoint is provided by PrometheusModule
 * This controller is for additional metrics-related endpoints if needed
 */
@ApiExcludeController() // Exclude from Swagger docs
@Controller('metrics')
export class MetricsController {
  @Public() // Public endpoint for monitoring systems
  @Get('health')
  getMetricsHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Metrics collection is active',
    };
  }
}
