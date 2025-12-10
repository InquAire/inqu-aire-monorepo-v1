/**
 * CustomLoggerService Unit Tests
 *
 * 테스트 범위:
 * - Winston 로깅 래핑
 * - 로그 레벨 (log, error, warn, debug, verbose)
 * - 커스텀 레벨 로깅 (logWithLevel)
 * - HTTP 요청 로깅 (logHttpRequest)
 * - 데이터베이스 쿼리 로깅 (logDatabaseQuery)
 * - 비즈니스 이벤트 로깅 (logBusinessEvent)
 * - 컨텍스트 및 메타데이터 지원
 */

import 'reflect-metadata';

import { Test, TestingModule } from '@nestjs/testing';
import type { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

import { CustomLoggerService } from './logger.service';

describe('CustomLoggerService', () => {
  let service: CustomLoggerService;
  let winstonLogger: jest.Mocked<Logger>;

  beforeEach(async () => {
    const mockWinstonLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomLoggerService,
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockWinstonLogger,
        },
      ],
    }).compile();

    service = module.get<CustomLoggerService>(CustomLoggerService);
    winstonLogger = module.get(WINSTON_MODULE_PROVIDER) as jest.Mocked<Logger>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should implement NestJS LoggerService interface', () => {
      expect(service.log).toBeDefined();
      expect(service.error).toBeDefined();
      expect(service.warn).toBeDefined();
      expect(service.debug).toBeDefined();
      expect(service.verbose).toBeDefined();
    });
  });

  describe('log (info level)', () => {
    it('should log message at info level', () => {
      // Arrange
      const message = 'Test log message';

      // Act
      service.log(message);

      // Assert
      expect(winstonLogger.info).toHaveBeenCalledWith(message, {});
    });

    it('should log message with context', () => {
      // Arrange
      const message = 'Test log message';
      const context = 'TestContext';

      // Act
      service.log(message, context);

      // Assert
      expect(winstonLogger.info).toHaveBeenCalledWith(message, { context });
    });

    it('should log message with context and metadata', () => {
      // Arrange
      const message = 'Test log message';
      const context = 'TestContext';
      const metadata = { userId: '123', action: 'test' };

      // Act
      service.log(message, context, metadata);

      // Assert
      expect(winstonLogger.info).toHaveBeenCalledWith(message, {
        context,
        ...metadata,
      });
    });

    it('should log message with metadata only', () => {
      // Arrange
      const message = 'Test log message';
      const metadata = { userId: '123' };

      // Act
      service.log(message, undefined, metadata);

      // Assert
      expect(winstonLogger.info).toHaveBeenCalledWith(message, metadata);
    });
  });

  describe('error', () => {
    it('should log error message', () => {
      // Arrange
      const message = 'Error occurred';

      // Act
      service.error(message);

      // Assert
      expect(winstonLogger.error).toHaveBeenCalledWith(message, {});
    });

    it('should log error with trace', () => {
      // Arrange
      const message = 'Error occurred';
      const trace = 'Error: Test error\n    at test.js:1:1';

      // Act
      service.error(message, trace);

      // Assert
      expect(winstonLogger.error).toHaveBeenCalledWith(message, { trace });
    });

    it('should log error with trace and context', () => {
      // Arrange
      const message = 'Error occurred';
      const trace = 'Error: Test error\n    at test.js:1:1';
      const context = 'ErrorContext';

      // Act
      service.error(message, trace, context);

      // Assert
      expect(winstonLogger.error).toHaveBeenCalledWith(message, {
        context,
        trace,
      });
    });

    it('should log error with trace, context, and metadata', () => {
      // Arrange
      const message = 'Error occurred';
      const trace = 'Error: Test error';
      const context = 'ErrorContext';
      const metadata = { userId: '123', errorCode: 'E001' };

      // Act
      service.error(message, trace, context, metadata);

      // Assert
      expect(winstonLogger.error).toHaveBeenCalledWith(message, {
        context,
        trace,
        ...metadata,
      });
    });

    it('should log error with metadata only', () => {
      // Arrange
      const message = 'Error occurred';
      const metadata = { errorCode: 'E001' };

      // Act
      service.error(message, undefined, undefined, metadata);

      // Assert
      expect(winstonLogger.error).toHaveBeenCalledWith(message, metadata);
    });
  });

  describe('warn', () => {
    it('should log warning message', () => {
      // Arrange
      const message = 'Warning message';

      // Act
      service.warn(message);

      // Assert
      expect(winstonLogger.warn).toHaveBeenCalledWith(message, {});
    });

    it('should log warning with context', () => {
      // Arrange
      const message = 'Warning message';
      const context = 'WarningContext';

      // Act
      service.warn(message, context);

      // Assert
      expect(winstonLogger.warn).toHaveBeenCalledWith(message, { context });
    });

    it('should log warning with context and metadata', () => {
      // Arrange
      const message = 'Warning message';
      const context = 'WarningContext';
      const metadata = { threshold: 100, current: 150 };

      // Act
      service.warn(message, context, metadata);

      // Assert
      expect(winstonLogger.warn).toHaveBeenCalledWith(message, {
        context,
        ...metadata,
      });
    });
  });

  describe('debug', () => {
    it('should log debug message', () => {
      // Arrange
      const message = 'Debug message';

      // Act
      service.debug(message);

      // Assert
      expect(winstonLogger.debug).toHaveBeenCalledWith(message, {});
    });

    it('should log debug with context', () => {
      // Arrange
      const message = 'Debug message';
      const context = 'DebugContext';

      // Act
      service.debug(message, context);

      // Assert
      expect(winstonLogger.debug).toHaveBeenCalledWith(message, { context });
    });

    it('should log debug with context and metadata', () => {
      // Arrange
      const message = 'Debug message';
      const context = 'DebugContext';
      const metadata = { variable: 'value', step: 1 };

      // Act
      service.debug(message, context, metadata);

      // Assert
      expect(winstonLogger.debug).toHaveBeenCalledWith(message, {
        context,
        ...metadata,
      });
    });
  });

  describe('verbose', () => {
    it('should log verbose message', () => {
      // Arrange
      const message = 'Verbose message';

      // Act
      service.verbose(message);

      // Assert
      expect(winstonLogger.verbose).toHaveBeenCalledWith(message, {});
    });

    it('should log verbose with context', () => {
      // Arrange
      const message = 'Verbose message';
      const context = 'VerboseContext';

      // Act
      service.verbose(message, context);

      // Assert
      expect(winstonLogger.verbose).toHaveBeenCalledWith(message, { context });
    });

    it('should log verbose with context and metadata', () => {
      // Arrange
      const message = 'Verbose message';
      const context = 'VerboseContext';
      const metadata = { detail: 'extra information' };

      // Act
      service.verbose(message, context, metadata);

      // Assert
      expect(winstonLogger.verbose).toHaveBeenCalledWith(message, {
        context,
        ...metadata,
      });
    });
  });

  describe('logWithLevel', () => {
    it('should log with info level', () => {
      // Arrange
      const message = 'Info message';
      const level = 'info' as const;

      // Act
      service.logWithLevel(level, message);

      // Assert
      expect(winstonLogger.log).toHaveBeenCalledWith(level, message, {});
    });

    it('should log with error level', () => {
      // Arrange
      const message = 'Error message';
      const level = 'error' as const;

      // Act
      service.logWithLevel(level, message);

      // Assert
      expect(winstonLogger.log).toHaveBeenCalledWith(level, message, {});
    });

    it('should log with warn level', () => {
      // Arrange
      const message = 'Warning message';
      const level = 'warn' as const;

      // Act
      service.logWithLevel(level, message);

      // Assert
      expect(winstonLogger.log).toHaveBeenCalledWith(level, message, {});
    });

    it('should log with debug level', () => {
      // Arrange
      const message = 'Debug message';
      const level = 'debug' as const;

      // Act
      service.logWithLevel(level, message);

      // Assert
      expect(winstonLogger.log).toHaveBeenCalledWith(level, message, {});
    });

    it('should log with verbose level', () => {
      // Arrange
      const message = 'Verbose message';
      const level = 'verbose' as const;

      // Act
      service.logWithLevel(level, message);

      // Assert
      expect(winstonLogger.log).toHaveBeenCalledWith(level, message, {});
    });

    it('should log with level and context', () => {
      // Arrange
      const message = 'Test message';
      const level = 'info' as const;
      const context = 'TestContext';

      // Act
      service.logWithLevel(level, message, context);

      // Assert
      expect(winstonLogger.log).toHaveBeenCalledWith(level, message, { context });
    });

    it('should log with level, context, and metadata', () => {
      // Arrange
      const message = 'Test message';
      const level = 'info' as const;
      const context = 'TestContext';
      const metadata = { custom: 'data' };

      // Act
      service.logWithLevel(level, message, context, metadata);

      // Assert
      expect(winstonLogger.log).toHaveBeenCalledWith(level, message, {
        context,
        ...metadata,
      });
    });
  });

  describe('logHttpRequest', () => {
    it('should log HTTP request with all parameters', () => {
      // Arrange
      const method = 'GET';
      const url = '/api/test';
      const statusCode = 200;
      const duration = 150;

      // Act
      service.logHttpRequest(method, url, statusCode, duration);

      // Assert
      expect(winstonLogger.info).toHaveBeenCalledWith('HTTP Request', {
        context: 'HTTP',
        method,
        url,
        statusCode,
        duration,
      });
    });

    it('should log HTTP request with metadata', () => {
      // Arrange
      const method = 'POST';
      const url = '/api/users';
      const statusCode = 201;
      const duration = 250;
      const metadata = { userId: '123', ip: '192.168.1.1' };

      // Act
      service.logHttpRequest(method, url, statusCode, duration, metadata);

      // Assert
      expect(winstonLogger.info).toHaveBeenCalledWith('HTTP Request', {
        context: 'HTTP',
        method,
        url,
        statusCode,
        duration,
        ...metadata,
      });
    });

    it('should log different HTTP methods', () => {
      // Arrange
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      for (const method of methods) {
        // Act
        service.logHttpRequest(method, '/api/test', 200, 100);

        // Assert
        expect(winstonLogger.info).toHaveBeenCalledWith('HTTP Request', {
          context: 'HTTP',
          method,
          url: '/api/test',
          statusCode: 200,
          duration: 100,
        });
      }
    });

    it('should log different status codes', () => {
      // Arrange
      const statusCodes = [200, 201, 400, 401, 404, 500];

      for (const statusCode of statusCodes) {
        // Act
        service.logHttpRequest('GET', '/api/test', statusCode, 100);

        // Assert
        expect(winstonLogger.info).toHaveBeenCalledWith('HTTP Request', {
          context: 'HTTP',
          method: 'GET',
          url: '/api/test',
          statusCode,
          duration: 100,
        });
      }
    });
  });

  describe('logDatabaseQuery', () => {
    it('should log database query', () => {
      // Arrange
      const query = 'SELECT * FROM users WHERE id = $1';
      const duration = 50;

      // Act
      service.logDatabaseQuery(query, duration);

      // Assert
      expect(winstonLogger.debug).toHaveBeenCalledWith('Database Query', {
        context: 'Database',
        query,
        duration,
      });
    });

    it('should log database query with metadata', () => {
      // Arrange
      const query = 'INSERT INTO users (name) VALUES ($1)';
      const duration = 75;
      const metadata = { table: 'users', operation: 'insert' };

      // Act
      service.logDatabaseQuery(query, duration, metadata);

      // Assert
      expect(winstonLogger.debug).toHaveBeenCalledWith('Database Query', {
        context: 'Database',
        query,
        duration,
        ...metadata,
      });
    });

    it('should log different query types', () => {
      // Arrange
      const queries = [
        'SELECT * FROM users',
        'INSERT INTO users VALUES (...)',
        'UPDATE users SET name = $1',
        'DELETE FROM users WHERE id = $1',
      ];

      for (const query of queries) {
        // Act
        service.logDatabaseQuery(query, 100);

        // Assert
        expect(winstonLogger.debug).toHaveBeenCalledWith('Database Query', {
          context: 'Database',
          query,
          duration: 100,
        });
      }
    });
  });

  describe('logBusinessEvent', () => {
    it('should log business event', () => {
      // Arrange
      const eventName = 'user.created';
      const eventData = { userId: '123', email: 'test@example.com' };

      // Act
      service.logBusinessEvent(eventName, eventData);

      // Assert
      expect(winstonLogger.info).toHaveBeenCalledWith('Business Event', {
        context: 'BusinessEvent',
        eventName,
        ...eventData,
      });
    });

    it('should log business event with custom context', () => {
      // Arrange
      const eventName = 'inquiry.created';
      const eventData = { inquiryId: '456', status: 'NEW' };
      const context = 'InquiryService';

      // Act
      service.logBusinessEvent(eventName, eventData, context);

      // Assert
      expect(winstonLogger.info).toHaveBeenCalledWith('Business Event', {
        context,
        eventName,
        ...eventData,
      });
    });

    it('should log different business events', () => {
      // Arrange
      const events = [
        { name: 'user.created', data: { userId: '123' } },
        { name: 'inquiry.answered', data: { inquiryId: '456' } },
        { name: 'payment.processed', data: { paymentId: '789', amount: 1000 } },
      ];

      for (const event of events) {
        // Act
        service.logBusinessEvent(event.name, event.data);

        // Assert
        expect(winstonLogger.info).toHaveBeenCalledWith('Business Event', {
          context: 'BusinessEvent',
          eventName: event.name,
          ...event.data,
        });
      }
    });

    it('should merge event data correctly', () => {
      // Arrange
      const eventName = 'test.event';
      const eventData = {
        key1: 'value1',
        key2: 123,
        nested: { data: 'value' },
      };

      // Act
      service.logBusinessEvent(eventName, eventData);

      // Assert
      expect(winstonLogger.info).toHaveBeenCalledWith('Business Event', {
        context: 'BusinessEvent',
        eventName,
        key1: 'value1',
        key2: 123,
        nested: { data: 'value' },
      });
    });
  });

  describe('Metadata Handling', () => {
    it('should handle empty metadata object', () => {
      // Arrange
      const message = 'Test message';
      const metadata = {};

      // Act
      service.log(message, 'Context', metadata);

      // Assert
      expect(winstonLogger.info).toHaveBeenCalledWith(message, { context: 'Context' });
    });

    it('should handle complex metadata objects', () => {
      // Arrange
      const message = 'Test message';
      const metadata = {
        user: { id: '123', name: 'Test' },
        request: { method: 'POST', url: '/api/test' },
        nested: { level1: { level2: 'value' } },
      };

      // Act
      service.log(message, 'Context', metadata);

      // Assert
      expect(winstonLogger.info).toHaveBeenCalledWith(message, {
        context: 'Context',
        ...metadata,
      });
    });

    it('should handle metadata with arrays', () => {
      // Arrange
      const message = 'Test message';
      const metadata = {
        tags: ['tag1', 'tag2', 'tag3'],
        ids: [1, 2, 3],
      };

      // Act
      service.log(message, 'Context', metadata);

      // Assert
      expect(winstonLogger.info).toHaveBeenCalledWith(message, {
        context: 'Context',
        ...metadata,
      });
    });
  });

  describe('Context Handling', () => {
    it('should handle undefined context', () => {
      // Arrange
      const message = 'Test message';

      // Act
      service.log(message, undefined);

      // Assert
      expect(winstonLogger.info).toHaveBeenCalledWith(message, {});
    });

    it('should handle empty string context', () => {
      // Arrange
      const message = 'Test message';

      // Act
      service.log(message, '');

      // Assert
      expect(winstonLogger.info).toHaveBeenCalledWith(message, { context: '' });
    });

    it('should handle different context formats', () => {
      // Arrange
      const message = 'Test message';
      const contexts = ['ServiceName', 'ServiceName.Method', 'Module.Service.Method'];

      for (const context of contexts) {
        // Act
        service.log(message, context);

        // Assert
        expect(winstonLogger.info).toHaveBeenCalledWith(message, { context });
      }
    });
  });
});

