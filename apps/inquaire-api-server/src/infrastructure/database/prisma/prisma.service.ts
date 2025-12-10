import {
  Prisma,
  PrismaClient,
  readOnlyExtension,
  slowQueryExtension,
  softDeleteExtension,
} from '@/prisma';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

import { CustomLoggerService } from '@/common/modules/logger/logger.service';

const { Pool } = pg;

/**
 * Helper function to create write client with extensions
 */
function createWriteClient(baseClient: PrismaClient) {
  return baseClient.$extends(softDeleteExtension).$extends(slowQueryExtension);
}

/**
 * Helper function to create read client with extensions
 */
function createReadClient(baseClient: PrismaClient) {
  return baseClient
    .$extends(softDeleteExtension)
    .$extends(slowQueryExtension)
    .$extends(readOnlyExtension);
}

/**
 * Extended Prisma Client type for write operations
 */
type ExtendedWriteClient = ReturnType<typeof createWriteClient>;

/**
 * Extended Prisma Client type for read operations
 */
type ExtendedReadClient = ReturnType<typeof createReadClient>;

/**
 * 프로덕션 레벨 Prisma Service
 *
 * Features:
 * - Read/Write DB separation (Primary + Read Replica)
 * - Connection pooling
 * - Automatic retry logic
 * - Soft delete (via Prisma Extension)
 * - Query performance monitoring (via Prisma Extension)
 * - Health checks
 * - Graceful shutdown
 * - Transaction helpers
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  // Write DB (Primary) - with extensions
  public readonly write!: ExtendedWriteClient;

  // Read DB (Replica) - with read-only extension (or fallback to write client)
  public readonly read!: ExtendedReadClient | ExtendedWriteClient;

  // Connection status
  private isConnected = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: CustomLoggerService
  ) {
    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';
    const isDevelopment = nodeEnv !== 'production';

    // Common Prisma configuration
    const commonLogConfig = [
      { emit: 'event' as const, level: 'error' as const },
      { emit: 'event' as const, level: 'info' as const },
      { emit: 'event' as const, level: 'warn' as const },
    ];

    // Write DB (Primary) with connection pooling and extensions
    const writeConnectionString = this.buildConnectionString(
      this.configService.get<string>('DATABASE_URL'),
      'write'
    );
    const writePool = new Pool({ connectionString: writeConnectionString });
    const writeAdapter = new PrismaPg(writePool);

    const writeBase = new PrismaClient({
      adapter: writeAdapter,
      log: commonLogConfig,
      errorFormat: isDevelopment ? 'pretty' : 'minimal',
    });

    // Setup logging for errors, info, and warnings on base client
    this.setupBasicLogging(writeBase, 'WRITE');

    // Apply extensions: soft delete + slow query monitoring
    this.write = createWriteClient(writeBase);

    // Read DB (Replica)
    const readUrl = this.configService.get<string>('READ_DATABASE_URL');
    if (readUrl) {
      const readConnectionString = this.buildConnectionString(readUrl, 'read');
      const readPool = new Pool({ connectionString: readConnectionString });
      const readAdapter = new PrismaPg(readPool);

      const readBase = new PrismaClient({
        adapter: readAdapter,
        log: commonLogConfig,
        errorFormat: isDevelopment ? 'pretty' : 'minimal',
      });

      // Setup logging on base client before applying extensions
      this.setupBasicLogging(readBase, 'READ');

      // Apply extensions: soft delete + slow query + read-only protection
      this.read = createReadClient(readBase);

      this.logger.log('✅ Read Replica configured');
    } else {
      // Fallback to write DB
      this.read = this.write;
      this.logger.log('⚠️ Read Replica not configured, using write DB for reads');
    }
  }

  /**
   * Build connection string with connection pooling parameters
   */
  private buildConnectionString(baseUrl: string | undefined, dbType: 'write' | 'read'): string {
    if (!baseUrl) {
      throw new Error(`Database URL not configured for ${dbType} DB`);
    }

    const url = new URL(baseUrl);

    // Connection pooling settings
    const poolSize = dbType === 'write' ? 10 : 5; // Write DB needs more connections
    const connectionTimeout = this.configService.get<number>('DB_CONNECTION_TIMEOUT') || 5000;
    const poolTimeout = this.configService.get<number>('DB_POOL_TIMEOUT') || 10000;

    url.searchParams.set('connection_limit', poolSize.toString());
    url.searchParams.set('connect_timeout', Math.floor(connectionTimeout / 1000).toString());
    url.searchParams.set('pool_timeout', Math.floor(poolTimeout / 1000).toString());

    // Enable prepared statements for better performance
    url.searchParams.set('prepared_statements', 'true');

    // Set statement cache size
    url.searchParams.set('statement_cache_size', '100');

    return url.toString();
  }

  /**
   * Setup basic logging (errors, info, warnings)
   * Query performance is handled by slowQueryExtension
   */
  private setupBasicLogging(client: PrismaClient, label: string): void {
    // Error logging
    client.$on('error' as never, (e: Prisma.LogEvent) => {
      this.logger.error(`[${label}] ❌ Prisma Error: ${e.message}`);
    });

    // Info logging
    client.$on('info' as never, (e: Prisma.LogEvent) => {
      this.logger.log(`[${label}] ℹ️ ${e.message}`);
    });

    // Warning logging
    client.$on('warn' as never, (e: Prisma.LogEvent) => {
      this.logger.warn(`[${label}] ⚠️ ${e.message}`);
    });
  }

  /**
   * Module initialization with connection retry
   */
  async onModuleInit(): Promise<void> {
    const maxRetries = this.configService.get<number>('DB_MAX_RETRIES') || 5;
    const retryDelay = this.configService.get<number>('DB_RETRY_DELAY') || 3000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Connect write DB
        await (this.write as unknown as PrismaClient).$connect();
        this.logger.log('✅ Write DB connected successfully');

        // Connect read DB if separate
        if (this.read !== this.write) {
          await (this.read as unknown as PrismaClient).$connect();
          this.logger.log('✅ Read DB connected successfully');
        }

        this.isConnected = true;

        // Log connection info
        this.logConnectionInfo();

        return;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (attempt === maxRetries) {
          this.logger.error(`❌ Database connection failed after ${maxRetries} attempts`);
          throw error;
        }

        this.logger.warn(
          `⚠️ Database connection attempt ${attempt}/${maxRetries} failed: ${errorMessage}. ` +
            `Retrying in ${retryDelay}ms...`
        );

        await this.sleep(retryDelay);
      }
    }
  }

  /**
   * Graceful shutdown
   */
  async onModuleDestroy(): Promise<void> {
    try {
      this.logger.log('Disconnecting from databases...');

      // Disconnect write DB
      await (this.write as unknown as PrismaClient).$disconnect();
      this.logger.log('✅ Write DB disconnected');

      // Disconnect read DB if separate
      if (this.read !== this.write) {
        await (this.read as unknown as PrismaClient).$disconnect();
        this.logger.log('✅ Read DB disconnected');
      }

      this.isConnected = false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Error during database disconnection: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<{
    write: boolean;
    read: boolean;
    isConnected: boolean;
  }> {
    const writeHealthy = await this.checkConnection(this.write as unknown as PrismaClient, 'WRITE');
    const readHealthy =
      this.read === this.write
        ? writeHealthy
        : await this.checkConnection(this.read as unknown as PrismaClient, 'READ');

    return {
      write: writeHealthy,
      read: readHealthy,
      isConnected: this.isConnected && writeHealthy && readHealthy,
    };
  }

  /**
   * Check individual connection
   */
  private async checkConnection(client: PrismaClient, label: string): Promise<boolean> {
    try {
      await client.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[${label}] ❌ Health check failed: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Execute transaction with retry logic
   */
  async executeTransaction<T>(
    callback: (prisma: Prisma.TransactionClient) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    }
  ): Promise<T> {
    const maxRetries = 3;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await (this.write as unknown as PrismaClient).$transaction(callback, {
          maxWait: options?.maxWait || 5000,
          timeout: options?.timeout || 10000,
          isolationLevel: options?.isolationLevel,
        });
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (error instanceof Error && !this.isRetryableError(error)) {
          throw error;
        }

        if (attempt < maxRetries) {
          this.logger.warn(`Transaction attempt ${attempt}/${maxRetries} failed, retrying...`);
          await this.sleep(100 * attempt); // Exponential backoff
        }
      }
    }

    throw lastError || new Error('Transaction failed');
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const retryableErrors = ['deadlock', 'lock timeout', 'connection', 'ECONNREFUSED', 'ETIMEDOUT'];

    return retryableErrors.some(keyword =>
      error.message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Clean database (testing only)
   */
  async cleanDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('❌ Cannot clean database in production');
    }

    const client = this.write as unknown as PrismaClient;
    const models = Object.keys(client).filter(
      key =>
        !key.startsWith('_') &&
        !key.startsWith('$') &&
        typeof client[key as keyof PrismaClient] === 'object'
    );

    this.logger.log(`🧹 Cleaning ${models.length} tables...`);

    await Promise.all(
      models.map(async modelKey => {
        const model = client[modelKey as keyof PrismaClient] as {
          deleteMany?: () => Promise<unknown>;
        };

        if (model && typeof model === 'object' && 'deleteMany' in model) {
          try {
            await model.deleteMany?.();
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.warn(`Failed to clean table ${modelKey}: ${errorMessage}`);
          }
        }
      })
    );

    this.logger.log('✅ Database cleaned successfully');
  }

  /**
   * Execute raw query
   */
  async executeRaw<T = unknown>(query: string, ...values: unknown[]): Promise<T> {
    try {
      return await (this.write as unknown as PrismaClient).$queryRawUnsafe<T>(query, ...values);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Raw query execution failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Log connection information
   */
  private logConnectionInfo(): void {
    const nodeEnv = process.env.NODE_ENV || 'development';
    this.logger.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 Prisma Service Initialized                          ║
║                                                          ║
║  Environment: ${nodeEnv.padEnd(43)}║
║  Write DB:    Connected ✅                               ║
║  Read DB:     ${(this.read !== this.write ? 'Connected (Replica) ✅' : 'Fallback to Write DB ⚠️').padEnd(43)}║
║                                                          ║
║  Features:                                               ║
║  - Soft Delete Extension       ✅                        ║
║  - Slow Query Monitoring       ✅                        ║
║  - Read-Only Protection        ${(this.read !== this.write ? '✅' : '⚠️ ').padEnd(23)}║
║  - Connection Pooling          ✅                        ║
║  - Transaction Retry           ✅                        ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
    `);
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
