import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiAnalysisProcessor } from './processors/ai-analysis.processor';

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
  imports: bullImports,
  controllers: [AiController],
  providers: [AiService, AiAnalysisProcessor, ...bullProviders],
  exports: [AiService],
})
export class AiModule {}
