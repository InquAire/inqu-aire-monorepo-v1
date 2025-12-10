/**
 * AppController Unit Tests
 *
 * 테스트 범위:
 * - Health check 엔드포인트
 * - Detailed health check 엔드포인트
 * - Sentry 테스트 엔드포인트
 * - 에러 핸들링
 */

import 'reflect-metadata';

// Mock Sentry to avoid import issues
jest.mock('@sentry/node', () => ({
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;
  let appService: jest.Mocked<AppService>;

  const mockHealthResult = {
    status: 'ok',
    timestamp: '2025-01-01T00:00:00.000Z',
    service: 'inquaire-api-server',
    version: '1.0.0',
  };

  const mockDetailedHealthResult = {
    status: 'ok',
    timestamp: '2025-01-01T00:00:00.000Z',
    service: 'inquaire-api-server',
    version: '1.0.0',
    uptime: 12345,
    memory: {
      rss: 1000000,
      heapTotal: 500000,
      heapUsed: 300000,
      external: 200000,
      arrayBuffers: 50000,
    },
    environment: 'test',
  };

  beforeEach(() => {
    const mockAppService = {
      getHealth: jest.fn(),
      getDetailedHealth: jest.fn(),
    };

    // Direct instantiation to avoid decorator dependency issues
    controller = new AppController(mockAppService as unknown as AppService);
    appService = mockAppService as unknown as jest.Mocked<AppService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getHealth', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
      expect(controller.getHealth).toBeDefined();
    });

    it('should successfully return health status', () => {
      // Arrange
      appService.getHealth.mockReturnValue(mockHealthResult);

      // Act
      const result = controller.getHealth();

      // Assert
      expect(result).toEqual(mockHealthResult);
      expect(appService.getHealth).toHaveBeenCalledTimes(1);
      expect(appService.getHealth).toHaveBeenCalledWith();
    });

    it('should return health status with correct structure', () => {
      // Arrange
      appService.getHealth.mockReturnValue(mockHealthResult);

      // Act
      const result = controller.getHealth();

      // Assert
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('service');
      expect(result).toHaveProperty('version');
      expect(result.status).toBe('ok');
      expect(result.service).toBe('inquaire-api-server');
    });

    it('should call service method correctly', () => {
      // Arrange
      appService.getHealth.mockReturnValue(mockHealthResult);

      // Act
      controller.getHealth();

      // Assert
      expect(appService.getHealth).toHaveBeenCalled();
      expect(appService.getHealth).toHaveBeenCalledWith();
    });
  });

  describe('getDetailedHealth', () => {
    it('should be defined', () => {
      expect(controller.getDetailedHealth).toBeDefined();
    });

    it('should successfully return detailed health status', () => {
      // Arrange
      appService.getDetailedHealth.mockReturnValue(mockDetailedHealthResult);

      // Act
      const result = controller.getDetailedHealth();

      // Assert
      expect(result).toEqual(mockDetailedHealthResult);
      expect(appService.getDetailedHealth).toHaveBeenCalledTimes(1);
      expect(appService.getDetailedHealth).toHaveBeenCalledWith();
    });

    it('should return detailed health status with all fields', () => {
      // Arrange
      appService.getDetailedHealth.mockReturnValue(mockDetailedHealthResult);

      // Act
      const result = controller.getDetailedHealth();

      // Assert
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('service');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('environment');
    });

    it('should return memory usage information', () => {
      // Arrange
      appService.getDetailedHealth.mockReturnValue(mockDetailedHealthResult);

      // Act
      const result = controller.getDetailedHealth();

      // Assert
      expect(result.memory).toHaveProperty('rss');
      expect(result.memory).toHaveProperty('heapTotal');
      expect(result.memory).toHaveProperty('heapUsed');
      expect(result.memory).toHaveProperty('external');
      expect(result.memory).toHaveProperty('arrayBuffers');
    });

    it('should return uptime information', () => {
      // Arrange
      appService.getDetailedHealth.mockReturnValue(mockDetailedHealthResult);

      // Act
      const result = controller.getDetailedHealth();

      // Assert
      expect(result.uptime).toBeDefined();
      expect(typeof result.uptime).toBe('number');
    });

    it('should return environment information', () => {
      // Arrange
      appService.getDetailedHealth.mockReturnValue(mockDetailedHealthResult);

      // Act
      const result = controller.getDetailedHealth();

      // Assert
      expect(result.environment).toBeDefined();
      expect(typeof result.environment).toBe('string');
    });

    it('should call service method correctly', () => {
      // Arrange
      appService.getDetailedHealth.mockReturnValue(mockDetailedHealthResult);

      // Act
      controller.getDetailedHealth();

      // Assert
      expect(appService.getDetailedHealth).toHaveBeenCalled();
      expect(appService.getDetailedHealth).toHaveBeenCalledWith();
    });
  });

  describe('testSentry', () => {
    it('should be defined', () => {
      expect(controller.testSentry).toBeDefined();
    });

    it('should return default message when no type is provided', () => {
      // Act
      const result = controller.testSentry();

      // Assert
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('availableTests');
      expect(result).toHaveProperty('examples');
      expect(result.status).toBe('ok');
      expect(result.message).toBe('Sentry is configured');
      expect(Array.isArray(result.availableTests)).toBe(true);
      expect(Array.isArray(result.examples)).toBe(true);
    });

    it('should return default message when type is undefined', () => {
      // Act
      const result = controller.testSentry(undefined);

      // Assert
      expect(result.status).toBe('ok');
      expect(result.message).toBe('Sentry is configured');
    });

    it('should throw error when type is "error"', () => {
      // Act & Assert
      expect(() => controller.testSentry('error')).toThrow(Error);
      expect(() => controller.testSentry('error')).toThrow(
        '🚨 Test error from health check - This is a test alert'
      );
    });

    it('should return warning status when type is "warning"', () => {
      // Act
      const result = controller.testSentry('warning');

      // Assert
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('message');
      expect(result.status).toBe('warning sent');
      expect(result.message).toBe('Warning captured in Sentry');
    });

    it('should return performance status when type is "performance"', () => {
      // Act
      const result = controller.testSentry('performance');

      // Assert
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('message');
      expect(result.status).toBe('performance issue sent');
      expect(result.message).toBe('Slow operation (2s) captured in Sentry');
    });

    it('should return breadcrumb status when type is "breadcrumb"', () => {
      // Act
      const result = controller.testSentry('breadcrumb');

      // Assert
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('message');
      expect(result.status).toBe('breadcrumb sent');
      expect(result.message).toBe('Breadcrumb added to Sentry');
    });

    it('should handle all available test types', () => {
      // Arrange
      const types = ['error', 'warning', 'performance', 'breadcrumb'];

      // Act & Assert
      for (const type of types) {
        if (type === 'error') {
          expect(() => controller.testSentry(type)).toThrow();
        } else {
          const result = controller.testSentry(type);
          expect(result).toHaveProperty('status');
          expect(result).toHaveProperty('message');
        }
      }
    });

    it('should include all test types in availableTests', () => {
      // Act
      const result = controller.testSentry();

      // Assert
      expect(result.availableTests).toContain('error');
      expect(result.availableTests).toContain('warning');
      expect(result.availableTests).toContain('performance');
      expect(result.availableTests).toContain('breadcrumb');
    });

    it('should include example URLs in examples', () => {
      // Act
      const result = controller.testSentry();

      // Assert
      expect(result.examples).toContain('GET /health/test-sentry?type=error');
      expect(result.examples).toContain('GET /health/test-sentry?type=warning');
      expect(result.examples).toContain('GET /health/test-sentry?type=performance');
      expect(result.examples).toContain('GET /health/test-sentry?type=breadcrumb');
    });
  });

  describe('Integration with Service', () => {
    it('should correctly call getHealth service method', () => {
      // Arrange
      appService.getHealth.mockReturnValue(mockHealthResult);

      // Act
      controller.getHealth();

      // Assert
      expect(appService.getHealth).toHaveBeenCalledWith();
    });

    it('should correctly call getDetailedHealth service method', () => {
      // Arrange
      appService.getDetailedHealth.mockReturnValue(mockDetailedHealthResult);

      // Act
      controller.getDetailedHealth();

      // Assert
      expect(appService.getDetailedHealth).toHaveBeenCalledWith();
    });

    it('should return service response directly', () => {
      // Arrange
      const customHealthResult = {
        status: 'custom',
        timestamp: '2025-01-02T00:00:00.000Z',
        service: 'custom-service',
        version: '2.0.0',
      };
      appService.getHealth.mockReturnValue(customHealthResult);

      // Act
      const result = controller.getHealth();

      // Assert
      expect(result).toEqual(customHealthResult);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors in getHealth', () => {
      // Arrange
      const error = new Error('Service error');
      appService.getHealth.mockImplementation(() => {
        throw error;
      });

      // Act & Assert
      expect(() => controller.getHealth()).toThrow('Service error');
    });

    it('should propagate service errors in getDetailedHealth', () => {
      // Arrange
      const error = new Error('Service error');
      appService.getDetailedHealth.mockImplementation(() => {
        throw error;
      });

      // Act & Assert
      expect(() => controller.getDetailedHealth()).toThrow('Service error');
    });
  });
});
