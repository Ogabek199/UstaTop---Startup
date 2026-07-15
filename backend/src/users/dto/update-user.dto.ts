import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Language } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEnum(Language)
  language?: Language;
}
