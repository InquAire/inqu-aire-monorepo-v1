import { PartialType, OmitType } from '@nestjs/swagger';

import { CreateIndustryConfigDto } from './create-industry-config.dto';

// industry 필드는 unique key이므로 업데이트에서 제외
export class UpdateIndustryConfigDto extends PartialType(
  OmitType(CreateIndustryConfigDto, ['industry'] as const)
) {}
