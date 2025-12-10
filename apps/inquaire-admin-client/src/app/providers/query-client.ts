/**
 * Query Client Factory - FSD App Layer
 *
 * Creates and configures the TanStack Query client with optimized settings.
 */

import { createOptimizedQueryClient } from '@/shared/lib/query-config';

export function createQueryClient() {
  return createOptimizedQueryClient();
}
