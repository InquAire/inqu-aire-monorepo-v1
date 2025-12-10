// Re-export everything from generated Prisma client
export * from '../../prisma/generated/client';

// Prisma Client Extensions
export { readOnlyExtension } from './client/extensions/read-only.extension';
export { slowQueryExtension } from './client/extensions/slow-query.extension';
export { softDeleteExtension } from './client/extensions/soft-delete.extension';

// Export Prisma client functions (lazy initialization - safe for module load)
export { createPrismaClient, getPrisma, getPrismaRead } from './client';
export * from './client/utils/tx-retry.util';
