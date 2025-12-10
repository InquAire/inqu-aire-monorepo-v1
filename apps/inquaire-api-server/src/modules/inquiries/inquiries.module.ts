import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { CustomersModule } from '../customers/customers.module';

import { InquiriesController } from './inquiries.controller';
import { InquiriesService } from './inquiries.service';

const bullImports =
  process.env.BULL_DISABLED === 'true'
    ? []
    : [
        BullModule.registerQueue({
          name: 'ai-analysis',
        }),
      ];

const bullProviders =
  process.env.BULL_DISABLED === 'true'
    ? [{ provide: 'BullQueue_ai-analysis', useValue: { add: async () => undefined } }]
    : [];

@Module({
  imports: [...bullImports, AiModule, CustomersModule],
  controllers: [InquiriesController],
  providers: [InquiriesService, ...bullProviders],
  exports: [InquiriesService],
})
export class InquiriesModule {}
