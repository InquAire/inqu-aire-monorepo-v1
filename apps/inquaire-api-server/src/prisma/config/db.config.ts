export const DB_CONFIG = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  SLOW_MS: Number(process.env.PK_DB_SLOW_MS ?? 200),
  DEADLOCK_RETRY: Number(process.env.PK_DB_DEADLOCK_RETRY ?? 2),
  STMT_TIMEOUT_MS: Number(process.env.PK_DB_STMT_TIMEOUT_MS ?? 8_000),
};
