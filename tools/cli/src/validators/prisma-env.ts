import { z } from 'zod';

// Prisma-related environment requirements
export const prismaEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  PK_DB_STMT_TIMEOUT_MS: z.coerce.number().int().positive().default(8_000),
  PK_DB_SLOW_MS: z.coerce.number().int().positive().default(200),
  PK_DB_DEADLOCK_RETRY: z.coerce.number().int().nonnegative().default(2),
});

export type PrismaEnv = z.infer<typeof prismaEnvSchema>;
