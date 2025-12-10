import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';

import { KakaoWebhookDto } from '../dto/kakao-webhook.dto';
import { LineWebhookDto } from '../dto/line-webhook.dto';
import { WebhooksService } from '../webhooks.service';

import { CustomLoggerService } from '@/common/modules/logger/logger.service';

interface WebhookJobData {
  channelId: string;
  platform: 'KAKAO' | 'LINE';
  payload: KakaoWebhookDto | LineWebhookDto;
  attemptNumber?: number;
}

@Injectable()
@Processor('webhooks', {
  concurrency: 10, // Process up to 10 webhooks concurrently
})
export class WebhookProcessor extends WorkerHost {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly logger: CustomLoggerService
  ) {
    super();
  }

  async process(job: Job<WebhookJobData>): Promise<void> {
    const { channelId, platform, payload, attemptNumber = 1 } = job.data;

    this.logger.log(
      `Processing webhook job ${job.id} for channel ${channelId} (Attempt: ${attemptNumber}/3)`,
      'WebhookProcessor'
    );

    try {
      if (platform === 'KAKAO') {
        await this.webhooksService.handleKakaoWebhook(channelId, payload as KakaoWebhookDto);
      } else if (platform === 'LINE') {
        await this.webhooksService.handleLineWebhook(channelId, payload as LineWebhookDto);
      } else {
        this.logger.error(`Unsupported platform: ${platform}`, undefined, 'WebhookProcessor');
        return;
      }

      this.logger.log(`Webhook job ${job.id} completed successfully`, 'WebhookProcessor');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Webhook job ${job.id} failed (Attempt ${attemptNumber}/3): ${errorMessage}`,
        errorStack,
        'WebhookProcessor'
      );

      // Re-throw to trigger automatic retry
      throw error;
    }
  }
}
