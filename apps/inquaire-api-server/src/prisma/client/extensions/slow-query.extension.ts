import { Prisma } from '../../../../prisma/generated/client';
import { DB_CONFIG } from '../../config/db.config';

function startSlowTimer(label: string) {
  if (DB_CONFIG.NODE_ENV === 'production') return () => {};
  const t0 = performance.now();
  return () => {
    const ms = performance.now() - t0;
    if (ms > DB_CONFIG.SLOW_MS) {
      console.warn(
        JSON.stringify({ level: 'warn', msg: 'slow_query', label, duration_ms: Math.round(ms) })
      );
    }
  };
}

/**
 * 모든 모델의 주요 read/write 오퍼레이션 실행 시간을 체크하는 확장
 */
export const slowQueryExtension = Prisma.defineExtension(client =>
  client.$extends({
    name: 'slowQuery',
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          const end = startSlowTimer(`${model}.findMany`);
          try {
            return await query(args);
          } finally {
            end();
          }
        },
        async findFirst({ model, args, query }) {
          const end = startSlowTimer(`${model}.findFirst`);
          try {
            return await query(args);
          } finally {
            end();
          }
        },
        async count({ model, args, query }) {
          const end = startSlowTimer(`${model}.count`);
          try {
            return await query(args);
          } finally {
            end();
          }
        },
        async aggregate({ model, args, query }) {
          const end = startSlowTimer(`${model}.aggregate`);
          try {
            return await query(args);
          } finally {
            end();
          }
        },
        async groupBy({ model, args, query }) {
          const end = startSlowTimer(`${model}.groupBy`);
          try {
            return await query(args);
          } finally {
            end();
          }
        },
        async update({ model, args, query }) {
          const end = startSlowTimer(`${model}.update`);
          try {
            return await query(args);
          } finally {
            end();
          }
        },
        async updateMany({ model, args, query }) {
          const end = startSlowTimer(`${model}.updateMany`);
          try {
            return await query(args);
          } finally {
            end();
          }
        },
        async upsert({ model, args, query }) {
          const end = startSlowTimer(`${model}.upsert`);
          try {
            return await query(args);
          } finally {
            end();
          }
        },
        async delete({ model, args, query }) {
          const end = startSlowTimer(`${model}.delete`);
          try {
            return await query(args);
          } finally {
            end();
          }
        },
        async deleteMany({ model, args, query }) {
          const end = startSlowTimer(`${model}.deleteMany`);
          try {
            return await query(args);
          } finally {
            end();
          }
        },
      },
    },
  })
);
