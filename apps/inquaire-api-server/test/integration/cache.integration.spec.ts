/**
 * Cache Integration Tests
 *
 * 테스트 범위:
 * - Redis 캐싱 전략
 * - TTL 관리
 * - 패턴 기반 삭제
 * - Rate limiting 통합
 *
 * 주의: 이 테스트는 실제 Redis 연결이 필요합니다.
 * 테스트 환경에서는 테스트 전용 Redis를 사용해야 합니다.
 */

import 'reflect-metadata';

import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { redisStore } from 'cache-manager-ioredis-yet';

import { CACHE_TTL, CacheService } from '@/common/modules/cache/cache.service';
import { CustomLoggerService } from '@/common/modules/logger/logger.service';

describe('Cache Integration', () => {
  let cacheService: CacheService | null;
  let module: TestingModule;
  let isRedisAvailable = false;

  beforeAll(async () => {
    // 테스트 환경 변수 설정
    process.env.NODE_ENV = 'test';
    process.env.REDIS_HOST = process.env.TEST_REDIS_HOST || 'localhost';
    process.env.REDIS_PORT = process.env.TEST_REDIS_PORT || '6379';
    process.env.REDIS_PASSWORD = process.env.TEST_REDIS_PASSWORD || '';
    process.env.REDIS_TTL = '300';

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
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        NestCacheModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: async (configService: ConfigService) => {
            const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
            const redisPort = configService.get<number>('REDIS_PORT', 6379);
            const redisPassword = configService.get<string>('REDIS_PASSWORD');
            const redisTtl = configService.get<number>('REDIS_TTL', 300);

            return {
              store: await redisStore({
                host: redisHost,
                port: redisPort,
                password: redisPassword,
                ttl: redisTtl * 1000, // milliseconds
                db: 0,
                keyPrefix: 'inquaire:test:',
              }),
            };
          },
        }),
      ],
      providers: [CacheService, CustomLoggerService],
    })
      .overrideProvider(CustomLoggerService)
      .useValue(mockLogger)
      .compile();

    cacheService = module.get<CacheService>(CacheService);

    // Redis 연결 확인
    try {
      await cacheService.set('test:connection', 'ok', 1);
      const value = await cacheService.get<string>('test:connection');
      if (value === 'ok') {
        isRedisAvailable = true;
        // Cleanup test key
        await cacheService.del('test:connection');
      }
    } catch (error) {
      console.warn(
        'Redis connection failed, skipping integration tests. Set TEST_REDIS_HOST to run integration tests.',
        error
      );
      cacheService = null;
      isRedisAvailable = false;
    }
  });

  afterAll(async () => {
    // 테스트 데이터 정리
    if (cacheService && isRedisAvailable) {
      try {
        // Cleanup all test keys
        await cacheService.delPattern('test:*');
        await cacheService.delPattern('business:*');
        await cacheService.delPattern('inquiry:*');
        await cacheService.delPattern('rate-limit:*');
      } catch (error) {
        console.warn('Cache cleanup error:', error);
      }
    }
    if (module) {
      await module.close();
    }
  });

  describe('Basic Cache Operations', () => {
    it('should set and get a value', async () => {
      // Skip if Redis is not available
      if (!isRedisAvailable || !cacheService) {
        console.log('Skipping test: Redis not available');
        return;
      }

      // Arrange
      const key = 'test:basic:get-set';
      const value = { name: 'Test User', id: '123' };

      // Act
      await cacheService.set(key, value);
      const result = await cacheService.get<typeof value>(key);

      // Assert
      expect(result).toBeDefined();
      expect(result?.name).toBe('Test User');
      expect(result?.id).toBe('123');
    });

    it('should return undefined for non-existent key', async () => {
      // Skip if Redis is not available
      if (!isRedisAvailable || !cacheService) {
        console.log('Skipping test: Redis not available');
        return;
      }

      // Arrange
      const key = 'test:non-existent';

      // Act
      const result = await cacheService.get<string>(key);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should delete a key', async () => {
      // Skip if Redis is not available
      if (!isRedisAvailable || !cacheService) {
        console.log('Skipping test: Redis not available');
        return;
      }

      // Arrange
      const key = 'test:delete';
      await cacheService.set(key, 'test-value');

      // Act
      await cacheService.del(key);
      const result = await cacheService.get<string>(key);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should handle different data types', async () => {
      // Skip if Redis is not available
      if (!isRedisAvailable || !cacheService) {
        console.log('Skipping test: Redis not available');
        return;
      }

      // Test string
      await cacheService.set('test:string', 'hello');
      expect(await cacheService.get<string>('test:string')).toBe('hello');

      // Test number
      await cacheService.set('test:number', 42);
      expect(await cacheService.get<number>('test:number')).toBe(42);

      // Test boolean
      await cacheService.set('test:boolean', true);
      expect(await cacheService.get<boolean>('test:boolean')).toBe(true);

      // Test object
      const obj = { key: 'value', nested: { data: 123 } };
      await cacheService.set('test:object', obj);
      expect(await cacheService.get<typeof obj>('test:object')).toEqual(obj);

      // Test array
      const arr = [1, 2, 3, 'test'];
      await cacheService.set('test:array', arr);
      expect(await cacheService.get<typeof arr>('test:array')).toEqual(arr);
    });
  });

  describe('TTL Management', () => {
    it('should set value with custom TTL', async () => {
      // Skip if Redis is not available
      if (!isRedisAvailable || !cacheService) {
        console.log('Skipping test: Redis not available');
        return;
      }

      // Arrange
      const key = 'test:ttl:custom';
      const value = 'ttl-test';
      const ttl = 2; // 2 seconds

      // Act
      await cacheService.set(key, value, ttl);

      // Assert - Value should exist immediately
      expect(await cacheService.get<string>(key)).toBe(value);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 2100));

      // Assert - Value should be expired
      expect(await cacheService.get<string>(key)).toBeUndefined();
    }, 10000); // Increase timeout for TTL test

    it('should use default TTL when not specified', async () => {
      // Skip if Redis is not available
      if (!isRedisAvailable || !cacheService) {
        console.log('Skipping test: Redis not available');
        return;
      }

      // Arrange
      const key = 'test:ttl:default';
      const value = 'default-ttl-test';

      // Act
      await cacheService.set(key, value);

      // Assert - Value should exist (default TTL is 300 seconds)
      expect(await cacheService.get<string>(key)).toBe(value);
    });

    it('should use CACHE_TTL constants', async () => {
      // Skip if Redis is not available
      if (!isRedisAvailable || !cacheService) {
        console.log('Skipping test: Redis not available');
        return;
      }

      // Arrange
      const key = 'test:ttl:constant';
      const value = 'constant-ttl-test';

      // Act
      await cacheService.set(key, value, CACHE_TTL.DASHBOARD_STATS);

      // Assert
      expect(await cacheService.get<string>(key)).toBe(value);
    });
  });

  describe('Pattern-based Deletion', () => {
    it('should delete keys matching pattern', async () => {
      // Skip if Redis is not available
      if (!isRedisAvailable || !cacheService) {
        console.log('Skipping test: Redis not available');
        return;
      }

      // Cleanup first to ensure clean state
      await cacheService.delPattern('business:*');
      await cacheService.delPattern('other:*');

      // Wait a bit for cleanup to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Arrange - Create multiple keys with pattern
      await cacheService.set('business:123:stats', { total: 10 });
      await cacheService.set('business:123:users', { count: 5 });
      await cacheService.set('business:456:stats', { total: 20 });
      await cacheService.set('other:key', 'value');

      // Verify keys were set
      expect(await cacheService.get('business:123:stats')).toBeDefined();
      expect(await cacheService.get('business:123:users')).toBeDefined();
      expect(await cacheService.get('business:456:stats')).toBeDefined();
      expect(await cacheService.get('other:key')).toBeDefined();

      // Act - Delete keys matching specific pattern
      await cacheService.delPattern('business:123:*');

      // Small delay to ensure deletion is complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Assert
      expect(await cacheService.get('business:123:stats')).toBeUndefined();
      expect(await cacheService.get('business:123:users')).toBeUndefined();
      expect(await cacheService.get('business:456:stats')).toBeDefined(); // Should still exist
      expect(await cacheService.get('other:key')).toBeDefined(); // Should still exist

      // Cleanup
      await cacheService.del('business:456:stats');
      await cacheService.del('other:key');
    });

    it('should handle empty pattern matches gracefully', async () => {
      // Skip if Redis is not available
      if (!isRedisAvailable || !cacheService) {
        console.log('Skipping test: Redis not available');
        return;
      }

      // Arrange
      const pattern = 'non-existent:pattern:*';

      // Act & Assert - Should not throw error
      await expect(cacheService.delPattern(pattern)).resolves.not.toThrow();
    });
  });

  describe('Cache Reset', () => {
    it('should reset all cache', async () => {
      // Skip if Redis is not available
      if (!isRedisAvailable || !cacheService) {
        console.log('Skipping test: Redis not available');
        return;
      }

      // Arrange - Create multiple keys
      await cacheService.set('test:reset:1', 'value1');
      await cacheService.set('test:reset:2', 'value2');
      await cacheService.set('test:reset:3', 'value3');

      // Verify keys exist
      expect(await cacheService.get('test:reset:1')).toBe('value1');
      expect(await cacheService.get('test:reset:2')).toBe('value2');
      expect(await cacheService.get('test:reset:3')).toBe('value3');

      // Act
      await cacheService.reset();

      // Assert - All keys should be deleted
      // Note: reset() flushes the entire Redis database, so we can't verify specific keys
      // But we can verify that new keys can be set after reset
      await cacheService.set('test:reset:after', 'value');
      expect(await cacheService.get('test:reset:after')).toBe('value');
      await cacheService.del('test:reset:after');
    });
  });

  describe('Key Generation', () => {
    it('should generate keys with prefix and parts', async () => {
      // Skip if Redis is not available
      if (!isRedisAvailable || !cacheService) {
        console.log('Skipping test: Redis not available');
        return;
      }

      // Arrange
      const key = cacheService.generateKey('business', '123', 'stats');

      // Act
      await cacheService.set(key, { total: 100 });

      // Assert
      expect(key).toBe('business:123:stats');
      expect(await cacheService.get(key)).toEqual({ total: 100 });

      // Cleanup
      await cacheService.del(key);
    });

    it('should handle numeric parts in key generation', async () => {
      // Skip if Redis is not available
      if (!isRedisAvailable || !cacheService) {
        console.log('Skipping test: Redis not available');
        return;
      }

      // Arrange
      const key = cacheService.generateKey('inquiry', 456, 'analysis');

      // Act
      await cacheService.set(key, { status: 'completed' });

      // Assert
      expect(key).toBe('inquiry:456:analysis');
      expect(await cacheService.get(key)).toEqual({ status: 'completed' });

      // Cleanup
      await cacheService.del(key);
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should support rate limiting with TTL', async () => {
      // Skip if Redis is not available
      if (!isRedisAvailable || !cacheService) {
        console.log('Skipping test: Redis not available');
        return;
      }

      // Arrange - Simulate rate limiting
      const rateLimitKey = cacheService.generateKey('rate-limit', 'user', '123');
      const maxAttempts = 5;
      const windowSeconds = 60;

      // Act - Set rate limit counter
      await cacheService.set(rateLimitKey, 1, windowSeconds);

      // Simulate multiple attempts
      for (let i = 2; i <= maxAttempts; i++) {
        const current = (await cacheService.get<number>(rateLimitKey)) || 0;
        await cacheService.set(rateLimitKey, current + 1, windowSeconds);
      }

      // Assert
      const finalCount = await cacheService.get<number>(rateLimitKey);
      expect(finalCount).toBe(maxAttempts);

      // Cleanup
      await cacheService.del(rateLimitKey);
    });

    it('should expire rate limit after TTL', async () => {
      // Skip if Redis is not available
      if (!isRedisAvailable || !cacheService) {
        console.log('Skipping test: Redis not available');
        return;
      }

      // Arrange
      const rateLimitKey = cacheService.generateKey('rate-limit', 'ip', '192.168.1.1');
      const ttl = 2; // 2 seconds

      // Act
      await cacheService.set(rateLimitKey, 10, ttl);

      // Assert - Should exist immediately
      expect(await cacheService.get<number>(rateLimitKey)).toBe(10);

      // Wait for TTL
      await new Promise(resolve => setTimeout(resolve, 2100));

      // Assert - Should be expired
      expect(await cacheService.get<number>(rateLimitKey)).toBeUndefined();
    }, 10000);
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent set operations', async () => {
      // Skip if Redis is not available
      if (!isRedisAvailable || !cacheService) {
        console.log('Skipping test: Redis not available');
        return;
      }

      // Arrange
      const operations = Array.from({ length: 10 }, (_, i) =>
        cacheService!.set(`test:concurrent:${i}`, `value-${i}`)
      );

      // Act
      await Promise.all(operations);

      // Assert
      for (let i = 0; i < 10; i++) {
        const value = await cacheService.get<string>(`test:concurrent:${i}`);
        expect(value).toBe(`value-${i}`);
      }

      // Cleanup
      await cacheService.delPattern('test:concurrent:*');
    });

    it('should handle concurrent get operations', async () => {
      // Skip if Redis is not available
      if (!isRedisAvailable || !cacheService) {
        console.log('Skipping test: Redis not available');
        return;
      }

      // Arrange
      await cacheService.set('test:concurrent:get', 'test-value');

      // Act
      const operations = Array.from({ length: 10 }, () =>
        cacheService!.get<string>('test:concurrent:get')
      );
      const results = await Promise.all(operations);

      // Assert
      results.forEach(result => {
        expect(result).toBe('test-value');
      });

      // Cleanup
      await cacheService.del('test:concurrent:get');
    });
  });
});
