/**
 * CacheService Unit Tests
 *
 * 테스트 범위:
 * - Redis 연결 (via cache-manager)
 * - 캐시 CRUD (get, set, del)
 * - TTL 관리
 * - 패턴 삭제 (delPattern)
 * - 캐시 전체 삭제 (reset)
 * - 키 생성 헬퍼 (generateKey)
 * - 에러 처리
 */

import 'reflect-metadata';

import type { Cache } from '@nestjs/cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';

import { CustomLoggerService } from '../logger/logger.service';

import { CACHE_TTL, CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;
  let cacheManager: jest.Mocked<Cache>;
  let logger: jest.Mocked<CustomLoggerService>;

  beforeEach(async () => {
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      stores: [
        {
          client: {
            keys: jest.fn(),
            flushdb: jest.fn(),
          },
        },
      ],
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    cacheManager = module.get(CACHE_MANAGER) as jest.Mocked<Cache>;
    logger = module.get(CustomLoggerService) as jest.Mocked<CustomLoggerService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have CACHE_TTL constants', () => {
      expect(CACHE_TTL.DASHBOARD_STATS).toBe(300);
      expect(CACHE_TTL.AI_ANALYSIS).toBe(3600);
      expect(CACHE_TTL.CUSTOMER_STATS).toBe(600);
      expect(CACHE_TTL.INQUIRY_STATS).toBe(300);
    });
  });

  describe('get', () => {
    it('should get value from cache successfully', async () => {
      // Arrange
      const key = 'test:key';
      const value = { id: '123', name: 'Test' };
      cacheManager.get.mockResolvedValue(value);

      // Act
      const result = await service.get(key);

      // Assert
      expect(result).toEqual(value);
      expect(cacheManager.get).toHaveBeenCalledWith(key);
      expect(logger.debug).toHaveBeenCalledWith(`Cache hit: ${key}`, 'CacheService');
    });

    it('should return undefined on cache miss', async () => {
      // Arrange
      const key = 'test:key';
      cacheManager.get.mockResolvedValue(undefined);

      // Act
      const result = await service.get(key);

      // Assert
      expect(result).toBeUndefined();
      expect(cacheManager.get).toHaveBeenCalledWith(key);
      expect(logger.debug).toHaveBeenCalledWith(`Cache miss: ${key}`, 'CacheService');
    });

    it('should return undefined and log error on cache get failure', async () => {
      // Arrange
      const key = 'test:key';
      const error = new Error('Cache connection failed');
      cacheManager.get.mockRejectedValue(error);

      // Act
      const result = await service.get(key);

      // Assert
      expect(result).toBeUndefined();
      expect(logger.error).toHaveBeenCalledWith(
        `Cache get error: ${key}`,
        'Cache connection failed',
        'CacheService'
      );
    });

    it('should handle null value', async () => {
      // Arrange
      const key = 'test:key';
      cacheManager.get.mockResolvedValue(null);

      // Act
      const result = await service.get(key);

      // Assert
      expect(result).toBeNull();
      expect(logger.debug).toHaveBeenCalledWith(`Cache miss: ${key}`, 'CacheService');
    });

    it('should handle different value types', async () => {
      // Arrange
      const testCases = [
        { key: 'string:key', value: 'string value' },
        { key: 'number:key', value: 123 },
        { key: 'boolean:key', value: true },
        { key: 'array:key', value: [1, 2, 3] },
        { key: 'object:key', value: { nested: { data: 'value' } } },
      ];

      for (const testCase of testCases) {
        cacheManager.get.mockResolvedValue(testCase.value);

        // Act
        const result = await service.get(testCase.key);

        // Assert
        expect(result).toEqual(testCase.value);
      }
    });
  });

  describe('set', () => {
    it('should set value in cache with default TTL', async () => {
      // Arrange
      const key = 'test:key';
      const value = { id: '123', name: 'Test' };
      cacheManager.set.mockResolvedValue(undefined);

      // Act
      await service.set(key, value);

      // Assert
      expect(cacheManager.set).toHaveBeenCalledWith(key, value, undefined);
      expect(logger.debug).toHaveBeenCalledWith(
        `Cache set: ${key} (TTL: defaults)`,
        'CacheService'
      );
    });

    it('should set value in cache with custom TTL', async () => {
      // Arrange
      const key = 'test:key';
      const value = { id: '123', name: 'Test' };
      const ttl = 300; // 5 minutes
      cacheManager.set.mockResolvedValue(undefined);

      // Act
      await service.set(key, value, ttl);

      // Assert
      expect(cacheManager.set).toHaveBeenCalledWith(key, value, 300000); // TTL in milliseconds
      expect(logger.debug).toHaveBeenCalledWith(`Cache set: ${key} (TTL: ${ttl}s)`, 'CacheService');
    });

    it('should handle set errors gracefully', async () => {
      // Arrange
      const key = 'test:key';
      const value = { id: '123' };
      const error = new Error('Cache set failed');
      cacheManager.set.mockRejectedValue(error);

      // Act
      await service.set(key, value);

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        `Cache set error: ${key}`,
        'Cache set failed',
        'CacheService'
      );
    });

    it('should set different value types', async () => {
      // Arrange
      const testCases = [
        { key: 'string:key', value: 'string value' },
        { key: 'number:key', value: 123 },
        { key: 'boolean:key', value: true },
        { key: 'array:key', value: [1, 2, 3] },
        { key: 'object:key', value: { nested: { data: 'value' } } },
      ];

      cacheManager.set.mockResolvedValue(undefined);

      for (const testCase of testCases) {
        // Act
        await service.set(testCase.key, testCase.value);

        // Assert
        expect(cacheManager.set).toHaveBeenCalledWith(testCase.key, testCase.value, undefined);
      }
    });

    it('should convert TTL from seconds to milliseconds', async () => {
      // Arrange
      const key = 'test:key';
      const value = 'test value';
      const ttlSeconds = 60;
      cacheManager.set.mockResolvedValue(undefined);

      // Act
      await service.set(key, value, ttlSeconds);

      // Assert
      expect(cacheManager.set).toHaveBeenCalledWith(key, value, 60000); // 60 seconds = 60000 ms
    });
  });

  describe('del', () => {
    it('should delete key from cache successfully', async () => {
      // Arrange
      const key = 'test:key';
      cacheManager.del.mockResolvedValue(true);

      // Act
      await service.del(key);

      // Assert
      expect(cacheManager.del).toHaveBeenCalledWith(key);
      expect(logger.debug).toHaveBeenCalledWith(`Cache deleted: ${key}`, 'CacheService');
    });

    it('should handle delete errors gracefully', async () => {
      // Arrange
      const key = 'test:key';
      const error = new Error('Cache delete failed');
      cacheManager.del.mockRejectedValue(error);

      // Act
      await service.del(key);

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        `Cache delete error: ${key}`,
        'Cache delete failed',
        'CacheService'
      );
    });

    it('should delete multiple keys', async () => {
      // Arrange
      const keys = ['key1', 'key2', 'key3'];
      cacheManager.del.mockResolvedValue(true);

      // Act
      await Promise.all(keys.map(key => service.del(key)));

      // Assert
      expect(cacheManager.del).toHaveBeenCalledTimes(3);
      keys.forEach(key => {
        expect(cacheManager.del).toHaveBeenCalledWith(key);
      });
    });
  });

  describe('delPattern', () => {
    it('should delete keys matching pattern', async () => {
      // Arrange
      const pattern = 'business:123:*';
      const matchingKeys = ['business:123:inquiry1', 'business:123:inquiry2', 'business:123:stats'];
      const stores = (cacheManager as { stores?: Array<{ client?: { keys?: jest.Mock } }> }).stores;
      if (stores && stores[0]?.client?.keys) {
        stores[0].client.keys.mockResolvedValue(matchingKeys);
      }
      cacheManager.del.mockResolvedValue(true);

      // Act
      await service.delPattern(pattern);

      // Assert
      if (stores && stores[0]?.client?.keys) {
        expect(stores[0].client.keys).toHaveBeenCalledWith(pattern);
      }
      expect(cacheManager.del).toHaveBeenCalledTimes(matchingKeys.length);
      matchingKeys.forEach(key => {
        expect(cacheManager.del).toHaveBeenCalledWith(key);
      });
      expect(logger.debug).toHaveBeenCalledWith(
        `Cache deleted pattern: ${pattern} (${matchingKeys.length} keys)`,
        'CacheService'
      );
    });

    it('should handle empty pattern match result', async () => {
      // Arrange
      const pattern = 'business:999:*';
      const stores = (cacheManager as { stores?: Array<{ client?: { keys?: jest.Mock } }> }).stores;
      if (stores && stores[0]?.client?.keys) {
        stores[0].client.keys.mockResolvedValue([]);
      }

      // Act
      await service.delPattern(pattern);

      // Assert
      expect(cacheManager.del).not.toHaveBeenCalled();
      expect(logger.debug).not.toHaveBeenCalledWith(
        expect.stringContaining('Cache deleted pattern'),
        'CacheService'
      );
    });

    it('should handle delPattern errors gracefully', async () => {
      // Arrange
      const pattern = 'business:123:*';
      const error = new Error('Pattern delete failed');
      const stores = (cacheManager as { stores?: Array<{ client?: { keys?: jest.Mock } }> }).stores;
      if (stores && stores[0]?.client?.keys) {
        stores[0].client.keys.mockRejectedValue(error);
      }

      // Act
      await service.delPattern(pattern);

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        `Cache delete pattern error: ${pattern}`,
        'Pattern delete failed',
        'CacheService'
      );
    });

    it('should handle missing client.keys method', async () => {
      // Arrange
      const pattern = 'business:123:*';
      const stores = (cacheManager as { stores?: Array<{ client?: { keys?: jest.Mock } }> }).stores;
      if (stores && stores[0]?.client) {
        delete stores[0].client.keys;
      }

      // Act
      await service.delPattern(pattern);

      // Assert
      expect(cacheManager.del).not.toHaveBeenCalled();
    });

    it('should handle missing stores', async () => {
      // Arrange
      const pattern = 'business:123:*';
      (cacheManager as { stores?: Array<unknown> }).stores = undefined;

      // Act
      await service.delPattern(pattern);

      // Assert
      expect(cacheManager.del).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should reset entire cache successfully', async () => {
      // Arrange
      const stores = (
        cacheManager as {
          stores?: Array<{ client?: { flushdb?: jest.Mock } }>;
        }
      ).stores;
      if (stores && stores[0]?.client?.flushdb) {
        stores[0].client.flushdb.mockResolvedValue(undefined);
      }

      // Act
      await service.reset();

      // Assert
      if (stores && stores[0]?.client?.flushdb) {
        expect(stores[0].client.flushdb).toHaveBeenCalled();
      }
      expect(logger.log).toHaveBeenCalledWith('Cache reset complete', 'CacheService');
    });

    it('should handle reset errors gracefully', async () => {
      // Arrange
      const error = new Error('Cache reset failed');
      const stores = (
        cacheManager as {
          stores?: Array<{ client?: { flushdb?: jest.Mock } }>;
        }
      ).stores;
      if (stores && stores[0]?.client?.flushdb) {
        stores[0].client.flushdb.mockRejectedValue(error);
      }

      // Act
      await service.reset();

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        'Cache reset error',
        'Cache reset failed',
        'CacheService'
      );
    });

    it('should handle missing client.flushdb method', async () => {
      // Arrange
      const stores = (
        cacheManager as {
          stores?: Array<{ client?: { flushdb?: jest.Mock } }>;
        }
      ).stores;
      if (stores && stores[0]?.client) {
        delete stores[0].client.flushdb;
      }

      // Act
      await service.reset();

      // Assert
      expect(logger.log).not.toHaveBeenCalledWith('Cache reset complete', 'CacheService');
    });

    it('should handle missing stores', async () => {
      // Arrange
      (cacheManager as { stores?: Array<unknown> }).stores = undefined;

      // Act
      await service.reset();

      // Assert
      expect(logger.log).not.toHaveBeenCalledWith('Cache reset complete', 'CacheService');
    });
  });

  describe('generateKey', () => {
    it('should generate key with prefix and parts', () => {
      // Arrange
      const prefix = 'business';
      const parts = ['123', 'inquiry', 'stats'];

      // Act
      const key = service.generateKey(prefix, ...parts);

      // Assert
      expect(key).toBe('business:123:inquiry:stats');
    });

    it('should generate key with single part', () => {
      // Arrange
      const prefix = 'user';
      const part = '123';

      // Act
      const key = service.generateKey(prefix, part);

      // Assert
      expect(key).toBe('user:123');
    });

    it('should generate key with only prefix', () => {
      // Arrange
      const prefix = 'cache';

      // Act
      const key = service.generateKey(prefix);

      // Assert
      expect(key).toBe('cache');
    });

    it('should handle numeric parts', () => {
      // Arrange
      const prefix = 'stats';
      const parts = [123, 456, 789];

      // Act
      const key = service.generateKey(prefix, ...parts);

      // Assert
      expect(key).toBe('stats:123:456:789');
    });

    it('should handle mixed string and number parts', () => {
      // Arrange
      const prefix = 'business';
      const parts = ['123', 456, 'inquiry', 789];

      // Act
      const key = service.generateKey(prefix, ...parts);

      // Assert
      expect(key).toBe('business:123:456:inquiry:789');
    });

    it('should handle empty parts array', () => {
      // Arrange
      const prefix = 'test';

      // Act
      const key = service.generateKey(prefix);

      // Assert
      expect(key).toBe('test');
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown error types in get', async () => {
      // Arrange
      const key = 'test:key';
      cacheManager.get.mockRejectedValue('Unknown error');

      // Act
      const result = await service.get(key);

      // Assert
      expect(result).toBeUndefined();
      expect(logger.error).toHaveBeenCalledWith(
        `Cache get error: ${key}`,
        'Unknown error',
        'CacheService'
      );
    });

    it('should handle unknown error types in set', async () => {
      // Arrange
      const key = 'test:key';
      const value = 'test';
      cacheManager.set.mockRejectedValue('Unknown error');

      // Act
      await service.set(key, value);

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        `Cache set error: ${key}`,
        'Unknown error',
        'CacheService'
      );
    });

    it('should handle unknown error types in del', async () => {
      // Arrange
      const key = 'test:key';
      cacheManager.del.mockRejectedValue('Unknown error');

      // Act
      await service.del(key);

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        `Cache delete error: ${key}`,
        'Unknown error',
        'CacheService'
      );
    });
  });

  describe('Integration with CACHE_TTL', () => {
    it('should use CACHE_TTL constants for set operations', async () => {
      // Arrange
      const key = 'dashboard:stats';
      const value = { total: 100 };
      cacheManager.set.mockResolvedValue(undefined);

      // Act
      await service.set(key, value, CACHE_TTL.DASHBOARD_STATS);

      // Assert
      expect(cacheManager.set).toHaveBeenCalledWith(key, value, CACHE_TTL.DASHBOARD_STATS * 1000);
    });

    it('should use different TTL constants for different cache types', async () => {
      // Arrange
      cacheManager.set.mockResolvedValue(undefined);

      // Act
      await service.set('ai:analysis:123', { result: 'test' }, CACHE_TTL.AI_ANALYSIS);
      await service.set('customer:stats:123', { count: 10 }, CACHE_TTL.CUSTOMER_STATS);
      await service.set('inquiry:stats:123', { total: 5 }, CACHE_TTL.INQUIRY_STATS);

      // Assert
      expect(cacheManager.set).toHaveBeenCalledWith(
        'ai:analysis:123',
        { result: 'test' },
        CACHE_TTL.AI_ANALYSIS * 1000
      );
      expect(cacheManager.set).toHaveBeenCalledWith(
        'customer:stats:123',
        { count: 10 },
        CACHE_TTL.CUSTOMER_STATS * 1000
      );
      expect(cacheManager.set).toHaveBeenCalledWith(
        'inquiry:stats:123',
        { total: 5 },
        CACHE_TTL.INQUIRY_STATS * 1000
      );
    });
  });
});
