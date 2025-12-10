/**
 * PrismaService Unit Tests
 *
 * 테스트 범위:
 * - 데이터베이스 연결 (Read/Write 분리)
 * - Health checks
 * - 트랜잭션 처리
 * - Connection pooling
 * - Graceful shutdown
 * - Retry logic
 * - Raw query execution
 */

import 'reflect-metadata';

import { PrismaClient } from '@/prisma';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from './prisma.service';

import { CustomLoggerService } from '@/common/modules/logger/logger.service';

// Mock PrismaClient
jest.mock('@prisma/generated', () => {
  const mockPrismaClient = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn(),
    $queryRawUnsafe: jest.fn(),
    $transaction: jest.fn(),
    $on: jest.fn(),
    $extends: jest.fn().mockReturnThis(),
  };

  return {
    PrismaClient: jest.fn().mockImplementation(() => mockPrismaClient),
    softDeleteExtension: jest.fn().mockReturnValue({}),
    slowQueryExtension: jest.fn().mockReturnValue({}),
    readOnlyExtension: jest.fn().mockReturnValue({}),
  };
});

describe('PrismaService', () => {
  let service: PrismaService;
  let configService: jest.Mocked<ConfigService>;
  let logger: jest.Mocked<CustomLoggerService>;
  let mockWriteClient: jest.Mocked<PrismaClient>;
  let mockReadClient: jest.Mocked<PrismaClient>;

  const mockDatabaseUrl = 'postgresql://user:password@localhost:5432/testdb';
  const mockReadDatabaseUrl = 'postgresql://user:password@localhost:5432/testdb-read';

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock PrismaClient instances
    mockWriteClient = {
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
      $queryRawUnsafe: jest.fn().mockResolvedValue([]),
      $transaction: jest.fn(),
      $on: jest.fn(),
      $extends: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<PrismaClient>;

    mockReadClient = {
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
      $queryRawUnsafe: jest.fn().mockResolvedValue([]),
      $transaction: jest.fn(),
      $on: jest.fn(),
      $extends: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<PrismaClient>;

    // Mock PrismaClient constructor
    (PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(
      (config?: unknown) => {
        const url = (config as { datasources?: { db?: { url?: string } } })?.datasources?.db?.url;
        if (url?.includes('read')) {
          return mockReadClient as unknown as PrismaClient;
        }
        return mockWriteClient as unknown as PrismaClient;
      }
    );
  });

  describe('Constructor', () => {
    it('should create service with write DB only when READ_DATABASE_URL is not provided', () => {
      // Arrange
      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'DATABASE_URL') return mockDatabaseUrl;
          if (key === 'READ_DATABASE_URL') return undefined;
          if (key === 'NODE_ENV') return 'development';
          return undefined;
        }),
      };

      const mockLogger = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
        logWithLevel: jest.fn(),
        logHttpRequest: jest.fn(),
        logDatabaseQuery: jest.fn(),
        logBusinessEvent: jest.fn(),
      };

      // Act
      service = new PrismaService(
        mockConfigService as unknown as ConfigService,
        mockLogger as unknown as CustomLoggerService
      );

      // Assert
      expect(service.write).toBeDefined();
      expect(service.read).toBe(service.write);
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Read Replica not configured')
      );
    });

    it('should create service with read replica when READ_DATABASE_URL is provided', () => {
      // Arrange
      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'DATABASE_URL') return mockDatabaseUrl;
          if (key === 'READ_DATABASE_URL') return mockReadDatabaseUrl;
          if (key === 'NODE_ENV') return 'development';
          return undefined;
        }),
      };

      const mockLogger = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
        logWithLevel: jest.fn(),
        logHttpRequest: jest.fn(),
        logDatabaseQuery: jest.fn(),
        logBusinessEvent: jest.fn(),
      };

      // Act
      service = new PrismaService(
        mockConfigService as unknown as ConfigService,
        mockLogger as unknown as CustomLoggerService
      );

      // Assert
      expect(service.write).toBeDefined();
      expect(service.read).toBeDefined();
      expect(service.read).not.toBe(service.write);
      expect(mockLogger.log).toHaveBeenCalledWith('✅ Read Replica configured');
    });

    it('should throw error when DATABASE_URL is not provided', () => {
      // Arrange
      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'DATABASE_URL') return undefined;
          if (key === 'NODE_ENV') return 'development';
          return undefined;
        }),
      };

      const mockLogger = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
        logWithLevel: jest.fn(),
        logHttpRequest: jest.fn(),
        logDatabaseQuery: jest.fn(),
        logBusinessEvent: jest.fn(),
      };

      // Act & Assert
      expect(() => {
        new PrismaService(
          mockConfigService as unknown as ConfigService,
          mockLogger as unknown as CustomLoggerService
        );
      }).toThrow('Database URL not configured for write DB');
    });

    it('should configure connection pooling parameters', () => {
      // Arrange
      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'DATABASE_URL') return mockDatabaseUrl;
          if (key === 'READ_DATABASE_URL') return undefined;
          if (key === 'NODE_ENV') return 'development';
          if (key === 'DB_CONNECTION_TIMEOUT') return 3000;
          if (key === 'DB_POOL_TIMEOUT') return 8000;
          return undefined;
        }),
      };

      const mockLogger = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
        logWithLevel: jest.fn(),
        logHttpRequest: jest.fn(),
        logDatabaseQuery: jest.fn(),
        logBusinessEvent: jest.fn(),
      };

      // Act
      service = new PrismaService(
        mockConfigService as unknown as ConfigService,
        mockLogger as unknown as CustomLoggerService
      );

      // Assert
      expect(PrismaClient).toHaveBeenCalled();
      const callArgs = (PrismaClient as jest.MockedClass<typeof PrismaClient>).mock.calls[0][0];
      // @ts-expect-error Prisma 7 uses adapter instead of datasources
      expect(callArgs?.datasources?.db?.url).toBeDefined();
      // @ts-expect-error Prisma 7 uses adapter instead of datasources
      expect(callArgs?.datasources?.db?.url).toContain('connection_limit');
    });
  });

  describe('onModuleInit', () => {
    beforeEach(() => {
      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'DATABASE_URL') return mockDatabaseUrl;
          if (key === 'READ_DATABASE_URL') return undefined;
          if (key === 'NODE_ENV') return 'development';
          if (key === 'DB_MAX_RETRIES') return 3;
          if (key === 'DB_RETRY_DELAY') return 100;
          return undefined;
        }),
      };

      const mockLogger = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
        logWithLevel: jest.fn(),
        logHttpRequest: jest.fn(),
        logDatabaseQuery: jest.fn(),
        logBusinessEvent: jest.fn(),
      };

      service = new PrismaService(
        mockConfigService as unknown as ConfigService,
        mockLogger as unknown as CustomLoggerService
      );
      configService = mockConfigService as unknown as jest.Mocked<ConfigService>;
      logger = mockLogger as unknown as jest.Mocked<CustomLoggerService>;
    });

    it('should connect to write DB successfully', async () => {
      // Arrange
      mockWriteClient.$connect.mockResolvedValue(undefined);

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockWriteClient.$connect).toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith('✅ Write DB connected successfully');
    });

    it('should connect to both write and read DB when read replica is configured', async () => {
      // Arrange
      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'DATABASE_URL') return mockDatabaseUrl;
          if (key === 'READ_DATABASE_URL') return mockReadDatabaseUrl;
          if (key === 'NODE_ENV') return 'development';
          if (key === 'DB_MAX_RETRIES') return 3;
          if (key === 'DB_RETRY_DELAY') return 100;
          return undefined;
        }),
      };

      const mockLogger = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
        logWithLevel: jest.fn(),
        logHttpRequest: jest.fn(),
        logDatabaseQuery: jest.fn(),
        logBusinessEvent: jest.fn(),
      };

      service = new PrismaService(
        mockConfigService as unknown as ConfigService,
        mockLogger as unknown as CustomLoggerService
      );

      mockWriteClient.$connect.mockResolvedValue(undefined);
      mockReadClient.$connect.mockResolvedValue(undefined);

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockWriteClient.$connect).toHaveBeenCalled();
      expect(mockReadClient.$connect).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith('✅ Write DB connected successfully');
      expect(mockLogger.log).toHaveBeenCalledWith('✅ Read DB connected successfully');
    });

    it('should retry connection on failure', async () => {
      // Arrange
      const maxRetries = 3;
      configService.get.mockImplementation((key: string) => {
        if (key === 'DB_MAX_RETRIES') return maxRetries;
        if (key === 'DB_RETRY_DELAY') return 10; // Short delay for testing
        return undefined;
      });

      mockWriteClient.$connect
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce(undefined);

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockWriteClient.$connect).toHaveBeenCalledTimes(3);
      expect(logger.warn).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries', async () => {
      // Arrange
      const maxRetries = 2;
      configService.get.mockImplementation((key: string) => {
        if (key === 'DB_MAX_RETRIES') return maxRetries;
        if (key === 'DB_RETRY_DELAY') return 10;
        return undefined;
      });

      mockWriteClient.$connect.mockRejectedValue(new Error('Connection failed'));

      // Act & Assert
      await expect(service.onModuleInit()).rejects.toThrow('Connection failed');
      expect(mockWriteClient.$connect).toHaveBeenCalledTimes(maxRetries);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Database connection failed after ${maxRetries} attempts`)
      );
    });
  });

  describe('onModuleDestroy', () => {
    beforeEach(() => {
      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'DATABASE_URL') return mockDatabaseUrl;
          if (key === 'READ_DATABASE_URL') return undefined;
          if (key === 'NODE_ENV') return 'development';
          return undefined;
        }),
      };

      const mockLogger = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
        logWithLevel: jest.fn(),
        logHttpRequest: jest.fn(),
        logDatabaseQuery: jest.fn(),
        logBusinessEvent: jest.fn(),
      };

      service = new PrismaService(
        mockConfigService as unknown as ConfigService,
        mockLogger as unknown as CustomLoggerService
      );
      logger = mockLogger as unknown as jest.Mocked<CustomLoggerService>;
    });

    it('should disconnect from write DB', async () => {
      // Arrange
      mockWriteClient.$disconnect.mockResolvedValue(undefined);

      // Act
      await service.onModuleDestroy();

      // Assert
      expect(mockWriteClient.$disconnect).toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith('Disconnecting from databases...');
      expect(logger.log).toHaveBeenCalledWith('✅ Write DB disconnected');
    });

    it('should disconnect from both write and read DB when read replica is configured', async () => {
      // Arrange
      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'DATABASE_URL') return mockDatabaseUrl;
          if (key === 'READ_DATABASE_URL') return mockReadDatabaseUrl;
          if (key === 'NODE_ENV') return 'development';
          return undefined;
        }),
      };

      const mockLogger = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
        logWithLevel: jest.fn(),
        logHttpRequest: jest.fn(),
        logDatabaseQuery: jest.fn(),
        logBusinessEvent: jest.fn(),
      };

      service = new PrismaService(
        mockConfigService as unknown as ConfigService,
        mockLogger as unknown as CustomLoggerService
      );

      mockWriteClient.$disconnect.mockResolvedValue(undefined);
      mockReadClient.$disconnect.mockResolvedValue(undefined);

      // Act
      await service.onModuleDestroy();

      // Assert
      expect(mockWriteClient.$disconnect).toHaveBeenCalled();
      expect(mockReadClient.$disconnect).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith('✅ Write DB disconnected');
      expect(mockLogger.log).toHaveBeenCalledWith('✅ Read DB disconnected');
    });

    it('should handle disconnection errors', async () => {
      // Arrange
      const error = new Error('Disconnection failed');
      mockWriteClient.$disconnect.mockRejectedValue(error);

      // Act & Assert
      await expect(service.onModuleDestroy()).rejects.toThrow('Disconnection failed');
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error during database disconnection')
      );
    });
  });

  describe('isHealthy', () => {
    beforeEach(() => {
      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'DATABASE_URL') return mockDatabaseUrl;
          if (key === 'READ_DATABASE_URL') return undefined;
          if (key === 'NODE_ENV') return 'development';
          return undefined;
        }),
      };

      const mockLogger = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
        logWithLevel: jest.fn(),
        logHttpRequest: jest.fn(),
        logDatabaseQuery: jest.fn(),
        logBusinessEvent: jest.fn(),
      };

      service = new PrismaService(
        mockConfigService as unknown as ConfigService,
        mockLogger as unknown as CustomLoggerService
      );
      logger = mockLogger as unknown as jest.Mocked<CustomLoggerService>;
    });

    it('should return healthy status when both connections are healthy', async () => {
      // Arrange
      mockWriteClient.$connect.mockResolvedValue(undefined);
      mockWriteClient.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      await service.onModuleInit(); // Initialize connection

      // Act
      const result = await service.isHealthy();

      // Assert
      expect(result).toEqual({
        write: true,
        read: true,
        isConnected: true,
      });
      expect(mockWriteClient.$queryRaw).toHaveBeenCalled();
    });

    it('should return unhealthy status when write connection fails', async () => {
      // Arrange
      mockWriteClient.$queryRaw.mockRejectedValue(new Error('Connection failed'));

      // Act
      const result = await service.isHealthy();

      // Assert
      expect(result).toEqual({
        write: false,
        read: false,
        isConnected: false,
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[WRITE] ❌ Health check failed')
      );
    });

    it('should check read replica separately when configured', async () => {
      // Arrange
      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'DATABASE_URL') return mockDatabaseUrl;
          if (key === 'READ_DATABASE_URL') return mockReadDatabaseUrl;
          if (key === 'NODE_ENV') return 'development';
          return undefined;
        }),
      };

      const mockLogger = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
        logWithLevel: jest.fn(),
        logHttpRequest: jest.fn(),
        logDatabaseQuery: jest.fn(),
        logBusinessEvent: jest.fn(),
      };

      service = new PrismaService(
        mockConfigService as unknown as ConfigService,
        mockLogger as unknown as CustomLoggerService
      );

      mockWriteClient.$connect.mockResolvedValue(undefined);
      mockReadClient.$connect.mockResolvedValue(undefined);
      mockWriteClient.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockReadClient.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      await service.onModuleInit(); // Initialize connections

      // Act
      const result = await service.isHealthy();

      // Assert
      expect(result).toEqual({
        write: true,
        read: true,
        isConnected: true,
      });
      expect(mockWriteClient.$queryRaw).toHaveBeenCalled();
      expect(mockReadClient.$queryRaw).toHaveBeenCalled();
    });
  });

  describe('executeTransaction', () => {
    beforeEach(() => {
      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'DATABASE_URL') return mockDatabaseUrl;
          if (key === 'READ_DATABASE_URL') return undefined;
          if (key === 'NODE_ENV') return 'development';
          return undefined;
        }),
      };

      const mockLogger = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
        logWithLevel: jest.fn(),
        logHttpRequest: jest.fn(),
        logDatabaseQuery: jest.fn(),
        logBusinessEvent: jest.fn(),
      };

      service = new PrismaService(
        mockConfigService as unknown as ConfigService,
        mockLogger as unknown as CustomLoggerService
      );
      logger = mockLogger as unknown as jest.Mocked<CustomLoggerService>;
    });

    it('should execute transaction successfully', async () => {
      // Arrange
      const mockCallback = jest.fn().mockResolvedValue('result');
      mockWriteClient.$transaction.mockResolvedValue('result');

      // Act
      const result = await service.executeTransaction(mockCallback);

      // Assert
      expect(result).toBe('result');
      expect(mockWriteClient.$transaction).toHaveBeenCalled();
    });

    it('should retry transaction on retryable errors', async () => {
      // Arrange
      const mockCallback = jest.fn();
      const retryableError = new Error('deadlock detected');
      const successResult = 'result';

      mockWriteClient.$transaction
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce(successResult);

      // Act
      const result = await service.executeTransaction(mockCallback);

      // Assert
      expect(result).toBe(successResult);
      expect(mockWriteClient.$transaction).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Transaction attempt 1/3 failed')
      );
    });

    it('should not retry on non-retryable errors', async () => {
      // Arrange
      const mockCallback = jest.fn();
      const nonRetryableError = new Error('Validation failed');

      mockWriteClient.$transaction.mockRejectedValue(nonRetryableError);

      // Act & Assert
      await expect(service.executeTransaction(mockCallback)).rejects.toThrow('Validation failed');
      expect(mockWriteClient.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should use custom transaction options', async () => {
      // Arrange
      const mockCallback = jest.fn().mockResolvedValue('result');
      const options = {
        maxWait: 10000,
        timeout: 20000,
        isolationLevel: 'ReadCommitted' as const,
      };

      mockWriteClient.$transaction.mockResolvedValue('result');

      // Act
      await service.executeTransaction(mockCallback, options);

      // Assert
      expect(mockWriteClient.$transaction).toHaveBeenCalledWith(mockCallback, {
        maxWait: 10000,
        timeout: 20000,
        isolationLevel: 'ReadCommitted',
      });
    });

    it('should throw error after max retries', async () => {
      // Arrange
      const mockCallback = jest.fn();
      const retryableError = new Error('connection timeout');

      mockWriteClient.$transaction.mockRejectedValue(retryableError);

      // Act & Assert
      await expect(service.executeTransaction(mockCallback)).rejects.toThrow('connection timeout');
      expect(mockWriteClient.$transaction).toHaveBeenCalledTimes(3);
    });
  });

  describe('executeRaw', () => {
    beforeEach(() => {
      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'DATABASE_URL') return mockDatabaseUrl;
          if (key === 'READ_DATABASE_URL') return undefined;
          if (key === 'NODE_ENV') return 'development';
          return undefined;
        }),
      };

      const mockLogger = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
        logWithLevel: jest.fn(),
        logHttpRequest: jest.fn(),
        logDatabaseQuery: jest.fn(),
        logBusinessEvent: jest.fn(),
      };

      service = new PrismaService(
        mockConfigService as unknown as ConfigService,
        mockLogger as unknown as CustomLoggerService
      );
      logger = mockLogger as unknown as jest.Mocked<CustomLoggerService>;
    });

    it('should execute raw query successfully', async () => {
      // Arrange
      const query = 'SELECT * FROM users WHERE id = $1';
      const values = ['user-123'];
      const expectedResult = [{ id: 'user-123', name: 'Test User' }];

      mockWriteClient.$queryRawUnsafe.mockResolvedValue(expectedResult);

      // Act
      const result = await service.executeRaw(query, ...values);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockWriteClient.$queryRawUnsafe).toHaveBeenCalledWith(query, ...values);
    });

    it('should handle raw query errors', async () => {
      // Arrange
      const query = 'SELECT * FROM invalid_table';
      const error = new Error('Table does not exist');

      mockWriteClient.$queryRawUnsafe.mockRejectedValue(error);

      // Act & Assert
      await expect(service.executeRaw(query)).rejects.toThrow('Table does not exist');
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Raw query execution failed')
      );
    });
  });

  describe('cleanDatabase', () => {
    beforeEach(() => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'DATABASE_URL') return mockDatabaseUrl;
          if (key === 'READ_DATABASE_URL') return undefined;
          if (key === 'NODE_ENV') return 'test';
          return undefined;
        }),
      };

      const mockLogger = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
        logWithLevel: jest.fn(),
        logHttpRequest: jest.fn(),
        logDatabaseQuery: jest.fn(),
        logBusinessEvent: jest.fn(),
      };

      service = new PrismaService(
        mockConfigService as unknown as ConfigService,
        mockLogger as unknown as CustomLoggerService
      );
      logger = mockLogger as unknown as jest.Mocked<CustomLoggerService>;

      // Restore original env
      process.env.NODE_ENV = originalEnv;
    });

    it('should throw error in production environment', async () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // Act & Assert
      await expect(service.cleanDatabase()).rejects.toThrow('Cannot clean database in production');

      // Restore
      process.env.NODE_ENV = originalEnv;
    });

    it('should clean database in non-production environment', async () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      const mockModel = {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      };

      // Mock PrismaClient to have model-like properties
      Object.defineProperty(mockWriteClient, 'user', {
        value: mockModel,
        writable: true,
        configurable: true,
      });

      Object.defineProperty(mockWriteClient, 'inquiry', {
        value: mockModel,
        writable: true,
        configurable: true,
      });

      // Act
      await service.cleanDatabase();

      // Assert
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Cleaning'));

      // Restore
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Connection String Building', () => {
    it('should include connection pooling parameters', () => {
      // Arrange
      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'DATABASE_URL') return mockDatabaseUrl;
          if (key === 'READ_DATABASE_URL') return undefined;
          if (key === 'NODE_ENV') return 'development';
          return undefined;
        }),
      };

      const mockLogger = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
        logWithLevel: jest.fn(),
        logHttpRequest: jest.fn(),
        logDatabaseQuery: jest.fn(),
        logBusinessEvent: jest.fn(),
      };

      // Act
      service = new PrismaService(
        mockConfigService as unknown as ConfigService,
        mockLogger as unknown as CustomLoggerService
      );

      // Assert
      expect(PrismaClient).toHaveBeenCalled();
      const callArgs = (PrismaClient as jest.MockedClass<typeof PrismaClient>).mock.calls[0][0];
      // @ts-expect-error Prisma 7 uses adapter instead of datasources
      const url = callArgs?.datasources?.db?.url as string;
      expect(url).toContain('connection_limit');
      expect(url).toContain('prepared_statements=true');
      expect(url).toContain('statement_cache_size');
    });

    it('should use different pool sizes for write and read', () => {
      // Arrange
      const mockConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'DATABASE_URL') return mockDatabaseUrl;
          if (key === 'READ_DATABASE_URL') return mockReadDatabaseUrl;
          if (key === 'NODE_ENV') return 'development';
          return undefined;
        }),
      };

      const mockLogger = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
        logWithLevel: jest.fn(),
        logHttpRequest: jest.fn(),
        logDatabaseQuery: jest.fn(),
        logBusinessEvent: jest.fn(),
      };

      // Act
      service = new PrismaService(
        mockConfigService as unknown as ConfigService,
        mockLogger as unknown as CustomLoggerService
      );

      // Assert
      expect(PrismaClient).toHaveBeenCalledTimes(2);
      const writeCallArgs = (PrismaClient as jest.MockedClass<typeof PrismaClient>).mock
        .calls[0][0];
      const readCallArgs = (PrismaClient as jest.MockedClass<typeof PrismaClient>).mock.calls[1][0];

      // @ts-expect-error Prisma 7 uses adapter instead of datasources
      const writeUrl = writeCallArgs?.datasources?.db?.url as string;
      // @ts-expect-error Prisma 7 uses adapter instead of datasources
      const readUrl = readCallArgs?.datasources?.db?.url as string;

      expect(writeUrl).toContain('connection_limit=10');
      expect(readUrl).toContain('connection_limit=5');
    });
  });
});
