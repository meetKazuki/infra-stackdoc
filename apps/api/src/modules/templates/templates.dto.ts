import { IsEnum, IsNumberString, IsOptional } from 'class-validator'
import { TemplateCategory } from '@/common/utils/enums'

export class ListTemplateQueryDto {
  @IsOptional()
  @IsEnum(TemplateCategory)
  category?: TemplateCategory

  @IsOptional()
  @IsNumberString()
  page?: string

  @IsOptional()
  @IsNumberString()
  limit?: string
}
