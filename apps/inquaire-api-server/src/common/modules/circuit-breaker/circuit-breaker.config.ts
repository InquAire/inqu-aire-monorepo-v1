/**
 * Circuit Breaker Configuration
 */

export interface CircuitBreakerConfig {
  timeout: number; // 타임아웃 (밀리초)
  errorThresholdPercentage: number; // 에러 임계값 (%)
  resetTimeout: number; // 리셋 타임아웃 (밀리초)
  volumeThreshold: number; // 최소 요청 수
  name?: string; // Circuit Breaker 이름
}

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  timeout: 30000, // 30초
  errorThresholdPercentage: 50, // 50% 실패 시 Open
  resetTimeout: 60000, // 1분 후 Half-Open 시도
  volumeThreshold: 10, // 최소 10개 요청 후 판단
};

export const OPENAI_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  timeout: 60000, // 60초 (OpenAI 응답 시간 고려)
  errorThresholdPercentage: 50,
  resetTimeout: 30000, // 30초 후 재시도
  volumeThreshold: 5,
  name: 'OpenAI',
};

export const HTTP_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  timeout: 10000, // 10초
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  volumeThreshold: 10,
  name: 'HTTP',
};
