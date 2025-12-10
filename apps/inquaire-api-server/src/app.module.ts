import { Module, type Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { envValidationSchema } from './common/config/env.validation';
import { CacheModule } from './common/modules/cache/cache.module';
import { CircuitBreakerModule } from './common/modules/circuit-breaker';
import { EmailModule } from './common/modules/email/email.module';
import { EncryptionModule } from './common/modules/encryption/encryption.module';
import { LoggerModule } from './common/modules/logger/logger.module';
import { MetricsModule } from './common/modules/metrics/metrics.module';
import { QueueModule } from './common/modules/queue/queue.module';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { AiModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { BusinessesModule } from './modules/businesses/businesses.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ErrorLogsModule } from './modules/error-logs/error-logs.module';
import { IndustryConfigsModule } from './modules/industry-configs/industry-configs.module';
import { InquiriesModule } from './modules/inquiries/inquiries.module';
import { InquiryRepliesModule } from './modules/inquiry-replies/inquiry-replies.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReplyTemplatesModule } from './modules/reply-templates/reply-templates.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { UsersModule } from './modules/users/users.module';
import { WebhookEventsModule } from './modules/webhook-events/webhook-events.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';

@Module({
  imports: [
    // Configuration with validation
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['envs/.env.local', 'envs/.env'],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false, // Show all validation errors at once
        allowUnknown: true, // Allow system environment variables
        stripUnknown: true, // Remove unknown variables from validated config
      },
    }),

    // Logging (Global)
    LoggerModule,

    // Metrics & Monitoring (Global)
    MetricsModule,

    // Caching (Global)
    CacheModule,

    // Job Queue (Global)
    QueueModule,

    // Encryption (Global)
    EncryptionModule,

    // Email (Global)
    EmailModule,

    // Circuit Breaker (Global)
    CircuitBreakerModule,

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10) * 1000,
        limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      },
    ]),

    // Core modules
    PrismaModule,
    AuthModule,
    UsersModule,
    WebhooksModule,
    AiModule,
    InquiriesModule,
    InquiryRepliesModule,
    CustomersModule,
    ChannelsModule,
    BusinessesModule,
    OrganizationsModule,
    ReplyTemplatesModule,
    IndustryConfigsModule,
    SubscriptionsModule,
    PaymentsModule,
    ErrorLogsModule,
    WebhookEventsModule,
  ],
  controllers: [AppController],
  providers: (() => {
    const baseProviders: Provider[] = [AppService];

    if (process.env.BULL_DISABLED === 'true') {
      baseProviders.push(
        { provide: 'BullQueue_webhooks', useValue: { add: async () => undefined } },
        { provide: 'BullQueue_ai-analysis', useValue: { add: async () => undefined } }
      );
    }

    if (process.env.DISABLE_AUTH_GUARDS === 'true') {
      return baseProviders;
    }

    return [
      ...baseProviders,
      {
        provide: APP_GUARD,
        useClass: JwtAuthGuard, // Global authentication guard
      },
      {
        provide: APP_GUARD,
        useClass: RolesGuard, // Global role-based access control guard
      },
    ];
  })(),
})
export class AppModule {}
