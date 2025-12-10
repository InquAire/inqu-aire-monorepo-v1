import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';

import { CustomLoggerService } from '@/common/modules/logger/logger.service';

/**
 * Extended Cache interface with internal store access
 * (for advanced operations like pattern deletion and reset)
 */
interface RedisClient {
  keys(pattern: string): Promise<string[]>;
  del(...keys: string[]): Promise<number>;
  flushdb(): Promise<string>;
  set(key: string, value: string, ...args: unknown[]): Promise<string | null>;
  exists(key: string): Promise<number>;
  eval?(script: string, numKeys: number, ...args: string[]): Promise<unknown>;
  options?: {
    keyPrefix?: string;
  };
}

/**
 * Cache store with Redis client access
 */
interface CacheStoreWithClient {
  client?: RedisClient;
  _store?: {
    client?: RedisClient;
  };
  _namespace?: string;
}

/**
 * Cache manager with internal store access
 */
interface CacheManagerWithStore {
  store?: {
    client?: RedisClient;
  };
  client?: RedisClient;
  stores?: CacheStoreWithClient[];
}

/**
 * Cache TTL 상수 (초 단위)
 */
export const CACHE_TTL = {
  SHORT: 300, // 5분
  MEDIUM: 1800, // 30분
  DASHBOARD_STATS: 300, // 5분
  AI_ANALYSIS: 3600, // 1시간
  CUSTOMER_STATS: 600, // 10분
  INQUIRY_STATS: 300, // 5분
} as const;

