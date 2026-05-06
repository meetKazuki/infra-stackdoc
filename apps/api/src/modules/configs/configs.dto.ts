import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator'
import { Visibility } from '@/common/utils/enums'

export class CreateConfigDto {
  @IsString()
  @IsNotEmpty()
  yaml!: string

  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility
}

export class UpdateConfigDto {
  @IsString()
  @IsNotEmpty()
  yaml!: string

  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility
}
