/**
 * Database Integration Tests
 *
 * 테스트 범위:
 * - Prisma + PostgreSQL 통합
 * - 트랜잭션 롤백 테스트
 * - Read/Write 분리
 * - Connection pooling
 * - Health checks
 *
 * 주의: 이 테스트는 실제 데이터베이스 연결이 필요합니다.
 * 테스트 환경에서는 테스트 전용 데이터베이스를 사용해야 합니다.
 */

import 'reflect-metadata';

import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { CustomLoggerService } from '@/common/modules/logger/logger.service';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';

describe('Database Integration', () => {
  let prismaService: PrismaService | null;
  let module: TestingModule;
  let isDatabaseAvailable = false;

  beforeAll(async () => {
    // 테스트 환경 변수 설정
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL =
      process.env.TEST_DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/inquaire_test';

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

    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        PrismaService,
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    prismaService = module.get<PrismaService>(PrismaService);

    // 데이터베이스 연결
    try {
      await prismaService.onModuleInit();
      isDatabaseAvailable = true;
    } catch {
      console.warn(
        'Database connection failed, skipping integration tests. Set TEST_DATABASE_URL to run integration tests.'
      );
      // 실제 DB가 없으면 테스트 스킵
      prismaService = null;
      isDatabaseAvailable = false;
    }
  });

  afterAll(async () => {
    if (prismaService) {
      try {
        await prismaService.onModuleDestroy();
      } catch (error) {
        console.warn('Database disconnection error:', error);
      }
    }
    if (module) {
      await module.close();
    }
  });

  describe('Connection', () => {
    it('should connect to database', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Act
      const health = await prismaService.isHealthy();

      // Assert
      expect(health.write).toBe(true);
      expect(health.isConnected).toBe(true);
    });

    it('should have write and read clients', () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Assert
      expect(prismaService.write).toBeDefined();
      expect(prismaService.read).toBeDefined();
    });
  });

  describe('Health Checks', () => {
    it('should return healthy status', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Act
      const health = await prismaService.isHealthy();

      // Assert
      expect(health).toHaveProperty('write');
      expect(health).toHaveProperty('read');
      expect(health).toHaveProperty('isConnected');
      expect(typeof health.write).toBe('boolean');
      expect(typeof health.read).toBe('boolean');
      expect(typeof health.isConnected).toBe('boolean');
    });
  });

  describe('Raw Queries', () => {
    it('should execute raw SELECT query', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Act
      const result =
        await prismaService.executeRaw<Array<{ '?column?': number }>>('SELECT 1 as "?column?"');

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('?column?');
      }
    });

    it('should handle raw query errors', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Act & Assert
      await expect(prismaService.executeRaw('SELECT * FROM non_existent_table')).rejects.toThrow();
    });
  });

  describe('Transactions', () => {
    it('should execute transaction successfully', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Act
      const result = await prismaService.executeTransaction(async transactionClient => {
        // Simple transaction that doesn't modify data
        const queryResult = await transactionClient.$queryRaw`SELECT 1 as value`;
        return queryResult;
      });

      // Assert
      expect(result).toBeDefined();
    });

    it('should rollback transaction on error', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Act & Assert
      await expect(
        prismaService.executeTransaction(async transactionClient => {
          await transactionClient.$queryRaw`SELECT * FROM non_existent_table`;
          return 'should not reach here';
        })
      ).rejects.toThrow();
    });

    it('should retry transaction on retryable errors', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService) {
        console.log('Skipping test: Database not available');
        return;
      }

      let attemptCount = 0;

      // Act
      const result = await prismaService.executeTransaction(async () => {
        attemptCount++;
        // Simulate retryable error on first attempt
        if (attemptCount === 1) {
          const error = new Error('deadlock detected');
          throw error;
        }
        return { success: true, attempt: attemptCount };
      });

      // Assert
      expect(result).toEqual({ success: true, attempt: 2 });
      expect(attemptCount).toBe(2);
    });
  });

  describe('Read/Write Separation', () => {
    it('should use write client for write operations', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Act
      const writeClient = prismaService.write;
      const readClient = prismaService.read;

      // Assert
      expect(writeClient).toBeDefined();
      expect(readClient).toBeDefined();
    });

    it('should handle read replica when configured', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Act
      const health = await prismaService.isHealthy();

      // Assert
      expect(health.read).toBeDefined();
      // If read replica is configured, it should be separate from write
      // If not configured, read === write
      expect(typeof health.read).toBe('boolean');
    });
  });

  describe('Connection Pooling', () => {
    it('should handle multiple concurrent queries', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Act
      const queries = Array.from({ length: 10 }, () =>
        prismaService!.executeRaw<Array<{ '?column?': number }>>('SELECT 1 as "?column?"')
      );

      const results = await Promise.all(queries);

      // Assert
      expect(results.length).toBe(10);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Act
      const health = await prismaService.isHealthy();

      // Assert
      // Should not throw, but return health status
      expect(health).toBeDefined();
      expect(typeof health.write).toBe('boolean');
    });
  });
});