@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly logger: CustomLoggerService
  ) {}

  /**
   * 캐시에서 데이터 가져오기
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value) {
        this.logger.debug(`Cache hit: ${key}`, 'CacheService');
      } else {
        this.logger.debug(`Cache miss: ${key}`, 'CacheService');
      }
      return value;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Cache get error: ${key}`, errorMessage, 'CacheService');
      return undefined;
    }
  }

  /**
   * 캐시에 데이터 저장
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl ? ttl * 1000 : undefined);
      this.logger.debug(`Cache set: ${key} (TTL: ${ttl || 'default'}s)`, 'CacheService');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Cache set error: ${key}`, errorMessage, 'CacheService');
    }
  }

  /**
   * 캐시 삭제
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache deleted: ${key}`, 'CacheService');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Cache delete error: ${key}`, errorMessage, 'CacheService');
    }
  }

  /**
   * 패턴으로 캐시 삭제 (예: business:123:*)
   *
   * Note: When Redis has a keyPrefix configured, we need to:
   * 1. Search for keys using the pattern WITH the prefix (e.g., 'inquaire:test:business:123:*')
   * 2. Delete using cacheManager.del() with keys WITHOUT the prefix (e.g., 'business:123:stats')
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const cacheWithStore = this.cacheManager as unknown as CacheManagerWithStore;

      // Try to find Redis client
      let client: RedisClient | undefined;
      let keyPrefix = '';

      // Try different ways to access the Redis client
      if (cacheWithStore.store && cacheWithStore.store.client) {
        client = cacheWithStore.store.client;
        keyPrefix = client?.options?.keyPrefix || '';
      } else if (cacheWithStore.client) {
        client = cacheWithStore.client;
        keyPrefix = client?.options?.keyPrefix || '';
      } else if (cacheWithStore.stores && cacheWithStore.stores[0]?.client) {
        client = cacheWithStore.stores[0].client;
        keyPrefix = client?.options?.keyPrefix || '';
      } else if (cacheWithStore.stores && cacheWithStore.stores[0]?._store?.client) {
        client = cacheWithStore.stores[0]._store.client;
        keyPrefix = client?.options?.keyPrefix || '';
      }

      // If we found a Redis client, use KEYS command
      if (client && typeof client.keys === 'function') {
        const searchPattern = keyPrefix ? `${keyPrefix}${pattern}` : pattern;
        const fullKeys = await client.keys(searchPattern);

        if (fullKeys.length > 0) {
          for (const fullKey of fullKeys) {
            const logicalKey =
              keyPrefix && fullKey.startsWith(keyPrefix)
                ? fullKey.substring(keyPrefix.length)
                : fullKey;
            await this.cacheManager.del(logicalKey);
          }
          this.logger.debug(
            `Cache deleted pattern: ${pattern} (${fullKeys.length} keys)`,
            'CacheService'
          );
        }
        return;
      }

      // Fallback: If no Redis client (e.g., using memory store), iterate through the store
      if (cacheWithStore.stores && cacheWithStore.stores[0]?._store instanceof Map) {
        const store = cacheWithStore.stores[0]._store as Map<string, unknown>;
        const namespace = cacheWithStore.stores[0]._namespace || '';
        const prefix = namespace ? `${namespace}:` : '';

        // Convert glob pattern to regex
        const regexPattern = new RegExp(
          '^' +
            prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
            pattern.replace(/\*/g, '.*').replace(/\?/g, '.') +
            '$'
        );

        const keysToDelete: string[] = [];
        for (const [key] of store.entries()) {
          if (regexPattern.test(key)) {
            keysToDelete.push(key);
          }
        }

        if (keysToDelete.length > 0) {
          for (const key of keysToDelete) {
            // Remove the prefix to get the logical key for deletion
            const logicalKey =
              prefix && key.startsWith(prefix) ? key.substring(prefix.length) : key;
            await this.cacheManager.del(logicalKey);
          }
          this.logger.debug(
            `Cache deleted pattern: ${pattern} (${keysToDelete.length} keys)`,
            'CacheService'
          );
        }
        return;
      }

      this.logger.warn(
        'Unable to perform pattern deletion - unsupported store type',
        'CacheService'
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Cache delete pattern error: ${pattern}`, errorMessage, 'CacheService');
    }
  }

  /**
   * 캐시 전체 삭제
   */
  async reset(): Promise<void> {
    try {
      const cacheWithStore = this.cacheManager as unknown as CacheManagerWithStore;

      // Try to find Redis client for flushdb
      let client: RedisClient | undefined;

      if (cacheWithStore.store && cacheWithStore.store.client) {
        client = cacheWithStore.store.client;
      } else if (cacheWithStore.client) {
        client = cacheWithStore.client;
      } else if (cacheWithStore.stores && cacheWithStore.stores[0]?.client) {
        client = cacheWithStore.stores[0].client;
      } else if (cacheWithStore.stores && cacheWithStore.stores[0]?._store?.client) {
        client = cacheWithStore.stores[0]._store.client;
      }

      // If Redis client found, use flushdb
      if (client && typeof client.flushdb === 'function') {
        await client.flushdb();
        this.logger.log('Cache reset complete', 'CacheService');
        return;
      }

      // Fallback: If using memory store (Map), clear it
      if (cacheWithStore.stores && cacheWithStore.stores[0]?._store instanceof Map) {
        const store = cacheWithStore.stores[0]._store as Map<string, unknown>;
        store.clear();
        this.logger.log('Cache reset complete (memory store)', 'CacheService');
        return;
      }

      this.logger.warn('Unable to perform cache reset - unsupported store type', 'CacheService');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Cache reset error', errorMessage, 'CacheService');
    }
  }

  /**
   * Lock을 사용한 캐시 조회 또는 설정 (Cache Stampede 방지)
   *
   * 첫 번째 요청만 factory 함수를 실행하고, 나머지 요청은 대기 후 캐시에서 조회합니다.
   * 이를 통해 동시에 여러 요청이 들어올 때 DB 부하를 최소화합니다.
   *
   * @param key - 캐시 키
   * @param factory - 캐시 미스 시 실행할 데이터 생성 함수
   * @param ttl - TTL (초)
   * @returns 캐시된 값 또는 factory 함수의 결과
   *
   * @example
   * ```typescript
   * const stats = await this.cacheService.getOrSet(
   *   'inquiry:stats:123',
   *   async () => this.calculateStats(),
   *   CACHE_TTL.INQUIRY_STATS
   * );
   * ```
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl: number): Promise<T> {
    // 1. 캐시 조회
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    // 2. Lock 획득 시도
    const lockKey = `lock:${key}`;
    const lockValue = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const lockAcquired = await this.acquireLock(lockKey, lockValue, 10); // 10초 TTL

    if (lockAcquired) {
      try {
        // ✅ Lock 획득 성공: 캐시 재확인 (다른 요청이 이미 설정했을 수 있음)
        const cachedAfterLock = await this.get<T>(key);
        if (cachedAfterLock !== undefined) {
          return cachedAfterLock;
        }

        // Factory 함수 실행 (DB 조회 등)
        this.logger.debug(`Cache miss, executing factory: ${key}`, 'CacheService');
        const value = await factory();

        // 캐시에 저장
        await this.set(key, value, ttl);

        return value;
      } catch (error) {
        this.logger.error(
          `Factory function failed for key: ${key}`,
          error instanceof Error ? error.stack : String(error),
          'CacheService'
        );
        throw error;
      } finally {
        // Lock 해제
        await this.releaseLock(lockKey, lockValue);
      }
    } else {
      // ❌ Lock 획득 실패: 다른 요청이 이미 처리 중
      this.logger.debug(`Lock acquisition failed, waiting for cache: ${key}`, 'CacheService');

      // 캐시가 설정될 때까지 대기
      const waited = await this.waitForCache(key, 5000); // 최대 5초 대기

      if (waited) {
        const cachedAfterWait = await this.get<T>(key);
        if (cachedAfterWait !== undefined) {
          return cachedAfterWait;
        }
      }

      // 여전히 캐시 없으면 fallback: factory 실행
      this.logger.warn(`Cache wait timeout, executing factory as fallback: ${key}`, 'CacheService');
      return factory();
    }
  }

  /**
   * Redis Lock 획득
   *
   * @param lockKey - Lock 키
   * @param lockValue - Lock 값 (고유 식별자)
   * @param ttl - Lock TTL (초)
   * @returns Lock 획득 성공 여부
   */
  private async acquireLock(lockKey: string, lockValue: string, ttl: number): Promise<boolean> {
    try {
      const client = this.getRedisClient();
      if (!client) {
        // Redis를 사용하지 않는 경우 (메모리 캐시 등), Lock 기능 비활성화
        this.logger.warn('Redis client not available, lock disabled', 'CacheService');
        return true; // Lock 없이 진행
      }

      const result = await client.set(lockKey, lockValue, 'EX', ttl, 'NX');
      return result === 'OK';
    } catch (error) {
      this.logger.error(
        `Lock acquisition error: ${lockKey}`,
        error instanceof Error ? error.message : String(error),
        'CacheService'
      );
      return false;
    }
  }

  /**
   * Redis Lock 해제
   *
   * @param lockKey - Lock 키
   * @param lockValue - Lock 값 (고유 식별자, 다른 요청의 Lock을 해제하지 않기 위함)
   */
  private async releaseLock(lockKey: string, lockValue: string): Promise<void> {
    try {
      const client = this.getRedisClient();
      if (!client) {
        return;
      }

      // Lua 스크립트를 사용하여 원자적으로 Lock 해제
      // (자신이 획득한 Lock만 해제하도록 보장)
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      if (client.eval && typeof client.eval === 'function') {
        await client.eval(script, 1, lockKey, lockValue);
      } else {
        // Lua 스크립트를 지원하지 않는 경우 fallback
        await client.del(lockKey);
      }
    } catch (error) {
      this.logger.error(
        `Lock release error: ${lockKey}`,
        error instanceof Error ? error.message : String(error),
        'CacheService'
      );
    }
  }

  /**
   * 캐시가 설정될 때까지 대기
   *
   * @param key - 캐시 키
   * @param maxWaitMs - 최대 대기 시간 (밀리초)
   * @returns 캐시가 설정되었는지 여부
   */
  private async waitForCache(key: string, maxWaitMs: number): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 100; // 100ms마다 확인

    while (Date.now() - startTime < maxWaitMs) {
      const client = this.getRedisClient();
      if (client) {
        // Redis 사용 시: EXISTS 명령으로 빠르게 확인
        const exists = await client.exists(key);
        if (exists) {
          return true;
        }
      } else {
        // 메모리 캐시 사용 시: get으로 확인
        const cached = await this.get(key);
        if (cached !== undefined) {
          return true;
        }
      }

      await this.sleep(checkInterval);
    }

    return false;
  }

  /**
   * Redis 클라이언트 가져오기
   */
  private getRedisClient(): RedisClient | undefined {
    try {
      const cacheWithStore = this.cacheManager as unknown as CacheManagerWithStore;

      // Try different paths to access Redis client
      if (cacheWithStore.store && cacheWithStore.store.client) {
        return cacheWithStore.store.client;
      }
      if (cacheWithStore.client) {
        return cacheWithStore.client;
      }
      if (cacheWithStore.stores && cacheWithStore.stores[0]?.client) {
        return cacheWithStore.stores[0].client;
      }
      if (cacheWithStore.stores && cacheWithStore.stores[0]?._store?.client) {
        return cacheWithStore.stores[0]._store.client;
      }

      return undefined;
    } catch (error) {
      this.logger.error(
        'Error accessing Redis client',
        error instanceof Error ? error.message : String(error),
        'CacheService'
      );
      return undefined;
    }
  }

  /**
   * Sleep 헬퍼 함수
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 캐시 키 생성 헬퍼
   */
  generateKey(prefix: string, ...parts: (string | number)[]): string {
    return [prefix, ...parts].join(':');
  }
}
