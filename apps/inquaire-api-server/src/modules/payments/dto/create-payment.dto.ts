import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ description: '사업체 ID' })
  @IsString()
  business_id!: string;

  @ApiProperty({ description: '구독 ID (옵션)', required: false })
  @IsOptional()
  @IsString()
  subscription_id?: string;

  @ApiProperty({ description: '금액 (원)', example: 29000 })
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiProperty({ description: '통화', default: 'KRW' })
  @IsOptional()
  @IsString()
  currency?: string = 'KRW';

  @ApiProperty({ description: '결제 수단 (옵션)', required: false })
  @IsOptional()
  @IsString()
  payment_method?: string;
}
