import { Injectable, Logger } from '@nestjs/common';
import CircuitBreaker from 'opossum';

import type { CircuitBreakerConfig } from './circuit-breaker.config';
import { DEFAULT_CIRCUIT_BREAKER_CONFIG } from './circuit-breaker.config';

/**
 * Circuit Breaker 통계 정보 타입
 */
interface CircuitBreakerStats {
  fires: number;
  successes: number;
  failures: number;
  timeouts: number;
  cacheHits: number;
  cacheMisses: number;
  semaphoreRejections: number;
  percentiles: Record<string, number>;
  latencyMean: number;
}

/**
 * Circuit Breaker 기본 타입 (여러 타입의 breaker를 저장하기 위한 공통 타입)
 */
type BaseCircuitBreaker = CircuitBreaker<unknown[], unknown>;

/**
 * Circuit Breaker Service
 * 외부 API 호출에 대한 장애 격리 제공
 */
@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly breakers = new Map<string, BaseCircuitBreaker>();

  /**
   * Circuit Breaker로 함수 감싸기
   */
  wrap<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    config: CircuitBreakerConfig = DEFAULT_CIRCUIT_BREAKER_CONFIG
  ): CircuitBreaker<Parameters<T>, Awaited<ReturnType<T>>> {
    const breakerName = config.name || fn.name || 'anonymous';

    if (this.breakers.has(breakerName)) {
      return this.breakers.get(breakerName) as CircuitBreaker<
        Parameters<T>,
        Awaited<ReturnType<T>>
      >;
    }

    const breaker = new CircuitBreaker(fn, {
      timeout: config.timeout,
      errorThresholdPercentage: config.errorThresholdPercentage,
      resetTimeout: config.resetTimeout,
      volumeThreshold: config.volumeThreshold,
      name: breakerName,
    }) as CircuitBreaker<Parameters<T>, Awaited<ReturnType<T>>>;

    this.setupEventListeners(breaker, breakerName);
    this.breakers.set(breakerName, breaker);

    return breaker;
  }

  /**
   * Circuit Breaker 이벤트 리스너 설정
   */
  private setupEventListeners(breaker: BaseCircuitBreaker, name: string): void {
    breaker.on('open', () => {
      this.logger.warn(`Circuit breaker [${name}] opened`);
    });

    breaker.on('halfOpen', () => {
      this.logger.log(`Circuit breaker [${name}] half-opened`);
    });

    breaker.on('close', () => {
      this.logger.log(`Circuit breaker [${name}] closed`);
    });

    breaker.on('success', () => {
      this.logger.debug(`Circuit breaker [${name}] success`);
    });

    breaker.on('failure', error => {
      this.logger.error(`Circuit breaker [${name}] failure:`, error.message);
    });

    breaker.on('timeout', () => {
      this.logger.warn(`Circuit breaker [${name}] timeout`);
    });

    breaker.on('reject', () => {
      this.logger.warn(`Circuit breaker [${name}] rejected (circuit open)`);
    });
  }

  /**
   * Circuit Breaker 상태 조회
   */
  getStatus(name: string): {
    state: string;
    stats: CircuitBreakerStats;
  } | null {
    const breaker = this.breakers.get(name);
    if (!breaker) return null;

    return {
      state: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
      stats: breaker.stats as CircuitBreakerStats,
    };
  }

  /**
   * 모든 Circuit Breaker 상태 조회
   */
  getAllStatus(): Record<
    string,
    {
      state: string;
      stats: CircuitBreakerStats;
    } | null
  > {
    const status: Record<
      string,
      {
        state: string;
        stats: CircuitBreakerStats;
      } | null
    > = {};

    this.breakers.forEach((_breaker, name) => {
      status[name] = this.getStatus(name);
    });

    return status;
  }

  /**
   * Circuit Breaker 수동으로 열기
   */
  open(name: string): void {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.open();
      this.logger.log(`Circuit breaker [${name}] manually opened`);
    }
  }

  /**
   * Circuit Breaker 수동으로 닫기
   */
  close(name: string): void {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.close();
      this.logger.log(`Circuit breaker [${name}] manually closed`);
    }
  }

  /**
   * 애플리케이션 종료 시 정리
   */
  async onModuleDestroy() {
    this.breakers.forEach((_breaker, name) => {
      _breaker.shutdown();
      this.logger.log(`Circuit breaker [${name}] shutdown`);
    });
    this.breakers.clear();
  }
}
