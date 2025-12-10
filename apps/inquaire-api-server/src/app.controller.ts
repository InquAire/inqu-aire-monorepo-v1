import { Public } from '@ai-next/nestjs-shared';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import * as Sentry from '@sentry/node';

import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check' })
  getHealth() {
    return this.appService.getHealth();
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Detailed health check' })
  getDetailedHealth() {
    return this.appService.getDetailedHealth();
  }

  @Public()
  @Get('health/test-sentry')
  @ApiOperation({
    summary: 'Test Sentry alerts (development only)',
    description: 'Triggers different types of Sentry events for testing alert rules',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['error', 'warning', 'performance', 'breadcrumb'],
    description: 'Type of Sentry event to trigger',
  })
  testSentry(@Query('type') type?: string) {
    switch (type) {
      case 'error': {
        // 에러 발생 테스트
        throw new Error('🚨 Test error from health check - This is a test alert');
      }

      case 'warning': {
        // 경고 메시지 테스트
        Sentry.captureMessage('⚠️ Test warning message - This is a test alert', 'warning');
        return { status: 'warning sent', message: 'Warning captured in Sentry' };
      }

      case 'performance': {
        // 성능 이슈 테스트 (느린 작업 시뮬레이션)
        const start = Date.now();
        // 동기적으로 2초 대기
        while (Date.now() - start < 2000) {
          // busy wait
        }
        Sentry.captureMessage('⏱️ Slow operation detected (2s)', 'warning');
        return {
          status: 'performance issue sent',
          message: 'Slow operation (2s) captured in Sentry',
        };
      }

      case 'breadcrumb': {
        // Breadcrumb 테스트 (이벤트 추적)
        Sentry.addBreadcrumb({
          category: 'test',
          message: 'Test breadcrumb from health check',
          level: 'info',
          data: {
            test: true,
            source: 'health_check',
            timestamp: new Date().toISOString(),
          },
        });
        return { status: 'breadcrumb sent', message: 'Breadcrumb added to Sentry' };
      }

      default: {
        return {
          status: 'ok',
          message: 'Sentry is configured',
          availableTests: ['error', 'warning', 'performance', 'breadcrumb'],
          examples: [
            'GET /health/test-sentry?type=error',
            'GET /health/test-sentry?type=warning',
            'GET /health/test-sentry?type=performance',
            'GET /health/test-sentry?type=breadcrumb',
          ],
        };
      }
    }
  }
}
