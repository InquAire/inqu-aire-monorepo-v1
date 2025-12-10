import { Prisma, PrismaClient } from '../../../../prisma/generated/client';
import { DB_CONFIG } from '../../config/db.config';

/**
 * Deadlock / 직렬화 재시도 유틸
 * - Prisma 6 interactive transactions
 */
export async function withTxRetry<T>(
  prisma: PrismaClient,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  maxRetry = DB_CONFIG.DEADLOCK_RETRY
) {
  let attempt = 0;
  return prisma.$transaction(
    async tx => {
      while (true) {
        try {
          return await fn(tx);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          const retriable =
            (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2034') ||
            /deadlock detected/i.test(msg) ||
            /could not serialize access/i.test(msg);
          if (!retriable || attempt >= maxRetry) throw e;
          attempt += 1;
        }
      }
    },
    { timeout: DB_CONFIG.STMT_TIMEOUT_MS }
  );
}
