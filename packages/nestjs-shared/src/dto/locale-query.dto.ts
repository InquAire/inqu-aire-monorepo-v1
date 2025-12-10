import { IsIn, IsOptional, IsString } from 'class-validator';

export class LocaleQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['ko', 'en', 'ja', 'zh'])
  locale?: string = 'ko';
}
