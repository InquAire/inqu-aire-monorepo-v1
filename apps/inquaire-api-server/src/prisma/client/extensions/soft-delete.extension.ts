import { Prisma } from '../../../../prisma/generated/client';

/**
 * 스키마와 동기화 필요: 소프트 삭제 대상 모델들
 */
// Keep this list in sync with schema.prisma models that actually have `deleted_at`
const SOFT_DELETE_MODELS = new Set<string>([
  'User',
  'Asset',
  'Category',
  'Term',
  'Course',
  'Lesson',
  'Video',
  'SavedFolder',
]);

/**
 * include/select 하위까지 재귀적으로 where.deleted_at = null 주입
 * (READ 계열에서만 사용)
 */
type SoftDeleteWhere = { deleted_at?: unknown };
type SoftDeleteArgs = {
  where?: SoftDeleteWhere;
  include?: Record<string, SoftDeleteArgs>;
  select?: Record<string, SoftDeleteArgs>;
};

function addSoftDeleteWhereRecursively(node: Record<string, unknown> | undefined, isRoot = true) {
  if (!node || typeof node !== 'object') return;

  // Only inject for nodes that already have a where object.
  // Avoid creating a new where for nested include/select nodes where the target
  // model may not have `deleted_at` (prevents Prisma validation errors).
  if ('where' in node && node.where && typeof node.where === 'object') {
    const where = node.where as SoftDeleteWhere;
    if (where.deleted_at === undefined) where.deleted_at = null;
  } else if (isRoot) {
    // For the root args only, ensure a where exists so soft-delete applies.
    (node as SoftDeleteArgs).where = { deleted_at: null };
  }

  // Recurse into include/select, but never force-create where on nested nodes
  // (we don't know if related models have deleted_at).
  const sections: Array<'include' | 'select'> = ['include', 'select'];
  for (const key of sections) {
    const sub = (node as SoftDeleteArgs)[key];
    if (!sub || typeof sub !== 'object') continue;
    for (const rel of Object.keys(sub)) {
      const cfg = sub[rel];
      if (cfg && typeof cfg === 'object')
        addSoftDeleteWhereRecursively(cfg as SoftDeleteArgs, false);
    }
  }
}

const isDev = (process.env.NODE_ENV ?? 'development') !== 'production';
function warnOnce(kind: string, model: string) {
  if (!isDev) {
    return;
  }

  // 간단한 de-dup (필요시 맵으로 한번만)

  console.warn(`[soft-delete] ${kind} used on "${model}". Prefer findFirst/updateMany/deleteMany.`);
}

/**
 * Prisma 6 defineExtension + $extends 기반
 * - READ(WhereInput): findMany/findFirst/count/aggregate/groupBy → 재귀 필터 주입
 * - WRITE(WhereInput): updateMany/deleteMany → where.deleted_at = null 주입
 * - UNIQUE(WhereUniqueInput): findUnique/update/delete/upsert → 주입/수정 금지, dev 경고만
 */
export const softDeleteExtension = Prisma.defineExtension(client =>
  client.$extends({
    name: 'softDelete',
    query: {
      $allModels: {
        // READ 계열 (OK: WhereInput)
        async findMany({ model, args, query }) {
          if (SOFT_DELETE_MODELS.has(model))
            addSoftDeleteWhereRecursively(args as unknown as SoftDeleteArgs);
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (SOFT_DELETE_MODELS.has(model))
            addSoftDeleteWhereRecursively(args as unknown as SoftDeleteArgs);
          return query(args);
        },
        async count({ model, args, query }) {
          if (SOFT_DELETE_MODELS.has(model))
            addSoftDeleteWhereRecursively(args as unknown as SoftDeleteArgs);
          return query(args);
        },
        async aggregate({ model, args, query }) {
          if (SOFT_DELETE_MODELS.has(model))
            addSoftDeleteWhereRecursively(args as unknown as SoftDeleteArgs);
          return query(args);
        },
        async groupBy({ model, args, query }) {
          if (SOFT_DELETE_MODELS.has(model))
            addSoftDeleteWhereRecursively(args as unknown as SoftDeleteArgs);
          return query(args);
        },

        // UNIQUE 읽기 (NG: WhereUniqueInput)
        async findUnique({ model, args, query }) {
          if (SOFT_DELETE_MODELS.has(model)) {
            warnOnce('findUnique', model);
          }
          return query(args);
        },

        // WRITE (OK: WhereInput)
        async updateMany({ model, args, query }) {
          if (SOFT_DELETE_MODELS.has(model)) {
            const a = (args ?? {}) as SoftDeleteArgs;
            if (!a.where || typeof a.where !== 'object') {
              a.where = { deleted_at: null };
            } else if (a.where.deleted_at === undefined) {
              a.where.deleted_at = null;
            }
            return query(a as typeof args);
          }
          return query(args);
        },
        async deleteMany({ model, args, query }) {
          if (SOFT_DELETE_MODELS.has(model)) {
            const a = (args ?? {}) as SoftDeleteArgs;
            if (!a.where || typeof a.where !== 'object') {
              a.where = { deleted_at: null };
            } else if (a.where.deleted_at === undefined) {
              a.where.deleted_at = null;
            }
            return query(a as typeof args);
          }
          return query(args);
        },

        // UNIQUE 쓰기 (NG: WhereUniqueInput)
        async update({ model, args, query }) {
          if (SOFT_DELETE_MODELS.has(model)) warnOnce('update(unique)', model);
          return query(args);
        },
        async delete({ model, args, query }) {
          if (SOFT_DELETE_MODELS.has(model)) warnOnce('delete(unique)', model);
          return query(args);
        },
        async upsert({ model, args, query }) {
          if (SOFT_DELETE_MODELS.has(model)) warnOnce('upsert(unique)', model);
          return query(args);
        },
      },
    },
  })
);
