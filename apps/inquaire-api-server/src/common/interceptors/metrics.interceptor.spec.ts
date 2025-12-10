/**
 * MetricsInterceptor Unit Tests
 *
 * 테스트 범위:
 * - Prometheus 메트릭 수집
 * - HTTP 요청 카운터
 * - 응답 시간 히스토그램
 * - 상태 코드별 집계
 * - 에러 응답 메트릭
 */

import { CallHandler, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';
import { of, throwError } from 'rxjs';

import { MetricsService } from '../modules/metrics/metrics.service';

import { MetricsInterceptor } from './metrics.interceptor';

describe('MetricsInterceptor', () => {
  let interceptor: MetricsInterceptor;
  let metricsService: jest.Mocked<MetricsService>;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(async () => {
    // Create mock metrics service
    const mockMetricsService = {
      recordHttpRequest: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsInterceptor,
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    interceptor = module.get<MetricsInterceptor>(MetricsInterceptor);
    metricsService = module.get(MetricsService) as jest.Mocked<MetricsService>;

    // Setup mock request and response
    mockRequest = {
      method: 'GET',
      url: '/api/test',
      path: '/api/test',
      route: {
        path: '/api/test',
      },
    };

    mockResponse = {
      statusCode: 200,
    };

    // Setup mock execution context
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
      getHandler: jest.fn().mockReturnValue(() => {}),
      getClass: jest.fn().mockReturnValue(class {}),
    } as unknown as ExecutionContext;

    // Setup mock call handler
    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ data: 'test' })),
    } as unknown as CallHandler;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('intercept', () => {
    it('should be defined', () => {
      expect(interceptor).toBeDefined();
    });

    it('should record successful HTTP request', () => {
      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      // Assert
      expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
        'GET',
        '/api/test',
        200,
        expect.any(Number)
      );
    });

    it('should record error HTTP request', () => {
      // Arrange
      const error = new HttpException('Test error', HttpStatus.BAD_REQUEST);
      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => error));

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          // Expected error
        },
      });

      // Assert
      expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
        'GET',
        '/api/test',
        400,
        expect.any(Number)
      );
    });

    it('should use status 500 for errors without status property', () => {
      // Arrange
      const error = new Error('Generic error');
      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => error));

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          // Expected error
        },
      });

      // Assert
      expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
        'GET',
        '/api/test',
        500,
        expect.any(Number)
      );
    });

    it('should measure request duration', () => {
      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      // Assert
      expect(metricsService.recordHttpRequest).toHaveBeenCalled();
      const callArgs = metricsService.recordHttpRequest.mock.calls[0];
      const durationSeconds = callArgs[3];
      expect(durationSeconds).toBeGreaterThanOrEqual(0);
      expect(durationSeconds).toBeLessThan(1); // Should be very fast in test
    });

    it('should extract route from handler metadata', () => {
      // Arrange
      const routePath = '/api/custom-route';
      const handler = () => {};
      Reflect.defineMetadata('path', routePath, handler);
      mockExecutionContext.getHandler = jest.fn().mockReturnValue(handler);

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      // Assert
      expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
        'GET',
        routePath,
        200,
        expect.any(Number)
      );
    });

    it('should extract route from controller metadata', () => {
      // Arrange
      const routePath = '/api/controller-route';
      const controller = class {};
      Reflect.defineMetadata('path', routePath, controller);
      mockExecutionContext.getHandler = jest.fn().mockReturnValue(() => {});
      mockExecutionContext.getClass = jest.fn().mockReturnValue(controller);

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      // Assert
      expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
        'GET',
        routePath,
        200,
        expect.any(Number)
      );
    });

    it('should fallback to request.route.path', () => {
      // Arrange
      const routePath = '/api/route-path';
      mockRequest.route = { path: routePath };
      mockExecutionContext.getHandler = jest.fn().mockReturnValue(() => {});
      mockExecutionContext.getClass = jest.fn().mockReturnValue(class {});

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      // Assert
      expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
        'GET',
        routePath,
        200,
        expect.any(Number)
      );
    });

    it('should fallback to request.path when route not available', () => {
      // Arrange
      const path = '/api/fallback-path';
      Object.defineProperty(mockRequest, 'path', { value: path, writable: true });
      mockRequest.route = undefined;
      mockExecutionContext.getHandler = jest.fn().mockReturnValue(() => {});
      mockExecutionContext.getClass = jest.fn().mockReturnValue(class {});

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      // Assert
      expect(metricsService.recordHttpRequest).toHaveBeenCalledWith(
        'GET',
        path,
        200,
        expect.any(Number)
      );
    });

    it('should record different HTTP methods', () => {
      // Arrange
      const methods = ['POST', 'PUT', 'DELETE', 'PATCH'];
      let callCount = 0;

      methods.forEach(method => {
        mockRequest.method = method;
        mockCallHandler.handle = jest.fn().mockReturnValue(of({}));

        // Act
        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

        // Assert
        expect(metricsService.recordHttpRequest).toHaveBeenNthCalledWith(
          ++callCount,
          method,
          expect.any(String),
          expect.any(Number),
          expect.any(Number)
        );
      });
    });

    it('should record different status codes', () => {
      // Arrange
      const statusCodes = [200, 201, 400, 404, 500];
      let callCount = 0;

      statusCodes.forEach(statusCode => {
        mockResponse.statusCode = statusCode;
        mockCallHandler.handle = jest.fn().mockReturnValue(of({}));

        // Act
        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

        // Assert
        expect(metricsService.recordHttpRequest).toHaveBeenNthCalledWith(
          ++callCount,
          expect.any(String),
          expect.any(String),
          statusCode,
          expect.any(Number)
        );
      });
    });
  });
});
