import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { WebhookIpWhitelistGuard } from './guards/webhook-ip-whitelist.guard';
import { WebhookProcessor } from './processors/webhook.processor';
import { WebhookReplayPreventionService } from './services/webhook-replay-prevention.service';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

const bullImports =
  process.env.BULL_DISABLED === 'true'
    ? []
    : [
        BullModule.registerQueue({
          name: 'webhooks',
        }),
      ];

const bullProviders =
  process.env.BULL_DISABLED === 'true'
    ? [{ provide: 'BullQueue_webhooks', useValue: { add: async () => undefined } }]
    : [];

@Module({
  imports: bullImports,
  controllers: [WebhooksController],
  providers: [
    WebhooksService,
    WebhookProcessor,
    WebhookReplayPreventionService,
    WebhookIpWhitelistGuard,
    ...bullProviders,
  ],
  exports: [WebhooksService],
})
export class WebhooksModule {}
