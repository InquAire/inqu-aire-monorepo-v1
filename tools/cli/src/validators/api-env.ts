import { z } from 'zod';

// Mirrors packages/api/src/config/env.schema.ts
export const apiEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // DB / Prisma
  DATABASE_URL: z.string().url(),
  PK_DB_STMT_TIMEOUT_MS: z.coerce.number().int().positive().default(8_000),
  PK_DB_SLOW_MS: z.coerce.number().int().positive().default(200),
  PK_DB_DEADLOCK_RETRY: z.coerce.number().int().nonnegative().default(2),

  // Logging
  PK_LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  PK_LOG_PRETTY: z.coerce.boolean().default(true),
  PK_LOG_SAMPLE: z.coerce.number().min(0).max(1).default(1),

  // HTTP / Security
  ALLOWED_ORIGINS: z.string().optional(),
  TRUST_PROXY: z.coerce.boolean().default(false),
  BODY_LIMIT: z.string().default('5mb'),
  ENABLE_COMPRESSION: z.coerce.boolean().default(true),

  // Throttling / Redis
  REDIS_URL: z.string().url().optional(),
  RATE_TTL_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_AUTH: z.coerce.number().int().positive().default(60),

  // S3 Readiness (옵션)
  AWS_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('30d'),
  REFRESH_COOKIE_NAME: z.string().default('pk_refresh'),
  REFRESH_COOKIE_SECURE: z.coerce.boolean().default(false),
  REFRESH_COOKIE_DOMAIN: z.string().optional(),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;
