/**
 * MetricsController Unit Tests
 *
 * 테스트 범위:
 * - Prometheus metrics 엔드포인트
 * - 메트릭 포맷 검증
 * - Health check 엔드포인트
 */

import 'reflect-metadata';

import { MetricsController } from './metrics.controller';

describe('MetricsController', () => {
  let controller: MetricsController;

  beforeEach(() => {
    // Direct instantiation to avoid decorator dependency issues
    controller = new MetricsController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMetricsHealth', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
      expect(controller.getMetricsHealth).toBeDefined();
    });

    it('should successfully return metrics health status', () => {
      // Act
      const result = controller.getMetricsHealth();

      // Assert
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('message');
      expect(result.status).toBe('ok');
      expect(result.message).toBe('Metrics collection is active');
    });

    it('should return status as "ok"', () => {
      // Act
      const result = controller.getMetricsHealth();

      // Assert
      expect(result.status).toBe('ok');
    });

    it('should return timestamp in ISO format', () => {
      // Act
      const result = controller.getMetricsHealth();

      // Assert
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
      // ISO 8601 format check
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should return correct message', () => {
      // Act
      const result = controller.getMetricsHealth();

      // Assert
      expect(result.message).toBe('Metrics collection is active');
    });

    it('should return timestamp as current date', () => {
      // Arrange
      const beforeCall = new Date().toISOString();

      // Act
      const result = controller.getMetricsHealth();

      // Assert
      const afterCall = new Date().toISOString();
      // ISO string comparison
      expect(result.timestamp >= beforeCall).toBe(true);
      expect(result.timestamp <= afterCall).toBe(true);
    });

    it('should return consistent structure on multiple calls', () => {
      // Act
      const result1 = controller.getMetricsHealth();
      const result2 = controller.getMetricsHealth();

      // Assert
      expect(result1).toHaveProperty('status');
      expect(result1).toHaveProperty('timestamp');
      expect(result1).toHaveProperty('message');
      expect(result2).toHaveProperty('status');
      expect(result2).toHaveProperty('timestamp');
      expect(result2).toHaveProperty('message');
      expect(result1.status).toBe(result2.status);
      expect(result1.message).toBe(result2.message);
    });

    it('should return different timestamps on sequential calls', () => {
      // Act
      const result1 = controller.getMetricsHealth();
      // Small delay to ensure different timestamps
      const delay = new Promise(resolve => setTimeout(resolve, 10));
      return delay.then(() => {
        const result2 = controller.getMetricsHealth();
        // Timestamps should be different (or very close)
        expect(result1.timestamp).not.toBe(result2.timestamp);
      });
    });

    it('should have all required properties', () => {
      // Act
      const result = controller.getMetricsHealth();

      // Assert
      expect(Object.keys(result)).toHaveLength(3);
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('message');
    });

    it('should return valid JSON structure', () => {
      // Act
      const result = controller.getMetricsHealth();

      // Assert
      expect(() => JSON.stringify(result)).not.toThrow();
      const jsonString = JSON.stringify(result);
      const parsed = JSON.parse(jsonString);
      expect(parsed).toEqual(result);
    });
  });

  describe('Response Format', () => {
    it('should return response with correct types', () => {
      // Act
      const result = controller.getMetricsHealth();

      // Assert
      expect(typeof result.status).toBe('string');
      expect(typeof result.timestamp).toBe('string');
      expect(typeof result.message).toBe('string');
    });

    it('should return status as string literal "ok"', () => {
      // Act
      const result = controller.getMetricsHealth();

      // Assert
      expect(result.status).toBe('ok');
      expect(result.status).not.toBe('error');
      expect(result.status).not.toBe('warning');
    });

    it('should return message as non-empty string', () => {
      // Act
      const result = controller.getMetricsHealth();

      // Assert
      expect(result.message).toBeTruthy();
      expect(result.message.length).toBeGreaterThan(0);
    });
  });

  describe('Integration', () => {
    it('should be callable multiple times without errors', () => {
      // Act & Assert
      expect(() => {
        controller.getMetricsHealth();
        controller.getMetricsHealth();
        controller.getMetricsHealth();
      }).not.toThrow();
    });

    it('should return consistent message across calls', () => {
      // Act
      const results = Array.from({ length: 5 }, () => controller.getMetricsHealth());

      // Assert
      const messages = results.map(r => r.message);
      const uniqueMessages = new Set(messages);
      expect(uniqueMessages.size).toBe(1);
      expect(messages[0]).toBe('Metrics collection is active');
    });

    it('should return consistent status across calls', () => {
      // Act
      const results = Array.from({ length: 5 }, () => controller.getMetricsHealth());

      // Assert
      const statuses = results.map(r => r.status);
      const uniqueStatuses = new Set(statuses);
      expect(uniqueStatuses.size).toBe(1);
      expect(statuses[0]).toBe('ok');
    });
  });
});
