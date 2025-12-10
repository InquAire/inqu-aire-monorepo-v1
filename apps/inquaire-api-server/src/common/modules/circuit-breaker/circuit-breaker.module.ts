import { Global, Module } from '@nestjs/common';

import { CircuitBreakerService } from './circuit-breaker.service';

/**
 * Circuit Breaker Module
 * 전역적으로 사용 가능한 Circuit Breaker 서비스 제공
 */
@Global()
@Module({
  providers: [CircuitBreakerService],
  exports: [CircuitBreakerService],
})
export class CircuitBreakerModule {}
