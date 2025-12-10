import { PartialType, OmitType } from '@nestjs/swagger';

import { CreateInquiryReplyDto } from './create-inquiry-reply.dto';

// inquiry_id는 변경 불가
export class UpdateInquiryReplyDto extends PartialType(
  OmitType(CreateInquiryReplyDto, ['inquiry_id'] as const)
) {}
