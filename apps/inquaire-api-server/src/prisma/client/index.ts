import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

import { PrismaClient } from '../../../prisma/generated/client';
import { DB_CONFIG } from '../config/db.config';

import { readOnlyExtension } from './extensions/read-only.extension';
import { slowQueryExtension } from './extensions/slow-query.extension';
import { softDeleteExtension } from './extensions/soft-delete.extension';

const { Pool } = pg;

/**
 * Read Replica 클라이언트의 최상위 메서드 차단을 위한 래퍼
 * Proxy를 사용하여 $transaction, $executeRaw 등을 런타임에 차단
 */
function wrapReadOnlyClient(client: PrismaClient): PrismaClient {
  if (typeof Proxy === 'undefined') {
    // Proxy를 지원하지 않는 환경에서는 원본 반환
    return client;
  }

  return new Proxy(client, {
    get(target, prop) {
      const value = target[prop as keyof PrismaClient];

      // 최상위 쓰기 메서드 차단
      if (prop === '$transaction' || prop === '$executeRaw' || prop === '$executeRawUnsafe') {
        return () => {
          throw new Error(
            `[Read Replica] ${String(prop)}()은 Read Replica에서 실행할 수 없습니다. getPrismaForWrite()를 사용하세요.`
          );
        };
      }

      return value;
    },
  }) as PrismaClient;
}

export const createPrismaClient = (databaseUrl?: string, isReadOnly = false) => {
  // Prisma 7: adapter 기반 연결
  const connectionString = databaseUrl || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined');
  }

  // pg Pool 생성
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  const base = new PrismaClient({
    adapter,
    errorFormat: 'minimal',
    log:
      DB_CONFIG.NODE_ENV === 'production'
        ? ['error', 'warn']
        : [{ emit: 'event', level: 'query' }, 'info', 'warn', 'error'],
  });

  const client = base.$extends(softDeleteExtension).$extends(slowQueryExtension);

  // Read Replica인 경우 쓰기 작업 차단 확장 추가 및 최상위 메서드 래핑
  if (isReadOnly) {
    const readOnlyClient = client.$extends(readOnlyExtension);
    // Proxy 래핑은 타입 추론을 위해 unknown을 거쳐 단언
    return wrapReadOnlyClient(
      readOnlyClient as unknown as PrismaClient
    ) as unknown as typeof readOnlyClient;
  }

  return client;
};

// Lazy initialization을 위한 캐시 타입
type PrismaClientType = ReturnType<typeof createPrismaClient>;

// globalThis에 저장할 캐시 구조
const g = globalThis as unknown as {
  __PRISMA__?: PrismaClientType;
  __PRISMA_READ__?: PrismaClientType;
};

/**
 * Write DB용 Prisma Client (기본)
 * 모든 읽기/쓰기 작업 가능
 * Lazy initialization: 최초 호출 시에만 생성
 */
export const getPrisma = (): PrismaClientType => {
  if (!g.__PRISMA__) {
    g.__PRISMA__ = createPrismaClient();
  }
  return g.__PRISMA__;
};

/**
 * Read Replica용 Prisma Client (선택적)
 * READ_DATABASE_URL이 설정되어 있으면 Read Replica 사용, 없으면 Write DB 사용
 * Read Replica는 읽기 전용: 쓰기 작업 시 에러 발생
 * Lazy initialization: 최초 호출 시에만 생성
 */
export const getPrismaRead = (): PrismaClientType => {
  if (!g.__PRISMA_READ__) {
    const readDatabaseUrl = process.env.READ_DATABASE_URL;
    g.__PRISMA_READ__ = readDatabaseUrl
      ? createPrismaClient(readDatabaseUrl, true)
      : getPrisma(); // Read Replica가 없으면 Write DB 사용
  }
  return g.__PRISMA_READ__;
};
