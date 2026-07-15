import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '@prisma/client';

const PHONE_PATTERN = /^\+998\d{9}$/;
const STRONG_PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export class SendOtpDto {
  @IsString()
  @Matches(PHONE_PATTERN, {
    message: 'Phone must be in format +998XXXXXXXXX',
  })
  phone: string;
}

export class RegisterDto {
  @IsString()
  @Matches(PHONE_PATTERN)
  phone: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(STRONG_PASSWORD_PATTERN, {
    message: 'Password must contain at least one letter and one number',
  })
  password: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsString()
  name?: string;

  @ValidateIf((o: RegisterDto) => o.role === UserRole.professional)
  @IsString()
  @MinLength(2)
  district?: string;

  @ValidateIf((o: RegisterDto) => o.role === UserRole.professional)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceCategoryIds?: string[];

  @ValidateIf((o: RegisterDto) => o.role === UserRole.professional)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customServiceNames?: string[];

  @ValidateIf((o: RegisterDto) => o.role === UserRole.professional)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceMin?: number;

  @ValidateIf((o: RegisterDto) => o.role === UserRole.professional)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceMax?: number;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  experienceYears?: number;
}

export class VerifyOtpDto extends RegisterDto {
  @IsString()
  @Matches(/^\d{6}$/)
  code: string;
}

export class LoginDto {
  @IsString()
  @Matches(PHONE_PATTERN)
  phone: string;

  @IsString()
  @MinLength(1)
  password: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class CheckPhoneDto {
  @IsString()
  @Matches(PHONE_PATTERN)
  phone: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}
