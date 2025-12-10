/**
 * JSON 값 타입 정의
 */
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;

export interface JsonObject {
  [key: string]: JsonValue;
}

export type JsonArray = JsonValue[];

/**
 * Prisma JSON 필드용 타입
 */
export type PrismaJson = JsonValue;
