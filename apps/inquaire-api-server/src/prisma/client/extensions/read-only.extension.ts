import { Prisma } from '../../../../prisma/generated/client';

/**
 * Read Replica용 확장: 쓰기 작업 차단
 * Read Replica는 읽기 전용이므로 쓰기 작업을 수행하면 에러 발생
 */
export const readOnlyExtension = Prisma.defineExtension(client =>
  client.$extends({
    name: 'readOnly',
    query: {
      $allModels: {
        // 쓰기 작업 차단
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async create({ model, args: _args, query: _query }) {
          throw new Error(
            `[Read Replica] 쓰기 작업 불가: ${model}.create()은 Read Replica에서 실행할 수 없습니다. getPrismaForWrite()를 사용하세요.`
          );
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async createMany({ model, args: _args, query: _query }) {
          throw new Error(
            `[Read Replica] 쓰기 작업 불가: ${model}.createMany()은 Read Replica에서 실행할 수 없습니다. getPrismaForWrite()를 사용하세요.`
          );
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async update({ model, args: _args, query: _query }) {
          throw new Error(
            `[Read Replica] 쓰기 작업 불가: ${model}.update()은 Read Replica에서 실행할 수 없습니다. getPrismaForWrite()를 사용하세요.`
          );
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async updateMany({ model, args: _args, query: _query }) {
          throw new Error(
            `[Read Replica] 쓰기 작업 불가: ${model}.updateMany()은 Read Replica에서 실행할 수 없습니다. getPrismaForWrite()를 사용하세요.`
          );
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async upsert({ model, args: _args, query: _query }) {
          throw new Error(
            `[Read Replica] 쓰기 작업 불가: ${model}.upsert()은 Read Replica에서 실행할 수 없습니다. getPrismaForWrite()를 사용하세요.`
          );
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async delete({ model, args: _args, query: _query }) {
          throw new Error(
            `[Read Replica] 쓰기 작업 불가: ${model}.delete()은 Read Replica에서 실행할 수 없습니다. getPrismaForWrite()를 사용하세요.`
          );
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async deleteMany({ model, args: _args, query: _query }) {
          throw new Error(
            `[Read Replica] 쓰기 작업 불가: ${model}.deleteMany()은 Read Replica에서 실행할 수 없습니다. getPrismaForWrite()를 사용하세요.`
          );
        },
      },
    },
    // 최상위 메서드 차단 (Prisma 확장의 result 클라이언트 래핑)
    result: {
      $allModels: {},
    },
  })
);
